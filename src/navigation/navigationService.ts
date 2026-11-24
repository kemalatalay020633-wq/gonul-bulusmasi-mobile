import {
  createNavigationContainerRef,
  StackActions,
} from "@react-navigation/native";

import type { RootStackParamList } from "./types";

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

export const loginEkraninaYonlendir = (): void => {
  if (!navigationRef.isReady()) {
    console.warn("GİRİŞ YÖNLENDİRME: NAVIGATION HAZIR DEĞİL");
    return;
  }

  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: "index" }],
  });
};

export const mesajlaraYonlendir = (): boolean => {
  if (!navigationRef.isReady()) {
    console.warn("MESAJLARA YÖNLENDİRME: NAVIGATION HAZIR DEĞİL");
    return false;
  }

  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: "messages" }],
  });

  return true;
};

export const anaSayfayaYonlendir = (): boolean => {
  if (!navigationRef.isReady()) {
    console.warn("ANA SAYFA YÖNLENDİRME: NAVIGATION HAZIR DEĞİL");
    return false;
  }

  navigationRef.resetRoot({
    index: 0,
    routes: [{ name: "home" }],
  });

  return true;
};

/**
 * Gelen aramayı mevcut ekrana göre yönlendirir.
 *
 * Messages ekranındaysa mevcut ConversationPanel akışını korur.
 * Başka bir ekrandaysa Messages ekranını arka planda açar ve
 * yeni incomingCall ekranını onun üzerine ekler.
 */
export const gelenAramaEkraninaYonlendir = (
  gelenArayanId: number,
  callId: string,
): boolean => {
  if (!navigationRef.isReady()) {
    console.warn("GELEN ARAMA: NAVIGATION HAZIR DEĞİL");
    return false;
  }

  if (
    !Number.isInteger(gelenArayanId) ||
    gelenArayanId <= 0 ||
    !callId?.trim()
  ) {
    console.error("GELEN ARAMA: GEÇERSİZ PARAMETRELER", {
      gelenArayanId,
      callId,
    });
    return false;
  }

  const mevcutEkran = navigationRef.getCurrentRoute()?.name;

  if (mevcutEkran === "incomingCall") {
    console.log("GELEN ARAMA EKRANI ZATEN AÇIK");
    return true;
  }

  // Kullanıcı zaten mesaj ekranındaysa ConversationPanel kullanılır.
  if (mevcutEkran === "messages") {
    navigationRef.navigate("messages", {
      gelenArayanId,
      callId,
      aramaModu: false,
      gelenAramaArayuzuDisarida: false,
    });

    console.log("GELEN ARAMA MEVCUT CONVERSATION PANEL'E AKTARILDI:", {
      gelenArayanId,
      callId,
    });

    return true;
  }

  // Başka ekrandaysa Messages arka planda, incomingCall üstte açılır.
  const kaynakEkran = mevcutEkran || "home";

  navigationRef.dispatch(
    StackActions.push("messages", {
      gelenArayanId,
      callId,
      aramaModu: true,
      gelenAramaArayuzuDisarida: true,
    }),
  );

  navigationRef.dispatch(
    StackActions.push("incomingCall", {
      kaynakEkran,
    }),
  );

  console.log("GELEN ARAMA AYRI EKRANDA AÇILDI:", {
    kaynakEkran,
    gelenArayanId,
    callId,
  });

  return true;
};
