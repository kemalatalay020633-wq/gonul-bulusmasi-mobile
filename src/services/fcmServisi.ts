import { getMessaging, getToken } from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import { FCM_API_URL } from "../config/api";

export const fcmCihazKaydet = async (
  jwt: string,
  yeniToken?: string,
): Promise<boolean> => {
  try {
    console.log("========== FCM CİHAZ KAYIT BAŞLADI ==========");
    console.log("JWT VAR MI:", !!jwt);
    console.log("YENİ FCM TOKEN VERİLDİ Mİ:", !!yeniToken);
    console.log("PLATFORM:", Platform.OS);
    console.log("FCM API URL:", FCM_API_URL);

    // JWT kontrolü
    if (!jwt) {
      console.error("FCM KAYIT İPTAL: JWT BULUNAMADI");
      return false;
    }

    // Firebase Messaging
    console.log("FIREBASE MESSAGING ALINIYOR...");

    const mesajlasma = getMessaging();

    console.log("FIREBASE MESSAGING HAZIR");

    // FCM token al
    console.log("FCM TOKEN ALINIYOR...");

    const token = yeniToken || (await getToken(mesajlasma));

    console.log("FCM TOKEN ALINDI:", !!token);
    console.log("FCM TOKEN UZUNLUĞU:", token?.length ?? 0);

    if (!token) {
      console.error("FCM KAYIT İPTAL: FIREBASE TOKEN BOŞ");
      return false;
    }

    // Backend'e kayıt isteği
    const adres = `${FCM_API_URL}/token`;

    console.log("FCM TOKEN BACKEND'E GÖNDERİLİYOR...");
    console.log("İSTEK ADRESİ:", adres);

    const cevap = await fetch(adres, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS.toUpperCase(),
      }),
    });

    console.log("FCM BACKEND HTTP DURUMU:", cevap.status);

    // Backend hata kontrolü
    if (!cevap.ok) {
      const hataMetni = await cevap.text();

      console.error("FCM TOKEN KAYIT HATASI:", {
        status: cevap.status,
        hata: hataMetni,
      });

      console.log("========== FCM CİHAZ KAYIT BAŞARISIZ ==========");

      return false;
    }

    const cevapMetni = await cevap.text();

    console.log("FCM BACKEND CEVABI:", cevapMetni);
    console.log("FCM CİHAZ KAYDI BAŞARILI");
    console.log("========== FCM CİHAZ KAYIT TAMAMLANDI ==========");

    return true;
  } catch (error) {
    console.error("========== FCM CİHAZ KAYIT HATASI ==========");
    console.error("HATA DETAYI:", error);

    if (error instanceof Error) {
      console.error("HATA MESAJI:", error.message);
      console.error("HATA STACK:", error.stack);
    }

    return false;
  }
};
