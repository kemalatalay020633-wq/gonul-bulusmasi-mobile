import { tokenGetir } from "../../services/tokenServisi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// profil gör
// src/app/user/[id].tsx
import KimlikDogrulamaliAvatar from "../../components/common/KimlikDogrulamaliAvatar";
import { API_BASE_URL } from "../../config/api";
import {
  meslegiCevir,
  profilSorusunuCevir,
} from "../../utils/profilSoruCevirisi";

const API_ADRESI = API_BASE_URL + "/api";
type Kullanıcı = {
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

type EnumSecenegi = {
  kod: string | number;
  aciklama: string;
};

export default function KullanıcıProfil() {
  const { t, i18n } = useTranslation("userProfile");
  const navigation = useNavigation<any>();

  const route = useRoute<any>();
  const { id } = route.params as {
    id: string;
  };

  const [kullanici, setKullanıcı] = useState<Kullanıcı | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [medeniDurumlari, setMedeniDurumlari] = useState<EnumSecenegi[]>([]);
  const [mezhepler, setMezhepler] = useState<EnumSecenegi[]>([]);
  const [ilgiAlanlari, setIlgiAlanlari] = useState<EnumSecenegi[]>([]);

  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  const [begendi, setBegendi] = useState(false);
  const [favoride, setFavoride] = useState(false);

  const [begeniYukleniyor, setBegeniYukleniyor] = useState(false);
  const [favoriYukleniyor, setFavoriYukleniyor] = useState(false);

  const [mesajAcik, setMesajAcik] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [mesajYukleniyor, setMesajYukleniyor] = useState(false);
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [sikayetNedeni, setSikayetNedeni] = useState("");
  const [sikayetAciklamasi, setSikayetAciklamasi] = useState("");
  const [sikayetGonderiliyor, setSikayetGonderiliyor] = useState(false);

  const sikayetNedenleri = [
    {
      kod: "MEDENI_DURUMUNU_GIZLEME",
      metin: t("userProfile:reportReasonMarital"),
    },
    {
      kod: "SAHTE_PROFIL",
      metin: t("userProfile:reportReasonFake"),
    },
    {
      kod: "TACIZ_VE_ISRARLI_MESAJ",
      metin: t("userProfile:reportReasonHarassment"),
    },
    {
      kod: "HAKARET_VE_TEHDIT",
      metin: t("userProfile:reportReasonInsult"),
    },
    {
      kod: "UYGUNSUZ_CINSEL_ICERIK",
      metin: t("userProfile:reportReasonSexual"),
    },
    {
      kod: "DOLANDIRICILIK_VE_PARA_ISTEME",
      metin: t("userProfile:reportReasonScam"),
    },
    {
      kod: "DIGER",
      metin: t("userProfile:reportReasonOther"),
    },
  ];
  useEffect(() => {
    void kullaniciProfiliniGetir();
  }, [id]);

  const kullaniciProfiliniGetir = async () => {
    try {
      setYukleniyor(true);
      setHata("");

      const token = await tokenGetir();

      if (!token) {
        navigation.replace("index");
        return;
      }

      if (!id) {
        setHata(t("userProfile:notFound"));
        return;
      }

      // Kullanıcı bilgilerini getir.
      const kullaniciResponse = await fetch(`${API_ADRESI}/users/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!kullaniciResponse.ok) {
        throw new Error(t("userProfile:userLoadFailed"));
      }

      const kullaniciVerisi = (await kullaniciResponse.json()) as Kullanıcı;

      // Normal profil görüntüleme bildirimini oluştur.
      // Bu çağrı yalnızca normal kullanıcı profili ekranında yapılır.
      // Bildirim başarısız olsa bile profil yüklemesi devam eder.
      try {
        const goruntulemeResponse = await fetch(
          `${API_ADRESI}/profiles/user/${id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );

        if (!goruntulemeResponse.ok) {
          console.warn(t("userProfile:viewNoticeCreateFailed"));
        } else {
          // Yanıt içeriği kullanılmıyor.
          await goruntulemeResponse.text();
        }
      } catch {
        console.warn(t("userProfile:viewNoticeSendFailed"));
      }

      // Profil listesini getir.
      const profilResponse = await fetch(`${API_ADRESI}/profiles`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!profilResponse.ok) {
        throw new Error(t("userProfile:profileLoadFailed"));
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

      // Sayısal enum kodlarını açıklamalarıyla eşleştirmek için seçenekleri getir.
      // API değerleri değiştirilmez; yalnızca ekranda çevrilir.
      const [medeniDurumYaniti, mezhepYaniti, ilgiAlaniYaniti] =
        await Promise.all([
          fetch(`${API_ADRESI}/enums/medeni-durumlar`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }).catch(() => null),
          fetch(`${API_ADRESI}/enums/mezhepler`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }).catch(() => null),
          fetch(`${API_ADRESI}/enums/ilgi-alanlari`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }).catch(() => null),
        ]);

      const [medeniDurumVerisi, mezhepVerisi, ilgiAlaniVerisi] =
        await Promise.all([
          medeniDurumYaniti?.ok ? medeniDurumYaniti.json() : [],
          mezhepYaniti?.ok ? mezhepYaniti.json() : [],
          ilgiAlaniYaniti?.ok ? ilgiAlaniYaniti.json() : [],
        ]);

      setMedeniDurumlari(
        Array.isArray(medeniDurumVerisi) ? medeniDurumVerisi : [],
      );
      setMezhepler(Array.isArray(mezhepVerisi) ? mezhepVerisi : []);
      setIlgiAlanlari(Array.isArray(ilgiAlaniVerisi) ? ilgiAlaniVerisi : []);

      // Profil bilgilerini ekrana aktar.
      setKullanıcı(kullaniciVerisi);
      setProfil(bulunanProfil || null);

      // Beğeni, favori ve diğer mevcut durumları getir.
      await durumlariGetir(token, Number(id));
    } catch (error) {
      console.error("Kullanıcı profili yüklenemedi.");

      setHata(t("userProfile:loadError"));
    } finally {
      setYukleniyor(false);
    }
  };
  const durumlariGetir = async (token: string, hedefKullanıcıId: number) => {
    try {
      const mevcutKullanıcıId = Number(await AsyncStorage.getItem("userId"));

      if (!mevcutKullanıcıId) {
        return;
      }

      if (mevcutKullanıcıId === hedefKullanıcıId) {
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
            Number(item.userId) === mevcutKullanıcıId &&
            Number(item.likedUserId) === hedefKullanıcıId,
        );

        setBegendi(mevcutBegeni);
      }

      if (favoriResponse.ok) {
        const favoriler = (await favoriResponse.json()) as Favori[];

        const mevcutFavori = favoriler.some(
          (item) =>
            Number(item.userId) === mevcutKullanıcıId &&
            Number(item.favoriteUserId) === hedefKullanıcıId,
        );

        setFavoride(mevcutFavori);
      }
    } catch (error) {
      console.error(t("userProfile:likeStateFailed"));
    }
  };

  const begen = async () => {
    try {
      const token = await tokenGetir();

      const mevcutKullanıcıId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !mevcutKullanıcıId || !kullanici) {
        Alert.alert(
          t("userProfile:operationFailed"),
          t("userProfile:sessionMissing"),
        );
        return;
      }

      if (mevcutKullanıcıId === kullanici.id) {
        Alert.alert(t("userProfile:warning"), t("userProfile:selfLike"));
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
          userId: mevcutKullanıcıId,
          likedUserId: kullanici.id,
        }),
      });

      const responseText = await response.text();

      // Sunucunun yanıt gövdesini konsola yazdırma.
      if (!response.ok) {
        throw new Error(t("userProfile:likeFailed"));
      }

      setBegendi(true);

      Alert.alert(t("userProfile:success"), t("userProfile:likeSent"));
    } catch (error) {
      console.error(t("userProfile:likeOperationFailed"));

      Alert.alert(
        t("userProfile:operationFailed"),
        t("userProfile:likeFailed"),
      );
    } finally {
      setBegeniYukleniyor(false);
    }
  };

  const favoriyeEkle = async () => {
    try {
      const token = await tokenGetir();

      const mevcutKullanıcıId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !mevcutKullanıcıId || !kullanici) {
        Alert.alert(
          t("userProfile:operationFailed"),
          t("userProfile:sessionMissing"),
        );
        return;
      }

      if (mevcutKullanıcıId === kullanici.id) {
        Alert.alert(t("userProfile:warning"), t("userProfile:selfFavorite"));
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
          userId: mevcutKullanıcıId,
          favoriteUserId: kullanici.id,
        }),
      });

      const responseText = await response.text();

      // Sunucunun yanıt gövdesini konsola yazdırma.
      if (!response.ok) {
        throw new Error(t("userProfile:favoriteFailed"));
      }

      setFavoride(true);

      Alert.alert(t("userProfile:success"), t("userProfile:favoriteAdded"));
    } catch (error) {
      console.error(t("userProfile:favoriteOperationFailed"));

      Alert.alert(
        t("userProfile:operationFailed"),
        t("userProfile:favoriteFailed"),
      );
    } finally {
      setFavoriYukleniyor(false);
    }
  };

  const mesajGonder = async () => {
    try {
      const token = await tokenGetir();

      if (!token || !kullanici) {
        Alert.alert("Hata", "Oturum veya kullanici bulunamadi.");
        return;
      }

      const temizMesaj = mesaj.trim();

      if (!temizMesaj) {
        Alert.alert(t("userProfile:warning"), t("userProfile:messageEmpty"));
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

      // Sunucunun yanıt gövdesini konsola yazdırma.
      if (!response.ok) {
        let hataMesaji = `Mesaj gönderilemedi. HTTP ${response.status}`;
        let premiumGerekli = false;

        try {
          const veri = JSON.parse(responseText);

          if (veri?.kod === "PREMIUM_GEREKLI") {
            premiumGerekli = true;
            hataMesaji = t("userProfile:premiumMessageRequired");
          }
        } catch {
          // Ham sunucu yanıtı kullanıcıya gösterilmez.
        }

        if (premiumGerekli) {
          Alert.alert(t("userProfile:premiumRequired"), hataMesaji, [
            {
              text: t("userProfile:cancel"),
              style: "cancel",
            },
            {
              text: t("userProfile:becomePremium", {
                defaultValue: "⭐ Premium Ol",
              }),
              onPress: () => navigation.navigate("premium"),
            },
          ]);

          return;
        }

        throw new Error(hataMesaji);
      }

      setMesaj("");

      Alert.alert(t("userProfile:success"), t("userProfile:messageSent"));
    } catch (error) {
      console.error(t("userProfile:messageOperationFailed"));

      Alert.alert(
        t("userProfile:operationFailed"),
        t("userProfile:messageSendFailed"),
      );
    } finally {
      setMesajYukleniyor(false);
    }
  };
  const sikayetiGonder = async () => {
    if (sikayetGonderiliyor) {
      return;
    }

    try {
      const token = await tokenGetir();
      const mevcutKullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !mevcutKullaniciId || !kullanici) {
        Alert.alert("Hata", t("userProfile:sessionMissing"));
        return;
      }

      if (mevcutKullaniciId === kullanici.id) {
        Alert.alert(t("userProfile:warning"), t("userProfile:selfReport"));
        return;
      }

      if (!sikayetNedeni) {
        Alert.alert(t("userProfile:warning"), t("userProfile:reasonRequired"));
        return;
      }

      const aciklama = sikayetAciklamasi.trim();

      if (aciklama.length > 2000) {
        Alert.alert(
          t("userProfile:warning"),
          t("userProfile:descriptionTooLong"),
        );
        return;
      }

      setSikayetGonderiliyor(true);

      const response = await fetch(
        `${API_ADRESI}/sikayetler?sikayetEdilenId=${encodeURIComponent(
          String(kullanici.id),
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            neden: sikayetNedeni,
            aciklama: aciklama || null,
            mesajId: null,
          }),
        },
      );

      const yanitMetni = await response.text();

      if (!response.ok) {
        let hataMesaji = t("userProfile:reportFailed");

        try {
          const veri = JSON.parse(yanitMetni);

          if (typeof veri?.message === "string") {
            hataMesaji = veri.message;
          } else if (typeof veri?.mesaj === "string") {
            hataMesaji = veri.mesaj;
          }
        } catch {
          // Sunucunun ham yanıtını kullanıcıya göstermiyoruz.
        }

        Alert.alert(t("userProfile:operationFailed"), hataMesaji);
        return;
      }

      setSikayetModalAcik(false);
      setSikayetNedeni("");
      setSikayetAciklamasi("");

      Alert.alert(t("userProfile:reportReceived"), t("userProfile:reportSent"));
    } catch {
      Alert.alert(
        t("userProfile:connectionError"),
        t("userProfile:reportConnectionFailed"),
      );
    } finally {
      setSikayetGonderiliyor(false);
    }
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

  // Sunucudan gelen enum ve seçenek değerlerini, kayıtlı dile göre gösterir.
  // API'ye gönderilen değerler değiştirilmez; yalnızca ekranda çevrilir.
  const enumGoster = (deger?: string | number) => {
    if (deger === undefined || deger === null || String(deger).trim() === "") {
      return t("userProfile:unspecified");
    }

    const hamDeger = String(deger).trim();
    return profilSorusunuCevir(
      hamDeger,
      i18n.resolvedLanguage || i18n.language,
    );
  };

  // API'den gelen sayısal enum kodunu önce açıklamayla eşleştirir,
  // ardından mevcut beş dilli çeviri sözlüğünden ekrana uygun metni alır.
  const enumSecenegiGoster = (
    liste: EnumSecenegi[],
    deger?: string | number,
  ): string => {
    if (deger === undefined || deger === null || String(deger).trim() === "") {
      return t("userProfile:unspecified");
    }

    const hamDeger = String(deger).trim();
    const bulunan = liste.find((item) => String(item.kod).trim() === hamDeger);

    if (bulunan?.aciklama) {
      return profilSorusunuCevir(
        bulunan.aciklama,
        i18n.resolvedLanguage || i18n.language,
      );
    }

    // Sayısal kodun açıklaması bulunamadıysa kodu kullanıcıya göstermeyiz.
    if (/^\\d+$/.test(hamDeger)) {
      return t("userProfile:unspecified");
    }

    return profilSorusunuCevir(
      hamDeger,
      i18n.resolvedLanguage || i18n.language,
    );
  };

  const cinsiyetiGoster = (deger?: string) => {
    if (!deger?.trim()) return t("userProfile:unspecified");

    const anahtar = deger.trim().toLocaleUpperCase("tr-TR");
    const cinsiyetCevirileri: Record<string, string> = {
      ERKEK: t("userProfile:genderMale", { defaultValue: "Erkek" }),
      KADIN: t("userProfile:genderFemale", { defaultValue: "Kadın" }),
      MALE: t("userProfile:genderMale", { defaultValue: "Erkek" }),
      FEMALE: t("userProfile:genderFemale", { defaultValue: "Kadın" }),
    };

    return cinsiyetCevirileri[anahtar] || enumGoster(deger);
  };

  const ilgiAlanlariniGoster = (deger: string | number) =>
    String(deger)
      .split(/[,|]/)
      .map((ilgi) => enumSecenegiGoster(ilgiAlanlari, ilgi.trim()))
      .filter((ilgi) => ilgi && ilgi !== t("userProfile:unspecified"));

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>{t("userProfile:loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hata) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.hataBaslik}>{t("userProfile:loadTitle")}</Text>

          <Text style={styles.hataText}>{hata}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={kullaniciProfiliniGetir}
          >
            <Text style={styles.primaryButtonText}>
              {t("userProfile:retry")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>
              {t("userProfile:back")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!kullanici) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.hataBaslik}>{t("userProfile:notFound")}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>
              {t("userProfile:back")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const adSoyad = `${kullanici.firstName || ""} ${
    kullanici.lastName || ""
  }`.trim();
  const avatarHarf = (adSoyad || kullanici.username || "?")
    .charAt(0)
    .toUpperCase();
  const yas = yasHesapla(kullanici.birthDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ÜST BAR */}

        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>
              {t("userProfile:back", { defaultValue: "Geri" })}
            </Text>
          </Pressable>

          <Text style={styles.topTitle}>{t("userProfile:profile")}</Text>

          <Pressable
            style={styles.sikayetTopButton}
            onPress={() => {
              navigation.navigate("sikayet", {
                sikayetEdilenId: Number(id),
              });
            }}
          >
            <Text style={styles.sikayetTopButtonText}>
              {t("userProfile:report")}
            </Text>
          </Pressable>
        </View>

        {/* PROFIL BASLIGI: KÜÇÜK AVATAR + KULLANICI BILGILERI */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarFrame}>
              <KimlikDogrulamaliAvatar
                kullaniciId={kullanici.id}
                boyut={106}
                altYazi={avatarHarf}
                imageStyle={styles.profileAvatar}
              />
              {kullanici.online && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.profileIdentity}>
              <Text style={styles.name}>{adSoyad || kullanici.username}</Text>
              <Text style={styles.username}>@{kullanici.username}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    !kullanici.online && styles.statusDotOffline,
                  ]}
                />
                <Text style={styles.statusText}>
                  {kullanici.online
                    ? t("userProfile:online")
                    : t("userProfile:offline")}
                </Text>
              </View>
              {profil?.profileVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>
                    {t("userProfile:verified", {
                      defaultValue: "✓ Doğrulanmış profil",
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.tagRow}>
            {yas !== null && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {yas} {t("userProfile:yearsOld", { defaultValue: "yaş" })}
                </Text>
              </View>
            )}
            {kullanici.city && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{kullanici.city}</Text>
              </View>
            )}
            {kullanici.gender && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {cinsiyetiGoster(kullanici.gender)}
                </Text>
              </View>
            )}
            {profil?.maritalStatus !== undefined && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {enumSecenegiGoster(medeniDurumlari, profil.maritalStatus)}
                </Text>
              </View>
            )}
          </View>
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
                ? t("userProfile:sending")
                : begendi
                  ? t("userProfile:liked")
                  : t("userProfile:like")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.favoriteButton, favoride && styles.favoriteActive]}
            onPress={favoriyeEkle}
            disabled={favoride || favoriYukleniyor}
          >
            <Text style={styles.favoriteButtonText}>
              {favoriYukleniyor
                ? t("userProfile:addingFavorite", {
                    defaultValue: "Ekleniyor...",
                  })
                : favoride
                  ? t("userProfile:inFavorites", {
                      defaultValue: "★ Favorilerde",
                    })
                  : t("userProfile:addFavorite")}
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
              {mesajAcik
                ? t("userProfile:closeMessage")
                : t("userProfile:sendMessage")}
            </Text>
          </Pressable>

          {mesajAcik && (
            <View style={styles.messageBox}>
              <Text style={styles.messageTitle}>
                {t("userProfile:messageToUser", {
                  name: adSoyad || kullanici.username,
                  defaultValue: `${adSoyad || kullanici.username} kişisine mesaj gönder`,
                })}
              </Text>

              <TextInput
                value={mesaj}
                onChangeText={setMesaj}
                multiline
                maxLength={2000}
                numberOfLines={5}
                placeholder={t("userProfile:messagePlaceholder")}
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
                    {mesajYukleniyor
                      ? t("userProfile:sending")
                      : t("userProfile:send")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* HAKKINDA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("userProfile:about")}</Text>
          <View style={styles.aboutBox}>
            <Text style={styles.aboutText}>
              {profil?.about || t("userProfile:noAbout")}
            </Text>
          </View>
        </View>

        {/* KİŞİSEL BİLGİLER: İKİLİ GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("userProfile:personalInfo")}
          </Text>

          <View style={styles.infoGrid}>
            <BilgiKarti
              baslik={t("userProfile:city")}
              deger={kullanici.city || t("userProfile:unspecified")}
              ikon="⌖"
            />

            <BilgiKarti
              baslik={t("userProfile:age")}
              deger={
                yas !== null
                  ? `${yas} ${t("userProfile:yearsOld", { defaultValue: "yaş" })}`
                  : t("userProfile:unspecified")
              }
              ikon="◷"
            />

            <BilgiKarti
              baslik={t("userProfile:profession")}
              deger={meslegiCevir(
                profil?.profession,
                i18n.resolvedLanguage || i18n.language,
              )}
              ikon="▣"
            />

            <BilgiKarti
              baslik={t("userProfile:height")}
              deger={
                profil?.height
                  ? `${profil.height} cm`
                  : t("userProfile:unspecified")
              }
              ikon="↕"
            />

            <BilgiKarti
              baslik={t("userProfile:weight")}
              deger={
                profil?.weight
                  ? `${profil.weight} kg`
                  : t("userProfile:unspecified")
              }
              ikon="⚖"
            />

            <BilgiKarti
              baslik={t("userProfile:maritalStatus")}
              deger={enumSecenegiGoster(medeniDurumlari, profil?.maritalStatus)}
              ikon="♡"
            />

            <BilgiKarti
              baslik={t("userProfile:religion")}
              deger={enumSecenegiGoster(mezhepler, profil?.religion)}
              ikon="✧"
            />
          </View>
        </View>
        {/* ILGI ALANLARI */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("userProfile:interests")}</Text>

          {profil?.interests ? (
            <View style={styles.interestsBox}>
              {ilgiAlanlariniGoster(profil.interests).map((interest, index) => (
                <View key={`${interest}-${index}`} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {t("userProfile:interestsUnspecified")}
            </Text>
          )}
        </View>

        {/* DETAYLI PROFIL */}

        <View style={styles.section}>
          <Pressable
            style={styles.detailButton}
            onPress={() =>
              navigation.navigate("userDetails", {
                id: String(id),
              })
            }
          >
            <Text style={styles.detailButtonText}>
              {t("userProfile:viewDetails")}
            </Text>
          </Pressable>
        </View>

        {/* ALT BUTONLAR */}

        <View style={styles.bottomButtons}>
          <Pressable
            style={styles.bottomBackButton}
            onPress={() => navigation.replace("home")}
          >
            <Text style={styles.bottomBackText}>
              {t("userProfile:backUsers")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.bottomMessageButton}
            onPress={() => navigation.navigate("messages")}
          >
            <Text style={styles.bottomMessageText}>
              {t("userProfile:allMessages")}
            </Text>
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
  container: { flex: 1, backgroundColor: "#10051F" },
  scrollContent: { paddingBottom: 34, backgroundColor: "#10051F" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#10051F",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#E8C8FF",
  },
  hataBaslik: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  hataText: {
    fontSize: 15,
    color: "#D7B8E8",
    textAlign: "center",
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#E8B85B",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryButtonText: { color: "#321044", fontWeight: "900", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#B34BD1",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryButtonText: { color: "#F3D9FF", fontWeight: "800", fontSize: 15 },
  topBar: {
    height: 62,
    backgroundColor: "#260638",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#71318B",
  },
  backButton: { flexDirection: "row", alignItems: "center", width: 85 },
  backIcon: { color: "#FFFFFF", fontSize: 32, lineHeight: 36, marginRight: 4 },
  backText: { color: "#F6E8FF", fontSize: 14, fontWeight: "700" },
  topTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  homeButton: { width: 85, alignItems: "flex-end" },
  homeButtonText: { color: "#F2D18A", fontSize: 13, fontWeight: "800" },
  profileCard: {
    marginHorizontal: 15,
    marginTop: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#260B38",
    borderWidth: 1,
    borderColor: "#79358F",
    elevation: 5,
  },
  profileHeader: { flexDirection: "row", alignItems: "center" },
  avatarFrame: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 3,
    backgroundColor: "#E8B85B",
    position: "relative",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 53,
    backgroundColor: "#42145A",
  },
  photoPlaceholder: {
    flex: 1,
    borderRadius: 53,
    backgroundColor: "#64227D",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: { color: "#FFFFFF", fontSize: 42, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#39E58C",
    borderWidth: 3,
    borderColor: "#260B38",
  },
  profileIdentity: { flex: 1, marginLeft: 15, minWidth: 0 },
  name: { fontSize: 21, fontWeight: "900", color: "#FFFFFF" },
  username: { marginTop: 4, fontSize: 14, color: "#D9A9EE", fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 9 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39E58C",
    marginRight: 7,
  },
  statusDotOffline: { backgroundColor: "#A78BBA" },
  statusText: { color: "#DCC8E8", fontSize: 12, fontWeight: "700" },
  verifiedBadge: {
    alignSelf: "flex-start",
    marginTop: 9,
    backgroundColor: "#4B1B66",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8B85B",
  },
  verifiedBadgeText: { color: "#FFE4A1", fontWeight: "800", fontSize: 11 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 15 },
  tag: {
    backgroundColor: "#421452",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#71318B",
  },
  tagText: { color: "#F5E8FF", fontWeight: "700", fontSize: 12 },
  sikayetTopButton: {
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C66CE0",
    backgroundColor: "#421452",
    alignItems: "center",
    justifyContent: "center",
  },
  sikayetTopButtonText: { color: "#FFE7A8", fontSize: 11, fontWeight: "900" },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    marginTop: 14,
    marginBottom: 2,
  },
  likeButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B52D80",
    borderWidth: 1,
    borderColor: "#F17CC4",
  },
  likeButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  disabledActionButton: { opacity: 0.65 },
  favoriteButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#321044",
  },
  favoriteActive: { backgroundColor: "#4B2860" },
  favoriteButtonText: { color: "#FFE3A0", fontWeight: "900", fontSize: 13 },
  section: {
    marginHorizontal: 15,
    marginTop: 16,
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#210B31",
    borderWidth: 1,
    borderColor: "#57206E",
  },
  messageButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonText: { color: "#321044", fontSize: 15, fontWeight: "900" },
  messageBox: {
    marginTop: 11,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#321044",
    borderWidth: 1,
    borderColor: "#A43BC0",
  },
  messageTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 10,
  },
  messageInput: {
    minHeight: 105,
    backgroundColor: "#180725",
    borderWidth: 1,
    borderColor: "#8E3DA8",
    borderRadius: 12,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 14,
  },
  messageBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  characterCount: { color: "#D7B8E8", fontSize: 12 },
  sendButton: {
    backgroundColor: "#E8B85B",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 11,
  },
  sendButtonText: { color: "#321044", fontWeight: "900" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F5D58F",
    marginBottom: 12,
  },
  aboutBox: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#321044",
    borderWidth: 1,
    borderColor: "#57206E",
  },
  aboutText: { color: "#E5D1EF", fontSize: 14, lineHeight: 22 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoCard: {
    width: "48.3%",
    minHeight: 86,
    borderRadius: 14,
    backgroundColor: "#2B103D",
    borderWidth: 1,
    borderColor: "#57206E",
    paddingHorizontal: 11,
    paddingVertical: 12,
    marginBottom: 10,
    justifyContent: "center",
  },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  infoIcon: { fontSize: 16, marginRight: 7, color: "#E8B85B" },
  infoTitle: {
    color: "#D9A9EE",
    fontSize: 11,
    fontWeight: "800",
    flexShrink: 1,
  },
  infoValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  interestsBox: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#421452",
    borderWidth: 1,
    borderColor: "#8E3DA8",
  },
  interestText: { color: "#F5DFFF", fontWeight: "800", fontSize: 12 },
  emptyText: { color: "#D7B8E8", fontSize: 14 },
  detailButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#4A175F",
    borderWidth: 1,
    borderColor: "#C45ADD",
    alignItems: "center",
    justifyContent: "center",
  },
  detailButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  bottomButtons: { marginHorizontal: 15, marginTop: 18, gap: 10 },
  bottomBackButton: {
    minHeight: 49,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#9C4AB7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#210B31",
  },
  bottomBackText: { color: "#F3D9FF", fontWeight: "900" },
  bottomMessageButton: {
    minHeight: 49,
    borderRadius: 13,
    backgroundColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomMessageText: { color: "#321044", fontWeight: "900" },
});
