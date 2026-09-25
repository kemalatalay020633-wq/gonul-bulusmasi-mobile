import React, { useEffect, useState } from "react";

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_ADRESI = API_BASE_URL + "/api";

type PremiumDurumuProps = {
  children: React.ReactNode;
};

function PremiumDurumu({ children }: PremiumDurumuProps) {
  const [premium, setPremium] = useState<boolean | null>(null);

  const [hata, setHata] = useState("");

  useEffect(() => {
    let aktif = true;

    const kontrolEt = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          if (aktif) {
            setHata("Oturum bilgileriniz bulunamadı.");
          }

          return;
        }

        const response = await fetch(`${API_ADRESI}/memberships/me/premium`, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        console.log("PREMIUM KONTROL STATUS:", response.status);

        if (!response.ok) {
          let hataMesaji = "Premium durumu kontrol edilemedi.";

          try {
            const hataVerisi = await response.json();

            hataMesaji = hataVerisi.message || hataVerisi.error || hataMesaji;
          } catch {
            // Varsayılan hata mesajı kullanılacak.
          }

          throw new Error(hataMesaji);
        }

        const veri = await response.json();

        /*
         * Backend doğrudan boolean
         * döndürüyorsa:
         *
         * true
         * veya
         * false
         */

        let premiumDurumu: boolean;

        if (typeof veri === "boolean") {
          premiumDurumu = veri;
        } else if (typeof veri?.premium === "boolean") {
          premiumDurumu = veri.premium;
        } else if (typeof veri?.active === "boolean") {
          premiumDurumu = veri.active;
        } else {
          throw new Error("Premium durumu geçersiz.");
        }

        console.log("PREMIUM DURUMU:", premiumDurumu);

        if (aktif) {
          setPremium(premiumDurumu);
        }
      } catch (hata) {
        console.error("PREMIUM KONTROL HATASI:", hata);

        if (aktif) {
          setHata(
            hata instanceof Error
              ? hata.message
              : "Premium durumu kontrol edilemedi.",
          );
        }
      }
    };

    void kontrolEt();

    return () => {
      aktif = false;
    };
  }, []);

  /*
   * =========================================================
   * YÜKLENİYOR
   * =========================================================
   */

  if (premium === null && !hata) {
    return (
      <View style={styles.yukleniyorContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />

        <Text style={styles.yukleniyorText}>
          Premium durumu kontrol ediliyor...
        </Text>
      </View>
    );
  }

  /*
   * =========================================================
   * HATA
   * =========================================================
   */

  if (hata) {
    return (
      <View style={styles.hataContainer}>
        <Text style={styles.hataBaslik}>Premium Kontrolü</Text>

        <Text style={styles.hataText}>{hata}</Text>
      </View>
    );
  }

  /*
   * =========================================================
   * İÇERİK
   * =========================================================
   */

  return <>{children}</>;
}

export default PremiumDurumu;

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  yukleniyorContainer: {
    flex: 1,

    minHeight: 120,

    alignItems: "center",

    justifyContent: "center",

    padding: 20,

    backgroundColor: "#ffffff",
  },

  yukleniyorText: {
    marginTop: 12,

    fontSize: 14,

    color: "#666666",

    textAlign: "center",
  },

  hataContainer: {
    margin: 16,

    padding: 16,

    borderRadius: 14,

    backgroundColor: "#fef2f2",

    borderWidth: 1,

    borderColor: "#fecaca",
  },

  hataBaslik: {
    fontSize: 16,

    fontWeight: "700",

    color: "#991b1b",

    marginBottom: 6,
  },

  hataText: {
    fontSize: 14,

    lineHeight: 20,

    color: "#991b1b",
  },
});
