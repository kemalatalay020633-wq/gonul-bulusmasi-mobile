import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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

import { API_BASE_URL } from "../config/api";
import type { RootStackParamList } from "../navigation/types";

type Navigasyon = NativeStackNavigationProp<RootStackParamList>;

export default function SifreSifirlamaScreen() {
  const navigation = useNavigation<Navigasyon>();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [kod, setKod] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [kodGonderildi, setKodGonderildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [basarili, setBasarili] = useState(false);
  const [bilgiMesaji, setBilgiMesaji] = useState(false);

  const kodGonder = async () => {
    const temizEmail = email.trim().toLowerCase();

    setBilgiMesaji(false);

    if (!temizEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temizEmail)) {
      setMesaj(t("passwordReset.errors.invalidEmail"));
      return;
    }

    setYukleniyor(true);
    setMesaj("");

    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password`,
        { email: temizEmail },
        { timeout: 15000 },
      );

      setEmail(temizEmail);
      setKodGonderildi(true);
      setBilgiMesaji(true);
      setMesaj(t("passwordReset.requestReceived"));
    } catch (error: unknown) {
      if (__DEV__) {
        console.log(
          "ŞİFRE SIFIRLAMA KOD İSTEĞİ HATASI:",
          axios.isAxiosError(error)
            ? (error.response?.status ?? error.message)
            : error,
        );
      }

      setBilgiMesaji(false);
      setMesaj(
        axios.isAxiosError(error) && !error.response
          ? t("passwordReset.errors.connection")
          : t("passwordReset.errors.requestFailed"),
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const sifreyiYenile = async () => {
    const temizEmail = email.trim().toLowerCase();
    const temizKod = kod.trim();

    setBilgiMesaji(false);

    if (!/^\d{6}$/.test(temizKod)) {
      setMesaj(t("passwordReset.errors.invalidCode"));
      return;
    }

    if (yeniSifre.length < 8 || yeniSifre.length > 72) {
      setMesaj(t("passwordReset.errors.passwordLength"));
      return;
    }

    if (yeniSifre !== yeniSifreTekrar) {
      setMesaj(t("passwordReset.errors.passwordMismatch"));
      return;
    }

    setYukleniyor(true);
    setMesaj("");

    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          email: temizEmail,
          kod: temizKod,
          yeniSifre,
        },
        { timeout: 15000 },
      );

      setBasarili(true);

      Alert.alert(
        t("passwordReset.resetSuccessTitle"),
        t("passwordReset.resetSuccessMessage"),
        [
          {
            text: t("passwordReset.returnLogin"),
            onPress: () => navigation.navigate("index"),
          },
        ],
        { cancelable: false },
      );
    } catch (error: unknown) {
      if (__DEV__) {
        console.log(
          "ŞİFRE YENİLEME HATASI:",
          axios.isAxiosError(error)
            ? (error.response?.status ?? error.message)
            : error,
        );
      }

      const durum = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      setBilgiMesaji(false);
      setMesaj(
        !axios.isAxiosError(error) || !error.response
          ? t("passwordReset.errors.connectionShort")
          : durum === 429
            ? t("passwordReset.errors.tooMany")
            : t("passwordReset.errors.resetFailed"),
      );
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={styles.alan}>
      <KeyboardAvoidingView
        style={styles.klavye}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.kaydirma}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.kart}>
            <View style={styles.simgeAlan}>
              <Text style={styles.simge}>🔐</Text>
            </View>

            <Text style={styles.baslik}>
              {basarili
                ? t("passwordReset.successTitle")
                : kodGonderildi
                  ? t("passwordReset.newPasswordTitle")
                  : t("passwordReset.title")}
            </Text>

            <Text style={styles.aciklama}>
              {basarili
                ? t("passwordReset.successDescription")
                : kodGonderildi
                  ? t("passwordReset.newPasswordDescription")
                  : t("passwordReset.description")}
            </Text>

            {!basarili && (
              <>
                <Text style={styles.etiket}>{t("passwordReset.email")}</Text>

                <TextInput
                  style={styles.girdi}
                  placeholder={t("passwordReset.emailPlaceholder")}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!kodGonderildi && !yukleniyor}
                  maxLength={254}
                />

                {kodGonderildi && (
                  <>
                    <Text style={styles.etiket}>{t("passwordReset.code")}</Text>

                    <TextInput
                      style={styles.girdi}
                      placeholder={t("passwordReset.codePlaceholder")}
                      placeholderTextColor="#999"
                      value={kod}
                      onChangeText={(deger) =>
                        setKod(deger.replace(/\D/g, "").slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!yukleniyor}
                    />

                    <Text style={styles.etiket}>
                      {t("passwordReset.newPassword")}
                    </Text>

                    <TextInput
                      style={styles.girdi}
                      placeholder={t("passwordReset.passwordPlaceholder")}
                      placeholderTextColor="#999"
                      value={yeniSifre}
                      onChangeText={setYeniSifre}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={72}
                      editable={!yukleniyor}
                    />

                    <Text style={styles.etiket}>
                      {t("passwordReset.repeatPassword")}
                    </Text>

                    <TextInput
                      style={styles.girdi}
                      placeholder={t("passwordReset.repeatPlaceholder")}
                      placeholderTextColor="#999"
                      value={yeniSifreTekrar}
                      onChangeText={setYeniSifreTekrar}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={72}
                      editable={!yukleniyor}
                    />
                  </>
                )}

                {!!mesaj && (
                  <Text
                    style={[styles.mesaj, bilgiMesaji && styles.bilgiMesaji]}
                  >
                    {mesaj}
                  </Text>
                )}

                <Pressable
                  style={[styles.buton, yukleniyor && styles.butonPasif]}
                  onPress={kodGonderildi ? sifreyiYenile : kodGonder}
                  disabled={yukleniyor}
                >
                  {yukleniyor ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.butonYazi}>
                      {kodGonderildi
                        ? t("passwordReset.reset")
                        : t("passwordReset.sendCode")}
                    </Text>
                  )}
                </Pressable>

                {kodGonderildi && (
                  <Pressable
                    style={styles.ikincilButon}
                    onPress={() => {
                      setKodGonderildi(false);
                      setKod("");
                      setYeniSifre("");
                      setYeniSifreTekrar("");
                      setMesaj("");
                      setBilgiMesaji(false);
                    }}
                    disabled={yukleniyor}
                  >
                    <Text style={styles.ikincilYazi}>
                      {t("passwordReset.changeEmail")}
                    </Text>
                  </Pressable>
                )}
              </>
            )}

            {basarili && (
              <Pressable
                style={styles.buton}
                onPress={() => navigation.navigate("index")}
              >
                <Text style={styles.butonYazi}>{t("passwordReset.login")}</Text>
              </Pressable>
            )}

            {!basarili && (
              <Pressable
                style={styles.geriButon}
                onPress={() => navigation.navigate("index")}
                disabled={yukleniyor}
              >
                <Text style={styles.geriYazi}>
                  {t("passwordReset.backLogin")}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  alan: {
    flex: 1,
    backgroundColor: "#FFF7F8",
  },
  klavye: {
    flex: 1,
  },
  kaydirma: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  kart: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  simgeAlan: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FCE7EF",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  simge: {
    fontSize: 34,
  },
  baslik: {
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    color: "#25212A",
  },
  aciklama: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#77717A",
    marginTop: 10,
    marginBottom: 26,
  },
  etiket: {
    fontSize: 14,
    fontWeight: "700",
    color: "#39323B",
    marginBottom: 8,
  },
  girdi: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5DDE2",
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#29232B",
    backgroundColor: "#FFFCFD",
    marginBottom: 18,
  },
  mesaj: {
    color: "#B42345",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  bilgiMesaji: {
    color: "#7A3150",
  },
  buton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  butonPasif: {
    opacity: 0.65,
  },
  butonYazi: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  ikincilButon: {
    alignItems: "center",
    paddingVertical: 16,
  },
  ikincilYazi: {
    color: "#C2185B",
    fontSize: 14,
    fontWeight: "700",
  },
  geriButon: {
    alignItems: "center",
    paddingTop: 22,
  },
  geriYazi: {
    color: "#756A73",
    fontSize: 14,
    fontWeight: "600",
  },
});
