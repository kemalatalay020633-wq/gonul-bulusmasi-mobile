// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
const API_ADRESI = API_BASE_URL + "/api";

export interface LikeDto {
  id: number;
  userId: number;
  likedUserId: number;
  createdAt?: string | null;
}

export const beniBegenenleriGetir = async (
  token: string,
  kullaniciId: number,
): Promise<LikeDto[]> => {
  if (!token || !token.trim()) {
    throw new Error("Oturum bulunamadı.");
  }

  const response = await fetch(
    `${API_ADRESI}/likes/beni-begenenler/${kullaniciId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Begenenler alınamadı. HTTP ${response.status}`);
  }

  if (!text.trim()) {
    return [];
  }

  return JSON.parse(text) as LikeDto[];
};
