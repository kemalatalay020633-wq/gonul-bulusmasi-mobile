import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type ViewStyle,
} from "react-native";

import { API_BASE_URL } from "../../config/api";

const API_ADRESI = `${API_BASE_URL}/api`;

interface Props {
  kullaniciId: number;
  boyut?: number;
  altYazi?: string;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  resizeMode?: ImageResizeMode;
}

export default function KimlikDogrulamaliAvatar({
  kullaniciId,
  boyut = 100,
  altYazi = "?",
  style,
  imageStyle,
  resizeMode = "cover",
}: Props) {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let aktif = true;
    const controller = new AbortController();

    const fotografiGetir = async () => {
      try {
        setFotoUri(null);
        setYukleniyor(true);

        const token = await AsyncStorage.getItem("token");

        if (!token || !kullaniciId) {
          return;
        }

        const yanit = await fetch(`${API_ADRESI}/users/${kullaniciId}/photo`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "image/*",
          },
          signal: controller.signal,
        });

        // Kullanıcının fotoğrafı yoksa bu normal bir durumdur.
        // Hata üretmeden varsayılan avatar gösterilir.
        if (yanit.status === 404) {
          if (aktif) {
            setFotoUri(null);
          }
          return;
        }

        if (!yanit.ok) {
          throw new Error(`Fotoğraf alınamadı: HTTP ${yanit.status}`);
        }

        const contentType = yanit.headers.get("content-type") || "";

        if (!contentType.startsWith("image/")) {
          throw new Error("Sunucudan geçerli fotoğraf dönmedi.");
        }

        const blob = await yanit.blob();

        if (blob.size === 0) {
          throw new Error("Fotoğraf dosyası boş.");
        }

        const reader = new FileReader();

        reader.onloadend = () => {
          if (aktif && typeof reader.result === "string") {
            setFotoUri(reader.result);
          }
        };

        reader.onerror = () => {
          if (aktif) {
            setFotoUri(null);
            console.error("Fotoğraf okunamadı.");
          }
        };

        reader.readAsDataURL(blob);
      } catch (hata) {
        if (!controller.signal.aborted) {
          if (aktif) {
            setFotoUri(null);
          }

          console.error("AVATAR FOTOĞRAF HATASI:", hata);
        }
      } finally {
        if (aktif) {
          setYukleniyor(false);
        }
      }
    };

    void fotografiGetir();

    return () => {
      aktif = false;
      controller.abort();
    };
  }, [kullaniciId]);

  return (
    <View
      style={[
        styles.kapsayici,
        {
          width: boyut,
          height: boyut,
          borderRadius: boyut / 2,
        },
        style,
      ]}
    >
      {fotoUri ? (
        <Image
          source={{ uri: fotoUri }}
          style={[
            styles.fotograf,
            {
              width: boyut,
              height: boyut,
              borderRadius: boyut / 2,
            },
            imageStyle,
          ]}
          resizeMode={resizeMode}
        />
      ) : (
        <Text style={[styles.basHarf, { fontSize: boyut * 0.4 }]}>
          {yukleniyor ? "..." : altYazi}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    backgroundColor: "#eee8f8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  fotograf: {
    position: "absolute",
  },
  basHarf: {
    color: "#7c3aed",
    fontWeight: "bold",
  },
});
