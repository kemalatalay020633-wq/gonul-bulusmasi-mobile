import { API_ADRESI } from "../config/api";
import i18n from "../dil/i18n";
import { tokenGetir } from "./tokenServisi";

export type EnumSecenegi = {
  kod: number;
  aciklama: string;
};

const enumCevirisiGetir = (
  endpoint: string,
  kod: number,
  varsayilanAciklama: string,
): string => {
  const ceviriAnahtari = `enums.${endpoint}.${kod}`;

  const ceviri = i18n.t(ceviriAnahtari, {
    defaultValue: varsayilanAciklama,
  });

  return ceviri;
};

const enumGetir = async (endpoint: string): Promise<EnumSecenegi[]> => {
  const token = await tokenGetir();

  if (!token) {
    throw new Error(
      i18n.t("common.sessionNotFound", {
        defaultValue: "Oturum bulunamadı. Lütfen tekrar giriş yap.",
      }),
    );
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

    throw new Error(
      mesaj ||
        i18n.t("common.optionsFetchFailed", {
          status: response.status,
          defaultValue: `Seçenekler alınamadı. HTTP ${response.status}`,
        }),
    );
  }

  const veri: unknown = await response.json();

  if (!Array.isArray(veri)) {
    throw new Error(
      i18n.t("common.invalidOptionsResponse", {
        endpoint,
        defaultValue: `${endpoint} endpointinden beklenen liste dönmedi.`,
      }),
    );
  }

  return (veri as EnumSecenegi[]).map((secenek) => ({
    ...secenek,
    aciklama: enumCevirisiGetir(endpoint, secenek.kod, secenek.aciklama),
  }));
};

export const meslekleriGetir = () => enumGetir("meslekler");

export const egitimleriGetir = () => enumGetir("egitimler");

export const medeniDurumlariGetir = () => enumGetir("medeni-durumlar");

export const mezhepleriGetir = () => enumGetir("mezhepler");

export const ilgiAlanlariniGetir = () => enumGetir("ilgi-alanlari");
