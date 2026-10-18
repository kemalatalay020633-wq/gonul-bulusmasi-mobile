import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// src/app/home.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNavigation } from "@react-navigation/native";

import { API_BASE_URL } from "../config/api";

const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;

type LikeDto = {
  id: number;

  userId: number;

  likedUserId: number;

  createdAt?: string | null;
};

type Kullanici = {
  id: number;

  username?: string;

  email?: string;

  firstName?: string;

  lastName?: string;

  birthDate?: string | null;

  phoneNumber?: string | null;

  profilePhoto?: string | null;

  city?: string | null;

  active?: boolean;

  emailVerified?: boolean;

  phoneVerified?: boolean;

  createdAt?: string;

  updatedAt?: string;

  gender?: string;
};

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

type BegenenKullanici = {
  begeni: LikeDto;

  kullanici: Kullanici | null;

  profil: Profil | null;
};

export default function Begenenler() {
  const navigation = useNavigation<any>();

  const [begenenler, setBegenenler] = useState<BegenenKullanici[]>([]);

  const [yukleniyor, setYukleniyor] = useState(true);

  const [hata, setHata] = useState("");

  /*

   * =========================================================

   * FOTOĞRAF URL

   * =========================================================

   */

  const fotoUrlOlustur = useCallback(
    (foto: string | null | undefined): string => {
      if (!foto) {
        return "";
      }

      const temizFoto = foto.trim();

      if (!temizFoto) {
        return "";
      }

      if (temizFoto.startsWith("http://") || temizFoto.startsWith("https://")) {
        return temizFoto;
      }

      if (temizFoto.startsWith("/")) {
        return `${SUNUCU_ADRESI}${temizFoto}`;
      }

      return `${SUNUCU_ADRESI}/${temizFoto}`;
    },

    [],
  );

  /*

   * =========================================================

   * YAŞ HESAPLA

   * =========================================================

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

   * =========================================================

   * MEDENİ DURUM

   * =========================================================

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

      const sayisalDegerler: Record<string, string> = {
        "0": "Bekâr",

        "1": "Evli",

        "2": "Boşanmış",

        "3": "Dul",
      };

      if (sayisalDegerler[deger]) {
        return sayisalDegerler[deger];
      }

      const metinselDegerler: Record<string, string> = {
        BEKAR: "Bekâr",

        EVLI: "Evli",

        BOŞANMIS: "Boşanmış",

        DUL: "Dul",
      };

      if (metinselDegerler[deger]) {
        return metinselDegerler[deger];
      }

      if (!Number.isNaN(Number(deger))) {
        return "";
      }

      return deger;
    },

    [],
  );

  /*

   * =========================================================

   * KULLANICI GETİR

   * =========================================================

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
        console.error("KULLANICI BİLGİSİ HATASI:", error);

        return null;
      }
    },

    [],
  );

  /*

   * =========================================================

   * PROFİLLERİ GETİR

   * =========================================================

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
          console.error("PROFİLLER ALINAMADI:", response.status, responseText);

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
        console.error("PROFİLLER HATASI:", error);

        return [];
      }
    },

    [],
  );

  /*

   * =========================================================

   * BENİ BEĞENENLERİ GETİR

   * =========================================================

   */

  const begenenleriGetir = useCallback(async () => {
    try {
      setYukleniyor(true);

      setHata("");

      /*

       * TOKEN

       */

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("Oturum bulunamadı.");
      }

      /*

       * MEVCUT KULLANICI

       */

      const userId = await AsyncStorage.getItem("userId");

      if (!userId) {
        throw new Error("Kullanıcı ID bulunamadı.");
      }

      const kullaniciId = Number(userId);

      if (!Number.isFinite(kullaniciId) || kullaniciId <= 0) {
        throw new Error("Kullanıcı ID bulunamadı.");
      }

      /*

       * =================================================

       * 1 - BENİ BEĞENENLER

       *

       * GERÇEK ENDPOINT:

       *

       * GET

       * /api/likes/beni-begenenler/{kullaniciId}

       * =================================================

       */

      const response = await fetch(
        `${API_ADRESI}/likes/beni-begenenler/${kullaniciId}`,

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
        throw new Error(responseText || "Beni beğenenler alınamadı.");
      }

      let begeniler: LikeDto[] = [];

      if (responseText.trim()) {
        const veri = JSON.parse(responseText);

        if (Array.isArray(veri)) {
          begeniler = veri as LikeDto[];
        } else if (Array.isArray(veri?.content)) {
          begeniler = veri.content as LikeDto[];
        }
      }

      /*

       * =================================================

       * 2 - PROFİLLER

       * =================================================

       */

      const profiller = await profilleriGetir(token);

      /*

       * =================================================

       * 3 - KULLANICI BİLGİLERI

       * =================================================

       */

      const sonuc = await Promise.all(
        begeniler.map(async (begeni) => {
          const begenenKullaniciId = Number(begeni.userId);

          const kullanici = await kullaniciGetir(begenenKullaniciId, token);

          const profil =
            profiller.find(
              (item) => Number(item.userId) === begenenKullaniciId,
            ) ?? null;

          return {
            begeni,

            kullanici,

            profil,
          };
        }),
      );

      setBegenenler(sonuc);
    } catch (error) {
      console.error("BEĞENENLER HATASI:", error);

      setHata(error instanceof Error ? error.message : "Beğenenler alınamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, [kullaniciGetir, profilleriGetir]);

  /*

   * =========================================================

   * SAYFA AÇILINCA

   * =========================================================

   */

  useEffect(() => {
    void begenenleriGetir();
  }, [begenenleriGetir]);

  /*

   * =========================================================

   * PROFILE GİT

   * =========================================================

   */

  const profileGit = (kullaniciId: number) => {
    navigation.navigate("user", { id: String(kullaniciId) });
  };

  /*

   * =========================================================

   * GERİ

   * =========================================================

   */

  const geriDon = () => {
    navigation.goBack();
  };

  /*

   * =========================================================

   * YÜKLENİYOR

   * =========================================================

   */

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.yukleniyorContainer}>
          <ActivityIndicator size="large" color="#E83E70" />

          <Text style={styles.yukleniyorText}>
            Seni beğenenler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*

   * =========================================================

   * EKRAN

   * =========================================================

   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContainer}
      >
        {/* GERİ */}

        <Pressable style={styles.geriButonu} onPress={geriDon}>
          <Text style={styles.geriIcon}>‹</Text>

          <Text style={styles.geriText}>Geri</Text>
        </Pressable>

        {/* BAŞLIK */}

        <View style={styles.baslikKart}>
          <View style={styles.baslikIkonKutusu}>
            <Text style={styles.baslikIkon}>♡</Text>
          </View>

          <View style={styles.baslikBilgi}>
            <Text style={styles.baslik}>Seni Beğenenler</Text>

            <Text style={styles.baslikAciklama}>
              Seni beğenen kişileri gör.
            </Text>
          </View>
        </View>

        {/* HATA */}

        {hata ? (
          <View style={styles.hataKart}>
            <Text style={styles.hataBaslik}>Bir hata oluştu</Text>

            <Text style={styles.hataText}>{hata}</Text>

            <Pressable style={styles.tekrarButonu} onPress={begenenleriGetir}>
              <Text style={styles.tekrarButonuText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : null}

        {/* KAYIT YOK */}

        {!hata && begenenler.length === 0 ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosIkon}>♡</Text>

            <Text style={styles.bosBaslik}>Henüz seni beğenen yok</Text>

            <Text style={styles.bosText}>
              Seni beğenen kişiler burada görünecek.
            </Text>
          </View>
        ) : null}

        {/* BEĞENENLER */}

        <View style={styles.liste}>
          {begenenler.map(({ begeni, kullanici, profil }) => {
            const yas = yasHesapla(kullanici?.birthDate);

            const adSoyad = [kullanici?.firstName, kullanici?.lastName]

              .filter(Boolean)

              .join(" ");

            const foto = fotoUrlOlustur(
              profil?.profilePhoto ?? kullanici?.profilePhoto ?? null,
            );

            const begenenKullaniciId = Number(begeni.userId);

            const medeniDurum = medeniDurumGetir(profil?.maritalStatus);

            return (
              <View key={begeni.id} style={styles.kullaniciKart}>
                <View style={styles.kullaniciUst}>
                  {/* AVATAR */}

                  <View style={styles.fotoContainer}>
                    {foto ? (
                      <Image
                        source={{
                          uri: foto,
                        }}

                        style={styles.foto}

                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fotoPlaceholder}>
                        <Text style={styles.fotoPlaceholderText}>
                          {(adSoyad || kullanici?.username || "?")

                            .charAt(0)

                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* BİLGİLER */}

                  <View style={styles.bilgiler}>
                    <Text style={styles.adSoyad} numberOfLines={1}>
                      {adSoyad ||
                        kullanici?.username ||
                        `Kullanıcı #${begenenKullaniciId}`}
                    </Text>

                    {kullanici?.username ? (
                      <Text style={styles.kullaniciAdi} numberOfLines={1}>
                        @{kullanici.username}
                      </Text>
                    ) : null}

                    {yas !== null ? (
                      <Text style={styles.detay}>{yas} yaşında</Text>
                    ) : null}

                    {kullanici?.city ? (
                      <Text style={styles.detay}>{kullanici.city}</Text>
                    ) : null}

                    {medeniDurum ? (
                      <Text style={styles.detay}>
                        Medeni durum: {medeniDurum}
                      </Text>
                    ) : null}

                    {kullanici?.gender ? (
                      <Text style={styles.detay}>{kullanici.gender}</Text>
                    ) : null}

                    <Text style={styles.begeniBilgisi}>Seni beğendi ♡</Text>
                  </View>
                </View>

                {/* PROFİLİ GÖR */}

                <Pressable
                  style={styles.profilButonu}

                  onPress={() => profileGit(begenenKullaniciId)}
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

    backgroundColor: "#FFF8F4",
  },

  scrollContainer: {
    paddingHorizontal: 16,

    paddingBottom: 30,
  },

  yukleniyorContainer: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 30,
  },

  yukleniyorText: {
    marginTop: 14,

    fontSize: 15,

    color: "#9d174d",

    fontWeight: "600",

    textAlign: "center",
  },

  geriButonu: {
    alignSelf: "flex-start",

    minHeight: 48,

    flexDirection: "row",

    alignItems: "center",

    marginTop: 8,

    marginBottom: 12,
  },

  geriIcon: {
    fontSize: 36,

    lineHeight: 36,

    color: "#A12E4A",

    marginRight: 3,
  },

  geriText: {
    fontSize: 15,

    fontWeight: "700",

    color: "#A12E4A",
  },

  baslikKart: {
    flexDirection: "row",

    alignItems: "center",

    padding: 18,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#F2B6C5",

    backgroundColor: "#FCE8EC",

    marginBottom: 18,
  },

  baslikIkonKutusu: {
    width: 58,

    height: 58,

    minWidth: 58,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#fce7f3",
  },

  baslikIkon: {
    fontSize: 32,

    color: "#E83E70",
  },

  baslikBilgi: {
    flex: 1,

    marginLeft: 14,
  },

  baslik: {
    fontSize: 21,

    fontWeight: "800",

    color: "#9d174d",
  },

  baslikAciklama: {
    marginTop: 4,

    fontSize: 14,

    color: "#78716c",
  },

  hataKart: {
    padding: 18,

    borderRadius: 16,

    backgroundColor: "#FCE8EC",

    borderWidth: 1,

    borderColor: "#fecdd3",

    marginBottom: 18,
  },

  hataBaslik: {
    fontSize: 17,

    fontWeight: "800",

    color: "#be123c",

    marginBottom: 7,
  },

  hataText: {
    fontSize: 14,

    lineHeight: 21,

    color: "#881337",
  },

  tekrarButonu: {
    marginTop: 14,

    minHeight: 44,

    borderRadius: 12,

    backgroundColor: "#E83E70",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 16,
  },

  tekrarButonuText: {
    color: "#FFFCFA",

    fontSize: 14,

    fontWeight: "700",
  },

  bosKart: {
    padding: 30,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#eadcff",

    backgroundColor: "#FFFCFA",

    alignItems: "center",

    marginBottom: 18,
  },

  bosIkon: {
    fontSize: 55,

    color: "#E83E70",
  },

  bosBaslik: {
    marginTop: 14,

    fontSize: 18,

    fontWeight: "700",

    color: "#7A263C",

    textAlign: "center",
  },

  bosText: {
    marginTop: 8,

    fontSize: 14,

    lineHeight: 21,

    color: "#78716c",

    textAlign: "center",
  },

  liste: {
    width: "100%",
  },

  kullaniciKart: {
    marginBottom: 16,

    padding: 16,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#eadcff",

    backgroundColor: "#FFFCFA",
  },

  kullaniciUst: {
    flexDirection: "row",

    alignItems: "flex-start",
  },

  fotoContainer: {
    width: 82,

    height: 82,

    borderRadius: 41,

    overflow: "hidden",

    backgroundColor: "#fce7f3",

    flexShrink: 0,
  },

  foto: {
    width: 82,

    height: 82,
  },

  fotoPlaceholder: {
    width: 82,

    height: 82,

    borderRadius: 41,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#fce7f3",
  },

  fotoPlaceholderText: {
    fontSize: 32,

    fontWeight: "800",

    color: "#E83E70",
  },

  bilgiler: {
    flex: 1,

    minWidth: 0,

    marginLeft: 14,
  },

  adSoyad: {
    fontSize: 18,

    fontWeight: "800",

    color: "#7A263C",
  },

  kullaniciAdi: {
    marginTop: 3,

    fontSize: 14,

    color: "#78716c",
  },

  detay: {
    marginTop: 5,

    fontSize: 14,

    color: "#57534e",
  },

  begeniBilgisi: {
    marginTop: 8,

    fontSize: 14,

    fontWeight: "700",

    color: "#E83E70",
  },

  profilButonu: {
    marginTop: 16,

    minHeight: 48,

    borderRadius: 14,

    backgroundColor: "#8F2942",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 16,
  },

  profilButonuText: {
    color: "#FFFCFA",

    fontSize: 15,

    fontWeight: "800",
  },
});
