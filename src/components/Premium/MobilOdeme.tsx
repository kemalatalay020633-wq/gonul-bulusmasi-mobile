import { useState } from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MobilOdemeProps = {
  paketAdi: string;

  tutar: number;

  onGeri: () => void;

  onOdemeBaslat: (telefon: string, operator: string) => void;

  yukleniyor: boolean;
};

function MobilOdeme({
  paketAdi,
  tutar,
  onGeri,
  onOdemeBaslat,
  yukleniyor,
}: MobilOdemeProps) {
  const [telefon, setTelefon] = useState("");

  const [operator, setOperator] = useState("");

  const [hata, setHata] = useState("");

  /*
   * =========================================================
   * TELEFON FORMATLA
   * =========================================================
   */

  const telefonFormatla = (deger: string) => {
    const rakamlar = deger.replace(/\D/g, "").slice(0, 10);

    if (rakamlar.length <= 3) {
      return rakamlar;
    }

    if (rakamlar.length <= 6) {
      return rakamlar.slice(0, 3) + " " + rakamlar.slice(3);
    }

    if (rakamlar.length <= 8) {
      return (
        rakamlar.slice(0, 3) +
        " " +
        rakamlar.slice(3, 6) +
        " " +
        rakamlar.slice(6)
      );
    }

    return (
      rakamlar.slice(0, 3) +
      " " +
      rakamlar.slice(3, 6) +
      " " +
      rakamlar.slice(6, 8) +
      " " +
      rakamlar.slice(8)
    );
  };

  /*
   * =========================================================
   * ÖDEME
   * =========================================================
   */

  const odemeYap = () => {
    setHata("");

    if (!operator) {
      setHata("Lütfen operatörünüzü seçin.");

      return;
    }

    const temizTelefon = telefon.replace(/\s/g, "");

    if (temizTelefon.length !== 10) {
      setHata("Telefon numarası 10 haneli olmalıdır.");

      return;
    }

    onOdemeBaslat(temizTelefon, operator);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            BAŞLIK
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.phoneIcon}>📱</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Mobil Ödeme</Text>

            <Text style={styles.subtitle}>
              Telefon faturanız üzerinden ödeme
            </Text>
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
            HATA
        ================================================= */}

        {hata ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>

            <Text style={styles.errorText}>{hata}</Text>
          </View>
        ) : null}

        {/* =================================================
            OPERATÖR
        ================================================= */}

        <Text style={styles.inputLabel}>Operatör</Text>

        <View style={styles.operatorContainer}>
          {[
            {
              value: "TURKCELL",
              label: "Turkcell",
              icon: "🟡",
            },
            {
              value: "VODAFONE",
              label: "Vodafone",
              icon: "🔴",
            },
            {
              value: "TURK_TELEKOM",
              label: "Türk Telekom",
              icon: "🔵",
            },
          ].map((secenek) => {
            const secili = operator === secenek.value;

            return (
              <TouchableOpacity
                key={secenek.value}
                style={[
                  styles.operatorOption,
                  secili && styles.operatorOptionSelected,
                  yukleniyor && styles.optionDisabled,
                ]}
                onPress={() => setOperator(secenek.value)}
                disabled={yukleniyor}
                activeOpacity={0.8}
              >
                <Text style={styles.operatorIcon}>{secenek.icon}</Text>

                <Text
                  style={[
                    styles.operatorText,
                    secili && styles.operatorTextSelected,
                  ]}
                >
                  {secenek.label}
                </Text>

                <View
                  style={[
                    styles.radioOuter,
                    secili && styles.radioOuterSelected,
                  ]}
                >
                  {secili ? <View style={styles.radioInner} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =================================================
            TELEFON
        ================================================= */}

        <View style={styles.phoneInputContainer}>
          <Text style={styles.inputLabel}>Cep Telefonu</Text>

          <TextInput
            value={telefon}
            onChangeText={(deger) => setTelefon(telefonFormatla(deger))}
            editable={!yukleniyor}
            placeholder="5XX XXX XX XX"
            placeholderTextColor="#A88F95"
            keyboardType="number-pad"
            maxLength={13}
            style={[styles.input, yukleniyor && styles.inputDisabled]}
          />
        </View>

        {/* =================================================
            BİLGİ
        ================================================= */}

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>

          <Text style={styles.infoText}>
            Mobil ödeme işlemi, seçtiğiniz operatör üzerinden
            gerçekleştirilecektir.
          </Text>
        </View>

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

          {/* ÖDE */}

          <TouchableOpacity
            style={[
              styles.paymentButton,
              yukleniyor && styles.disabledPaymentButton,
            ]}
            onPress={odemeYap}
            disabled={yukleniyor}
            activeOpacity={0.8}
          >
            <Text style={styles.paymentButtonText}>
              {yukleniyor
                ? "İşlem yapılıyor..."
                : `ÖDE — ${tutar.toFixed(2).replace(".", ",")} TL`}
            </Text>
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

  phoneIcon: {
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
   * HATA
   * =======================================================
   */

  errorBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    padding: 15,

    marginBottom: 20,

    borderRadius: 14,

    backgroundColor: "#FCE8EC",

    borderWidth: 1,

    borderColor: "#EFC1CC",
  },

  errorIcon: {
    fontSize: 18,

    marginRight: 9,
  },

  errorText: {
    flex: 1,

    fontSize: 14,

    lineHeight: 21,

    fontWeight: "700",

    color: "#9B2947",
  },

  /*
   * =======================================================
   * OPERATÖR
   * =======================================================
   */

  inputLabel: {
    fontSize: 14,

    fontWeight: "700",

    color: "#694650",

    marginBottom: 8,
  },

  operatorContainer: {
    gap: 10,

    marginBottom: 20,
  },

  operatorOption: {
    minHeight: 58,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 15,

    borderRadius: 13,

    backgroundColor: "#FFFCFA",

    borderWidth: 1,

    borderColor: "#d1d5db",
  },

  operatorOptionSelected: {
    borderColor: "#8F2942",

    backgroundColor: "#faf5ff",
  },

  optionDisabled: {
    opacity: 0.6,
  },

  operatorIcon: {
    fontSize: 19,

    marginRight: 10,
  },

  operatorText: {
    flex: 1,

    fontSize: 15,

    fontWeight: "700",

    color: "#694650",
  },

  operatorTextSelected: {
    color: "#A12E4A",

    fontWeight: "900",
  },

  radioOuter: {
    width: 22,

    height: 22,

    borderRadius: 11,

    borderWidth: 2,

    borderColor: "#d1d5db",

    alignItems: "center",

    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: "#8F2942",
  },

  radioInner: {
    width: 10,

    height: 10,

    borderRadius: 5,

    backgroundColor: "#8F2942",
  },

  /*
   * =======================================================
   * TELEFON
   * =======================================================
   */

  phoneInputContainer: {
    marginBottom: 20,
  },

  input: {
    height: 54,

    borderWidth: 1,

    borderColor: "#d1d5db",

    borderRadius: 12,

    backgroundColor: "#FFFCFA",

    paddingHorizontal: 15,

    fontSize: 16,

    color: "#48252F",
  },

  inputDisabled: {
    backgroundColor: "#F6EDEF",

    opacity: 0.7,
  },

  /*
   * =======================================================
   * BİLGİ
   * =======================================================
   */

  infoBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    padding: 15,

    marginBottom: 22,

    borderRadius: 14,

    backgroundColor: "#F8E9ED",

    borderWidth: 1,

    borderColor: "#E9C9D2",
  },

  infoIcon: {
    fontSize: 18,

    marginRight: 9,

    marginTop: 1,
  },

  infoText: {
    flex: 1,

    fontSize: 14,

    lineHeight: 21,

    fontWeight: "600",

    color: "#1e40af",
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
});

export default MobilOdeme;
