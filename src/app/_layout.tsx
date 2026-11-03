import { useEffect } from "react";
import { NativeModules, View } from "react-native";
import AppNavigator from "../navigation/AppNavigator";

export default function RootLayout() {
  useEffect(() => {
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
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFCFA" }}>
      <AppNavigator />
    </View>
  );
}
