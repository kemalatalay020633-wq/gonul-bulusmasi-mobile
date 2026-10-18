import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// src/app/home.tsx

import { API_BASE_URL } from "../config/api";

import { useNavigation } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;

type User = {
  id: number;

  username: string;

  email: string;

  firstName: string;

  lastName: string;

  birthDate: string;

  phoneNumber?: string | null;

  city?: string | null;

  active: boolean;

  online: boolean;

  emailVerified?: boolean;

  phoneVerified?: boolean;

  createdAt?: string;

  updatedAt?: string;
};

type Profile = {
  id: number;

  userId: number;

  about?: string | null;

  profession?: string | null;

  education?: string | null;

  height?: number | null;

  weight?: number | null;

  maritalStatus?: string | null;

  religion?: string | null;

  interests?: string | null;

  profilePhoto?: string | null;

  profileVerified?: boolean;
};

type DiscoverUser = {
  user: User;

  profile: Profile | null;
};

type Filtreler = {
  minAge: string;

  maxAge: string;

  city: string;

  maritalStatus: string;

  profession: string;

  education: string;

  minHeight: string;

  maxHeight: string;

  interest: string;

  onlyWithPhoto: boolean;

  onlyWithoutPhoto: boolean;

  onlySameCity: boolean;

  onlyActive: boolean;
};

type KendiProfil = {
  user: User;

  profile: Profile | null;
};

const bosFiltreler: Filtreler = {
  minAge: "",

  maxAge: "",

  city: "",

  maritalStatus: "",

  profession: "",

  education: "",

  minHeight: "",

  maxHeight: "",

  interest: "",

  onlyWithPhoto: false,

  onlyWithoutPhoto: false,

  onlySameCity: false,

  onlyActive: false,
};

export default function Home() {
  const navigation = useNavigation<any>();

  const [users, setUsers] = useState<DiscoverUser[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [username, setUsername] = useState("");

  const [currentUserCity, setCurrentUserCity] = useState("");

  const [mevcutKullanici, setMevcutKullanici] = useState<User | null>(null);

  const [mevcutProfil, setMevcutProfil] = useState<Profile | null>(null);

  const [filtreler, setFiltreler] = useState<Filtreler>(bosFiltreler);

  const [filtreModalAcik, setFiltreModalAcik] = useState(false);

  const [yenileme, setYenileme] = useState(false);

  useEffect(() => {
    void kullaniciBilgileriniYukle();

    void kullanicilariYukle();
  }, []);

  const kullaniciBilgileriniYukle = async () => {
    try {
      const kayitliUsername = await AsyncStorage.getItem("username");

      if (kayitliUsername) {
        setUsername(kayitliUsername);
      }
    } catch (hata) {
      console.error("KULLANICI BİLGİLERİ OKUMA HATASI:", hata);
    }
  };

  const yasHesapla = (dogumTarihi?: string | null): number | null => {
    if (!dogumTarihi) {
      return null;
    }

    const dogum = new Date(dogumTarihi);

    if (Number.isNaN(dogum.getTime())) {
      return null;
    }

    const bugun = new Date();

    let yas = bugun.getFullYear() - dogum.getFullYear();

    const ayFarki = bugun.getMonth() - dogum.getMonth();

    if (ayFarki < 0 || (ayFarki === 0 && bugun.getDate() < dogum.getDate())) {
      yas--;
    }

    return yas;
  };

  const fotografVarMi = (profile: Profile | null): boolean => {
    return Boolean(profile?.profilePhoto && profile.profilePhoto.trim() !== "");
  };

  const fotografUrlOlustur = (photo?: string | null): string | null => {
    if (!photo) {
      return null;
    }

    const temizFoto = photo.trim();

    if (!temizFoto) {
      return null;
    }

    if (temizFoto.startsWith("http://") || temizFoto.startsWith("https://")) {
      return temizFoto;
    }

    if (temizFoto.startsWith("/")) {
      return `${SUNUCU_ADRESI}${temizFoto}`;
    }

    return `${SUNUCU_ADRESI}/${temizFoto}`;
  };

  const kullanicilariYukle = async () => {
    try {
      setLoading(true);

      setError("");

      const token = await AsyncStorage.getItem("token");

      const userIdString = await AsyncStorage.getItem("userId");

      if (!token) {
        navigation.replace("index");

        return;
      }

      const mevcutUserId = Number(userIdString);

      if (!mevcutUserId || Number.isNaN(mevcutUserId)) {
        await AsyncStorage.multiRemove(["token", "userId", "username", "role"]);

        navigation.replace("index");

        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,

        Accept: "application/json",
      };

      const [usersResponse, profilesResponse] = await Promise.all([
        fetch(`${API_ADRESI}/users/home`, {
          method: "GET",

          headers,
        }),

        fetch(`${API_ADRESI}/profiles`, {
          method: "GET",

          headers,
        }),
      ]);

      const usersText = await usersResponse.text();

      const profilesText = await profilesResponse.text();

      if (!usersResponse.ok) {
        throw new Error(
          usersText || `Kullanıcılar alınamadı. HTTP ${usersResponse.status}`,
        );
      }

      if (!profilesResponse.ok) {
        throw new Error(
          profilesText ||
            `Profiller alınamadı. HTTP ${profilesResponse.status}`,
        );
      }

      const yuklenenUsers: User[] = usersText.trim()
        ? JSON.parse(usersText)
        : [];

      const yuklenenProfiles: Profile[] = profilesText.trim()
        ? JSON.parse(profilesText)
        : [];

      const bulunanKullanici = yuklenenUsers.find(
        (user) => user.id === mevcutUserId,
      );

      setMevcutKullanici(bulunanKullanici ?? null);

      setCurrentUserCity((bulunanKullanici?.city ?? "").trim());

      const profileMap = new Map<number, Profile>();

      yuklenenProfiles.forEach((profile) => {
        profileMap.set(profile.userId, profile);
      });

      // DÜZELTİLDİ:

      // yuklenenProfiller -> yuklenenProfiles

      const kendiProfil = yuklenenProfiles.find(
        (profil) => profil.userId === mevcutUserId,
      );

      setMevcutProfil(kendiProfil ?? null);

      const kesfedilenKullanicilar: DiscoverUser[] = yuklenenUsers

        .filter((user) => user.id !== mevcutUserId)

        .map((user) => ({
          user,

          profile: profileMap.get(user.id) ?? null,
        }));

      setUsers(kesfedilenKullanicilar);
    } catch (hata) {
      console.error("KULLANICI KEŞİF HATASI:", hata);

      if (hata instanceof Error) {
        setError(hata.message);
      } else {
        setError("Kullanıcılar alınamadı.");
      }
    } finally {
      setLoading(false);

      setYenileme(false);
    }
  };

  const yenile = () => {
    setYenileme(true);

    void kullanicilariYukle();
  };

  const filtrelenmisKullanicilar = useMemo(() => {
    return users.filter(({ user, profile }) => {
      if (filtreler.onlyActive && !user.active) {
        return false;
      }

      const yas = yasHesapla(user.birthDate);

      if (
        filtreler.minAge &&
        (yas === null || yas < Number(filtreler.minAge))
      ) {
        return false;
      }

      if (
        filtreler.maxAge &&
        (yas === null || yas > Number(filtreler.maxAge))
      ) {
        return false;
      }

      const kullaniciSehri = (user.city ?? "")

        .trim()

        .toLocaleLowerCase("tr-TR");

      const arananSehir = filtreler.city.trim().toLocaleLowerCase("tr-TR");

      if (arananSehir && !kullaniciSehri.includes(arananSehir)) {
        return false;
      }

      if (filtreler.onlySameCity) {
        const benimSehir = currentUserCity.trim().toLocaleLowerCase("tr-TR");

        if (!benimSehir || !kullaniciSehri) {
          return false;
        }

        if (benimSehir !== kullaniciSehri) {
          return false;
        }
      }

      if (
        filtreler.maritalStatus.trim() &&
        !(profile?.maritalStatus ?? "")

          .toLocaleLowerCase("tr-TR")

          .includes(filtreler.maritalStatus.trim().toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }

      if (
        filtreler.profession.trim() &&
        !(profile?.profession ?? "")

          .toLocaleLowerCase("tr-TR")

          .includes(filtreler.profession.trim().toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }

      if (
        filtreler.education.trim() &&
        !(profile?.education ?? "")

          .toLocaleLowerCase("tr-TR")

          .includes(filtreler.education.trim().toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }

      if (filtreler.minHeight) {
        const minimumBoy = Number(filtreler.minHeight);

        if (profile?.height == null || profile.height < minimumBoy) {
          return false;
        }
      }

      if (filtreler.maxHeight) {
        const maksimumBoy = Number(filtreler.maxHeight);

        if (profile?.height == null || profile.height > maksimumBoy) {
          return false;
        }
      }

      if (
        filtreler.interest.trim() &&
        !(profile?.interests ?? "")

          .toLocaleLowerCase("tr-TR")

          .includes(filtreler.interest.trim().toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }

      const fotografVar = fotografVarMi(profile);

      if (filtreler.onlyWithPhoto && !fotografVar) {
        return false;
      }

      if (filtreler.onlyWithoutPhoto && fotografVar) {
        return false;
      }

      return true;
    });
  }, [users, filtreler, currentUserCity]);

  const siralanmisKullanicilar = useMemo(() => {
    const benimSehir = currentUserCity.trim().toLocaleLowerCase("tr-TR");

    return [...filtrelenmisKullanicilar].sort((a, b) => {
      const aSehir = (a.user.city ?? "").trim().toLocaleLowerCase("tr-TR");

      const bSehir = (b.user.city ?? "").trim().toLocaleLowerCase("tr-TR");

      const aAyniSehir =
        Boolean(benimSehir) && Boolean(aSehir) && aSehir === benimSehir;

      const bAyniSehir =
        Boolean(benimSehir) && Boolean(bSehir) && bSehir === benimSehir;

      if (aAyniSehir && !bAyniSehir) {
        return -1;
      }

      if (!aAyniSehir && bAyniSehir) {
        return 1;
      }

      if (a.user.online && !b.user.online) {
        return -1;
      }

      if (!a.user.online && b.user.online) {
        return 1;
      }

      if (a.user.active && !b.user.active) {
        return -1;
      }

      if (!a.user.active && b.user.active) {
        return 1;
      }

      const aFoto = fotografVarMi(a.profile);

      const bFoto = fotografVarMi(b.profile);

      if (aFoto && !bFoto) {
        return -1;
      }

      if (!aFoto && bFoto) {
        return 1;
      }

      return a.user.firstName.localeCompare(b.user.firstName, "tr-TR");
    });
  }, [filtrelenmisKullanicilar, currentUserCity]);

  const filtreleriTemizle = () => {
    setFiltreler(bosFiltreler);
  };

  const filtreAktifMi = useMemo(() => {
    return (
      filtreler.minAge !== "" ||
      filtreler.maxAge !== "" ||
      filtreler.city !== "" ||
      filtreler.maritalStatus !== "" ||
      filtreler.profession !== "" ||
      filtreler.education !== "" ||
      filtreler.minHeight !== "" ||
      filtreler.maxHeight !== "" ||
      filtreler.interest !== "" ||
      filtreler.onlyWithPhoto ||
      filtreler.onlyWithoutPhoto ||
      filtreler.onlySameCity ||
      filtreler.onlyActive
    );
  }, [filtreler]);

  const cikisYap = () => {
    Alert.alert(
      "Çıkış Yap",

      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",

      [
        {
          text: "Vazgeç",

          style: "cancel",
        },

        {
          text: "Çıkış Yap",

          style: "destructive",

          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                "token",

                "userId",

                "username",

                "role",
              ]);

              navigation.replace("index");
            } catch (hata) {
              console.error("ÇIKIŞ HATASI:", hata);
            }
          },
        },
      ],
    );
  };

  const bildirimleriAc = () => {
    Alert.alert(
      "Bildirimler",

      "Bildirim ekranını bir sonraki adımda mobil uygulamaya bağlıyoruz.",
    );
  };

  const begenenleriAc = () => {
    navigation.navigate("begenenler");
  };

  const profilimeBakanlariAc = () => {
    navigation.navigate("profilimeBakanlar");
  };

  const favorilerimeEkleyenleriAc = () => {
    navigation.navigate("favorilerimeEkleyenler");
  };

  const profilAc = (userId: number) => {
    navigation.navigate("user", { id: String(userId) });
  };

  const mesajlariAc = () => {
    navigation.navigate("messages");
  };

  const paylasimlariAc = () => {
    navigation.navigate("paylasimlar");
  };

  // Kendi profil sayfasına git

  const profilimiAc = () => {
    navigation.navigate("profile");
  };

  const filtreGuncelle = (alan: keyof Filtreler, deger: string | boolean) => {
    setFiltreler((onceki) => ({
      ...onceki,

      [alan]: deger,
    }));
  };

  const renderKullanici = ({ item }: { item: DiscoverUser }) => {
    const { user, profile } = item;

    const yas = yasHesapla(user.birthDate);

    const fotograf = fotografUrlOlustur(profile?.profilePhoto);

    const fotografVar = fotografVarMi(profile);

    return (
      <View style={styles.kullaniciKart}>
        <View style={styles.fotografAlani}>
          {fotograf ? (
            <Image
              source={{ uri: fotograf }}

              style={styles.fotograf}

              resizeMode="cover"
            />
          ) : (
            <View style={styles.varsayilanFotograf}>
              <Text style={styles.varsayilanFotografMetin}>👤</Text>
            </View>
          )}

          <View
            style={[
              styles.onlineEtiket,

              user.online ? styles.online : styles.offline,
            ]}
          >
            <View
              style={[
                styles.onlineNokta,

                user.online ? styles.onlineNokta : styles.offlineNokta,
              ]}
            />

            <Text
              style={[
                styles.onlineMetin,

                user.online ? styles.onlineMetinAktif : styles.onlineMetinPasif,
              ]}
            >
              {user.online ? "Çevrimiçi" : "Çevrimdışı"}
            </Text>
          </View>

          <View style={styles.fotografAltYazi}>
            <Text style={styles.fotografIsim} numberOfLines={1}>
              {user.firstName}

              {yas !== null ? `, ${yas}` : ""}
            </Text>

            {!!user.city && (
              <Text style={styles.fotografSehir} numberOfLines={1}>
                📍 {user.city}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.kullaniciBilgileri}>
          <Text style={styles.username}>@{user.username}</Text>

          <View style={styles.bilgiSatiri}>
            {yas !== null && <Text style={styles.bilgi}>🎂 {yas} yaşında</Text>}

            {user.city && (
              <Text style={styles.bilgi} numberOfLines={1}>
                📍 {user.city}
              </Text>
            )}
          </View>

          {profile?.profession && (
            <Text style={styles.detayBilgisi} numberOfLines={1}>
              💼 {profile.profession}
            </Text>
          )}

          {profile?.education && (
            <Text style={styles.detayBilgisi} numberOfLines={1}>
              🎓 {profile.education}
            </Text>
          )}

          {profile?.height && (
            <Text style={styles.detayBilgisi}>📏 {profile.height} cm</Text>
          )}

          <View style={styles.etiketler}>
            {user.active && (
              <View style={styles.aktifEtiket}>
                <Text style={styles.aktifEtiketMetin}>Aktif</Text>
              </View>
            )}

            {fotografVar && (
              <View style={styles.fotografEtiket}>
                <Text style={styles.fotografEtiketMetin}>📷 Fotoğraflı</Text>
              </View>
            )}

            {profile?.profileVerified && (
              <View style={styles.dogrulanmisEtiket}>
                <Text style={styles.dogrulanmisEtiketMetin}>✓ Doğrulanmış</Text>
              </View>
            )}
          </View>

          <View style={styles.hakkindaAlani}>
            {profile?.about ? (
              <Text style={styles.hakkinda} numberOfLines={3}>
                {profile.about}
              </Text>
            ) : (
              <Text style={styles.hakkindaBos}>
                Henüz hakkında bilgisi eklenmemiş.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.profilButonu}

            onPress={() => profilAc(user.id)}

            activeOpacity={0.8}
          >
            <Text style={styles.profilButonuMetin}>Profili Gör</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8F2942" />

        <Text style={styles.loadingBaslik}>Gönül Buluşması</Text>

        <Text style={styles.loadingMetin}>Kullanıcılar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={siralanmisKullanicilar}

        numColumns={2}

        columnWrapperStyle={styles.profilKartSatiri}

        keyExtractor={(item) => String(item.user.id)}

        renderItem={renderKullanici}

        showsVerticalScrollIndicator={false}

        refreshing={yenileme}

        onRefresh={yenile}

        contentContainerStyle={styles.liste}

        ListHeaderComponent={
          <View>
            <View style={styles.ustBar}>
              <View>
                <Text style={styles.ustBarBaslik}>Gönül Buluşması</Text>

                <Text style={styles.ustBarAltMetin}>
                  Hoş geldin, {username || "Kullanıcı"} 👋
                </Text>
              </View>

              <TouchableOpacity
                style={styles.bildirimButonu}

                onPress={bildirimleriAc}

                activeOpacity={0.8}
              >
                <Text style={styles.bildirimIkon}>🔔</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <View style={styles.heroIkon}>
                <Text style={styles.heroKalp}>❤️</Text>
              </View>

              <View style={styles.heroYaziAlani}>
                <Text style={styles.heroBaslik}>
                  Sana uygun kişileri keşfet
                </Text>

                <Text style={styles.heroMetin}>
                  Profil özelliklerine göre sana en uygun kişileri bul.
                </Text>
              </View>
            </View>

            <View style={styles.hizliErisimBaslikSatiri}>
              <Text style={styles.bolumBaslik}>Sana Özel</Text>
            </View>

            <View style={styles.hizliErisim}>
              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartPembe]}

                onPress={begenenleriAc}

                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>❤️</Text>

                <Text style={styles.hizliKartEtiket} numberOfLines={1}>
                  Beğeniler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartMor]}

                onPress={profilimeBakanlariAc}

                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>👁️</Text>

                <Text style={styles.hizliKartEtiket} numberOfLines={1}>
                  Ziyaretçiler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartTuruncu]}

                onPress={favorilerimeEkleyenleriAc}

                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>⭐</Text>

                <Text style={styles.hizliKartEtiket} numberOfLines={1}>
                  Favoriler
                </Text>
              </TouchableOpacity>

              {/* PROFİLİM */}

              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartProfil]}

                onPress={profilimiAc}

                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>👤</Text>

                <Text style={styles.hizliKartEtiket} numberOfLines={1}>
                  Profilim
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aksiyonSatiri}>
              <TouchableOpacity
                style={[styles.aksiyonButonu, styles.filtreButonu]}

                onPress={() => setFiltreModalAcik(true)}

                activeOpacity={0.85}
              >
                <Text style={styles.aksiyonIkon}>🔎</Text>

                <Text style={styles.filtreButonuMetin}>Filtrele</Text>

                {filtreAktifMi && (
                  <View style={styles.filtreRozeti}>
                    <Text style={styles.filtreRozetiMetin}>!</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aksiyonButonu, styles.mesajButonu]}

                onPress={mesajlariAc}

                activeOpacity={0.85}
              >
                <Text style={styles.aksiyonIkon}>💬</Text>

                <Text style={styles.mesajButonuMetin}>Mesajlar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.aksiyonButonu, styles.paylasimlarButonu]}

                onPress={paylasimlariAc}

                activeOpacity={0.85}
              >
                <Text style={styles.aksiyonIkon}>📝</Text>

                <Text style={styles.paylasimlarButonuMetin}>Paylaşımlar</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.hataKutusu}>
                <Text style={styles.hataBaslik}>Kullanıcılar yüklenemedi</Text>

                <Text style={styles.hataMetin}>{error}</Text>

                <TouchableOpacity
                  style={styles.tekrarDeneButonu}

                  onPress={yenile}
                >
                  <Text style={styles.tekrarDeneMetin}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.sonucBasligi}>
              <View>
                <Text style={styles.bolumBaslik}>Sana Uygun Kullanıcılar</Text>

                <Text style={styles.sonucAltMetin}>Sana uygun profiller</Text>
              </View>

              <View style={styles.kullaniciSayisi}>
                <Text style={styles.kullaniciSayisiMetin}>
                  {siralanmisKullanicilar.length}
                </Text>
              </View>
            </View>

            {siralanmisKullanicilar.length === 0 && (
              <View style={styles.bosSonuc}>
                <Text style={styles.bosSonucIkon}>🔎</Text>

                <Text style={styles.bosSonucBaslik}>
                  Uygun kullanıcı bulunamadı
                </Text>

                <Text style={styles.bosSonucMetin}>
                  Filtreleri değiştirerek tekrar deneyebilirsiniz.
                </Text>

                {filtreAktifMi && (
                  <TouchableOpacity
                    style={styles.temizleButonu}

                    onPress={filtreleriTemizle}
                  >
                    <Text style={styles.temizleButonuMetin}>
                      Filtreleri Temizle
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        }

        ListFooterComponent={
          <View style={styles.altAlan}>
            <TouchableOpacity
              style={styles.cikisButonu}

              onPress={cikisYap}

              activeOpacity={0.85}
            >
              <Text style={styles.cikisIkon}>🚪</Text>

              <Text style={styles.cikisMetin}>Çıkış Yap</Text>
            </TouchableOpacity>

            <Text style={styles.altYazi}>Gönül Buluşması</Text>
          </View>
        }
      />

      <Modal
        visible={filtreModalAcik}

        animationType="slide"

        transparent

        onRequestClose={() => setFiltreModalAcik(false)}
      >
        <View style={styles.modalArkaPlan}>
          <View style={styles.filtreModal}>
            <View style={styles.modalBaslikSatiri}>
              <View>
                <Text style={styles.modalBaslik}>Filtreler</Text>

                <Text style={styles.modalAltBaslik}>
                  Sana uygun profilleri bul
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalKapatButonu}

                onPress={() => setFiltreModalAcik(false)}
              >
                <Text style={styles.modalKapatMetin}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}

              contentContainerStyle={styles.filtreScroll}
            >
              <Text style={styles.filtreGrupBaslik}>Yaş</Text>

              <View style={styles.ikiInput}>
                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Minimum yaş"

                  placeholderTextColor="#A88F95"

                  keyboardType="number-pad"

                  value={filtreler.minAge}

                  onChangeText={(deger) => filtreGuncelle("minAge", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Maksimum yaş"

                  placeholderTextColor="#A88F95"

                  keyboardType="number-pad"

                  value={filtreler.maxAge}

                  onChangeText={(deger) => filtreGuncelle("maxAge", deger)}
                />
              </View>

              <Text style={styles.filtreGrupBaslik}>Boy</Text>

              <View style={styles.ikiInput}>
                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Minimum boy"

                  placeholderTextColor="#A88F95"

                  keyboardType="number-pad"

                  value={filtreler.minHeight}

                  onChangeText={(deger) => filtreGuncelle("minHeight", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Maksimum boy"

                  placeholderTextColor="#A88F95"

                  keyboardType="number-pad"

                  value={filtreler.maxHeight}

                  onChangeText={(deger) => filtreGuncelle("maxHeight", deger)}
                />
              </View>

              <Text style={styles.filtreGrupBaslik}>Konum</Text>

              <TextInput
                style={styles.input}

                placeholder="Şehir"

                placeholderTextColor="#A88F95"

                value={filtreler.city}

                onChangeText={(deger) => filtreGuncelle("city", deger)}
              />

              <Text style={styles.filtreGrupBaslik}>Profil Bilgileri</Text>

              <TextInput
                style={styles.input}

                placeholder="Medeni durum"

                placeholderTextColor="#A88F95"

                value={filtreler.maritalStatus}

                onChangeText={(deger) => filtreGuncelle("maritalStatus", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="Meslek"

                placeholderTextColor="#A88F95"

                value={filtreler.profession}

                onChangeText={(deger) => filtreGuncelle("profession", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="Eğitim"

                placeholderTextColor="#A88F95"

                value={filtreler.education}

                onChangeText={(deger) => filtreGuncelle("education", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="İlgi alanı"

                placeholderTextColor="#A88F95"

                value={filtreler.interest}

                onChangeText={(deger) => filtreGuncelle("interest", deger)}
              />

              <Text style={styles.filtreGrupBaslik}>Ek Filtreler</Text>

              <TouchableOpacity
                style={styles.checkboxSatiri}

                onPress={() =>
                  filtreGuncelle("onlyActive", !filtreler.onlyActive)
                }

                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,

                    filtreler.onlyActive && styles.checkboxSecili,
                  ]}
                >
                  {filtreler.onlyActive && (
                    <Text style={styles.checkboxTik}>✓</Text>
                  )}
                </View>

                <Text style={styles.checkboxMetin}>
                  Sadece aktif kullanıcılar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxSatiri}

                onPress={() =>
                  filtreGuncelle("onlySameCity", !filtreler.onlySameCity)
                }

                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,

                    filtreler.onlySameCity && styles.checkboxSecili,
                  ]}
                >
                  {filtreler.onlySameCity && (
                    <Text style={styles.checkboxTik}>✓</Text>
                  )}
                </View>

                <Text style={styles.checkboxMetin}>Sadece yakınımdakiler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxSatiri}

                onPress={() => {
                  setFiltreler((onceki) => ({
                    ...onceki,

                    onlyWithPhoto: !onceki.onlyWithPhoto,

                    onlyWithoutPhoto: false,
                  }));
                }}

                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,

                    filtreler.onlyWithPhoto && styles.checkboxSecili,
                  ]}
                >
                  {filtreler.onlyWithPhoto && (
                    <Text style={styles.checkboxTik}>✓</Text>
                  )}
                </View>

                <Text style={styles.checkboxMetin}>Sadece fotoğraflı</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxSatiri}

                onPress={() => {
                  setFiltreler((onceki) => ({
                    ...onceki,

                    onlyWithoutPhoto: !onceki.onlyWithoutPhoto,

                    onlyWithPhoto: false,
                  }));
                }}

                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,

                    filtreler.onlyWithoutPhoto && styles.checkboxSecili,
                  ]}
                >
                  {filtreler.onlyWithoutPhoto && (
                    <Text style={styles.checkboxTik}>✓</Text>
                  )}
                </View>

                <Text style={styles.checkboxMetin}>Sadece fotoğrafsız</Text>
              </TouchableOpacity>

              <View style={styles.filtreButonlari}>
                <TouchableOpacity
                  style={styles.filtreTemizleButonu}

                  onPress={filtreleriTemizle}
                >
                  <Text style={styles.filtreTemizleMetin}>Temizle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filtreUygulaButonu}

                  onPress={() => setFiltreModalAcik(false)}
                >
                  <Text style={styles.filtreUygulaMetin}>Uygula</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#FFF6F8",
  },

  liste: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  profilKartSatiri: {
    justifyContent: "space-between",

    gap: 12,
  },

  loadingContainer: {
    flex: 1,

    backgroundColor: "#FFF6F8",

    alignItems: "center",

    justifyContent: "center",

    padding: 24,
  },

  loadingBaslik: {
    marginTop: 18,

    fontSize: 25,

    fontWeight: "800",

    color: "#76203D",
  },

  loadingMetin: {
    marginTop: 8,

    fontSize: 15,

    color: "#80666D",
  },

  ustBar: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 16,
  },

  ustBarBaslik: {
    fontSize: 25,

    fontWeight: "900",

    color: "#86143F",

    letterSpacing: -0.6,
  },

  ustBarAltMetin: {
    marginTop: 4,

    fontSize: 14,

    color: "#9C526B",

    fontWeight: "600",
  },

  bildirimButonu: {
    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: "#E9C5D2",

    elevation: 2,

    shadowColor: "#7A263C",

    shadowOpacity: 0.08,

    shadowRadius: 6,

    shadowOffset: {
      width: 0,

      height: 3,
    },
  },

  bildirimIkon: {
    fontSize: 23,
  },

  hero: {
    backgroundColor: "#B71950",

    borderRadius: 24,

    padding: 18,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 20,

    elevation: 4,

    shadowColor: "#7A263C",

    shadowOpacity: 0.2,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,

      height: 5,
    },
  },

  heroIkon: {
    width: 66,

    height: 66,

    borderRadius: 22,

    backgroundColor: "rgba(255,255,255,0.18)",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 14,
  },

  heroKalp: {
    fontSize: 40,
  },

  heroYaziAlani: {
    flex: 1,
  },

  heroBaslik: {
    color: "#FFFCFA",

    fontSize: 20,

    fontWeight: "900",

    marginBottom: 5,
  },

  heroMetin: {
    color: "rgba(255,255,255,0.88)",

    fontSize: 14,

    lineHeight: 20,
  },

  hizliErisimBaslikSatiri: {
    marginBottom: 10,
  },

  bolumBaslik: {
    fontSize: 21,

    fontWeight: "900",

    color: "#721334",

    letterSpacing: -0.4,
  },

  hizliErisim: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    gap: 7,
    marginBottom: 20,
  },

  hizliKart: {
    flex: 1,
    minWidth: 0,
    minHeight: 98,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#9F1748",
    shadowOpacity: 0.09,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  hizliKartPembe: {
    backgroundColor: "#FFF0F5",

    borderColor: "#F6D0DD",
  },

  hizliKartMor: {
    backgroundColor: "#F0ECFF",

    borderColor: "#DED5FF",
  },

  hizliKartTuruncu: {
    backgroundColor: "#FFF4E7",

    borderColor: "#F5DEC5",
  },

  hizliKartProfil: {
    backgroundColor: "#F8E9ED",

    borderColor: "#E9C9D2",
  },

  hizliIkon: {
    fontSize: 29,
    marginBottom: 8,
  },

  hizliKartEtiket: {
    color: "#71203D",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0,
  },

  hizliKartBaslik: {
    color: "#9d174d",

    fontSize: 11,

    fontWeight: "800",
  },

  hizliKartBaslikMor: {
    color: "#76203D",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartBaslikPembe: {
    color: "#A94C45",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartBaslikProfil: {
    color: "#8F2942",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartMetin: {
    marginTop: 2,

    color: "#80666D",

    fontSize: 10,

    lineHeight: 14,
  },

  aksiyonSatiri: {
    flexDirection: "row",

    gap: 10,

    marginBottom: 22,
  },

  aksiyonButonu: {
    flex: 1,

    minHeight: 52,

    borderRadius: 18,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",
  },

  filtreButonu: {
    backgroundColor: "#A7194B",
  },

  mesajButonu: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DDB4C0",
  },

  aksiyonIkon: {
    fontSize: 18,

    marginRight: 7,
  },

  filtreButonuMetin: {
    color: "#FFFCFA",

    fontWeight: "800",

    fontSize: 14,
  },

  mesajButonuMetin: {
    color: "#A02A50",

    fontWeight: "800",

    fontSize: 15,
  },

  paylasimlarButonu: {
    backgroundColor: "#D62969",
  },

  paylasimlarButonuMetin: {
    color: "#FFFCFA",

    fontWeight: "800",

    fontSize: 14,
  },

  filtreRozeti: {
    position: "absolute",

    top: -5,

    right: -5,

    width: 22,

    height: 22,

    borderRadius: 11,

    backgroundColor: "#D62969",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreRozetiMetin: {
    color: "#FFFCFA",

    fontWeight: "900",
  },

  hataKutusu: {
    backgroundColor: "#FCEAF0",

    borderWidth: 1,

    borderColor: "#EFC1CC",

    borderRadius: 18,

    padding: 16,

    marginBottom: 20,
  },

  hataBaslik: {
    color: "#9B2947",

    fontSize: 16,

    fontWeight: "800",

    marginBottom: 5,
  },

  hataMetin: {
    color: "#57172E",

    fontSize: 14,

    lineHeight: 20,
  },

  tekrarDeneButonu: {
    marginTop: 12,

    alignSelf: "flex-start",

    backgroundColor: "#B72F4B",

    paddingHorizontal: 16,

    paddingVertical: 9,

    borderRadius: 10,
  },

  tekrarDeneMetin: {
    color: "#FFFCFA",

    fontWeight: "800",
  },

  sonucBasligi: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 14,
  },

  sonucAltMetin: {
    marginTop: 3,

    color: "#80666D",

    fontSize: 13,
  },

  kullaniciSayisi: {
    minWidth: 42,

    height: 36,

    paddingHorizontal: 10,

    borderRadius: 18,

    backgroundColor: "#F8E5EC",

    alignItems: "center",

    justifyContent: "center",
  },

  kullaniciSayisiMetin: {
    color: "#76203D",

    fontSize: 14,

    fontWeight: "900",
  },

  kullaniciKart: {
    width: "48%",
    height: 500,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F7DCE5",
    elevation: 4,
    shadowColor: "#8F1747",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  fotografAlani: {
    height: 205,
    backgroundColor: "#F8E5EC",
    position: "relative",
  },

  fotograf: {
    width: "100%",

    height: "100%",
  },

  varsayilanFotograf: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#F8E5EC",
  },

  varsayilanFotografMetin: {
    fontSize: 72,
  },

  fotografAltYazi: {
    display: "none",
  },

  fotografIsim: {
    color: "#FFFFFF",

    fontSize: 17,

    fontWeight: "900",

    letterSpacing: -0.2,
  },

  fotografSehir: {
    color: "rgba(255,255,255,0.95)",

    fontSize: 12,

    fontWeight: "700",

    marginTop: 4,
  },

  onlineEtiket: {
    position: "absolute",

    top: 12,

    right: 12,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 11,

    paddingVertical: 7,

    borderRadius: 20,
  },

  online: {
    backgroundColor: "rgba(220,252,231,0.96)",

    borderWidth: 1,

    borderColor: "rgba(34,197,94,0.25)",
  },

  offline: {
    backgroundColor: "rgba(243,244,246,0.96)",

    borderWidth: 1,

    borderColor: "rgba(107,114,128,0.18)",
  },

  onlineNokta: {
    width: 9,

    height: 9,

    borderRadius: 5,

    marginRight: 6,

    backgroundColor: "#35B779",
  },

  offlineNokta: {
    backgroundColor: "#A88F95",
  },

  onlineMetin: {
    fontSize: 12,

    fontWeight: "900",
  },

  onlineMetinAktif: {
    color: "#277A54",
  },

  onlineMetinPasif: {
    color: "#80666D",
  },

  kullaniciBilgileri: {
    padding: 13,
    flex: 1,
  },

  kullaniciAdi: {
    color: "#48252F",

    fontSize: 16,

    fontWeight: "900",
  },

  username: {
    color: "#896A72",

    fontSize: 11,

    marginTop: 2,

    marginBottom: 6,
  },

  bilgiSatiri: {
    gap: 3,

    marginBottom: 5,
  },

  bilgi: {
    color: "#694650",

    fontSize: 12,
  },

  detayBilgisi: {
    color: "#896A72",

    fontSize: 12,

    marginTop: 4,
  },

  etiketler: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 7,

    marginTop: 12,
  },

  aktifEtiket: {
    backgroundColor: "#E5F5EC",

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,
  },

  aktifEtiketMetin: {
    color: "#277A54",

    fontSize: 11,

    fontWeight: "800",
  },

  fotografEtiket: {
    backgroundColor: "#F8E5EC",

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,
  },

  fotografEtiketMetin: {
    color: "#A02A50",

    fontSize: 11,

    fontWeight: "800",
  },

  dogrulanmisEtiket: {
    backgroundColor: "#F6E6EB",

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,
  },

  dogrulanmisEtiketMetin: {
    color: "#8F2942",

    fontSize: 11,

    fontWeight: "800",
  },

  hakkindaAlani: {
    minHeight: 32,

    marginTop: 6,

    marginBottom: 8,
  },

  hakkinda: {
    color: "#896A72",

    fontSize: 11,

    lineHeight: 15,
  },

  hakkindaBos: {
    color: "#A88F95",

    fontSize: 10,

    fontStyle: "italic",

    lineHeight: 14,
  },

  profilButonu: {
    minHeight: 46,
    marginTop: "auto",
    borderRadius: 14,
    backgroundColor: "#D62969",
    alignItems: "center",
    justifyContent: "center",
  },

  profilButonuMetin: {
    color: "#FFFCFA",

    fontSize: 12,

    fontWeight: "800",
  },

  bosSonuc: {
    backgroundColor: "#FFF6F8",

    borderWidth: 1,

    borderColor: "#E9C5D2",

    borderRadius: 20,

    padding: 25,

    alignItems: "center",

    marginBottom: 18,
  },

  bosSonucIkon: {
    fontSize: 38,

    marginBottom: 10,
  },

  bosSonucBaslik: {
    color: "#76203D",

    fontSize: 17,

    fontWeight: "800",

    textAlign: "center",
  },

  bosSonucMetin: {
    marginTop: 7,

    color: "#80666D",

    fontSize: 13,

    textAlign: "center",

    lineHeight: 19,
  },

  temizleButonu: {
    marginTop: 15,

    backgroundColor: "#A7194B",

    paddingHorizontal: 18,

    paddingVertical: 10,

    borderRadius: 12,
  },

  temizleButonuMetin: {
    color: "#FFFCFA",

    fontWeight: "800",

    fontSize: 13,
  },

  altAlan: {
    paddingTop: 12,

    paddingBottom: 25,

    alignItems: "center",
  },

  cikisButonu: {
    width: "100%",

    minHeight: 52,

    borderRadius: 18,

    borderWidth: 1,

    borderColor: "#C83B58",

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",
  },

  cikisIkon: {
    fontSize: 18,

    marginRight: 7,
  },

  cikisMetin: {
    color: "#B72F4B",

    fontSize: 16,

    fontWeight: "900",
  },

  altYazi: {
    marginTop: 14,

    color: "#A88F95",

    fontSize: 12,
  },

  modalArkaPlan: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.45)",

    justifyContent: "flex-end",
  },

  filtreModal: {
    backgroundColor: "#FFFFFF",

    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    maxHeight: "92%",

    paddingTop: 20,
  },

  modalBaslikSatiri: {
    paddingHorizontal: 20,

    paddingBottom: 15,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    borderBottomWidth: 1,

    borderBottomColor: "#EAD9DD",
  },

  modalBaslik: {
    color: "#57172E",

    fontSize: 23,

    fontWeight: "800",
  },

  modalAltBaslik: {
    color: "#80666D",

    marginTop: 3,

    fontSize: 13,
  },

  modalKapatButonu: {
    width: 40,

    height: 40,

    borderRadius: 14,

    backgroundColor: "#F8E9ED",

    alignItems: "center",

    justifyContent: "center",
  },

  modalKapatMetin: {
    color: "#A02A50",

    fontSize: 20,

    fontWeight: "900",
  },

  filtreScroll: {
    padding: 20,

    paddingBottom: 35,
  },

  filtreGrupBaslik: {
    color: "#76203D",

    fontSize: 14,

    fontWeight: "800",

    marginTop: 14,

    marginBottom: 8,
  },

  ikiInput: {
    flexDirection: "row",

    gap: 10,
  },

  ikiInputEleman: {
    flex: 1,
  },

  input: {
    minHeight: 50,

    backgroundColor: "#FFF9F6",

    borderWidth: 1,

    borderColor: "#E9C5D2",

    borderRadius: 14,

    paddingHorizontal: 16,

    color: "#48252F",

    fontSize: 14,

    marginBottom: 10,
  },

  checkboxSatiri: {
    minHeight: 50,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 3,
  },

  checkbox: {
    width: 24,

    height: 24,

    borderRadius: 7,

    borderWidth: 2,

    borderColor: "#DDB4C0",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 10,
  },

  checkboxSecili: {
    backgroundColor: "#A7194B",

    borderColor: "#8F2942",
  },

  checkboxTik: {
    color: "#FFFCFA",

    fontWeight: "900",

    fontSize: 15,
  },

  checkboxMetin: {
    color: "#694650",

    fontSize: 14,

    fontWeight: "600",
  },

  filtreButonlari: {
    flexDirection: "row",

    gap: 10,

    marginTop: 20,
  },

  filtreTemizleButonu: {
    flex: 1,

    minHeight: 50,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#DDB4C0",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreTemizleMetin: {
    color: "#A02A50",

    fontSize: 14,

    fontWeight: "800",
  },

  filtreUygulaButonu: {
    flex: 1,

    minHeight: 50,

    borderRadius: 14,

    backgroundColor: "#A7194B",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreUygulaMetin: {
    color: "#FFFCFA",

    fontSize: 14,

    fontWeight: "800",
  },
});
