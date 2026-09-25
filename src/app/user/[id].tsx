import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
// src/app/home.tsx
// src/app/user/[id].tsx
import { API_BASE_URL } from "../../config/api";
const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;
type Kullanici = {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  city?: string;
  active?: boolean;
  online?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profilePhoto?: string;
};

type Profil = {
  id: number;
  userId: number;
  about?: string;
  profession?: string | number;
  education?: string | number;
  height?: number;
  weight?: number;
  maritalStatus?: string | number;
  religion?: string | number;
  interests?: string | number;
  profilePhoto?: string;
  profileVerified?: boolean;
};

type Begeni = {
  userId?: number;
  likedUserId?: number;
};

type Favori = {
  userId?: number;
  favoriteUserId?: number;
};

export default function KullaniciProfil() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  const [begendi, setBegendi] = useState(false);
  const [favoride, setFavoride] = useState(false);

  const [begeniYukleniyor, setBegeniYukleniyor] = useState(false);
  const [favoriYukleniyor, setFavoriYukleniyor] = useState(false);

  const [mesajAcik, setMesajAcik] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [mesajYukleniyor, setMesajYukleniyor] = useState(false);

  useEffect(() => {
    void kullaniciProfiliniGetir();
  }, [id]);

  const kullaniciProfiliniGetir = async () => {
    try {
      setYukleniyor(true);
      setHata("");

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/");
        return;
      }

      if (!id) {
        setHata("Kullanici bulunamadi.");
        return;
      }

      console.log("KULLANICI PROFILI A�?ILIYOR:", id);

      const kullaniciResponse = await fetch(`${API_ADRESI}/users/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("KULLANICI RESPONSE:", kullaniciResponse.status);

      if (!kullaniciResponse.ok) {
        throw new Error(
          `Kullanici bilgisi alinamadi. HTTP ${kullaniciResponse.status}`,
        );
      }

      const kullaniciVerisi = (await kullaniciResponse.json()) as Kullanici;

      const profilResponse = await fetch(`${API_ADRESI}/profiles`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("PROFILLER RESPONSE:", profilResponse.status);

      if (!profilResponse.ok) {
        throw new Error(
          `Profil bilgisi alinamadi. HTTP ${profilResponse.status}`,
        );
      }

      const profilVerisi = await profilResponse.json();

      let profilListesi: Profil[] = [];

      if (Array.isArray(profilVerisi)) {
        profilListesi = profilVerisi;
      } else if (Array.isArray(profilVerisi?.content)) {
        profilListesi = profilVerisi.content;
      }

      const bulunanProfil = profilListesi.find(
        (item) => Number(item.userId) === Number(id),
      );

      console.log("BULUNAN PROFIL:", bulunanProfil);

      setKullanici(kullaniciVerisi);
      setProfil(bulunanProfil || null);

      await durumlariGetir(token, Number(id));
    } catch (error) {
      console.log("KULLANICI PROFILI HATASI:", error);

      setHata(
        error instanceof Error
          ? error.message
          : "Profil y�klenirken hata olu�Ytu.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const durumlariGetir = async (token: string, hedefKullaniciId: number) => {
    try {
      const mevcutKullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (!mevcutKullaniciId) {
        return;
      }

      if (mevcutKullaniciId === hedefKullaniciId) {
        return;
      }

      const [begeniResponse, favoriResponse] = await Promise.all([
        fetch(`${API_ADRESI}/likes`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }),

        fetch(`${API_ADRESI}/favorites`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }),
      ]);

      if (begeniResponse.ok) {
        const begeniler = (await begeniResponse.json()) as Begeni[];

        const mevcutBegeni = begeniler.some(
          (item) =>
            Number(item.userId) === mevcutKullaniciId &&
            Number(item.likedUserId) === hedefKullaniciId,
        );

        setBegendi(mevcutBegeni);
      }

      if (favoriResponse.ok) {
        const favoriler = (await favoriResponse.json()) as Favori[];

        const mevcutFavori = favoriler.some(
          (item) =>
            Number(item.userId) === mevcutKullaniciId &&
            Number(item.favoriteUserId) === hedefKullaniciId,
        );

        setFavoride(mevcutFavori);
      }
    } catch (error) {
      console.log("BEGENI / FAVORI DURUMU HATASI:", error);
    }
  };

  const begen = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const mevcutKullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !mevcutKullaniciId || !kullanici) {
        Alert.alert("Hata", "Oturum veya kullanici bilgisi bulunamadi.");
        return;
      }

      if (mevcutKullaniciId === kullanici.id) {
        Alert.alert("Uyari", "Kendinizi be�Yenemezsiniz.");
        return;
      }

      if (begendi) {
        return;
      }

      setBegeniYukleniyor(true);

      const response = await fetch(`${API_ADRESI}/likes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          userId: mevcutKullaniciId,
          likedUserId: kullanici.id,
        }),
      });

      const responseText = await response.text();

      console.log("BEGENI RESPONSE:", response.status, responseText);

      if (!response.ok) {
        throw new Error(
          responseText || `Be�Yeni g�nderilemedi. HTTP ${response.status}`,
        );
      }

      setBegendi(true);

      Alert.alert("Ba�Yarili", "?? Be�Yeni g�nderildi.");
    } catch (error) {
      console.log("BEGENI HATASI:", error);

      Alert.alert(
        "Hata",
        error instanceof Error ? error.message : "Be�Yeni g�nderilemedi.",
      );
    } finally {
      setBegeniYukleniyor(false);
    }
  };

  const favoriyeEkle = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const mevcutKullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !mevcutKullaniciId || !kullanici) {
        Alert.alert("Hata", "Oturum veya kullanici bilgisi bulunamadi.");
        return;
      }

      if (mevcutKullaniciId === kullanici.id) {
        Alert.alert("Uyari", "Kendinizi favorilere ekleyemezsiniz.");
        return;
      }

      if (favoride) {
        return;
      }

      setFavoriYukleniyor(true);

      const response = await fetch(`${API_ADRESI}/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          userId: mevcutKullaniciId,
          favoriteUserId: kullanici.id,
        }),
      });

      const responseText = await response.text();

      console.log("FAVORI RESPONSE:", response.status, responseText);

      if (!response.ok) {
        throw new Error(
          responseText || `Favorilere eklenemedi. HTTP ${response.status}`,
        );
      }

      setFavoride(true);

      Alert.alert("Ba�Yarili", "? Favorilere eklendi.");
    } catch (error) {
      console.log("FAVORI HATASI:", error);

      Alert.alert(
        "Hata",
        error instanceof Error ? error.message : "Favorilere eklenemedi.",
      );
    } finally {
      setFavoriYukleniyor(false);
    }
  };

  const mesajGonder = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token || !kullanici) {
        Alert.alert("Hata", "Oturum veya kullanici bulunamadi.");
        return;
      }

      const temizMesaj = mesaj.trim();

      if (!temizMesaj) {
        Alert.alert("Uyari", "Mesaj bo�Y olamaz.");
        return;
      }

      setMesajYukleniyor(true);

      const response = await fetch(`${API_ADRESI}/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          receiverId: kullanici.id,
          content: temizMesaj,
        }),
      });

      const responseText = await response.text();

      console.log("MESAJ RESPONSE:", response.status, responseText);

      if (!response.ok) {
        let hataMesaji = `Mesaj g�nderilemedi. HTTP ${response.status}`;

        try {
          const veri = JSON.parse(responseText);

          if (veri?.kod === "PREMIUM_GEREKLI") {
            hataMesaji =
              "Mesaj g�nderebilmek i�in aktif PREMIUM �yeli�Yiniz bulunmalidir.";
          } else if (veri?.mesaj) {
            hataMesaji = veri.mesaj;
          }
        } catch {
          if (responseText) {
            hataMesaji = responseText;
          }
        }

        throw new Error(hataMesaji);
      }

      setMesaj("");

      Alert.alert("Ba�Yarili", "Mesaj ba�Yariyla g�nderildi.");
    } catch (error) {
      console.log("MESAJ HATASI:", error);

      Alert.alert(
        "Hata",
        error instanceof Error ? error.message : "Mesaj g�nderilemedi.",
      );
    } finally {
      setMesajYukleniyor(false);
    }
  };

  const fotoUrlOlustur = (foto?: string) => {
    if (!foto) {
      return "";
    }

    if (foto.startsWith("http://") || foto.startsWith("https://")) {
      return foto;
    }

    if (foto.startsWith("/")) {
      return `${SUNUCU_ADRESI}${foto}`;
    }

    return `${SUNUCU_ADRESI}/${foto}`;
  };

  const yasHesapla = (dogumTarihi?: string) => {
    if (!dogumTarihi) {
      return null;
    }

    const dogum = new Date(dogumTarihi);

    if (Number.isNaN(dogum.getTime())) {
      return null;
    }

    const bugun = new Date();

    let yas = bugun.getFullYear() - dogum.getFullYear();

    const ay = bugun.getMonth() - dogum.getMonth();

    if (ay < 0 || (ay === 0 && bugun.getDate() < dogum.getDate())) {
      yas--;
    }

    return yas;
  };

  const enumGoster = (deger?: string | number) => {
    if (deger === undefined || deger === null || String(deger).trim() === "") {
      return "Belirtilmemi�Y";
    }

    return String(deger);
  };

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Kullanici profili y�kleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hata) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.hataBaslik}>Profil Y�klenemedi</Text>

          <Text style={styles.hataText}>{hata}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={kullaniciProfiliniGetir}
          >
            <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Geri D�n</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!kullanici) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.hataBaslik}>Kullanici bulunamadi.</Text>

          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Geri D�n</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const foto = fotoUrlOlustur(profil?.profilePhoto || kullanici.profilePhoto);

  const yas = yasHesapla(kullanici.birthDate);

  const adSoyad = `${kullanici.firstName || ""} ${
    kullanici.lastName || ""
  }`.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* �oST BAR */}

        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>�?�</Text>

            <Text style={styles.backText}>Geri</Text>
          </Pressable>

          <Text style={styles.topTitle}>Profil</Text>

          <Pressable
            onPress={() => router.replace("/home")}
            style={styles.homeButton}
          >
            <Text style={styles.homeButtonText}>Ana Sayfa</Text>
          </Pressable>
        </View>

        {/* ANA PROFIL */}

        <View style={styles.profileCard}>
          <View style={styles.photoContainer}>
            {foto ? (
              <Image
                source={{
                  uri: foto,
                }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {(kullanici.firstName || kullanici.username || "?")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            {kullanici.online && <View style={styles.onlineDot} />}
          </View>

          <Text style={styles.name}>{adSoyad || kullanici.username}</Text>

          <Text style={styles.username}>@{kullanici.username}</Text>

          {/* ETIKETLER */}

          <View style={styles.tags}>
            {yas !== null && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>gY'� {yas} ya�Yinda</Text>
              </View>
            )}

            {kullanici.gender && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{kullanici.gender}</Text>
              </View>
            )}

            {kullanici.city && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>gY"� {kullanici.city}</Text>
              </View>
            )}

            {profil?.profession && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  gY'� {enumGoster(profil.profession)}
                </Text>
              </View>
            )}

            {profil?.maritalStatus && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  ?? {enumGoster(profil.maritalStatus)}
                </Text>
              </View>
            )}
          </View>

          {kullanici.online && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>�-� �?evrimi�i</Text>
            </View>
          )}

          {profil?.profileVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                �o" Profil Do�Yrulandi
              </Text>
            </View>
          )}
        </View>

        {/* BEGENI / FAVORI */}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.likeButton, begendi && styles.disabledActionButton]}
            onPress={begen}
            disabled={begendi || begeniYukleniyor}
          >
            <Text style={styles.likeButtonText}>
              {begeniYukleniyor
                ? "G�nderiliyor..."
                : begendi
                  ? "?? Be�Yenildi"
                  : "?? Be�Yen"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.favoriteButton, favoride && styles.favoriteActive]}
            onPress={favoriyeEkle}
            disabled={favoride || favoriYukleniyor}
          >
            <Text style={styles.favoriteButtonText}>
              {favoriYukleniyor
                ? "Ekleniyor..."
                : favoride
                  ? "? Favorilerde"
                  : "�~? Favorilere Ekle"}
            </Text>
          </Pressable>
        </View>

        {/* MESAJ */}

        <View style={styles.section}>
          <Pressable
            style={styles.messageButton}
            onPress={() => setMesajAcik(!mesajAcik)}
          >
            <Text style={styles.messageButtonText}>
              {mesajAcik ? "Mesaj Alanini Kapat" : "gY'� Mesaj G�nder"}
            </Text>
          </Pressable>

          {mesajAcik && (
            <View style={styles.messageBox}>
              <Text style={styles.messageTitle}>
                {adSoyad || kullanici.username} ki�Yisine mesaj g�nder
              </Text>

              <TextInput
                value={mesaj}
                onChangeText={setMesaj}
                multiline
                maxLength={2000}
                numberOfLines={5}
                placeholder="Mesajinizi yazin..."
                placeholderTextColor="#999999"
                style={styles.messageInput}
                textAlignVertical="top"
              />

              <View style={styles.messageBottom}>
                <Text style={styles.characterCount}>{mesaj.length}/2000</Text>

                <Pressable
                  style={styles.sendButton}
                  onPress={mesajGonder}
                  disabled={mesajYukleniyor || !mesaj.trim()}
                >
                  <Text style={styles.sendButtonText}>
                    {mesajYukleniyor ? "G�nderiliyor..." : "G�nder"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* HAKKINDA */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkinda</Text>

          <View style={styles.aboutBox}>
            <Text style={styles.aboutText}>
              {profil?.about ||
                "Bu kullanici hakkinda hen�z bilgi eklenmemi�Y."}
            </Text>
          </View>
        </View>

        {/* KISISEL BILGILER */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ki�Yisel Bilgiler</Text>

          <BilgiKarti
            baslik="Sehir"
            deger={kullanici.city || "Belirtilmemi�Y"}
            ikon="📏"
          />

          <BilgiKarti
            baslik="Ya�Y"
            deger={yas !== null ? `${yas} ya�Yinda` : "Belirtilmemi�Y"}
            ikon="🎂"
          />

          <BilgiKarti
            baslik="Meslek"
            deger={enumGoster(profil?.profession)}
            ikon="🎂"
          />

          <BilgiKarti
            baslik="E�Yitim"
            deger={enumGoster(profil?.education)}
            ikon="🎓"
          />

          <BilgiKarti
            baslik="Boy"
            deger={profil?.height ? `${profil.height} cm` : "Belirtilmemi�Y"}
            ikon="📏"
          />

          <BilgiKarti
            baslik="Kilo"
            deger={profil?.weight ? `${profil.weight} kg` : "Belirtilmemi�Y"}
            ikon="�s-?"
          />

          <BilgiKarti
            baslik="Medeni Durum"
            deger={enumGoster(profil?.maritalStatus)}
            ikon="??"
          />

          <BilgiKarti
            baslik="Din"
            deger={enumGoster(profil?.religion)}
            ikon="gY.O"
          />
        </View>

        {/* ILGI ALANLARI */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ilgi Alanlari</Text>

          {profil?.interests ? (
            <View style={styles.interestsBox}>
              {String(profil.interests)
                .split(",")
                .map((interest, index) => (
                  <View
                    key={`${interest}-${index}`}
                    style={styles.interestChip}
                  >
                    <Text style={styles.interestText}>{interest.trim()}</Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Ilgi alani belirtilmemi�Y.</Text>
          )}
        </View>

        {/* DETAYLI PROFIL */}

        <View style={styles.section}>
          <Pressable
            style={styles.detailButton}
            onPress={() =>
              router.push({
                pathname: "/user/details/[id]",
                params: { id: String(id) },
              })
            }
          >
            <Text style={styles.detailButtonText}>�"�️ Detayli Profili G�r</Text>
          </Pressable>
        </View>

        {/* ALT BUTONLAR */}

        <View style={styles.bottomButtons}>
          <Pressable
            style={styles.bottomBackButton}
            onPress={() => router.replace("/home")}
          >
            <Text style={styles.bottomBackText}>�?� Kullanicilara D�n</Text>
          </Pressable>

          <Pressable
            style={styles.bottomMessageButton}
            onPress={() => router.push("/messages")}
          >
            <Text style={styles.bottomMessageText}>gY'� T�m Mesajlar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BilgiKarti({
  baslik,
  deger,
  ikon,
}: {
  baslik: string;
  deger: string;
  ikon: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoIcon}>{ikon}</Text>

        <Text style={styles.infoTitle}>{baslik}</Text>
      </View>

      <Text style={styles.infoValue}>{deger}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f5ff",
  },

  scrollContent: {
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
    color: "#4c1d95",
  },

  hataBaslik: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4c1d95",
    marginBottom: 10,
    textAlign: "center",
  },

  hataText: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },

  secondaryButtonText: {
    color: "#6d28d9",
    fontWeight: "800",
    fontSize: 15,
  },

  topBar: {
    height: 64,
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 85,
  },

  backIcon: {
    color: "#ffffff",
    fontSize: 38,
    lineHeight: 40,
    marginRight: 4,
  },

  backText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  topTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },

  homeButton: {
    width: 85,
    alignItems: "flex-end",
  },

  homeButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  profileCard: {
    margin: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  photoContainer: {
    width: "100%",
    height: 330,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ede9fe",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  profilePhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  photoPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#ddd6fe",
    alignItems: "center",
    justifyContent: "center",
  },

  photoPlaceholderText: {
    color: "#6d28d9",
    fontSize: 60,
    fontWeight: "800",
  },

  onlineDot: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22c55e",
    borderWidth: 3,
    borderColor: "#ffffff",
  },

  name: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "800",
    color: "#4c1d95",
    textAlign: "center",
  },

  username: {
    marginTop: 4,
    fontSize: 16,
    color: "#7c3aed",
    fontWeight: "600",
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },

  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  tagText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
  },

  onlineBadge: {
    marginTop: 14,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },

  onlineBadgeText: {
    color: "#15803d",
    fontWeight: "800",
  },

  verifiedBadge: {
    marginTop: 10,
    backgroundColor: "#ede9fe",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },

  verifiedBadgeText: {
    color: "#6d28d9",
    fontWeight: "800",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },

  likeButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#db2777",
  },

  likeButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },

  disabledActionButton: {
    opacity: 0.7,
  },

  favoriteButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  favoriteActive: {
    backgroundColor: "#faf5ff",
  },

  favoriteButtonText: {
    color: "#6d28d9",
    fontWeight: "800",
    fontSize: 14,
  },

  section: {
    marginHorizontal: 14,
    marginTop: 18,
  },

  messageButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },

  messageButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  messageBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },

  messageTitle: {
    fontSize: 15,
    color: "#4c1d95",
    fontWeight: "700",
    marginBottom: 12,
  },

  messageInput: {
    minHeight: 120,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 12,
    padding: 12,
    color: "#374151",
    fontSize: 15,
  },

  messageBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  characterCount: {
    color: "#6b7280",
    fontSize: 12,
  },

  sendButton: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },

  sendButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5b21b6",
    marginBottom: 12,
  },

  aboutBox: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
  },

  aboutText: {
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 24,
  },

  infoCard: {
    minHeight: 95,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    padding: 15,
    marginBottom: 10,
    justifyContent: "center",
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  infoIcon: {
    fontSize: 18,
    marginRight: 7,
  },

  infoTitle: {
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: "700",
  },

  infoValue: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },

  interestsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  interestChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#f3e8ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },

  interestText: {
    color: "#6d28d9",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },

  detailButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#6d28d9",
    alignItems: "center",
    justifyContent: "center",
  },

  detailButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  bottomButtons: {
    marginHorizontal: 14,
    marginTop: 22,
    gap: 10,
  },

  bottomBackButton: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  bottomBackText: {
    color: "#6d28d9",
    fontWeight: "800",
  },

  bottomMessageButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomMessageText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
