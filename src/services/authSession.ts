import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginEkraninaYonlendir } from "../navigation/navigationService";

let cikisIslemiBasladi = false;

export const oturumuSonlandir = async () => {
  if (cikisIslemiBasladi) {
    return;
  }

  cikisIslemiBasladi = true;

  try {
    await AsyncStorage.multiRemove(["token", "userId", "username", "role"]);

    console.log("OTURUM SÜRESİ DOLDU. KULLANICI ÇIKIŞ YAPTI.");

    loginEkraninaYonlendir();
  } catch (hata) {
    console.log("OTURUM KAPATMA HATASI:", hata);

    // Güvenlik amacıyla yönlendirmeyi yine de dene.
    loginEkraninaYonlendir();
  }
};

export const oturumAcildi = () => {
  cikisIslemiBasladi = false;
};
