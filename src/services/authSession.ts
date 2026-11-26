import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { loginEkraninaYonlendir } from "../navigation/navigationService";
import aramaWebRTC from "./AramaWebRTC";
import merkeziStompServisi from "./MerkeziStompServisi";
import {
  refreshTokenGetir,
  tokenDepolamaIslemi,
  tokenGetir,
  tokenSil,
} from "./tokenServisi";

import {
  fcmCihazPasifYap,
  fcmTokenYenilemeDinleyicisiniDurdur,
} from "./fcmServisi";

// ============================================
// SESSION STATE
// ============================================

let cikisIslemiBasladi = false;

// Eş zamanlı logout çağrılarını tek işlemde birleştirir.
let cikisPromise: Promise<void> | null = null;

// Her yeni oturum veya çıkış işleminde artırılır.
// Eski async işlemlerin yeni oturumu değiştirmesini önler.
let oturumNesli = 0;

// Uygulamanın doğrulanmış oturum durumunu takip eder.
let oturumAktif = false;

// Oturum geçişlerini tek sırada yürütür.
// Login, logout ve otomatik oturum doğrulaması bu kuyruğu kullanır.
let oturumGecisKuyrugu: Promise<void> = Promise.resolve();

export const oturumGecisiniSirayaAl = async <T>(
  islem: () => Promise<T>,
): Promise<T> => {
  const oncekiIslem = oturumGecisKuyrugu;

  let kilidiBirak!: () => void;
  oturumGecisKuyrugu = new Promise<void>((resolve) => {
    kilidiBirak = resolve;
  });

  await oncekiIslem;

  try {
    return await islem();
  } finally {
    kilidiBirak();
  }
};


type OturumDinleyicisi = (aktif: boolean) => void;

const oturumDinleyicileri = new Set<OturumDinleyicisi>();

const oturumDurumunuYayinla = (): void => {
  oturumDinleyicileri.forEach((dinleyici) => {
    try {
      dinleyici(oturumAktif);
    } catch (hata) {
      console.error("OTURUM DURUM DİNLEYİCİ HATASI:", hata);
    }
  });
};

export const oturumDurumunuGetir = (): boolean => oturumAktif;

export const oturumDurumuDinle = (
  dinleyici: OturumDinleyicisi,
): (() => void) => {
  oturumDinleyicileri.add(dinleyici);

  return () => {
    oturumDinleyicileri.delete(dinleyici);
  };
};

// ============================================
// SESSION GENERATION
// ============================================

export const oturumNesliniGetir = (): number => {
  return oturumNesli;
};

export const oturumNesliGecerliMi = (beklenenNesil: number): boolean => {
  return oturumNesli === beklenenNesil && !cikisIslemiBasladi;
};

// ============================================
// BACKEND LOGOUT
// ============================================

const sunucuOturumunuKapat = async (refreshToken: string): Promise<void> => {
  if (!refreshToken || !refreshToken.trim()) {
    return;
  }

  try {
    // Normal api instance kullanılmıyor.
    // Böylece 401 interceptor döngüsü oluşmaz.
    await axios.post(
      `${API_BASE_URL}/api/auth/logout`,
      {
        refreshToken,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log("BACKEND OTURUMU BAŞARIYLA KAPATILDI.");
  } catch (hata) {
    if (axios.isAxiosError(hata)) {
      console.error(
        "BACKEND LOGOUT HATASI:",
        hata.response?.status ?? "NETWORK",
        hata.message,
      );
    } else {
      console.error("BACKEND LOGOUT HATASI:", hata);
    }

    // Sunucuya ulaşılamasa bile yerel oturum kapatılacak.
    // Aksi hâlde kullanıcı cihazında oturum açık kalabilir.
  }
};

// ============================================
// LOGOUT
// ============================================

export const oturumuSonlandir = (
  beklenenOturumNesli?: number,
): Promise<void> => {
  // Eski oturuma ait gecikmiş hata yeni oturumu kapatamaz.
  if (
    beklenenOturumNesli !== undefined &&
    !oturumNesliGecerliMi(beklenenOturumNesli)
  ) {
    console.log("LOGOUT ATLANDI: OTURUM NESLİ ARTIK GEÇERLİ DEĞİL.");
    return Promise.resolve();
  }

  // Devam eden logout işlemi varsa aynı Promise paylaşılır.
  if (cikisPromise) {
    return cikisPromise;
  }

  const ortakIslem = oturumGecisiniSirayaAl(async () => {
    // Kuyrukta beklerken oturum değişmiş olabilir.
    if (
      beklenenOturumNesli !== undefined &&
      !oturumNesliGecerliMi(beklenenOturumNesli)
    ) {
      console.log("LOGOUT KUYRUKTA İPTAL: OTURUM NESLİ DEĞİŞMİŞ.");
      return;
    }

    if (cikisIslemiBasladi) {
      return;
    }

  // Await öncesinde oturumu geçersizleştir.
  cikisIslemiBasladi = true;
  oturumNesli++;

  oturumAktif = false;
  oturumDurumunuYayinla();

  const cikisNesli = oturumNesli;

  console.log("OTURUM SONLANDIRMA BAŞLATILDI.");

  // ============================================
  // FCM DİNLEYİCİSİNİ DURDUR VE CİHAZI PASİFLEŞTİR
  // ============================================

  fcmTokenYenilemeDinleyicisiniDurdur();

  try {
    // Logout başladığı için access token yenileme mekanizması
    // kullanılmaz. Mevcut token doğrudan Keychain'den okunur.
    const mevcutAccessToken = await tokenGetir();

    if (mevcutAccessToken) {
      const pasiflestirildi = await fcmCihazPasifYap(
        mevcutAccessToken,
      );

      console.log(
        pasiflestirildi
          ? "LOGOUT: FCM CİHAZI PASİFLEŞTİRİLDİ."
          : "LOGOUT: FCM PASİFLEŞTİRME TAMAMLANAMADI.",
      );
    } else {
      console.warn("LOGOUT: FCM PASİFLEŞTİRME İÇİN JWT BULUNAMADI.");
    }
  } catch (fcmHata) {
    console.error("LOGOUT FCM TEMİZLEME HATASI:", fcmHata);
  }

  // ============================================
  // WEBRTC ARAMA TEMİZLİĞİ
  // ============================================

  try {
    // Aktif görüşme varsa önce CALL_END gönderilir.
    // E2EE handshake, medya ve PeerConnection temizlenir.
    //
    // Harici sinyal göndericisi aktif olduğu için
    // AramaWebRTC merkezi STOMP bağlantısını kapatmaz.

    await aramaWebRTC.temizle();

    console.log("🔴 LOGOUT: WEBRTC ARAMA KAYNAKLARI TEMİZLENDİ.");
  } catch (error) {
    console.error("❌ LOGOUT WEBRTC TEMİZLEME HATASI:", error);
  }

  // ============================================
  // MERKEZİ STOMP BAĞLANTISINI KAPAT
  // ============================================

  try {
    // WebRTC temizliği tamamlandıktan sonra
    // merkezi STOMP bağlantısı kapatılır.

    await merkeziStompServisi.durdur();

    console.log("🔴 LOGOUT: MERKEZİ STOMP BAĞLANTISI KAPATILDI.");
  } catch (error) {
    console.error("❌ LOGOUT MERKEZİ STOMP KAPATMA HATASI:", error);
  }

  try {
    // ============================================
    // MEVCUT REFRESH TOKENI AL
    // ============================================

    let mevcutRefreshToken: string | null = null;

    try {
      mevcutRefreshToken = await refreshTokenGetir();
    } catch (hata) {
      console.error("LOGOUT REFRESH TOKEN OKUMA HATASI:", hata);
    }

    // Bu sırada yeni oturum açılmış olabilir.
    if (oturumNesli !== cikisNesli || !cikisIslemiBasladi) {
      console.log("LOGOUT İPTAL: OTURUM NESLİ DEĞİŞMİŞ.");
      return;
    }

    // ============================================
    // BACKEND LOGOUT
    // ============================================

    if (mevcutRefreshToken) {
      await sunucuOturumunuKapat(mevcutRefreshToken);
    } else {
      console.log("BACKEND LOGOUT ATLANDI: REFRESH TOKEN BULUNAMADI.");
    }

    // ============================================
    // LOCAL LOGOUT
    // ============================================

    await tokenDepolamaIslemi(async () => {
      // Kilit beklenirken yeni oturum açılmış olabilir.
      if (oturumNesli !== cikisNesli || !cikisIslemiBasladi) {
        console.log("LOCAL LOGOUT İPTAL: OTURUM NESLİ DEĞİŞMİŞ.");
        return;
      }

      let ilkHata: unknown = null;

      // Kullanıcı bilgilerini temizle.
      try {
        await AsyncStorage.multiRemove(["userId", "username", "role"]);
      } catch (hata) {
        ilkHata = hata;

        console.error("KULLANICI BİLGİLERİ SİLİNEMEDİ:", hata);
      }

      // Access ve refresh tokenları temizle.
      try {
        await tokenSil();
      } catch (hata) {
        ilkHata = ilkHata ?? hata;

        console.error("TOKEN TEMİZLEME HATASI:", hata);
      }

      if (ilkHata) {
        throw ilkHata;
      }
    });

    console.log("LOCAL OTURUM SONLANDIRILDI.");
  } catch (hata) {
    console.error("OTURUM KAPATMA HATASI:", hata);
  } finally {
    // Eski çıkış işlemi yeni oturumu etkileyemez.
    if (oturumNesli === cikisNesli && cikisIslemiBasladi) {
      loginEkraninaYonlendir();
    }
  }
  }).finally(() => {
    cikisPromise = null;
  });

  cikisPromise = ortakIslem;
  return ortakIslem;
};

// ============================================
// LOGIN SUCCESS
// ============================================

export const oturumAcildi = (): void => {
  // Önceki oturumdan kalan async işlemleri geçersizleştir.
  oturumNesli++;

  // Yeni oturum için çıkış korumasını sıfırla.
  cikisIslemiBasladi = false;

  oturumAktif = true;
  oturumDurumunuYayinla();

  console.log("YENİ OTURUM AÇILDI. OTURUM NESLİ:", oturumNesli);
};
