import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
// src/app/home.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import KimlikDogrulamaliAvatar from "../components/common/KimlikDogrulamaliAvatar";
import { API_BASE_URL } from "../config/api";

const API_ADRESI = API_BASE_URL + "/api";

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  active?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};
/*
 * =========================================================
 * FAVORI MODELI
 * =========================================================
 */

type FavoriteDto = {
  id: number;
  userId: number;
  favoriteUserId: number;
  createdAt?: string | null;
};

/*
 * =========================================================
 * KULLANICI MODELI
 * =========================================================
 */

type Kullanici = {
  id: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  city?: string | null;
  profilePhoto?: string | null;
  gender?: string;
  active?: boolean;
};

/*
 * =========================================================
 * PROFIL MODELI
 * =========================================================
 */

type Profil = {
  id: number;
  userId: number;
  about?: string | null;
  profession?: string | number | null;
  education?: string | number | null;
  height?: number | null;
  weight?: number | null;
  maritalStatus?: string | number | null;
  religion?: string | number | null;
  interests?: string | number | null;
  profilePhoto?: string | null;
  profileVerified?: boolean;
};

/*
 * =========================================================
 * BIRLIKTE KULLANICI + PROFIL
 * =========================================================
 */

type FavoriyeEkleyenKullanici = {
  kullanici: Kullanici;
  profil: Profil | null;
  createdAt: string | null;
};

/*
 * =========================================================
 * ANA COMPONENT
 * =========================================================
 */

export default function FavorilerimeEkleyenler() {
  const navigation = useNavigation<any>();

  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const [kullanicilar, setKullanicilar] = useState<FavoriyeEkleyenKullanici[]>(
    [],
  );

  const [yukleniyor, setYukleniyor] = useState(true);

  const [hata, setHata] = useState("");

  /*
   * =======================================================
   * YAS HESAPLA
   * =======================================================
   */

  const yasHesapla = useCallback(
    (dogumTarihi: string | null | undefined): number | null => {
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
    },
    [],
  );

  /*
   * =======================================================
   * MEDENI DURUM
   * =======================================================
   */

  const medeniDurumGetir = useCallback(
    (medeniDurum: string | number | null | undefined): string => {
      if (medeniDurum === null || medeniDurum === undefined) {
        return "";
      }

      const deger = String(medeniDurum).trim();

      if (!deger) {
        return "";
      }

      /*
       * Sayisal enum
       */

      const sayisalDegerler: Record<string, string> = {
        "0": "Bekar",
        "1": "Evli",
        "2": "Bosanmis",
        "3": "Dul",
      };

      if (sayisalDegerler[deger]) {
        return sayisalDegerler[deger];
      }

      /*
       * Metinsel enum
       */

      const metinselDegerler: Record<string, string> = {
        BEKAR: "Bekar",
        EVLI: "Evli",
        BOSANMIS: "Bosanmis",
        DUL: "Dul",

        Bekar: "Bekar",
        Evli: "Evli",
        Bosanmis: "Bosanmis",
        Dul: "Dul",
      };
      if (metinselDegerler[deger]) {
        return metinselDegerler[deger];
      }

      /*
       * Taninmayan sayiysa
       * rakam gösterme.
       */

      if (!Number.isNaN(Number(deger))) {
        return "";
      }

      return deger;
    },
    [],
  );

  /*
   * =======================================================
   * KULLANICI GETIR
   * =======================================================
   */

  const kullaniciGetir = useCallback(
    async (kullaniciId: number, token: string): Promise<Kullanici | null> => {
      try {
        const response = await fetch(`${API_ADRESI}/users/${kullaniciId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const metin = await response.text();

        if (!response.ok) {
          console.error(
            "KULLANICI ALINAMADI:",
            kullaniciId,
            response.status,
            metin,
          );

          return null;
        }

        if (!metin.trim()) {
          return null;
        }

        return JSON.parse(metin) as Kullanici;
      } catch (error) {
        console.error("KULLANICI GETIRME HATASI:", error);

        return null;
      }
    },
    [],
  );

  /*
   * =======================================================
   * PROFILLERI GETIR
   * =======================================================
   */

  const profilleriGetir = useCallback(
    async (token: string): Promise<Profil[]> => {
      try {
        const response = await fetch(`${API_ADRESI}/profiles`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const metin = await response.text();

        if (!response.ok) {
          console.error("PROFILLER ALINAMADI:", response.status, metin);

          return [];
        }

        if (!metin.trim()) {
          return [];
        }

        const veri = JSON.parse(metin);

        if (Array.isArray(veri)) {
          return veri as Profil[];
        }

        if (Array.isArray(veri?.content)) {
          return veri.content as Profil[];
        }

        return [];
      } catch (error) {
        console.error("PROFILLER GETIRME HATASI:", error);

        return [];
      }
    },
    [],
  );

  /*
   * =======================================================
   * FAVORILERIME EKLEYENLERI GETIR
   * =======================================================
   */

  const favorilerimiGetir = useCallback(async () => {
    try {
      setYukleniyor(true);
      setHata("");

      /*
       * TOKEN
       */

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setHata("Oturum bulunamadi.");
        return;
      }

      /*
       * GIRIS YAPAN KULLANICI
       *
       * Bu bilgi daha sonra kullanilabilir.
       * Endpoint kullaniciyi JWT'den aldığı için
       * URL'ye userId göndermiyoruz.
       */

      const kayitliUserId = await AsyncStorage.getItem("userId");

      const kullaniciId = Number(kayitliUserId);

      if (!kayitliUserId || !Number.isFinite(kullaniciId) || kullaniciId <= 0) {
        setHata("Kullanici bilgisi bulunamadi.");
        return;
      }

      /*
       * =====================================================
       * FAVORI KAYITLARI
       *
       * Backend endpoint:
       *
       * GET /api/favorites/beni-favorilerine-ekleyenler
       *
       * Kullanici ID URL'den alinmiyor.
       * JWT üzerinden mevcut kullanıcı bulunuyor.
       * =====================================================
       */

      const response = await fetch(`${API_ADRESI}/favorites/beni-ekleyenler`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("FAVORILER RESPONSE STATUS:", response.status);

      /*
       * RESPONSE BODY SADECE BIR KEZ OKUNUYOR
       */

      const metin = await response.text();

      console.log("FAVORILER RESPONSE:", metin);

      if (!response.ok) {
        throw new Error(
          metin || "Favorilerinize ekleyen kullanicilar alinamadi.",
        );
      }

      const favoriler: FavoriteDto[] = metin.trim() ? JSON.parse(metin) : [];

      console.log("FAVORILER DATA:", favoriler);

      /*
       * =====================================================
       * FAVORIYE EKLEYEN KULLANICI ID'LERI
       * =====================================================
       */

      const kullaniciIdleri = Array.from(
        new Set(
          favoriler
            .map((favori) => Number(favori.userId))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      /*
       * =====================================================
       * KIMSE YOK
       * =====================================================
       */

      if (kullaniciIdleri.length === 0) {
        setKullanicilar([]);
        return;
      }

      /*
       * =====================================================
       * PROFILLERI GETIR
       * =====================================================
       */

      const profiller = await profilleriGetir(token);

      /*
       * =====================================================
       * KULLANICILARI GETIR
       * =====================================================
       */

      const sonuclar = await Promise.all(
        kullaniciIdleri.map(async (bakanKullaniciId) => {
          const kullanici = await kullaniciGetir(bakanKullaniciId, token);

          if (!kullanici) {
            return null;
          }

          const profil =
            profiller.find(
              (item) => Number(item.userId) === bakanKullaniciId,
            ) ?? null;

          const favoriKaydi = favoriler.find(
            (favori) => Number(favori.userId) === bakanKullaniciId,
          );

          return {
            kullanici,
            profil,
            createdAt: favoriKaydi?.createdAt ?? null,
          };
        }),
      );

      /*
       * =====================================================
       * NULL TEMIZLE
       * =====================================================
       */

      const temizSonuclar = sonuclar.filter(
        (item): item is FavoriyeEkleyenKullanici => item !== null,
      );

      setKullanicilar(temizSonuclar);
    } catch (error) {
      console.error("FAVORILERIME EKLEYENLER HATASI:", error);

      setHata(
        error instanceof Error
          ? error.message
          : "Favorilerinize ekleyen kullanicilar alinamadi.",
      );
    } finally {
      setYukleniyor(false);
    }
  }, [kullaniciGetir, profilleriGetir]);

  /*
   * =======================================================
   * SAYFA AÇILINCA
   * =======================================================
   */

  useEffect(() => {
    void favorilerimiGetir();
  }, [favorilerimiGetir]);

  /*
   * =======================================================
   * PROFILE GIT
   * =======================================================
   */

  const profileGit = (kullaniciId: number) => {
    navigation.navigate("user", { id: String(kullaniciId) });
  };

  /*
   * =======================================================
   * GERİ DÖN
   * =======================================================
   */

  const geriDon = () => {
    navigation.goBack();
  };

  /*
   * =======================================================
   * YÜKLENİYOR
   * =======================================================
   */

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.yukleniyorContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />

          <Text style={styles.yukleniyorText}>
            Favorilerine ekleyenler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const yeniEkleyenSayisi = kullanicilar.filter((item) => {
    if (!item.createdAt) return false;
    const tarih = new Date(item.createdAt).getTime();
    return (
      Number.isFinite(tarih) && Date.now() - tarih <= 7 * 24 * 60 * 60 * 1000
    );
  }).length;

  /*
   * =======================================================
   * EKRAN
   * =======================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            BASLIK
        ================================================= */}
        <View style={styles.ustBolum}>
          <Pressable style={styles.geriButonu} onPress={geriDon}>
            <Text style={styles.geriIcon}>‹</Text>
          </Pressable>

          <View style={styles.baslikAlani}>
            <Text style={styles.baslikIkon}>♡</Text>
            <Text style={styles.baslik}>Favorilerime Ekleyenler</Text>
            <Text style={styles.altBaslik}>
              Seni favorilerine ekleyen kullanıcılar
            </Text>
          </View>
          <Text style={styles.koseKalp}>💗</Text>
        </View>

        <View style={styles.ozetKart}>
          <View style={styles.ozetBolum}>
            <Text style={styles.ozetIkon}>💗</Text>
            <Text style={styles.ozetEtiket}>Toplam</Text>
            <Text style={styles.ozetSayi}>{kullanicilar.length}</Text>
            <Text style={styles.ozetEtiket}>Kişi</Text>
          </View>
          <View style={styles.ozetAyirici} />
          <View style={styles.ozetBolum}>
            <Text style={styles.ozetIkon}>⭐</Text>
            <Text style={styles.ozetEtiket}>Yeni</Text>
            <Text style={styles.ozetSayi}>{yeniEkleyenSayisi}</Text>
            <Text style={styles.ozetEtiket}>Kişi</Text>
          </View>
        </View>
        {/* =================================================
            HATA
        ================================================= */}
        {hata ? (
          <View style={styles.hataKart}>
            <Text style={styles.hataBaslik}>Bir hata oluştu</Text>

            <Text style={styles.hataText}>{hata}</Text>

            <Pressable style={styles.tekrarButonu} onPress={favorilerimiGetir}>
              <Text style={styles.tekrarButonuText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : null}
        {/* =================================================
            KIMSE YOK
        ================================================= */}
        {!hata && kullanicilar.length === 0 ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosYildiz}>♡</Text>

            <Text style={styles.bosBaslik}>
              Henüz seni favorilerine ekleyen yok
            </Text>

            <Text style={styles.bosText}>
              Profilini güçlendirerek daha fazla kişinin seni fark etmesini
              sağlayabilirsin.
            </Text>
          </View>
        ) : null}
        {/* =================================================
            LISTE
        ================================================= */}
        <View style={styles.liste}>
          {kullanicilar.map(({ kullanici, profil }) => {
            /*
             * YAS
             */

            const yas = yasHesapla(kullanici.birthDate);

            /*
             * AD SOYAD
             */

            const adSoyad = [kullanici.firstName, kullanici.lastName]
              .filter(Boolean)
              .join(" ");

            /*
             * MEDENI DURUM
             */

            const medeniDurum = medeniDurumGetir(profil?.maritalStatus);

            return (
              <View key={kullanici.id} style={styles.kullaniciKart}>
                <View style={styles.kullaniciUst}>
                  {/* FOTOGRAF */}
                  <View style={styles.fotoContainer}>
                    {kullanici.id ? (
                      <KimlikDogrulamaliAvatar
                        kullaniciId={kullanici.id}
                        boyut={82}
                        altYazi={(adSoyad || kullanici.username || "?")
                          .charAt(0)
                          .toUpperCase()}
                        imageStyle={styles.foto}
                      />
                    ) : (
                      <View style={styles.fotoPlaceholder}>
                        <Text style={styles.fotoPlaceholderText}>
                          {(adSoyad || kullanici.username || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* BILGILER */}
                  <View style={styles.bilgiler}>
                    <Text style={styles.adSoyad} numberOfLines={1}>
                      {adSoyad || kullanici.username || "Kullanici"}
                    </Text>

                    {kullanici.username ? (
                      <Text style={styles.kullaniciAdi} numberOfLines={1}>
                        @{kullanici.username}
                      </Text>
                    ) : null}

                    {yas !== null || kullanici.city ? (
                      <Text style={styles.detay} numberOfLines={1}>
                        {yas !== null ? `${yas} yaş` : ""}

                        {yas !== null && kullanici.city ? " · " : ""}

                        {kullanici.city || ""}
                      </Text>
                    ) : null}

                    {profil?.profession ? (
                      <Text style={styles.detay} numberOfLines={1}>
                        ▣ {String(profil.profession)}
                      </Text>
                    ) : null}

                    {medeniDurum ? (
                      <Text style={styles.detay} numberOfLines={1}>
                        ♡ {medeniDurum}
                      </Text>
                    ) : null}

                    {kullanici.gender ? (
                      <Text style={styles.detay} numberOfLines={1}>
                        {kullanici.gender}
                      </Text>
                    ) : null}

                    <Text style={styles.favoriBilgisi}>
                      <Text style={styles.cevrimiciNokta}>● </Text>
                      Seni favorilerine ekledi
                    </Text>
                  </View>
                </View>
                {/* PROFİLİ GÖR */}
                <Pressable
                  style={styles.profilButonu}
                  onPress={() => profileGit(kullanici.id)}
                >
                  <Text style={styles.profilButonuText}>◉ Profili Gör</Text>
                </Pressable>
              </View>
            );
          })}
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
  container: { flex: 1, backgroundColor: "#180022" },
  scrollContainer: { paddingBottom: 34, backgroundColor: "#180022" },

  yukleniyorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#180022",
  },
  yukleniyorText: {
    marginTop: 14,
    fontSize: 15,
    color: "#E8C8FF",
    fontWeight: "700",
    textAlign: "center",
  },

  ustBolum: {
    minHeight: 220,
    paddingTop: 12,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#300044",
  },
  geriButonu: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#54116C",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },
  geriIcon: { color: "#FFFFFF", fontSize: 42, lineHeight: 46, marginTop: -5 },
  baslikAlani: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 0,
  },
  baslikIkon: {
    color: "#F6D477",
    fontSize: 65,
    lineHeight: 75,
    fontWeight: "300",
  },
  baslik: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
  },
  altBaslik: {
    color: "#D8A9E8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
    fontWeight: "600",
  },
  koseKalp: { fontSize: 38, marginTop: 12 },

  ozetKart: {
    marginHorizontal: 18,
    marginTop: -5,
    marginBottom: 20,
    minHeight: 76,
    borderRadius: 38,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#54145F",
    borderWidth: 1.5,
    borderColor: "#F4C45B",
  },
  ozetBolum: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ozetIkon: { fontSize: 25, marginRight: 2 },
  ozetEtiket: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  ozetSayi: { color: "#F6D477", fontSize: 25, fontWeight: "900" },
  ozetAyirici: {
    width: 1,
    height: 38,
    backgroundColor: "#D58AE6",
    marginHorizontal: 5,
  },

  hataKart: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#42112F",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },
  hataBaslik: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFD5EC",
    marginBottom: 7,
  },
  hataText: { fontSize: 14, lineHeight: 21, color: "#F2CDE5" },
  tekrarButonu: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#F3C45C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tekrarButonuText: { color: "#321044", fontSize: 14, fontWeight: "900" },

  bosKart: {
    marginHorizontal: 20,
    marginTop: 22,
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F4C45B",
    backgroundColor: "#40104F",
  },
  bosYildiz: { fontSize: 58, color: "#F6D477", marginBottom: 8 },
  bosBaslik: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  bosText: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 22,
    color: "#E6C8F1",
    textAlign: "center",
  },

  liste: { paddingHorizontal: 15, paddingTop: 0 },
  kullaniciKart: {
    marginBottom: 15,
    padding: 14,
    borderRadius: 24,
    backgroundColor: "#3A104A",
    borderWidth: 1.5,
    borderColor: "#F4C45B",
    elevation: 5,
  },
  kullaniciUst: { flexDirection: "row", alignItems: "center" },
  fotoContainer: {
    width: 94,
    height: 112,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#6B2581",
    borderWidth: 1.5,
    borderColor: "#F4C45B",
    flexShrink: 0,
  },
  foto: { width: "100%", height: "100%", borderRadius: 18 },
  fotoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#64227D",
  },
  fotoPlaceholderText: { fontSize: 38, fontWeight: "900", color: "#FFFFFF" },
  bilgiler: { flex: 1, minWidth: 0, marginLeft: 14 },
  adSoyad: { fontSize: 19, fontWeight: "900", color: "#FFFFFF" },
  kullaniciAdi: {
    marginTop: 3,
    fontSize: 13,
    color: "#D9A9EE",
    fontWeight: "600",
  },
  detay: { marginTop: 7, fontSize: 13, color: "#F0DFF6", fontWeight: "600" },
  favoriBilgisi: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#F4C75E",
  },
  cevrimiciNokta: { color: "#55E68A" },

  profilButonu: {
    marginTop: 13,
    minHeight: 46,
    borderRadius: 24,
    backgroundColor: "#F4C45B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  profilButonuText: { color: "#351044", fontSize: 15, fontWeight: "900" },
});
