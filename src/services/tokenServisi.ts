import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_ANAHTARI = "token";

export const tokenGetir = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_ANAHTARI);
  } catch (hata) {
    console.error("Token okuma hatası:", hata);
    return null;
  }
};

export const tokenKaydet = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_ANAHTARI, token);
  } catch (hata) {
    console.error("Token kaydetme hatası:", hata);
    throw hata;
  }
};

export const tokenSil = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_ANAHTARI);
  } catch (hata) {
    console.error("Token silme hatası:", hata);
    throw hata;
  }
};
