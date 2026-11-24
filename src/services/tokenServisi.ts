import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";

const TOKEN_ANAHTARI = "token";

const TOKEN_SERVICE = "com.gonulbulusmasi.auth";
const TOKEN_KULLANICI = "jwt";

const REFRESH_TOKEN_SERVICE = "com.gonulbulusmasi.auth.refresh";
const REFRESH_TOKEN_KULLANICI = "refresh-jwt";

// ============================================
// ORTAK TOKEN DEPOLAMA KİLİDİ
// ============================================

let tokenDepolamaKuyrugu: Promise<void> = Promise.resolve();

/**
 * Token yazma ve silme işlemlerini sıraya alır.
 *
 * Birden fazla token işlemi tek bir iş akışı
 * olarak yürütülecekse tamamı bu fonksiyonla sarılmalıdır.
 *
 * ÖNEMLİ:
 * Bu fonksiyonun içinden tekrar tokenDepolamaIslemi
 * çağırmayın.
 *
 * Ayrıca kilit içerisinden tokenGetir çağırmayın.
 * tokenGetir, eski token taşıma durumunda kendisi kilit alabilir.
 */
export const tokenDepolamaIslemi = async <T>(
  islem: () => Promise<T>,
): Promise<T> => {
  const oncekiIslem = tokenDepolamaKuyrugu;

  let kilidiBirak!: () => void;

  tokenDepolamaKuyrugu = new Promise<void>((resolve) => {
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
// ACCESS TOKEN
// ============================================

export const tokenGetir = async (): Promise<string | null> => {
  try {
    // Önce güvenli depolamayı kontrol et.
    const credentials = await Keychain.getGenericPassword({
      service: TOKEN_SERVICE,
    });

    if (credentials && credentials.password) {
      return credentials.password;
    }

    // Eski AsyncStorage kaydını kontrol et.
    const eskiToken = await AsyncStorage.getItem(TOKEN_ANAHTARI);

    if (!eskiToken) {
      return null;
    }

    // Eski tokenın Keychain'e taşınmasını kilitle.
    return await tokenDepolamaIslemi(async () => {
      // Kilit beklenirken başka bir işlem token kaydetmiş olabilir.
      const guncelCredentials = await Keychain.getGenericPassword({
        service: TOKEN_SERVICE,
      });

      if (guncelCredentials && guncelCredentials.password) {
        return guncelCredentials.password;
      }

      // AsyncStorage değerini tekrar kontrol et.
      const guncelEskiToken = await AsyncStorage.getItem(TOKEN_ANAHTARI);

      if (!guncelEskiToken) {
        return null;
      }

      const sonuc = await Keychain.setGenericPassword(
        TOKEN_KULLANICI,
        guncelEskiToken,
        {
          service: TOKEN_SERVICE,
        },
      );

      if (!sonuc) {
        console.warn("Keychain token taşıma işlemi başarısız.");
      }

      return guncelEskiToken;
    });
  } catch (hata) {
    console.error("Token okuma hatası:", hata);

    // Keychain erişilemezse eski depolamayı dene.
    try {
      return await AsyncStorage.getItem(TOKEN_ANAHTARI);
    } catch (storageHatasi) {
      console.error("Eski token okuma hatası:", storageHatasi);
      return null;
    }
  }
};

/**
 * Access token kaydeder.
 *
 * Tek başına veya tokenDepolamaIslemi içerisinden
 * çağrılabilir. Kendisi kilit almaz.
 */
export const tokenKaydet = async (token: string): Promise<void> => {
  if (!token || !token.trim()) {
    throw new Error("Geçersiz token kaydedilemez.");
  }

  const sonuc = await Keychain.setGenericPassword(TOKEN_KULLANICI, token, {
    service: TOKEN_SERVICE,
  });

  if (!sonuc) {
    throw new Error("Keychain token kaydı başarısız.");
  }

  // Eski ekranlarla geçici uyumluluk.
  await AsyncStorage.setItem(TOKEN_ANAHTARI, token);
};

// ============================================
// REFRESH TOKEN
// ============================================

export const refreshTokenGetir = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: REFRESH_TOKEN_SERVICE,
    });

    if (credentials && credentials.password) {
      return credentials.password;
    }

    return null;
  } catch (hata) {
    console.error("Refresh token okuma hatası:", hata);
    throw hata;
  }
};

/**
 * Refresh token kaydeder.
 *
 * Kendisi kilit almaz.
 * Birden fazla token işlemiyle birlikte kullanılacaksa
 * tokenDepolamaIslemi içerisinde çağrılmalıdır.
 */
export const refreshTokenKaydet = async (
  refreshToken: string,
): Promise<void> => {
  if (!refreshToken || !refreshToken.trim()) {
    throw new Error("Geçersiz refresh token kaydedilemez.");
  }

  const sonuc = await Keychain.setGenericPassword(
    REFRESH_TOKEN_KULLANICI,
    refreshToken,
    {
      service: REFRESH_TOKEN_SERVICE,
    },
  );

  if (!sonuc) {
    throw new Error("Refresh token Keychain kaydı başarısız.");
  }
};

/**
 * Yalnızca refresh tokenı siler.
 * Kendisi kilit almaz.
 */
export const refreshTokenSil = async (): Promise<void> => {
  await Keychain.resetGenericPassword({
    service: REFRESH_TOKEN_SERVICE,
  });
};

// ============================================
// TÜM TOKENLARI TEMİZLE
// ============================================

/**
 * Access token ve refresh tokenı temizler.
 *
 * Bu fonksiyon kendisi kilit almaz.
 * Çok adımlı bir işlemde çağıran taraf kilidi almalıdır.
 */
export const tokenSil = async (): Promise<void> => {
  let ilkHata: unknown = null;

  // Access tokenı Keychain'den sil.
  try {
    await Keychain.resetGenericPassword({
      service: TOKEN_SERVICE,
    });
  } catch (hata) {
    ilkHata = hata;
    console.error("Keychain access token silme hatası:", hata);
  }

  // Refresh tokenı Keychain'den sil.
  try {
    await Keychain.resetGenericPassword({
      service: REFRESH_TOKEN_SERVICE,
    });
  } catch (hata) {
    ilkHata = ilkHata ?? hata;
    console.error("Keychain refresh token silme hatası:", hata);
  }

  // Eski AsyncStorage kaydını sil.
  try {
    await AsyncStorage.removeItem(TOKEN_ANAHTARI);
  } catch (hata) {
    ilkHata = ilkHata ?? hata;
    console.error("AsyncStorage token silme hatası:", hata);
  }

  if (ilkHata) {
    throw ilkHata;
  }
};
