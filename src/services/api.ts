import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toByteArray } from "base64-js";

import { API_BASE_URL } from "../config/api";

import {
  refreshTokenGetir,
  refreshTokenKaydet,
  tokenDepolamaIslemi,
  tokenGetir,
  tokenKaydet,
} from "./tokenServisi";

import {
  oturumNesliGecerliMi,
  oturumNesliniGetir,
  oturumuSonlandir,
} from "./authSession";

// ============================================
// TYPES
// ============================================

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionGeneration?: number;
}

interface RefreshTokenResponse {
  message: string;
  userId: number;
  username: string;
  token: string;
  refreshToken: string;
  role: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// ============================================
// API INSTANCE
// ============================================

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// SINGLE-FLIGHT STATE
// ============================================

let refreshPromise: Promise<string | null> | null = null;

// ============================================
// AUTH URL CONTROL
// ============================================

const authEndpointMi = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  const temizUrl = url.toLowerCase();

  return (
    temizUrl.includes("/auth/login") ||
    temizUrl.includes("/auth/register") ||
    temizUrl.includes("/auth/refresh") ||
    temizUrl.includes("/auth/logout")
  );
};

// ============================================
// AUTH HEADER
// ============================================

const authorizationTokeniniGetir = (
  config: InternalAxiosRequestConfig,
): string | null => {
  const authorization = config.headers?.Authorization;

  if (typeof authorization !== "string") {
    return null;
  }

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.substring(7).trim() || null;
};

// ============================================
// REFRESH ERROR CLASSIFICATION
// ============================================

const refreshTokenGecersizMi = (hata: unknown): boolean => {
  if (!axios.isAxiosError(hata)) {
    return false;
  }

  const durum = hata.response?.status;

  return durum === 400 || durum === 401 || durum === 403;
};

// ============================================
// REFRESH TOKEN ROTATION
// ============================================

const refreshTokenYenile = async (): Promise<string | null> => {
  const baslangicOturumNesli = oturumNesliniGetir();

  let mevcutRefreshToken: string | null = null;

  try {
    mevcutRefreshToken = await refreshTokenGetir();

    if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
      console.log("REFRESH İPTAL: OTURUM DEĞİŞMİŞ.");
      return null;
    }

    if (!mevcutRefreshToken) {
      console.log("REFRESH TOKEN BULUNAMADI.");

      if (oturumNesliGecerliMi(baslangicOturumNesli)) {
        await oturumuSonlandir();
      }

      return null;
    }

    // Normal API instance kullanılmıyor.
    // Refresh isteğinin interceptor döngüsüne girmesini önler.
    const response = await axios.post<RefreshTokenResponse>(
      `${API_BASE_URL}/api/auth/refresh`,
      {
        refreshToken: mevcutRefreshToken,
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const yeniAccessToken = response.data?.token;
    const yeniRefreshToken = response.data?.refreshToken;

    if (
      typeof yeniAccessToken !== "string" ||
      !yeniAccessToken.trim() ||
      typeof yeniRefreshToken !== "string" ||
      !yeniRefreshToken.trim()
    ) {
      throw new Error(
        "Sunucudan geçersiz access token veya refresh token yanıtı alındı.",
      );
    }

    // ============================================
    // OTURUM NESLİ KONTROLÜ
    // ============================================

    if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
      console.log("REFRESH İPTAL: OTURUM NESLİ DEĞİŞMİŞ.");
      return null;
    }

    // ============================================
    // ATOMİK TOKEN KAYIT AKIŞI
    // ============================================

    const kayitBasarili = await tokenDepolamaIslemi(async () => {
      // Kilit beklenirken oturum değişmiş olabilir.
      if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
        return false;
      }

      const guncelRefreshToken = await refreshTokenGetir();

      if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
        return false;
      }

      // Başka bir işlem refresh tokenı değiştirmişse
      // eski refresh yanıtını kaydetme.
      if (guncelRefreshToken !== mevcutRefreshToken) {
        console.log("REFRESH İPTAL: REFRESH TOKEN DEĞİŞMİŞ.");
        return false;
      }

      // Önce yeni refresh token kaydedilir.
      await refreshTokenKaydet(yeniRefreshToken);

      if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
        return false;
      }

      // Ardından yeni access token kaydedilir.
      await tokenKaydet(yeniAccessToken);

      if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
        return false;
      }

      const kayitliRefreshToken = await refreshTokenGetir();

      if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
        return false;
      }

      return kayitliRefreshToken === yeniRefreshToken;
    });

    if (!kayitBasarili) {
      console.log("REFRESH TOKEN KAYDI TAMAMLANAMADI.");
      return null;
    }

    console.log("TOKEN YENİLEME BAŞARILI.");

    return yeniAccessToken;
  } catch (hata) {
    console.error("TOKEN YENİLEME HATASI:", hata);

    // Eski oturumun hatası yeni oturumu etkileyemez.
    if (!oturumNesliGecerliMi(baslangicOturumNesli)) {
      console.log("ESKİ OTURUM HATASI: YENİ OTURUMA DOKUNULMADI.");
      return null;
    }

    // Kesin kimlik doğrulama hatası.
    if (refreshTokenGecersizMi(hata)) {
      console.log("REFRESH TOKEN GEÇERSİZ VEYA SÜRESİ DOLMUŞ.");

      if (oturumNesliGecerliMi(baslangicOturumNesli)) {
        await oturumuSonlandir();
      }

      return null;
    }

    // Ağ, timeout ve 5xx hatalarında oturum korunur.
    console.log("GEÇİCİ TOKEN YENİLEME HATASI. OTURUM KORUNUYOR.");

    throw hata;
  }
};

// ============================================
// SINGLE-FLIGHT MANAGER
// ============================================

const ortakTokenYenile = (): Promise<string | null> => {
  if (!refreshPromise) {
    console.log("SINGLE-FLIGHT: REFRESH BAŞLATILIYOR.");

    refreshPromise = refreshTokenYenile().finally(() => {
      refreshPromise = null;

      console.log("SINGLE-FLIGHT: REFRESH İŞLEMİ TAMAMLANDI.");
    });
  } else {
    console.log("SINGLE-FLIGHT: DEVAM EDEN REFRESH İŞLEMİ BEKLENİYOR.");
  }

  return refreshPromise;
};

// ============================================
// JWT EXPIRY CONTROL
// ============================================

const jwtBitisZamaniGetir = (token: string): number | null => {
  try {
    // JWT üç bölümden oluşmalıdır:
    // Header.Payload.Signature
    const bolumler = token.split(".");

    if (bolumler.length !== 3) {
      return null;
    }

    const payloadUrl = bolumler[1];

    if (!payloadUrl) {
      return null;
    }

    // Base64URL karakterlerini standart Base64 biçimine dönüştür.
    const base64 = payloadUrl.replace(/-/g, "+").replace(/_/g, "/");

    // Geçersiz karakterleri kabul etme.
    if (!/^[A-Za-z0-9+/]+$/.test(base64)) {
      return null;
    }

    // Base64 padding uzunluğunu tamamla.
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    // base64-js Base64 verisini byte dizisine çözer.
    const bytes = toByteArray(padded);

    // Byte dizisini UTF-8 metnine dönüştür.
    // TextDecoder veya global atob gerektirmez.
    let encoded = "";

    for (let i = 0; i < bytes.length; i++) {
      encoded += `%${bytes[i].toString(16).padStart(2, "0")}`;
    }

    const decoded = decodeURIComponent(encoded);

    const data: unknown = JSON.parse(decoded);

    if (!data || typeof data !== "object" || !("exp" in data)) {
      return null;
    }

    const exp = (data as { exp?: unknown }).exp;

    if (typeof exp !== "number" || !Number.isFinite(exp)) {
      return null;
    }

    return exp;
  } catch (hata) {
    console.warn("JWT BİTİŞ ZAMANI OKUNAMADI:", hata);
    return null;
  }
};

// ============================================
// PUBLIC ACCESS TOKEN MANAGER
// ============================================

export const gecerliAccessTokenGetir = async (): Promise<string | null> => {
  const oturumNesli = oturumNesliniGetir();

  if (!oturumNesliGecerliMi(oturumNesli)) {
    return null;
  }

  const mevcutToken = await tokenGetir();

  if (!oturumNesliGecerliMi(oturumNesli)) {
    return null;
  }

  if (mevcutToken) {
    const bitisZamani = jwtBitisZamaniGetir(mevcutToken);

    // JWT okunamıyorsa mevcut tokenı koru.
    // Sunucu doğrulaması ayrıca yapılacaktır.
    if (bitisZamani === null) {
      return mevcutToken;
    }

    const simdikiZaman = Math.floor(Date.now() / 1000);

    // Tokenın bitmesine 60 saniyeden fazla varsa kullan.
    if (bitisZamani > simdikiZaman + 60) {
      return mevcutToken;
    }
  }

  console.log("JWT SÜRESİ DOLUYOR. REFRESH BAŞLATILIYOR.");

  const yeniToken = await ortakTokenYenile();

  if (!oturumNesliGecerliMi(oturumNesli)) {
    return null;
  }

  if (!yeniToken) {
    return null;
  }

  console.log("GÜNCEL ACCESS TOKEN HAZIR.");

  return yeniToken;
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log("API İSTEĞİ:", `${config.baseURL ?? ""}${config.url ?? ""}`);
    }

    // Auth endpointlerine otomatik token ekleme.
    if (authEndpointMi(config.url)) {
      return config;
    }

    const istekNesli = oturumNesliniGetir();

    const retryConfig = config as RetryableRequestConfig;
    retryConfig._sessionGeneration = istekNesli;

    if (!oturumNesliGecerliMi(istekNesli)) {
      throw new Error("İstek sırasında oturum değişti.");
    }

    // Elle Authorization verilmişse üzerine yazma.
    if (!config.headers.Authorization) {
      // API isteği öncesinde tokenın süresini kontrol et.
      const token = await gecerliAccessTokenGetir();

      if (!oturumNesliGecerliMi(istekNesli)) {
        throw new Error("Token alınırken oturum değişti.");
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    if (__DEV__) {
      console.log(
        "API HATASI:",
        error.response?.status ?? "NETWORK",
        error.config?.url ?? "",
        error.message,
      );
    }

    // Yalnızca 401 yanıtlarını ele al.
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Auth endpointleri ve tekrar denenmiş istekler hariç.
    if (authEndpointMi(originalRequest.url) || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ============================================
    // OTURUM NESLİ KONTROLÜ
    // ============================================

    const istekNesli = originalRequest._sessionGeneration;

    if (typeof istekNesli !== "number" || !oturumNesliGecerliMi(istekNesli)) {
      console.log("ESKİ OTURUMDAN GELEN 401: REFRESH BAŞLATILMADI.");

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const gonderilenToken = authorizationTokeniniGetir(originalRequest);

      const mevcutAccessToken = await tokenGetir();

      if (!oturumNesliGecerliMi(istekNesli)) {
        console.log("401 İŞLEMİ İPTAL: OTURUM DEĞİŞMİŞ.");
        return Promise.reject(error);
      }

      // ============================================
      // GECİKMİŞ 401 KONTROLÜ
      // ============================================

      if (
        mevcutAccessToken &&
        gonderilenToken &&
        mevcutAccessToken !== gonderilenToken
      ) {
        console.log("GECİKMİŞ 401: YENİ TOKEN İLE İSTEK TEKRARLANIYOR.");

        originalRequest.headers.Authorization = `Bearer ${mevcutAccessToken}`;

        return api(originalRequest);
      }

      // ============================================
      // ORTAK TOKEN YENİLEME
      // ============================================

      const yeniAccessToken = await ortakTokenYenile();

      if (!yeniAccessToken) {
        return Promise.reject(error);
      }

      if (!oturumNesliGecerliMi(istekNesli)) {
        console.log("İSTEK TEKRARI İPTAL: OTURUM NESLİ DEĞİŞMİŞ.");

        return Promise.reject(error);
      }

      // ============================================
      // ORİJİNAL İSTEĞİ TEKRARLA
      // ============================================

      originalRequest.headers.Authorization = `Bearer ${yeniAccessToken}`;

      console.log("ORİJİNAL İSTEK YENİ ACCESS TOKEN İLE TEKRARLANIYOR.");

      return api(originalRequest);
    } catch (yenilemeHatasi) {
      console.error("401 TOKEN YENİLEME AKIŞI HATASI:", yenilemeHatasi);

      // Geçici ağ/sunucu hatasında oturum açık kalır.
      return Promise.reject(yenilemeHatasi);
    }
  },
);

// ============================================
// ERROR MESSAGE
// ============================================

export const kullaniciHataMesaji = (hata: unknown): string => {
  if (!axios.isAxiosError(hata)) {
    return "Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.";
  }

  const axiosHatasi = hata as AxiosError;
  const durum = axiosHatasi.response?.status;
  const veri = axiosHatasi.response?.data;

  if (!axiosHatasi.response) {
    if (
      axiosHatasi.code === "ECONNABORTED" ||
      axiosHatasi.code === "ETIMEDOUT"
    ) {
      return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
    }

    return "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  switch (durum) {
    case 400:
      return "Girdiğiniz bilgileri kontrol edip tekrar deneyin.";

    case 401:
      return "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.";

    case 403:
      return "Bu işlem için yetkiniz bulunmuyor.";

    case 404:
      return "İstenen içerik bulunamadı.";

    case 408:
      return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";

    case 409:
      return "Bu işlem mevcut bilgilerle gerçekleştirilemiyor.";

    case 413:
      return "Gönderdiğiniz dosya izin verilen boyutu aşıyor.";

    case 415:
      return "Bu dosya türü desteklenmiyor.";

    case 422:
      return "Gönderdiğiniz bilgiler kontrol edilemedi.";

    case 429:
      return "Çok fazla istek gönderildi. Lütfen biraz bekleyin.";

    default:
      if (durum !== undefined && durum >= 500) {
        return "Sunucuda geçici bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.";
      }

      break;
  }

  if (veri && typeof veri === "object") {
    const govde = veri as Record<string, unknown>;
    const mesaj = govde.mesaj ?? govde.message;

    if (
      typeof mesaj === "string" &&
      mesaj.trim().length > 0 &&
      mesaj.trim().length <= 200 &&
      !/<[^>]+>/.test(mesaj) &&
      !/\b(exception|stacktrace|sqlstate|hibernate|org\.springframework)\b/i.test(
        mesaj,
      )
    ) {
      return mesaj.trim();
    }
  }

  return "İşleminiz gerçekleştirilemedi. Lütfen tekrar deneyin.";
};

export default api;
