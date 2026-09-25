import React, { useCallback, useEffect, useState } from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from "react-native";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
import ProfileHeader from "../components/profile/ProfileHeader";
import UserInfo from "../components/profile/UserInfo";
import ProfileInfo from "../components/profile/ProfileInfo";
import ProfileQuestions from "../components/profile/ProfileQuestions";
import ProfileActions from "../components/profile/ProfileActions";
import ProfileLoading from "../components/profile/ProfileLoading";
import ProfileError from "../components/profile/ProfileError";

const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;
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
  const router = useRouter();

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
      console.log("ENUM GETIRME HATASI:", error);
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
        console.log("SORU CEVAP GETIRME HATASI:", error);

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
      setSoruCevapHatasi("�-nce profil bilgilerinizi olu�Yturmaniz gerekiyor.");
      return;
    }

    try {
      setSoruCevapKaydediliyor(true);
      setSoruCevapHatasi("");

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      /*
       * Backend'deki mevcut cevaplari tekrar aliyoruz.
       * B�ylece kayit sirasinda eski cevap ID'leri g�ncel kalir.
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
       * Her aktif soru i�in:
       * - Yeni cevap varsa POST
       * - Mevcut cevap de�Yi�Ymi�Yse PUT
       * - Cevap tamamen kaldirilmı�Ysa DELETE
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
              const hataMetni = await response.text();
              throw new Error(
                hataMetni || `Cevap kaydedilemedi. HTTP ${response.status}`,
              );
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
              const hataMetni = await response.text();
              throw new Error(
                hataMetni || `Cevap g�ncellenemedi. HTTP ${response.status}`,
              );
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
            const hataMetni = await response.text();
            throw new Error(
              hataMetni || `Cevap silinemedi. HTTP ${response.status}`,
            );
          }
        }
      }

      /*
       * Kayit sonrasi backend'deki son durumu tekrar �ekiyoruz.
       */
      await soruCevaplariGetir(token, profil.id);

      Alert.alert("Ba�Yarili", "Profil cevaplariniz ba�Yariyla kaydedildi.");
    } catch (error) {
      console.log("SORU CEVAP KAYDETME HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil cevaplari kaydedilirken bir hata olu�Ytu.";

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

      console.log("KENDI PROFIL TOKEN VAR MI:", !!token);

      console.log("KENDI PROFIL USER ID:", kayitliUserId);

      /*
       * TOKEN YOK
       */

      if (!token) {
        router.replace("/");
        return;
      }

      /*
       * USER ID YOK
       */

      if (!kayitliUserId) {
        setHata("Kullanici bilgisi bulunamadi.");

        return;
      }

      const userId = Number(kayitliUserId);

      /*
       * USER ID GE�?ERSIZ
       */

      if (!Number.isFinite(userId) || userId <= 0) {
        setHata("Ge�ersiz kullanici bilgisi.");

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

        // Kendi profilimizi do�Yrudan /profiles/me �zerinden aliyoruz.
        // /profiles listesinde ba�Yka bir kullanicinin profili gelebilece�Yi
        // i�in burada userId ile liste i�inde arama yapmiyoruz.
        fetch(`${API_ADRESI}/profiles/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }),
      ]);

      console.log("KENDI PROFIL USER STATUS:", kullaniciResponse.status);
      console.log("KENDI PROFIL PROFILE/ME STATUS:", profilResponse.status);

      /*
       * USER HATASI
       */

      if (!kullaniciResponse.ok) {
        throw new Error(
          `Kullanici bilgisi alinamadi. HTTP ${kullaniciResponse.status}`,
        );
      }

      /*
       * PROFILE HATASI
       */

      if (!profilResponse.ok) {
        throw new Error(
          `Profil bilgisi alinamadi. HTTP ${profilResponse.status}`,
        );
      }

      /*
       * JSON
       */

      const kullaniciVerisi = await kullaniciResponse.json();
      const profilVerisi = await profilResponse.json();

      console.log("KENDI PROFIL KULLANICI:", kullaniciVerisi);
      console.log("KENDI PROFIL VERISI:", profilVerisi);

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
      console.log("KENDI PROFIL HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil y�klenirken bir hata olu�Ytu.";

      setHata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  }, [router, enumlariGetir, soruCevaplariGetir]);

  /*
   * =======================================================
   * SAYFA A�?ILINCA PROFIL GETIR
   * =======================================================
   */

  useEffect(() => {
    profilGetir();
  }, [profilGetir]);

  /*
   * =======================================================
   * FOTOGRAF URL
   * =======================================================
   */

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

  /*
   * =======================================================
   * GERI D�-N
   * =======================================================
   */

  const geriDon = () => {
    router.back();
  };

  /*
   * =======================================================
   * PROFIL G�oNCELLE
   * =======================================================
   */

  const profilGuncelle = () => {
    router.push("/profile/edit");
  };
  const ayarlaraGit = () => {
    router.push("/settings");
  };
  /*
   * =======================================================
   * Y�oKLENIYOR
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

  const fotoUrl = fotoUrlOlustur(profil?.profilePhoto);

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
   * USER INFO İ�?IN TAM MODEL
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
   * PROFILE INFO İ�?IN MODEL
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
        {/*
         * =================================================
         * �oST BAR
         * =================================================
         */}

        <View style={styles.ustBar}>
          <Pressable style={styles.geri} onPress={geriDon}>
            <Text style={styles.geriIcon}>�?�</Text>

            <Text style={styles.geriText}>Geri</Text>
          </Pressable>

          <Text style={styles.ustBaslik}>Profilim</Text>

          <View
            style={{
              width: 60,
            }}
          />
        </View>

        {/*
         * =================================================
         * PROFIL HEADER
         * =================================================
         */}

        <ProfileHeader
          user={{
            id: kullanici.id,
            username: kullanici.username,
            firstName: kullanici.firstName || "",
            lastName: kullanici.lastName || "",
            profilePhoto: profil?.profilePhoto || null,
          }}
        />

        {/*
         * =================================================
         * FOTOGRAF + �?EVRIMİ�?I BILGISI
         *
         * Mevcut tasarimdaki foto�Yraf ve
         * online bilgisini koruyoruz.
         * =================================================
         */}

        <View style={styles.profilKart}>
          <View style={styles.fotoContainer}>
            {fotoUrl ? (
              <View>
                <View style={styles.profilFotoWrapper}>
                  {/*
                   * ProfileHeader componenti
                   * adi g�steriyor.
                   *
                   * Foto�Yrafi burada ayrica
                   * mevcut tasarimdaki gibi
                   * g�steriyoruz.
                   */}
                  <Pressable onPress={() => {}}>
                    <View style={styles.profilFoto}>
                      <Text style={styles.fotoPlaceholderText}>
                        {adSoyad.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.fotoYok}>
                <Text style={styles.fotoYokText}>
                  {adSoyad.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}

            {kullanici.online && <View style={styles.onlineNokta} />}
          </View>

          <Text style={styles.adSoyad}>{adSoyad || kullanici.username}</Text>

          <Text style={styles.kullaniciAdi}>@{kullanici.username}</Text>

          {kullanici.city && (
            <Text style={styles.sehir}>gY"� {kullanici.city}</Text>
          )}

          {kullanici.online && (
            <View style={styles.onlineEtiket}>
              <Text style={styles.onlineText}>�?evrimi�i</Text>
            </View>
          )}

          {profil?.profileVerified && (
            <View style={styles.dogrulamaEtiket}>
              <Text style={styles.dogrulamaText}>�o" Profil Do�Yrulandi</Text>
            </View>
          )}
        </View>

        {/*
         * =================================================
         * PROFIL G�oNCELLE
         * =================================================
         */}

        <View style={styles.guncelleContainer}>
          <Pressable style={styles.guncelleButonu} onPress={profilGuncelle}>
            <Text style={styles.guncelleButonuText}>�o� Profili G�ncelle</Text>
          </Pressable>
        </View>

        {/*
         * =================================================
         * KULLANICI BILGILERI
         * =================================================
         */}

        <UserInfo user={userInfoModel} />

        {/*
         * =================================================
         * PROFIL BILGILERI
         * =================================================
         */}

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
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>Profil Bilgileri</Text>

            <Text style={styles.bilgiYok}>
              Hen�z profil bilgilerinizi tamamlamadiniz.
            </Text>
          </View>
        )}

        {/*
         * =================================================
         * SORULAR VE CEVAPLAR
         * =================================================
         */}

        {profil && (
          <View style={styles.soruCevapBolumu}>
            {soruCevapYukleniyor ? (
              <View style={styles.soruCevapYukleniyor}>
                <Text style={styles.soruCevapYukleniyorText}>
                  Sorular ve cevaplar y�kleniyor...
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
        )}

        {/*
         * =================================================
         * PROFIL ISLEMLERI
         * =================================================
         */}

        <View style={styles.actionsContainer}>
          <ProfileActions />

          <Pressable style={styles.ayarlarButonu} onPress={ayarlaraGit}>
            <Text style={styles.ayarlarButonuText}>�sT Ayarlar</Text>
          </Pressable>
        </View>
        {/*
         * =================================================
         * ALT BOSLUK
         * =================================================
         */}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scrollContainer: {
    paddingBottom: 30,
  },
  /*AYARLAR
   */

  ayarlarButonu: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  ayarlarButonuText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },

  /*
   * �oST BAR
   */

  ustBar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  geri: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
  },

  geriIcon: {
    fontSize: 36,
    lineHeight: 36,
    marginRight: 3,
    color: "#d63384",
  },

  geriText: {
    fontSize: 16,
    color: "#d63384",
    fontWeight: "600",
  },

  ustBaslik: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222222",
  },

  /*
   * PROFIL KARTI
   */

  profilKart: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  /*
   * FOTOGRAF
   */

  fotoContainer: {
    position: "relative",
    marginBottom: 15,
  },

  profilFotoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: "hidden",
    backgroundColor: "#eeeeee",
  },

  profilFoto: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#f3d1e1",
    justifyContent: "center",
    alignItems: "center",
  },

  fotoPlaceholderText: {
    fontSize: 52,
    fontWeight: "700",
    color: "#d63384",
  },

  fotoYok: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#f3d1e1",
    justifyContent: "center",
    alignItems: "center",
  },

  fotoYokText: {
    fontSize: 52,
    fontWeight: "700",
    color: "#d63384",
  },

  /*
   * ONLINE
   */

  onlineNokta: {
    position: "absolute",
    right: 5,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#25c45a",
    borderWidth: 3,
    borderColor: "#ffffff",
  },

  onlineEtiket: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#e8f8ee",
  },

  onlineText: {
    color: "#16863c",
    fontWeight: "600",
    fontSize: 13,
  },

  /*
   * AD SOYAD
   */

  adSoyad: {
    fontSize: 26,
    fontWeight: "700",
    color: "#222222",
    textAlign: "center",
  },

  kullaniciAdi: {
    marginTop: 4,
    fontSize: 15,
    color: "#777777",
  },

  sehir: {
    marginTop: 8,
    fontSize: 15,
    color: "#555555",
  },

  /*
   * DOGRULAMA
   */

  dogrulamaEtiket: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#fce8f2",
  },

  dogrulamaText: {
    color: "#d63384",
    fontWeight: "600",
    fontSize: 13,
  },

  /*
   * G�oNCELLE
   */

  guncelleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  guncelleButonu: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#d63384",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  guncelleButonuText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  /*
   * B�-L�oM
   */

  bolum: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eeeeee",
  },

  bolumBaslik: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 12,
  },

  bilgiYok: {
    fontSize: 15,
    color: "#888888",
    lineHeight: 22,
  },

  /*
   * SORU CEVAP
   */

  soruCevapBolumu: {
    width: "100%",
  },

  soruCevapYukleniyor: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },

  soruCevapYukleniyorText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },

  /*
   * ACTIONS
   */

  actionsContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },

  /*
   * ALT BOSLUK
   */

  altBosluk: {
    height: 20,
  },
});

