import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";

interface GelenAramaVerisi {
  callerId?: string;
  callerName?: string;
  callId?: string;
  callType?: string;
}

const ARAMA_KANALI_ID = "gelen-arama-kanali";
const GELEN_ARAMA_BILESENI = "gonul-bulusmasi-gelen-arama";

const bildirimIdOlustur = (callId: string) => {
  return `gelen-arama-${callId}`;
};

/*
 * =========================================================
 * GELEN ARAMA BİLDİRİM KANALINI OLUŞTUR
 * =========================================================
 */

async function aramaBildirimKanaliniOlustur(): Promise<string> {
  return notifee.createChannel({
    id: ARAMA_KANALI_ID,
    name: "Gelen Aramalar",
    description: "Sesli ve görüntülü gelen aramalar",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    vibrationPattern: [500, 500, 500, 500],
  });
}

/*
 * =========================================================
 * GELEN ARAMA TAM EKRAN BİLDİRİMİNİ GÖSTER
 * =========================================================
 */

export async function gelenAramaBildirimiGoster(
  veri: GelenAramaVerisi,
): Promise<void> {
  if (!veri.callId || !veri.callerId) {
    console.warn("GELEN ARAMA VERİLERİ EKSİK:", veri);
    return;
  }

  try {
    const callId = String(veri.callId);
    const callerId = String(veri.callerId);
    const callerName = veri.callerName || "Gelen arama";
    const callType = veri.callType === "VIDEO" ? "VIDEO" : "SES";

    const channelId = await aramaBildirimKanaliniOlustur();

    await notifee.displayNotification({
      id: bildirimIdOlustur(callId),

      title: callerName,

      body:
        callType === "VIDEO"
          ? "Görüntülü arama yapıyor..."
          : "Sesli arama yapıyor...",

      data: {
        type: "INCOMING_CALL",
        callId,
        callerId,
        callerName,
        callType,
      },

      android: {
        channelId,

        category: AndroidCategory.CALL,

        importance: AndroidImportance.HIGH,

        visibility: AndroidVisibility.PUBLIC,

        ongoing: true,

        autoCancel: false,

        loopSound: true,

        vibrationPattern: [500, 500, 500, 500],

        pressAction: {
          id: "default",
          mainComponent: GELEN_ARAMA_BILESENI,
        },

        fullScreenAction: {
          id: "default",
          mainComponent: GELEN_ARAMA_BILESENI,
        },
      },
    });

    console.log("GELEN ARAMA TAM EKRAN BİLDİRİMİ OLUŞTURULDU:", {
      callId,
      callerId,
      callerName,
      callType,
    });
  } catch (hata) {
    console.error("GELEN ARAMA BİLDİRİMİ OLUŞTURULAMADI:", hata);
  }
}

/*
 * =========================================================
 * GELEN ARAMA BİLDİRİMİNİ KAPAT
 *
 * ÖNEMLİ:
 * AsyncStorage içindeki bekleyen arama kaydına dokunmaz.
 * =========================================================
 */

export async function gelenAramaBildiriminiKapat(
  callId?: string,
): Promise<void> {
  try {
    if (!callId) {
      console.warn("BİLDİRİM KAPATILMADI: CALL ID BULUNAMADI");
      return;
    }

    await notifee.cancelNotification(bildirimIdOlustur(callId));

    console.log("GELEN ARAMA BİLDİRİMİ KAPATILDI:", callId);
  } catch (hata) {
    console.error("GELEN ARAMA BİLDİRİMİ KAPATILAMADI:", hata);
  }
}
