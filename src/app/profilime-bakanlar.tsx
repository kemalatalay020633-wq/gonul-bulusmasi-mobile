import AsyncStorage from "@react-native-async-storage/async-storage";
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
import KimlikDogrulamaliAvatar from "../components/common/KimlikDogrulamaliAvatar";
import { API_BASE_URL } from "../config/api";

const API_ADRESI = API_BASE_URL + "/api";

/*
 * =========================================================
 * BILDIRIM MODELI
 * =========================================================
 */

type Bildirim = {
  id?: number;
  userId?: number | null;
  relatedId?: number | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  read?: boolean;
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
  emailVerified?: boolean;
  phoneVerified?: boolean;
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
 * KULLANICI + PROFIL
 * =========================================================
 */

type BakanKullanici = {
  kullanici: Kullanici;
  profil: Profil | null;
};

/*
 * =========================================================
 * YAS HESAPLA
 * =========================================================
 */

const yasHesapla = (dogumTarihi: string | null | undefined): number | null => {
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

/*
 * =========================================================
 * MEDENI DURUM
 * =========================================================
 */

const medeniDurumGetir = (
  medeniDurum: string | number | null | undefined,
): string => {
  if (medeniDurum === null || medeniDurum === undefined) {
    return "";
  }

  const deger = String(medeniDurum).trim();

  if (!deger) {
    return "";
  }

  const sayisalDegerler: Record<string, string> = {
    "0": "Bekar",
    "1": "Evli",
    "2": "Boşanmış",
    "3": "Dul",
  };

  if (sayisalDegerler[deger]) {
    return sayisalDegerler[deger];
  }

  const metinselDegerler: Record<string, string> = {
    BEKAR: "Bekar",
    EVLI: "Evli",
    BOSANMIS: "Boşanmış",
    DUL: "Dul",
    Bekar: "Bekar",
    Evli: "Evli",
    Boşanmış: "Boşanmış",
    Dul: "Dul",
  };

  if (metinselDegerler[deger]) {
    return metinselDegerler[deger];
  }

  if (!Number.isNaN(Number(deger))) {
    return "";
  }

  return deger;
};

/*
 * =========================================================
 * ANA SAYFA
 * =========================================================
 */

export default function ProfilimeBakanlar() {
  const navigation = useNavigation<any>();

  const [kullanicilar, setKullanicilar] = useState<BakanKullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

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

        const responseText = await response.text();

        if (!response.ok) {
          console.error(
            "KULLANICI ALINAMADI:",
            kullaniciId,
            response.status,
            responseText,
          );

          return null;
        }

        if (!responseText.trim()) {
          return null;
        }

        return JSON.parse(responseText) as Kullanici;
      } catch (error) {
        console.error("KULLANICI BILGISI HATASI:", error);
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

        const responseText = await response.text();

        if (!response.ok) {
          console.error("PROFILLER ALINAMADI:", response.status, responseText);

          return [];
        }

        if (!responseText.trim()) {
          return [];
        }

        const veri = JSON.parse(responseText);

        if (Array.isArray(veri)) {
          return veri as Profil[];
        }

        if (Array.isArray(veri?.content)) {
          return veri.content as Profil[];
        }

        return [];
      } catch (error) {
        console.error("PROFILLER HATASI:", error);
        return [];
      }
    },
    [],
  );

  /*
   * =======================================================
   * BILDIRIMLERI GETIR
   * =======================================================
   */

  const bildirimleriGetir = useCallback(
    async (token: string, kullaniciId: number): Promise<Bildirim[]> => {
      const response = await fetch(
        `${API_ADRESI}/bildirimler/${kullaniciId}/profilime-bakanlar`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          responseText || "Profilime bakan bildirimleri alinamadi.",
        );
      }

      if (!responseText.trim()) {
        return [];
      }

      const veri = JSON.parse(responseText);

      if (Array.isArray(veri)) {
        return veri as Bildirim[];
      }

      if (Array.isArray(veri?.content)) {
        return veri.content as Bildirim[];
      }

      return [];
    },
    [],
  );

  /*
   * =======================================================
   * PROFILIME BAKANLARI GETIR
   * =======================================================
   */

  const yukle = useCallback(async () => {
    try {
      setYukleniyor(true);
      setHata("");

      /*
       * TOKEN
       */

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setHata("Oturum bilgisi bulunamadi.");
        return;
      }

      /*
       * GIRIS YAPAN KULLANICI
       */

      const userId = await AsyncStorage.getItem("userId");

      const kullaniciId = Number(userId);

      if (!userId || !Number.isFinite(kullaniciId) || kullaniciId <= 0) {
        setHata("Kullanici bilgisi bulunamadi.");
        return;
      }

      /*
       * PROFILIME BAKAN BILDIRIMLERI
       */

      const bildirimler = await bildirimleriGetir(token, kullaniciId);

      /*
       * RELATED ID'LER
       */

      const kullaniciIdleri = Array.from(
        new Set(
          bildirimler
            .filter((bildirim) => bildirim.type === "PROFILE_VIEW")
            .map((bildirim) => Number(bildirim.relatedId))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );
      /*
       * HIC KIMSE YOK
       */

      if (kullaniciIdleri.length === 0) {
        setKullanicilar([]);
        return;
      }

      /*
       * PROFILLER
       */

      const profiller = await profilleriGetir(token);

      /*
       * KULLANICILAR
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

          return {
            kullanici,
            profil,
          };
        }),
      );

      /*
       * NULL TEMIZLE
       */

      const temizKullanicilar = sonuclar.filter(
        (item): item is BakanKullanici => item !== null,
      );

      setKullanicilar(temizKullanicilar);
    } catch (error) {
      console.error("PROFILIME BAKANLAR HATASI:", error);

      setHata(
        error instanceof Error
          ? error.message
          : "Profilinize bakan kullanıcılar yüklenemedi.",
      );
    } finally {
      setYukleniyor(false);
    }
  }, [bildirimleriGetir, kullaniciGetir, profilleriGetir]);

  /*
   * =======================================================
   * SAYFA ACILINCA
   * =======================================================
   */

  useEffect(() => {
    void yukle();
  }, [yukle]);

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
   * GERI
   * =======================================================
   */

  const geriDon = () => {
    navigation.goBack();
  };

  /*
   * =======================================================
   * YUKLENIYOR
   * =======================================================
   */

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.yukleniyorContainer}>
          <ActivityIndicator size="large" color="#8F2942" />

          <Text style={styles.yukleniyorText}>
            Profilinize bakanlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * EKRAN
   * =======================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/*
         * BASLIK
         */}

        <View style={styles.ustBar}>
          <Pressable style={styles.geriButonu} onPress={geriDon}>
            <Text style={styles.geriIcon}>‹</Text>
          </Pressable>

          <View style={styles.baslikAlani}>
            <Text style={styles.baslikIcon}>👀</Text>
            <Text style={styles.baslik}>Profilime Bakanlar</Text>
            <Text style={styles.altBaslik}>
              Profilini görüntüleyen kullanıcılar
            </Text>
          </View>

          <View style={styles.ustBosluk} />
        </View>

        <View style={styles.ozetKart}>
          <Text style={styles.ozetIkon}>👁</Text>
          <Text style={styles.ozetMetin}>Toplam</Text>
          <Text style={styles.ozetSayi}>{kullanicilar.length}</Text>
          <Text style={styles.ozetMetin}>kişi profilini görüntüledi</Text>
        </View>

        {/*
         * HATA
         */}

        {hata ? (
          <View style={styles.hataKart}>
            <Text style={styles.hataBaslik}>Bir hata oluştu</Text>

            <Text style={styles.hataText}>{hata}</Text>

            <Pressable style={styles.tekrarButonu} onPress={yukle}>
              <Text style={styles.tekrarButonuText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : null}

        {/*
         * KIMSE YOK
         */}

        {!hata && kullanicilar.length === 0 ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosIcon}>👀</Text>

            <Text style={styles.bosBaslik}>Henüz profilinize bakan yok</Text>

            <Text style={styles.bosText}>
              Profilinizi görüntüleyen kullanıcılar burada görünecek.
            </Text>
          </View>
        ) : null}

        {/*
         * KULLANICI LISTESI
         */}

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
                  {/*
                   * FOTOGRAF
                   */}

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

                  {/*
                   * BILGILER
                   */}

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

                    {medeniDurum ? (
                      <Text style={styles.detay}>
                        Medeni durum: {medeniDurum}
                      </Text>
                    ) : null}

                    {kullanici.gender ? (
                      <Text style={styles.detay}>{kullanici.gender}</Text>
                    ) : null}

                    <Text style={styles.bakanBilgisi}>
                      Profilinizi görüntüledi
                    </Text>
                  </View>
                </View>

                {/*
                 * PROFILI GOR
                 */}

                <Pressable
                  style={styles.profilButonu}
                  onPress={() => profileGit(kullanici.id)}
                >
                  <Text style={styles.profilButonuText}>👤 Profili Gör</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#10051F",
  },
  scrollContainer: {
    paddingBottom: 34,
  },
  yukleniyorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#10051F",
  },
  yukleniyorText: {
    marginTop: 14,
    fontSize: 15,
    color: "#E8C8FF",
    fontWeight: "600",
    textAlign: "center",
  },
  ustBar: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#260638",
    borderBottomWidth: 1,
    borderBottomColor: "#F4C45B",
  },
  geriButonu: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#421452",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },
  geriIcon: {
    fontSize: 38,
    lineHeight: 40,
    color: "#FFFFFF",
  },
  baslikAlani: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  baslikIcon: {
    fontSize: 25,
    marginBottom: 2,
    color: "#E8B85B",
  },
  baslik: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  altBaslik: {
    marginTop: 5,
    fontSize: 13,
    color: "#D9A9EE",
    textAlign: "center",
  },
  ustBosluk: {
    width: 48,
  },
  ozetKart: {
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 4,
    minHeight: 70,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    backgroundColor: "#421452",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },
  ozetIkon: {
    fontSize: 25,
    marginRight: 10,
  },
  ozetMetin: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  ozetSayi: {
    color: "#FFD978",
    fontSize: 29,
    fontWeight: "900",
    marginHorizontal: 8,
  },
  hataKart: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#42152F",
    borderWidth: 1,
    borderColor: "#F4C45B",
  },
  hataBaslik: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFD5E8",
    marginBottom: 7,
  },
  hataText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#F3D9FF",
  },
  tekrarButonu: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tekrarButonuText: {
    color: "#321044",
    fontSize: 14,
    fontWeight: "900",
  },
  bosKart: {
    marginHorizontal: 18,
    marginTop: 24,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F4C45B",
    backgroundColor: "#321044",
  },
  bosIcon: {
    fontSize: 54,
    marginBottom: 10,
    color: "#FFD978",
  },
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
    color: "#E5D1EF",
    textAlign: "center",
  },
  liste: {
    paddingHorizontal: 15,
    paddingTop: 18,
  },
  kullaniciKart: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#260B38",
    borderWidth: 1,
    borderColor: "#F4C45B",
    elevation: 5,
  },
  kullaniciUst: {
    flexDirection: "row",
    alignItems: "center",
  },
  fotoContainer: {
    width: 96,
    height: 96,
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: "#E8B85B",
    borderWidth: 2,
    borderColor: "#F4C45B",
    flexShrink: 0,
  },
  foto: {
    width: 96,
    height: 96,
  },
  fotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#64227D",
  },
  fotoPlaceholderText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  bilgiler: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  adSoyad: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  kullaniciAdi: {
    marginTop: 4,
    fontSize: 13,
    color: "#D9A9EE",
    fontWeight: "700",
  },
  detay: {
    marginTop: 6,
    fontSize: 13,
    color: "#F0E1F7",
  },
  bakanBilgisi: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#69E98C",
  },
  profilButonu: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  profilButonuText: {
    color: "#321044",
    fontSize: 15,
    fontWeight: "900",
  },
});
