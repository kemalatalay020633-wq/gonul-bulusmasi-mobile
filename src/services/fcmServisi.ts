import { getMessaging, getToken } from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import { FCM_API_URL } from "../config/api";

export const fcmCihazKaydet = async (
  jwt: string,
  yeniToken?: string,
): Promise<boolean> => {
  try {
    if (!jwt) return false;

    const mesajlasma = getMessaging();
    const token = yeniToken || (await getToken(mesajlasma));

    if (!token) return false;

    const cevap = await fetch(`${FCM_API_URL}/token`, {
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

    if (!cevap.ok) {
      console.error("FCM TOKEN KAYIT HATASI:", cevap.status);
      return false;
    }

    console.log("FCM CİHAZ KAYDI BAŞARILI");
    return true;
  } catch (error) {
    console.error("FCM CİHAZ KAYIT HATASI:", error);
    return false;
  }
};
