import { useState } from "react";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Clipboard from "@react-native-clipboard/clipboard";
type HavaleOdemeProps = {
  paketAdi: string;

  tutar: number;

  onGeri: () => void;

  onOdemeBaslat: () => void;

  yukleniyor: boolean;
};

function HavaleOdeme({
  paketAdi,
  tutar,
  onGeri,
  onOdemeBaslat,
  yukleniyor,
}: HavaleOdemeProps) {
  const [kopyalandi, setKopyalandi] = useState(false);

  /*
   * =========================================================
   * BANKA BİLGİLERİ
   * =========================================================
   *
   * Şimdilik örnek bilgi.
   *
   * Gerçek IBAN daha sonra buraya koyulacak.
   *
   */

  const bankaAdi = "Gönül Buluşması";

  const hesapSahibi = "Gönül Buluşması";

  const iban = "TR00 0000 0000 0000 0000 0000 00";

  /*
   * =========================================================
   * IBAN KOPYALA
   * =========================================================
   */

  const ibanKopyala = async () => {
    try {
      Clipboard.setString(iban.replace(/\s/g, ""));

      setKopyalandi(true);

      setTimeout(() => {
        setKopyalandi(false);
      }, 2000);
    } catch (error) {
      console.error("IBAN kopyalanamadı.", error);

      Alert.alert("Hata", "IBAN kopyalanamadı.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            BAŞLIK
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.bankIcon}>🏦</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Havale / EFT</Text>

            <Text style={styles.subtitle}>Banka hesabımıza ödeme yapın</Text>
          </View>
        </View>

        {/* =================================================
            PAKET
        ================================================= */}

        <View style={styles.packageCard}>
          <Text style={styles.packageLabel}>Seçilen Paket</Text>

          <View style={styles.packageRow}>
            <Text style={styles.packageName} numberOfLines={2}>
              {paketAdi}
            </Text>

            <Text style={styles.packagePrice}>
              {tutar.toFixed(2).replace(".", ",")} TL
            </Text>
          </View>
        </View>

        {/* =================================================
            BANKA BİLGİLERİ
        ================================================= */}

        <View style={styles.bankCard}>
          <View style={styles.bankCardHeader}>
            <Text style={styles.bankCardTitle}>Banka Hesap Bilgileri</Text>
          </View>

          <View style={styles.bankCardContent}>
            {/* HESAP SAHİBİ */}

            <Text style={styles.fieldLabel}>Hesap Sahibi</Text>

            <Text style={styles.fieldValue}>{hesapSahibi}</Text>

            {/* BANKA */}

            <Text style={styles.fieldLabel}>Banka</Text>

            <Text style={styles.fieldValue}>{bankaAdi}</Text>

            {/* IBAN */}

            <Text style={styles.fieldLabel}>IBAN</Text>

            <View style={styles.ibanContainer}>
              <Text style={styles.ibanText} selectable>
                {iban}
              </Text>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={ibanKopyala}
                activeOpacity={0.7}
              >
                <Text style={styles.copyIcon}>📋</Text>

                <Text style={styles.copyButtonText}>Kopyala</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =================================================
            KOPYALANDI
        ================================================= */}

        {kopyalandi && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>

            <Text style={styles.successText}>IBAN kopyalandı.</Text>
          </View>
        )}

        {/* =================================================
            AÇIKLAMA
        ================================================= */}

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>

          <Text style={styles.warningText}>
            Havale/EFT yaparken açıklama alanına ödeme sipariş numaranızı
            yazmanız gerekecektir.
          </Text>
        </View>

        {/* =================================================
            AYIRICI
        ================================================= */}

        <View style={styles.divider} />

        {/* =================================================
            BİLDİRİM
        ================================================= */}

        <Text style={styles.afterPaymentTitle}>Ödeme sonrası</Text>

        <Text style={styles.afterPaymentText}>
          Havale/EFT işlemini yaptıktan sonra aşağıdaki butona basarak ödeme
          kaydınızı oluşturabilirsiniz. Ödeme banka hesabımıza ulaştığında
          Premium üyeliğiniz aktif edilecektir.
        </Text>

        {/* =================================================
            BUTONLAR
        ================================================= */}

        <View style={styles.buttonContainer}>
          {/* GERİ */}

          <TouchableOpacity
            style={[styles.backButton, yukleniyor && styles.disabledButton]}
            onPress={onGeri}
            disabled={yukleniyor}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>

          {/* ÖDEME BİLDİRİMİ */}

          <TouchableOpacity
            style={[
              styles.paymentButton,
              yukleniyor && styles.disabledPaymentButton,
            ]}
            onPress={onOdemeBaslat}
            disabled={yukleniyor}
            activeOpacity={0.8}
          >
            {yukleniyor ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>İşlem oluşturuluyor...</Text>
              </View>
            ) : (
              <Text style={styles.paymentButtonText}>
                ÖDEME BİLDİRİMİ OLUŞTUR
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#FFF8F4",
  },

  scrollContent: {
    padding: 20,

    paddingBottom: 40,
  },

  /*
   * =======================================================
   * BAŞLIK
   * =======================================================
   */

  header: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 22,
  },

  iconContainer: {
    width: 58,

    height: 58,

    borderRadius: 18,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#F5DCE3",

    marginRight: 14,
  },

  bankIcon: {
    fontSize: 30,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 24,

    fontWeight: "900",

    color: "#672036",

    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,

    color: "#80666D",

    lineHeight: 20,
  },

  /*
   * =======================================================
   * PAKET
   * =======================================================
   */

  packageCard: {
    padding: 18,

    marginBottom: 20,

    borderRadius: 16,

    backgroundColor: "#faf5ff",

    borderWidth: 1,

    borderColor: "#F5DCE3",
  },

  packageLabel: {
    fontSize: 14,

    fontWeight: "700",

    color: "#7D243B",

    marginBottom: 10,
  },

  packageRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,
  },

  packageName: {
    flex: 1,

    fontSize: 17,

    fontWeight: "900",

    color: "#48252F",
  },

  packagePrice: {
    fontSize: 20,

    fontWeight: "900",

    color: "#8F2942",
  },

  /*
   * =======================================================
   * BANKA
   * =======================================================
   */

  bankCard: {
    marginBottom: 20,

    borderRadius: 16,

    overflow: "hidden",

    borderWidth: 1,

    borderColor: "#E8C5CF",

    backgroundColor: "#FFFCFA",
  },

  bankCardHeader: {
    padding: 17,

    backgroundColor: "#F8E9ED",

    borderBottomWidth: 1,

    borderBottomColor: "#E8C5CF",
  },

  bankCardTitle: {
    fontSize: 17,

    fontWeight: "900",

    color: "#672036",
  },

  bankCardContent: {
    padding: 20,
  },

  fieldLabel: {
    fontSize: 13,

    color: "#80666D",

    marginBottom: 5,
  },

  fieldValue: {
    fontSize: 16,

    fontWeight: "800",

    color: "#48252F",

    marginBottom: 18,
  },

  /*
   * =======================================================
   * IBAN
   * =======================================================
   */

  ibanContainer: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 8,

    padding: 13,

    borderRadius: 12,

    backgroundColor: "#faf5ff",

    borderWidth: 1,

    borderColor: "#F5DCE3",
  },

  ibanText: {
    flex: 1,

    fontSize: 14,

    fontWeight: "800",

    color: "#48252F",

    lineHeight: 21,
  },

  copyButton: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    paddingVertical: 8,

    paddingHorizontal: 10,

    borderRadius: 9,

    backgroundColor: "#F5DCE3",
  },

  copyIcon: {
    fontSize: 15,

    marginRight: 4,
  },

  copyButtonText: {
    fontSize: 13,

    fontWeight: "800",

    color: "#A12E4A",
  },

  /*
   * =======================================================
   * BAŞARILI
   * =======================================================
   */

  successBox: {
    flexDirection: "row",

    alignItems: "center",

    padding: 14,

    marginBottom: 16,

    borderRadius: 12,

    backgroundColor: "#ecfdf5",

    borderWidth: 1,

    borderColor: "#a7f3d0",
  },

  successIcon: {
    fontSize: 20,

    fontWeight: "900",

    color: "#059669",

    marginRight: 9,
  },

  successText: {
    flex: 1,

    fontSize: 14,

    fontWeight: "700",

    color: "#047857",
  },

  /*
   * =======================================================
   * UYARI
   * =======================================================
   */

  warningBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    padding: 16,

    marginBottom: 20,

    borderRadius: 14,

    backgroundColor: "#FFFCFAbeb",

    borderWidth: 1,

    borderColor: "#fde68a",
  },

  warningIcon: {
    fontSize: 18,

    marginRight: 9,

    marginTop: 1,
  },

  warningText: {
    flex: 1,

    fontSize: 14,

    lineHeight: 21,

    color: "#92400e",

    fontWeight: "600",
  },

  /*
   * =======================================================
   * AYIRICI
   * =======================================================
   */

  divider: {
    height: 1,

    backgroundColor: "#e5e7eb",

    marginBottom: 20,
  },

  /*
   * =======================================================
   * ÖDEME SONRASI
   * =======================================================
   */

  afterPaymentTitle: {
    fontSize: 17,

    fontWeight: "800",

    color: "#672036",

    marginBottom: 8,
  },

  afterPaymentText: {
    fontSize: 14,

    lineHeight: 23,

    color: "#80666D",

    marginBottom: 22,
  },

  /*
   * =======================================================
   * BUTONLAR
   * =======================================================
   */

  buttonContainer: {
    gap: 12,
  },

  backButton: {
    minHeight: 54,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: "#c084fc",

    backgroundColor: "#FFFCFA",
  },

  backButtonText: {
    fontSize: 16,

    fontWeight: "800",

    color: "#A12E4A",
  },

  paymentButton: {
    minHeight: 54,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 16,

    backgroundColor: "#8F2942",

    elevation: 4,

    shadowColor: "#8F2942",

    shadowOffset: {
      width: 0,

      height: 4,
    },

    shadowOpacity: 0.25,

    shadowRadius: 8,
  },

  disabledButton: {
    opacity: 0.5,
  },

  disabledPaymentButton: {
    opacity: 0.65,
  },

  paymentButtonText: {
    fontSize: 14,

    fontWeight: "900",

    color: "#FFFCFA",

    textAlign: "center",
  },

  loadingContainer: {
    alignItems: "center",

    justifyContent: "center",
  },

  loadingText: {
    fontSize: 14,

    fontWeight: "800",

    color: "#FFFCFA",
  },
});

export default HavaleOdeme;
