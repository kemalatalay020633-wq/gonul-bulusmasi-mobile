import { Platform } from "react-native";

export const SUNUCU_IP = "192.168.1.2";

export const SUNUCU_PORT = 8081;

export const API_BASE_URL = `http://${SUNUCU_IP}:${SUNUCU_PORT}`;

export const WS_BASE_URL = `ws://${SUNUCU_IP}:${SUNUCU_PORT}`;

export const API_URL = API_BASE_URL;

export const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

export const USER_API_URL = `${API_BASE_URL}/api/users`;

export const PROFILE_API_URL = `${API_BASE_URL}/api/profiles`;

export const MESSAGE_API_URL = `${API_BASE_URL}/api/messages`;

export const LIKE_API_URL = `${API_BASE_URL}/api/likes`;

export const MATCH_API_URL = `${API_BASE_URL}/api/matches`;

export const FAVORITE_API_URL = `${API_BASE_URL}/api/favorites`;

export const VERIFICATION_API_URL = `${API_BASE_URL}/api/verifications`;

export const WEBSOCKET_URL = `${WS_BASE_URL}/ws-native`;

export const PLATFORM = Platform.OS;

export default {
  SUNUCU_IP,
  SUNUCU_PORT,
  API_BASE_URL,
  WS_BASE_URL,
  API_URL,
  AUTH_API_URL,
  USER_API_URL,
  PROFILE_API_URL,
  MESSAGE_API_URL,
  LIKE_API_URL,
  MATCH_API_URL,
  FAVORITE_API_URL,
  VERIFICATION_API_URL,
  WEBSOCKET_URL,
  PLATFORM,
};
