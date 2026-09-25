import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";
// src/app/home.tsx
// src/app/index.tsx
import { API_BASE_URL } from "../config/api";
console.log("INDEX DOSYASI �?ALISIYOR");

// =====================================================
// BACKEND API ADRESI
// =====================================================

const API_ADRESI = API_BASE_URL + "/api";

const SUNUCU_ADRESI = API_BASE_URL;
export default function AnaSayfa() {
  const router = useRouter();

  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [debugMesaj, setDebugMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  // =====================================================
  // GIRIS YAP
  // =====================================================

  const girisYap = async () => {
    console.log("GIRIS BUTONUNA BASILDI");

    if (!kullaniciAdi.trim() || !sifre.trim()) {
      setMesaj("Kullanici adi ve �Yifre zorunludur.");
      setDebugMesaj("Kullanici adi veya �Yifre bo�Y.");
      return;
    }

    setYukleniyor(true);
    setMesaj("");
    setDebugMesaj("1 - Login iste�Yi hazirlaniyor");

    const xhr = new XMLHttpRequest();

    xhr.timeout = 10000;

    xhr.onreadystatechange = async () => {
      console.log("LOGIN READY STATE:", xhr.readyState);
      console.log("LOGIN STATUS:", xhr.status);

      if (xhr.readyState !== 4) {
        return;
      }

      console.log("LOGIN CEVABI:", xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const veri = JSON.parse(xhr.responseText);

          console.log("LOGIN JSON:", {
            message: veri.message,
            userId: veri.userId,
            username: veri.username,
            role: veri.role,
            token: veri.token ? "VAR" : "YOK",
          });

          // =====================================================
          // JWT VE KULLANICI BILGILERINI TELEFONA KAYDET
          // =====================================================

          await AsyncStorage.setItem("token", veri.token);
          await AsyncStorage.setItem("userId", String(veri.userId));
          await AsyncStorage.setItem("username", veri.username);
          await AsyncStorage.setItem("role", veri.role);

          console.log("JWT ASYNCSTORAGE'A KAYDEDILDI");
          console.log("USER ID KAYDEDILDI:", veri.userId);
          console.log("USERNAME KAYDEDILDI:", veri.username);
          console.log("ROLE KAYDEDILDI:", veri.role);

          // =====================================================
          // ASYNCSTORAGE KONTROL�o
          // =====================================================

          const kayitliToken = await AsyncStorage.getItem("token");

          const kayitliUserId = await AsyncStorage.getItem("userId");

          const kayitliUsername = await AsyncStorage.getItem("username");

          const kayitliRole = await AsyncStorage.getItem("role");

          console.log(
            "ASYNCSTORAGE TOKEN KONTROL:",
            kayitliToken ? "TOKEN VAR" : "TOKEN YOK",
          );

          console.log("KAYITLI USER ID:", kayitliUserId);

          console.log("KAYITLI USERNAME:", kayitliUsername);

          console.log("KAYITLI ROLE:", kayitliRole);

          // =====================================================
          // JWT KONTROL�o
          // =====================================================

          if (!kayitliToken) {
            console.log("JWT KAYDEDILEMEDI");

            setMesaj("Giri�Y yapildi ancak oturum bilgisi kaydedilemedi.");

            setDebugMesaj("JWT AsyncStorage'a kaydedilemedi.");

            setYukleniyor(false);

            return;
          }

          // =====================================================
          // LOGIN BASARILI
          // =====================================================

          console.log("LOGIN BASARILI");

          setMesaj("Giri�Y ba�Yarili!");

          setDebugMesaj(
            `Giri�Y ba�Yarili
Kullanici: ${kayitliUsername}
User ID: ${kayitliUserId}
Rol: ${kayitliRole}
JWT: Kaydedildi`,
          );

          // =====================================================
          // ANA SAYFAYA GE�?
          // =====================================================

          console.log("ANA SAYFAYA Y�-NLENDIRILIYOR: /home");

          setYukleniyor(false);

          setTimeout(() => {
            router.replace("/home");
          }, 500);
        } catch (hata) {
          console.log("LOGIN JSON / STORAGE HATASI:", hata);

          setMesaj("Giri�Y ba�Yarili ancak kullanici bilgileri kaydedilemedi.");

          setDebugMesaj(`JWT kaydetme hatasi\n${String(hata)}`);

          setYukleniyor(false);
        }
      } else if (xhr.status === 401) {
        setMesaj("Kullanici adi veya �Yifre hatali.");

        setDebugMesaj(`Login reddedildi\nHTTP: 401\n${xhr.responseText}`);

        setYukleniyor(false);
      } else if (xhr.status === 400) {
        setMesaj("G�nderilen bilgiler ge�ersiz.");

        setDebugMesaj(`Ge�ersiz istek\nHTTP: 400\n${xhr.responseText}`);

        setYukleniyor(false);
      } else {
        setMesaj(`Giri�Y ba�Yarisiz. HTTP ${xhr.status}`);

        setDebugMesaj(
          `Backend hatasi\nHTTP: ${xhr.status}\n${xhr.responseText}`,
        );

        setYukleniyor(false);
      }
    };

    // =============================================================
    // NETWORK HATASI
    // =============================================================

    xhr.onerror = () => {
      console.log("LOGIN NETWORK HATASI");

      setDebugMesaj("4 - Login network hatasi");

      setMesaj("Backend'e ba�Ylanirken network hatasi olu�Ytu.");

      setYukleniyor(false);
    };

    // =============================================================
    // TIMEOUT
    // =============================================================

    xhr.ontimeout = () => {
      console.log("LOGIN TIMEOUT");

      setDebugMesaj("4 - Login iste�Yi 10 saniyede cevap vermedi");

      setMesaj("Sunucu zaman a�Yimina u�Yradi.");

      setYukleniyor(false);
    };

    // =============================================================
    // LOGIN ENDPOINT
    // =============================================================

    xhr.open("POST", `${API_ADRESI}/auth/login`, true);

    xhr.setRequestHeader("Content-Type", "application/json");

    const loginVerisi = JSON.stringify({
      username: kullaniciAdi.trim(),
      password: sifre,
    });

    console.log("LOGIN URL:", `${API_ADRESI}/auth/login`);

    console.log("LOGIN VERISI:", {
      username: kullaniciAdi.trim(),
      password: "***",
    });

    xhr.send(loginVerisi);
  };

  // =============================================================
  // SIFREMI UNUTTUM
  // =============================================================

  const sifremiUnuttum = () => {
    console.log("SIFREMI UNUTTUM BASILDI");

    Alert.alert(
      "Sifremi Unuttum",
      "Sifre sifirlama ekranini daha sonra ekleyece�Yiz.",
    );
  };

  // =============================================================
  // KAYIT OL
  // =============================================================

  const kayitOl = () => {
    console.log("KAYIT OL BASILDI");

    router.push("/register");
  };

  // =============================================================
  // EKRAN
  // =============================================================

  return (
    <SafeAreaView style={styles.alan}>
      <View style={styles.klavye}>
        <View style={styles.kart}>
          {/* =====================================================
              LOGO - EN �oST
              ===================================================== */}

          <View style={styles.logoAlan}>
            <Image
              source={require("./logo/logo-gonul-bulusmasi.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* =====================================================
              BASLIK
              ===================================================== */}

          <Text style={styles.baslik}>G�n�l Bulu�Ymasi</Text>

          <Text style={styles.altBaslik}>Hayatinin g�zel insaniyla tanı�Y</Text>

          {/* =====================================================
              KULLANICI ADI
              ===================================================== */}

          <Text style={styles.etiket}>Kullanici Adi</Text>

          <TextInput
            style={styles.girdi}
            placeholder="Kullanici adiniz"
            placeholderTextColor="#999"
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!yukleniyor}
          />

          {/* =====================================================
              SIFRE
              ===================================================== */}

          <Text style={styles.etiket}>Sifre</Text>

          <TextInput
            style={styles.girdi}
            placeholder="Sifreniz"
            placeholderTextColor="#999"
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!yukleniyor}
          />

          {/* =====================================================
              SIFREMI UNUTTUM
              ===================================================== */}

          <Pressable
            style={styles.sifremiUnuttum}
            onPress={sifremiUnuttum}
            disabled={yukleniyor}
          >
            <Text style={styles.link}>Sifremi Unuttum</Text>
          </Pressable>

          {/* =====================================================
              GIRIS
              ===================================================== */}

          <Pressable
            style={[styles.girisButonu, yukleniyor && styles.girisButonuPasif]}
            onPress={girisYap}
            disabled={yukleniyor}
          >
            <Text style={styles.girisYazi}>
              {yukleniyor ? "Giri�Y yapiliyor..." : "Giri�Y Yap"}
            </Text>
          </Pressable>

          {/* =====================================================
              MESAJ
              ===================================================== */}

          {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}

          {/* =====================================================
              DEBUG
              ===================================================== */}

          {debugMesaj ? (
            <View style={styles.debugAlan}>
              <Text style={styles.debugBaslik}>DEBUG</Text>

              <Text style={styles.debugYazi}>{debugMesaj}</Text>
            </View>
          ) : null}

          {/* =====================================================
              KAYIT
              ===================================================== */}

          <View style={styles.kayitSatiri}>
            <Text style={styles.kayitMetni}>Hesabin yok mu? </Text>

            <Pressable onPress={kayitOl} disabled={yukleniyor}>
              <Text style={styles.link}>Kayit Ol</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({
  alan: {
    flex: 1,
    backgroundColor: "#FFF7F8",
  },

  klavye: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  kart: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 5,
  },

  // =============================================================
  // LOGO
  // =============================================================

  logoAlan: {
    width: "100%",
    height: 180,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 10,
  },

  logo: {
    width: 300,
    height: 170,
  },

  // =============================================================
  // BASLIK
  // =============================================================

  baslik: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    color: "#222222",
  },

  altBaslik: {
    fontSize: 15,
    textAlign: "center",
    color: "#777777",

    marginTop: 8,
    marginBottom: 28,
  },

  // =============================================================
  // ETIKET
  // =============================================================

  etiket: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },

  // =============================================================
  // INPUT
  // =============================================================

  girdi: {
    height: 52,

    borderWidth: 1,
    borderColor: "#DDDDDD",

    borderRadius: 12,

    paddingHorizontal: 16,

    fontSize: 16,
    color: "#222222",

    marginBottom: 18,

    backgroundColor: "#FAFAFA",
  },

  // =============================================================
  // SIFREMI UNUTTUM
  // =============================================================

  sifremiUnuttum: {
    alignSelf: "flex-end",

    marginTop: -8,
    marginBottom: 22,
  },

  // =============================================================
  // LINK
  // =============================================================

  link: {
    color: "#E91E63",
    fontWeight: "700",
  },

  // =============================================================
  // GIRIS BUTONU
  // =============================================================

  girisButonu: {
    height: 54,

    borderRadius: 14,

    backgroundColor: "#E91E63",

    justifyContent: "center",
    alignItems: "center",
  },

  girisButonuPasif: {
    opacity: 0.6,
  },

  girisYazi: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  // =============================================================
  // MESAJ
  // =============================================================

  mesaj: {
    textAlign: "center",

    marginTop: 16,

    color: "#E91E63",

    fontWeight: "600",
  },

  // =============================================================
  // DEBUG
  // =============================================================

  debugAlan: {
    marginTop: 16,

    padding: 12,

    borderRadius: 10,

    backgroundColor: "#F2F2F2",
  },

  debugBaslik: {
    fontSize: 12,

    fontWeight: "800",

    color: "#333333",

    marginBottom: 5,
  },

  debugYazi: {
    fontSize: 12,

    color: "#555555",
  },

  // =============================================================
  // KAYIT
  // =============================================================

  kayitSatiri: {
    flexDirection: "row",

    justifyContent: "center",

    marginTop: 24,
  },

  kayitMetni: {
    color: "#666666",
    fontSize: 14,
  },
});

