import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
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

import { useRouter } from "expo-router";

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
  const router = useRouter();

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

  const fotoğrafVarMi = (profile: Profile | null): boolean => {
    return Boolean(profile?.profilePhoto && profile.profilePhoto.trim() !== "");
  };

  const fotoğrafUrlOlustur = (photo?: string | null): string | null => {
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
        router.replace("/");
        return;
      }

      const mevcutUserId = Number(userIdString);

      if (!mevcutUserId || Number.isNaN(mevcutUserId)) {
        await AsyncStorage.multiRemove(["token", "userId", "username", "role"]);

        router.replace("/");
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

      const fotografVar = fotoğrafVarMi(profile);

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

      const aFoto = fotoğrafVarMi(a.profile);
      const bFoto = fotoğrafVarMi(b.profile);

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

              router.replace("/");
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
    router.push("/begenenler");
  };

  const profilimeBakanlariAc = () => {
    router.push("/profilime-bakanlar");
  };

  const favorilerimeEkleyenleriAc = () => {
    router.push("/favorilerime-ekleyenler");
  };
  const profilAc = (userId: number) => {
    router.push(`/user/${userId}`);
  };

  const mesajlariAc = () => {
    router.push("/messages");
  };

  // Kendi profil sayfasına git
  const profilimiAc = () => {
    router.push("/profile");
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

    const fotoğraf = fotoğrafUrlOlustur(profile?.profilePhoto);

    const fotografVar = fotoğrafVarMi(profile);

    return (
      <View style={styles.kullaniciKart}>
        <View style={styles.fotoğrafAlani}>
          {fotoğraf ? (
            <Image
              source={{ uri: fotoğraf }}
              style={styles.fotoğraf}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.varsayilanFotoğraf}>
              <Text style={styles.varsayilanFotoğrafMetin}>👤</Text>
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
        </View>

        <View style={styles.kullaniciBilgileri}>
          <Text style={styles.kullaniciAdi} numberOfLines={1}>
            {user.firstName} {user.lastName}
          </Text>

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
              <View style={styles.fotoğrafEtiket}>
                <Text style={styles.fotoğrafEtiketMetin}>📷 Fotoğraflı</Text>
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
        <ActivityIndicator size="large" color="#7c3aed" />

        <Text style={styles.loadingBaslik}>Gönül Buluşması</Text>

        <Text style={styles.loadingMetin}>Kullanıcılar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={siralanmisKullanicilar}
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
                  Profil özelliklerine göre kullanıcıları inceleyebilirsin.
                </Text>
              </View>
            </View>

            <View style={styles.hizliErisimBaslikSatiri}>
              <Text style={styles.bolumBaslik}>Hızlı Erişim</Text>
            </View>

            <View style={styles.hizliErisim}>
              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartPembe]}
                onPress={begenenleriAc}
                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>❤️</Text>

                <Text style={styles.hizliKartBaslik}>Seni Beğenenler</Text>

                <Text style={styles.hizliKartMetin}>
                  Seni beğenen kişileri gör
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartMor]}
                onPress={profilimeBakanlariAc}
                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>👁️</Text>

                <Text style={styles.hizliKartBaslikMor}>
                  Profilime Bakanlar
                </Text>

                <Text style={styles.hizliKartMetin}>
                  Profilini görüntüleyenleri gör
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartTuruncu]}
                onPress={favorilerimeEkleyenleriAc}
                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>⭐</Text>

                <Text style={styles.hizliKartBaslikPembe}>
                  Favorilerime Ekleyenler
                </Text>

                <Text style={styles.hizliKartMetin}>
                  Seni favorilerine ekleyenleri gör
                </Text>
              </TouchableOpacity>

              {/* PROFİLİM */}
              <TouchableOpacity
                style={[styles.hizliKart, styles.hizliKartProfil]}
                onPress={profilimiAc}
                activeOpacity={0.85}
              >
                <Text style={styles.hizliIkon}>👤</Text>

                <Text style={styles.hizliKartBaslikProfil}>Profilim</Text>

                <Text style={styles.hizliKartMetin}>
                  Kendi profil bilgilerini görüntüle
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
                <Text style={styles.bolumBaslik}>Kullanıcılar</Text>

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
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={filtreler.minAge}
                  onChangeText={(deger) => filtreGuncelle("minAge", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}
                  placeholder="Maksimum yaş"
                  placeholderTextColor="#9ca3af"
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
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={filtreler.minHeight}
                  onChangeText={(deger) => filtreGuncelle("minHeight", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}
                  placeholder="Maksimum boy"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={filtreler.maxHeight}
                  onChangeText={(deger) => filtreGuncelle("maxHeight", deger)}
                />
              </View>

              <Text style={styles.filtreGrupBaslik}>Konum</Text>

              <TextInput
                style={styles.input}
                placeholder="Şehir"
                placeholderTextColor="#9ca3af"
                value={filtreler.city}
                onChangeText={(deger) => filtreGuncelle("city", deger)}
              />

              <Text style={styles.filtreGrupBaslik}>Profil Bilgileri</Text>

              <TextInput
                style={styles.input}
                placeholder="Medeni durum"
                placeholderTextColor="#9ca3af"
                value={filtreler.maritalStatus}
                onChangeText={(deger) => filtreGuncelle("maritalStatus", deger)}
              />

              <TextInput
                style={styles.input}
                placeholder="Meslek"
                placeholderTextColor="#9ca3af"
                value={filtreler.profession}
                onChangeText={(deger) => filtreGuncelle("profession", deger)}
              />

              <TextInput
                style={styles.input}
                placeholder="Eğitim"
                placeholderTextColor="#9ca3af"
                value={filtreler.education}
                onChangeText={(deger) => filtreGuncelle("education", deger)}
              />

              <TextInput
                style={styles.input}
                placeholder="İlgi alanı"
                placeholderTextColor="#9ca3af"
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
    backgroundColor: "#faf7ff",
  },

  liste: {
    padding: 16,
    paddingBottom: 30,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#faf7ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingBaslik: {
    marginTop: 18,
    fontSize: 25,
    fontWeight: "800",
    color: "#5b21b6",
  },

  loadingMetin: {
    marginTop: 8,
    fontSize: 15,
    color: "#6b7280",
  },

  ustBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  ustBarBaslik: {
    fontSize: 25,
    fontWeight: "800",
    color: "#4c1d95",
  },

  ustBarAltMetin: {
    marginTop: 4,
    fontSize: 15,
    color: "#6d28d9",
    fontWeight: "600",
  },

  bildirimButonu: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    elevation: 2,
    shadowColor: "#5b21b6",
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
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#5b21b6",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  heroIkon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  heroKalp: {
    fontSize: 29,
  },

  heroYaziAlani: {
    flex: 1,
  },

  heroBaslik: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 5,
  },

  heroMetin: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 19,
  },

  hizliErisimBaslikSatiri: {
    marginBottom: 10,
  },

  bolumBaslik: {
    fontSize: 21,
    fontWeight: "800",
    color: "#4c1d95",
  },

  hizliErisim: {
    gap: 12,
    marginBottom: 18,
  },

  hizliKart: {
    minHeight: 100,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },

  hizliKartPembe: {
    backgroundColor: "#fff1f2",
    borderColor: "#fbcfe8",
  },

  hizliKartMor: {
    backgroundColor: "#f5f3ff",
    borderColor: "#ddd6fe",
  },

  hizliKartTuruncu: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },

  hizliKartProfil: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },

  hizliIkon: {
    fontSize: 25,
    marginBottom: 7,
  },

  hizliKartBaslik: {
    color: "#9d174d",
    fontSize: 16,
    fontWeight: "800",
  },

  hizliKartBaslikMor: {
    color: "#5b21b6",
    fontSize: 16,
    fontWeight: "800",
  },

  hizliKartBaslikPembe: {
    color: "#c2410c",
    fontSize: 16,
    fontWeight: "800",
  },

  hizliKartBaslikProfil: {
    color: "#1d4ed8",
    fontSize: 16,
    fontWeight: "800",
  },

  hizliKartMetin: {
    marginTop: 3,
    color: "#6b7280",
    fontSize: 13,
  },

  aksiyonSatiri: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },

  aksiyonButonu: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  filtreButonu: {
    backgroundColor: "#7c3aed",
  },

  mesajButonu: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },

  aksiyonIkon: {
    fontSize: 18,
    marginRight: 7,
  },

  filtreButonuMetin: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },

  mesajButonuMetin: {
    color: "#6d28d9",
    fontWeight: "800",
    fontSize: 15,
  },

  filtreRozeti: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
  },

  filtreRozetiMetin: {
    color: "#ffffff",
    fontWeight: "900",
  },

  hataKutusu: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },

  hataBaslik: {
    color: "#b91c1c",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },

  hataMetin: {
    color: "#7f1d1d",
    fontSize: 13,
    lineHeight: 19,
  },

  tekrarDeneButonu: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },

  tekrarDeneMetin: {
    color: "#ffffff",
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
    color: "#6b7280",
    fontSize: 13,
  },

  kullaniciSayisi: {
    minWidth: 42,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },

  kullaniciSayisiMetin: {
    color: "#5b21b6",
    fontSize: 15,
    fontWeight: "800",
  },

  kullaniciKart: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9e3f8",
    elevation: 3,
    shadowColor: "#5b21b6",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  fotoğrafAlani: {
    height: 235,
    backgroundColor: "#ede9fe",
    position: "relative",
  },

  fotoğraf: {
    width: "100%",
    height: "100%",
  },

  varsayilanFotoğraf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
  },

  varsayilanFotoğrafMetin: {
    fontSize: 72,
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
    backgroundColor: "#22c55e",
  },

  offlineNokta: {
    backgroundColor: "#9ca3af",
  },

  onlineMetin: {
    fontSize: 12,
    fontWeight: "800",
  },

  onlineMetinAktif: {
    color: "#15803d",
  },

  onlineMetinPasif: {
    color: "#6b7280",
  },

  kullaniciBilgileri: {
    padding: 17,
  },

  kullaniciAdi: {
    color: "#4c1d95",
    fontSize: 19,
    fontWeight: "800",
  },

  username: {
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
    marginBottom: 10,
  },

  bilgiSatiri: {
    gap: 5,
    marginBottom: 7,
  },

  bilgi: {
    color: "#4b5563",
    fontSize: 13,
  },

  detayBilgisi: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },

  etiketler: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },

  aktifEtiket: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  aktifEtiketMetin: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "800",
  },

  fotoğrafEtiket: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  fotoğrafEtiketMetin: {
    color: "#6d28d9",
    fontSize: 11,
    fontWeight: "800",
  },

  dogrulanmisEtiket: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  dogrulanmisEtiketMetin: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
  },

  hakkindaAlani: {
    minHeight: 62,
    marginTop: 12,
    marginBottom: 14,
  },

  hakkinda: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
  },

  hakkindaBos: {
    color: "#9ca3af",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
  },

  profilButonu: {
    minHeight: 47,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },

  profilButonuMetin: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  bosSonuc: {
    backgroundColor: "#faf7ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
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
    color: "#5b21b6",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  bosSonucMetin: {
    marginTop: 7,
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },

  temizleButonu: {
    marginTop: 15,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },

  temizleButonuMetin: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },

  altAlan: {
    paddingTop: 10,
    paddingBottom: 25,
    alignItems: "center",
  },

  cikisButonu: {
    width: "100%",
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  cikisIkon: {
    fontSize: 18,
    marginRight: 7,
  },

  cikisMetin: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "800",
  },

  altYazi: {
    marginTop: 14,
    color: "#9ca3af",
    fontSize: 12,
  },

  modalArkaPlan: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  filtreModal: {
    backgroundColor: "#ffffff",
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
    borderBottomColor: "#eee8fa",
  },

  modalBaslik: {
    color: "#4c1d95",
    fontSize: 23,
    fontWeight: "800",
  },

  modalAltBaslik: {
    color: "#6b7280",
    marginTop: 3,
    fontSize: 13,
  },

  modalKapatButonu: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },

  modalKapatMetin: {
    color: "#6d28d9",
    fontSize: 19,
    fontWeight: "800",
  },

  filtreScroll: {
    padding: 20,
    paddingBottom: 35,
  },

  filtreGrupBaslik: {
    color: "#5b21b6",
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
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#111827",
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
    borderColor: "#c4b5fd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkboxSecili: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },

  checkboxTik: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },

  checkboxMetin: {
    color: "#374151",
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
    borderColor: "#c4b5fd",
    alignItems: "center",
    justifyContent: "center",
  },

  filtreTemizleMetin: {
    color: "#6d28d9",
    fontSize: 14,
    fontWeight: "800",
  },

  filtreUygulaButonu: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },

  filtreUygulaMetin: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
