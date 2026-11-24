import "fast-text-encoding";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppRegistry } from "react-native";

import notifee, { EventType } from "@notifee/react-native";

import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";

import App, { GelenAramaApp } from "./App";

import {
  gelenAramaBildirimiGoster,
  gelenAramaBildiriminiKapat,
} from "./src/services/aramaBildirimServisi";

const messaging = getMessaging();

const BEKLEYEN_ARAMA_ANAHTARI = "bekleyen_fcm_arama";

/*
 * =========================================================
 * BEKLEYEN ARAMA KAYDET
 * =========================================================
 */

async function bekleyenAramayiKaydet(veri) {
  if (!veri?.callId || !veri?.callerId) {
    throw new Error("Bekleyen arama bilgileri eksik.");
  }

  const arama = {
    callId: String(veri.callId),
    callerId: String(veri.callerId),
    callerName: String(veri.callerName || ""),
    callType: String(veri.callType || "SES"),
    actionId: String(veri.actionId || "default"),
  };

  await AsyncStorage.setItem(BEKLEYEN_ARAMA_ANAHTARI, JSON.stringify(arama));

  console.log("BEKLEYEN ARAMA KAYDEDİLDİ:", arama);

  return arama;
}

/*
 * =========================================================
 * BEKLEYEN ARAMA KAYDINI TEMİZLE
 * =========================================================
 */

async function bekleyenAramayiTemizle(callId) {
  try {
    const kayit = await AsyncStorage.getItem(BEKLEYEN_ARAMA_ANAHTARI);

    if (!kayit) {
      return;
    }

    const bekleyenArama = JSON.parse(kayit);

    if (callId && bekleyenArama.callId !== String(callId)) {
      return;
    }

    await AsyncStorage.removeItem(BEKLEYEN_ARAMA_ANAHTARI);

    console.log("BEKLEYEN ARAMA TEMİZLENDİ:", callId);
  } catch (error) {
    console.error("BEKLEYEN ARAMA TEMİZLEME HATASI:", error);
  }
}

/*
 * =========================================================
 * NOTIFEE ARKA PLAN OLAYLARI
 * =========================================================
 */

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
      return;
    }

    const veri = detail.notification?.data;

    if (!veri || veri.type !== "INCOMING_CALL") {
      return;
    }

    const actionId = detail.pressAction?.id || "default";

    if (actionId === "reject") {
      await gelenAramaBildiriminiKapat(String(veri.callId));

      await bekleyenAramayiTemizle(String(veri.callId));

      console.log("GELEN ARAMA REDDETME EYLEMİ:", veri.callId);
      return;
    }

    await bekleyenAramayiKaydet({
      ...veri,
      actionId,
    });

    await gelenAramaBildiriminiKapat(String(veri.callId));

    console.log("ARAMA EYLEMİ KAYDEDİLDİ:", actionId);
  } catch (error) {
    console.error("NOTIFEE ARKA PLAN OLAY HATASI:", error);
  }
});

/*
 * =========================================================
 * FCM ARKA PLAN MESAJLARI
 * =========================================================
 */

setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log("FCM ARKA PLAN MESAJI:", remoteMessage);

  try {
    const veri = remoteMessage.data || {};

    const mesajTipi = veri.type;

    const callId = veri.callId ? String(veri.callId) : undefined;

    /*
     * -----------------------------------------------------
     * GELEN ARAMA
     * -----------------------------------------------------
     */

    if (mesajTipi === "INCOMING_CALL") {
      if (!veri.callId || !veri.callerId) {
        console.warn("FCM GELEN ARAMA BİLGİLERİ EKSİK.");
        return;
      }

      console.log("GELEN ARAMA ALINDI:", veri);

      /*
       * ÖNEMLİ:
       * Önce arama bilgilerini kaydet.
       * Sonra tam ekran açılışını tetikleyen
       * Notifee bildirimini oluştur.
       */

      await bekleyenAramayiKaydet({
        callId: veri.callId,
        callerId: veri.callerId,
        callerName: veri.callerName,
        callType: veri.callType,
        actionId: "default",
      });

      console.log(
        "ARAMA BİLGİLERİ KAYDEDİLDİ. TAM EKRAN AÇILIŞI BAŞLATILIYOR.",
      );

      /*
       * Notifee burada Android'in fullScreenIntent
       * mekanizmasını tetikler.
       *
       * Android, GELEN_ARAMA_BILESENI üzerinden
       * GelenAramaApp bileşenini açar.
       *
       * GelenAramaApp -> Messages -> ConversationPanel
       */

      await gelenAramaBildirimiGoster({
        callerId: String(veri.callerId),
        callerName: String(veri.callerName || ""),
        callId: String(veri.callId),
        callType: String(veri.callType || "SES"),
      });

      console.log("TAM EKRAN ARAMA TETİĞİ GÖNDERİLDİ:", callId);

      return;
    }

    /*
     * -----------------------------------------------------
     * ARAMA REDDEDİLDİ
     * -----------------------------------------------------
     */

    if (mesajTipi === "CALL_REJECTED") {
      console.log("FCM: ARAMA REDDEDİLDİ:", callId);

      if (callId) {
        await gelenAramaBildiriminiKapat(callId);
        await bekleyenAramayiTemizle(callId);
      }

      return;
    }

    /*
     * -----------------------------------------------------
     * ARAMA SONLANDIRILDI
     * -----------------------------------------------------
     */

    if (mesajTipi === "CALL_ENDED") {
      console.log("FCM: ARAMA SONLANDIRILDI:", callId);

      if (callId) {
        await gelenAramaBildiriminiKapat(callId);
        await bekleyenAramayiTemizle(callId);
      }

      return;
    }

    console.log("FCM MESAJ TİPİ İŞLENMEDİ:", mesajTipi);
  } catch (error) {
    console.error("FCM ARKA PLAN MESAJ İŞLEME HATASI:", error);
  }
});

/*
 * =========================================================
 * REACT NATIVE UYGULAMALARINI KAYDET
 * =========================================================
 */

// Normal uygulama.
AppRegistry.registerComponent("gonul-bulusmasi-mobile", () => App);

// Gelen arama için özel başlangıç bileşeni.
// Bu bileşen mevcut Messages ekranını açar.
AppRegistry.registerComponent(
  "gonul-bulusmasi-gelen-arama",
  () => GelenAramaApp,
);
