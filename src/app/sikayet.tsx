import { tokenGetir } from "../services/tokenServisi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";

const API_ADRESI = `${API_BASE_URL}/api`;

const MOR = "#6D28D9";
const KOYU_MOR = "#32105C";
const ARKA_PLAN = "#F5F3FA";
const METIN = "#241A35";
const IKINCIL_METIN = "#81778F";
const KIRMIZI = "#BE123C";

const SIKAYET_NEDENLERI = [
  {
    kod: "MEDENI_DURUMUNU_GIZLEME",
    ceviriAnahtari: "reasons.maritalStatus",
    ikon: "💍",
  },
  {
    kod: "SAHTE_PROFIL",
    ceviriAnahtari: "reasons.fakeProfile",
    ikon: "👤",
  },
  {
    kod: "TACIZ_VE_ISRARLI_MESAJ",
    ceviriAnahtari: "reasons.harassment",
    ikon: "💬",
  },
  {
    kod: "HAKARET_VE_TEHDIT",
    ceviriAnahtari: "reasons.insultThreat",
    ikon: "⚠️",
  },
  {
    kod: "UYGUNSUZ_CINSEL_ICERIK",
    ceviriAnahtari: "reasons.inappropriateContent",
    ikon: "🚫",
  },
  {
    kod: "DOLANDIRICILIK_VE_PARA_ISTEME",
    ceviriAnahtari: "reasons.scamMoney",
    ikon: "🛡️",
  },
  {
    kod: "DIGER",
    ceviriAnahtari: "reasons.other",
    ikon: "⋯",
  },
];

export default function SikayetEkrani() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const sikayetEdilenId = Number(
    route.params?.sikayetEdilenId ?? route.params?.id,
  );

  const [neden, setNeden] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const sikayetiGonder = async () => {
    if (gonderiliyor) return;

    if (!Number.isSafeInteger(sikayetEdilenId) || sikayetEdilenId <= 0) {
      Alert.alert(
        t("complaint.alerts.unavailableTitle"),
        t("complaint.alerts.userNotFound"),
      );
      return;
    }

    if (!neden) {
      Alert.alert(
        t("complaint.alerts.reasonRequiredTitle"),
        t("complaint.alerts.reasonRequired"),
      );
      return;
    }

    const temizAciklama = aciklama.trim();

    try {
      setGonderiliyor(true);

      const token = await tokenGetir();
      const mevcutKullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (
        !token ||
        !Number.isSafeInteger(mevcutKullaniciId) ||
        mevcutKullaniciId <= 0
      ) {
        Alert.alert(
          t("complaint.alerts.sessionTitle"),
          t("complaint.alerts.sessionRequired"),
        );
        return;
      }

      if (mevcutKullaniciId === sikayetEdilenId) {
        Alert.alert(
          t("complaint.alerts.unavailableTitle"),
          t("complaint.alerts.cannotReportSelf"),
        );
        return;
      }

      const yanit = await fetch(
        `${API_ADRESI}/sikayetler?sikayetEdilenId=${encodeURIComponent(
          String(sikayetEdilenId),
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            neden,
            aciklama: temizAciklama || null,
            mesajId: null,
          }),
        },
      );

      const yanitMetni = await yanit.text();

      if (!yanit.ok) {
        let hataMesaji = t("complaint.alerts.sendFailed");

        try {
          const veri = JSON.parse(yanitMetni);
          hataMesaji = veri?.message ?? veri?.mesaj ?? hataMesaji;
        } catch {
          // Sunucunun ham yanıtı kullanıcıya gösterilmez.
        }

        Alert.alert(t("complaint.alerts.failedTitle"), hataMesaji);
        return;
      }

      setNeden("");
      setAciklama("");

      Alert.alert(
        t("complaint.alerts.successTitle"),
        t("complaint.alerts.successMessage"),
        [
          {
            text: t("complaint.alerts.ok"),
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch {
      Alert.alert(
        t("complaint.alerts.connectionTitle"),
        t("complaint.alerts.connectionMessage"),
      );
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ARKA_PLAN} />

      <KeyboardAvoidingView
        style={styles.klavyeAlani}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ustAlan}>
            <Pressable
              style={({ pressed }) => [
                styles.geriButonu,
                pressed && styles.basili,
              ]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={t("complaint.back")}
            >
              <Text style={styles.geriIkon}>‹</Text>
              <Text style={styles.geriMetni}>{t("complaint.back")}</Text>
            </Pressable>

            <View style={styles.guvenlikRozeti}>
              <Text style={styles.guvenlikIkonu}>🛡️</Text>
            </View>

            <Text style={styles.baslik}>{t("complaint.title")}</Text>

            <Text style={styles.altBaslik}>{t("complaint.subtitle")}</Text>
          </View>

          <View style={styles.bilgiKarti}>
            <View style={styles.bilgiIkonAlani}>
              <Text style={styles.bilgiIkonu}>🔒</Text>
            </View>

            <View style={styles.bilgiMetinAlani}>
              <Text style={styles.bilgiBaslik}>{t("complaint.infoTitle")}</Text>
              <Text style={styles.bilgiAciklama}>
                {t("complaint.infoDescription")}
              </Text>
            </View>
          </View>

          <View style={styles.formKarti}>
            <View style={styles.bolumBasligiSatiri}>
              <View style={styles.bolumNumarasi}>
                <Text style={styles.bolumNumarasiMetni}>1</Text>
              </View>

              <View style={styles.bolumBasligiAlani}>
                <Text style={styles.bolumBasligi}>
                  {t("complaint.reasonTitle")}
                </Text>
                <Text style={styles.bolumAltBasligi}>
                  {t("complaint.reasonHint")}
                </Text>
              </View>
            </View>

            <View style={styles.nedenListesi}>
              {SIKAYET_NEDENLERI.map((secenek) => {
                const secili = neden === secenek.kod;

                return (
                  <Pressable
                    key={secenek.kod}
                    style={({ pressed }) => [
                      styles.nedenSecenegi,
                      secili && styles.nedenSecili,
                      pressed && styles.basili,
                    ]}
                    disabled={gonderiliyor}
                    onPress={() => setNeden(secenek.kod)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: secili }}
                  >
                    <View
                      style={[
                        styles.nedenIkonAlani,
                        secili && styles.nedenIkonSecili,
                      ]}
                    >
                      <Text style={styles.nedenIkonu}>{secenek.ikon}</Text>
                    </View>

                    <Text
                      style={[
                        styles.nedenMetni,
                        secili && styles.nedenMetniSecili,
                      ]}
                    >
                      {t(`complaint.${secenek.ceviriAnahtari}`)}
                    </Text>

                    <View
                      style={[styles.radioDis, secili && styles.radioDisSecili]}
                    >
                      {secili && <View style={styles.radioIc} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.bolumAyirici} />

            <View style={styles.bolumBasligiSatiri}>
              <View style={styles.bolumNumarasi}>
                <Text style={styles.bolumNumarasiMetni}>2</Text>
              </View>

              <View style={styles.bolumBasligiAlani}>
                <Text style={styles.bolumBasligi}>
                  {t("complaint.detailsTitle")}
                </Text>
                <Text style={styles.bolumAltBasligi}>
                  {t("complaint.detailsHint")}
                </Text>
              </View>

              <View style={styles.istegeBagliRozet}>
                <Text style={styles.istegeBagliMetin}>
                  {t("complaint.optional")}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.aciklama}
              value={aciklama}
              onChangeText={setAciklama}
              placeholder={t("complaint.descriptionPlaceholder")}
              placeholderTextColor="#A39AAF"
              multiline
              maxLength={2000}
              editable={!gonderiliyor}
              textAlignVertical="top"
              accessibilityLabel={t("complaint.descriptionAccessibility")}
            />

            <View style={styles.aciklamaAltSatir}>
              <Text style={styles.aciklamaIpucu}>
                {t("complaint.privacyHint")}
              </Text>

              <Text
                style={[
                  styles.karakterSayisi,
                  aciklama.length >= 1900 && styles.karakterSayisiUyari,
                ]}
              >
                {aciklama.length}/2000
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.gonderButonu,
                gonderiliyor && styles.butonPasif,
                pressed && !gonderiliyor && styles.gonderButonuBasili,
              ]}
              disabled={gonderiliyor}
              onPress={sikayetiGonder}
              accessibilityRole="button"
              accessibilityLabel={t("complaint.submit")}
            >
              {gonderiliyor ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.gonderMetni}>
                    {t("complaint.submitting")}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.gonderMetni}>
                    {t("complaint.submit")}
                  </Text>
                  <Text style={styles.gonderOku}>→</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.altGuvence}>
              🔐 {t("complaint.secureNotice")}
            </Text>
          </View>

          <Text style={styles.altBilgi}>{t("complaint.footer")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ARKA_PLAN,
  },
  klavyeAlani: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  ustAlan: {
    alignItems: "center",
    paddingBottom: 22,
    paddingTop: 2,
  },
  geriButonu: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 22,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9E2F2",
  },
  geriIkon: {
    color: MOR,
    fontSize: 31,
    lineHeight: 32,
    marginRight: 7,
  },
  geriMetni: {
    color: MOR,
    fontSize: 14,
    fontWeight: "700",
  },
  guvenlikRozeti: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9DFFF",
    borderWidth: 1,
    borderColor: "#D8C8F5",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  guvenlikIkonu: {
    fontSize: 32,
  },
  baslik: {
    color: KOYU_MOR,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  altBaslik: {
    color: IKINCIL_METIN,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center",
  },
  bilgiKarti: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#35105F",
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: "#5B2A8D",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#32105C",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  bilgiIkonAlani: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  bilgiIkonu: {
    fontSize: 19,
  },
  bilgiMetinAlani: {
    flex: 1,
  },
  bilgiBaslik: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },
  bilgiAciklama: {
    color: "#E8DDF5",
    fontSize: 12,
    lineHeight: 19,
  },
  formKarti: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EAE4F2",
    elevation: 5,
    shadowColor: "#39205E",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  bolumBasligiSatiri: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  bolumNumarasi: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE5FF",
    marginRight: 11,
  },
  bolumNumarasiMetni: {
    color: MOR,
    fontSize: 14,
    fontWeight: "800",
  },
  bolumBasligiAlani: {
    flex: 1,
  },
  bolumBasligi: {
    color: METIN,
    fontSize: 16,
    fontWeight: "800",
  },
  bolumAltBasligi: {
    color: IKINCIL_METIN,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  nedenListesi: {
    gap: 9,
  },
  nedenSecenegi: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EAE5F0",
    borderRadius: 17,
    backgroundColor: "#FFFEFF",
  },
  nedenSecili: {
    borderColor: MOR,
    backgroundColor: "#F3EDFF",
    borderWidth: 1.6,
  },
  nedenIkonAlani: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F3EFF8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nedenIkonSecili: {
    backgroundColor: "#E9DEFF",
  },
  nedenIkonu: {
    fontSize: 18,
  },
  nedenMetni: {
    flex: 1,
    color: "#51465F",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    paddingRight: 8,
  },
  nedenMetniSecili: {
    color: KOYU_MOR,
    fontWeight: "800",
  },
  radioDis: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.7,
    borderColor: "#C8BED8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDisSecili: {
    borderColor: MOR,
  },
  radioIc: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: MOR,
  },
  bolumAyirici: {
    height: 1,
    backgroundColor: "#F0ECF5",
    marginVertical: 23,
  },
  istegeBagliRozet: {
    backgroundColor: "#F4F0F8",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  istegeBagliMetin: {
    color: "#766A84",
    fontSize: 10,
    fontWeight: "700",
  },
  aciklama: {
    minHeight: 135,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#DED5E9",
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 22,
    color: METIN,
    backgroundColor: "#FBF9FE",
  },
  aciklamaAltSatir: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
    marginBottom: 22,
    gap: 8,
  },
  aciklamaIpucu: {
    flex: 1,
    color: IKINCIL_METIN,
    fontSize: 10,
    lineHeight: 15,
  },
  karakterSayisi: {
    color: "#8B8099",
    fontSize: 11,
    fontWeight: "600",
  },
  karakterSayisiUyari: {
    color: KIRMIZI,
  },
  gonderButonu: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: MOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    elevation: 5,
    shadowColor: MOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
  },
  gonderButonuBasili: {
    backgroundColor: KOYU_MOR,
    opacity: 0.92,
  },
  gonderMetni: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  gonderOku: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "600",
    marginLeft: 12,
    marginTop: -2,
  },
  butonPasif: {
    opacity: 0.7,
  },
  altGuvence: {
    color: "#81758F",
    fontSize: 11,
    textAlign: "center",
    marginTop: 15,
  },
  altBilgi: {
    color: "#958AA2",
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 17,
  },
  basili: {
    opacity: 0.82,
  },
});
