import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    baslik: "1 Aylik",
    sure: "1 Ay",
    fiyat: 100,
    aciklama: "1 aylik Premium �yelik",
  },
  {
    kod: "THREE_MONTHS",
    baslik: "3 Aylik",
    sure: "3 Ay",
    fiyat: 240,
    aciklama: "3 aylik Premium �yelik",
    rozet: "AVANTAJLI",
  },
  {
    kod: "SIX_MONTHS",
    baslik: "6 Aylik",
    sure: "6 Ay",
    fiyat: 400,
    aciklama: "6 aylik Premium �yelik",
    rozet: "�?OK AVANTAJLI",
  },
  {
    kod: "ONE_YEAR",
    baslik: "1 Yillik",
    sure: "12 Ay",
    fiyat: 600,
    aciklama: "12 aylik Premium �yelik",
    rozet: "EN AVANTAJLI",
  },
];

export default function Premium() {
  const [odeme, setOdeme] = useState<Odeme | null>(null);

  const [yukleniyor, setYukleniyor] = useState(false);

  const [hata, setHata] = useState("");

  const [odemeOlusturuldu, setOdemeOlusturuldu] = useState(false);

  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi | null>(null);

  const [secilenPaket, setSecilenPaket] = useState<PremiumPaketi | null>(null);

  const [kartOdemeEkrani, setKartOdemeEkrani] = useState(false);

  const [mobilOdemeEkrani, setMobilOdemeEkrani] = useState(false);

  const [havaleOdemeEkrani, setHavaleOdemeEkrani] = useState(false);

  const [mobilTelefon, setMobilTelefon] = useState("");

  const [mobilOperator, setMobilOperator] = useState("");

  const [kartSahibi, setKartSahibi] = useState("");

  const [kartNumarasi, setKartNumarasi] = useState("");

  const [kartSonKullanma, setKartSonKullanma] = useState("");

  const [kartCvv, setKartCvv] = useState("");

  const [kartTaksit, setKartTaksit] = useState("1");

  const secilenPaketBilgisi = premiumPaketleri.find(
    (paket) => paket.kod === secilenPaket,
  );

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
   * KART NUMARASI FORMATLA
   * =========================================================
   */

  const kartNumarasiniFormatla = (deger: string) => {
    const rakamlar = deger.replace(/\D/g, "").slice(0, 16);

    return rakamlar.replace(/(.{4})/g, "$1 ").trim();
  };

  /*
   * =========================================================
   * KART TARIHI FORMATLA
   * =========================================================
   */

  const kartTarihiniFormatla = (deger: string) => {
    const rakamlar = deger.replace(/\D/g, "").slice(0, 4);

    if (rakamlar.length <= 2) {
      return rakamlar;
    }

    return rakamlar.slice(0, 2) + "/" + rakamlar.slice(2);
  };

  /*
   * =========================================================
   * FORM TEMIZLE
   * =========================================================
   */

  const formlariTemizle = () => {
    setMobilTelefon("");
    setMobilOperator("");
  };

  /*
   * =========================================================
   * MOBIL FORM KONTROL
   * =========================================================
   */

  const mobilOdemeFormunuKontrolEt = () => {
    if (!mobilOperator) {
      setHata("L�tfen operat�r�n�z� se�in.");
      return false;
    }

    const temizTelefon = mobilTelefon.replace(/\s/g, "");

    if (temizTelefon.length !== 10) {
      setHata("Telefon numarasi 10 haneli olmalidir.");
      return false;
    }

    return true;
  };

  /*
   * =========================================================
   * KART �-DEME EKRANI
   * =========================================================
   */

  const kartOdemesiniBaslat = () => {
    setHata("");

    if (!secilenPaket) {
      setHata("L�tfen bir Premium paketi se�in.");
      return;
    }

    setKartOdemeEkrani(true);
    setMobilOdemeEkrani(false);
    setHavaleOdemeEkrani(false);
  };

  /*
   * =========================================================
   * TEST KART �-DEMESI
   * =========================================================
   */

  const testKartOdemesiniTamamla = async () => {
    setHata("");

    if (!secilenPaket || !secilenPaketBilgisi) {
      setHata("L�tfen bir Premium paketi se�in.");
      return;
    }

    const temizKartNumarasi = kartNumarasi.replace(/\s/g, "");

    const temizTarih = kartSonKullanma.replace("/", "");

    if (kartSahibi.trim().length < 3) {
      setHata("L�tfen kart �zerindeki adi girin.");
      return;
    }

    if (temizKartNumarasi.length !== 16) {
      setHata("Kart numarasi 16 haneli olmalidir.");
      return;
    }

    if (temizTarih.length !== 4) {
      setHata("Son kullanma tarihi AA/YY �Yeklinde girilmelidir.");
      return;
    }

    if (kartCvv.length !== 3) {
      setHata("CVV 3 haneli olmalidir.");
      return;
    }

    setYukleniyor(true);

    try {
      const token = await AsyncStorage.getItem("token");

      const kullaniciId = Number(await AsyncStorage.getItem("userId"));

      if (!token || !kullaniciId || Number.isNaN(kullaniciId)) {
        throw new Error(
          "Oturum bilgileriniz bulunamadi. L�tfen tekrar giri�Y yapin.",
        );
      }

      /*
       * Kart bilgileri backend'e g�nderilmez.
       * Bu ekran geli�Ytirme/test ekranidir.
       */

      const url =
        `${API_ADRESI}/payments/${kullaniciId}` +
        `?membershipPackage=${encodeURIComponent(secilenPaket)}` +
        `&paymentMethod=CARD`;

      const cevap = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!cevap.ok) {
        let hataMesaji = "�-deme i�Ylemi ba�Ylatilamadi.";

        try {
          const hataVerisi = await cevap.json();

          hataMesaji = hataVerisi.message || hataVerisi.error || hataMesaji;
        } catch {
          // Varsayilan hata
        }

        throw new Error(hataMesaji);
      }

      const veri: Odeme = await cevap.json();

      setOdeme(veri);
      setOdemeOlusturuldu(true);
      setKartOdemeEkrani(false);

      setKartSahibi("");
      setKartNumarasi("");
      setKartSonKullanma("");
      setKartCvv("");
      setKartTaksit("1");

      Alert.alert("Ba�Yarili", "�-deme kaydiniz olu�Yturuldu.");
    } catch (hata) {
      console.error("TEST KART �-DEME HATASI:", hata);

      setHata(
        hata instanceof Error ? hata.message : "�-deme i�Ylemi tamamlanamadi.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  /*
   * =========================================================
   * NORMAL �-DEME
   * =========================================================
   */

  const normalOdemeBaslat = async () => {
    setHata("");

    if (!secilenPaket) {
      setHata("L�tfen bir Premium paketi se�in.");
      return;
    }

    if (!odemeYontemi) {
      setHata("L�tfen bir �deme y�ntemi se�in.");
      return;
    }

    if (odemeYontemi === "MOBILE_OPERATOR") {
      if (!mobilOdemeFormunuKontrolEt()) {
        return;
      }
    }

    const token = await AsyncStorage.getItem("token");

    const kullaniciId = Number(await AsyncStorage.getItem("userId"));

    if (!token || !kullaniciId || Number.isNaN(kullaniciId)) {
      setHata("Oturum bilgileriniz bulunamadi. L�tfen tekrar giri�Y yapin.");
      return;
    }

    setYukleniyor(true);

    try {
      const url =
        `${API_ADRESI}/payments/${kullaniciId}` +
        `?membershipPackage=${encodeURIComponent(secilenPaket)}` +
        `&paymentMethod=${encodeURIComponent(odemeYontemi)}`;

      const cevap = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!cevap.ok) {
        let hataMesaji = "�-deme i�Ylemi ba�Ylatilamadi.";

        try {
          const hataVerisi = await cevap.json();

          hataMesaji = hataVerisi.message || hataVerisi.error || hataMesaji;
        } catch {
          // Varsayilan hata
        }

        throw new Error(hataMesaji);
      }

      const veri: Odeme = await cevap.json();

      setOdeme(veri);
      setOdemeOlusturuldu(true);

      formlariTemizle();

      Alert.alert("Ba�Yarili", "�-deme kaydiniz olu�Yturuldu.");
    } catch (hata) {
      console.error("PREMIUM �-DEME HATASI:", hata);

      setHata(
        hata instanceof Error ? hata.message : "�-deme i�Ylemi ba�Ylatilamadi.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  /*
   * =========================================================
   * EKRAN KAPATMA
   * =========================================================
   */

  const tumEkranlariKapat = () => {
    setHata("");
    setKartOdemeEkrani(false);
    setMobilOdemeEkrani(false);
    setHavaleOdemeEkrani(false);
  };

  /*
   * =========================================================
   * SE�?ILEN �-DEME EKRANI
   * =========================================================
   */

  const devamEt = async () => {
    if (!secilenPaket) {
      setHata("L�tfen bir Premium paketi se�in.");
      return;
    }

    if (!odemeYontemi) {
      setHata("L�tfen bir �deme y�ntemi se�in.");
      return;
    }

    setHata("");

    if (odemeYontemi === "CARD") {
      kartOdemesiniBaslat();
      return;
    }

    if (odemeYontemi === "MOBILE_OPERATOR") {
      setMobilOdemeEkrani(true);
      setKartOdemeEkrani(false);
      setHavaleOdemeEkrani(false);
      return;
    }

    if (odemeYontemi === "BANK_TRANSFER") {
      setHavaleOdemeEkrani(true);
      setKartOdemeEkrani(false);
      setMobilOdemeEkrani(false);
    }
  };

  /*
   * =========================================================
   * KART EKRANI
   * =========================================================
   */

  if (kartOdemeEkrani && odemeYontemi === "CARD" && secilenPaketBilgisi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Pressable onPress={() => setKartOdemeEkrani(false)}>
              <Text style={styles.backText}>�?� Geri</Text>
            </Pressable>

            <Text style={styles.pageTitle}>gY'� Kart ile �-deme</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Sipari�Y �-zeti</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryPackage}>
                {secilenPaketBilgisi.baslik}
              </Text>

              <Text style={styles.summaryPrice}>
                {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Bu ekran geli�Ytirme/test ama�lidir. Ger�ek karttan para �ekilmez.
              Kart bilgileri sunucuya g�nderilmez ve kaydedilmez.
            </Text>
          </View>

          {hata ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{hata}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kart Bilgileri</Text>

            <TextInput
              style={styles.input}
              placeholder="Kart �ozerindeki Ad Soyad"
              value={kartSahibi}
              onChangeText={(text) => setKartSahibi(text.toUpperCase())}
              editable={!yukleniyor}
            />

            <TextInput
              style={styles.input}
              placeholder="0000 0000 0000 0000"
              value={kartNumarasi}
              onChangeText={(text) =>
                setKartNumarasi(kartNumarasiniFormatla(text))
              }
              keyboardType="numeric"
              maxLength={19}
              editable={!yukleniyor}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="AA/YY"
                value={kartSonKullanma}
                onChangeText={(text) =>
                  setKartSonKullanma(kartTarihiniFormatla(text))
                }
                keyboardType="numeric"
                maxLength={5}
                editable={!yukleniyor}
              />

              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="CVV"
                value={kartCvv}
                onChangeText={(text) =>
                  setKartCvv(text.replace(/\D/g, "").slice(0, 3))
                }
                keyboardType="numeric"
                secureTextEntry
                maxLength={3}
                editable={!yukleniyor}
              />
            </View>

            <Text style={styles.inputLabel}>Taksit</Text>

            <View style={styles.installmentRow}>
              {[
                ["1", "Tek �?ekim"],
                ["2", "2 Taksit"],
                ["3", "3 Taksit"],
                ["6", "6 Taksit"],
              ].map(([deger, baslik]) => (
                <Pressable
                  key={deger}
                  style={[
                    styles.installmentButton,
                    kartTaksit === deger && styles.installmentSelected,
                  ]}
                  onPress={() => setKartTaksit(deger)}
                >
                  <Text
                    style={[
                      styles.installmentText,
                      kartTaksit === deger && styles.installmentTextSelected,
                    ]}
                  >
                    {baslik}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.outlineButton}
              onPress={() => setKartOdemeEkrani(false)}
              disabled={yukleniyor}
            >
              <Text style={styles.outlineButtonText}>Geri</Text>
            </Pressable>

            <Pressable
              style={styles.primaryButton}
              onPress={testKartOdemesiniTamamla}
              disabled={yukleniyor}
            >
              {yukleniyor ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  �-DE �?"{" "}
                  {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * MOBIL �-DEME EKRANI
   * =========================================================
   */

  if (
    mobilOdemeEkrani &&
    odemeYontemi === "MOBILE_OPERATOR" &&
    secilenPaketBilgisi
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Pressable onPress={() => setMobilOdemeEkrani(false)}>
              <Text style={styles.backText}>�?� Geri</Text>
            </Pressable>

            <Text style={styles.pageTitle}>gY"� Mobil �-deme</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Se�ilen Paket</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryPackage}>
                {secilenPaketBilgisi.baslik}
              </Text>

              <Text style={styles.summaryPrice}>
                {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>
            </View>
          </View>

          {hata ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{hata}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Operat�r</Text>

          <View style={styles.operatorContainer}>
            {[
              ["TURKCELL", "Turkcell"],
              ["VODAFONE", "Vodafone"],
              ["TURK_TELEKOM", "T�rk Telekom"],
            ].map(([deger, baslik]) => (
              <Pressable
                key={deger}
                style={[
                  styles.operatorButton,
                  mobilOperator === deger && styles.operatorSelected,
                ]}
                onPress={() => setMobilOperator(deger)}
              >
                <Text
                  style={[
                    styles.operatorText,
                    mobilOperator === deger && styles.operatorTextSelected,
                  ]}
                >
                  {baslik}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="5XX XXX XX XX"
            value={mobilTelefon}
            onChangeText={(text) => setMobilTelefon(telefonFormatla(text))}
            keyboardType="numeric"
            maxLength={13}
            editable={!yukleniyor}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Mobil �deme i�Ylemi se�ti�Yiniz operat�r �zerinden
              ger�ekle�Ytirilecektir.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButtonFull}
            onPress={normalOdemeBaslat}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                �-DE �?"{" "}
                {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * HAVALE / EFT EKRANI
   * =========================================================
   */

  if (
    havaleOdemeEkrani &&
    odemeYontemi === "BANK_TRANSFER" &&
    secilenPaketBilgisi
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Pressable onPress={() => setHavaleOdemeEkrani(false)}>
              <Text style={styles.backText}>�?� Geri</Text>
            </Pressable>

            <Text style={styles.pageTitle}>gY�� Havale / EFT</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Se�ilen Paket</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryPackage}>
                {secilenPaketBilgisi.baslik}
              </Text>

              <Text style={styles.summaryPrice}>
                {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
              </Text>
            </View>
          </View>

          <View style={styles.bankCard}>
            <Text style={styles.bankTitle}>Banka Hesap Bilgileri</Text>

            <Text style={styles.bankLabel}>Hesap Sahibi</Text>

            <Text style={styles.bankValue}>G�n�l Bulu�Ymasi</Text>

            <Text style={styles.bankLabel}>Banka</Text>

            <Text style={styles.bankValue}>Banka Adi</Text>

            <Text style={styles.bankLabel}>IBAN</Text>

            <Text style={styles.iban}>TR00 0000 0000 0000 0000 0000 00</Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Havale/EFT yaparken a�iklama alanina �deme sipari�Y numaranizi
              yazmaniz gerekecektir.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              �-deme i�Ylemini yaptiktan sonra banka transferiniz kontrol
              edilir. Onaylandı�Yinda Premium �yeli�Yiniz aktif hale
              getirilecektir.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButtonFull}
            onPress={normalOdemeBaslat}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>�-DEME KAYDI OLUSTUR</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * ANA PREMIUM EKRANI
   * =========================================================
   */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>?</Text>

          <Text style={styles.heroTitle}>Premium �oyelik</Text>

          <Text style={styles.heroDescription}>
            G�n�l Bulu�Ymasi Premium ile mesajla�Ymaya ba�Ylayin.
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
              �o" �-deme i�Yleminiz olu�Yturuldu
            </Text>

            <Text style={styles.successText}>
              Paket: {odeme.membershipPackage}
            </Text>

            <Text style={styles.successText}>
              Sipari�Y No: {odeme.merchantOid}
            </Text>

            <Text style={styles.successText}>
              �-deme Y�ntemi: {odeme.paymentMethod}
            </Text>

            <Text style={styles.successText}>
              Tutar: {odeme.amount} {odeme.currency}
            </Text>

            <Text style={styles.successText}>Durum: {odeme.status}</Text>
          </View>
        ) : null}

        {/* =================================================
            �-ZELLIKLER
        ================================================= */}

        <Text style={styles.sectionHeading}>
          Premium ile neler yapabilirsiniz?
        </Text>

        {[
          "Mesaj g�nderebilirsiniz",
          "Gelen mesajlari okuyabilirsiniz",
          "Sinirsiz mesajla�Yabilirsiniz",
          "Premium �yelik avantajlarindan yararlanabilirsiniz",
        ].map((ozellik) => (
          <View key={ozellik} style={styles.featureCard}>
            <Text style={styles.check}>�o"</Text>

            <Text style={styles.featureText}>{ozellik}</Text>
          </View>
        ))}

        {/* =================================================
            PREMIUM PAKETLERI
        ================================================= */}

        <Text style={styles.sectionHeading}>Premium Paketini Se�</Text>

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

              <Text style={styles.packageIcon}>?</Text>

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
                  {secili ? "SE�?ILDI" : "BU PAKETI SE�?"}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {/* =================================================
            SE�?ILEN PAKET
        ================================================= */}

        {secilenPaketBilgisi ? (
          <View style={styles.selectedPackage}>
            <Text style={styles.selectedPackageLabel}>Se�ilen Paket</Text>

            <Text style={styles.selectedPackageText}>
              {secilenPaketBilgisi.baslik}
              {" - "}
              {secilenPaketBilgisi.fiyat.toFixed(2).replace(".", ",")} TL
            </Text>
          </View>
        ) : null}

        {/* =================================================
            �-DEME Y�-NTEMLERI
        ================================================= */}

        <Text style={styles.sectionHeading}>�-deme Y�ntemini Se�</Text>

        <View style={styles.paymentMethods}>
          <Pressable
            style={[
              styles.paymentButton,
              odemeYontemi === "CARD" && styles.paymentButtonSelected,
            ]}
            onPress={() => {
              setOdemeYontemi("CARD");
              tumEkranlariKapat();
              setHata("");
            }}
          >
            <Text style={styles.paymentIcon}>gY'�</Text>

            <Text
              style={[
                styles.paymentText,
                odemeYontemi === "CARD" && styles.paymentTextSelected,
              ]}
            >
              Kredi / Banka Karti
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
              tumEkranlariKapat();
              setHata("");
            }}
          >
            <Text style={styles.paymentIcon}>gY"�</Text>

            <Text
              style={[
                styles.paymentText,
                odemeYontemi === "MOBILE_OPERATOR" &&
                  styles.paymentTextSelected,
              ]}
            >
              Mobil �-deme
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.paymentButton,
              odemeYontemi === "BANK_TRANSFER" && styles.paymentButtonSelected,
            ]}
            onPress={() => {
              setOdemeYontemi("BANK_TRANSFER");
              tumEkranlariKapat();
              setHata("");
            }}
          >
            <Text style={styles.paymentIcon}>gY��</Text>

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
              Se�ilen �deme y�ntemi:{" "}
              {odemeYontemi === "CARD" && "Kredi / Banka Karti"}
              {odemeYontemi === "MOBILE_OPERATOR" && "Mobil �-deme"}
              {odemeYontemi === "BANK_TRANSFER" && "Havale / EFT"}
            </Text>
          </View>
        ) : null}

        {/* =================================================
            DEVAM ET
        ================================================= */}

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
              ? `DEVAM ET �?" ${secilenPaketBilgisi.fiyat
                  .toFixed(2)
                  .replace(".", ",")} TL`
              : "PREMIUM PAKETI SE�?"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.homeButton}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.homeButtonText}>�?� Ana Sayfa</Text>
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

  pageHeader: {
    marginBottom: 20,
  },

  backText: {
    color: "#6d28d9",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },

  pageTitle: {
    color: "#4c1d95",
    fontSize: 24,
    fontWeight: "900",
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

  summaryCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
  },

  summaryTitle: {
    color: "#6b21a8",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  summaryPackage: {
    flex: 1,
    color: "#222222",
    fontSize: 17,
    fontWeight: "900",
  },

  summaryPrice: {
    color: "#7c3aed",
    fontSize: 21,
    fontWeight: "900",
  },

  infoBox: {
    padding: 15,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  infoText: {
    color: "#1e40af",
    fontSize: 13,
    lineHeight: 19,
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

  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },

  sectionTitle: {
    color: "#4c1d95",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 18,
  },

  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d8d2e8",
    backgroundColor: "#ffffff",
    color: "#222222",
    fontSize: 14,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  halfInput: {
    flex: 1,
  },

  inputLabel: {
    color: "#4c1d95",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  installmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },

  installmentButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c084fc",
    alignItems: "center",
  },

  installmentSelected: {
    backgroundColor: "#7c3aed",
  },

  installmentText: {
    color: "#6d28d9",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  installmentTextSelected: {
    color: "#ffffff",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  outlineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#c084fc",
    alignItems: "center",
  },

  outlineButtonText: {
    color: "#6d28d9",
    fontSize: 14,
    fontWeight: "800",
  },

  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 13,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonFull: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },

  operatorContainer: {
    gap: 8,
    marginBottom: 12,
  },

  operatorButton: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c084fc",
    backgroundColor: "#ffffff",
  },

  operatorSelected: {
    backgroundColor: "#7c3aed",
  },

  operatorText: {
    color: "#6d28d9",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  operatorTextSelected: {
    color: "#ffffff",
  },

  bankCard: {
    marginBottom: 16,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#ffffff",
  },

  bankTitle: {
    padding: 15,
    color: "#4c1d95",
    fontSize: 16,
    fontWeight: "900",
    backgroundColor: "#f5f3ff",
  },

  bankLabel: {
    marginTop: 14,
    marginHorizontal: 16,
    color: "#777777",
    fontSize: 12,
  },

  bankValue: {
    marginTop: 4,
    marginHorizontal: 16,
    color: "#222222",
    fontSize: 15,
    fontWeight: "800",
  },

  iban: {
    margin: 16,
    padding: 13,
    borderRadius: 10,
    backgroundColor: "#faf5ff",
    color: "#4c1d95",
    fontSize: 13,
    fontWeight: "900",
  },

  warningBox: {
    padding: 15,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },

  warningText: {
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 19,
  },
});
