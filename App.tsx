import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from "@react-native-firebase/messaging";

import AppNavigator from "./src/navigation/AppNavigator";
import { fcmCihazKaydet } from "./src/services/fcmServisi";

export default function App() {
  useEffect(() => {
    let mesajDinleyici: (() => void) | undefined;
    let tokenDinleyici: (() => void) | undefined;
    let aktif = true;

    const fcmBaslat = async () => {
      try {
        if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
          const izin = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (izin !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log("FCM BİLDİRİM İZNİ VERİLMEDİ");
            return;
          }
        }

        const mesajlasma = getMessaging();
        const token = await getToken(mesajlasma);

        if (!aktif) return;

        console.log("FCM TOKEN ALINDI");
        console.log("TOKEN UZUNLUĞU:", token.length);

        // Daha önce giriş yapılmışsa cihazı backend'e kaydet.
        const jwt = await AsyncStorage.getItem("token");

        if (jwt && aktif) {
          await fcmCihazKaydet(jwt, token);
        }

        // Token yenilenirse backend kaydını güncelle.
        tokenDinleyici = onTokenRefresh(mesajlasma, async (yeniToken) => {
          if (!aktif) return;

          const mevcutJwt = await AsyncStorage.getItem("token");

          if (mevcutJwt) {
            await fcmCihazKaydet(mevcutJwt, yeniToken);
          }
        });

        // Uygulama açıkken gelen mesajları dinle.
        mesajDinleyici = onMessage(mesajlasma, async (remoteMessage) => {
          console.log("FCM ÖN PLAN MESAJI:", remoteMessage);

          const veri = remoteMessage.data || {};

          if (veri.type === "INCOMING_CALL") {
            console.log("GELEN ARAMA:", veri);
            console.log("ARAMAYI YAPAN:", veri.callerName);
            console.log("ARAMA TÜRÜ:", veri.callType);
          }

          if (veri.type === "NEW_MESSAGE") {
            console.log("YENİ MESAJ BİLDİRİMİ ALINDI");
          }
        });
      } catch (error) {
        console.error("FCM BAŞLATMA HATASI:", error);
      }
    };

    fcmBaslat();

    return () => {
      aktif = false;
      mesajDinleyici?.();
      tokenDinleyici?.();
    };
  }, []);

  return <AppNavigator />;
}
