import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";

type Bildirim = {
  id: number;
  userId?: number;
  type?: string;
  title?: string;
  content?: string;
  read?: boolean;
  relatedId?: number | null;
  createdAt?: string;
};

const GOLD = "#F4C45B";
const API_ADRESI = `${API_BASE_URL}/api/bildirimler`;

function bildirimIkonunuGetir(type?: string) {
  switch ((type || "").toUpperCase()) {
    case "NEW_LIKE":
      return { ikon: "♥", renk: "#F04483", arkaPlan: "#54102F" };
    case "NEW_FAVORITE":
      return { ikon: "★", renk: GOLD, arkaPlan: "#543B12" };
    case "PROFILE_VIEW":
    case "NEW_PROFILE_VIEW":
      return { ikon: "◉", renk: "#D66BFF", arkaPlan: "#49145D" };
    case "NEW_MATCH":
      return { ikon: "💕", renk: "#55D6A0", arkaPlan: "#153D32" };
    case "NEW_MESSAGE":
      return { ikon: "💬", renk: "#65B8FF", arkaPlan: "#153B5A" };
    default:
      return { ikon: "🔔", renk: GOLD, arkaPlan: "#543B12" };
  }
}

function tarihGoster(tarih?: string) {
  if (!tarih) return "";

  const zaman = new Date(tarih);
  if (Number.isNaN(zaman.getTime())) return "";

  const simdi = new Date();
  const fark = simdi.getTime() - zaman.getTime();
  const dakika = Math.floor(fark / 60000);

  if (dakika < 1) return "Az önce";
  if (dakika < 60) return `${dakika} dakika önce`;

  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;

  const gun = Math.floor(saat / 24);
  if (gun === 1) return "Dün";
  if (gun < 7) return `${gun} gün önce`;

  return zaman.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: zaman.getFullYear() !== simdi.getFullYear() ? "numeric" : undefined,
  });
}

export default function BildirimlerScreen() {
  const navigation = useNavigation<any>();

  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [islemdekiId, setIslemdekiId] = useState<number | null>(null);
  const [tumunuOkuma, setTumunuOkuma] = useState(false);
  const [hata, setHata] = useState("");

  const bildirimleriYukle = useCallback(async (yenile = false) => {
    try {
      if (yenile) setYenileniyor(true);
      else setYukleniyor(true);

      setHata("");

      const token = await AsyncStorage.getItem("token");
      const kullaniciId = await AsyncStorage.getItem("userId");

      if (!token || !kullaniciId) {
        throw new Error(
          "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.",
        );
      }

      const cevap = await fetch(
        `${API_ADRESI}/${encodeURIComponent(kullaniciId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!cevap.ok) {
        const sunucuMesaji = await cevap.text().catch(() => "");
        throw new Error(
          sunucuMesaji || `Bildirimler alınamadı. HTTP ${cevap.status}`,
        );
      }

      const veri: unknown = await cevap.json();
      if (!Array.isArray(veri)) {
        throw new Error("Sunucudan beklenen bildirim listesi alınamadı.");
      }

      const liste = (veri as Bildirim[])
        .filter((item) => item && typeof item.id === "number")
        .sort((a, b) => {
          const tarihA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tarihB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tarihB - tarihA;
        });

      setBildirimler(liste);
    } catch (err) {
      const mesaj =
        err instanceof Error
          ? err.message
          : "Bildirimler yüklenirken hata oluştu.";
      setHata(mesaj);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void bildirimleriYukle();
    }, [bildirimleriYukle]),
  );

  const bildirimiOkunduYap = async (bildirim: Bildirim) => {
    if (bildirim.read || islemdekiId === bildirim.id) return;

    try {
      setIslemdekiId(bildirim.id);

      const token = await AsyncStorage.getItem("token");
      const kullaniciId = await AsyncStorage.getItem("userId");

      if (!token || !kullaniciId) {
        throw new Error("Oturum bilgisi bulunamadı.");
      }

      const cevap = await fetch(
        `${API_ADRESI}/${bildirim.id}/okundu?kullaniciId=${encodeURIComponent(kullaniciId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!cevap.ok) {
        const sunucuMesaji = await cevap.text().catch(() => "");
        throw new Error(
          sunucuMesaji || `Bildirim güncellenemedi. HTTP ${cevap.status}`,
        );
      }

      setBildirimler((onceki) =>
        onceki.map((item) =>
          item.id === bildirim.id ? { ...item, read: true } : item,
        ),
      );
    } catch (err) {
      const mesaj =
        err instanceof Error
          ? err.message
          : "Bildirim okunmuş olarak işaretlenemedi.";
      setHata(mesaj);
    } finally {
      setIslemdekiId(null);
    }
  };

  const tumBildirimleriOkunduYap = async () => {
    const okunmamisVar = bildirimler.some((item) => !item.read);
    if (!okunmamisVar || tumunuOkuma) return;

    try {
      setTumunuOkuma(true);

      const token = await AsyncStorage.getItem("token");
      const kullaniciId = await AsyncStorage.getItem("userId");

      if (!token || !kullaniciId) {
        throw new Error("Oturum bilgisi bulunamadı.");
      }

      const cevap = await fetch(
        `${API_ADRESI}/${encodeURIComponent(kullaniciId)}/tumunu-okundu`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!cevap.ok) {
        const sunucuMesaji = await cevap.text().catch(() => "");
        throw new Error(
          sunucuMesaji || `Bildirimler güncellenemedi. HTTP ${cevap.status}`,
        );
      }

      setBildirimler((onceki) =>
        onceki.map((item) => ({ ...item, read: true })),
      );
    } catch (err) {
      const mesaj =
        err instanceof Error ? err.message : "Bildirimler okundu yapılamadı.";
      setHata(mesaj);
    } finally {
      setTumunuOkuma(false);
    }
  };

  const bildirimKategorileri = [
    {
      baslik: "Beğenenler",
      aciklama: "Seni beğenen kullanıcıları gör",
      ikon: "♥",
      renk: "#E91E63",
      arkaPlan: "#54102F",
      sayfa: "begenenler",
    },
    {
      baslik: "Favorilerime Ekleyenler",
      aciklama: "Seni favorilerine ekleyen kullanıcılar",
      ikon: "★",
      renk: GOLD,
      arkaPlan: "#543B12",
      sayfa: "favorilerimeEkleyenler",
    },
    {
      baslik: "Profilime Bakanlar",
      aciklama: "Profilini ziyaret eden kullanıcıları gör",
      ikon: "◉",
      renk: "#D66BFF",
      arkaPlan: "#49145D",
      sayfa: "profilimeBakanlar",
    },
  ];

  const okunmamisSayisi = bildirimler.filter((item) => !item.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.icerik}
        refreshControl={
          <RefreshControl
            refreshing={yenileniyor}
            onRefresh={() => void bildirimleriYukle(true)}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        <View style={styles.ustBolum}>
          <TouchableOpacity
            style={styles.geriButonu}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.geriIkon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.baslikAlani}>
            <Text style={styles.baslikIkon}>🔔</Text>
            <Text style={styles.baslik}>Bildirimler</Text>
            <View style={styles.baslikSusleme}>
              <View style={styles.suslemeCizgi} />
              <Text style={styles.suslemeKalp}>♡</Text>
              <View style={styles.suslemeCizgi} />
            </View>
          </View>

          <View style={styles.bosAlan} />
        </View>

        <Text style={styles.aciklama}>
          Seninle ilgilenen kullanıcıları buradan takip edebilirsin.
        </Text>

        <View style={styles.bolumBaslikAlani}>
          <View style={styles.baslikCizgisi} />
          <Text style={styles.bolumBaslik}>Etkileşimlerin</Text>
        </View>

        {bildirimKategorileri.map((item) => (
          <TouchableOpacity
            key={item.sayfa}
            style={styles.bildirimKart}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(item.sayfa)}
          >
            <View
              style={[styles.ikonKapsayici, { backgroundColor: item.arkaPlan }]}
            >
              <Text style={[styles.ikon, { color: item.renk }]}>
                {item.ikon}
              </Text>
            </View>

            <View style={styles.bildirimYazi}>
              <Text style={styles.kartBaslik}>{item.baslik}</Text>
              <Text style={styles.kartAciklama}>{item.aciklama}</Text>
            </View>

            <View style={styles.okKapsayici}>
              <Text style={styles.ok}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={[styles.sonBildirimBaslikSatiri, styles.bolumBaslikAlani]}>
          <View style={styles.baslikCizgisi} />
          <Text style={styles.bolumBaslik}>Son Bildirimler</Text>
          <View style={styles.baslikSayac}>
            <Text style={styles.baslikSayacYazi}>{bildirimler.length}</Text>
          </View>
          <View style={styles.baslikSatiriBosluk} />
          {okunmamisSayisi > 0 && (
            <TouchableOpacity
              onPress={() => void tumBildirimleriOkunduYap()}
              disabled={tumunuOkuma}
              activeOpacity={0.75}
            >
              <Text style={styles.tumunuOkundu}>
                {tumunuOkuma ? "İşleniyor..." : "Tümünü oku"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {hata !== "" && (
          <View style={styles.hataKutusu}>
            <Text style={styles.hataMetni}>{hata}</Text>
            <TouchableOpacity
              onPress={() => void bildirimleriYukle(true)}
              style={styles.tekrarDeneButonu}
            >
              <Text style={styles.tekrarDeneYazi}>Tekrar dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {yukleniyor ? (
          <View style={styles.durumKutusu}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.durumMetni}>Bildirimlerin yükleniyor...</Text>
          </View>
        ) : bildirimler.length === 0 && hata === "" ? (
          <View style={styles.bosBildirim}>
            <View style={styles.bildirimZil}>
              <Text style={styles.bosBildirimIkon}>🔔</Text>
              <Text style={styles.zilKalp}>♥</Text>
            </View>
            <Text style={styles.bosBildirimBaslik}>Henüz bildirimin yok</Text>
            <Text style={styles.bosBildirimAciklama}>
              Yeni beğeniler, favoriler, eşleşmeler ve profil ziyaretleri burada
              görüntülenecek.
            </Text>
          </View>
        ) : (
          bildirimler.map((bildirim) => {
            const gorunum = bildirimIkonunuGetir(bildirim.type);
            const okunmamis = bildirim.read !== true;

            return (
              <TouchableOpacity
                key={bildirim.id}
                style={[
                  styles.sonBildirimKart,
                  okunmamis && styles.sonBildirimKartOkunmamis,
                ]}
                activeOpacity={0.82}
                onPress={() => void bildirimiOkunduYap(bildirim)}
                disabled={islemdekiId === bildirim.id}
              >
                <View
                  style={[
                    styles.sonBildirimIkonKapsayici,
                    { backgroundColor: gorunum.arkaPlan },
                  ]}
                >
                  <Text
                    style={[styles.sonBildirimIkon, { color: gorunum.renk }]}
                  >
                    {gorunum.ikon}
                  </Text>
                </View>

                <View style={styles.sonBildirimYazi}>
                  <Text style={styles.sonBildirimKartBaslik}>
                    {bildirim.title || "Yeni bildirim"}
                  </Text>
                  <Text style={styles.sonBildirimKartAciklama}>
                    {bildirim.content || "Yeni bir etkinliğin var."}
                  </Text>
                  <Text style={styles.sonBildirimTarih}>
                    {tarihGoster(bildirim.createdAt)}
                  </Text>
                </View>

                <View style={styles.sonBildirimSag}>
                  {islemdekiId === bildirim.id ? (
                    <ActivityIndicator size="small" color={GOLD} />
                  ) : okunmamis ? (
                    <View style={styles.yeniRozeti}>
                      <Text style={styles.yeniRozetiYazi}>Yeni</Text>
                    </View>
                  ) : (
                    <Text style={styles.okunduIsareti}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#180022",
  },
  icerik: {
    paddingHorizontal: 16,
    paddingBottom: 35,
  },
  ustBolum: {
    minHeight: 170,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#300044",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  geriButonu: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: "#421052",
    alignItems: "center",
    justifyContent: "center",
  },
  geriIkon: {
    fontSize: 42,
    lineHeight: 46,
    color: "#FFFFFF",
    marginTop: -5,
  },
  baslikAlani: {
    flex: 1,
    alignItems: "center",
    paddingTop: 0,
  },
  baslikIkon: {
    fontSize: 37,
    color: GOLD,
    marginBottom: 2,
  },
  baslik: {
    fontSize: 29,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  baslikSusleme: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 9,
  },
  suslemeCizgi: {
    width: 48,
    height: 2,
    backgroundColor: GOLD,
  },
  suslemeKalp: {
    fontSize: 26,
    color: GOLD,
  },
  bosAlan: {
    width: 54,
  },
  aciklama: {
    fontSize: 14,
    color: "#E6C8F1",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 18,
    marginBottom: 25,
  },
  bolumBaslikAlani: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 8,
  },
  baslikCizgisi: {
    width: 5,
    height: 30,
    borderRadius: 5,
    backgroundColor: GOLD,
    marginRight: 10,
  },
  bolumBaslik: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  bildirimKart: {
    minHeight: 112,
    backgroundColor: "#300044",
    borderRadius: 24,
    marginBottom: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GOLD,
    elevation: 6,
  },
  ikonKapsayici: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  ikon: {
    fontSize: 43,
    fontWeight: "900",
  },
  bildirimYazi: {
    flex: 1,
    minWidth: 0,
  },
  kartBaslik: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 7,
  },
  kartAciklama: {
    fontSize: 13,
    color: "#E5C9F0",
    lineHeight: 19,
  },
  okKapsayici: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  ok: {
    fontSize: 32,
    lineHeight: 36,
    color: "#FFFFFF",
    marginTop: -3,
  },
  sonBildirimBaslikSatiri: {
    marginTop: 17,
  },
  baslikSayac: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#543B12",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
    paddingHorizontal: 6,
  },
  baslikSayacYazi: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  baslikSatiriBosluk: {
    flex: 1,
  },
  tumunuOkundu: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "800",
  },
  sonBildirimKart: {
    minHeight: 104,
    backgroundColor: "#300044",
    borderRadius: 20,
    marginBottom: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#684477",
  },
  sonBildirimKartOkunmamis: {
    borderColor: GOLD,
    backgroundColor: "#3B0750",
  },
  sonBildirimIkonKapsayici: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sonBildirimIkon: {
    fontSize: 28,
    fontWeight: "900",
  },
  sonBildirimYazi: {
    flex: 1,
    minWidth: 0,
  },
  sonBildirimKartBaslik: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  sonBildirimKartAciklama: {
    color: "#E6C8F1",
    fontSize: 13,
    lineHeight: 19,
  },
  sonBildirimTarih: {
    color: "#C9A9D5",
    fontSize: 11,
    marginTop: 7,
  },
  sonBildirimSag: {
    minWidth: 42,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 7,
  },
  yeniRozeti: {
    backgroundColor: "#E91E63",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  yeniRozetiYazi: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  okunduIsareti: {
    color: "#55D6A0",
    fontSize: 20,
    fontWeight: "900",
  },
  durumKutusu: {
    minHeight: 180,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "#300044",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  durumMetni: {
    color: "#E6C8F1",
    fontSize: 14,
    marginTop: 13,
  },
  bosBildirim: {
    backgroundColor: "#300044",
    borderRadius: 25,
    paddingHorizontal: 25,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: GOLD,
    marginTop: 4,
    overflow: "hidden",
  },
  bildirimZil: {
    width: 105,
    height: 105,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: "#421052",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  bosBildirimIkon: {
    fontSize: 58,
    color: GOLD,
  },
  zilKalp: {
    position: "absolute",
    fontSize: 23,
    color: "#F04483",
    top: 43,
  },
  bosBildirimBaslik: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 9,
  },
  bosBildirimAciklama: {
    fontSize: 14,
    color: "#E6C8F1",
    textAlign: "center",
    lineHeight: 22,
  },
  hataKutusu: {
    backgroundColor: "#4A1028",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F04483",
    padding: 14,
    marginBottom: 14,
  },
  hataMetni: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 19,
  },
  tekrarDeneButonu: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#6B1740",
  },
  tekrarDeneYazi: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
