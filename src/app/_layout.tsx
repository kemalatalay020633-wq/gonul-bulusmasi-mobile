import { useEffect } from "react";
import { NativeModules, View } from "react-native";
import AppNavigator from "../navigation/AppNavigator";

export default function RootLayout() {
  useEffect(() => {
    // =====================================================
    // IN-CALL NATIVE MODÜL KONTROLÜ
    // =====================================================

    console.log(
      "🔍 TÜM INCALL NATIVE:",
      Object.keys(NativeModules).filter(
        (isim) =>
          isim.toLowerCase().includes("call") ||
          isim.toLowerCase().includes("incall"),
      ),
    );

    console.log("🔍 INCALL NATIVE:", NativeModules.InCallManager);

    console.log(
      "🔊 INCALL START TEST:",
      typeof NativeModules.InCallManager?.start,
    );

    // =====================================================
    // E2EE CİHAZ KİMLİĞİ MODÜLÜ KONTROLÜ
    // =====================================================

    const kimlikModulu = NativeModules.AramaKimlikModulu;

    console.log(
      "🔐 E2EE KIMLIK MODULU:",
      kimlikModulu ? Object.keys(kimlikModulu) : "BULUNAMADI",
    );

    console.log(
      "🔐 E2EE KIMLIK ANAHTAR TEST:",
      typeof kimlikModulu?.getOrCreateIdentityPublicKey,
    );

    console.log("🔐 E2EE IMZA TEST:", typeof kimlikModulu?.signHandshake);

    // =====================================================
    // E2EE WEBRTC MODÜLÜ KONTROLÜ
    // =====================================================

    const webRTCModulu = NativeModules.WebRTCModule;

    console.log(
      "🔒 E2EE WEBRTC MODULU:",
      webRTCModulu ? Object.keys(webRTCModulu) : "BULUNAMADI",
    );

    console.log(
      "🔒 E2EE SESSION TEST:",
      typeof webRTCModulu?.e2eeCreateSession,
    );

    console.log(
      "🔒 E2EE INITIALIZE TEST:",
      typeof webRTCModulu?.e2eeInitializeSession,
    );

    // =====================================================
    // TÜM NATIVE MODÜLLER
    // =====================================================

    console.log("📦 TÜM NATIVE MODÜL İSİMLERİ:", Object.keys(NativeModules));
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFCFA",
      }}
    >
      <AppNavigator />
    </View>
  );
}
