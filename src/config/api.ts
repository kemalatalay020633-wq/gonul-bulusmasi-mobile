import { Platform } from "react-native";

// ============================================
// SUNUCU AYARLARI
// ============================================

// Bilgisayarın yerel ağ IP adresi
export const SUNUCU_IP = "192.168.1.6";

// Backend portu.
// Bu port için backend port-forward komutu açık olmalıdır.
export const SUNUCU_PORT = 18081;

// ============================================
// API ADRESLERİ
// ============================================

export const API_BASE_URL = `http://${SUNUCU_IP}:${SUNUCU_PORT}`;
export const WS_BASE_URL = `ws://${SUNUCU_IP}:${SUNUCU_PORT}`;

// API ana adresi
export const API_URL = API_BASE_URL;
export const API_ADRESI = `${API_BASE_URL}/api`;

// Kimlik doğrulama
export const AUTH_API_URL = `${API_ADRESI}/auth`;

// Kullanıcı
export const USER_API_URL = `${API_ADRESI}/users`;

// Profil
export const PROFILE_API_URL = `${API_ADRESI}/profiles`;

// Mesaj
export const MESSAGE_API_URL = `${API_ADRESI}/messages`;

// Beğeni
export const LIKE_API_URL = `${API_ADRESI}/likes`;

// Eşleşme
export const MATCH_API_URL = `${API_ADRESI}/matches`;

// Favoriler
export const FAVORITE_API_URL = `${API_ADRESI}/favorites`;

// Doğrulama
export const VERIFICATION_API_URL = `${API_ADRESI}/verifications`;

// Enum seçenekleri
export const ENUM_API_URL = `${API_ADRESI}/enums`;

// ============================================
// WEBSOCKET
// ============================================

// Backend'deki /ws-native endpoint'i için.
// Gerçek WebSocket bağlantısı test edilerek doğrulanmalıdır.
export const WEBSOCKET_URL = `${WS_BASE_URL}/ws-native`;

// Platform
export const PLATFORM = Platform.OS;

// ============================================
// DIŞA AKTARIM
// ============================================

export default {
  SUNUCU_IP,
  SUNUCU_PORT,
  API_BASE_URL,
  WS_BASE_URL,
  API_URL,
  API_ADRESI,
  AUTH_API_URL,
  USER_API_URL,
  PROFILE_API_URL,
  MESSAGE_API_URL,
  LIKE_API_URL,
  MATCH_API_URL,
  FAVORITE_API_URL,
  VERIFICATION_API_URL,
  ENUM_API_URL,
  WEBSOCKET_URL,
  PLATFORM,
};
