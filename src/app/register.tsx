import { useState } from "react";
import {
  ActivityIndicator,
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
      setError("Lütfen kullanıcı adınızı giriniz.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Kullanıcı adi en az 3 karakter olmalıdır.");
      return;
    }

    if (!email.trim()) {
      setError("Lütfen e-posta adresinizi giriniz.");
      return;
    }

    if (!password) {
      setError("Lütfen şifrenizi giriniz.");
      return;
    }

    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (!firstName.trim()) {
      setError("Lütfen adınızı giriniz.");
      return;
    }

    if (!lastName.trim()) {
      setError("Lütfen soyadınızı giriniz.");
      return;
    }

    if (!birthDate.trim()) {
      setError("Lütfen doğum tarihinizi giriniz.");
      return;
    }

    if (!gender) {
      setError("Lütfen cinsiyet seçiniz.");
      return;
    }

    /*
     * =========================================================
     * DOGUM TARİHİ
     *
     * Kullanıcı:
     * GG/AA/YYYY
     *
     * Backend:
     * YYYY-MM-DD
     * =========================================================
     */

    const parcalar = birthDate.split("/");

    if (parcalar.length !== 3) {
      setError("Doğum tarihini GG/AA/YYYY şeklinde giriniz.");
      return;
    }

    const gun = parcalar[0];
    const ay = parcalar[1];
    const yil = parcalar[2];

    if (gun.length !== 2 || ay.length !== 2 || yil.length !== 4) {
      setError("Doğum tarihini GG/AA/YYYY şeklinde giriniz.");
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
      setError("Doğum tarihi geçersiz.");
      return;
    }

    if (aySayisi < 1 || aySayisi > 12) {
      setError("Doğum tarihi geçersiz. Ay 01-12 arasında olmalıdır.");
      return;
    }

    if (gunSayisi < 1 || gunSayisi > 31) {
      setError("Doğum tarihi geçersiz. Gün 01-31 arasında olmalıdır.");
      return;
    }

    /*
     * =========================================================
     * GERÇEK TAKVİM TARİHİ KONTROLÜ
     *
     * Örneğin:
     * 31/02/1990 -> geçersiz
     * =========================================================
     */

    const kontrolTarihi = new Date(yilSayisi, aySayisi - 1, gunSayisi);

    if (
      kontrolTarihi.getFullYear() !== yilSayisi ||
      kontrolTarihi.getMonth() !== aySayisi - 1 ||
      kontrolTarihi.getDate() !== gunSayisi
    ) {
      setError("Geçerli bir doğum tarihi giriniz.");
      return;
    }

    /*
     * =========================================================
     * GELECEK TARİH KONTROLÜ
     * =========================================================
     */

    const bugun = new Date();

    if (kontrolTarihi >= bugun) {
      setError("Doğum tarihi gelecekte olamaz.");
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

    console.log("DOGUM TARİHİ MOBIL:", birthDate);

    console.log("DOGUM TARİHİ BACKEND:", birthDateBackend);

    console.log("CİNSİYET:", gender);

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
       * Backend Türkçe olarak "mesaj" döndürüyor.
       * Bu yüzden hem mesaj hem message kontrol ediyoruz.
       * =====================================================
       */

      if (!response.ok) {
        throw new Error(
          data.mesaj ||
            data.message ||
            data.error ||
            `Kayıt başarısız. HTTP ${response.status}`,
        );
      }

      /*
       * =====================================================
       * BASARILI
       * =====================================================
       */

      console.log("KAYIT BAŞARILI:", data);

      navigation.replace("emailDogrulama", {
        email: email.trim(),
      });
    } catch (hata) {
      console.error("KAYIT HATASI:", hata);

      if (hata instanceof Error) {
        setError(hata.message);
      } else {
        setError("Kayıt sırasında bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * CİNSİYET SEÇİMİ
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
              ÜST ALAN
          ================================================= */}

          <View style={styles.header}>
            {/* =================================================
                GERÇEK GÖNÜL BULUŞMASI LOGOSU
            ================================================= */}

            <View style={styles.logoAlan}>
              <Image
                source={require("./logo/logo-gonul-bulusmasi.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>Gönül Buluşması</Text>

            <Text style={styles.subtitle}>
              Yeni bir başlangıç için ilk adım
            </Text>
          </View>

          {/* =================================================
              KART
          ================================================= */}

          <View style={styles.card}>
            <Text style={styles.title}>Hesabını oluştur</Text>

            <Text style={styles.description}>
              Ücretsiz olarak kaydol ve Gönül Buluşması'na katıl.
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
              <Text style={styles.label}>Kullanıcı Adi</Text>

              <TextInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError("");
                }}
                placeholder="Kullanıcı adin"
                placeholderTextColor="#A88F95"
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
                placeholderTextColor="#A88F95"
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
              <Text style={styles.label}>Şifre</Text>

              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                placeholder="Şifren"
                placeholderTextColor="#A88F95"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                style={styles.input}
              />

              <Text style={styles.helperText}>
                Şifren en az 8 karakter olmalıdır.
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
                placeholderTextColor="#A88F95"
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
                placeholder="Soyadın"
                placeholderTextColor="#A88F95"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            {/* =================================================
                DOGUM TARİHİ
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Doğum Tarihi</Text>

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
                placeholderTextColor="#A88F95"
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
              />

              <Text style={styles.helperText}>Örnek: 15/05/1990</Text>
            </View>

            {/* =================================================
                CİNSİYET
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
                    ♀ Kadın
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
                    ♂ Erkek
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
                <ActivityIndicator color="#FFFCFA" />
              ) : (
                <>
                  <Text style={styles.buttonIcon}>✦</Text>

                  <Text style={styles.registerButtonText}>
                    Ücretsiz Kayıt Ol
                  </Text>
                </>
              )}
            </Pressable>

            {/* =================================================
                GÜVENLİK
            ================================================= */}

            <View style={styles.securityBox}>
              <Text style={styles.securityIcon}>🔒</Text>

              <Text style={styles.securityText}>
                Kişisel bilgilerini korumaya önem veriyoruz. Hesabını istediğin
                zaman silebilirsin.
              </Text>
            </View>

            {/* =================================================
                GIRIS
            ================================================= */}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Zaten hesabın var mı?</Text>

              <Pressable onPress={() => navigation.replace("index")}>
                <Text style={styles.loginButton}>Giriş Yap</Text>
              </Pressable>
            </View>

            {/* =================================================
                ALT BILGI
            ================================================= */}

            <Text style={styles.footerText}>
              Kayıt olarak Gönül Buluşması topluluk kurallarına uymayı kabul
              etmiş olursun.
            </Text>
          </View>

          {/* =================================================
              ÖZELLİKLER
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
              <Text style={styles.featureIcon}>♡</Text>

              <Text style={styles.featureText}>Profilini kendin oluştur</Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🔒</Text>

              <Text style={styles.featureText}>Güvenli kullanım</Text>
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
    backgroundColor: "#F8E9ED",
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
   * GERÇEK LOGO
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
    color: "#80666D",
    fontWeight: "600",
  },

  /*
   * =========================================================
   * KART
   * =========================================================
   */

  card: {
    backgroundColor: "#FFFCFA",
    borderRadius: 22,
    padding: 22,

    shadowColor: "#7A263C",

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
    color: "#80666D",
    lineHeight: 21,
    marginBottom: 22,
  },

  /*
   * =========================================================
   * HATA
   * =========================================================
   */

  errorBox: {
    backgroundColor: "#FCE8EC",
    borderWidth: 1,
    borderColor: "#EFC1CC",
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
    color: "#694650",
    marginBottom: 7,
  },

  input: {
    width: "100%",
    minHeight: 52,

    borderWidth: 1,
    borderColor: "#E8C5CF",

    borderRadius: 12,

    backgroundColor: "#FFF9F6",

    paddingHorizontal: 15,

    fontSize: 15,
    color: "#48252F",
  },

  helperText: {
    marginTop: 5,
    fontSize: 11,
    color: "#80666D",
  },

  /*
   * =========================================================
   * CİNSİYET
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
    borderColor: "#E8C5CF",

    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFF9F6",
  },

  genderButtonSelected: {
    backgroundColor: "#f3e8ff",
    borderColor: "#8F2942",
    borderWidth: 2,
  },

  genderText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "700",
  },

  genderTextSelected: {
    color: "#A12E4A",
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

    backgroundColor: "#8F2942",

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    shadowColor: "#8F2942",

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
    color: "#FFFCFA",
    fontSize: 16,
    fontWeight: "800",
  },

  /*
   * =========================================================
   * GÜVENLİK
   * =========================================================
   */

  securityBox: {
    marginTop: 16,

    padding: 13,

    borderRadius: 12,

    backgroundColor: "#faf5ff",

    borderWidth: 1,
    borderColor: "#F5DCE3",

    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  securityText: {
    flex: 1,

    color: "#7A263C",

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
    borderTopColor: "#F5DCE3",

    alignItems: "center",
  },

  loginText: {
    color: "#80666D",
    fontSize: 13,
    marginBottom: 7,
  },

  loginButton: {
    color: "#8F2942",
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
   * ÖZELLİKLER
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
    color: "#80666D",

    fontSize: 10,

    fontWeight: "700",

    textAlign: "center",
  },
});
