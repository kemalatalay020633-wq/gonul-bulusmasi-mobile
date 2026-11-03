import "fast-text-encoding";

import { AppRegistry } from "react-native";

import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";

import App from "./App";

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log("FCM ARKA PLAN MESAJI:", remoteMessage);

  const veri = remoteMessage.data || {};

  if (veri.type === "INCOMING_CALL") {
    console.log("ARKA PLAN GELEN ARAMA:", veri);
  }
});

AppRegistry.registerComponent("gonul-bulusmasi-mobile", () => App);
