import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ADRESI } from "../config/api";

export type EnumSecenegi = {
  kod: number;
  aciklama: string;
};

const tokenAl = async (): Promise<string> => {
  return (await AsyncStorage.getItem("token")) ?? "";
};

const enumGetir = async (endpoint: string): Promise<EnumSecenegi[]> => {
  const token = await tokenAl();

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

  return (await response.json()) as EnumSecenegi[];
};

export const meslekleriGetir = () => enumGetir("meslekler");
export const egitimleriGetir = () => enumGetir("egitimler");
export const medeniDurumlariGetir = () => enumGetir("medeni-durumlar");
export const mezhepleriGetir = () => enumGetir("mezhepler");
export const ilgiAlanlariniGetir = () => enumGetir("ilgi-alanlari");
