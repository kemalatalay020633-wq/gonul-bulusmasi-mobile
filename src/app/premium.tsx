import { tokenGetir } from "../services/tokenServisi";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "../config/api";

import HavaleOdeme from "../components/Premium/HavaleOdeme";
import KartOdeme from "../components/Premium/KartOdeme";
import MobilOdeme from "../components/Premium/MobilOdeme";

type Odeme = {
  id: number;
  kullaniciId: number;
  membershipId: number | null;
  membershipPackage: string;
  merchantOid: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  status: string;
  provider: string;
  createdAt: string;
  paidAt: string | null;
};

type OdemeYontemi = "CARD" | "MOBILE_OPERATOR" | "BANK_TRANSFER";

type PremiumPaketi = "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "ONE_YEAR";

type PremiumPaketBilgisi = {
  kod: PremiumPaketi;
  fiyat: number;
};

const API_ADRESI = API_BASE_URL + "/api";

const premiumPaketleri: PremiumPaketBilgisi[] = [
  { kod: "ONE_MONTH", fiyat: 100 },
  { kod: "THREE_MONTHS", fiyat: 240 },
  { kod: "SIX_MONTHS", fiyat: 400 },
  { kod: "ONE_YEAR", fiyat: 600 },
];

export default function Premium() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [odeme, setOdeme] = useState<Odeme | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [odemeOlusturuldu, setOdemeOlusturuldu] = useState(false);

  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi | null>(null);

  const [secilenPaket, setSecilenPaket] = useState<PremiumPaketi | null>(null);

  const [kartOdemeEkrani, setKartOdemeEkrani] = useState(false);
  const [mobilOdemeEkrani, setMobilOdemeEkrani] = useState(false);
  const [havaleOdemeEkrani, setHavaleOdemeEkrani] = useState(false);

  const secilenPaketBilgisi = premiumPaketleri.find(
    (paket) => paket.kod === secilenPaket,
  );

  const paketAdiGetir = (kod: PremiumPaketi) =>
    t(`premium.packages.${kod}.title`);
  const odemeYontemiGetir = (yontem: string | null) => {
    if (yontem === "CARD") return t("premium.paymentMethods.card");
    if (yontem === "MOBILE_OPERATOR") return t("premium.paymentMethods.mobile");
    if (yontem === "BANK_TRANSFER") return t("premium.paymentMethods.bank");
    return yontem || "-";
  };
  const durumGetir = (durum: string) =>
    t(`premium.status.${durum}`, { defaultValue: durum });

  const odemeBaslat = async (paymentMethod: OdemeYontemi) => {
    setHata("");

    if (!secilenPaket) {
      setHata(t("premium.selectPackage"));
      return;
    }

    setYukleniyor(true);

    try {
      const token = await tokenGetir();
      const kayitliKullaniciId = await AsyncStorage.getItem("userId");
      const kullaniciId = Number(kayitliKullaniciId);

      if (
        !token ||
        !kayitliKullaniciId ||
        !Number.isFinite(kullaniciId) ||
        kullaniciId <= 0
      ) {
        setHata(t("premium.errors.sessionMissing"));
        return;
      }

      const url =
        `${API_ADRESI}/payments/${kullaniciId}` +
        `?membershipPackage=${encodeURIComponent(secilenPaket)}` +
        `&paymentMethod=${encodeURIComponent(paymentMethod)}`;

      const cevap = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!cevap.ok) {
        throw new Error(
          cevap.status === 401 || cevap.status === 403
            ? t("premium.errors.sessionInvalid")
            : cevap.status === 429
              ? t("premium.errors.tooManyAttempts")
              : t("premium.errors.startFailed"),
        );
      }

      const veri: Odeme = await cevap.json();

      setOdeme(veri);
      setOdemeOlusturuldu(true);

      setKartOdemeEkrani(false);
      setMobilOdemeEkrani(false);
      setHavaleOdemeEkrani(false);

      Alert.alert(
        t("premium.alerts.successTitle"),
        t("premium.alerts.paymentCreated"),
      );
    } catch (hata) {
      console.error("PREMIUM ÖDEME HATASI:", hata);

      setHata(
        hata instanceof Error ? hata.message : t("premium.errors.startFailed"),
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const kartOdemeBaslat = async (
    kartSahibi: string,
    kartNumarasi: string,
    kartSonKullanma: string,
    kartCvv: string,
    kartTaksit: string,
  ) => {
    /*
     * Kart bilgileri backend'e gönderilmiyor.
     * Mevcut sistemde bu ekran test ödeme ekranıdır.
     */
    await odemeBaslat("CARD");
  };

  const mobilOdemeBaslat = async (telefon: string, operator: string) => {
    if (!operator) {
      setHata(t("premium.errors.operatorRequired"));
      return;
    }

    const temizTelefon = telefon.replace(/\s/g, "");

    if (temizTelefon.length !== 10) {
      setHata(t("premium.errors.phoneLength"));
      return;
    }

    await odemeBaslat("MOBILE_OPERATOR");
  };

  const havaleOdemeBaslat = async () => {
    await odemeBaslat("BANK_TRANSFER");
  };

  const ekranlariKapat = () => {
    setKartOdemeEkrani(false);
    setMobilOdemeEkrani(false);
    setHavaleOdemeEkrani(false);
    setHata("");
  };

  if (kartOdemeEkrani && secilenPaketBilgisi) {
    return (
      <KartOdeme
        paketAdi={paketAdiGetir(secilenPaketBilgisi.kod)}
        tutar={secilenPaketBilgisi.fiyat}
        yukleniyor={yukleniyor}
        onGeri={() => setKartOdemeEkrani(false)}
        onOdemeBaslat={kartOdemeBaslat}
      />
    );
  }

  if (mobilOdemeEkrani && secilenPaketBilgisi) {
    return (
      <MobilOdeme
        paketAdi={paketAdiGetir(secilenPaketBilgisi.kod)}
        tutar={secilenPaketBilgisi.fiyat}
        yukleniyor={yukleniyor}
        onGeri={() => setMobilOdemeEkrani(false)}
        onOdemeBaslat={mobilOdemeBaslat}
      />
    );
  }

  if (havaleOdemeEkrani && secilenPaketBilgisi) {
    return (
      <HavaleOdeme
        paketAdi={paketAdiGetir(secilenPaketBilgisi.kod)}
        tutar={secilenPaketBilgisi.fiyat}
        yukleniyor={yukleniyor}
        onGeri={() => setHavaleOdemeEkrani(false)}
        onOdemeBaslat={havaleOdemeBaslat}
      />
    );
  }

  const devamEt = () => {
    setHata("");

    if (!secilenPaket) {
      setHata(t("premium.selectPackage"));
      return;
    }

    if (!odemeYontemi) {
      setHata(t("premium.selectPaymentMethod"));
      return;
    }

    if (odemeYontemi === "CARD") {
      setKartOdemeEkrani(true);
      return;
    }

    if (odemeYontemi === "MOBILE_OPERATOR") {
      setMobilOdemeEkrani(true);
      return;
    }

    if (odemeYontemi === "BANK_TRANSFER") {
      setHavaleOdemeEkrani(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>👑</Text>

          <Text style={styles.heroTitle}>{t("premium.title")}</Text>

          <Text style={styles.heroDescription}>{t("premium.subtitle")}</Text>
        </View>

        {hata ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{hata}</Text>
          </View>
        ) : null}

        {odemeOlusturuldu && odeme ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>
              ✅ {t("premium.paymentCreatedTitle")}
            </Text>

            <Text style={styles.successText}>
              {t("premium.order.package")}:{" "}
              {paketAdiGetir(odeme.membershipPackage as PremiumPaketi)}
            </Text>

            <Text style={styles.successText}>
              {t("premium.order.orderNumber")}: {odeme.merchantOid}
            </Text>

            <Text style={styles.successText}>
              {t("premium.order.paymentMethod")}:{" "}
              {odemeYontemiGetir(odeme.paymentMethod)}
            </Text>

            <Text style={styles.successText}>
              {t("premium.order.amount")}: {odeme.amount} {odeme.currency}
            </Text>

            <Text style={styles.successText}>
              {t("premium.order.status")}: {durumGetir(odeme.status)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionHeading}>{t("premium.featuresTitle")}</Text>

        {(
          [
            "sendMessages",
            "readMessages",
            "unlimitedMessaging",
            "premiumBenefits",
          ] as const
        ).map((ozellik) => (
          <View key={ozellik} style={styles.featureCard}>
            <Text style={styles.check}>✓</Text>

            <Text style={styles.featureText}>
              {t(`premium.features.${ozellik}`)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>{t("premium.choosePackage")}</Text>

        {premiumPaketleri.map((paket) => {
          const secili = secilenPaket === paket.kod;

          return (
            <Pressable
              key={paket.kod}
              style={[styles.packageCard, secili && styles.packageCardSelected]}
              onPress={() => {
                setSecilenPaket(paket.kod);
                setHata("");
                setOdemeOlusturuldu(false);
              }}
            >
              {t(`premium.packages.${paket.kod}.badge`, {
                defaultValue: "",
              }) ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {t(`premium.packages.${paket.kod}.badge`)}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.packageIcon}>👑</Text>

              <Text style={styles.packageTitle}>
                {paketAdiGetir(paket.kod)}
              </Text>

              <Text style={styles.packagePrice}>
                {paket.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>

              <Text style={styles.packageDescription}>
                {t(`premium.packages.${paket.kod}.description`)}
              </Text>

              <View
                style={[
                  styles.selectButton,
                  secili && styles.selectButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    secili && styles.selectButtonTextSelected,
                  ]}
                >
                  {secili
                    ? t("premium.selected")
                    : t("premium.selectThisPackage")}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {secilenPaketBilgisi ? (
          <View style={styles.selectedPackage}>
            <Text style={styles.selectedPackageLabel}>
              {t("premium.selectedPackage")}
            </Text>

            <Text style={styles.selectedPackageText}>
              {paketAdiGetir(secilenPaketBilgisi.kod)}
              {" - "}
              {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionHeading}>
          {t("premium.choosePaymentMethod")}
        </Text>

        <View style={styles.paymentMethods}>
          <Pressable
            style={[
              styles.paymentButton,
              odemeYontemi === "CARD" && styles.paymentButtonSelected,
            ]}
            onPress={() => {
              setOdemeYontemi("CARD");
              ekranlariKapat();
            }}
          >
            <Text style={styles.paymentIcon}>💳</Text>

            <Text
              style={[
                styles.paymentText,
                odemeYontemi === "CARD" && styles.paymentTextSelected,
              ]}
            >
              {t("premium.paymentMethods.card")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.paymentButton,
              odemeYontemi === "MOBILE_OPERATOR" &&
                styles.paymentButtonSelected,
            ]}
            onPress={() => {
              setOdemeYontemi("MOBILE_OPERATOR");
              ekranlariKapat();
            }}
          >
            <Text style={styles.paymentIcon}>📱</Text>

            <Text
              style={[
                styles.paymentText,
                odemeYontemi === "MOBILE_OPERATOR" &&
                  styles.paymentTextSelected,
              ]}
            >
              {t("premium.paymentMethods.mobile")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.paymentButton,
              odemeYontemi === "BANK_TRANSFER" && styles.paymentButtonSelected,
            ]}
            onPress={() => {
              setOdemeYontemi("BANK_TRANSFER");
              ekranlariKapat();
            }}
          >
            <Text style={styles.paymentIcon}>🏦</Text>

            <Text
              style={[
                styles.paymentText,
                odemeYontemi === "BANK_TRANSFER" && styles.paymentTextSelected,
              ]}
            >
              {t("premium.paymentMethods.bank")}
            </Text>
          </Pressable>
        </View>

        {odemeYontemi ? (
          <View style={styles.selectedPayment}>
            <Text style={styles.selectedPaymentText}>
              {t("premium.selectedPaymentMethod")}:{" "}
              {odemeYontemi === "CARD" && t("premium.paymentMethods.card")}
              {odemeYontemi === "MOBILE_OPERATOR" &&
                t("premium.paymentMethods.mobile")}
              {odemeYontemi === "BANK_TRANSFER" &&
                t("premium.paymentMethods.bank")}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.continueButton,
            (!secilenPaket || !odemeYontemi) && styles.continueButtonDisabled,
          ]}
          disabled={yukleniyor || !secilenPaket || !odemeYontemi}
          onPress={devamEt}
        >
          <Text style={styles.continueButtonText}>
            {secilenPaketBilgisi
              ? t("premium.continueWithPrice", {
                  price: secilenPaketBilgisi.fiyat.toFixed(2),
                })
              : t("premium.selectPackageButton")}
          </Text>
        </Pressable>

        <Pressable
          style={styles.homeButton}
          onPress={() => navigation.replace("home")}
        >
          <Text style={styles.homeButtonText}>{t("premium.home")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf9ff",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  hero: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: "#8F2942",
  },

  heroIcon: {
    fontSize: 52,
    marginBottom: 8,
  },

  heroTitle: {
    color: "#FFFCFA",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  heroDescription: {
    color: "#FFFCFA",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.95,
  },

  sectionHeading: {
    color: "#672036",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 22,
    marginBottom: 14,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 9,
    borderRadius: 14,
    backgroundColor: "#FFFCFA",
    borderWidth: 1,
    borderColor: "#F5DCE3",
  },

  check: {
    color: "#8F2942",
    fontSize: 22,
    fontWeight: "900",
    marginRight: 10,
  },

  featureText: {
    flex: 1,
    color: "#444444",
    fontSize: 14,
    fontWeight: "600",
  },

  packageCard: {
    position: "relative",
    padding: 20,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#FFFCFA",
    borderWidth: 2,
    borderColor: "#E8C5CF",
  },

  packageCardSelected: {
    borderWidth: 3,
    borderColor: "#8F2942",
    backgroundColor: "#faf5ff",
  },

  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F5DCE3",
  },

  badgeText: {
    color: "#A12E4A",
    fontSize: 9,
    fontWeight: "800",
  },

  packageIcon: {
    fontSize: 30,
    textAlign: "center",
    marginBottom: 5,
  },

  packageTitle: {
    color: "#672036",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  packagePrice: {
    color: "#7A263C",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 5,
  },

  packageDescription: {
    color: "#777777",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },

  selectButton: {
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a855f7",
    alignItems: "center",
  },

  selectButtonSelected: {
    backgroundColor: "#8F2942",
  },

  selectButtonText: {
    color: "#A12E4A",
    fontSize: 12,
    fontWeight: "800",
  },

  selectButtonTextSelected: {
    color: "#FFFCFA",
  },

  selectedPackage: {
    padding: 18,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#f3e8ff",
    borderWidth: 1,
    borderColor: "#E8C5CF",
    alignItems: "center",
  },

  selectedPackageLabel: {
    color: "#581c87",
    fontSize: 13,
    fontWeight: "800",
  },

  selectedPackageText: {
    color: "#A12E4A",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 5,
  },

  paymentMethods: {
    gap: 10,
  },

  paymentButton: {
    minHeight: 70,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#c084fc",
    backgroundColor: "#FFFCFA",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentButtonSelected: {
    backgroundColor: "#8F2942",
    borderColor: "#8F2942",
  },

  paymentIcon: {
    fontSize: 23,
    marginBottom: 3,
  },

  paymentText: {
    color: "#7A263C",
    fontSize: 13,
    fontWeight: "700",
  },

  paymentTextSelected: {
    color: "#FFFCFA",
  },

  selectedPayment: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#f3e8ff",
  },

  selectedPaymentText: {
    color: "#581c87",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  continueButton: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#8F2942",
    alignItems: "center",
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueButtonText: {
    color: "#FFFCFA",
    fontSize: 15,
    fontWeight: "900",
  },

  homeButton: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5b3cc4",
    alignItems: "center",
  },

  homeButtonText: {
    color: "#5b3cc4",
    fontSize: 14,
    fontWeight: "700",
  },

  errorBox: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#FCE8EC",
    borderWidth: 1,
    borderColor: "#EFC1CC",
  },

  errorText: {
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 19,
  },

  successBox: {
    padding: 17,
    marginBottom: 18,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  successTitle: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },

  successText: {
    color: "#166534",
    fontSize: 13,
    marginBottom: 4,
  },
});
