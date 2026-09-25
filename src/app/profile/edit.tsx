import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import ProfileQuestions from "../../components/profile/ProfileQuestions";
// src/app/home.tsx
// src/app/profile/edit.tsx
import { API_BASE_URL } from "../../config/api";
const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;

type Kullanici = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phoneNumber?: string | null;
  city?: string | null;
  active?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

type Profil = {
  id?: number;
  userId?: number;
  about?: string | null;
  profession?: number | string | null;
  education?: number | string | null;
  height?: number | null;
  weight?: number | null;
  maritalStatus?: number | string | null;
  religion?: number | string | null;
  interests?: string | number | null;
  profilePhoto?: string | null;
  profileVerified?: boolean;
};

type EnumSecenegi = {
  kod: number | string;
  aciklama: string;
};

type ProfilSorusu = {
  id: number;
  question: string;
  category: string | null;
  type: string | null;
  required: boolean;
  active: boolean;
  options: string | null;
};

type ProfilCevabi = {
  id: number;
  profileId: number;
  questionId: number;
  answer: string;
};

export default function ProfilGuncelle() {
  const router = useRouter();

  const [kullanici, setKullanici] = useState<Kullanici | null>(null);

  const [profil, setProfil] = useState<Profil | null>(null);

  /*
   * =====================================================
   * KISISEL BILGILER
   * =====================================================
   */

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");

  /*
   * =====================================================
   * PROFIL BILGILERI
   * =====================================================
   */

  const [about, setAbout] = useState("");
  const [profession, setProfession] = useState("");
  const [education, setEducation] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [religion, setReligion] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  /*
   * =====================================================
   * PROFIL SORULARI / CEVAPLARI
   * =====================================================
   */

  const [sorular, setSorular] = useState<ProfilSorusu[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<number, string[]>>({});
  const [soruCevapKaydediliyor, setSoruCevapKaydediliyor] = useState(false);
  const [soruCevapHatasi, setSoruCevapHatasi] = useState("");

  /*
   * =====================================================
   * ENUM LISTELERI
   * =====================================================
   */

  const [meslekler, setMeslekler] = useState<EnumSecenegi[]>([]);

  const [egitimler, setEgitimler] = useState<EnumSecenegi[]>([]);

  const [medeniDurumlar, setMedeniDurumlar] = useState<EnumSecenegi[]>([]);

  const [mezhepler, setMezhepler] = useState<EnumSecenegi[]>([]);

  const [ilgiAlanlari, setIlgiAlanlari] = useState<EnumSecenegi[]>([]);

  /*
   * =====================================================
   * FOTOGRAF
   * =====================================================
   */

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  /*
   * =====================================================
   * DURUM
   * =====================================================
   */

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [hata, setHata] = useState("");

  const [basari, setBasari] = useState("");

  /*
   * =====================================================
   * TOKEN
   * =====================================================
   */

  const tokenGetir = async () => {
    return AsyncStorage.getItem("token");
  };

  /*
   * =====================================================
   * FOTOGRAF URL
   * =====================================================
   */

  const fotoUrlOlustur = (foto?: string | null) => {
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
   * =====================================================
   * ENUM VERISI
   * =====================================================
   */

  const enumVerisiniGetir = async (
    endpoint: string,
  ): Promise<EnumSecenegi[]> => {
    const token = await tokenGetir();

    if (!token) {
      return [];
    }

    const response = await fetch(`${API_ADRESI}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`${endpoint} alinamadi. HTTP ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.content)) {
      return data.content;
    }

    return [];
  };

  /*
   * =====================================================
   * ENUM'LARI GETIR
   * =====================================================
   */

  const enumlariGetir = useCallback(async () => {
    try {
      const [
        meslekSonuc,
        egitimSonuc,
        medeniDurumSonuc,
        mezhepSonuc,
        ilgiAlaniSonuc,
      ] = await Promise.all([
        enumVerisiniGetir("/enums/meslekler"),

        enumVerisiniGetir("/enums/egitimler"),

        enumVerisiniGetir("/enums/medeni-durumlar"),

        enumVerisiniGetir("/enums/mezhepler"),

        enumVerisiniGetir("/enums/ilgi-alanlari"),
      ]);

      setMeslekler(meslekSonuc);

      setEgitimler(egitimSonuc);

      setMedeniDurumlar(medeniDurumSonuc);

      setMezhepler(mezhepSonuc);

      setIlgiAlanlari(ilgiAlaniSonuc);

      console.log("MESLEKLER:", meslekSonuc);

      console.log("EGITIMLER:", egitimSonuc);

      console.log("MEDENI DURUMLAR:", medeniDurumSonuc);

      console.log("MEZHEPLER:", mezhepSonuc);

      console.log("ILGI ALANLARI:", ilgiAlaniSonuc);
    } catch (error) {
      console.log("ENUM Y�oKLEME HATASI:", error);

      if (error instanceof Error) {
        setHata(error.message);
      } else {
        setHata("Se�enekler y�klenirken hata olu�Ytu.");
      }
    }
  }, []);

  /*
   * =====================================================
   * PROFIL SORULARINI VE MEVCUT CEVAPLARI GETIR
   * =====================================================
   */

  const profilSorulariniGetir = async (token: string, profileId: number) => {
    try {
      setSoruCevapHatasi("");

      const soruResponse = await fetch(
        `${API_ADRESI}/profile-questions/active`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!soruResponse.ok) {
        const text = await soruResponse.text();

        throw new Error(
          text || `Profil sorulari alinamadi. HTTP ${soruResponse.status}`,
        );
      }

      const soruData = await soruResponse.json();

      const soruListesi: ProfilSorusu[] = Array.isArray(soruData)
        ? soruData
        : Array.isArray(soruData?.content)
          ? soruData.content
          : [];

      setSorular(soruListesi);

      const cevapResponse = await fetch(
        `${API_ADRESI}/profile-answers/profile/${profileId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!cevapResponse.ok) {
        const text = await cevapResponse.text();

        throw new Error(
          text || `Profil cevaplari alinamadi. HTTP ${cevapResponse.status}`,
        );
      }

      const cevapData = await cevapResponse.json();

      const cevapListesi: ProfilCevabi[] = Array.isArray(cevapData)
        ? cevapData
        : Array.isArray(cevapData?.content)
          ? cevapData.content
          : [];

      const cevapMap: Record<number, string[]> = {};

      cevapListesi.forEach((cevap) => {
        if (
          cevap.questionId !== null &&
          cevap.questionId !== undefined &&
          typeof cevap.answer === "string" &&
          cevap.answer.trim() !== ""
        ) {
          cevapMap[cevap.questionId] = cevap.answer
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      });

      setCevaplar(cevapMap);

      console.log("EDIT PROFIL SORULARI:", soruListesi);
      console.log("EDIT PROFIL CEVAPLARI:", cevapListesi);
      console.log("EDIT CEVAP MAP:", cevapMap);
    } catch (error) {
      console.log("PROFIL SORU/CEVAP GETIRME HATASI:", error);

      if (error instanceof Error) {
        setSoruCevapHatasi(error.message);
      } else {
        setSoruCevapHatasi(
          "Profil sorulari ve cevaplari y�klenirken hata olu�Ytu.",
        );
      }

      setSorular([]);
      setCevaplar({});
    }
  };

  /*
   * =====================================================
   * PROFILI Y�oKLE
   * =====================================================
   */

  const profilYukle = useCallback(async () => {
    try {
      setLoading(true);
      setHata("");

      const token = await tokenGetir();

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
       * =================================================
       * 1. KULLANICI
       * =================================================
       */

      const userResponse = await fetch(`${API_ADRESI}/users/me`, {
        method: "GET",
        headers,
      });

      console.log("EDIT USER STATUS:", userResponse.status);

      if (!userResponse.ok) {
        const text = await userResponse.text();

        throw new Error(
          text || `Kullanici bilgileri alinamadi. HTTP ${userResponse.status}`,
        );
      }

      const userData: Kullanici = await userResponse.json();

      console.log("EDIT USER:", userData);

      setKullanici(userData);

      setFirstName(userData.firstName || "");

      setLastName(userData.lastName || "");

      setPhoneNumber(userData.phoneNumber || "");

      setCity(userData.city || "");

      /*
       * =================================================
       * 2. PROFIL
       * =================================================
       */

      const profileResponse = await fetch(`${API_ADRESI}/profiles/me`, {
        method: "GET",
        headers,
      });

      console.log("EDIT PROFILE STATUS:", profileResponse.status);

      if (profileResponse.ok) {
        const profileData: Profil = await profileResponse.json();

        console.log("EDIT PROFIL VERISI:", profileData);

        setProfil(profileData);

        if (profileData.id) {
          await profilSorulariniGetir(token, profileData.id);
        } else {
          setSorular([]);
          setCevaplar({});
        }

        setAbout(profileData.about || "");

        setProfession(
          profileData.profession !== null &&
            profileData.profession !== undefined
            ? String(profileData.profession)
            : "",
        );

        setEducation(
          profileData.education !== null && profileData.education !== undefined
            ? String(profileData.education)
            : "",
        );

        setHeight(
          profileData.height !== null && profileData.height !== undefined
            ? String(profileData.height)
            : "",
        );

        setWeight(
          profileData.weight !== null && profileData.weight !== undefined
            ? String(profileData.weight)
            : "",
        );

        setMaritalStatus(
          profileData.maritalStatus !== null &&
            profileData.maritalStatus !== undefined
            ? String(profileData.maritalStatus)
            : "",
        );

        setReligion(
          profileData.religion !== null && profileData.religion !== undefined
            ? String(profileData.religion)
            : "",
        );

        if (
          profileData.interests !== null &&
          profileData.interests !== undefined &&
          String(profileData.interests).trim() !== ""
        ) {
          setInterests(
            String(profileData.interests)
              .split(",")
              .map((deger) => deger.trim())
              .filter(Boolean),
          );
        } else {
          setInterests([]);
        }

        setProfilePhoto(profileData.profilePhoto || null);
      } else if (profileResponse.status === 404) {
        console.log("Hen�z profil olu�Yturulmamı�Y.");

        setProfil(null);
      } else {
        const text = await profileResponse.text();

        throw new Error(
          text || `Profil bilgileri alinamadi. HTTP ${profileResponse.status}`,
        );
      }
    } catch (error) {
      console.log("PROFIL Y�oKLEME HATASI:", error);

      if (error instanceof Error) {
        setHata(error.message);
      } else {
        setHata("Profil bilgileri alinirken hata olu�Ytu.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  /*
   * =====================================================
   * SAYFA A�?ILISI
   * =====================================================
   */

  useEffect(() => {
    void profilYukle();
    void enumlariGetir();
  }, [profilYukle, enumlariGetir]);

  /*
   * =====================================================
   * FOTOGRAF SE�?
   * =====================================================
   */

  const fotoSec = async () => {
    try {
      setHata("");

      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!izin.granted) {
        Alert.alert(
          "Izin Gerekli",
          "Profil foto�Yrafi se�ebilmek i�in galeri izni vermelisiniz.",
        );

        return;
      }

      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (sonuc.canceled) {
        return;
      }

      const asset = sonuc.assets?.[0];

      if (!asset) {
        return;
      }

      /*
       * 10 MB KONTROL�o
       */

      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert(
          "Dosya �?ok B�y�k",
          "Foto�Yraf boyutu en fazla 10 MB olabilir.",
        );

        return;
      }

      /*
       * MIME KONTROL�o
       */

      const mimeType = asset.mimeType || "image/jpeg";

      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        Alert.alert(
          "Ge�ersiz Foto�Yraf",
          "Sadece JPG, PNG veya WEBP formatindaki foto�Yraflari se�ebilirsiniz.",
        );

        return;
      }

      setPhotoPreview(asset.uri);

      console.log("SE�?ILEN PROFIL FOTOGRAFI:", asset.uri);
    } catch (error) {
      console.log("FOTOGRAF SE�?ME HATASI:", error);

      Alert.alert("Hata", "Foto�Yraf se�ilirken bir hata olu�Ytu.");
    }
  };

  /*
   * =====================================================
   * KULLANICI BILGILERINI G�oNCELLE
   * =====================================================
   */

  const kullaniciBilgileriniGuncelle = async (token: string) => {
    const response = await fetch(`${API_ADRESI}/users/me`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        firstName: firstName.trim(),

        lastName: lastName.trim(),

        phoneNumber: phoneNumber.trim() || null,

        city: city.trim() || null,
      }),
    });

    console.log("USER UPDATE STATUS:", response.status);

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        text || `Kullanici g�ncellenemedi. HTTP ${response.status}`,
      );
    }
  };

  /*
   * =====================================================
   * FOTOGRAF Y�oKLE
   * =====================================================
   */

  const fotografiYukle = async (token: string): Promise<string | null> => {
    if (!photoPreview) {
      return profilePhoto;
    }

    /*
     * AYNI FOTOGRAFSA TEKRAR Y�oKLEME
     */

    if (profilePhoto && photoPreview === fotoUrlOlustur(profilePhoto)) {
      return profilePhoto;
    }

    /*
     * DOSYA ADI
     */

    const dosyaAdi =
      photoPreview.split("/").pop() || `profil-${Date.now()}.jpg`;

    /*
     * UZANTI
     */

    const uzanti = dosyaAdi.split(".").pop()?.toLowerCase() || "jpg";

    /*
     * MIME
     */

    let mimeType = "image/jpeg";

    if (uzanti === "png") {
      mimeType = "image/png";
    } else if (uzanti === "webp") {
      mimeType = "image/webp";
    }

    /*
     * FORMDATA
     */

    const formData = new FormData();

    formData.append("file", {
      uri: photoPreview,
      name: dosyaAdi,
      type: mimeType,
    } as any);

    /*
     * UPLOAD
     */

    const response = await fetch(`${API_ADRESI}/users/me/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    console.log("PHOTO UPDATE STATUS:", response.status);

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        text || `Profil foto�Yrafi y�klenemedi. HTTP ${response.status}`,
      );
    }

    /*
     * RESPONSE BOSSA
     */

    if (!text.trim()) {
      return profilePhoto;
    }

    /*
     * JSON RESPONSE
     */

    try {
      const sonuc = JSON.parse(text);

      return sonuc.profilePhoto || profilePhoto;
    } catch {
      return profilePhoto;
    }
  };

  /*
   * =====================================================
   * RADIO CEVABI DEGISTIR
   * =====================================================
   */

  const radioCevapDegistir = (questionId: number, value: string) => {
    setCevaplar((mevcut) => ({
      ...mevcut,
      [questionId]: [value],
    }));
  };

  /*
   * =====================================================
   * CHECKBOX CEVABI DEGISTIR
   * =====================================================
   */

  const checkboxCevapDegistir = (questionId: number, value: string) => {
    setCevaplar((mevcut) => {
      const secili = mevcut[questionId] || [];

      if (secili.includes(value)) {
        return {
          ...mevcut,
          [questionId]: secili.filter((item) => item !== value),
        };
      }

      return {
        ...mevcut,
        [questionId]: [...secili, value],
      };
    });
  };

  /*
   * =====================================================
   * PROFIL CEVAPLARINI KAYDET
   * =====================================================
   */

  const profilCevaplariniKaydet = async (token: string, profileId: number) => {
    try {
      setSoruCevapKaydediliyor(true);
      setSoruCevapHatasi("");

      const mevcutCevapResponse = await fetch(
        `${API_ADRESI}/profile-answers/profile/${profileId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!mevcutCevapResponse.ok) {
        const text = await mevcutCevapResponse.text();

        throw new Error(
          text ||
            `Mevcut profil cevaplari alinamadi. HTTP ${mevcutCevapResponse.status}`,
        );
      }

      const mevcutData = await mevcutCevapResponse.json();

      const mevcutCevaplar: ProfilCevabi[] = Array.isArray(mevcutData)
        ? mevcutData
        : Array.isArray(mevcutData?.content)
          ? mevcutData.content
          : [];

      for (const soru of sorular) {
        const secilenler = cevaplar[soru.id] || [];

        const mevcutCevap = mevcutCevaplar.find(
          (cevap) => Number(cevap.questionId) === Number(soru.id),
        );

        if (secilenler.length > 0) {
          const answer = secilenler.join(",");

          if (mevcutCevap) {
            const updateResponse = await fetch(
              `${API_ADRESI}/profile-answers/${mevcutCevap.id}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  id: mevcutCevap.id,
                  profileId,
                  questionId: soru.id,
                  answer,
                }),
              },
            );

            if (!updateResponse.ok) {
              const text = await updateResponse.text();

              throw new Error(
                text ||
                  `Profil cevabi g�ncellenemedi. HTTP ${updateResponse.status}`,
              );
            }
          } else {
            const createResponse = await fetch(
              `${API_ADRESI}/profile-answers`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  profileId,
                  questionId: soru.id,
                  answer,
                }),
              },
            );

            if (!createResponse.ok) {
              const text = await createResponse.text();

              throw new Error(
                text ||
                  `Profil cevabi kaydedilemedi. HTTP ${createResponse.status}`,
              );
            }
          }
        } else if (mevcutCevap) {
          const deleteResponse = await fetch(
            `${API_ADRESI}/profile-answers/profile/${profileId}/question/${soru.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            const text = await deleteResponse.text();

            throw new Error(
              text || `Profil cevabi silinemedi. HTTP ${deleteResponse.status}`,
            );
          }
        }
      }

      await profilSorulariniGetir(token, profileId);
    } catch (error) {
      console.log("PROFIL CEVAPLARI KAYDETME HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil cevaplari kaydedilirken hata olu�Ytu.";

      setSoruCevapHatasi(mesaj);

      throw new Error(mesaj);
    } finally {
      setSoruCevapKaydediliyor(false);
    }
  };

  /*
   * =====================================================
   * PROFIL CEVAP KAYDET BUTONU
   * =====================================================
   */

  const profilCevaplariniKaydetButonu = async () => {
    try {
      const token = await tokenGetir();

      if (!token) {
        router.replace("/");
        return;
      }

      if (!profil?.id) {
        Alert.alert("Profil Gerekli", "�-nce profil bilgilerinizi kaydediniz.");
        return;
      }

      await profilCevaplariniKaydet(token, profil.id);

      Alert.alert("Ba�Yarili", "Profil cevaplariniz kaydedildi.");
    } catch (error) {
      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil cevaplari kaydedilemedi.";

      Alert.alert("Hata", mesaj);
    }
  };

  /*
   * =====================================================
   * PROFIL KAYDET
   * =====================================================
   */

  const profilKaydet = async () => {
    /*
     * AD KONTROL�o
     */

    if (!firstName.trim()) {
      Alert.alert("Eksik Bilgi", "Ad alanini doldurunuz.");

      return;
    }

    /*
     * SOYAD KONTROL�o
     */

    if (!lastName.trim()) {
      Alert.alert("Eksik Bilgi", "Soyad alanini doldurunuz.");

      return;
    }

    /*
     * BOY KONTROL�o
     */

    if (height && (Number(height) < 100 || Number(height) > 250)) {
      Alert.alert("Ge�ersiz Boy", "Boy 100 ile 250 cm arasinda olmalidir.");

      return;
    }

    /*
     * KILO KONTROL�o
     */

    if (weight && (Number(weight) < 30 || Number(weight) > 300)) {
      Alert.alert("Ge�ersiz Kilo", "Kilo 30 ile 300 kg arasinda olmalidir.");

      return;
    }

    try {
      setSaving(true);
      setHata("");
      setBasari("");

      const token = await tokenGetir();

      if (!token) {
        router.replace("/");
        return;
      }

      /*
       * =================================================
       * 1. KULLANICI
       * =================================================
       */

      await kullaniciBilgileriniGuncelle(token);

      /*
       * =================================================
       * 2. FOTOGRAF
       * =================================================
       */

      let uploadedPhotoPath = profilePhoto;

      if (photoPreview && photoPreview !== fotoUrlOlustur(profilePhoto)) {
        uploadedPhotoPath = await fotografiYukle(token);
      }

      /*
       * =================================================
       * 3. PROFIL PAYLOAD
       * =================================================
       */

      const profilePayload = {
        about: about.trim() || null,

        profession: profession ? Number(profession) : null,

        education: education ? Number(education) : null,

        height: height ? Number(height) : null,

        weight: weight ? Number(weight) : null,

        maritalStatus: maritalStatus ? Number(maritalStatus) : null,

        religion: religion ? Number(religion) : null,

        interests: interests.length > 0 ? interests.join(",") : null,
      };

      console.log("PROFIL UPDATE PAYLOAD:", profilePayload);

      /*
       * =================================================
       * 4. PROFIL KAYDET
       * =================================================
       */

      const profileResponse = await fetch(`${API_ADRESI}/profiles/me`, {
        method: profil ? "PUT" : "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(profilePayload),
      });

      console.log("PROFILE UPDATE STATUS:", profileResponse.status);

      const responseText = await profileResponse.text();

      if (!profileResponse.ok) {
        throw new Error(
          responseText ||
            `Profil kaydedilemedi. HTTP ${profileResponse.status}`,
        );
      }

      /*
       * =================================================
       * 5. RESPONSE PROFIL
       * =================================================
       */

      if (responseText.trim()) {
        try {
          const kaydedilenProfil: Profil = JSON.parse(responseText);

          setProfil(kaydedilenProfil);

          setProfilePhoto(
            kaydedilenProfil.profilePhoto || uploadedPhotoPath || null,
          );

          setAbout(kaydedilenProfil.about || "");

          setProfession(
            kaydedilenProfil.profession !== null &&
              kaydedilenProfil.profession !== undefined
              ? String(kaydedilenProfil.profession)
              : "",
          );

          setEducation(
            kaydedilenProfil.education !== null &&
              kaydedilenProfil.education !== undefined
              ? String(kaydedilenProfil.education)
              : "",
          );

          setHeight(
            kaydedilenProfil.height !== null &&
              kaydedilenProfil.height !== undefined
              ? String(kaydedilenProfil.height)
              : "",
          );

          setWeight(
            kaydedilenProfil.weight !== null &&
              kaydedilenProfil.weight !== undefined
              ? String(kaydedilenProfil.weight)
              : "",
          );

          setMaritalStatus(
            kaydedilenProfil.maritalStatus !== null &&
              kaydedilenProfil.maritalStatus !== undefined
              ? String(kaydedilenProfil.maritalStatus)
              : "",
          );

          setReligion(
            kaydedilenProfil.religion !== null &&
              kaydedilenProfil.religion !== undefined
              ? String(kaydedilenProfil.religion)
              : "",
          );

          if (kaydedilenProfil.interests) {
            setInterests(
              String(kaydedilenProfil.interests)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            );
          } else {
            setInterests([]);
          }
        } catch {
          console.log("Profil response JSON de�Yil.");
        }
      }

      /*
       * FOTOGRAF PREVIEW TEMIZLE
       */

      setPhotoPreview(null);

      /*
       * BASARI
       */

      setBasari("Profil ba�Yariyla g�ncellendi.");

      Alert.alert("Ba�Yarili", "Profil bilgileriniz g�ncellendi.", [
        {
          text: "Tamam",
          onPress: () => {
            router.replace("/profile");
          },
        },
      ]);
    } catch (error) {
      console.log("PROFIL G�oNCELLEME HATASI:", error);

      const mesaj =
        error instanceof Error
          ? error.message
          : "Profil g�ncellenirken bir hata olu�Ytu.";

      setHata(mesaj);

      Alert.alert("Hata", mesaj);
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * GERI D�-N
   * =====================================================
   */

  const geriDon = () => {
    router.replace("/profile");
  };

  /*
   * =====================================================
   * ILGI ALANI SE�?
   * =====================================================
   */

  const ilgiAlaniSec = (kod: string) => {
    setInterests((mevcut) => {
      if (mevcut.includes(kod)) {
        return mevcut.filter((item) => item !== kod);
      }

      return [...mevcut, kod];
    });
  };

  /*
   * =====================================================
   * SE�?ILI MI?
   * =====================================================
   */

  const seciliMu = (kod: number | string) => {
    return interests.includes(String(kod));
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.yukleniyorContainer}>
          <ActivityIndicator size="large" color="#d63384" />

          <Text style={styles.yukleniyorText}>Profil y�kleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ============================================
              �oST BAR
              ============================================ */}

          <View style={styles.ustBar}>
            <Pressable style={styles.geri} onPress={geriDon}>
              <Text style={styles.geriIcon}>�?�</Text>

              <Text style={styles.geriText}>Profil</Text>
            </Pressable>

            <Text style={styles.ustBaslik}>Profili D�zenle</Text>

            <View
              style={{
                width: 60,
              }}
            />
          </View>

          {/* ============================================
              HATA
              ============================================ */}

          {hata ? (
            <View style={styles.hataKutusu}>
              <Text style={styles.hataBaslik}>Hata</Text>

              <Text style={styles.hataText}>{hata}</Text>

              <Pressable style={styles.hataKapat} onPress={() => setHata("")}>
                <Text style={styles.hataKapatText}>Kapat</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ============================================
              BASARI
              ============================================ */}

          {basari ? (
            <View style={styles.basariKutusu}>
              <Text style={styles.basariText}>�o" {basari}</Text>
            </View>
          ) : null}

          {/* ============================================
              PROFIL FOTOGRAFI
              ============================================ */}

          <View style={styles.fotoBolumu}>
            <Text style={styles.bolumBaslik}>Profil Foto�Yrafi</Text>

            <View style={styles.fotoOnizlemeContainer}>
              {photoPreview || profilePhoto ? (
                <Image
                  source={{
                    uri: photoPreview || fotoUrlOlustur(profilePhoto),
                  }}
                  style={styles.fotoOnizleme}
                />
              ) : (
                <View style={styles.fotoYok}>
                  <Text style={styles.fotoYokText}>
                    {(`${firstName} ${lastName}`.trim() || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Pressable style={styles.fotoSecButonu} onPress={fotoSec}>
              <Text style={styles.fotoSecText}>gY"� Profil Foto�Yrafi Se�</Text>
            </Pressable>

            <Text style={styles.fotoBilgi}>
              JPG, PNG veya WEBP{"\n"}
              Maksimum 10 MB
            </Text>
          </View>

          {/* ============================================
              KISISEL BILGILER
              ============================================ */}

          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>Ki�Yisel Bilgiler</Text>

            <Text style={styles.inputLabel}>Ad</Text>

            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adiniz"
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Soyad</Text>

            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadiniz"
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Telefon</Text>

            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Telefon numaraniz"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Il</Text>

            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Iliniz"
            />
          </View>

          {/* ============================================
              PROFIL BILGILERI
              ============================================ */}

          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>Profil Bilgilerim</Text>

            {/* HAKKIMDA */}

            <Text style={styles.inputLabel}>Hakkimda</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              value={about}
              onChangeText={setAbout}
              placeholder="Kendinizden bahsedin"
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
            />

            {/* MESLEK */}

            <Text style={styles.inputLabel}>Meslek</Text>

            <View style={styles.secimContainer}>
              <Pressable
                style={styles.secimSecili}
                onPress={() => {
                  Alert.alert("Meslek Se�iniz", "", [
                    {
                      text: "Vazge�",
                      style: "cancel",
                    },

                    ...meslekler.map((item) => ({
                      text: item.aciklama,

                      onPress: () => setProfession(String(item.kod)),
                    })),
                  ]);
                }}
              >
                <Text style={styles.secimSeciliText}>
                  {meslekler.find((item) => String(item.kod) === profession)
                    ?.aciklama || "Meslek se�iniz"}
                </Text>

                <Text style={styles.secimOk}>�-�</Text>
              </Pressable>
            </View>

            {/* EGITIM */}

            <Text style={styles.inputLabel}>E�Yitim</Text>

            <View style={styles.secimContainer}>
              <Pressable
                style={styles.secimSecili}
                onPress={() => {
                  Alert.alert("E�Yitim Se�iniz", "", [
                    {
                      text: "Vazge�",
                      style: "cancel",
                    },

                    ...egitimler.map((item) => ({
                      text: item.aciklama,

                      onPress: () => setEducation(String(item.kod)),
                    })),
                  ]);
                }}
              >
                <Text style={styles.secimSeciliText}>
                  {egitimler.find((item) => String(item.kod) === education)
                    ?.aciklama || "E�Yitim se�iniz"}
                </Text>

                <Text style={styles.secimOk}>�-�</Text>
              </Pressable>
            </View>

            {/* BOY / KILO */}

            <View style={styles.ikiKolon}>
              <View style={styles.kolon}>
                <Text style={styles.inputLabel}>Boy</Text>

                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="cm"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.kolon}>
                <Text style={styles.inputLabel}>Kilo</Text>

                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="kg"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* MEDENI DURUM */}

            <Text style={styles.inputLabel}>Medeni Durum</Text>

            <View style={styles.secimContainer}>
              <Pressable
                style={styles.secimSecili}
                onPress={() => {
                  Alert.alert("Medeni Durum Se�iniz", "", [
                    {
                      text: "Vazge�",
                      style: "cancel",
                    },

                    ...medeniDurumlar.map((item) => ({
                      text: item.aciklama,

                      onPress: () => setMaritalStatus(String(item.kod)),
                    })),
                  ]);
                }}
              >
                <Text style={styles.secimSeciliText}>
                  {medeniDurumlar.find(
                    (item) => String(item.kod) === maritalStatus,
                  )?.aciklama || "Medeni durum se�iniz"}
                </Text>

                <Text style={styles.secimOk}>�-�</Text>
              </Pressable>
            </View>

            {/* MEZHEP */}

            <Text style={styles.inputLabel}>Mezhep</Text>

            <View style={styles.secimContainer}>
              <Pressable
                style={styles.secimSecili}
                onPress={() => {
                  Alert.alert("Mezhep Se�iniz", "", [
                    {
                      text: "Vazge�",
                      style: "cancel",
                    },

                    ...mezhepler.map((item) => ({
                      text: item.aciklama,

                      onPress: () => setReligion(String(item.kod)),
                    })),
                  ]);
                }}
              >
                <Text style={styles.secimSeciliText}>
                  {mezhepler.find((item) => String(item.kod) === religion)
                    ?.aciklama || "Mezhep se�iniz"}
                </Text>

                <Text style={styles.secimOk}>�-�</Text>
              </Pressable>
            </View>

            {/* ILGI ALANLARI */}

            <Text style={styles.inputLabel}>Ilgi Alanlari</Text>

            <View style={styles.ilgiAlanlariContainer}>
              {ilgiAlanlari.length === 0 ? (
                <Text style={styles.secenekYok}>
                  Ilgi alanlari y�kleniyor...
                </Text>
              ) : (
                ilgiAlanlari.map((item) => {
                  const kod = String(item.kod);

                  const secili = seciliMu(item.kod);

                  return (
                    <Pressable
                      key={kod}
                      style={[styles.ilgiChip, secili && styles.ilgiChipSecili]}
                      onPress={() => ilgiAlaniSec(kod)}
                    >
                      <Text
                        style={[
                          styles.ilgiChipText,
                          secili && styles.ilgiChipTextSecili,
                        ]}
                      >
                        {secili ? "�o" : ""}
                        {item.aciklama}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            {interests.length > 0 && (
              <Text style={styles.seciliBilgi}>
                {interests.length} ilgi alani se�ildi
              </Text>
            )}
          </View>

          {/* ============================================
              PROFIL SORULARI
              ============================================ */}

          {profil?.id && (
            <View style={styles.bolum}>
              <Text style={styles.bolumBaslik}>Profil Sorulari</Text>

              {soruCevapHatasi ? (
                <View style={styles.soruHataKutusu}>
                  <Text style={styles.soruHataText}>{soruCevapHatasi}</Text>
                </View>
              ) : null}

              {sorular.length > 0 ? (
                <ProfileQuestions
                  questions={sorular}
                  answers={cevaplar}
                  saving={soruCevapKaydediliyor}
                  error={soruCevapHatasi}
                  onRadioChange={radioCevapDegistir}
                  onCheckboxChange={checkboxCevapDegistir}
                  onSave={profilCevaplariniKaydetButonu}
                />
              ) : (
                <View style={styles.soruBosKutusu}>
                  <ActivityIndicator size="small" color="#8b5cf6" />

                  <Text style={styles.soruBosText}>
                    Profil sorulari y�kleniyor...
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ============================================
              KAYDET
              ============================================ */}

          <Pressable
            style={[styles.kaydetButonu, saving && styles.kaydetButonuPasif]}
            onPress={profilKaydet}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />

                <Text style={styles.kaydetText}>Kaydediliyor...</Text>
              </>
            ) : (
              <Text style={styles.kaydetText}>�o" De�Yi�Yiklikleri Kaydet</Text>
            )}
          </Pressable>

          {/* ============================================
              VAZGE�?
              ============================================ */}

          <Pressable
            style={styles.vazgecButonu}
            onPress={geriDon}
            disabled={saving}
          >
            <Text style={styles.vazgecText}>Vazge�</Text>
          </Pressable>

          <View style={styles.altBosluk} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scroll: {
    flex: 1,
  },

  scrollContainer: {
    paddingBottom: 40,
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
    backgroundColor: "#ffffff",
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
   * FOTOGRAF
   */

  fotoBolumu: {
    margin: 16,
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#faf7ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },

  fotoOnizlemeContainer: {
    marginBottom: 18,
  },

  fotoOnizleme: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#eeeeee",
    borderWidth: 5,
    borderColor: "#8b5cf6",
  },

  fotoYok: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#f3d1e1",
    borderWidth: 5,
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },

  fotoYokText: {
    fontSize: 56,
    fontWeight: "700",
    color: "#d63384",
  },

  fotoSecButonu: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
  },

  fotoSecText: {
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: "700",
  },

  fotoBilgi: {
    marginTop: 10,
    color: "#777777",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },

  /*
   * B�-L�oM
   */

  bolum: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eeeeee",
  },

  bolumBaslik: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5b21b6",
    marginBottom: 18,
  },

  /*
   * INPUT
   */

  inputLabel: {
    fontSize: 14,
    color: "#555555",
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    color: "#222222",
    fontSize: 16,
    marginBottom: 15,
  },

  textArea: {
    minHeight: 130,
    paddingTop: 14,
  },

  /*
   * IKI KOLON
   */

  ikiKolon: {
    flexDirection: "row",
    gap: 10,
  },

  kolon: {
    flex: 1,
  },

  /*
   * SE�?IM
   */

  secimContainer: {
    marginBottom: 15,
  },

  secimSecili: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  secimSeciliText: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
    marginRight: 10,
  },

  secimOk: {
    color: "#7c3aed",
    fontSize: 14,
    fontWeight: "700",
  },

  /*
   * ILGI ALANLARI
   */

  ilgiAlanlariContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  ilgiChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8d0e8",
    backgroundColor: "#ffffff",
  },

  ilgiChipSecili: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },

  ilgiChipText: {
    fontSize: 13,
    color: "#555555",
    fontWeight: "500",
  },

  ilgiChipTextSecili: {
    color: "#ffffff",
    fontWeight: "700",
  },

  seciliBilgi: {
    marginTop: 12,
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "600",
  },

  secenekYok: {
    color: "#888888",
    fontSize: 14,
  },

  /*
   * PROFIL SORULARI
   */

  soruHataKutusu: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },

  soruHataText: {
    color: "#be123c",
    fontSize: 13,
    lineHeight: 19,
  },

  soruBosKutusu: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  soruBosText: {
    marginTop: 8,
    color: "#777777",
    fontSize: 14,
    textAlign: "center",
  },

  /*
   * HATA
   */

  hataKutusu: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },

  hataBaslik: {
    fontSize: 17,
    fontWeight: "700",
    color: "#be123c",
    marginBottom: 6,
  },

  hataText: {
    color: "#9f1239",
    fontSize: 14,
    lineHeight: 21,
  },

  hataKapat: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#be123c",
  },

  hataKapatText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /*
   * BASARI
   */

  basariKutusu: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },

  basariText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
  },

  /*
   * KAYDET
   */

  kaydetButonu: {
    marginHorizontal: 16,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
  },

  kaydetButonuPasif: {
    opacity: 0.65,
  },

  kaydetText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  /*
   * VAZGE�?
   */

  vazgecButonu: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d63384",
    alignItems: "center",
    justifyContent: "center",
  },

  vazgecText: {
    color: "#d63384",
    fontSize: 16,
    fontWeight: "700",
  },

  /*
   * LOADING
   */

  yukleniyorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  yukleniyorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },

  /*
   * ALT BOSLUK
   */

  altBosluk: {
    height: 20,
  },
});
