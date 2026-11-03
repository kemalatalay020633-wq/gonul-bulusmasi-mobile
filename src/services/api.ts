import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../config/api";
import { oturumuSonlandir } from "./authSession";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const kullaniciHataMesaji = (hata: unknown): string => {
  if (!axios.isAxiosError(hata)) {
    return "Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.";
  }

  const axiosHatasi = hata as AxiosError;
  const durum = axiosHatasi.response?.status;
  const veri = axiosHatasi.response?.data;

  // Sunucu bağlantısı kurulamadı.
  if (!axiosHatasi.response) {
    if (
      axiosHatasi.code === "ECONNABORTED" ||
      axiosHatasi.code === "ETIMEDOUT"
    ) {
      return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
    }

    return "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  // Sunucudan gelen hata yanıtı.
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

  // Yalnızca teknik ayrıntı içermeyen, kısa sunucu mesajlarını kullan.
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

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log("API İSTEĞİ:", `${config.baseURL ?? ""}${config.url ?? ""}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (__DEV__) {
      console.log(
        "API HATASI:",
        error.response?.status ?? "NETWORK",
        error.config?.url ?? "",
        error.message,
      );
    }

    // Yalnızca 401 durumunda oturumu kapat.
    // 403 yetki hatasıdır, kullanıcıyı sistemden çıkarma.
    if (error.response?.status === 401) {
      console.log("401 ALGILANDI: OTURUM SONLANDIRILIYOR");

      await oturumuSonlandir();
    }

    return Promise.reject(error);
  },
);

export default api;
