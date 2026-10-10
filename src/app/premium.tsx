import { useState } from "react";
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
  baslik: string;
  sure: string;
  fiyat: number;
  aciklama: string;
  rozet?: string;
};

const API_ADRESI = API_BASE_URL + "/api";

const premiumPaketleri: PremiumPaketBilgisi[] = [
  {
    kod: "ONE_MONTH",
    baslik: "1 Aylık",
    sure: "1 Ay",
    fiyat: 100,
    aciklama: "1 aylık Premium üyelik",
  },
  {
    kod: "THREE_MONTHS",
    baslik: "3 Aylık",
    sure: "3 Ay",
    fiyat: 240,
    aciklama: "3 aylık Premium üyelik",
    rozet: "AVANTAJLI",
  },
  {
    kod: "SIX_MONTHS",
    baslik: "6 Aylık",
    sure: "6 Ay",
    fiyat: 400,
    aciklama: "6 aylık Premium üyelik",
    rozet: "ÇOK AVANTAJLI",
  },
  {
    kod: "ONE_YEAR",
    baslik: "1 Yıllık",
    sure: "12 Ay",
    fiyat: 600,
    aciklama: "12 aylık Premium üyelik",
    rozet: "EN AVANTAJLI",
  },
];

export default function Premium() {
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

  const odemeBaslat = async (paymentMethod: OdemeYontemi) => {
    setHata("");

    if (!secilenPaket) {
      setHata("Lütfen bir Premium paketi seçin.");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    const kullaniciId = Number(await AsyncStorage.getItem("userId"));

    if (!token || !kullaniciId || Number.isNaN(kullaniciId)) {
      setHata("Oturum bilgileriniz bulunamadı. Lütfen tekrar giriş yapın.");
      return;
    }

    setYukleniyor(true);

    try {
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
        let hataMesaji = "Ödeme işlemi başlatılamadı.";

        try {
          const hataVerisi = await cevap.json();

          hataMesaji = hataVerisi.message || hataVerisi.error || hataMesaji;
        } catch {
          // Varsayılan hata mesajı
        }

        throw new Error(hataMesaji);
      }

      const veri: Odeme = await cevap.json();

      setOdeme(veri);
      setOdemeOlusturuldu(true);

      setKartOdemeEkrani(false);
      setMobilOdemeEkrani(false);
      setHavaleOdemeEkrani(false);

      Alert.alert("Başarılı", "Ödeme kaydınız oluşturuldu.");
    } catch (hata) {
      console.error("PREMIUM ÖDEME HATASI:", hata);

      setHata(
        hata instanceof Error
          ? hata.message
          : "Ödeme işlemi başlatılamadı.",
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
      setHata("Lütfen operatörünüzü seçin.");
      return;
    }

    const temizTelefon = telefon.replace(/\s/g, "");

    if (temizTelefon.length !== 10) {
      setHata("Telefon numarası 10 haneli olmalıdır.");
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
        paketAdi={secilenPaketBilgisi.baslik}
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
        paketAdi={secilenPaketBilgisi.baslik}
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
        paketAdi={secilenPaketBilgisi.baslik}
        tutar={secilenPaketBilgisi.fiyat}
        yukleniyor={yukleniyor}
        onGeri={() => setHavaleOdemeEkrani(false)}
        onOdemeBaslat={havaleOdemeBaslat}
      />
    );
  }

  if (havaleOdemeEkrani && secilenPaketBilgisi) {
    return (
      <HavaleOdeme
        paketAdi={secilenPaketBilgisi.baslik}
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
      setHata("Lütfen bir Premium paketi seçin.");
      return;
    }

    if (!odemeYontemi) {
      setHata("Lütfen bir ödeme yöntemi seçin.");
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

          <Text style={styles.heroTitle}>Premium Üyelik</Text>

          <Text style={styles.heroDescription}>
            Gönül Buluşması Premium ile mesajlaşmaya başlayın.
          </Text>
        </View>

        {hata ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{hata}</Text>
          </View>
        ) : null}

        {odemeOlusturuldu && odeme ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>
              ✅ Ödeme işleminiz oluşturuldu
            </Text>

            <Text style={styles.successText}>
              Paket: {odeme.membershipPackage}
            </Text>

            <Text style={styles.successText}>
              Sipariş No: {odeme.merchantOid}
            </Text>

            <Text style={styles.successText}>
              Ödeme Yöntemi: {odeme.paymentMethod}
            </Text>

            <Text style={styles.successText}>
              Tutar: {odeme.amount} {odeme.currency}
            </Text>

            <Text style={styles.successText}>Durum: {odeme.status}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionHeading}>
          Premium ile neler yapabilirsiniz?
        </Text>

        {[
          "Mesaj gönderebilirsiniz",
          "Gelen mesajları okuyabilirsiniz",
          "Sınırsız mesajlaşabilirsiniz",
          "Premium üyelik avantajlarından yararlanabilirsiniz",
        ].map((ozellik) => (
          <View key={ozellik} style={styles.featureCard}>
            <Text style={styles.check}>✓</Text>

            <Text style={styles.featureText}>{ozellik}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Premium Paketini Seç</Text>

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
              {paket.rozet ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{paket.rozet}</Text>
                </View>
              ) : null}

              <Text style={styles.packageIcon}>👑</Text>

              <Text style={styles.packageTitle}>{paket.baslik}</Text>

              <Text style={styles.packagePrice}>
                {paket.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>

              <Text style={styles.packageDescription}>{paket.aciklama}</Text>

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
                  {secili ? "SEÇİLDİ" : "BU PAKETİ SEÇ"}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {secilenPaketBilgisi ? (
          <View style={styles.selectedPackage}>
            <Text style={styles.selectedPackageLabel}>Seçilen Paket</Text>

            <Text style={styles.selectedPackageText}>
              {secilenPaketBilgisi.baslik}
              {" - "}
              {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionHeading}>Ödeme Yöntemini Seç</Text>

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
              Kredi / Banka Kartı
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
              Mobil Ödeme
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
              Havale / EFT
            </Text>
          </Pressable>
        </View>

        {odemeYontemi ? (
          <View style={styles.selectedPayment}>
            <Text style={styles.selectedPaymentText}>
              Seçilen ödeme yöntemi:{" "}
              {odemeYontemi === "CARD" && "Kredi / Banka Kartı"}
              {odemeYontemi === "MOBILE_OPERATOR" && "Mobil Ödeme"}
              {odemeYontemi === "BANK_TRANSFER" && "Havale / EFT"}
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
              ? `DEVAM ET → ${secilenPaketBilgisi.fiyat
                  .toFixed(2)
                  .replace(".", ",")} TL`
              : "PREMIUM PAKETİ SEÇ"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.homeButton}
          onPress={() => navigation.replace("home")}
        >
          <Text style={styles.homeButtonText}>← Ana Sayfa</Text>
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
    backgroundColor: "#7c3aed",
  },

  heroIcon: {
    fontSize: 52,
    marginBottom: 8,
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  heroDescription: {
    color: "#ffffff",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.95,
  },

  sectionHeading: {
    color: "#4c1d95",
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede9fe",
  },

  check: {
    color: "#7c3aed",
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
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e9d5ff",
  },

  packageCardSelected: {
    borderWidth: 3,
    borderColor: "#7c3aed",
    backgroundColor: "#faf5ff",
  },

  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#ede9fe",
  },

  badgeText: {
    color: "#6d28d9",
    fontSize: 9,
    fontWeight: "800",
  },

  packageIcon: {
    fontSize: 30,
    textAlign: "center",
    marginBottom: 5,
  },

  packageTitle: {
    color: "#4c1d95",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  packagePrice: {
    color: "#5b21b6",
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
    backgroundColor: "#7c3aed",
  },

  selectButtonText: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
  },

  selectButtonTextSelected: {
    color: "#ffffff",
  },

  selectedPackage: {
    padding: 18,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#f3e8ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    alignItems: "center",
  },

  selectedPackageLabel: {
    color: "#581c87",
    fontSize: 13,
    fontWeight: "800",
  },

  selectedPackageText: {
    color: "#6d28d9",
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
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentButtonSelected: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },

  paymentIcon: {
    fontSize: 23,
    marginBottom: 3,
  },

  paymentText: {
    color: "#5b21b6",
    fontSize: 13,
    fontWeight: "700",
  },

  paymentTextSelected: {
    color: "#ffffff",
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
    backgroundColor: "#7c3aed",
    alignItems: "center",
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueButtonText: {
    color: "#ffffff",
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
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
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
