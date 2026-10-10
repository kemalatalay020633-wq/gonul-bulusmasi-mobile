import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// src/app/home.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "../config/api";
const API_ADRESI = API_BASE_URL + "/api";

export default function Register() {
  const navigation = useNavigation<any>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * =========================================================
   * KAYIT
   * =========================================================
   */

  const handleRegister = async () => {
    setError("");

    if (!username.trim()) {
      setError("Lï¿½tfen kullanici adinizi giriniz.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Kullanici adi en az 3 karakter olmalidir.");
      return;
    }

    if (!email.trim()) {
      setError("Lï¿½tfen e-posta adresinizi giriniz.");
      return;
    }

    if (!password) {
      setError("Lï¿½tfen ï¿½Yifrenizi giriniz.");
      return;
    }

    if (password.length < 8) {
      setError("Sifre en az 8 karakter olmalidir.");
      return;
    }

    if (!firstName.trim()) {
      setError("Lï¿½tfen adinizi giriniz.");
      return;
    }

    if (!lastName.trim()) {
      setError("Lï¿½tfen soyadinizi giriniz.");
      return;
    }

    if (!birthDate.trim()) {
      setError("Lï¿½tfen doï¿½Yum tarihinizi giriniz.");
      return;
    }

    if (!gender) {
      setError("Lï¿½tfen cinsiyet seï¿½iniz.");
      return;
    }

    /*
     * =========================================================
     * DOGUM TARIHI
     *
     * Kullanici:
     * GG/AA/YYYY
     *
     * Backend:
     * YYYY-MM-DD
     * =========================================================
     */

    const parcalar = birthDate.split("/");

    if (parcalar.length !== 3) {
      setError("Doï¿½Yum tarihini GG/AA/YYYY ï¿½Yeklinde giriniz.");
      return;
    }

    const gun = parcalar[0];
    const ay = parcalar[1];
    const yil = parcalar[2];

    if (gun.length !== 2 || ay.length !== 2 || yil.length !== 4) {
      setError("Doï¿½Yum tarihini GG/AA/YYYY ï¿½Yeklinde giriniz.");
      return;
    }

    const gunSayisi = Number(gun);
    const aySayisi = Number(ay);
    const yilSayisi = Number(yil);

    if (
      !Number.isInteger(gunSayisi) ||
      !Number.isInteger(aySayisi) ||
      !Number.isInteger(yilSayisi)
    ) {
      setError("Doï¿½Yum tarihi geï¿½ersiz.");
      return;
    }

    if (aySayisi < 1 || aySayisi > 12) {
      setError("Doï¿½Yum tarihi geï¿½ersiz. Ay 01-12 arasinda olmalidir.");
      return;
    }

    if (gunSayisi < 1 || gunSayisi > 31) {
      setError("Doï¿½Yum tarihi geï¿½ersiz. Gï¿½n 01-31 arasinda olmalidir.");
      return;
    }

    /*
     * =========================================================
     * GERï¿½?EK TAKVIM TARIHI KONTROLï¿½o
     *
     * ï¿½-rneï¿½Yin:
     * 31/02/1990 -> geï¿½ersiz
     * =========================================================
     */

    const kontrolTarihi = new Date(yilSayisi, aySayisi - 1, gunSayisi);

    if (
      kontrolTarihi.getFullYear() !== yilSayisi ||
      kontrolTarihi.getMonth() !== aySayisi - 1 ||
      kontrolTarihi.getDate() !== gunSayisi
    ) {
      setError("Geï¿½erli bir doï¿½Yum tarihi giriniz.");
      return;
    }

    /*
     * =========================================================
     * GELECEK TARIH KONTROLï¿½o
     * =========================================================
     */

    const bugun = new Date();

    if (kontrolTarihi >= bugun) {
      setError("Doï¿½Yum tarihi gelecekte olamaz.");
      return;
    }

    /*
     * =========================================================
     * BACKEND TARIH FORMATI
     *
     * 19/05/1990
     *
     * ->
     *
     * 1990-05-19
     * =========================================================
     */

    const birthDateBackend = `${yil}-${ay}-${gun}`;

    console.log("DOGUM TARIHI MOBIL:", birthDate);

    console.log("DOGUM TARIHI BACKEND:", birthDateBackend);

    console.log("CINSIYET:", gender);

    setLoading(true);

    try {
      const registerUrl = `${API_ADRESI}/auth/register`;

      console.log("KAYIT URL:", registerUrl);

      /*
       * =====================================================
       * BACKEND'E KAYIT ISTEGI
       * =====================================================
       */

      const requestBody = {
        username: username.trim(),
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDateBackend,
        gender,
      };

      console.log("KAYIT REQUEST:", JSON.stringify(requestBody));

      const response = await fetch(registerUrl, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      console.log("KAYIT STATUS:", response.status);

      const responseText = await response.text();

      console.log("KAYIT CEVABI:", responseText);

      let data: any = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {
            message: responseText,
          };
        }
      }

      /*
       * =====================================================
       * HATA
       *
       * Backend Tï¿½rkï¿½e olarak "mesaj" dï¿½ndï¿½rï¿½yor.
       * Bu yï¿½zden hem mesaj hem message kontrol ediyoruz.
       * =====================================================
       */

      if (!response.ok) {
        throw new Error(
          data.mesaj ||
            data.message ||
            data.error ||
            `Kayit baï¿½Yarisiz. HTTP ${response.status}`,
        );
      }

      /*
       * =====================================================
       * BASARILI
       * =====================================================
       */

      console.log("KAYIT BASARILI:", data);

      /*
       * =====================================================
       * TOKEN
       * =====================================================
       */

      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
      }

      /*
       * =====================================================
       * USER ID
       * =====================================================
       */

      if (data.userId !== undefined && data.userId !== null) {
        await AsyncStorage.setItem("userId", String(data.userId));
      }

      /*
       * =====================================================
       * USERNAME
       * =====================================================
       */

      if (data.username) {
        await AsyncStorage.setItem("username", data.username);
      }

      /*
       * =====================================================
       * BASARI MESAJI
       * =====================================================
       */

      Alert.alert(
        "Kayit Baï¿½Yarili",
        "Gï¿½nï¿½l Buluï¿½Ymasi'na hoï¿½Y geldiniz.",
        [
          {
            text: "Devam Et",

            onPress: () => {
              navigation.replace("home");
            },
          },
        ],
      );
    } catch (hata) {
      console.error("KAYIT HATASI:", hata);

      if (hata instanceof Error) {
        setError(hata.message);
      } else {
        setError("Kayit sirasinda bir hata oluï¿½Ytu.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * CINSIYET SEï¿½?IMI
   *
   * Backend enum:
   * KADIN
   * ERKEK
   * =========================================================
   */

  const cinsiyetSec = (deger: string) => {
    setGender(deger);
    setError("");
  };

  /*
   * =========================================================
   * EKRAN
   * =========================================================
   */

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* =================================================
              ï¿½oST ALAN
          ================================================= */}

          <View style={styles.header}>
            {/* =================================================
                GERï¿½?EK Gï¿½-Nï¿½oL BULUSMASI LOGOSU
            ================================================= */}

            <View style={styles.logoAlan}>
              <Image
                source={require("./logo/logo-gonul-bulusmasi.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>Gï¿½nï¿½l Buluï¿½Ymasi</Text>

            <Text style={styles.subtitle}>
              Yeni bir baï¿½Ylangiï¿½ iï¿½in ilk adim
            </Text>
          </View>

          {/* =================================================
              KART
          ================================================= */}

          <View style={styles.card}>
            <Text style={styles.title}>Hesabini oluï¿½Ytur</Text>

            <Text style={styles.description}>
              ï¿½ocretsiz olarak kaydol ve Gï¿½nï¿½l Buluï¿½Ymasi'na katil.
            </Text>

            {/* =================================================
                HATA
            ================================================= */}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* =================================================
                KULLANICI ADI
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kullanici Adi</Text>

              <TextInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError("");
                }}
                placeholder="Kullanici adin"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                style={styles.input}
              />
            </View>

            {/* =================================================
                E-POSTA
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>

              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                placeholder="E-posta adresin"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* =================================================
                SIFRE
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sifre</Text>

              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                placeholder="Sifren"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                style={styles.input}
              />

              <Text style={styles.helperText}>
                Sifren en az 8 karakter olmalidir.
              </Text>
            </View>

            {/* =================================================
                AD
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad</Text>

              <TextInput
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setError("");
                }}
                placeholder="Adin"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            {/* =================================================
                SOYAD
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Soyad</Text>

              <TextInput
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setError("");
                }}
                placeholder="Soyadin"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            {/* =================================================
                DOGUM TARIHI
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Doï¿½Yum Tarihi</Text>

              <TextInput
                value={birthDate}
                onChangeText={(text) => {
                  /*
                   * Sadece rakamlari al
                   */

                  const temiz = text.replace(/[^0-9]/g, "");

                  let formatli = temiz;

                  /*
                   * GG/...
                   */

                  if (temiz.length > 2) {
                    formatli = temiz.slice(0, 2) + "/" + temiz.slice(2);
                  }

                  /*
                   * GG/AA/...
                   */

                  if (temiz.length > 4) {
                    formatli =
                      temiz.slice(0, 2) +
                      "/" +
                      temiz.slice(2, 4) +
                      "/" +
                      temiz.slice(4, 8);
                  }

                  setBirthDate(formatli);

                  setError("");
                }}
                placeholder="GG/AA/YYYY"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
              />

              <Text style={styles.helperText}>ï¿½-rnek: 15/05/1990</Text>
            </View>

            {/* =================================================
                CINSIYET
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cinsiyet</Text>

              <View style={styles.genderRow}>
                {/* KADIN */}

                <Pressable
                  style={[
                    styles.genderButton,
                    gender === "KADIN" && styles.genderButtonSelected,
                  ]}
                  onPress={() => cinsiyetSec("KADIN")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === "KADIN" && styles.genderTextSelected,
                    ]}
                  >
                    gY'ï¿½ Kadin
                  </Text>
                </Pressable>

                {/* ERKEK */}

                <Pressable
                  style={[
                    styles.genderButton,
                    gender === "ERKEK" && styles.genderButtonSelected,
                  ]}
                  onPress={() => cinsiyetSec("ERKEK")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === "ERKEK" && styles.genderTextSelected,
                    ]}
                  >
                    gY'ï¿½ Erkek
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* =================================================
                KAYIT BUTONU
            ================================================= */}

            <Pressable
              style={[
                styles.registerButton,
                loading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.buttonIcon}>gY'ï¿½</Text>

                  <Text style={styles.registerButtonText}>
                    ï¿½ocretsiz Kayit Ol
                  </Text>
                </>
              )}
            </Pressable>

            {/* =================================================
                Gï¿½oVENLIK
            ================================================= */}

            <View style={styles.securityBox}>
              <Text style={styles.securityIcon}>gY"'</Text>

              <Text style={styles.securityText}>
                Kiï¿½Yisel bilgilerini korumaya ï¿½nem veriyoruz. Hesabini
                istediï¿½Yin zaman silebilirsin.
              </Text>
            </View>

            {/* =================================================
                GIRIS
            ================================================= */}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Zaten hesabin var mi?</Text>

              <Pressable onPress={() => navigation.replace("index")}>
                <Text style={styles.loginButton}>Giriï¿½Y Yap</Text>
              </Pressable>
            </View>

            {/* =================================================
                ALT BILGI
            ================================================= */}

            <Text style={styles.footerText}>
              Kayit olarak Gï¿½nï¿½l Buluï¿½Ymasi topluluk kurallarina uymayi
              kabul etmiï¿½Y olursun.
            </Text>
          </View>

          {/* =================================================
              ï¿½-ZELLIKLER
          ================================================= */}

          <View style={styles.features}>
            <View style={styles.logoAlan}>
              <Image
                source={require("./logo/logo-gonul-bulusmasi.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>ï¿½o"</Text>

              <Text style={styles.featureText}>
                Profilini kendin oluï¿½Ytur
              </Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>gY"ï¿½</Text>

              <Text style={styles.featureText}>Gï¿½venli kullanim</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f3ff",
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 25,
  },

  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },

  /*
   * =========================================================
   * HEADER
   * =========================================================
   */

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  /*
   * =========================================================
   * GERï¿½?EK LOGO
   * =========================================================
   */

  logoAlan: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },

  logo: {
    width: 300,
    height: 170,
  },

  appTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#3b0764",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },

  /*
   * =========================================================
   * KART
   * =========================================================
   */

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,

    shadowColor: "#5b21b6",

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.12,
    shadowRadius: 25,

    elevation: 6,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    color: "#3b0764",
    marginBottom: 7,
  },

  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 21,
    marginBottom: 22,
  },

  /*
   * =========================================================
   * HATA
   * =========================================================
   */

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 15,
  },

  errorText: {
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  /*
   * =========================================================
   * INPUT
   * =========================================================
   */

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    width: "100%",
    minHeight: 52,

    borderWidth: 1,
    borderColor: "#ddd6fe",

    borderRadius: 12,

    backgroundColor: "#fafafa",

    paddingHorizontal: 15,

    fontSize: 15,
    color: "#111827",
  },

  helperText: {
    marginTop: 5,
    fontSize: 11,
    color: "#6b7280",
  },

  /*
   * =========================================================
   * CINSIYET
   * =========================================================
   */

  genderRow: {
    flexDirection: "row",
    gap: 10,
  },

  genderButton: {
    flex: 1,
    minHeight: 52,

    borderWidth: 1,
    borderColor: "#ddd6fe",

    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#fafafa",
  },

  genderButtonSelected: {
    backgroundColor: "#f3e8ff",
    borderColor: "#7c3aed",
    borderWidth: 2,
  },

  genderText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "700",
  },

  genderTextSelected: {
    color: "#6d28d9",
    fontWeight: "800",
  },

  /*
   * =========================================================
   * KAYIT BUTONU
   * =========================================================
   */

  registerButton: {
    minHeight: 55,

    marginTop: 5,

    borderRadius: 13,

    backgroundColor: "#7c3aed",

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    shadowColor: "#7c3aed",

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,
    shadowRadius: 12,

    elevation: 5,
  },

  registerButtonDisabled: {
    opacity: 0.65,
  },

  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  registerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  /*
   * =========================================================
   * Gï¿½oVENLIK
   * =========================================================
   */

  securityBox: {
    marginTop: 16,

    padding: 13,

    borderRadius: 12,

    backgroundColor: "#faf5ff",

    borderWidth: 1,
    borderColor: "#ede9fe",

    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  securityText: {
    flex: 1,

    color: "#5b21b6",

    fontSize: 11,
    lineHeight: 17,

    fontWeight: "600",
  },

  /*
   * =========================================================
   * GIRIS
   * =========================================================
   */

  loginContainer: {
    marginTop: 22,

    paddingTop: 20,

    borderTopWidth: 1,
    borderTopColor: "#ede9fe",

    alignItems: "center",
  },

  loginText: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 7,
  },

  loginButton: {
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: "800",
  },

  /*
   * =========================================================
   * ALT BILGI
   * =========================================================
   */

  footerText: {
    marginTop: 18,

    color: "#a1a1aa",

    fontSize: 10,
    lineHeight: 15,

    textAlign: "center",
  },

  /*
   * =========================================================
   * ï¿½-ZELLIKLER
   * =========================================================
   */

  features: {
    marginTop: 20,

    flexDirection: "row",

    justifyContent: "space-between",

    gap: 8,
  },

  feature: {
    flex: 1,

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.75)",

    borderRadius: 12,

    paddingVertical: 11,
    paddingHorizontal: 5,
  },

  featureIcon: {
    fontSize: 18,
    marginBottom: 4,
  },

  featureText: {
    color: "#6b7280",

    fontSize: 10,

    fontWeight: "700",

    textAlign: "center",
  },
});
