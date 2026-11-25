import { Alert } from "react-native";
import { API_BASE_URL } from "../config/api";
import { navigationRef } from "../navigation/navigationService";
import { gecerliAccessTokenGetir } from "./api";

const API_ADRESI = API_BASE_URL + "/api";

export async function premiumKontrolEt(): Promise<boolean> {
  try {
    const token = await gecerliAccessTokenGetir();

    if (!token) {
      Alert.alert(
        "Oturum gerekli",
        "Bu özelliği kullanmak için giriş yapmalısınız.",
      );
      return false;
    }

    try {
      const kullaniciResponse = await fetch(`${API_ADRESI}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (kullaniciResponse.ok) {
        const kullanici = await kullaniciResponse.json();

        const cinsiyet = String(
          kullanici?.gender ?? kullanici?.cinsiyet ?? "",
        )
          .trim()
          .toLocaleUpperCase("tr-TR");

        if (cinsiyet === "KADIN") {
          return true;
        }
      }
    } catch (error) {
      console.warn("Kullanıcı bilgisi alınamadı:", error);
    }

    const response = await fetch(`${API_ADRESI}/memberships/me/premium`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Premium durumu kontrol edilemedi. HTTP ${response.status}`,
      );
    }

    let premium = false;

    try {
      const sonuc: unknown = JSON.parse(responseText);

      if (typeof sonuc === "boolean") {
        premium = sonuc;
      } else if (typeof sonuc === "object" && sonuc !== null) {
        const veri = sonuc as {
          premium?: unknown;
          aktif?: unknown;
          active?: unknown;
        };

        if (typeof veri.premium === "boolean") {
          premium = veri.premium;
        } else if (typeof veri.aktif === "boolean") {
          premium = veri.aktif;
        } else if (typeof veri.active === "boolean") {
          premium = veri.active;
        }
      }
    } catch {
      premium = responseText.trim().toLowerCase() === "true";
    }

    if (!premium) {
      Alert.alert(
        "🔒 Premium Üyelik Gerekli",
        "Mesaj, dosya gönderme ve sesli/görüntülü arama özelliklerini kullanabilmek için Premium üye olmanız gerekiyor.",
        [
          {
            text: "Vazgeç",
            style: "cancel",
          },
          {
            text: "⭐ Premium Ol",
            onPress: () => {
              if (navigationRef.isReady()) {
                navigationRef.navigate("premium");
              }
            },
          },
        ],
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error("Premium kontrol hatası:", error);
    Alert.alert("Hata", "Premium üyelik durumu kontrol edilemedi.");
    return false;
  }
}
