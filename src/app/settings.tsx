import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
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
import { API_BASE_URL } from "../config/api";

const API_ADRESI = `${API_BASE_URL}/api`;

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState("");

  const anaSayfayaGit = () => navigation.navigate("home");
  const profileGit = () => navigation.navigate("profile");
  const profilDuzenleyeGit = () => navigation.navigate("profileEdit");
  const mesajlaraGit = () => navigation.navigate("messages");

  const silmeOnayiniAc = () => {
    setHata("");
    Alert.alert(
      "Hesabı Sil",
      "Hesabınızı silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz. Profiliniz, mesajlarınız, medya dosyalarınız ve hesabınıza ait diğer veriler silinebilir.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı Sil",
          style: "destructive",
          onPress: () => {
            void hesabimiSil();
          },
        },
      ],
    );
  };

  const hesabimiSil = async () => {
    if (siliniyor) return;

    try {
      setSiliniyor(true);
      setHata("");

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        const mesaj = "Oturum bulunamadı. Lütfen tekrar giriş yapın.";
        setHata(mesaj);
        Alert.alert("Oturum Bulunamadı", mesaj);
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
            hataMesaji =
              veri?.message || veri?.error || veri?.mesaj || hataMesaji;
          } catch {
            hataMesaji = metin;
          }
        }
        throw new Error(hataMesaji);
      }

      await AsyncStorage.multiRemove([
        "token",
        "userId",
        "username",
        "user",
        "currentUser",
        "role",
      ]);

      Alert.alert("Hesap Silindi", "Hesabınız başarıyla silindi.", [
        {
          text: "Tamam",
          onPress: () => navigation.replace("index"),
        },
      ]);
    } catch (error) {
      console.error("HESAP SİLİNEMEDİ:", error);
      const hataMesaji =
        error instanceof Error
          ? error.message
          : "Hesap silinirken beklenmeyen bir hata oluştu.";
      setHata(hataMesaji);
      Alert.alert("Hata", hataMesaji);
    } finally {
      setSiliniyor(false);
    }
  };

  const hatayiTemizle = () => setHata("");

  const ayarSatiri = (
    ikon: string,
    baslik: string,
    aciklama: string,
    tiklama: () => void,
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.settingsItemPressed,
      ]}
      onPress={tiklama}
    >
      <View style={styles.settingsIconBox}>
        <Text style={styles.settingsIcon}>{ikon}</Text>
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{baslik}</Text>
        <Text style={styles.settingsItemDescription}>{aciklama}</Text>
      </View>
      <Text style={styles.settingsArrow}>›</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.anaSayfaButonu} onPress={anaSayfayaGit}>
            <Text style={styles.anaSayfaIcon}>‹</Text>
            <Text style={styles.anaSayfaText}>Ana Sayfa</Text>
          </Pressable>

          <View style={styles.baslikAlani}>
            <View style={styles.baslikIconKutusu}>
              <Text style={styles.baslikIcon}>⚙️</Text>
            </View>
            <View style={styles.baslikMetni}>
              <Text style={styles.baslik}>Ayarlar</Text>
              <Text style={styles.baslikAciklama}>
                Hesap ve uygulama ayarlarınız
              </Text>
            </View>
          </View>
          <View style={styles.headerBosluk} />
        </View>

        <View style={styles.divider} />

        {hata ? (
          <Pressable style={styles.hataKart} onPress={hatayiTemizle}>
            <Text style={styles.hataBaslik}>Bir hata oluştu</Text>
            <Text style={styles.hataText}>{hata}</Text>
            <Text style={styles.hataKapat}>Kapatmak için dokunun</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <Text style={styles.sectionDescription}>
            Profilinizi ve mesajlaşma seçeneklerinizi yönetin.
          </Text>
        </View>

        <View style={styles.settingsList}>
          {ayarSatiri("👤", "Profilim", "Profilinizi görüntüleyin", profileGit)}
          <View style={styles.itemDivider} />
          {ayarSatiri(
            "✏️",
            "Profili Düzenle",
            "Profil bilgilerinizi güncelleyin",
            profilDuzenleyeGit,
          )}
          <View style={styles.itemDivider} />
          {ayarSatiri(
            "✉️",
            "Mesajlar",
            "Mesajlaşmalarınızı görüntüleyin",
            mesajlaraGit,
          )}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Text style={styles.infoIcon}>🔒</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Hesap güvenliği</Text>
            <Text style={styles.infoText}>
              Hesap bilgilerinizi güncel tutun ve profilinizde yalnızca
              paylaşmak istediğiniz bilgileri bulundurun.
            </Text>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIconBox}>
              <Text style={styles.dangerIcon}>🗑️</Text>
            </View>
            <View style={styles.dangerHeaderContent}>
              <Text style={styles.dangerTitle}>Tehlikeli Bölge</Text>
              <Text style={styles.dangerDescription}>
                Hesabınızı kalıcı olarak silme işlemi
              </Text>
            </View>
          </View>

          <View style={styles.dangerContent}>
            <Text style={styles.dangerText}>
              Hesabınızı sildiğinizde profil bilgileriniz, mesajlarınız, medya
              dosyalarınız ve hesabınıza ait diğer veriler kalıcı olarak
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
                  <Text style={styles.deleteButtonIcon}>🗑️</Text>
                  <Text style={styles.deleteButtonText}>
                    Hesabımı Kalıcı Olarak Sil
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Gönül Buluşması</Text>
          <Text style={styles.footerText}>Hesap Ayarları</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFCFAaf5",
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFCFAaf5",
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
  baslikMetni: {
    flexShrink: 1,
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
    backgroundColor: "#EFD2C0",
  },
  hataKart: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FCE8EC",
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
  settingsList: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFCFA",
    borderWidth: 1,
    borderColor: "#EFD2C0",
  },
  settingsItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFCFA",
  },
  settingsItemPressed: {
    backgroundColor: "#FFFCFA7ed",
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
  infoBox: {
    marginHorizontal: 16,
    marginTop: 22,
    padding: 16,
    flexDirection: "row",
    borderRadius: 18,
    backgroundColor: "#F8E9ED",
    borderWidth: 1,
    borderColor: "#E9C9D2",
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6E6EB",
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
  dangerSection: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: "#FCE8EC",
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
    backgroundColor: "#FFFCFA",
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
