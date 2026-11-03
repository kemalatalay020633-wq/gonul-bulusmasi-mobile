import { API_ADRESI } from "../config/api";
import { tokenGetir } from "./tokenServisi";

export type EnumSecenegi = {
  kod: number;
  aciklama: string;
};

const enumGetir = async (endpoint: string): Promise<EnumSecenegi[]> => {
  const token = await tokenGetir();

  if (!token) {
    throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yap.");
  }

  const response = await fetch(`${API_ADRESI}/enums/${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const mesaj = await response.text();
    throw new Error(mesaj || `Seçenekler alınamadı. HTTP ${response.status}`);
  }

  const veri: unknown = await response.json();

  if (!Array.isArray(veri)) {
    throw new Error(`${endpoint} endpointinden beklenen liste dönmedi.`);
  }

  return veri as EnumSecenegi[];
};

export const meslekleriGetir = () => enumGetir("meslekler");
export const egitimleriGetir = () => enumGetir("egitimler");
export const medeniDurumlariGetir = () => enumGetir("medeni-durumlar");
export const mezhepleriGetir = () => enumGetir("mezhepler");
export const ilgiAlanlariniGetir = () => enumGetir("ilgi-alanlari");
