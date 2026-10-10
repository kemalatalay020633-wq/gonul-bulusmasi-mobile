import { useState } from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type KartOdemeProps = {
  paketAdi: string;
  tutar: number;
  onGeri: () => void;

  onOdemeBaslat: (
    kartSahibi: string,
    kartNumarasi: string,
    kartSonKullanma: string,
    kartCvv: string,
    kartTaksit: string,
  ) => void;

  yukleniyor: boolean;
};

function KartOdeme({
  paketAdi,
  tutar,
  onGeri,
  onOdemeBaslat,
  yukleniyor,
}: KartOdemeProps) {
  /*
   * =========================================================
   * KART BİLGİLERİ
   * =========================================================
   */

  const [kartSahibi, setKartSahibi] = useState("");

  const [kartNumarasi, setKartNumarasi] = useState("");

  const [sonKullanma, setSonKullanma] = useState("");

  const [cvv, setCvv] = useState("");

  const [taksit, setTaksit] = useState("1");

  const [hata, setHata] = useState("");

  /*
   * =========================================================
   * KART NUMARASI FORMATLA
   * =========================================================
   */

  const kartNumarasiniFormatla = (deger: string) => {
    const sadeceRakam = deger.replace(/\D/g, "").slice(0, 16);

    return sadeceRakam.replace(/(.{4})/g, "$1 ").trim();
  };

  /*
   * =========================================================
   * SON KULLANMA TARİHİ FORMATLA
   * =========================================================
   */

  const sonKullanmaTarihiniFormatla = (deger: string) => {
    const sadeceRakam = deger.replace(/\D/g, "").slice(0, 4);

    if (sadeceRakam.length <= 2) {
      return sadeceRakam;
    }

    return sadeceRakam.slice(0, 2) + "/" + sadeceRakam.slice(2);
  };

  /*
   * =========================================================
   * ÖDEME
   * =========================================================
   */

  const odemeYap = () => {
    setHata("");

    /*
     * Kart sahibi
     */

    if (kartSahibi.trim().length < 3) {
      setHata("Lütfen kart üzerindeki adı girin.");
      return;
    }

    /*
     * Kart numarası
     */

    const temizKartNumarasi = kartNumarasi.replace(/\s/g, "");

    if (temizKartNumarasi.length !== 16) {
      setHata("Kart numarası 16 haneli olmalıdır.");
      return;
    }

    /*
     * Son kullanma tarihi
     */

    if (sonKullanma.length !== 5) {
      setHata("Son kullanma tarihini AA/YY şeklinde girin.");
      return;
    }

    /*
     * CVV
     */

    if (cvv.length !== 3) {
      setHata("CVV 3 haneli olmalıdır.");
      return;
    }

    /*
     * =========================================================
     * ÖNEMLİ
     * =========================================================
     *
     * Kart bilgileri backend'e gönderilmiyor.
     *
     * Sadece mevcut ödeme akışını başlatmak için
     * premium.tsx içerisindeki callback çağrılıyor.
     */

    onOdemeBaslat(kartSahibi, temizKartNumarasi, sonKullanma, cvv, taksit);
  };

  /*
   * =========================================================
   * EKRAN
   * =========================================================
   */

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💳</Text>

          <Text style={styles.title}>Kart ile Ödeme</Text>

          <Text style={styles.subtitle}>{paketAdi}</Text>

          <Text style={styles.price}>
            {tutar.toFixed(2).replace(".", ",")} TL
          </Text>
        </View>

        {hata ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{hata}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.label}>Kart Üzerindeki Ad</Text>

          <TextInput
            value={kartSahibi}
            onChangeText={setKartSahibi}
            placeholder="Ad Soyad"
            placeholderTextColor="#999"
            autoCapitalize="words"
            style={styles.input}
            editable={!yukleniyor}
          />

          <Text style={styles.label}>Kart Numarası</Text>

          <TextInput
            value={kartNumarasi}
            onChangeText={(deger) => {
              setKartNumarasi(kartNumarasiniFormatla(deger));
            }}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={19}
            style={styles.input}
            editable={!yukleniyor}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Son Kullanma</Text>

              <TextInput
                value={sonKullanma}
                onChangeText={(deger) => {
                  setSonKullanma(sonKullanmaTarihiniFormatla(deger));
                }}
                placeholder="AA/YY"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={5}
                style={styles.input}
                editable={!yukleniyor}
              />
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>CVV</Text>

              <TextInput
                value={cvv}
                onChangeText={(deger) => {
                  setCvv(deger.replace(/\D/g, "").slice(0, 3));
                }}
                placeholder="123"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={3}
                secureTextEntry
                style={styles.input}
                editable={!yukleniyor}
              />
            </View>
          </View>

          <Text style={styles.label}>Taksit</Text>

          <View style={styles.taksitContainer}>
            {["1", "2", "3", "6", "9", "12"].map((secenek) => {
              const secili = taksit === secenek;

              return (
                <TouchableOpacity
                  key={secenek}
                  style={[
                    styles.taksitButton,
                    secili && styles.taksitButtonSelected,
                  ]}
                  onPress={() => {
                    if (!yukleniyor) {
                      setTaksit(secenek);
                    }
                  }}
                  disabled={yukleniyor}
                >
                  <Text
                    style={[
                      styles.taksitText,
                      secili && styles.taksitTextSelected,
                    ]}
                  >
                    {secenek} Taksit
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔒 Güvenli Ödeme</Text>

            <Text style={styles.infoText}>
              Kart bilgileriniz bu uygulama tarafından kayıt altına alınmaz.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, yukleniyor && styles.payButtonDisabled]}
            onPress={odemeYap}
            disabled={yukleniyor}
          >
            <Text style={styles.payButtonText}>
              {yukleniyor
                ? "İŞLEM YAPILIYOR..."
                : `ÖDEME YAP • ${tutar.toFixed(2).replace(".", ",")} TL`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onGeri}
            disabled={yukleniyor}
          >
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9ff",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    marginBottom: 18,
  },

  headerIcon: {
    fontSize: 46,
    marginBottom: 8,
  },

  title: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: "#ede9fe",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },

  price: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
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

  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },

  label: {
    color: "#4c1d95",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#222222",
    backgroundColor: "#ffffff",
    fontSize: 15,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  half: {
    flex: 1,
  },

  taksitContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  taksitButton: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c084fc",
    backgroundColor: "#ffffff",
  },

  taksitButtonSelected: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },

  taksitText: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
  },

  taksitTextSelected: {
    color: "#ffffff",
  },

  infoBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },

  infoTitle: {
    color: "#581c87",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },

  infoText: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18,
  },

  payButton: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 13,
    backgroundColor: "#7c3aed",
    alignItems: "center",
  },

  payButtonDisabled: {
    opacity: 0.5,
  },

  payButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  backButton: {
    marginTop: 11,
    paddingVertical: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#7c3aed",
    alignItems: "center",
  },

  backButtonText: {
    color: "#6d28d9",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default KartOdeme;
