import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
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
  kod: string | number;
  aciklama: string;
};

export default function ProfilDetay() {
  const navigation = useNavigation<any>();

  const route = useRoute<any>();
  const params = route.params as { id: string };

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const hedefKullanıcıId = id ? Number(id) : null;

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
      throw new Error(text || `İstek başarısız. HTTP ${response.status}`);
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
      return "Belirtilmemiş";
    }

    const bulunan = liste.find((item) => Number(item.kod) === Number(kod));

    return bulunan?.aciklama ?? "Belirtilmemiş";
  };

  const soruMetniniGetir = (soruId: number) => {
    const soru = sorular.find((item) => Number(item.id) === Number(soruId));

    return soru?.question || "Profil sorusu";
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

        const token = await AsyncStorage.getItem("token");

        console.log("========================================");

        console.log("MOBIL PROFIL DETAY");

        console.log("ROUTE PARAMETRESI:", params);

        console.log("HEDEF KULLANICI:", hedefKullanıcıId);

        if (!token) {
          console.log("TOKEN BULUNAMADI");

          if (aktif) {
            navigation.replace("index");
          }

          return;
        }

        console.log("TOKEN VAR");

        if (!hedefKullanıcıId) {
          throw new Error("Kullanıcı profili bulunamadi.");
        }

        // ========================================
        // 1. KULLANICI
        // ========================================

        const kullanici = await apiGetir(`/users/${hedefKullanıcıId}`, token);

        if (!aktif) {
          return;
        }

        setUser(kullanici);

        console.log("KULLANICI RESPONSE:", kullanici);

        // ========================================
        // 2. PROFILLER
        // ========================================

        const profiller = (await apiGetir("/profiles", token)) || [];

        if (!aktif) {
          return;
        }

        console.log("PROFILLER:", profiller);

        const hedefProfil =
          profiller.find(
            (profil: Profile) =>
              Number(profil.userId) === Number(hedefKullanıcıId),
          ) || null;

        setProfile(hedefProfil);

        console.log("BULUNAN PROFIL:", hedefProfil);

        // ========================================
        // 3. AKTIF PROFIL SORULARI
        // ========================================

        const yuklenenSorular =
          (await apiGetir("/profile-questions/active", token)) || [];

        if (!aktif) {
          return;
        }

        setSorular(yuklenenSorular);

        console.log("SORULAR:", yuklenenSorular);

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

          console.log("CEVAPLAR:", doluCevaplar);
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

          console.log("MESLEKLER:", meslek);

          console.log("EGITIMLER:", egitim);

          console.log("MEDENI DURUMLAR:", medeni);

          console.log("MEZHEPLER:", mezhep);

          console.log("ILGI ALANLARI:", ilgi);
        } catch (enumHatasi) {
          console.log("ENUM YÜKLEME HATASI:", enumHatasi);
        }

        console.log("PROFİL DETAY YÜKLEME TAMAMLANDI");

        console.log("========================================");
      } catch (error) {
        console.error("MOBIL PROFIL DETAY HATASI:", error);

        if (!aktif) {
          return;
        }

        if (error instanceof Error) {
          setHata(error.message);
        } else {
          setHata("Profil detayları alinamadi.");
        }
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

        <Text style={styles.yukleniyorText}>
          Profil detayları yükleniyor...
        </Text>
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
          <Text style={styles.hataBaslik}>Profil Detayi</Text>

          <Text style={styles.hataText}>{hata}</Text>

          <TouchableOpacity style={styles.outlineButton} onPress={profilDon}>
            <Text style={styles.outlineButtonText}>← Profile Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const yas = user?.birthDate ? yasHesapla(user.birthDate) : null;

  // ========================================
  // ILGI ALANLARI
  // ========================================

  const ilgiAlanlariMetni = profile?.interests
    ? String(profile.interests)
        .split(",")
        .map((ilgi) => enumAciklamasiGetir(ilgiAlanlari, ilgi.trim()))
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

            <Text style={styles.topSubtitle}>Detayli Profil</Text>
          </View>
        </View>

        {/* ========================================
            PROFIL BILGILERI
        ======================================== */}

        {user && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Profil Bilgileri</Text>

            <View style={styles.summaryBox}>
              {/* Kullanıcı adi */}

              <View style={styles.summaryRow}>
                <Text style={styles.label}>Kullanıcı adi</Text>

                <Text style={styles.value}>{user.username}</Text>
              </View>

              {/* Sehir */}

              {user.city && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Sehir</Text>

                  <Text style={styles.value}>{user.city}</Text>
                </View>
              )}

              {/* Yaş */}

              {yas !== null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Yaş</Text>

                  <Text style={styles.value}>{yas}</Text>
                </View>
              )}

              {/* Meslek */}

              {profile?.profession && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Meslek</Text>

                  <Text style={styles.value}>
                    {enumAciklamasiGetir(meslekler, profile.profession)}
                  </Text>
                </View>
              )}

              {/* Eğitim */}

              {profile?.education && (
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Eğitim</Text>

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
            <Text style={styles.sectionTitle}>Hakkinda</Text>

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
            <Text style={styles.sectionTitle}>Genel Bilgiler</Text>

            <View style={styles.infoGrid}>
              {/* Boy */}

              {profile.height !== null && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Boy</Text>

                  <Text style={styles.infoValue}>{profile.height} cm</Text>
                </View>
              )}

              {/* Kilo */}

              {profile.weight !== null && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Kilo</Text>

                  <Text style={styles.infoValue}>{profile.weight} kg</Text>
                </View>
              )}

              {/* Medeni durum */}

              {profile.maritalStatus && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Medeni Durum</Text>

                  <Text style={styles.infoValue}>
                    {enumAciklamasiGetir(medeniDurumlar, profile.maritalStatus)}
                  </Text>
                </View>
              )}

              {/* Din */}

              {profile.religion && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Din</Text>

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
            <Text style={styles.sectionTitle}>Ilgi Alanlari</Text>

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

            <Text style={styles.sectionTitle}>Sorular ve Cevaplar</Text>
          </View>

          {cevaplar.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Bu profil için henüz cevaplanmış soru bulunmuyor.
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
            <Text style={styles.bottomOutlineText}>← Profile Dön</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomPrimaryButton}
            onPress={() => navigation.navigate("messages")}
          >
            <Text style={styles.bottomPrimaryText}>Tüm Mesajlar</Text>
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
    backgroundColor: "#FFFCFA",
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
    backgroundColor: "#FFFCFA",
  },

  yukleniyorText: {
    marginTop: 14,
    fontSize: 15,
    color: "#80666D",
  },

  hataContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#faf5ff",
  },

  hataCard: {
    backgroundColor: "#FFFCFA",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "#F5DCE3",
  },

  hataBaslik: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7A263C",
    marginBottom: 12,
  },

  hataText: {
    fontSize: 15,
    color: "#B72F4B",
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
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 25,
    color: "#A12E4A",
    fontWeight: "700",
  },

  topTitleArea: {
    flex: 1,
  },

  topTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#7A263C",
  },

  topSubtitle: {
    fontSize: 13,
    color: "#80666D",
    marginTop: 3,
  },

  sectionCard: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#7A263C",
    marginBottom: 12,
  },

  summaryBox: {
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5DCE3",
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
    color: "#80666D",
  },

  value: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: "#694650",
  },

  aboutBox: {
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5DCE3",
    padding: 18,
  },

  aboutText: {
    fontSize: 15,
    color: "#694650",
    lineHeight: 25,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5DCE3",
    padding: 16,
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8F2942",
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#694650",
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
    backgroundColor: "#F5DCE3",
    color: "#8F2942",
    fontSize: 19,
    fontWeight: "900",
    marginRight: 8,
  },

  questionCard: {
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5DCE3",
    padding: 18,
    marginBottom: 12,
  },

  questionNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8b5cf6",
    marginBottom: 7,
  },

  questionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#7A263C",
    lineHeight: 23,
    marginBottom: 10,
  },

  answerText: {
    fontSize: 15,
    color: "#694650",
    lineHeight: 24,
  },

  emptyBox: {
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5DCE3",
    padding: 24,
    alignItems: "center",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#80666D",
    lineHeight: 22,
  },

  outlineButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineButtonText: {
    color: "#A12E4A",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: "#F5DCE3",
    paddingTop: 20,
    gap: 12,
  },

  bottomOutlineButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomOutlineText: {
    color: "#A12E4A",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomPrimaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#A12E4A",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomPrimaryText: {
    color: "#FFFCFA",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 30,
  },
});
