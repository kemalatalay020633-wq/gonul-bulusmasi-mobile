import React, { useCallback, useEffect, useState } from "react";
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
import { API_BASE_URL } from "../config/api";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;

/*
 * =========================================================
 * BILDIRIM MODELI
 * =========================================================
 */

type Bildirim = {
  id?: number;
  kullaniciId?: number | null;
  ilgiliId?: number | null;
  tip?: string | null;
  mesaj?: string | null;
  okundu?: boolean;
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
 * FOTOGRAF URL
 * =========================================================
 */

const fotoUrlOlustur = (foto: string | null | undefined): string => {
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
    "2": "Bo�Yanmı�Y",
    "3": "Dul",
  };

  if (sayisalDegerler[deger]) {
    return sayisalDegerler[deger];
  }

  const metinselDegerler: Record<string, string> = {
    BEKAR: "Bekar",
    EVLI: "Evli",
    BOSANMIS: "Bosanmis",
    DUL: "Dul",
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
  const router = useRouter();

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
            .map((bildirim) => Number(bildirim.ilgiliId))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      /*
       * Hİ�? KIMSE YOK
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
          : "Profilinize bakan kullanicilar alinirken bir hata olu�Ytu.",
      );
    } finally {
      setYukleniyor(false);
    }
  }, [bildirimleriGetir, kullaniciGetir, profilleriGetir]);

  /*
   * =======================================================
   * SAYFA A�?ILINCA
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
    router.push(`/user/${kullaniciId}`);
  };

  /*
   * =======================================================
   * GERI
   * =======================================================
   */

  const geriDon = () => {
    router.back();
  };

  /*
   * =======================================================
   * Y�oKLENIYOR
   * =======================================================
   */

  if (yukleniyor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.yukleniyorContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />

          <Text style={styles.yukleniyorText}>
            Profilinize bakanlar y�kleniyor...
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
         * =================================================
         * BASLIK
         * =================================================
         */}

        <View style={styles.ustBar}>
          <Pressable style={styles.geriButonu} onPress={geriDon}>
            <Text style={styles.geriIcon}>�?�</Text>

            <Text style={styles.geriText}>Geri</Text>
          </Pressable>

          <View style={styles.baslikAlani}>
            <Text style={styles.baslikIcon}>gY'?</Text>

            <Text style={styles.baslik}>Profilime Bakanlar</Text>
          </View>

          <View style={styles.ustBosluk} />
        </View>

        {/*
         * =================================================
         * HATA
         * =================================================
         */}

        {hata ? (
          <View style={styles.hataKart}>
            <Text style={styles.hataBaslik}>Bir hata olu�Ytu</Text>

            <Text style={styles.hataText}>{hata}</Text>

            <Pressable style={styles.tekrarButonu} onPress={yukle}>
              <Text style={styles.tekrarButonuText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : null}

        {/*
         * =================================================
         * KIMSE YOK
         * =================================================
         */}

        {!hata && kullanicilar.length === 0 ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosIcon}>gY'?</Text>

            <Text style={styles.bosBaslik}>Hen�z profilinize bakan yok</Text>

            <Text style={styles.bosText}>
              Profilinizi g�r�nt�leyen kullanicilar burada g�r�necek.
            </Text>
          </View>
        ) : null}

        {/*
         * =================================================
         * KULLANICI LISTESI
         * =================================================
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
             * FOTOGRAF
             */

            const foto = fotoUrlOlustur(
              profil?.profilePhoto ?? kullanici.profilePhoto ?? null,
            );

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
                        {yas !== null ? `${yas} ya�Y` : ""}

                        {yas !== null && kullanici.city ? " � " : ""}

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
                      Profilinizi g�r�nt�ledi gY'?
                    </Text>
                  </View>
                </View>

                {/*
                 * PROFILI G�-R
                 */}

                <Pressable
                  style={styles.profilButonu}
                  onPress={() => profileGit(kullanici.id)}
                >
                  <Text style={styles.profilButonuText}>gY'� Profili G�r</Text>
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
    backgroundColor: "#faf7ff",
  },

  scrollContainer: {
    paddingBottom: 30,
  },

  /*
   * Y�oKLENIYOR
   */

  yukleniyorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  yukleniyorText: {
    marginTop: 14,
    fontSize: 15,
    color: "#5b21b6",
    fontWeight: "600",
    textAlign: "center",
  },

  /*
   * �oST BAR
   */

  ustBar: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd6fe",
    backgroundColor: "#faf7ff",
  },

  geriButonu: {
    width: 80,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },

  geriIcon: {
    fontSize: 36,
    lineHeight: 36,
    color: "#6d28d9",
    marginRight: 2,
  },

  geriText: {
    fontSize: 15,
    color: "#6d28d9",
    fontWeight: "700",
  },

  baslikAlani: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  baslikIcon: {
    fontSize: 25,
    marginRight: 7,
  },

  baslik: {
    fontSize: 19,
    fontWeight: "800",
    color: "#5b21b6",
    textAlign: "center",
  },

  ustBosluk: {
    width: 80,
  },

  /*
   * HATA
   */

  hataKart: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
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
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  tekrarButonuText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  /*
   * BOS
   */

  bosKart: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#ffffff",
  },

  bosIcon: {
    fontSize: 54,
    marginBottom: 8,
  },

  bosBaslik: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5b21b6",
    textAlign: "center",
  },

  bosText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#78716c",
    textAlign: "center",
  },

  /*
   * LISTE
   */

  liste: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  /*
   * KULLANICI KARTI
   */

  kullaniciKart: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },

  kullaniciUst: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  /*
   * FOTOGRAF
   */

  fotoContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: "hidden",
    backgroundColor: "#ede9fe",
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
    backgroundColor: "#ede9fe",
  },

  fotoPlaceholderText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#7c3aed",
  },

  /*
   * BILGILER
   */

  bilgiler: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  adSoyad: {
    fontSize: 19,
    fontWeight: "800",
    color: "#5b21b6",
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

  bakanBilgisi: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#7c3aed",
  },

  /*
   * PROFIL BUTONU
   */

  profilButonu: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  profilButonuText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
