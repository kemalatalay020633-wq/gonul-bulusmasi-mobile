import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNavigation } from "@react-navigation/native";

// src/app/home.tsx

import ProfileError from "../components/profile/ProfileError";

import ProfileInfo from "../components/profile/ProfileInfo";

import ProfileLoading from "../components/profile/ProfileLoading";

import ProfileQuestions from "../components/profile/ProfileQuestions";

import UserInfo from "../components/profile/UserInfo";

import KimlikDogrulamaliAvatar from "../components/common/KimlikDogrulamaliAvatar";

import { API_BASE_URL } from "../config/api";

const API_ADRESI = API_BASE_URL + "/api";

/*

 * =========================================================

 * KULLANICI

 * =========================================================

 */

type Kullanici = {
  id: number;

  username: string;

  email?: string;

  firstName?: string;

  lastName?: string;

  birthDate?: string;

  phoneNumber?: string;

  city?: string;

  active?: boolean;

  online?: boolean;

  emailVerified?: boolean;

  phoneVerified?: boolean;
};

/*

 * =========================================================

 * PROFIL

 * =========================================================

 */

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

/*

 * =========================================================

 * ENUM

 * =========================================================

 */

type EnumSecenegi = {
  kod: number;

  aciklama: string;
};

/*

 * =========================================================

 * PROFIL SORUSU

 * =========================================================

 */

type ProfilSorusu = {
  id: number;

  question: string;

  category: string | null;

  type: string | null;

  required: boolean;

  active: boolean;

  options: string | null;
};

/*

 * =========================================================

 * PROFIL CEVABI

 * =========================================================

 */

type ProfilCevabi = {
  id: number;

  profileId?: number;

  questionId?: number;

  answer: string;
};

/*

 * =========================================================

 * ANA COMPONENT

 * =========================================================

 */

export default function Profil() {
  const navigation = useNavigation<any>();

  const [kullanici, setKullanici] = useState<Kullanici | null>(null);

  const [profil, setProfil] = useState<Profil | null>(null);

  const [yukleniyor, setYukleniyor] = useState(true);

  const [hata, setHata] = useState("");

  /*

   * =======================================================

   * ENUM LISTELERI

   * =======================================================

   */

  const [meslekler, setMeslekler] = useState<EnumSecenegi[]>([]);

  const [egitimler, setEgitimler] = useState<EnumSecenegi[]>([]);

  const [medeniDurumlar, setMedeniDurumlar] = useState<EnumSecenegi[]>([]);

  const [mezhepler, setMezhepler] = useState<EnumSecenegi[]>([]);

  const [ilgiAlanlari, setIlgiAlanlari] = useState<EnumSecenegi[]>([]);

  /*

   * =======================================================

   * SORU CEVAP

   * =======================================================

   */

  const [sorular, setSorular] = useState<ProfilSorusu[]>([]);

  const [soruCevaplari, setSoruCevaplari] = useState<Record<number, string[]>>(
    {},
  );

  const [soruCevapYukleniyor, setSoruCevapYukleniyor] = useState(false);

  const [soruCevapKaydediliyor, setSoruCevapKaydediliyor] = useState(false);

  const [soruCevapHatasi, setSoruCevapHatasi] = useState("");

  /*

   * =======================================================

   * ENUM GETIR

   * =======================================================

   */

  const enumlariGetir = useCallback(async (token: string) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,

        Accept: "application/json",
      };

      const [
        meslekResponse,

        egitimResponse,

        medeniResponse,

        mezhepResponse,

        ilgiResponse,
      ] = await Promise.all([
        fetch(`${API_ADRESI}/enums/meslekler`, {
          method: "GET",

          headers,
        }),

        fetch(`${API_ADRESI}/enums/egitimler`, {
          method: "GET",

          headers,
        }),

        fetch(`${API_ADRESI}/enums/medeni-durumlar`, {
          method: "GET",

          headers,
        }),

        fetch(`${API_ADRESI}/enums/mezhepler`, {
          method: "GET",

          headers,
        }),

        fetch(`${API_ADRESI}/enums/ilgi-alanlari`, {
          method: "GET",

          headers,
        }),
      ]);

      if (meslekResponse.ok) {
        const data = await meslekResponse.json();

        if (Array.isArray(data)) {
          setMeslekler(data);
        }
      }

      if (egitimResponse.ok) {
        const data = await egitimResponse.json();

        if (Array.isArray(data)) {
          setEgitimler(data);
        }
      }

      if (medeniResponse.ok) {
        const data = await medeniResponse.json();

        if (Array.isArray(data)) {
          setMedeniDurumlar(data);
        }
      }

      if (mezhepResponse.ok) {
        const data = await mezhepResponse.json();

        if (Array.isArray(data)) {
          setMezhepler(data);
        }
      }

      if (ilgiResponse.ok) {
        const data = await ilgiResponse.json();

        if (Array.isArray(data)) {
          setIlgiAlanlari(data);
        }
      }
    } catch (error) {
      console.log("ENUM GETİRME HATASI:", error);
    }
  }, []);

  /*

   * =======================================================

   * SORU VE CEVAPLARI GETIR

   * =======================================================

   */

  const soruCevaplariGetir = useCallback(
    async (token: string, profileId: number) => {
      try {
        setSoruCevapYukleniyor(true);

        const headers = {
          Authorization: `Bearer ${token}`,

          Accept: "application/json",
        };

        /*

         * AKTIF SORULAR

         */

        const soruResponse = await fetch(
          `${API_ADRESI}/profile-questions/active`,

          {
            method: "GET",

            headers,
          },
        );

        if (!soruResponse.ok) {
          throw new Error(`Sorular alinamadi. HTTP ${soruResponse.status}`);
        }

        const soruVerisi = await soruResponse.json();

        /*

         * PROFIL CEVAPLARI

         */

        const cevapResponse = await fetch(
          `${API_ADRESI}/profile-answers/profile/${profileId}`,

          {
            method: "GET",

            headers,
          },
        );

        if (!cevapResponse.ok) {
          throw new Error(`Cevaplar alinamadi. HTTP ${cevapResponse.status}`);
        }

        const cevapVerisi = await cevapResponse.json();

        /*

         * SORULAR

         */

        if (Array.isArray(soruVerisi)) {
          setSorular(soruVerisi);
        } else if (Array.isArray(soruVerisi?.content)) {
          setSorular(soruVerisi.content);
        } else {
          setSorular([]);
        }

        /*

         * CEVAPLAR

         */

        let gelenCevaplar: ProfilCevabi[] = [];

        if (Array.isArray(cevapVerisi)) {
          gelenCevaplar = cevapVerisi;
        } else if (Array.isArray(cevapVerisi?.content)) {
          gelenCevaplar = cevapVerisi.content;
        }

        const temizCevaplar = gelenCevaplar.filter(
          (cevap: ProfilCevabi) =>
            typeof cevap.answer === "string" && cevap.answer.trim() !== "",
        );

        const seciliCevaplar: Record<number, string[]> = {};

        temizCevaplar.forEach((cevap) => {
          if (cevap.questionId === undefined || cevap.questionId === null) {
            return;
          }

          const parcalar = cevap.answer

            .split(",")

            .map((item) => item.trim())

            .filter(Boolean);

          seciliCevaplar[Number(cevap.questionId)] = parcalar;
        });

        setSoruCevaplari(seciliCevaplar);

        setSoruCevapHatasi("");
      } catch (error) {
        console.log("SORU CEVAP GETİRME HATASI:", error);

        setSorular([]);

        setSoruCevaplari({});
      } finally {
        setSoruCevapYukleniyor(false);
      }
    },

    [],
  );

  /*

   * =======================================================

   * RADIO CEVAP DEGISTIR

   * =======================================================

   */

  const radioCevapDegistir = (questionId: number, value: string) => {
    setSoruCevaplari((mevcut) => ({
      ...mevcut,

      [questionId]: [value],
    }));

    setSoruCevapHatasi("");
  };

  /*

   * =======================================================

   * CHECKBOX CEVAP DEGISTIR

   * =======================================================

   */

  const checkboxCevapDegistir = (questionId: number, value: string) => {
    setSoruCevaplari((mevcut) => {
      const secili = mevcut[questionId] || [];

      const yeniSecili = secili.includes(value)
        ? secili.filter((item) => item !== value)
        : [...secili, value];

      return {
        ...mevcut,

        [questionId]: yeniSecili,
      };
    });

    setSoruCevapHatasi("");
  };

  /*

   * =======================================================

   * PROFIL CEVAPLARINI KAYDET

   * =======================================================

   */

  const soruCevaplariniKaydet = async () => {
    if (!profil?.id) {
      setSoruCevapHatasi("Önce profil bilgilerinizi oluşturmanız gerekiyor.");

      return;
    }

    try {
      setSoruCevapKaydediliyor(true);

      setSoruCevapHatasi("");

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        navigation.replace("index");

        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,

        "Content-Type": "application/json",

        Accept: "application/json",
      };

      /*

       * Backend'deki mevcut cevaplari tekrar aliyoruz.

       * Böylece kayıt sırasında eski cevap ID'leri güncel kalır.

       */

      const mevcutResponse = await fetch(
        `${API_ADRESI}/profile-answers/profile/${profil.id}`,

        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,

            Accept: "application/json",
          },
        },
      );

      if (!mevcutResponse.ok) {
        throw new Error(
          `Mevcut cevaplar alinamadi. HTTP ${mevcutResponse.status}`,
        );
      }

      const mevcutVeri = await mevcutResponse.json();

      let mevcutCevaplar: ProfilCevabi[] = [];

      if (Array.isArray(mevcutVeri)) {
        mevcutCevaplar = mevcutVeri;
      } else if (Array.isArray(mevcutVeri?.content)) {
        mevcutCevaplar = mevcutVeri.content;
      }

      /*

       * Her aktif soru için:

       * - Yeni cevap varsa POST

       * - Mevcut cevap değişmişse PUT

       * - Cevap tamamen kaldırılmışsa DELETE

       */

      for (const soru of sorular) {
        const questionId = Number(soru.id);

        const secili = (soruCevaplari[questionId] || [])

          .map((item) => item.trim())

          .filter(Boolean);

        const yeniCevap = secili.join(",");

        const mevcutCevap = mevcutCevaplar.find(
          (cevap) => Number(cevap.questionId) === questionId,
        );

        if (yeniCevap) {
          if (!mevcutCevap) {
            const response = await fetch(`${API_ADRESI}/profile-answers`, {
              method: "POST",

              headers,

              body: JSON.stringify({
                profileId: profil.id,

                questionId,

                answer: yeniCevap,
              }),
            });

            if (!response.ok) {
              throw new Error("Cevap kaydedilemedi. Lütfen tekrar deneyin.");
            }
          } else if (String(mevcutCevap.answer || "").trim() !== yeniCevap) {
            const response = await fetch(
              `${API_ADRESI}/profile-answers/${mevcutCevap.id}`,

              {
                method: "PUT",

                headers,

                body: JSON.stringify({
                  profileId: profil.id,

                  questionId,

                  answer: yeniCevap,
                }),
              },
            );

            if (!response.ok) {
              throw new Error("Cevap güncellenemedi. Lütfen tekrar deneyin.");
            }
          }
        } else if (mevcutCevap) {
          const response = await fetch(
            `${API_ADRESI}/profile-answers/profile/${profil.id}/question/${questionId}`,

            {
              method: "DELETE",

              headers: {
                Authorization: `Bearer ${token}`,

                Accept: "application/json",
              },
            },
          );

          if (!response.ok && response.status !== 404) {
            throw new Error("Cevap silinemedi. Lütfen tekrar deneyin.");
          }
        }
      }

      /*

       * Kayıt sonrası backend'deki son durumu tekrar çekiyoruz.

       */

      await soruCevaplariGetir(token, profil.id);

      Alert.alert("Başarılı", "Profil cevaplarınız başarıyla kaydedildi.");
    } catch (error) {
      console.log("SORU CEVAP KAYDETME HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil cevapları kaydedilirken bir hata oluştu.";

      setSoruCevapHatasi(mesaj);
    } finally {
      setSoruCevapKaydediliyor(false);
    }
  };

  /*

   * =======================================================

   * PROFILI GETIR

   * =======================================================

   */

  const profilGetir = useCallback(async () => {
    try {
      setYukleniyor(true);

      setHata("");

      const token = await AsyncStorage.getItem("token");

      const kayitliUserId = await AsyncStorage.getItem("userId");

      console.log("KENDİ PROFİL TOKEN VAR MI:", !!token);

      console.log("KENDİ PROFİL USER ID:", kayitliUserId);

      /*

       * TOKEN YOK

       */

      if (!token) {
        navigation.replace("index");

        return;
      }

      /*

       * USER ID YOK

       */

      if (!kayitliUserId) {
        setHata("Kullanıcı bilgisi bulunamadı.");

        return;
      }

      const userId = Number(kayitliUserId);

      /*

       * USER ID GEÇERSİZ

       */

      if (!Number.isFinite(userId) || userId <= 0) {
        setHata("Geçersiz kullanıcı bilgisi.");

        return;
      }

      /*

       * USER + PROFILE

       */

      const [kullaniciResponse, profilResponse] = await Promise.all([
        fetch(`${API_ADRESI}/users/${userId}`, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",

            Accept: "application/json",
          },
        }),

        // Kendi profilimizi doğrudan /profiles/me üzerinden alıyoruz.

        // /profiles listesinde başka bir kullanıcının profili gelebileceği

        // için burada userId ile liste içinde arama yapmıyoruz.

        fetch(`${API_ADRESI}/profiles/me`, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",

            Accept: "application/json",
          },
        }),
      ]);

      console.log("KENDİ PROFİL USER STATUS:", kullaniciResponse.status);

      console.log("KENDİ PROFİL PROFILE/ME STATUS:", profilResponse.status);

      /*

       * USER HATASI

       */

      if (!kullaniciResponse.ok) {
        throw new Error(
          `Kullanıcı bilgisi alınamadı. HTTP ${kullaniciResponse.status}`,
        );
      }

      /*

       * PROFILE HATASI

       */

      if (!profilResponse.ok) {
        throw new Error(
          `Profil bilgisi alınamadı. HTTP ${profilResponse.status}`,
        );
      }

      /*

       * JSON

       */

      const kullaniciVerisi = await kullaniciResponse.json();

      const profilVerisi = await profilResponse.json();

      console.log("KENDİ PROFİL KULLANICI:", kullaniciVerisi);

      console.log("KENDİ PROFİL VERİSİ:", profilVerisi);

      /*

       * KENDI PROFILINI DOGRUDAN SET ET

       */

      const bulunanProfil: Profil = profilVerisi;

      setKullanici(kullaniciVerisi);

      setProfil(bulunanProfil || null);

      /*

       * ENUM'LARI GETIR

       */

      await enumlariGetir(token);

      /*

       * SORU CEVAPLARI

       */

      if (bulunanProfil?.id) {
        await soruCevaplariGetir(token, Number(bulunanProfil.id));
      } else {
        setSorular([]);

        setSoruCevaplari({});
      }
    } catch (error) {
      console.log("KENDİ PROFİL HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil yüklenirken bir hata oluştu.";

      setHata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  }, [navigation, enumlariGetir, soruCevaplariGetir]);

  /*

   * =======================================================

   * SAYFA AÇILINCA PROFİL GETİR

   * =======================================================

   */

  useEffect(() => {
    profilGetir();
  }, [profilGetir]);

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

   * PROFİL GÜNCELLE

   * =======================================================

   */

  const profilGuncelle = () => {
    navigation.navigate("profileEdit");
  };

  const ayarlaraGit = () => {
    navigation.navigate("settings");
  };

  /*

   * =======================================================

   * YÜKLENİYOR

   * =======================================================

   */

  if (yukleniyor) {
    return <ProfileLoading />;
  }

  /*

   * =======================================================

   * HATA

   * =======================================================

   */

  if (hata) {
    return <ProfileError error={hata} onHome={geriDon} />;
  }

  /*

   * =======================================================

   * KULLANICI YOK

   * =======================================================

   */

  if (!kullanici) {
    return <ProfileError error="Kullanici bulunamadi." onHome={geriDon} />;
  }

  /*

   * =======================================================

   * PROFIL FOTOGRAFI

   * =======================================================

   */

  /*

   * =======================================================

   * AD SOYAD

   * =======================================================

   */

  const adSoyad = `${kullanici.firstName || ""} ${
    kullanici.lastName || ""
  }`.trim();

  /*

   * =======================================================

   * USER INFO İÇİN TAM MODEL

   * =======================================================

   */

  const userInfoModel = {
    id: kullanici.id,

    username: kullanici.username || "",

    email: kullanici.email || "",

    firstName: kullanici.firstName || "",

    lastName: kullanici.lastName || "",

    birthDate: kullanici.birthDate || "",

    phoneNumber: kullanici.phoneNumber || null,

    profilePhoto: profil?.profilePhoto || null,

    city: kullanici.city || null,

    active: kullanici.active ?? false,

    emailVerified: kullanici.emailVerified ?? false,

    phoneVerified: kullanici.phoneVerified ?? false,

    createdAt: "",

    updatedAt: "",
  };

  /*

   * =======================================================

   * PROFILE INFO İÇİN MODEL

   * =======================================================

   */

  const profileInfoModel = {
    id: profil?.id || 0,

    userId: profil?.userId || kullanici.id,

    about: profil?.about || null,

    profession: profil?.profession ?? null,

    education: profil?.education ?? null,

    height: profil?.height ?? null,

    weight: profil?.weight ?? null,

    maritalStatus: profil?.maritalStatus ?? null,

    religion: profil?.religion ?? null,

    interests: profil?.interests ?? null,

    profilePhoto: profil?.profilePhoto || null,

    profileVerified: profil?.profileVerified ?? false,
  };

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
        <View style={styles.ustAlan}>
          <View style={styles.ustBar}>
            <Pressable style={styles.geri} onPress={geriDon}>
              <Text style={styles.geriIcon}>‹</Text>
            </Pressable>

            <View style={styles.baslikGrubu}>
              <Text style={styles.baslikIkon}>♙</Text>
              <Text style={styles.ustBaslik}>Profilim</Text>
              <View style={styles.baslikSusleme}>
                <View style={styles.suslemeCizgi} />
                <Text style={styles.suslemeKalp}>♡</Text>
                <View style={styles.suslemeCizgi} />
              </View>
            </View>

            <Pressable style={styles.ayarlarButonu} onPress={ayarlaraGit}>
              <Text style={styles.ayarlarButonuText}>⚙</Text>
            </Pressable>
          </View>

          <View style={styles.kahramanKart}>
            <View style={styles.fotoContainer}>
              <View style={styles.fotoGoldDis}>
                <View style={styles.profilFotoWrapper}>
                  <KimlikDogrulamaliAvatar
                    kullaniciId={kullanici.id}
                    boyut={124}
                    altYazi={adSoyad || kullanici.username}
                    style={styles.profilFotoWrapper}
                    imageStyle={styles.profilFoto}
                  />
                </View>
              </View>
              {kullanici.online && <View style={styles.onlineNokta} />}
              {profil?.profileVerified && (
                <View style={styles.fotoDogrulamaRozeti}>
                  <Text style={styles.fotoDogrulamaYazi}>✓</Text>
                </View>
              )}
            </View>

            <View style={styles.kullaniciOzet}>
              <Text style={styles.adSoyad}>
                {adSoyad || kullanici.username}
              </Text>
              <Text style={styles.kullaniciAdi}>@{kullanici.username}</Text>
              {kullanici.city ? (
                <Text style={styles.sehir}>⌖ {kullanici.city}</Text>
              ) : null}
              {kullanici.online ? (
                <View style={styles.onlineEtiket}>
                  <View style={styles.onlineEtiketNokta} />
                  <Text style={styles.onlineText}>Çevrimiçi</Text>
                </View>
              ) : (
                <View style={styles.cevrimdisiEtiket}>
                  <Text style={styles.cevrimdisiText}>Çevrimdışı</Text>
                </View>
              )}
              {profil?.profileVerified ? (
                <View style={styles.dogrulamaEtiket}>
                  <Text style={styles.dogrulamaText}>✓ Profil Doğrulandı</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable style={styles.guncelleButonu} onPress={profilGuncelle}>
            <Text style={styles.guncelleButonuText}>✎ Profili Düzenle</Text>
          </Pressable>
        </View>

        <View style={styles.bolumBaslikSatir}>
          <Text style={styles.bolumIkon}>✦</Text>
          <Text style={styles.bolumBaslikMetin}>Bilgilerim</Text>
        </View>

        <View style={styles.bilgiIkiSutun}>
          <View style={styles.bilgiSutunKart}>
            <Text style={styles.bilgiSutunBaslik}>Hesap Bilgilerim</Text>
            <UserInfo user={userInfoModel} />
          </View>

          <View style={styles.bilgiSutunKart}>
            <Text style={styles.bilgiSutunBaslik}>Profil Bilgilerim</Text>
            {profil ? (
              <ProfileInfo
                profile={profileInfoModel}
                meslekler={meslekler}
                egitimler={egitimler}
                medeniDurumlar={medeniDurumlar}
                mezhepler={mezhepler}
                ilgiAlanlari={ilgiAlanlari}
              />
            ) : (
              <Text style={styles.bilgiYok}>
                Henüz profil bilgilerinizi tamamlamadınız.
              </Text>
            )}
          </View>
        </View>
        {profil ? (
          <>
            {profil.about ? (
              <View style={styles.hakkimdaKart}>
                <Text style={styles.hakkimdaBaslik}>❝ Hakkımda</Text>
                <Text style={styles.hakkimdaMetin}>{profil.about}</Text>
              </View>
            ) : null}

            {profil.interests ? (
              <View style={styles.ilgiKart}>
                <Text style={styles.hakkimdaBaslik}>★ İlgi Alanlarım</Text>
                <Text style={styles.hakkimdaMetin}>
                  {String(profil.interests)}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {profil ? (
          <View style={styles.soruDisKart}>
            <View style={styles.soruBaslikSatir}>
              <Text style={styles.bolumIkon}>?</Text>
              <Text style={styles.bolumBaslikMetin}>Sorular & Cevaplar</Text>
            </View>
            {soruCevapYukleniyor ? (
              <View style={styles.soruCevapYukleniyor}>
                <Text style={styles.soruCevapYukleniyorText}>
                  Sorular ve cevaplar yükleniyor...
                </Text>
              </View>
            ) : (
              <ProfileQuestions
                questions={sorular}
                answers={soruCevaplari}
                error={soruCevapHatasi}
                saving={soruCevapKaydediliyor}
                onRadioChange={radioCevapDegistir}
                onCheckboxChange={checkboxCevapDegistir}
                onSave={soruCevaplariniKaydet}
              />
            )}
          </View>
        ) : null}

        <View style={styles.altSusleme}>
          <View style={styles.altSuslemeCizgi} />
          <Text style={styles.altKalp}>♡</Text>
          <View style={styles.altSuslemeCizgi} />
        </View>
        <View style={styles.altBosluk} />
      </ScrollView>
    </SafeAreaView>
  );
}

/*

 * =========================================================

 * STYLES

 * =========================================================

 */

const GOLD = "#F4C45B";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#180022" },
  scrollContainer: { paddingBottom: 28 },
  ustAlan: {
    backgroundColor: "#26002F",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  ustBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  geri: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#421052",
  },
  geriIcon: { color: "#FFFFFF", fontSize: 35, lineHeight: 39, marginTop: -4 },
  baslikGrubu: { flex: 1, alignItems: "center" },
  baslikIkon: { color: GOLD, fontSize: 25, marginBottom: -3 },
  ustBaslik: { fontSize: 25, fontWeight: "900", color: "#FFFFFF" },
  baslikSusleme: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 1,
  },
  suslemeCizgi: { width: 34, height: 2, backgroundColor: GOLD },
  suslemeKalp: { color: GOLD, fontSize: 22, lineHeight: 24 },
  ayarlarButonu: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: "#421052",
    alignItems: "center",
    justifyContent: "center",
  },
  ayarlarButonuText: { color: GOLD, fontSize: 24 },
  kahramanKart: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    gap: 16,
  },
  fotoContainer: { position: "relative" },
  fotoGoldDis: {
    width: 142,
    height: 142,
    borderRadius: 71,
    padding: 5,
    borderWidth: 3,
    borderColor: GOLD,
    backgroundColor: "#54116C",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  profilFotoWrapper: {
    width: 124,
    height: 124,
    borderRadius: 62,
    overflow: "hidden",
    backgroundColor: "#421052",
  },
  profilFoto: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "#421052",
  },
  onlineNokta: {
    position: "absolute",
    right: 5,
    bottom: 7,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#20D66B",
    borderWidth: 3,
    borderColor: "#300044",
  },
  fotoDogrulamaRozeti: {
    position: "absolute",
    right: -2,
    top: 7,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoDogrulamaYazi: { color: "#351044", fontSize: 21, fontWeight: "900" },
  kullaniciOzet: { flex: 1, minWidth: 0 },
  adSoyad: {
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  kullaniciAdi: { fontSize: 14, color: "#D8A9E8", marginBottom: 6 },
  sehir: { fontSize: 14, color: "#F6D477", marginBottom: 8 },
  onlineEtiket: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#123F2B",
    borderWidth: 1,
    borderColor: "#25D66B",
  },
  onlineEtiketNokta: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#25E878",
    marginRight: 6,
  },
  onlineText: { color: "#A7FFD0", fontWeight: "800", fontSize: 12 },
  cevrimdisiEtiket: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#3B2944",
    borderWidth: 1,
    borderColor: "#9B7BA8",
  },
  cevrimdisiText: { color: "#D8C4DF", fontWeight: "700", fontSize: 12 },
  dogrulamaEtiket: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#4A3510",
    borderWidth: 1,
    borderColor: GOLD,
  },
  dogrulamaText: { color: GOLD, fontWeight: "800", fontSize: 11 },
  guncelleButonu: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: GOLD,
    borderWidth: 1,
    borderColor: "#FFF0B3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 2,
  },
  guncelleButonuText: { color: "#351044", fontSize: 16, fontWeight: "900" },
  bolumBaslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  bolumIkon: { color: GOLD, fontSize: 23, fontWeight: "900", marginRight: 9 },
  bolumBaslikMetin: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  bilgiIkiSutun: {
    flexDirection: "column",
    alignItems: "stretch",
    marginHorizontal: 14,
    gap: 14,
  },
  bilgiSutunKart: {
    width: "100%",
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#31003F",
    borderWidth: 2,
    borderColor: GOLD,
    overflow: "hidden",
  },
  bilgiSutunBaslik: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 9,
  },
  bilesenKart: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 10,
    borderRadius: 22,
    backgroundColor: "#3A104A",
    borderWidth: 2,
    borderColor: GOLD,
    overflow: "hidden",
  },
  hakkimdaKart: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 17,
    borderRadius: 21,
    backgroundColor: "#3A104A",
    borderWidth: 2,
    borderColor: GOLD,
  },
  ilgiKart: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 17,
    borderRadius: 21,
    backgroundColor: "#3A104A",
    borderWidth: 2,
    borderColor: GOLD,
  },
  hakkimdaBaslik: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 9,
  },
  hakkimdaMetin: { color: "#F5EAF9", fontSize: 14, lineHeight: 22 },
  bilgiYok: { fontSize: 14, color: "#D8A9E8", lineHeight: 22, marginTop: 8 },
  soruDisKart: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 13,
    borderRadius: 22,
    backgroundColor: "#3A104A",
    borderWidth: 2,
    borderColor: GOLD,
  },
  soruBaslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  soruCevapYukleniyor: {
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: "#300044",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  soruCevapYukleniyorText: {
    fontSize: 14,
    color: "#E8D5EF",
    fontWeight: "600",
  },
  altSusleme: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 10,
  },
  altSuslemeCizgi: { height: 2, flex: 1, backgroundColor: GOLD, opacity: 0.8 },
  altKalp: { color: GOLD, fontSize: 35 },
  altBosluk: { height: 20 },
});
