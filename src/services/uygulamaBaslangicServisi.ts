import AsyncStorage from "@react-native-async-storage/async-storage";

import api, { gecerliAccessTokenGetir } from "./api";
import {
  oturumAcildi,
  oturumGecisiniSirayaAl,
  oturumNesliGecerliMi,
  oturumNesliniGetir,
  oturumuSonlandir,
} from "./authSession";
import { bekleyenAramayiGetir } from "./bekleyenAramaServisi";
import E2EEDeviceService from "./E2EEDeviceService";
import {
  fcmCihazKaydet,
  fcmTokenYenilemeDinleyicisiniBaslat,
} from "./fcmServisi";
import { refreshTokenGetir, tokenGetir } from "./tokenServisi";

interface KullaniciMe {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export type BaslangicSonucu =
  | {
      durum: "authenticated";
      ekran: "home" | "messages";
    }
  | {
      durum: "unauthenticated";
    }
  | {
      durum: "cancelled";
    };

export const uygulamaOturumunuBaslat = async (): Promise<BaslangicSonucu> => {
  console.log("🚀 UYGULAMA OTURUM KONTROLÜ BAŞLADI.");

  // Başlangıç sırasında başka bir oturum açılır veya kapatılırsa
  // bu eski işlem artık oturum durumunu değiştiremez.
  let beklenenNesil = oturumNesliniGetir();
  const nesilGecerli = () => oturumNesliGecerliMi(beklenenNesil);
  const iptalSonucu: BaslangicSonucu = { durum: "cancelled" };

  // 1. Yerel tokenları kontrol et.
  const [accessToken, refreshToken, kayitliUserId] = await Promise.all([
    tokenGetir(),
    refreshTokenGetir(),
    AsyncStorage.getItem("userId"),
  ]);

  if (!nesilGecerli()) return iptalSonucu;
  if (!accessToken && !refreshToken) {
    console.log("🔐 KAYITLI OTURUM BULUNAMADI.");

    return await oturumGecisiniSirayaAl(async (): Promise<BaslangicSonucu> => {
      if (!nesilGecerli()) {
        return iptalSonucu;
      }

      await AsyncStorage.multiRemove(["userId", "username", "role"]);

      if (!nesilGecerli()) {
        return iptalSonucu;
      }

      return { durum: "unauthenticated" };
    });
  }

  // 3. Access tokenı doğrula veya refresh et.
  const token = await gecerliAccessTokenGetir();

  if (!nesilGecerli()) return iptalSonucu;

  if (!token) {
    console.log("🔐 GEÇERLİ ACCESS TOKEN ALINAMADI.");

    return { durum: "unauthenticated" };
  }

  // 4. Sunucudan gerçek kullanıcı kimliğini doğrula.
  const response = await api.get<KullaniciMe>("/users/me");

  if (!nesilGecerli()) return iptalSonucu;

  const kullanici = response.data;

  if (!kullanici || !Number.isInteger(kullanici.id) || kullanici.id <= 0) {
    throw new Error("Sunucudan geçerli kullanıcı bilgisi alınamadı.");
  }

  // Eski veya başka kullanıcıya ait yerel oturum bilgisini kabul etme.
  if (kayitliUserId && Number(kayitliUserId) !== kullanici.id) {
    console.error("🔴 KULLANICI ID UYUŞMAZLIĞI. YEREL OTURUM KAPATILIYOR.", {
      yerelUserId: kayitliUserId,
      sunucuUserId: kullanici.id,
    });

    await oturumuSonlandir(beklenenNesil);

    return { durum: "unauthenticated" };
  }

  // Kullanıcı bilgilerini kaydetme ve oturumu etkinleştirme
  // logout/login geçişleriyle aynı kuyrukta yürütülür.
  const aktivasyonSonucu = await oturumGecisiniSirayaAl(
    async (): Promise<BaslangicSonucu | null> => {
      if (!nesilGecerli()) {
        return iptalSonucu;
      }

      // Sunucu kimliğini yerel bilgilerle eşitle.
      await AsyncStorage.setItem("userId", String(kullanici.id));

      if (kullanici.username) {
        await AsyncStorage.setItem("username", kullanici.username);
      }

      // Oturum yalnızca sunucu kimliği doğrulandıktan sonra etkinleştirilir.
      oturumAcildi();
      beklenenNesil = oturumNesliniGetir();

      return null;
    },
  );

  if (aktivasyonSonucu) return aktivasyonSonucu;

  // Aktivasyon kuyruğundan çıkarken logout başlamış olabilir.
  // Eski başlangıç işlemi FCM dinleyicisini yeniden başlatamaz.
  if (!nesilGecerli()) {
    console.log("BAŞLANGIÇ İPTAL: FCM BAŞLATILMADAN ÖNCE OTURUM DEĞİŞMİŞ.");
    return iptalSonucu;
  }

  console.log("🟢 OTURUM SUNUCU TARAFINDAN DOĞRULANDI:", kullanici.id);

  // 5. FCM token yenileme dinleyicisini başlat.
  fcmTokenYenilemeDinleyicisiniBaslat(gecerliAccessTokenGetir, nesilGecerli);

  // 7. E2EE cihaz kaydı.
  // Mevcut cihaz kimliği korunur.
  try {
    const e2eeKayit = await E2EEDeviceService.cihaziKaydet();

    if (!nesilGecerli()) return iptalSonucu;

    console.log("🔐 OTOMATİK OTURUM E2EE KAYDI:", {
      deviceId: e2eeKayit.deviceId,
      fingerprint: e2eeKayit.fingerprint,
      status: e2eeKayit.status,
    });
  } catch (hata) {
    console.error("⚠️ OTOMATİK OTURUM E2EE KAYIT HATASI:", hata);
  }

  // 8. FCM cihaz kaydı.
  try {
    const guncelToken = await gecerliAccessTokenGetir();

    if (!nesilGecerli()) return iptalSonucu;

    if (guncelToken) {
      const kayitBasarili = await fcmCihazKaydet(
        guncelToken,
        undefined,
        nesilGecerli,
      );

      if (!nesilGecerli()) return iptalSonucu;

      console.log(
        kayitBasarili
          ? "🟢 OTOMATİK OTURUM FCM KAYDI BAŞARILI."
          : "⚠️ OTOMATİK OTURUM FCM KAYDI BAŞARISIZ.",
      );
    }
  } catch (hata) {
    console.error("⚠️ OTOMATİK OTURUM FCM HATASI:", hata);
  }

  // 9. Bekleyen arama varsa mesajlar ekranını aç.
  let ekran: "home" | "messages" = "home";

  try {
    const bekleyenArama = await bekleyenAramayiGetir();

    if (!nesilGecerli()) return iptalSonucu;

    if (bekleyenArama && bekleyenArama.actionId !== "reject") {
      ekran = "messages";
    }
  } catch (hata) {
    console.warn("BEKLEYEN ARAMA KONTROLÜ BAŞARISIZ:", hata);
  }

  console.log("🟢 OTOMATİK OTURUM BAŞLATILDI. EKRAN:", ekran);

  return {
    durum: "authenticated",
    ekran,
  };
};
