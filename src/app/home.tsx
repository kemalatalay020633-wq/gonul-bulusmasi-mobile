import { useEffect, useMemo, useRef, useState } from "react";

import { Client } from "@stomp/stompjs";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WEBSOCKET_URL } from "../config/api";
// src/app/home.tsx

import KimlikDogrulamaliAvatar from "../components/common/KimlikDogrulamaliAvatar";
import { API_BASE_URL } from "../config/api";

import { useNavigation } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_ADRESI = API_BASE_URL + "/api";

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

const medeniDurumGoster = (
  deger: string | number | null | undefined,
): string => {
  if (deger === null || deger === undefined || String(deger).trim() === "") {
    return "";
  }

  const metin = String(deger).trim();

  const sayisalKarsiliklar: Record<string, string> = {
    "0": "Bekar",
    "1": "Evli",
    "2": "Boşanmış",
    "3": "Dul",
  };

  if (Object.prototype.hasOwnProperty.call(sayisalKarsiliklar, metin)) {
    return sayisalKarsiliklar[metin];
  }

  const normal = metin.toLocaleUpperCase("tr-TR");

  const metinselKarsiliklar: Record<string, string> = {
    BEKAR: "Bekar",
    EVLI: "Evli",
    EVLİ: "Evli",
    BOSANMIS: "Boşanmış",
    BOŞANMIŞ: "Boşanmış",
    DUL: "Dul",
  };

  if (Object.prototype.hasOwnProperty.call(metinselKarsiliklar, normal)) {
    return metinselKarsiliklar[normal];
  }

  // Tanınmayan sayısal enum değerini kullanıcıya ham rakam olarak gösterme.
  if (/^\\d+$/.test(metin)) {
    return "";
  }

  return metin;
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
  const [aktifSekme, setAktifSekme] = useState("Önerilen");

  // Okunmamış bildirim sayısı: zil ikonundaki rozet için kullanılır.
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const bildirimIdleriRef = useRef<Set<number>>(new Set());

  const bildirimSayisiniYukle = async (token: string, kullaniciId: string) => {
    try {
      const cevap = await fetch(
        `${API_ADRESI}/bildirimler/${kullaniciId}/sayisi`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!cevap.ok) {
        throw new Error(`Bildirim sayısı alınamadı: HTTP ${cevap.status}`);
      }

      const veri = await cevap.json();
      const sayi = Number(veri);

      if (Number.isFinite(sayi)) {
        setBildirimSayisi(Math.max(0, sayi));
      }
    } catch (hata) {
      console.error("MOBİL BİLDİRİM SAYISI ALINAMADI:", hata);
    }
  };

  useEffect(() => {
    void kullaniciBilgileriniYukle();

    void kullanicilariYukle();
  }, []);

  useEffect(() => {
    let client: Client | null = null;
    let iptalEdildi = false;
    let bildirimKontrolZamanlayici: ReturnType<typeof setInterval> | null =
      null;

    const cevrimIciBaglantisiKur = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const kullaniciId = await AsyncStorage.getItem("userId");

        if (iptalEdildi || !token || !kullaniciId) {
          console.log("ONLINE: token veya kullanıcı kimliği bulunamadı.");
          return;
        }

        // Uygulama açıldığında mevcut okunmamış bildirim sayısını getir.
        void bildirimSayisiniYukle(token, kullaniciId);

        // WebSocket bildirimi kaçırılırsa sayacı sunucudan tekrar eşitle.
        bildirimKontrolZamanlayici = setInterval(() => {
          void bildirimSayisiniYukle(token, kullaniciId);
        }, 10000);

        client = new Client({
          webSocketFactory: () => new WebSocket(WEBSOCKET_URL, ["v12.stomp"]),

          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },

          reconnectDelay: 3000,
          heartbeatIncoming: 0,
          heartbeatOutgoing: 0,
          forceBinaryWSFrames: true,
          appendMissingNULLonIncoming: true,

          onConnect: () => {
            console.log("ONLINE WebSocket bağlantısı kuruldu.");

            client?.subscribe("/topic/online", (mesaj) => {
              try {
                const durum = JSON.parse(mesaj.body);

                if (
                  typeof durum?.userId !== "number" ||
                  typeof durum?.online !== "boolean"
                ) {
                  console.log("ONLINE: beklenmeyen mesaj biçimi.", durum);
                  return;
                }

                setUsers((onceki) =>
                  onceki.map((kayit) =>
                    kayit.user.id === durum.userId
                      ? {
                          ...kayit,
                          user: {
                            ...kayit.user,
                            online: durum.online,
                          },
                        }
                      : kayit,
                  ),
                );

                setMevcutKullanici((onceki) => {
                  if (!onceki) return null;

                  if (onceki.id !== durum.userId) return onceki;

                  return {
                    ...onceki,
                    online: durum.online,
                  };
                });

                console.log("ONLINE durumu güncellendi:", durum);
              } catch (hata) {
                console.error("ONLINE mesajı okunamadı:", hata);
              }
            });

            // Web sürümüyle aynı kişisel bildirim kanalını dinle.
            client?.subscribe(`/topic/bildirim/${kullaniciId}`, (mesaj) => {
              try {
                const veri = JSON.parse(mesaj.body);

                console.log("MOBİL YENİ BİLDİRİM:", veri);

                // Backend bazı durumlarda yalnızca güncel sayıyı gönderebilir.
                if (typeof veri === "number") {
                  setBildirimSayisi(Math.max(0, veri));
                  return;
                }

                // Normal bildirim nesnesi geldiyse okunmamış sayısını artır.
                if (veri && typeof veri === "object") {
                  if (veri.okundu === true || veri.read === true) {
                    return;
                  }

                  const bildirimId = Number(veri.id);

                  // Aynı bildirim yeniden gönderilirse rozeti iki kez artırma.
                  if (Number.isFinite(bildirimId) && bildirimId > 0) {
                    if (bildirimIdleriRef.current.has(bildirimId)) {
                      return;
                    }

                    bildirimIdleriRef.current.add(bildirimId);
                  }

                  setBildirimSayisi((onceki) => onceki + 1);
                }
              } catch (hata) {
                console.error("MOBİL BİLDİRİM MESAJI OKUNAMADI:", hata);
              }
            });

            console.log(
              "MOBİL BİLDİRİM ABONELİĞİ:",
              `/topic/bildirim/${kullaniciId}`,
            );
          },

          onStompError: (frame) => {
            console.error("ONLINE STOMP hatası:", frame.headers["message"]);
          },

          onWebSocketError: (hata) => {
            console.error("ONLINE WebSocket hatası:", hata);
          },
        });

        client.activate();
      } catch (hata) {
        console.error("ONLINE bağlantısı kurulamadı:", hata);
      }
    };

    void cevrimIciBaglantisiKur();

    return () => {
      iptalEdildi = true;

      if (bildirimKontrolZamanlayici) {
        clearInterval(bildirimKontrolZamanlayici);
      }

      if (client) {
        void client.deactivate();
      }
    };
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

  const sekmeyeGoreKullanicilar = useMemo(() => {
    let sonuc = [...siralanmisKullanicilar];

    if (aktifSekme === "Çevrimiçi") {
      sonuc = sonuc.filter(({ user }) => user.online);
    } else if (aktifSekme === "Yeni Üye") {
      sonuc = sonuc.filter(({ user }) => {
        if (!user.createdAt) return false;
        const kayitTarihi = new Date(user.createdAt).getTime();
        return (
          Number.isFinite(kayitTarihi) &&
          Date.now() - kayitTarihi <= 30 * 24 * 60 * 60 * 1000
        );
      });
    } else if (aktifSekme === "Yakınımda") {
      const sehir = currentUserCity.trim().toLocaleLowerCase("tr-TR");
      sonuc = sehir
        ? sonuc.filter(
            ({ user }) =>
              (user.city ?? "").trim().toLocaleLowerCase("tr-TR") === sehir,
          )
        : [];
    }

    // Puanlananlar sekmesi için mevcut modellerde puan alanı bulunmuyor.
    return sonuc;
  }, [siralanmisKullanicilar, aktifSekme, currentUserCity]);

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
    navigation.navigate("bildirimler");
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
    const fotografVar = fotografVarMi(profile);
    const medeniDurum = medeniDurumGoster(profile?.maritalStatus);
    const boy = profile?.height != null ? `${profile.height} cm` : "";

    return (
      <View style={styles.kullaniciKart}>
        <TouchableOpacity
          style={styles.fotografAlani}
          activeOpacity={0.92}
          onPress={() => profilAc(user.id)}
        >
          {fotografVar ? (
            <KimlikDogrulamaliAvatar
              kullaniciId={user.id}
              boyut={300}
              altYazi={(user.firstName || user.username || "?")
                .charAt(0)
                .toUpperCase()}
              style={styles.avatarKartKapsayici}
              imageStyle={styles.fotograf}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.varsayilanFotograf}>
              <Text style={styles.varsayilanFotografMetin}>
                {(user.firstName || user.username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          )}

          {user.createdAt &&
            Date.now() - new Date(user.createdAt).getTime() <=
              30 * 24 * 60 * 60 * 1000 && (
              <View style={styles.yeniEtiket}>
                <Text style={styles.yeniEtiketMetin}>YENİ</Text>
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

          <View style={styles.kartAltBilgi}>
            <Text style={styles.fotografIsim} numberOfLines={1}>
              {user.username || user.firstName}
              {yas !== null ? `, ${yas}` : ""}
            </Text>
            {user.city ? (
              <Text style={styles.fotografSehir} numberOfLines={1}>
                {user.city}
              </Text>
            ) : null}
            {boy || medeniDurum ? (
              <Text style={styles.fotografDetay} numberOfLines={1}>
                {[boy, medeniDurum].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profilGorButonu}
          activeOpacity={0.85}
          onPress={() => profilAc(user.id)}
        >
          <Text style={styles.profilGorMetin}>Profili Gör</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F4C45B" />

        <Text style={styles.loadingBaslik}>Gönül Buluşması</Text>

        <Text style={styles.loadingMetin}>Kullanıcılar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sayfaGovde}>
        <FlatList
          data={sekmeyeGoreKullanicilar}
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
                <TouchableOpacity
                  style={styles.yasFiltreButonu}
                  onPress={() => setFiltreModalAcik(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.yasFiltreIkon}>☷</Text>
                  <Text style={styles.yasFiltreMetin}>
                    {filtreler.minAge || "31"}-{filtreler.maxAge || "46"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.ustBarBaslik}>Ara</Text>

                <TouchableOpacity
                  style={styles.profilAvatarButonu}
                  onPress={profilimiAc}
                  activeOpacity={0.85}
                >
                  {mevcutKullanici?.id ? (
                    <KimlikDogrulamaliAvatar
                      kullaniciId={mevcutKullanici.id}
                      boyut={48}
                      altYazi={(mevcutKullanici.firstName || username || "?")
                        .charAt(0)
                        .toUpperCase()}
                      imageStyle={styles.profilAvatar}
                    />
                  ) : (
                    <Text style={styles.profilAvatarMetin}>👤</Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sekmeKaydirma}
                contentContainerStyle={styles.sekmeler}
              >
                {[
                  "Önerilen",
                  "Çevrimiçi",
                  "Yeni Üye",
                  "Yakınımda",
                  "Puanlananlar",
                ].map((sekme) => (
                  <TouchableOpacity
                    key={sekme}
                    style={[
                      styles.sekmeButonu,
                      aktifSekme === sekme && styles.sekmeButonuAktif,
                    ]}
                    onPress={() => setAktifSekme(sekme)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.sekmeMetni,
                        aktifSekme === sekme && styles.sekmeMetniAktif,
                      ]}
                    >
                      {sekme}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.hizliBaglantilar}></View>

              {error ? (
                <View style={styles.hataKutusu}>
                  <Text style={styles.hataBaslik}>
                    Kullanıcılar yüklenemedi
                  </Text>
                  <Text style={styles.hataMetin}>{error}</Text>
                  <TouchableOpacity
                    style={styles.tekrarDeneButonu}
                    onPress={yenile}
                  >
                    <Text style={styles.tekrarDeneMetin}>Tekrar Dene</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {aktifSekme === "Puanlananlar" ? (
                <Text style={styles.sekmeBilgi}>
                  Puanlama alanı mevcut API modelinde bulunmadığı için bu
                  sekmede puana göre sıralama henüz yapılmıyor.
                </Text>
              ) : null}

              <View style={styles.sonucBasligi}>
                <Text style={styles.bolumBaslik}>
                  {aktifSekme === "Önerilen"
                    ? "Sana Uygun Kullanıcılar"
                    : aktifSekme}
                </Text>
                <View style={styles.kullaniciSayisi}>
                  <Text style={styles.kullaniciSayisiMetin}>
                    {sekmeyeGoreKullanicilar.length}
                  </Text>
                </View>
              </View>

              {sekmeyeGoreKullanicilar.length === 0 && (
                <View style={styles.bosSonuc}>
                  <Text style={styles.bosSonucIkon}>⌕</Text>
                  <Text style={styles.bosSonucBaslik}>
                    Uygun kullanıcı bulunamadı
                  </Text>
                  <Text style={styles.bosSonucMetin}>
                    Farklı bir sekme veya filtre deneyebilirsiniz.
                  </Text>
                </View>
              )}
            </View>
          }
        />

        <View style={styles.altNavigasyon}>
          {/* ANA SAYFA */}
          <TouchableOpacity
            style={styles.altNavButonu}
            onPress={() => {}}
            activeOpacity={0.75}
          >
            <View style={styles.anaSayfaIkon}>
              <Text style={styles.anaSayfaIkonYazi}>⌂</Text>
            </View>
          </TouchableOpacity>

          {/* PAYLAŞIMLAR */}
          <TouchableOpacity
            style={styles.altNavButonu}
            onPress={paylasimlariAc}
            activeOpacity={0.75}
          >
            <View style={styles.paylasimIkonKapsayici}>
              <Text style={styles.paylasimIkon}>♡</Text>
            </View>
          </TouchableOpacity>

          {/* KEŞFET */}
          <TouchableOpacity
            style={styles.altNavButonu}
            onPress={() => setFiltreModalAcik(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.altNavIkonAktif}>⌕</Text>
          </TouchableOpacity>

          {/* MESAJLAR */}
          <TouchableOpacity
            style={styles.altNavButonu}
            onPress={mesajlariAc}
            activeOpacity={0.75}
          >
            <Text style={styles.altNavIkonPasif}>💬</Text>
          </TouchableOpacity>

          {/* BİLDİRİMLER */}
          <TouchableOpacity
            style={styles.altNavButonu}
            onPress={bildirimleriAc}
            activeOpacity={0.75}
          >
            <View style={styles.bildirimIkonKapsayici}>
              <Text style={styles.bildirimIkon}>🔔</Text>

              {bildirimSayisi > 0 && (
                <View style={styles.bildirimRozeti}>
                  <Text style={styles.bildirimRozetiMetin}>
                    {bildirimSayisi > 99 ? "99+" : bildirimSayisi}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

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

                  placeholderTextColor="#B98BCB"

                  keyboardType="number-pad"

                  value={filtreler.minAge}

                  onChangeText={(deger) => filtreGuncelle("minAge", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Maksimum yaş"

                  placeholderTextColor="#B98BCB"

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

                  placeholderTextColor="#B98BCB"

                  keyboardType="number-pad"

                  value={filtreler.minHeight}

                  onChangeText={(deger) => filtreGuncelle("minHeight", deger)}
                />

                <TextInput
                  style={[styles.input, styles.ikiInputEleman]}

                  placeholder="Maksimum boy"

                  placeholderTextColor="#B98BCB"

                  keyboardType="number-pad"

                  value={filtreler.maxHeight}

                  onChangeText={(deger) => filtreGuncelle("maxHeight", deger)}
                />
              </View>

              <Text style={styles.filtreGrupBaslik}>Konum</Text>

              <TextInput
                style={styles.input}

                placeholder="Şehir"

                placeholderTextColor="#B98BCB"

                value={filtreler.city}

                onChangeText={(deger) => filtreGuncelle("city", deger)}
              />

              <Text style={styles.filtreGrupBaslik}>Profil Bilgileri</Text>

              <TextInput
                style={styles.input}

                placeholder="Medeni durum"

                placeholderTextColor="#B98BCB"

                value={filtreler.maritalStatus}

                onChangeText={(deger) => filtreGuncelle("maritalStatus", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="Meslek"

                placeholderTextColor="#B98BCB"

                value={filtreler.profession}

                onChangeText={(deger) => filtreGuncelle("profession", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="Eğitim"

                placeholderTextColor="#B98BCB"

                value={filtreler.education}

                onChangeText={(deger) => filtreGuncelle("education", deger)}
              />

              <TextInput
                style={styles.input}

                placeholder="İlgi alanı"

                placeholderTextColor="#B98BCB"

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
  sayfaGovde: { flex: 1, backgroundColor: "#300044" },
  yasFiltreButonu: {
    minWidth: 94,
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: "#3A104A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  yasFiltreIkon: {
    color: "#F4C45B",
    fontSize: 21,
    marginRight: 7,
    fontWeight: "800",
  },
  yasFiltreMetin: { color: "#F4C45B", fontSize: 16, fontWeight: "800" },
  profilAvatarButonu: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#3A104A",
    alignItems: "center",
    justifyContent: "center",
  },
  profilAvatar: { width: "100%", height: "100%" },
  profilAvatarMetin: { fontSize: 25 },
  sekmeKaydirma: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#8D32A5",
    marginHorizontal: -16,
  },
  sekmeler: { paddingHorizontal: 8, alignItems: "center" },
  sekmeButonu: {
    minHeight: 58,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#8D32A5",
  },
  sekmeButonuAktif: { borderBottomWidth: 3, borderBottomColor: "#F4C45B" },
  sekmeMetni: { fontSize: 16, color: "#FFFFFF", fontWeight: "500" },
  sekmeMetniAktif: { color: "#F4C45B", fontWeight: "700" },
  sekmeBilgi: { color: "#D8A9E8", fontSize: 12, marginBottom: 10 },
  altNavigasyon: {
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#300044",
    borderTopWidth: 1,
    borderTopColor: "#8D32A5",
    paddingHorizontal: 8,
    elevation: 12,
  },
  altNavButonu: {
    width: 54,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  altNavIkonPasif: { fontSize: 34, color: "#D8A9E8" },
  altNavIkonAktif: { fontSize: 38, color: "#F4C45B", fontWeight: "700" },
  altNavKalpButonu: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F4C45B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -25,
    elevation: 8,
    shadowColor: "#F4C45B",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  altNavKalp: { color: "#300044", fontSize: 34 },
  container: {
    flex: 1,

    backgroundColor: "#180022",
  },

  liste: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },

  profilKartSatiri: {
    justifyContent: "space-between",
    gap: 10,
  },

  loadingContainer: {
    flex: 1,

    backgroundColor: "#180022",

    alignItems: "center",

    justifyContent: "center",

    padding: 24,
  },

  loadingBaslik: {
    marginTop: 18,

    fontSize: 25,

    fontWeight: "800",

    color: "#FFFFFF",
  },

  loadingMetin: {
    marginTop: 8,

    fontSize: 15,

    color: "#D8A9E8",
  },

  ustBar: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },

  ustBarBaslik: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0,
  },

  ustBarAltMetin: {
    marginTop: 4,

    fontSize: 14,

    color: "#D8A9E8",

    fontWeight: "600",
  },

  bildirimButonu: {
    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "#300044",

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: "#F4C45B",

    elevation: 2,

    shadowColor: "#F4C45B",

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
    backgroundColor: "#300044",

    borderRadius: 24,

    padding: 18,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 20,

    elevation: 4,

    shadowColor: "#F4C45B",

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
    color: "#FFFFFF",

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

    color: "#FFFFFF",

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
    backgroundColor: "#3A104A",

    borderColor: "#F4C45B",
  },

  hizliKartMor: {
    backgroundColor: "#3A104A",

    borderColor: "#F4C45B",
  },

  hizliKartTuruncu: {
    backgroundColor: "#3A104A",

    borderColor: "#F4C45B",
  },

  hizliKartProfil: {
    backgroundColor: "#3A104A",

    borderColor: "#F4C45B",
  },

  hizliIkon: {
    fontSize: 29,
    marginBottom: 8,
  },

  hizliKartEtiket: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0,
  },
  paylasimIkon: {
    color: "#E53935",
    fontSize: 32,
    fontWeight: "bold",
  },
  hizliKartBaslik: {
    color: "#FFFFFF",

    fontSize: 11,

    fontWeight: "800",
  },

  hizliKartBaslikMor: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartBaslikPembe: {
    color: "#D8A9E8",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartBaslikProfil: {
    color: "#F4C45B",

    fontSize: 13,

    fontWeight: "800",
  },

  hizliKartMetin: {
    marginTop: 2,

    color: "#D8A9E8",

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
    backgroundColor: "#F4C45B",
  },

  mesajButonu: {
    backgroundColor: "#300044",

    borderWidth: 1,

    borderColor: "#F4C45B",
  },

  aksiyonIkon: {
    fontSize: 18,

    marginRight: 7,
  },

  filtreButonuMetin: {
    color: "#FFFFFF",

    fontWeight: "800",

    fontSize: 14,
  },

  mesajButonuMetin: {
    color: "#F4C45B",

    fontWeight: "800",

    fontSize: 15,
  },

  paylasimlarButonu: {
    backgroundColor: "#F4C45B",
  },

  paylasimlarButonuMetin: {
    color: "#FFFFFF",

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

    backgroundColor: "#F4C45B",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreRozetiMetin: {
    color: "#FFFFFF",

    fontWeight: "900",
  },
  bildirimIkonKapsayici: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#3A104A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#C2185B",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    position: "relative",
  },

  bildirimRozeti: {
    position: "absolute",
    top: -4,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#3A104A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  bildirimRozetiMetin: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },

  hataKutusu: {
    backgroundColor: "#3A104A",

    borderWidth: 1,

    borderColor: "#F4C45B",

    borderRadius: 18,

    padding: 16,

    marginBottom: 20,
  },

  hataBaslik: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "800",

    marginBottom: 5,
  },

  hataMetin: {
    color: "#D8A9E8",

    fontSize: 14,

    lineHeight: 20,
  },

  tekrarDeneButonu: {
    marginTop: 12,

    alignSelf: "flex-start",

    backgroundColor: "#F4C45B",

    paddingHorizontal: 16,

    paddingVertical: 9,

    borderRadius: 10,
  },

  tekrarDeneMetin: {
    color: "#FFFFFF",

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

    color: "#D8A9E8",

    fontSize: 13,
  },

  kullaniciSayisi: {
    minWidth: 42,

    height: 36,

    paddingHorizontal: 10,

    borderRadius: 18,

    backgroundColor: "#3A104A",

    alignItems: "center",

    justifyContent: "center",
  },

  kullaniciSayisiMetin: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "900",
  },

  kullaniciKart: {
    width: "48.5%",
    height: 350,
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#300044",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },

  avatarKartKapsayici: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    backgroundColor: "#3A104A",
  },

  profilGorButonu: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4C45B",
  },

  profilGorMetin: {
    color: "#300044",
    fontSize: 13,
    fontWeight: "800",
  },

  hizliBaglantilar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },

  hizliBaglantiKart: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  hizliBaglantiPembe: {
    backgroundColor: "#3A104A",
    borderColor: "#F4C45B",
  },
  anaSayfaIkon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#6C5CE7",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  anaSayfaIkonYazi: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "bold",
  },
  hizliBaglantiMor: {
    backgroundColor: "#3A104A",
    borderColor: "#F4C45B",
  },

  hizliBaglantiAltin: {
    backgroundColor: "#3A104A",
    borderColor: "#F4C45B",
  },

  hizliBaglantiIkon: {
    color: "#F4C45B",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
  },

  hizliBaglantiBaslik: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },

  hizliBaglantiAlt: {
    color: "#D8A9E8",
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
  },

  fotografAlani: {
    flex: 1,
    backgroundColor: "#ba8dc7",
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
    backgroundColor: "#3A104A",
  },

  varsayilanFotografMetin: {
    fontSize: 58,
    color: "#F4C45B",
    fontWeight: "800",
  },

  fotografAltYazi: {
    display: "none",
  },

  fotografIsim: {
    color: "#300044",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  fotografSehir: {
    color: "rgba(255,255,255,0.98)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  fotografDetay: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  kartAltBilgi: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 11,
    paddingTop: 32,
    paddingBottom: 11,
    backgroundColor: "rgba(0,0,0,0.58)",
  },

  yeniEtiket: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4C45B",
  },

  yeniEtiketMetin: {
    color: "#300044",
    fontSize: 12,
    fontWeight: "900",
  },

  onlineEtiket: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  online: {
    backgroundColor: "#166534",
    borderWidth: 1,
    borderColor: "#4ADE80",
  },

  offline: {
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#9CA3AF",
  },

  onlineNokta: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 7,
    backgroundColor: "#4ADE80",
  },

  offlineNokta: {
    backgroundColor: "#D1D5DB",
  },

  onlineMetin: {
    fontSize: 12,
    fontWeight: "900",
  },
  paylasimIkonKapsayici: {
    backgroundColor: "#35bce5",
    borderRadius: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineMetinAktif: {
    color: "#FFFFFF",
  },

  onlineMetinPasif: {
    color: "#F3F4F6",
  },

  kullaniciBilgileri: {
    padding: 13,
    flex: 1,
  },

  kullaniciAdi: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "900",
  },

  username: {
    color: "#D8A9E8",

    fontSize: 11,

    marginTop: 2,

    marginBottom: 6,
  },

  bilgiSatiri: {
    gap: 3,

    marginBottom: 5,
  },

  bilgi: {
    color: "#D8A9E8",

    fontSize: 12,
  },

  detayBilgisi: {
    color: "#D8A9E8",

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
    backgroundColor: "#3A104A",

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
    backgroundColor: "#3A104A",

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,
  },

  fotografEtiketMetin: {
    color: "#F4C45B",

    fontSize: 11,

    fontWeight: "800",
  },

  dogrulanmisEtiket: {
    backgroundColor: "#3A104A",

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,
  },

  dogrulanmisEtiketMetin: {
    color: "#F4C45B",

    fontSize: 11,

    fontWeight: "800",
  },

  hakkindaAlani: {
    minHeight: 32,

    marginTop: 6,

    marginBottom: 8,
  },

  hakkinda: {
    color: "#D8A9E8",

    fontSize: 11,

    lineHeight: 15,
  },

  hakkindaBos: {
    color: "#B98BCB",

    fontSize: 10,

    fontStyle: "italic",

    lineHeight: 14,
  },

  profilButonu: {
    minHeight: 46,
    marginTop: "auto",
    borderRadius: 14,
    backgroundColor: "#F4C45B",
    alignItems: "center",
    justifyContent: "center",
  },

  profilButonuMetin: {
    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "800",
  },

  bosSonuc: {
    backgroundColor: "#180022",

    borderWidth: 1,

    borderColor: "#F4C45B",

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
    color: "#FFFFFF",

    fontSize: 17,

    fontWeight: "800",

    textAlign: "center",
  },

  bosSonucMetin: {
    marginTop: 7,

    color: "#D8A9E8",

    fontSize: 13,

    textAlign: "center",

    lineHeight: 19,
  },

  temizleButonu: {
    marginTop: 15,

    backgroundColor: "#F4C45B",

    paddingHorizontal: 18,

    paddingVertical: 10,

    borderRadius: 12,
  },

  temizleButonuMetin: {
    color: "#FFFFFF",

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

    borderColor: "#F4C45B",

    backgroundColor: "#300044",

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",
  },

  cikisIkon: {
    fontSize: 18,

    marginRight: 7,
  },

  cikisMetin: {
    color: "#F4C45B",

    fontSize: 16,

    fontWeight: "900",
  },

  altYazi: {
    marginTop: 14,

    color: "#B98BCB",

    fontSize: 12,
  },

  modalArkaPlan: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.45)",

    justifyContent: "flex-end",
  },

  filtreModal: {
    backgroundColor: "#300044",

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

    borderBottomColor: "#F4C45B",
  },

  modalBaslik: {
    color: "#D8A9E8",

    fontSize: 23,

    fontWeight: "800",
  },

  modalAltBaslik: {
    color: "#D8A9E8",

    marginTop: 3,

    fontSize: 13,
  },

  modalKapatButonu: {
    width: 40,

    height: 40,

    borderRadius: 14,

    backgroundColor: "#3A104A",

    alignItems: "center",

    justifyContent: "center",
  },

  modalKapatMetin: {
    color: "#F4C45B",

    fontSize: 20,

    fontWeight: "900",
  },

  filtreScroll: {
    padding: 20,

    paddingBottom: 35,
  },

  filtreGrupBaslik: {
    color: "#FFFFFF",

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

    backgroundColor: "#180022",

    borderWidth: 1,

    borderColor: "#F4C45B",

    borderRadius: 14,

    paddingHorizontal: 16,

    color: "#FFFFFF",

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

    borderColor: "#F4C45B",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 10,
  },

  checkboxSecili: {
    backgroundColor: "#F4C45B",

    borderColor: "#F4C45B",
  },

  checkboxTik: {
    color: "#FFFFFF",

    fontWeight: "900",

    fontSize: 15,
  },

  checkboxMetin: {
    color: "#D8A9E8",

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

    borderColor: "#F4C45B",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreTemizleMetin: {
    color: "#F4C45B",

    fontSize: 14,

    fontWeight: "800",
  },

  filtreUygulaButonu: {
    flex: 1,

    minHeight: 50,

    borderRadius: 14,

    backgroundColor: "#F4C45B",

    alignItems: "center",

    justifyContent: "center",
  },

  filtreUygulaMetin: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "800",
  },
});
