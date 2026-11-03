import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";

const API_ADRESI = `${API_BASE_URL}/api`;

const RENK = {
  arkaPlan: "#F7F5FA",
  kart: "#FFFFFF",
  ana: "#432365",
  mor: "#7541B8",
  acikMor: "#F1EAF8",
  altin: "#D8B65A",
  metin: "#292333",
  ikincil: "#81798C",
  cizgi: "#EEE9F2",
  kirmizi: "#C43D58",
  acikKirmizi: "#FFF0F2",
};

type AyarSatiriProps = {
  ikon: string;
  baslik: string;
  aciklama: string;
  onPress: () => void;
  son?: boolean;
};

function AyarSatiri({
  ikon,
  baslik,
  aciklama,
  onPress,
  son = false,
}: AyarSatiriProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ayarSatiri,
        pressed && styles.ayarSatiriBasili,
      ]}
    >
      <View style={styles.ayarIkonAlani}>
        <Text style={styles.ayarIkon}>{ikon}</Text>
      </View>
      <View style={styles.ayarMetinAlani}>
        <Text style={styles.ayarBaslik}>{baslik}</Text>
        <Text style={styles.ayarAciklama}>{aciklama}</Text>
      </View>
      <View style={styles.okAlani}>
        <Text style={styles.okIsareti}>›</Text>
      </View>
      {!son && <View style={styles.satirCizgisi} />}
    </Pressable>
  );
}

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
      "Hesabını silmek istiyor musun?",
      "Bu işlem geri alınamaz. Profilin, mesajların, medya dosyaların ve hesabına ait diğer veriler silinebilir.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı kalıcı sil",
          style: "destructive",
          onPress: () => void hesabimiSil(),
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
        Alert.alert("Oturum bulunamadı", mesaj);
        return;
      }

      const response = await fetch(`${API_ADRESI}/users/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const yanitMetni = await response.text();

      if (!response.ok) {
        let hataMesaji = "Hesap silinemedi.";
        if (yanitMetni.trim()) {
          try {
            const veri = JSON.parse(yanitMetni);
            hataMesaji =
              veri?.message || veri?.error || veri?.mesaj || hataMesaji;
          } catch {
            hataMesaji = yanitMetni;
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

      Alert.alert("Hesap silindi", "Hesabınız başarıyla silindi.", [
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
          : "Hesabınız silinemedi. Lütfen tekrar deneyin.";
      setHata(hataMesaji);
      Alert.alert("Hesap silinemedi", hataMesaji);
    } finally {
      setSiliniyor(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RENK.ana} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ustBolum}>
          <View style={styles.ustSatir}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ana sayfaya dön"
              style={({ pressed }) => [
                styles.geriButonu,
                pressed && styles.geriButonuBasili,
              ]}
              onPress={anaSayfayaGit}
            >
              <Text style={styles.geriIkon}>‹</Text>
              <Text style={styles.geriYazi}>Ana Sayfa</Text>
            </Pressable>
            <View style={styles.ustRozet}>
              <Text style={styles.ustRozetYazi}>HESAP</Text>
            </View>
          </View>

          <View style={styles.baslikSatiri}>
            <View style={styles.baslikIkonKutusu}>
              <Text style={styles.baslikIkon}>⚙</Text>
            </View>
            <View style={styles.baslikMetni}>
              <Text style={styles.baslik}>Ayarlar</Text>
              <Text style={styles.baslikAciklama}>
                Hesabını ve uygulama tercihlerini yönet.
              </Text>
            </View>
          </View>
          <View style={styles.ustAltCizgi} />
        </View>

        <View style={styles.icerik}>
          {!!hata && (
            <Pressable style={styles.hataKart} onPress={() => setHata("")}>
              <View style={styles.hataIkon}>
                <Text style={styles.hataIkonYazi}>!</Text>
              </View>
              <View style={styles.hataMetinAlani}>
                <Text style={styles.hataBaslik}>Bir sorun oluştu</Text>
                <Text style={styles.hataMetni}>{hata}</Text>
                <Text style={styles.hataKapat}>Kapatmak için dokun</Text>
              </View>
            </Pressable>
          )}

          <View style={styles.bolumBasligi}>
            <Text style={styles.bolumBaslik}>Hesap yönetimi</Text>
            <Text style={styles.bolumAciklama}>
              Profiline ve iletişim alanlarına hızlı erişim.
            </Text>
          </View>

          <View style={styles.ayarKarti}>
            <AyarSatiri
              ikon="♙"
              baslik="Profilim"
              aciklama="Profilini görüntüle ve bilgilerini incele"
              onPress={profileGit}
            />
            <AyarSatiri
              ikon="✎"
              baslik="Profili düzenle"
              aciklama="Kişisel bilgilerini ve profil detaylarını güncelle"
              onPress={profilDuzenleyeGit}
            />
            <AyarSatiri
              ikon="✉"
              baslik="Mesajlar"
              aciklama="Sohbetlerini ve mesajlarını görüntüle"
              onPress={mesajlaraGit}
              son
            />
          </View>

          <View style={styles.guvenlikKarti}>
            <View style={styles.guvenlikIkonKutusu}>
              <Text style={styles.guvenlikIkon}>⌑</Text>
            </View>
            <View style={styles.guvenlikMetinAlani}>
              <Text style={styles.guvenlikBaslik}>Gizlilik ve güvenlik</Text>
              <Text style={styles.guvenlikMetni}>
                Hesap bilgilerini güncel tut. Profilinde yalnızca paylaşmak
                istediğin bilgileri bulundur ve kişisel bilgilerini koru.
              </Text>
            </View>
          </View>

          <View style={styles.tehlikeBolumu}>
            <View style={styles.tehlikeBaslikSatiri}>
              <View style={styles.tehlikeIkonKutusu}>
                <Text style={styles.tehlikeIkon}>⌫</Text>
              </View>
              <View style={styles.tehlikeBaslikMetni}>
                <Text style={styles.tehlikeBaslik}>Hesabı sil</Text>
                <Text style={styles.tehlikeAltBaslik}>
                  Geri alınamayan işlem
                </Text>
              </View>
            </View>
            <Text style={styles.tehlikeAciklama}>
              Hesabını sildiğinde profil bilgilerin, mesajların, medya
              dosyaların ve hesabına ait diğer veriler kalıcı olarak
              silinebilir.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={silmeOnayiniAc}
              disabled={siliniyor}
              style={({ pressed }) => [
                styles.silButonu,
                siliniyor && styles.silButonuPasif,
                pressed && !siliniyor && styles.silButonuBasili,
              ]}
            >
              {siliniyor ? (
                <>
                  <ActivityIndicator size="small" color={RENK.kirmizi} />
                  <Text style={styles.silButonuYazi}>Hesap siliniyor...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.silButonuIkon}>⌫</Text>
                  <Text style={styles.silButonuYazi}>
                    Hesabımı kalıcı olarak sil
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.altBilgi}>
            <View style={styles.altLogo}>
              <Text style={styles.altLogoYazi}>G</Text>
            </View>
            <Text style={styles.altMarka}>Gönül Buluşması</Text>
            <Text style={styles.altAciklama}>Güzel başlangıçlar burada.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENK.arkaPlan,
  },
  scrollContainer: {
    paddingBottom: 34,
  },
  ustBolum: {
    backgroundColor: RENK.ana,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  ustSatir: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  geriButonu: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  geriButonuBasili: {
    opacity: 0.7,
  },
  geriIkon: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 32,
    marginRight: 5,
  },
  geriYazi: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  ustRozet: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  ustRozetYazi: {
    color: "#F4DFA0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  baslikSatiri: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  baslikIkonKutusu: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  baslikIkon: {
    color: "#F4DFA0",
    fontSize: 30,
    fontWeight: "500",
  },
  baslikMetni: {
    flex: 1,
    marginLeft: 15,
  },
  baslik: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  baslikAciklama: {
    color: "#D9CDE7",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  ustAltCizgi: {
    height: 3,
    width: 54,
    borderRadius: 3,
    backgroundColor: RENK.altin,
    marginTop: 23,
    marginLeft: 73,
  },
  icerik: {
    paddingHorizontal: 18,
  },
  hataKart: {
    flexDirection: "row",
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: RENK.acikKirmizi,
    borderWidth: 1,
    borderColor: "#F3C5CE",
  },
  hataIkon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9DCE2",
  },
  hataIkonYazi: {
    color: RENK.kirmizi,
    fontSize: 18,
    fontWeight: "900",
  },
  hataMetinAlani: {
    flex: 1,
    marginLeft: 10,
  },
  hataBaslik: {
    color: "#9F2942",
    fontSize: 14,
    fontWeight: "900",
  },
  hataMetni: {
    color: "#8D4052",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  hataKapat: {
    color: RENK.kirmizi,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },
  bolumBasligi: {
    marginTop: 27,
    marginBottom: 13,
  },
  bolumBaslik: {
    color: RENK.metin,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  bolumAciklama: {
    color: RENK.ikincil,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  ayarKarti: {
    backgroundColor: RENK.kart,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: RENK.cizgi,
    shadowColor: "#302044",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  ayarSatiri: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    paddingVertical: 12,
  },
  ayarSatiriBasili: {
    opacity: 0.68,
  },
  ayarIkonAlani: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RENK.acikMor,
  },
  ayarIkon: {
    color: RENK.mor,
    fontSize: 24,
    fontWeight: "700",
  },
  ayarMetinAlani: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 8,
  },
  ayarBaslik: {
    color: RENK.metin,
    fontSize: 15,
    fontWeight: "800",
  },
  ayarAciklama: {
    color: RENK.ikincil,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  okAlani: {
    width: 26,
    alignItems: "center",
  },
  okIsareti: {
    color: "#B6AFC0",
    fontSize: 29,
    lineHeight: 32,
  },
  satirCizgisi: {
    position: "absolute",
    bottom: 0,
    left: 61,
    right: 2,
    height: 1,
    backgroundColor: RENK.cizgi,
  },
  guvenlikKarti: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    padding: 17,
    borderRadius: 21,
    backgroundColor: "#F0EBF7",
    borderWidth: 1,
    borderColor: "#E5D9F0",
  },
  guvenlikIkonKutusu: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4D8F1",
  },
  guvenlikIkon: {
    color: RENK.ana,
    fontSize: 25,
    fontWeight: "800",
  },
  guvenlikMetinAlani: {
    flex: 1,
    marginLeft: 12,
  },
  guvenlikBaslik: {
    color: RENK.ana,
    fontSize: 14,
    fontWeight: "900",
  },
  guvenlikMetni: {
    color: "#6F617E",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  tehlikeBolumu: {
    marginTop: 25,
    padding: 18,
    borderRadius: 22,
    backgroundColor: RENK.kart,
    borderWidth: 1,
    borderColor: "#F1D7DD",
  },
  tehlikeBaslikSatiri: {
    flexDirection: "row",
    alignItems: "center",
  },
  tehlikeIkonKutusu: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RENK.acikKirmizi,
  },
  tehlikeIkon: {
    color: RENK.kirmizi,
    fontSize: 25,
    fontWeight: "800",
  },
  tehlikeBaslikMetni: {
    flex: 1,
    marginLeft: 12,
  },
  tehlikeBaslik: {
    color: "#922D45",
    fontSize: 17,
    fontWeight: "900",
  },
  tehlikeAltBaslik: {
    color: "#B66A7B",
    fontSize: 12,
    marginTop: 3,
  },
  tehlikeAciklama: {
    color: "#786B72",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 15,
  },
  silButonu: {
    minHeight: 50,
    marginTop: 17,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E9AEBB",
    backgroundColor: RENK.acikKirmizi,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  silButonuBasili: {
    backgroundColor: "#FADDE3",
  },
  silButonuPasif: {
    opacity: 0.6,
  },
  silButonuIkon: {
    color: RENK.kirmizi,
    fontSize: 20,
    fontWeight: "900",
    marginRight: 8,
  },
  silButonuYazi: {
    color: RENK.kirmizi,
    fontSize: 13,
    fontWeight: "900",
  },
  altBilgi: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 8,
  },
  altLogo: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RENK.ana,
  },
  altLogoYazi: {
    color: "#F4DFA0",
    fontSize: 21,
    fontWeight: "900",
  },
  altMarka: {
    color: RENK.ana,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },
  altAciklama: {
    color: "#A49BAE",
    fontSize: 11,
    marginTop: 4,
  },
});
