import AsyncStorage from "@react-native-async-storage/async-storage";

const BEKLEYEN_ARAMA_ANAHTARI = "bekleyen_fcm_arama";

export interface BekleyenArama {
  callId: string;
  callerId: string;
  callerName: string;
  callType: string;
  actionId?: string;
}

export async function bekleyenAramayiKaydet(
  arama: BekleyenArama,
): Promise<void> {
  if (!arama.callId || !arama.callerId) {
    throw new Error("Bekleyen arama bilgileri eksik.");
  }

  await AsyncStorage.setItem(BEKLEYEN_ARAMA_ANAHTARI, JSON.stringify(arama));

  console.log("BEKLEYEN FCM ARAMASI KAYDEDİLDİ:", arama.callId);
}

export async function bekleyenAramayiGetir(): Promise<BekleyenArama | null> {
  const veri = await AsyncStorage.getItem(BEKLEYEN_ARAMA_ANAHTARI);

  if (!veri) {
    return null;
  }

  try {
    return JSON.parse(veri) as BekleyenArama;
  } catch (hata) {
    console.error("BEKLEYEN ARAMA VERİSİ OKUNAMADI:", hata);
    return null;
  }
}

export async function bekleyenAramayiSil(): Promise<void> {
  await AsyncStorage.removeItem(BEKLEYEN_ARAMA_ANAHTARI);
}
