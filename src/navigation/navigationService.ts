import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const loginEkraninaYonlendir = () => {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: "index" }],
  });
};
