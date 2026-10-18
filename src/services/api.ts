import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log("API İSTEĞİ:", `${config.baseURL ?? ""}${config.url ?? ""}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.log(
        "API HATASI:",
        error.response?.status ?? "NETWORK",
        error.config?.url ?? "",
        error.message,
      );
    }

    return Promise.reject(error);
  },
);

export default api;
