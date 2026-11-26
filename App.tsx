import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { i18nHazir } from "./src/dil/i18n";
import aramaWebRTC from "./src/services/AramaWebRTC";
import merkeziStompServisi from "./src/services/MerkeziStompServisi";

import notifee, { EventType } from "@notifee/react-native";

import AppNavigator from "./src/navigation/AppNavigator";

import { gelenAramaBildiriminiKapat } from "./src/services/aramaBildirimServisi";

import { gecerliAccessTokenGetir } from "./src/services/api";
import { fcmCihazKaydet } from "./src/services/fcmServisi";
import { premiumKontrolEt } from "./src/services/premiumKontrolServisi";

import {
  bekleyenAramayiKaydet,
  bekleyenAramayiSil,
} from "./src/services/bekleyenAramaServisi";

import { gelenAramaEkraninaYonlendir } from "./src/navigation/navigationService";

type BaslangicEkrani = "index" | "messages";

const metinAl = (deger: unknown): string | undefined => {
  return typeof deger === "string" ? deger : undefined;
};

/*
 * =========================================================
 * BİLDİRİM TIKLAMA İŞLEMİ
 * =========================================================
 */

async function bildirimEyleminiIsle(
  bildirim: any,
  actionId: string,
  yonlendirmeYap = true,
) {
  try {
    const veri = bildirim?.data;

    if (!veri || veri.type !== "INCOMING_CALL") {
      return;
    }

    const callId = metinAl(veri.callId);
    const callerId = metinAl(veri.callerId);

    if (!callId || !callerId) {
      console.warn("BİLDİRİM ARAMA BİLGİLERİ EKSİK");
      return;
    }

    await bekleyenAramayiKaydet({
      callId,
      callerId,
      callerName: metinAl(veri.callerName) || "",
      callType: metinAl(veri.callType) || "SES",
      actionId,
    });

    console.log("BİLDİRİM EYLEMİ KAYDEDİLDİ:", actionId, callId);

    if (actionId === "reject") {
      await gelenAramaBildiriminiKapat(callId);
      await bekleyenAramayiSil();

      console.log("ARAMA REDDETME EYLEMİ ALINDI:", callId);
      return;
    }

    await gelenAramaBildiriminiKapat(callId);

    // Özel arama açılışında Navigation henüz hazır olmayabilir.
    if (!yonlendirmeYap) {
      console.log("ARAMA BİLGİSİ KAYDEDİLDİ. MESSAGES EKRANI BEKLENİYOR.");
      return;
    }

    // Güncel access token al.
    // Gerekirse refresh token ile yenileme yapılır.
    const jwt = await gecerliAccessTokenGetir();

    if (!jwt) {
      console.warn("BİLDİRİME TIKLANDI ANCAK GEÇERLİ OTURUM TOKENI ALINAMADI.");
      return;
    }

    const yonlendirildi = gelenAramaEkraninaYonlendir(Number(callerId), callId);

    console.log("DOĞRUDAN GELEN ARAMA EKRANINA YÖNLENDİRME:", yonlendirildi);
  } catch (error) {
    console.error("BİLDİRİM EYLEMİ İŞLEME HATASI:", error);
  }
}

/*
 * =========================================================
 * ARAMA DURUMUNU TEMİZLE
 * =========================================================
 */

async function aramaDurumunuTemizle(
  mesajTipi: string | undefined,
  callId: string | undefined,
) {
  if (mesajTipi !== "CALL_REJECTED" && mesajTipi !== "CALL_ENDED") {
    return;
  }

  if (!callId) {
    console.warn("ARAMA DURUM BİLDİRİMİNDE CALL ID EKSİK");
    return;
  }

  try {
    console.log("ARAMA DURUMU ALINDI:", mesajTipi, callId);

    await gelenAramaBildiriminiKapat(callId);

    const kayit = await AsyncStorage.getItem("bekleyen_fcm_arama");

    if (kayit) {
      try {
        const bekleyenArama = JSON.parse(kayit);

        if (bekleyenArama.callId === callId) {
          await bekleyenAramayiSil();
        }
      } catch (error) {
        console.error("BEKLEYEN ARAMA KAYDI OKUNAMADI:", error);
      }
    }

    console.log("ARAMA VE BEKLEYEN KAYIT TEMİZLENDİ");
  } catch (error) {
    console.error("ARAMA DURUMU TEMİZLEME HATASI:", error);
  }
}

/*
 * =========================================================
 * ANA APP
 * =========================================================
 */

function App({
  baslangicEkrani = "index",
  aramaModu = false,
}: {
  baslangicEkrani?: BaslangicEkrani;
  aramaModu?: boolean;
}) {
  const [aramaHazir, setAramaHazir] = useState(!aramaModu);
  const [dilHazir, setDilHazir] = useState(false);

  /*
   * =====================================================
   * DİL SİSTEMİ
   * =====================================================
   */

  useEffect(() => {
    let aktif = true;

    i18nHazir
      .catch((hata) => {
        console.error("DİL SİSTEMİ BAŞLATILAMADI:", hata);
      })
      .finally(() => {
        if (aktif) {
          setDilHazir(true);
        }
      });

    return () => {
      aktif = false;
    };
  }, []);
  /*
   * =========================================================
   * GLOBAL WEBRTC VE MERKEZİ STOMP
   * =========================================================
   *
   * Bu bağlantı Messages ekranından bağımsız çalışır.
   * Arama sinyalleri uygulamanın bütün ekranlarında dinlenir.
   */

  useEffect(() => {
    let aktif = true;

    // Merkezi STOMP üzerinden gelen arama sinyallerini dinle.
    const dinleyiciTemizle = merkeziStompServisi.dinle((message) => {
      if (!aktif) {
        return;
      }

      const destination = message.headers.destination;

      if (destination?.startsWith("/topic/arama/") && message.body) {
        console.log("📞 GLOBAL WEBRTC ARAMA SİNYALİ ALINDI:", destination);

        try {
          aramaWebRTC.gelenAramaSinyaliniIsle(message.body);
        } catch (error) {
          console.error("❌ GLOBAL WEBRTC SİNYAL İŞLEME HATASI:", error);
        }
      }
    });

    // WebRTC'nin bütün giden arama sinyallerini
    // merkezi STOMP servisine yönlendir.
    aramaWebRTC.sinyalGondericiyiAyarla(async (sinyal) => {
      if (!aktif) {
        throw new Error("Global WebRTC taşıyıcısı aktif değil.");
      }

      await merkeziStompServisi.aramaSinyaliGonder(sinyal);
    });

    // Merkezi STOMP yeniden bağlandığında WebRTC'yi bilgilendir.
    merkeziStompServisi.baglantiKurulduCallbackAyarla(() => {
      if (!aktif) {
        return;
      }

      console.log("🟢 GLOBAL STOMP BAĞLANTISI WEBRTC'YE BİLDİRİLDİ");

      aramaWebRTC.stompBaglantisiYenidenKuruldu();
    });

    // JWT sağlayıcısı.
    merkeziStompServisi.tokenSaglayicisiniAyarla(gecerliAccessTokenGetir);
    merkeziStompServisi.premiumKontrolFonksiyonunuAyarla(premiumKontrolEt);

    const merkeziStompBaslat = async () => {
      try {
        const userIdText = await AsyncStorage.getItem("userId");

        if (!aktif) {
          return;
        }

        if (!userIdText) {
          console.log("ℹ️ GLOBAL STOMP BEKLEMEDE: KULLANICI OTURUMU YOK.");

          return;
        }

        const userId = Number(userIdText);

        if (!Number.isFinite(userId) || userId <= 0) {
          console.warn("⚠️ GLOBAL STOMP: GEÇERSİZ USER ID:", userIdText);

          return;
        }

        // Önce WebRTC kullanıcı kimliğini ayarla.
        // Harici gönderici yukarıda ayarlandığı için
        // WebRTC kendi ikinci STOMP bağlantısını açmaz.
        await aramaWebRTC.gelenAramalariDinlemeyeBaslat(userId);

        if (!aktif) {
          return;
        }

        const basarili = await merkeziStompServisi.baslat();

        console.log(
          basarili
            ? "🟢 GLOBAL WEBRTC VE STOMP BAŞLATILDI"
            : "❌ GLOBAL STOMP BAŞLATILAMADI",
        );
      } catch (error) {
        console.error("❌ GLOBAL WEBRTC BAŞLATMA HATASI:", error);
      }
    };

    void merkeziStompBaslat();

    return () => {
      aktif = false;

      dinleyiciTemizle();

      aramaWebRTC.sinyalGondericiyiAyarla(null);

      merkeziStompServisi.baglantiKurulduCallbackAyarla(null);

      console.log("🔴 GLOBAL WEBRTC DİNLEYİCİSİ TEMİZLENDİ");
    };
  }, []);
  /*
   * =====================================================
   * FCM VE NOTIFEE BAŞLATMA
   * =====================================================
   */

  useEffect(() => {
    let mesajDinleyici: (() => void) | undefined;
    let tokenDinleyici: (() => void) | undefined;
    let bildirimDinleyici: (() => void) | undefined;

    let aktif = true;

    /*
     * =====================================================
     * FCM BAŞLAT
     * =====================================================
     */

    const fcmBaslat = async () => {
      try {
        await i18nHazir;

        if (!aktif) return;

        /*
         * -------------------------------------------------
         * KİLİT EKRANINDAN GELEN ARAMAYI ÖNCE OKU
         * -------------------------------------------------
         */

        if (aramaModu) {
          try {
            const ilkBildirim = await notifee.getInitialNotification();

            if (!aktif) {
              return;
            }

            if (ilkBildirim?.notification) {
              console.log("KİLİT EKRANINDAN GELEN İLK BİLDİRİM:", ilkBildirim);

              await bildirimEyleminiIsle(
                ilkBildirim.notification,
                ilkBildirim.pressAction?.id || "default",
                false,
              );
            } else {
              console.log(
                "İLK BİLDİRİM BULUNAMADI. KAYITLI BEKLEYEN ARAMA KONTROL EDİLECEK.",
              );
            }
          } catch (error) {
            console.error("İLK ARAMA BİLDİRİMİ OKUMA HATASI:", error);
          } finally {
            if (aktif) {
              setAramaHazir(true);
            }
          }
        }

        /*
         * -------------------------------------------------
         * ANDROID BİLDİRİM İZNİ
         * -------------------------------------------------
         */

        if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
          const izin = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (izin !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log("FCM BİLDİRİM İZNİ VERİLMEDİ");
          }
        }

        if (!aktif) return;

        const mesajlasma = getMessaging();

        /*
         * -------------------------------------------------
         * FCM CİHAZ TOKENI
         * -------------------------------------------------
         */

        const fcmToken = await getToken(mesajlasma);

        if (!aktif) return;

        console.log("FCM TOKEN ALINDI");
        console.log("TOKEN UZUNLUĞU:", fcmToken.length);

        // Güncel access token al.
        const jwt = await gecerliAccessTokenGetir();

        if (!aktif) return;

        if (jwt) {
          try {
            const kayitBasarili = await fcmCihazKaydet(jwt, fcmToken);

            if (kayitBasarili) {
              console.log("FCM CİHAZ KAYDI TAMAMLANDI");
            } else {
              console.error("FCM CİHAZ KAYDI BAŞARISIZ");
            }
          } catch (error) {
            console.error("FCM CİHAZ KAYIT HATASI:", error);
          }
        } else {
          console.warn(
            "FCM CİHAZ KAYDI ATLANDI: GEÇERLİ OTURUM TOKENI BULUNAMADI.",
          );
        }

        /*
         * -------------------------------------------------
         * TOKEN YENİLENMESİ
         * -------------------------------------------------
         */

        tokenDinleyici = onTokenRefresh(mesajlasma, async (yeniToken) => {
          if (!aktif) return;

          try {
            const mevcutJwt = await gecerliAccessTokenGetir();

            if (!aktif) return;

            if (mevcutJwt) {
              await fcmCihazKaydet(mevcutJwt, yeniToken);

              console.log("FCM YENİ TOKEN KAYDEDİLDİ");
            } else {
              console.warn(
                "FCM TOKEN GÜNCELLEME ATLANDI: OTURUM TOKENI BULUNAMADI.",
              );
            }
          } catch (error) {
            console.error("FCM TOKEN GÜNCELLEME HATASI:", error);
          }
        });

        /*
         * -------------------------------------------------
         * UYGULAMA AÇIKKEN GELEN FCM MESAJLARI
         * -------------------------------------------------
         */

        mesajDinleyici = onMessage(mesajlasma, async (remoteMessage) => {
          if (!aktif) return;

          console.log("FCM ÖN PLAN MESAJI:", remoteMessage);

          const veri = remoteMessage.data || {};

          const mesajTipi = metinAl(veri.type);
          const callId = metinAl(veri.callId);

          /*
           * ARAMA REDDEDİLDİ VEYA SONLANDIRILDI
           */

          if (mesajTipi === "CALL_REJECTED" || mesajTipi === "CALL_ENDED") {
            await aramaDurumunuTemizle(mesajTipi, callId);
            return;
          }

          /*
           * =================================================
           * GELEN ARAMA
           * =================================================
           *
           * 1. Gelen arama bilgilerini doğrula.
           * 2. Bekleyen aramayı kaydet.
           * 3. Notifee gelen arama bildirimini oluştur.
           * 4. Messages ekranına yönlendir.
           * 5. SDP ve WebRTC işlemlerini Messages yürütür.
           */

          if (mesajTipi === "INCOMING_CALL") {
            const callerId = metinAl(veri.callerId);

            if (!callId || !callerId) {
              console.error("GELEN ARAMA BİLGİLERİ EKSİK:", veri);
              return;
            }

            if (!aktif) return;

            console.log("📞 GELEN ARAMA FCM İLE ALINDI:", {
              callId,
              callerId,
              callerName: veri.callerName,
              callType: veri.callType,
            });

            // 1. Önce bekleyen aramayı kaydet.
            await bekleyenAramayiKaydet({
              callId,
              callerId,
              callerName: metinAl(veri.callerName) || "",
              callType: metinAl(veri.callType) || "SES",
              actionId: "default",
            });

            if (!aktif) return;

            // 2. Uygulama ön planda: bildirim oluşturma.
            // Doğrudan uygulama içindeki gelen arama ekranını aç.
            if (!aktif) return;

            console.log("ÖN PLAN GELEN ARAMA BİLDİRİMİ ATLANDI:", callId);

            // 3. Messages ekranını resetleme.
            // Aynı ekrandaysa yalnızca callId/callerId parametreleri güncellenir.
            const yonlendirildi = gelenAramaEkraninaYonlendir(
              Number(callerId),
              callId,
            );

            if (yonlendirildi) {
              console.log("✅ GELEN ARAMA DOĞRUDAN AKTİFLEŞTİRİLDİ:", callId);
            } else {
              console.error(
                "❌ GELEN ARAMA EKRANI AKTİFLEŞTİRİLEMEDİ:",
                callId,
              );
            }

            return;
          }

          if (mesajTipi === "NEW_MESSAGE") {
            console.log("YENİ MESAJ BİLDİRİMİ ALINDI");
          }
        });

        /*
         * -------------------------------------------------
         * NOTIFEE TIKLAMA OLAYLARI
         * -------------------------------------------------
         */

        bildirimDinleyici = notifee.onForegroundEvent(
          async ({ type, detail }) => {
            if (!aktif) return;

            if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
              const actionId = detail.pressAction?.id || "default";

              await bildirimEyleminiIsle(detail.notification, actionId);
            }
          },
        );

        /*
         * -------------------------------------------------
         * NORMAL UYGULAMA BİLDİRİMDEN BAŞLATILDIYSA
         * -------------------------------------------------
         */

        if (!aramaModu) {
          const ilkBildirim = await notifee.getInitialNotification();

          if (aktif && ilkBildirim?.notification) {
            console.log("UYGULAMA BİLDİRİMDEN AÇILDI:", ilkBildirim);

            await bildirimEyleminiIsle(
              ilkBildirim.notification,
              ilkBildirim.pressAction?.id || "default",
            );
          }
        }
      } catch (error) {
        console.error("FCM BAŞLATMA HATASI:", error);
      } finally {
        if (aramaModu && aktif) {
          setAramaHazir(true);
        }
      }
    };

    void fcmBaslat();

    /*
     * =====================================================
     * TEMİZLİK
     * =====================================================
     */

    return () => {
      aktif = false;

      mesajDinleyici?.();
      tokenDinleyici?.();
      bildirimDinleyici?.();

      console.log("FCM DİNLEYİCİLERİ TEMİZLENDİ");
    };
  }, [aramaModu]);

  /*
   * =========================================================
   * ARAMA MODU HAZIRLIK KONTROLÜ
   * =========================================================
   */

  if (!dilHazir) {
    return null;
  }

  if (aramaModu && !aramaHazir) {
    return null;
  }

  return (
    <AppNavigator baslangicEkrani={baslangicEkrani} aramaModu={aramaModu} />
  );
}

/*
 * =========================================================
 * NORMAL UYGULAMA AÇILIŞI
 * =========================================================
 */

export default function AnaUygulama() {
  console.log("🔵 NORMAL ANA UYGULAMA AÇILDI");
  return <App baslangicEkrani="index" aramaModu={false} />;
}

/*
 * =========================================================
 * KİLİT EKRANINDAN GELEN ARAMA AÇILIŞI
 * =========================================================
 */

export function GelenAramaApp() {
  console.log("🟢 ÖZEL GELEN ARAMA UYGULAMASI AÇILDI");
  return <App baslangicEkrani="messages" aramaModu={true} />;
}
