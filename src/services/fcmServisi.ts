import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";

import { Platform } from "react-native";
import { FCM_API_URL } from "../config/api";

// ============================================
// FCM TOKEN YENİLEME DİNLEYİCİSİ
// ============================================

let tokenYenilemeDinleyicisi: (() => void) | null = null;

// FCM POST ve DELETE isteklerini tek sırada yürütür.
// Böylece logout DELETE isteği, devam eden eski POST isteğinin
// arkasından çalışır.
let fcmHttpKuyrugu: Promise<void> = Promise.resolve();

const fcmHttpIsteğiniSirayaAl = async <T>(
  islem: () => Promise<T>,
): Promise<T> => {
  const oncekiIslem = fcmHttpKuyrugu;

  let kilidiBirak!: () => void;
  fcmHttpKuyrugu = new Promise<void>((resolve) => {
    kilidiBirak = resolve;
  });

  await oncekiIslem;

  try {
    return await islem();
  } finally {
    kilidiBirak();
  }
};

// ============================================
// BİLDİRİM İZNİ
// ============================================

const fcmIzinDurumuYetkiliMi = (durum: number): boolean => {
  return (
    durum === AuthorizationStatus.AUTHORIZED ||
    durum === AuthorizationStatus.PROVISIONAL
  );
};

export const fcmIzinKontrolEt = async (izinIste = true): Promise<boolean> => {
  try {
    const messaging = getMessaging();

    let durum = await hasPermission(messaging);

    if (!fcmIzinDurumuYetkiliMi(durum) && izinIste) {
      durum = await requestPermission(messaging);
    }

    const yetkili = fcmIzinDurumuYetkiliMi(durum);

    console.log("FCM BİLDİRİM İZNİ:", yetkili ? "VERİLDİ" : "VERİLMEDİ");

    return yetkili;
  } catch (error) {
    console.error("FCM İZİN KONTROL HATASI:", error);
    return false;
  }
};

// ============================================
// FCM TOKENINI BACKEND'E KAYDET
// ============================================

export const fcmCihazKaydet = async (
  jwt: string,
  yeniToken?: string,
  oturumGecerliMi: () => boolean = () => true,
): Promise<boolean> => {
  try {
    console.log("========== FCM CİHAZ KAYIT BAŞLADI ==========");

    if (!jwt?.trim()) {
      console.error("FCM KAYIT İPTAL: JWT BULUNAMADI");
      return false;
    }

    if (Platform.OS !== "android") {
      console.warn("FCM KAYDI: ANDROID DIŞI PLATFORM");
    }

    const messaging = getMessaging();

    console.log("FIREBASE MESSAGING HAZIR");

    const izinVar = await fcmIzinKontrolEt(true);

    if (!oturumGecerliMi()) {
      console.log("FCM KAYDI İPTAL: OTURUM DEĞİŞMİŞ.");
      return false;
    }

    if (!izinVar) {
      console.warn("FCM KAYDI ATLANDI: BİLDİRİM İZNİ YOK");
      return false;
    }

    console.log("FCM TOKEN ALINIYOR...");

    const token = yeniToken || (await getToken(messaging));

    if (!oturumGecerliMi()) {
      console.log("FCM KAYDI İPTAL: TOKEN ALINIRKEN OTURUM DEĞİŞMİŞ.");
      return false;
    }

    if (!token) {
      console.error("FCM KAYIT İPTAL: FIREBASE TOKEN BOŞ");
      return false;
    }

    console.log("FCM TOKEN ALINDI:", {
      mevcut: true,
      uzunluk: token.length,
    });

    // HTTP isteğinden hemen önce son oturum kontrolü.
    if (!oturumGecerliMi()) {
      console.log("FCM HTTP İSTEĞİ İPTAL: OTURUM GEÇERSİZ.");
      return false;
    }

    const adres = `${FCM_API_URL}/token`;

    const cevap = await fcmHttpIsteğiniSirayaAl(async () => {
      // Kuyrukta beklerken logout gerçekleşmiş olabilir.
      if (!oturumGecerliMi()) {
        console.log("FCM POST KUYRUKTA İPTAL: OTURUM GEÇERSİZ.");
        return null;
      }

      return fetch(adres, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS.toUpperCase(),
        }),
      });
    });

    if (!cevap) return false;

    console.log("FCM BACKEND HTTP DURUMU:", cevap.status);

    if (!cevap.ok) {
      const hataMetni = await cevap.text();

      console.error("FCM TOKEN KAYIT HATASI:", {
        status: cevap.status,
        hata: hataMetni,
      });

      return false;
    }

    console.log("FCM CİHAZ KAYDI BAŞARILI");
    console.log("========== FCM CİHAZ KAYIT TAMAMLANDI ==========");

    return true;
  } catch (error) {
    console.error("========== FCM CİHAZ KAYIT HATASI ==========");
    console.error("HATA DETAYI:", error);

    return false;
  }
};

// ============================================
// FCM TOKEN YENİLEME DİNLEYİCİSİNİ BAŞLAT
// ============================================

export const fcmTokenYenilemeDinleyicisiniBaslat = (
  jwtSaglayici: () => Promise<string | null>,
  oturumGecerliMi: () => boolean = () => true,
): void => {
  if (tokenYenilemeDinleyicisi) {
    console.log("FCM TOKEN DİNLEYİCİSİ ZATEN AKTİF");
    return;
  }

  try {
    const messaging = getMessaging();

    tokenYenilemeDinleyicisi = onTokenRefresh(messaging, async (yeniToken) => {
      console.log("FCM TOKEN YENİLENDİ:", {
        mevcut: !!yeniToken,
        uzunluk: yeniToken.length,
      });

      try {
        if (!oturumGecerliMi()) {
          console.log("FCM YENİLEME İPTAL: OTURUM DEĞİŞMİŞ.");
          return;
        }

        const jwt = await jwtSaglayici();

        if (!oturumGecerliMi()) {
          console.log("FCM YENİLEME İPTAL: JWT SONRASI OTURUM DEĞİŞMİŞ.");
          return;
        }

        if (!jwt) {
          console.warn("FCM YENİ TOKEN KAYDI ATLANDI: JWT BULUNAMADI");
          return;
        }

        const basarili = await fcmCihazKaydet(
          jwt,
          yeniToken,
          oturumGecerliMi,
        );

        console.log(
          basarili
            ? "FCM YENİ TOKEN BACKEND'E KAYDEDİLDİ"
            : "FCM YENİ TOKEN BACKEND KAYDI BAŞARISIZ",
        );
      } catch (error) {
        console.error("FCM TOKEN YENİLEME HATASI:", error);
      }
    });

    console.log("FCM TOKEN YENİLEME DİNLEYİCİSİ BAŞLATILDI");
  } catch (error) {
    console.error("FCM TOKEN DİNLEYİCİSİ BAŞLATILAMADI:", error);
  }
};

// ============================================
// FCM TOKEN YENİLEME DİNLEYİCİSİNİ DURDUR
// ============================================

export const fcmTokenYenilemeDinleyicisiniDurdur = (): void => {
  if (!tokenYenilemeDinleyicisi) {
    return;
  }

  try {
    tokenYenilemeDinleyicisi();

    console.log("FCM TOKEN DİNLEYİCİSİ DURDURULDU");
  } catch (error) {
    console.error("FCM DİNLEYİCİ DURDURMA HATASI:", error);
  } finally {
    tokenYenilemeDinleyicisi = null;
  }
};

// ============================================
// LOGOUT: FCM CİHAZINI PASİFLEŞTİR
// ============================================

export const fcmCihazPasifYap = async (jwt: string): Promise<boolean> => {
  try {
    if (!jwt?.trim()) {
      console.warn("FCM PASİFLEŞTİRME: JWT BULUNAMADI");
      return false;
    }

    const messaging = getMessaging();

    const token = await getToken(messaging);

    if (!token) {
      console.warn("FCM PASİFLEŞTİRME ATLANDI: TOKEN BULUNAMADI");
      return false;
    }

    const adres = `${FCM_API_URL}/token?token=${encodeURIComponent(token)}`;

    const cevap = await fcmHttpIsteğiniSirayaAl(() =>
      fetch(adres, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }),
    );

    console.log("FCM PASİFLEŞTİRME HTTP DURUMU:", cevap.status);

    if (!cevap.ok) {
      const hataMetni = await cevap.text();

      console.error("FCM CİHAZ PASİFLEŞTİRME BAŞARISIZ:", {
        status: cevap.status,
        hata: hataMetni,
      });

      return false;
    }

    console.log("FCM CİHAZI BAŞARIYLA PASİFLEŞTİRİLDİ");

    return true;
  } catch (error) {
    console.error("FCM PASİFLEŞTİRME HATASI:", error);
    return false;
  }
};
