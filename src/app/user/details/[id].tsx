import { tokenGetir } from "../../../services/tokenServisi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// src/app/home.tsx
// src/app/user/details/[id].tsx
import KimlikDogrulamaliAvatar from "../../../components/common/KimlikDogrulamaliAvatar";
import { API_BASE_URL } from "../../../config/api";
const API_ADRESI = API_BASE_URL + "/api";

type ProfilSorusu = {
  id: number;
  question: string;
  category: string | null;
  required: boolean;
  active: boolean;
};

type ProfilCevabi = {
  id: number;
  profileId: number;
  questionId: number;
  answer: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string | null;
  profilePhoto: string | null;
  city: string | null;
  active: boolean;
  online?: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type Profile = {
  id: number;
  userId: number;
  about: string | null;
  profession: string | number | null;
  education: string | number | null;
  height: number | null;
  weight: number | null;
  maritalStatus: string | number | null;
  religion: string | number | null;
  interests: string | number | null;
  profilePhoto: string | null;
  profileVerified: boolean;
};

type EnumSecenegi = {
  kod?: string | number;
  code?: string | number;
  id?: string | number;
  value?: string | number;
  aciklama?: string;
  description?: string;
  name?: string;
  label?: string;
};

export default function ProfilDetay() {
  const { t, i18n } = useTranslation("profileDetails");
  const navigation = useNavigation<any>();

  const route = useRoute<any>();
  const params = route.params as { id: string };

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const hedefKullanıcıId =
    id && Number.isFinite(Number(id)) && Number(id) > 0 ? Number(id) : null;

  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [sorular, setSorular] = useState<ProfilSorusu[]>([]);

  const [cevaplar, setCevaplar] = useState<ProfilCevabi[]>([]);

  const [meslekler, setMeslekler] = useState<EnumSecenegi[]>([]);

  const [egitimler, setEgitimler] = useState<EnumSecenegi[]>([]);

  const [medeniDurumlar, setMedeniDurumlar] = useState<EnumSecenegi[]>([]);

  const [mezhepler, setMezhepler] = useState<EnumSecenegi[]>([]);

  const [ilgiAlanlari, setIlgiAlanlari] = useState<EnumSecenegi[]>([]);

  const [yukleniyor, setYukleniyor] = useState(true);

  const [hata, setHata] = useState("");

  const apiGetir = async (endpoint: string, token: string): Promise<any> => {
    const response = await fetch(`${API_ADRESI}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(t("profileDetails:loadFailed"));
    }

    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  const yasHesapla = (dogumTarihi: string) => {
    if (!dogumTarihi) {
      return null;
    }

    const bugun = new Date();
    const dogum = new Date(dogumTarihi);

    let yas = bugun.getFullYear() - dogum.getFullYear();

    const ayFarki = bugun.getMonth() - dogum.getMonth();

    if (ayFarki < 0 || (ayFarki === 0 && bugun.getDate() < dogum.getDate())) {
      yas--;
    }

    return yas;
  };

  const enumAciklamasiGetir = (
    liste: EnumSecenegi[],
    kod: string | number | null,
  ) => {
    if (kod === null || kod === undefined || String(kod).trim() === "") {
      return t("profileDetails:notSpecified");
    }

    const kodMetni = String(kod).trim();
    const bulunan = liste.find((item) => {
      const itemKodu = item.kod ?? item.code ?? item.id ?? item.value;
      return itemKodu !== undefined && String(itemKodu).trim() === kodMetni;
    });

    if (!bulunan) {
      return t("profileDetails:notSpecified");
    }

    return (
      bulunan.aciklama ??
      bulunan.description ??
      bulunan.name ??
      bulunan.label ??
      t("profileDetails:notSpecified")
    );
  };

  // Medeni durum enum kodlarını seçili uygulama dilinde gösterir.
  // Backend kodları ve kayıtlı profil değeri değiştirilmez.
  const medeniDurumuCevir = (kod: string | number | null) => {
    if (kod === null || kod === undefined || String(kod).trim() === "") {
      return t("profileDetails:notSpecified");
    }

    const dil = (i18n.resolvedLanguage || i18n.language || "tr")
      .split("-")[0]
      .split("_")[0]
      .toLowerCase();

    const ceviriler: Record<string, Record<string, string>> = {
      "1": {
        tr: "Bekar",
        en: "Single",
        de: "Ledig",
        ar: "أعزب",
        ru: "Не женат / Не замужем",
      },
      "2": {
        tr: "Evli",
        en: "Married",
        de: "Verheiratet",
        ar: "متزوج",
        ru: "Женат / Замужем",
      },
      "3": {
        tr: "Boşanmış",
        en: "Divorced",
        de: "Geschieden",
        ar: "مطلق / مطلقة",
        ru: "В разводе",
      },
      "4": {
        tr: "Dul",
        en: "Widowed",
        de: "Verwitwet",
        ar: "أرمل / أرملة",
        ru: "Вдовец / Вдова",
      },
      "998": {
        tr: "Belirtmek İstemiyorum",
        en: "Prefer not to say",
        de: "Keine Angabe",
        ar: "أفضل عدم الإفصاح",
        ru: "Не хочу указывать",
      },
      "999": {
        tr: "Diğer",
        en: "Other",
        de: "Andere",
        ar: "أخرى",
        ru: "Другое",
      },
    };

    const kodMetni = String(kod).trim();
    const bulunan = medeniDurumlar.find(
      (item) => String(item.kod).trim() === kodMetni,
    );

    // API sayısal kod gönderiyorsa doğrudan koddan çevir.
    let medeniKod = /^\d+$/.test(kodMetni) ? kodMetni : "";

    // API enum adı veya Türkçe açıklama gönderirse de aynı koda eşleştir.
    if (!medeniKod) {
      const normalize = (deger: string) =>
        deger
          .trim()
          .toLocaleLowerCase("tr-TR")
          .replace(/ı/g, "i")
          .replace(/İ/g, "i")
          .replace(/â/g, "a")
          .replace(/[^a-z0-9]+/g, "");

      const anahtar = normalize(bulunan?.aciklama || kodMetni);
      const kodEslesmeleri: Record<string, string> = {
        bekar: "1",
        bekâr: "1",
        single: "1",
        evli: "2",
        married: "2",
        bosanmis: "3",
        divorced: "3",
        geschieden: "3",
        dul: "4",
        widowed: "4",
        verwitwet: "4",
        belirtmekistemiyorum: "998",
        tercih: "998",
        prefernottosay: "998",
        diger: "999",
        other: "999",
        andere: "999",
      };
      medeniKod = kodEslesmeleri[anahtar] || "";
    }

    const kayit = medeniKod ? ceviriler[medeniKod] : undefined;
    if (kayit) {
      return kayit[dil] || kayit.tr;
    }

    return bulunan?.aciklama ?? kodMetni;
  };

  const egitimBasliginiGetir = () => {
    const dil = (i18n.resolvedLanguage || i18n.language || "tr")
      .split("-")[0]
      .split("_")[0]
      .toLowerCase();

    const ceviriler: Record<string, string> = {
      tr: "Eğitim",
      en: "Education",
      de: "Ausbildung",
      ar: "التعليم",
      ru: "Образование",
    };

    return ceviriler[dil] || ceviriler.tr;
  };

  const soruMetniniGetir = (soruId: number) => {
    const soru = sorular.find((item) => Number(item.id) === Number(soruId));

    return soru?.question || t("profileDetails:profileQuestion");
  };

  const profilDon = () => {
    if (!hedefKullanıcıId) {
      navigation.replace("home");
      return;
    }

    navigation.replace("user", { id: String(hedefKullanıcıId) });
  };

  useEffect(() => {
    let aktif = true;

    const yukle = async () => {
      try {
        setYukleniyor(true);
        setHata("");

        const token = await tokenGetir();

        if (!token) {
          if (aktif) {
            navigation.replace("index");
          }

          return;
        }

        if (!hedefKullanıcıId) {
          throw new Error(t("profileDetails:notFound"));
        }

        // ========================================
        // 1. KULLANICI
        // ========================================

        const kullanici = await apiGetir(`/users/${hedefKullanıcıId}`, token);

        if (!aktif) {
          return;
        }

        setUser(kullanici);

        // ========================================
        // 2. PROFILLER
        // ========================================

        const profiller = (await apiGetir("/profiles", token)) || [];

        if (!aktif) {
          return;
        }

        const hedefProfil =
          profiller.find(
            (profil: Profile) =>
              Number(profil.userId) === Number(hedefKullanıcıId),
          ) || null;

        setProfile(hedefProfil);

        // ========================================
        // 3. AKTIF PROFIL SORULARI
        // ========================================

        const yuklenenSorular =
          (await apiGetir("/profile-questions/active", token)) || [];

        if (!aktif) {
          return;
        }

        setSorular(yuklenenSorular);

        // ========================================
        // 4. PROFIL CEVAPLARI
        // ========================================

        if (hedefProfil) {
          const yuklenenCevaplar =
            (await apiGetir(
              `/profile-answers/profile/${hedefProfil.id}`,
              token,
            )) || [];

          if (!aktif) {
            return;
          }

          const doluCevaplar = yuklenenCevaplar.filter(
            (cevap: ProfilCevabi) =>
              typeof cevap.answer === "string" && cevap.answer.trim() !== "",
          );

          setCevaplar(doluCevaplar);
        } else {
          setCevaplar([]);
        }

        // ========================================
        // 5. ENUM VERILERI
        // ========================================

        try {
          const [meslek, egitim, medeni, mezhep, ilgi] = await Promise.all([
            apiGetir("/enums/meslekler", token).catch(() => []),
            apiGetir("/enums/egitimler", token).catch(() => []),
            apiGetir("/enums/medeni-durumlar", token).catch(() => []),
            apiGetir("/enums/mezhepler", token).catch(() => []),
            apiGetir("/enums/ilgi-alanlari", token).catch(() => []),
          ]);

          if (!aktif) {
            return;
          }

          setMeslekler(meslek || []);

          setEgitimler(egitim || []);

          setMedeniDurumlar(medeni || []);

          setMezhepler(mezhep || []);

          setIlgiAlanlari(ilgi || []);
        } catch (enumHatasi) {}
      } catch (error) {
        if (!aktif) {
          return;
        }

        setHata(t("profileDetails:detailsLoadFailed"));
      } finally {
        if (aktif) {
          setYukleniyor(false);
        }
      }
    };

    void yukle();

    return () => {
      aktif = false;
    };
  }, [hedefKullanıcıId]);

  // ========================================
  // YÜKLENİYOR
  // ========================================

  if (yukleniyor) {
    return (
      <View style={styles.yukleniyor}>
        <ActivityIndicator size="large" />

        <Text style={styles.yukleniyorText}>{t("profileDetails:loading")}</Text>
      </View>
    );
  }

  // ========================================
  // HATA
  // ========================================

  if (hata) {
    return (
      <View style={styles.hataContainer}>
        <View style={styles.hataCard}>
          <Text style={styles.hataBaslik}>{t("profileDetails:title")}</Text>

          <Text style={styles.hataText}>{hata}</Text>

          <TouchableOpacity style={styles.outlineButton} onPress={profilDon}>
            <Text style={styles.outlineButtonText}>
              {t("profileDetails:back")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const yas = user?.birthDate ? yasHesapla(user.birthDate) : null;

  const avatarHarf =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toLocaleUpperCase(
      "tr-TR",
    ) ||
    user?.username?.charAt(0)?.toLocaleUpperCase("tr-TR") ||
    "?";

  // ========================================
  // ILGI ALANLARI
  // ========================================

  const ilgiAlanlariMetni =
    profile?.interests !== null && profile?.interests !== undefined
      ? String(profile.interests)
          .split(",")
          .map((ilgi) => enumAciklamasiGetir(ilgiAlanlari, ilgi.trim()))
          .filter((metin) => metin !== t("profileDetails:notSpecified"))
          .join(", ")
      : "";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========================================
            ÜST BAR
        ======================================== */}

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={profilDon}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.topTitleArea}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>

            <Text style={styles.topSubtitle}>
              {t("profileDetails:subtitle")}
            </Text>
          </View>
        </View>

        {/* ========================================
            PROFIL BILGILERI
        ======================================== */}

        {user && (
          <View style={styles.sectionCard}>
            <View style={styles.profilKimlikAlani}>
              <View style={styles.avatarFrame}>
                <KimlikDogrulamaliAvatar
                  kullaniciId={user.id}
                  boyut={96}
                  altYazi={avatarHarf}
                  imageStyle={styles.profileAvatar}
                />
              </View>

              <View style={styles.profilKimlikMetni}>
                <Text style={styles.profilAdSoyad}>
                  {`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    user.username}
                </Text>
                <Text style={styles.profilKullaniciAdi}>@{user.username}</Text>
                {user.city ? (
                  <Text style={styles.profilSehir}>📍 {user.city}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {t("profileDetails:profileInfo")}
            </Text>

            <View style={styles.summaryBox}>
              {/* Kullanıcı adi */}

              <View style={styles.summaryRow}>
                <Text style={styles.label}>{t("profileDetails:username")}</Text>

                <Text style={styles.value}>{user.username}</Text>
              </View>

              {/* Sehir */}

              {user.city && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("profileDetails:city")}</Text>

                  <Text style={styles.value}>{user.city}</Text>
                </View>
              )}

              {/* Yaş */}

              {yas !== null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("profileDetails:age")}</Text>

                  <Text style={styles.value}>{yas}</Text>
                </View>
              )}

              {/* Meslek */}

              {profile?.profession && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>
                    {t("profileDetails:profession")}
                  </Text>

                  <Text style={styles.value}>
                    {enumAciklamasiGetir(meslekler, profile.profession)}
                  </Text>
                </View>
              )}

              {/* Eğitim */}

              {profile?.education && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{egitimBasliginiGetir()}</Text>

                  <Text style={styles.value}>
                    {enumAciklamasiGetir(egitimler, profile.education)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================
            HAKKINDA
        ======================================== */}

        {profile?.about && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("profileDetails:about")}</Text>

            <View style={styles.aboutBox}>
              <Text style={styles.aboutText}>{profile.about}</Text>
            </View>
          </View>
        )}

        {/* ========================================
            GENEL BILGILER
        ======================================== */}

        {profile && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {t("profileDetails:generalInfo")}
            </Text>

            <View style={styles.infoGrid}>
              {/* Boy */}

              {profile.height !== null && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>
                    {t("profileDetails:height")}
                  </Text>

                  <Text style={styles.infoValue}>{profile.height} cm</Text>
                </View>
              )}

              {/* Kilo */}

              {profile.weight !== null && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>
                    {t("profileDetails:weight")}
                  </Text>

                  <Text style={styles.infoValue}>{profile.weight} kg</Text>
                </View>
              )}

              {/* Medeni durum */}

              {profile.maritalStatus && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>
                    {t("profileDetails:maritalStatus")}
                  </Text>

                  <Text style={styles.infoValue}>
                    {medeniDurumuCevir(profile.maritalStatus)}
                  </Text>
                </View>
              )}

              {/* Din */}

              {profile.religion && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>
                    {t("profileDetails:religion")}
                  </Text>

                  <Text style={styles.infoValue}>
                    {enumAciklamasiGetir(mezhepler, profile.religion)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================
            ILGI ALANLARI
        ======================================== */}

        {ilgiAlanlariMetni && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {t("profileDetails:interests")}
            </Text>

            <View style={styles.aboutBox}>
              <Text style={styles.aboutText}>{ilgiAlanlariMetni}</Text>
            </View>
          </View>
        )}

        {/* ========================================
            SORULAR VE CEVAPLAR
        ======================================== */}

        <View style={styles.sectionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionIcon}>❓</Text>

            <Text style={styles.sectionTitle}>
              {t("profileDetails:questionsAnswers")}
            </Text>
          </View>

          {cevaplar.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {t("profileDetails:emptyAnswers")}
              </Text>
            </View>
          ) : (
            cevaplar.map((cevap, index) => (
              <View key={cevap.id} style={styles.questionCard}>
                <Text style={styles.questionNumber}>Soru {index + 1}</Text>

                <Text style={styles.questionText}>
                  {soruMetniniGetir(cevap.questionId)}
                </Text>

                <Text style={styles.answerText}>{cevap.answer}</Text>
              </View>
            ))
          )}
        </View>

        {/* ========================================
            ALT BUTONLAR
        ======================================== */}

        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.bottomOutlineButton}
            onPress={profilDon}
          >
            <Text style={styles.bottomOutlineText}>
              {t("profileDetails:back")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomPrimaryButton}
            onPress={() => navigation.navigate("messages")}
          >
            <Text style={styles.bottomPrimaryText}>
              {t("profileDetails:allMessages")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10051F",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  yukleniyor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10051F",
  },

  yukleniyorText: {
    marginTop: 14,
    fontSize: 15,
    color: "#D7B8E8",
  },

  hataContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#210B31",
  },

  hataCard: {
    backgroundColor: "#10051F",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "#57206E",
  },

  hataBaslik: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F5D58F",
    marginBottom: 12,
  },

  hataText: {
    fontSize: 15,
    color: "#FF9AAE",
    lineHeight: 22,
    marginBottom: 22,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C45ADD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 25,
    color: "#E8B85B",
    fontWeight: "700",
  },

  topTitleArea: {
    flex: 1,
  },

  topTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F5D58F",
  },

  topSubtitle: {
    fontSize: 13,
    color: "#D7B8E8",
    marginTop: 3,
  },

  sectionCard: {
    marginBottom: 20,
  },

  profilKimlikAlani: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#260B38",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 14,
    marginBottom: 18,
  },

  avatarFrame: {
    width: 102,
    height: 102,
    borderRadius: 51,
    padding: 3,
    backgroundColor: "#E8B85B",
    marginRight: 14,
  },

  profileAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
    backgroundColor: "#57206E",
  },

  profilKimlikMetni: {
    flex: 1,
    justifyContent: "center",
  },

  profilAdSoyad: {
    fontSize: 19,
    fontWeight: "900",
    color: "#F5D58F",
    marginBottom: 5,
  },

  profilKullaniciAdi: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E8B85B",
    marginBottom: 5,
  },

  profilSehir: {
    fontSize: 13,
    color: "#D7B8E8",
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#F5D58F",
    marginBottom: 12,
  },

  summaryBox: {
    backgroundColor: "#2B103D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
  },

  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#D7B8E8",
  },

  value: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: "#E5D1EF",
  },

  aboutBox: {
    backgroundColor: "#2B103D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 18,
  },

  aboutText: {
    fontSize: 15,
    color: "#E5D1EF",
    lineHeight: 25,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#2B103D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 16,
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E8B85B",
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E5D1EF",
  },

  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  questionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#57206E",
    color: "#E8B85B",
    fontSize: 19,
    fontWeight: "900",
    marginRight: 8,
  },

  questionCard: {
    backgroundColor: "#2B103D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 18,
    marginBottom: 12,
  },

  questionNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C45ADD",
    marginBottom: 7,
  },

  questionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#F5D58F",
    lineHeight: 23,
    marginBottom: 10,
  },

  answerText: {
    fontSize: 15,
    color: "#E5D1EF",
    lineHeight: 24,
  },

  emptyBox: {
    backgroundColor: "#2B103D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#57206E",
    padding: 24,
    alignItems: "center",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#D7B8E8",
    lineHeight: 22,
  },

  outlineButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#C45ADD",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineButtonText: {
    color: "#E8B85B",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: "#57206E",
    paddingTop: 20,
    gap: 12,
  },

  bottomOutlineButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C45ADD",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomOutlineText: {
    color: "#E8B85B",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomPrimaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#E8B85B",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomPrimaryText: {
    color: "#10051F",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 30,
  },
});
