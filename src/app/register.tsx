import React, { useState } from "react";
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
import { API_BASE_URL } from "../config/api";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
const API_ADRESI = API_BASE_URL + "/api";

export default function Register() {
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
      setError("L�tfen kullanici adinizi giriniz.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Kullanici adi en az 3 karakter olmalidir.");
      return;
    }

    if (!email.trim()) {
      setError("L�tfen e-posta adresinizi giriniz.");
      return;
    }

    if (!password) {
      setError("L�tfen �Yifrenizi giriniz.");
      return;
    }

    if (password.length < 8) {
      setError("Sifre en az 8 karakter olmalidir.");
      return;
    }

    if (!firstName.trim()) {
      setError("L�tfen adinizi giriniz.");
      return;
    }

    if (!lastName.trim()) {
      setError("L�tfen soyadinizi giriniz.");
      return;
    }

    if (!birthDate.trim()) {
      setError("L�tfen do�Yum tarihinizi giriniz.");
      return;
    }

    if (!gender) {
      setError("L�tfen cinsiyet se�iniz.");
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
      setError("Do�Yum tarihini GG/AA/YYYY �Yeklinde giriniz.");
      return;
    }

    const gun = parcalar[0];
    const ay = parcalar[1];
    const yil = parcalar[2];

    if (gun.length !== 2 || ay.length !== 2 || yil.length !== 4) {
      setError("Do�Yum tarihini GG/AA/YYYY �Yeklinde giriniz.");
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
      setError("Do�Yum tarihi ge�ersiz.");
      return;
    }

    if (aySayisi < 1 || aySayisi > 12) {
      setError("Do�Yum tarihi ge�ersiz. Ay 01-12 arasinda olmalidir.");
      return;
    }

    if (gunSayisi < 1 || gunSayisi > 31) {
      setError("Do�Yum tarihi ge�ersiz. G�n 01-31 arasinda olmalidir.");
      return;
    }

    /*
     * =========================================================
     * GER�?EK TAKVIM TARIHI KONTROL�o
     *
     * �-rne�Yin:
     * 31/02/1990 -> ge�ersiz
     * =========================================================
     */

    const kontrolTarihi = new Date(yilSayisi, aySayisi - 1, gunSayisi);

    if (
      kontrolTarihi.getFullYear() !== yilSayisi ||
      kontrolTarihi.getMonth() !== aySayisi - 1 ||
      kontrolTarihi.getDate() !== gunSayisi
    ) {
      setError("Ge�erli bir do�Yum tarihi giriniz.");
      return;
    }

    /*
     * =========================================================
     * GELECEK TARIH KONTROL�o
     * =========================================================
     */

    const bugun = new Date();

    if (kontrolTarihi >= bugun) {
      setError("Do�Yum tarihi gelecekte olamaz.");
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
       * Backend T�rk�e olarak "mesaj" d�nd�r�yor.
       * Bu y�zden hem mesaj hem message kontrol ediyoruz.
       * =====================================================
       */

      if (!response.ok) {
        throw new Error(
          data.mesaj ||
            data.message ||
            data.error ||
            `Kayit ba�Yarisiz. HTTP ${response.status}`,
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

      Alert.alert("Kayit Ba�Yarili", "G�n�l Bulu�Ymasi'na ho�Y geldiniz.", [
        {
          text: "Devam Et",

          onPress: () => {
            router.replace("/home");
          },
        },
      ]);
    } catch (hata) {
      console.error("KAYIT HATASI:", hata);

      if (hata instanceof Error) {
        setError(hata.message);
      } else {
        setError("Kayit sirasinda bir hata olu�Ytu.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * CINSIYET SE�?IMI
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
              �oST ALAN
          ================================================= */}

          <View style={styles.header}>
            {/* =================================================
                GER�?EK G�-N�oL BULUSMASI LOGOSU
            ================================================= */}

            <View style={styles.logoAlan}>
              <Image
                source={require("./logo/logo-gonul-bulusmasi.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>G�n�l Bulu�Ymasi</Text>

            <Text style={styles.subtitle}>
              Yeni bir ba�Ylangi� i�in ilk adim
            </Text>
          </View>

          {/* =================================================
              KART
          ================================================= */}

          <View style={styles.card}>
            <Text style={styles.title}>Hesabini olu�Ytur</Text>

            <Text style={styles.description}>
              �ocretsiz olarak kaydol ve G�n�l Bulu�Ymasi'na katil.
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
              <Text style={styles.label}>Do�Yum Tarihi</Text>

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

              <Text style={styles.helperText}>�-rnek: 15/05/1990</Text>
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
                    gY'� Kadin
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
                    gY'� Erkek
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
                  <Text style={styles.buttonIcon}>gY'�</Text>

                  <Text style={styles.registerButtonText}>
                    �ocretsiz Kayit Ol
                  </Text>
                </>
              )}
            </Pressable>

            {/* =================================================
                G�oVENLIK
            ================================================= */}

            <View style={styles.securityBox}>
              <Text style={styles.securityIcon}>gY"'</Text>

              <Text style={styles.securityText}>
                Ki�Yisel bilgilerini korumaya �nem veriyoruz. Hesabini istedi�Yin
                zaman silebilirsin.
              </Text>
            </View>

            {/* =================================================
                GIRIS
            ================================================= */}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Zaten hesabin var mi?</Text>

              <Pressable onPress={() => router.replace("/")}>
                <Text style={styles.loginButton}>Giri�Y Yap</Text>
              </Pressable>
            </View>

            {/* =================================================
                ALT BILGI
            ================================================= */}

            <Text style={styles.footerText}>
              Kayit olarak G�n�l Bulu�Ymasi topluluk kurallarina uymayi kabul
              etmi�Y olursun.
            </Text>
          </View>

          {/* =================================================
              �-ZELLIKLER
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
              <Text style={styles.featureIcon}>�o"</Text>

              <Text style={styles.featureText}>Profilini kendin olu�Ytur</Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>gY"�</Text>

              <Text style={styles.featureText}>G�venli kullanim</Text>
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
   * GER�?EK LOGO
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
   * G�oVENLIK
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
   * �-ZELLIKLER
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

