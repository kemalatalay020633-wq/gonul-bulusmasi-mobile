import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";

export default function EmailDogrulamaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const email: string = route.params?.email ?? "";

  const [kod, setKod] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tekrarGonderiliyor, setTekrarGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");

  const yanitiOku = async (response: Response) => {
    const metin = await response.text();

    let veri: any = {};

    if (metin) {
      try {
        veri = JSON.parse(metin);
      } catch {
        veri = { mesaj: metin, message: metin };
      }
    }

    if (!response.ok) {
      throw new Error(
        veri.mesaj ||
          veri.message ||
          veri.error ||
          `İşlem başarısız. HTTP ${response.status}`,
      );
    }

    return veri;
  };

  const ePostayiDogrula = async () => {
    setHata("");

    if (!email.trim()) {
      setHata("E-posta adresi bulunamadı. Kayıt ekranından tekrar ilerle.");
      return;
    }

    if (!/^[0-9]{6}$/.test(kod)) {
      setHata("Lütfen e-posta adresine gelen 6 haneli kodu gir.");
      return;
    }

    setYukleniyor(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          kod,
        }),
      });

      await yanitiOku(response);

      Alert.alert(
        "E-posta doğrulandı",
        "Hesabın başarıyla doğrulandı. Giriş yapabilirsin.",
        [
          {
            text: "Giriş Yap",
            onPress: () => navigation.replace("index"),
          },
        ],
      );
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "E-posta doğrulanırken bir hata oluştu.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const dogrulamaKodunuTekrarGonder = async () => {
    setHata("");

    if (!email.trim()) {
      setHata("E-posta adresi bulunamadı. Kayıt ekranına dön.");
      return;
    }

    setTekrarGonderiliyor(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
      );

      const veri = await yanitiOku(response);

      Alert.alert(
        "İstek alındı",
        veri.mesaj ||
          veri.message ||
          "E-posta adresi kayıtlıysa yeni doğrulama kodu gönderilmiştir.",
      );
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Doğrulama kodu tekrar gönderilemedi.",
      );
    } finally {
      setTekrarGonderiliyor(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.ekran}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.kaydirma}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.kart}>
          <View style={styles.simgeKapsayici}>
            <Text style={styles.simge}>✉</Text>
          </View>

          <Text style={styles.baslik}>E-posta Doğrulama</Text>

          <Text style={styles.aciklama}>
            Gönül Buluşması hesabını etkinleştirmek için e-posta adresine
            gönderilen 6 haneli doğrulama kodunu gir.
          </Text>

          <View style={styles.emailKutusu}>
            <Text style={styles.emailEtiketi}>E-posta adresin</Text>
            <Text style={styles.email}>{email || "E-posta bulunamadı"}</Text>
          </View>

          {hata ? (
            <View style={styles.hataKutusu}>
              <Text style={styles.hataMetni}>{hata}</Text>
            </View>
          ) : null}

          <Text style={styles.inputEtiketi}>Doğrulama kodu</Text>

          <TextInput
            value={kod}
            onChangeText={(deger) => {
              setKod(deger.replace(/[^0-9]/g, "").slice(0, 6));
              setHata("");
            }}
            placeholder="000000"
            placeholderTextColor="#B9A5AC"
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            accessibilityLabel="6 haneli e-posta doğrulama kodu"
            editable={!yukleniyor && !tekrarGonderiliyor}
            style={styles.kodInput}
          />

          <Text style={styles.ipucu}>
            Kod e-posta gelen kutunda veya gereksiz posta klasöründe olabilir.
          </Text>

          <Pressable
            style={[
              styles.anaButon,
              (yukleniyor || tekrarGonderiliyor) && styles.butonPasif,
            ]}
            onPress={ePostayiDogrula}
            disabled={yukleniyor || tekrarGonderiliyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.anaButonMetni}>E-postayı Doğrula</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.tekrarButon}
            onPress={dogrulamaKodunuTekrarGonder}
            disabled={yukleniyor || tekrarGonderiliyor}
          >
            {tekrarGonderiliyor ? (
              <ActivityIndicator color="#8F2942" />
            ) : (
              <Text style={styles.tekrarButonMetni}>Yeni Kod Gönder</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.geriButon}
            onPress={() => navigation.replace("register")}
            disabled={yukleniyor || tekrarGonderiliyor}
          >
            <Text style={styles.geriButonMetni}>Kayıt ekranına dön</Text>
          </Pressable>

          <Text style={styles.guvenlikNotu}>
            Güvenliğin için doğrulama kodunu kimseyle paylaşma.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
    backgroundColor: "#F8E9ED",
  },
  kaydirma: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  kart: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFCFA",
    elevation: 6,
    shadowColor: "#7A263C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  simgeKapsayici: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E4EA",
    marginBottom: 20,
  },
  simge: {
    fontSize: 32,
    color: "#8F2942",
  },
  baslik: {
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    color: "#3B0764",
  },
  aciklama: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    color: "#80666D",
  },
  emailKutusu: {
    marginTop: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8EEF1",
  },
  emailEtiketi: {
    marginBottom: 5,
    fontSize: 12,
    color: "#80666D",
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8F2942",
    textAlign: "center",
  },
  hataKutusu: {
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EFC1CC",
    borderRadius: 12,
    backgroundColor: "#FCE8EC",
  },
  hataMetni: {
    color: "#991B1B",
    fontSize: 13,
    lineHeight: 19,
  },
  inputEtiketi: {
    marginBottom: 8,
    color: "#48252F",
    fontSize: 13,
    fontWeight: "700",
  },
  kodInput: {
    height: 62,
    borderWidth: 1,
    borderColor: "#E8C5CF",
    borderRadius: 14,
    backgroundColor: "#FFF9F6",
    textAlign: "center",
    letterSpacing: 12,
    paddingLeft: 12,
    fontSize: 25,
    fontWeight: "800",
    color: "#48252F",
  },
  ipucu: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#9A858C",
  },
  anaButon: {
    minHeight: 54,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: "#8F2942",
    alignItems: "center",
    justifyContent: "center",
  },
  butonPasif: {
    opacity: 0.65,
  },
  anaButonMetni: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  tekrarButon: {
    minHeight: 48,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tekrarButonMetni: {
    color: "#8F2942",
    fontSize: 14,
    fontWeight: "800",
  },
  geriButon: {
    alignItems: "center",
    paddingVertical: 10,
  },
  geriButonMetni: {
    color: "#80666D",
    fontSize: 13,
    fontWeight: "700",
  },
  guvenlikNotu: {
    marginTop: 14,
    textAlign: "center",
    color: "#9A858C",
    fontSize: 11,
    lineHeight: 17,
  },
});
