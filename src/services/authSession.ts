import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { loginEkraninaYonlendir } from "../navigation/navigationService";

import {
  refreshTokenGetir,
  tokenDepolamaIslemi,
  tokenSil,
} from "./tokenServisi";

// ============================================
// SESSION STATE
// ============================================

let cikisIslemiBasladi = false;

// Her yeni oturum veya çıkış işleminde artırılır.
// Eski async işlemlerin yeni oturumu değiştirmesini önler.
let oturumNesli = 0;

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

export const oturumuSonlandir = async (): Promise<void> => {
  if (cikisIslemiBasladi) {
    return;
  }

  // Await öncesinde oturumu geçersizleştir.
  cikisIslemiBasladi = true;
  oturumNesli++;

  const cikisNesli = oturumNesli;

  console.log("OTURUM SONLANDIRMA BAŞLATILDI.");

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
};

// ============================================
// LOGIN SUCCESS
// ============================================

export const oturumAcildi = (): void => {
  // Önceki oturumdan kalan async işlemleri geçersizleştir.
  oturumNesli++;

  // Yeni oturum için çıkış korumasını sıfırla.
  cikisIslemiBasladi = false;

  console.log("YENİ OTURUM AÇILDI. OTURUM NESLİ:", oturumNesli);
};
