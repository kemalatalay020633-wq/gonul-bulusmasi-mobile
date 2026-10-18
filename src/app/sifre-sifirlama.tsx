import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { useState } from "react";
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

  const [email, setEmail] = useState("");
  const [kod, setKod] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [kodGonderildi, setKodGonderildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [basarili, setBasarili] = useState(false);

  const kodGonder = async () => {
    const temizEmail = email.trim().toLowerCase();

    if (!temizEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temizEmail)) {
      setMesaj("Geçerli bir e-posta adresi gir.");
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
      setMesaj(
        "Talebin alındı. Hesabın bu e-posta adresiyle kayıtlıysa sıfırlama kodu gönderilecektir.",
      );
    } catch (error: unknown) {
      if (__DEV__) {
        console.log(
          "ŞİFRE SIFIRLAMA KOD İSTEĞİ HATASI:",
          axios.isAxiosError(error)
            ? (error.response?.status ?? error.message)
            : error,
        );
      }

      setMesaj(
        axios.isAxiosError(error) && !error.response
          ? "Sunucuya bağlanılamadı. İnternet ve backend bağlantısını kontrol et."
          : "Kod isteği şu anda tamamlanamadı. Biraz sonra tekrar dene.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const sifreyiYenile = async () => {
    const temizEmail = email.trim().toLowerCase();
    const temizKod = kod.trim();

    if (!/^\d{6}$/.test(temizKod)) {
      setMesaj("E-postana gelen 6 haneli kodu gir.");
      return;
    }

    if (yeniSifre.length < 8 || yeniSifre.length > 72) {
      setMesaj("Yeni şifre 8 ile 72 karakter arasında olmalı.");
      return;
    }

    if (yeniSifre !== yeniSifreTekrar) {
      setMesaj("Girdiğin şifreler birbiriyle aynı değil.");
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
        "Şifre yenilendi",
        "Yeni şifrenle giriş yapabilirsin.",
        [
          {
            text: "Giriş ekranına dön",
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

      setMesaj(
        !axios.isAxiosError(error) || !error.response
          ? "Sunucuya bağlanılamadı. Backend bağlantısını kontrol et."
          : durum === 429
            ? "Çok fazla deneme yapıldı. Bir süre bekleyip tekrar dene."
            : "Şifre yenilenemedi. E-posta adresini ve kodu kontrol et; kodun süresi dolmuş olabilir.",
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
                ? "Şifren yenilendi"
                : kodGonderildi
                  ? "Yeni şifreni belirle"
                  : "Şifremi Unuttum"}
            </Text>

            <Text style={styles.aciklama}>
              {basarili
                ? "Hesabına yeni şifrenle giriş yapabilirsin."
                : kodGonderildi
                  ? "E-posta adresine gelen 6 haneli kodu ve yeni şifreni gir."
                  : "E-posta adresini gir. Hesabın kayıtlıysa sana şifre sıfırlama kodu gönderilecek."}
            </Text>

            {!basarili && (
              <>
                <Text style={styles.etiket}>E-posta adresi</Text>
                <TextInput
                  style={styles.girdi}
                  placeholder="ornek@eposta.com"
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
                    <Text style={styles.etiket}>6 haneli doğrulama kodu</Text>
                    <TextInput
                      style={styles.girdi}
                      placeholder="123456"
                      placeholderTextColor="#999"
                      value={kod}
                      onChangeText={(deger) =>
                        setKod(deger.replace(/\D/g, "").slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!yukleniyor}
                    />

                    <Text style={styles.etiket}>Yeni şifre</Text>
                    <TextInput
                      style={styles.girdi}
                      placeholder="En az 8 karakter"
                      placeholderTextColor="#999"
                      value={yeniSifre}
                      onChangeText={setYeniSifre}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={72}
                      editable={!yukleniyor}
                    />

                    <Text style={styles.etiket}>Yeni şifre tekrar</Text>
                    <TextInput
                      style={styles.girdi}
                      placeholder="Yeni şifreni tekrar gir"
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
                    style={[
                      styles.mesaj,
                      mesaj.includes("Talebin alındı") && styles.bilgiMesaji,
                    ]}
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
                        ? "Şifremi Yenile"
                        : "Sıfırlama Kodu Gönder"}
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
                    }}
                    disabled={yukleniyor}
                  >
                    <Text style={styles.ikincilYazi}>
                      E-posta adresini değiştir
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
                <Text style={styles.butonYazi}>Giriş Yap</Text>
              </Pressable>
            )}

            {!basarili && (
              <Pressable
                style={styles.geriButon}
                onPress={() => navigation.navigate("index")}
                disabled={yukleniyor}
              >
                <Text style={styles.geriYazi}>← Giriş ekranına dön</Text>
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
