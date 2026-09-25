import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
