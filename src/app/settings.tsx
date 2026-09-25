import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_ADRESI = API_BASE_URL + "/api";

export default function Settings() {
  const router = useRouter();

  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState("");

  /*
   * =========================================================
   * ANA SAYFA
   * =========================================================
   */

  const anaSayfayaGit = () => {
    router.push("/home");
  };

  /*
   * =========================================================
   * PROFIL
   * =========================================================
   */

  const profileGit = () => {
    router.push("/profile");
  };

  /*
   * =========================================================
   * PROFIL D�oZENLE
   * =========================================================
   */

  const profilDuzenleyeGit = () => {
    router.push("/profile/edit");
  };

  /*
   * =========================================================
   * MESAJLAR
   * =========================================================
   */

  const mesajlaraGit = () => {
    router.push("/messages");
  };

  /*
   * =========================================================
   * HESAP SILME UYARISI
   * =========================================================
   */

  const silmeOnayiniAc = () => {
    setHata("");

    Alert.alert(
      "Hesabi Sil",
      "Hesabinizi silmek istedi�Yinizden emin misiniz?\n\nBu i�Ylem geri alinamaz. Profiliniz, mesajlariniz, medya dosyalariniz ve hesabiniza ait di�Yer veriler silinebilir.",
      [
        {
          text: "Vazge�",
          style: "cancel",
        },
        {
          text: "Hesabi Sil",
          style: "destructive",
          onPress: () => {
            void hesabimiSil();
          },
        },
      ],
    );
  };

  /*
   * =========================================================
   * HESABI SIL
   * =========================================================
   */

  const hesabimiSil = async () => {
    try {
      setSiliniyor(true);
      setHata("");

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setHata("Oturum bulunamadi. L�tfen tekrar giri�Y yapin.");

        Alert.alert(
          "Oturum Bulunamadi",
          "Oturumunuz bulunamadi. L�tfen tekrar giri�Y yapin.",
        );

        return;
      }

      const response = await fetch(`${API_ADRESI}/users/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const metin = await response.text();

      if (!response.ok) {
        let hataMesaji = "Hesap silinemedi.";

        if (metin.trim()) {
          try {
            const veri = JSON.parse(metin);

            if (veri?.message) {
              hataMesaji = veri.message;
            } else if (veri?.error) {
              hataMesaji = veri.error;
            } else if (veri?.mesaj) {
              hataMesaji = veri.mesaj;
            }
          } catch {
            hataMesaji = metin;
          }
        }

        throw new Error(hataMesaji);
      }

      /*
       * =====================================================
       * LOCAL STORAGE TEMIZLE
       * =====================================================
       */

      await AsyncStorage.multiRemove([
        "token",
        "userId",
        "username",
        "user",
        "currentUser",
      ]);

      /*
       * =====================================================
       * GIRIS SAYFASINA D�-N
       * =====================================================
       */

      Alert.alert("Hesap Silindi", "Hesabiniz ba�Yariyla silindi.", [
        {
          text: "Tamam",
          onPress: () => {
            router.replace("/");
          },
        },
      ]);
    } catch (error) {
      console.error("HESAP SILINEMEDI:", error);

      const hataMesaji =
        error instanceof Error
          ? error.message
          : "Hesap silinirken beklenmeyen bir hata olu�Ytu.";

      setHata(hataMesaji);

      Alert.alert("Hata", hataMesaji);
    } finally {
      setSiliniyor(false);
    }
  };

  /*
   * =========================================================
   * HATA TEMIZLE
   * =========================================================
   */

  const hatayiTemizle = () => {
    setHata("");
  };

  /*
   * =========================================================
   * EKRAN
   * =========================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            �oST BASLIK
        ================================================= */}

        <View style={styles.header}>
          <Pressable style={styles.anaSayfaButonu} onPress={anaSayfayaGit}>
            <Text style={styles.anaSayfaIcon}>�?�</Text>

            <Text style={styles.anaSayfaText}>Ana Sayfa</Text>
          </Pressable>

          <View style={styles.baslikAlani}>
            <View style={styles.baslikIconKutusu}>
              <Text style={styles.baslikIcon}>�sT</Text>
            </View>

            <View>
              <Text style={styles.baslik}>Ayarlar</Text>

              <Text style={styles.baslikAciklama}>
                Hesap ve uygulama ayarlariniz
              </Text>
            </View>
          </View>

          <View style={styles.headerBosluk} />
        </View>

        <View style={styles.divider} />

        {/* =================================================
            HATA
        ================================================= */}

        {hata ? (
          <Pressable style={styles.hataKart} onPress={hatayiTemizle}>
            <Text style={styles.hataBaslik}>�s� Bir hata olu�Ytu</Text>

            <Text style={styles.hataText}>{hata}</Text>

            <Text style={styles.hataKapat}>Kapatmak i�in dokunun</Text>
          </Pressable>
        ) : null}

        {/* =================================================
            HESAP
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hesap</Text>

          <Text style={styles.sectionDescription}>
            Profilinizi ve mesajla�Yma se�eneklerinizi y�netin.
          </Text>
        </View>

        <View style={styles.settingsList}>
          {/* =================================================
              PROFIL
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.settingsItem,
              pressed && styles.settingsItemPressed,
            ]}
            onPress={profileGit}
          >
            <View style={styles.settingsIconBox}>
              <Text style={styles.settingsIcon}>gY'�</Text>
            </View>

            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Profilim</Text>

              <Text style={styles.settingsItemDescription}>
                Profilinizi g�r�nt�leyin
              </Text>
            </View>

            <Text style={styles.settingsArrow}>�?�</Text>
          </Pressable>

          <View style={styles.itemDivider} />

          {/* =================================================
              PROFIL D�oZENLE
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.settingsItem,
              pressed && styles.settingsItemPressed,
            ]}
            onPress={profilDuzenleyeGit}
          >
            <View style={styles.settingsIconBox}>
              <Text style={styles.settingsIcon}>�o�️</Text>
            </View>

            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Profili D�zenle</Text>

              <Text style={styles.settingsItemDescription}>
                Profil bilgilerinizi g�ncelleyin
              </Text>
            </View>

            <Text style={styles.settingsArrow}>�?�</Text>
          </Pressable>

          <View style={styles.itemDivider} />

          {/* =================================================
              MESAJLAR
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.settingsItem,
              pressed && styles.settingsItemPressed,
            ]}
            onPress={mesajlaraGit}
          >
            <View style={styles.settingsIconBox}>
              <Text style={styles.settingsIcon}>gY'�</Text>
            </View>

            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Mesajlar</Text>

              <Text style={styles.settingsItemDescription}>
                Mesajla�Ymalarinizi g�r�nt�leyin
              </Text>
            </View>

            <Text style={styles.settingsArrow}>�?�</Text>
          </Pressable>
        </View>

        {/* =================================================
            BILGI KUTUSU
        ================================================= */}

        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Text style={styles.infoIcon}>gY"'</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Hesap g�venli�Yi</Text>

            <Text style={styles.infoText}>
              Hesap bilgilerinizi g�ncel tutun ve profilinizde yalnizca
              payla�Ymak istedi�Yiniz bilgileri bulundurun.
            </Text>
          </View>
        </View>

        {/* =================================================
            TEHLIKELI B�-LGE
        ================================================= */}

        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIconBox}>
              <Text style={styles.dangerIcon}>gY-'</Text>
            </View>

            <View style={styles.dangerHeaderContent}>
              <Text style={styles.dangerTitle}>Tehlikeli B�lge</Text>

              <Text style={styles.dangerDescription}>
                Hesabinizi kalici olarak silme i�Ylemi
              </Text>
            </View>
          </View>

          <View style={styles.dangerContent}>
            <Text style={styles.dangerText}>
              Hesabinizi sildi�Yinizde profil bilgileriniz, mesajlariniz, medya
              dosyalariniz ve hesabiniza ait di�Yer veriler kalici olarak
              silinebilir.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                siliniyor && styles.deleteButtonDisabled,
                pressed && !siliniyor && styles.deleteButtonPressed,
              ]}
              onPress={silmeOnayiniAc}
              disabled={siliniyor}
            >
              {siliniyor ? (
                <>
                  <ActivityIndicator size="small" color="#be123c" />

                  <Text style={styles.deleteButtonText}>
                    Hesap siliniyor...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.deleteButtonIcon}>gY-'</Text>

                  <Text style={styles.deleteButtonText}>
                    Hesabimi Kalici Olarak Sil
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* =================================================
            ALT BILGI
        ================================================= */}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>G�n�l Bulu�Ymasi</Text>

          <Text style={styles.footerText}>Hesap Ayarlari</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf5",
  },

  scrollContainer: {
    paddingBottom: 40,
  },

  /*
   * HEADER
   */

  header: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fffaf5",
  },

  anaSayfaButonu: {
    width: 90,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },

  anaSayfaIcon: {
    fontSize: 36,
    lineHeight: 36,
    color: "#b45309",
    marginRight: 2,
  },

  anaSayfaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b45309",
  },

  baslikAlani: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  baslikIconKutusu: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    marginRight: 10,
  },

  baslikIcon: {
    fontSize: 24,
  },

  baslik: {
    fontSize: 20,
    fontWeight: "800",
    color: "#92400e",
  },

  baslikAciklama: {
    marginTop: 2,
    fontSize: 12,
    color: "#78716c",
  },

  headerBosluk: {
    width: 90,
  },

  divider: {
    height: 1,
    backgroundColor: "#fed7aa",
  },

  /*
   * HATA
   */

  hataKart: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },

  hataBaslik: {
    fontSize: 16,
    fontWeight: "800",
    color: "#be123c",
    marginBottom: 6,
  },

  hataText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#881337",
  },

  hataKapat: {
    marginTop: 8,
    fontSize: 12,
    color: "#be123c",
    fontWeight: "600",
  },

  /*
   * SECTION
   */

  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#292524",
  },

  sectionDescription: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#78716c",
  },

  /*
   * SETTINGS LIST
   */

  settingsList: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },

  settingsItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },

  settingsItemPressed: {
    backgroundColor: "#fff7ed",
  },

  settingsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
  },

  settingsIcon: {
    fontSize: 22,
  },

  settingsItemContent: {
    flex: 1,
    marginLeft: 14,
  },

  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#292524",
  },

  settingsItemDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#78716c",
  },

  settingsArrow: {
    marginLeft: 10,
    fontSize: 28,
    fontWeight: "400",
    color: "#a8a29e",
  },

  itemDivider: {
    height: 1,
    marginLeft: 78,
    backgroundColor: "#f5f5f4",
  },

  /*
   * INFO BOX
   */

  infoBox: {
    marginHorizontal: 16,
    marginTop: 22,
    padding: 16,
    flexDirection: "row",
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },

  infoIcon: {
    fontSize: 20,
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e3a8a",
  },

  infoText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    color: "#1e40af",
  },

  /*
   * DANGER
   */

  dangerSection: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    overflow: "hidden",
  },

  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffe4e6",
  },

  dangerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fecdd3",
  },

  dangerIcon: {
    fontSize: 21,
  },

  dangerHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },

  dangerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#9f1239",
  },

  dangerDescription: {
    marginTop: 3,
    fontSize: 13,
    color: "#be123c",
  },

  dangerContent: {
    padding: 16,
  },

  dangerText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#881337",
  },

  deleteButton: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#be123c",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  deleteButtonPressed: {
    backgroundColor: "#ffe4e6",
  },

  deleteButtonDisabled: {
    opacity: 0.65,
  },

  deleteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#be123c",
  },

  /*
   * FOOTER
   */

  footer: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 10,
  },

  footerBrand: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400e",
  },

  footerText: {
    marginTop: 4,
    fontSize: 12,
    color: "#a8a29e",
  },
});

