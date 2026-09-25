import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, NativeModules } from "react-native";

export default function RootLayout() {
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

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Slot />
    </View>
  );
}
