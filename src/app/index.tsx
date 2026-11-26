import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { API_BASE_URL } from "../config/api";
import { diliDegistir, type DesteklenenDil } from "../dil/i18n";
import { gecerliAccessTokenGetir } from "../services/api";
import { bekleyenAramayiGetir } from "../services/bekleyenAramaServisi";
import E2EEDeviceService from "../services/E2EEDeviceService";
import {
  fcmCihazKaydet,
  fcmTokenYenilemeDinleyicisiniBaslat,
} from "../services/fcmServisi";

import {
  refreshTokenKaydet,
  tokenDepolamaIslemi,
  tokenGetir,
  tokenKaydet,
} from "../services/tokenServisi";

import {
  oturumAcildi,
  oturumGecisiniSirayaAl,
  oturumNesliniGetir,
  oturumNesliGecerliMi,
} from "../services/authSession";

console.log("INDEX DOSYASI ÇALIŞIYOR");

const API_ADRESI = API_BASE_URL + "/api";

// ============================================
// DİL BİLDİRİMLERİ
// ============================================

const DIL_BILDIRIMLERI: Record<
  DesteklenenDil,
  {
    baslik: string;
    yenidenBaslat: string;
    hataBaslik: string;
    degistirmeHatasi: string;
  }
> = {
  tr: {
    baslik: "Uygulama dili",
    yenidenBaslat:
      "Yazım yönünün tam uygulanması için uygulamayı kapatıp yeniden açın.",
    hataBaslik: "Hata",
    degistirmeHatasi: "Seçilen dil uygulanamadı. Lütfen tekrar deneyin.",
  },
  en: {
    baslik: "App language",
    yenidenBaslat:
      "Please close and reopen the app to fully apply the text direction.",
    hataBaslik: "Error",
    degistirmeHatasi:
      "The selected language could not be applied. Please try again.",
  },
  de: {
    baslik: "App-Sprache",
    yenidenBaslat:
      "Bitte schließen Sie die App und öffnen Sie sie erneut, damit die Schreibrichtung vollständig übernommen wird.",
    hataBaslik: "Fehler",
    degistirmeHatasi:
      "Die ausgewählte Sprache konnte nicht übernommen werden. Bitte versuchen Sie es erneut.",
  },
  ar: {
    baslik: "لغة التطبيق",
    yenidenBaslat:
      "يرجى إغلاق التطبيق وإعادة فتحه لتطبيق اتجاه الكتابة بالكامل.",
    hataBaslik: "خطأ",
    degistirmeHatasi: "تعذر تطبيق اللغة المحددة. يرجى المحاولة مرة أخرى.",
  },
  ru: {
    baslik: "Язык приложения",
    yenidenBaslat:
      "Закройте приложение и откройте его снова, чтобы полностью применить направление текста.",
    hataBaslik: "Ошибка",
    degistirmeHatasi:
      "Не удалось применить выбранный язык. Попробуйте ещё раз.",
  },
};

// ============================================
// ANA SAYFA
// ============================================

export default function AnaSayfa() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();

  const [dilSeciliyor, setDilSeciliyor] = useState(false);

  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [debugMesaj, setDebugMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  // ============================================
  // DESTEKLENEN DİLLER
  // ============================================

  const dilListesi: {
    kod: DesteklenenDil;
    bayrak: string;
    ad: string;
  }[] = [
    { kod: "tr", bayrak: "🇹🇷", ad: "Türkçe" },
    { kod: "en", bayrak: "🇬🇧", ad: "English" },
    { kod: "de", bayrak: "🇩🇪", ad: "Deutsch" },
    { kod: "ar", bayrak: "🇸🇦", ad: "العربية" },
    { kod: "ru", bayrak: "🇷🇺", ad: "Русский" },
  ];

  // ============================================
  // DİL DEĞİŞTİR
  // ============================================

  const dilSec = async (dil: DesteklenenDil) => {
    if (dilSeciliyor || i18n.language === dil) {
      return;
    }

    try {
      setDilSeciliyor(true);

      const yenidenBaslatGerekli = await diliDegistir(dil);

      // Dil değiştiğinde eski dilde kalan geçici mesajları temizle.
      setMesaj("");
      setDebugMesaj("");

      if (yenidenBaslatGerekli) {
        Alert.alert(
          DIL_BILDIRIMLERI[dil].baslik,
          DIL_BILDIRIMLERI[dil].yenidenBaslat,
        );
      }
    } catch (hata) {
      console.error("GİRİŞ EKRANINDA DİL DEĞİŞTİRİLEMEDİ:", hata);

      const aktifDil = (i18n.resolvedLanguage || i18n.language).split(
        "-",
      )[0] as DesteklenenDil;

      const bildirimDil = DIL_BILDIRIMLERI[aktifDil] ? aktifDil : "tr";

      Alert.alert(
        DIL_BILDIRIMLERI[bildirimDil].hataBaslik,
        DIL_BILDIRIMLERI[bildirimDil].degistirmeHatasi,
      );
    } finally {
      setDilSeciliyor(false);
    }
  };

  // ============================================
  // GİRİŞ YAP
  // ============================================

  const girisYap = async () => {
    console.log("GIRIS BUTONUNA BASILDI");

    if (!kullaniciAdi.trim() || !sifre.trim()) {
      setMesaj(t("login.requiredFields"));
      setDebugMesaj(t("login.debug.emptyFields"));
      return;
    }

    if (yukleniyor) {
      return;
    }

    setYukleniyor(true);
    setMesaj("");
    setDebugMesaj(t("login.debug.preparing"));

    const xhr = new XMLHttpRequest();

    xhr.timeout = 10000;

    let cevapIslendi = false;

    xhr.onreadystatechange = async () => {
      if (xhr.readyState !== 4 || cevapIslendi) {
        return;
      }

      cevapIslendi = true;

      console.log("LOGIN READY STATE:", xhr.readyState);
      console.log("LOGIN STATUS:", xhr.status);

      // Güvenlik: responseText hiçbir zaman doğrudan
      // konsola yazdırılmaz. İçerisinde JWT bulunabilir.

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const veri = JSON.parse(xhr.responseText);

          console.log("LOGIN JSON:", {
            message: veri.message,
            userId: veri.userId,
            username: veri.username,
            role: veri.role,
            token: veri.token ? "VAR" : "YOK",
            refreshToken: veri.refreshToken ? "VAR" : "YOK",
          });

          // ============================================
          // TOKEN VE KULLANICI BİLGİLERİ KONTROLÜ
          // ============================================

          if (
            typeof veri.token !== "string" ||
            !veri.token.trim() ||
            typeof veri.refreshToken !== "string" ||
            !veri.refreshToken.trim()
          ) {
            throw new Error(
              "Sunucudan geçerli access token veya refresh token alınamadı.",
            );
          }

          if (
            veri.userId === undefined ||
            veri.userId === null ||
            typeof veri.username !== "string" ||
            !veri.username.trim() ||
            typeof veri.role !== "string" ||
            !veri.role.trim()
          ) {
            throw new Error("Sunucudan geçerli kullanıcı bilgileri alınamadı.");
          }

          // ============================================
          // ATOMİK OTURUM KAYDI
          // ============================================

          // Login, refresh ve logout işlemleri aynı kilidi kullanır.
          // Böylece eski logout işlemi yeni kullanıcının tokenlarını
          // silemez veya refresh işlemi login tokenlarını ezemez.

          let loginOturumNesli = -1;

          await oturumGecisiniSirayaAl(async () => {
            await tokenDepolamaIslemi(async () => {
            // Önce refresh token kaydedilir.
            await refreshTokenKaydet(veri.refreshToken);

            // Sonra access token kaydedilir.
            await tokenKaydet(veri.token);

            // Kullanıcı bilgileri kaydedilir.
            await AsyncStorage.multiSet([
              ["userId", String(veri.userId)],
              ["username", veri.username],
              ["role", veri.role],
            ]);

            // Bütün kayıtlar başarılı olduktan sonra
            // yeni oturum aktif hâle getirilir.
            oturumAcildi();
            loginOturumNesli = oturumNesliniGetir();

            // FCM token değişikliklerini yalnızca bu oturumda dinle.
            fcmTokenYenilemeDinleyicisiniBaslat(
              gecerliAccessTokenGetir,
              () => oturumNesliGecerliMi(loginOturumNesli),
            );
            });
          });
          console.log("ACCESS TOKEN KAYDEDİLDİ.");
          console.log("REFRESH TOKEN KEYCHAIN'E KAYDEDİLDİ.");
          console.log("KULLANICI BİLGİLERİ KAYDEDİLDİ.");

          // ============================================
          // E2EE CİHAZ KAYDI
          // ============================================

          // Bu işlem başarısız olsa bile normal kullanıcı
          // girişi devam eder.

          try {
            console.log("E2EE CİHAZ KAYDI BAŞLATILIYOR...");

            const e2eeKayit = await E2EEDeviceService.cihaziKaydet();

            console.log("E2EE CİHAZ KAYDI SONUCU:", {
              deviceId: e2eeKayit.deviceId,
              fingerprint: e2eeKayit.fingerprint,
              status: e2eeKayit.status,
            });
          } catch (e2eeHata) {
            console.error("E2EE CİHAZ KAYDI BAŞARISIZ:", e2eeHata);
          }

          // ============================================
          // FCM CİHAZ TOKENINI BACKEND'E KAYDET
          // ============================================

          try {
            console.log("FCM CİHAZ KAYDI BAŞLATILIYOR...");

            if (!oturumNesliGecerliMi(loginOturumNesli)) {
              console.log("LOGIN FCM KAYDI İPTAL: OTURUM DEĞİŞMİŞ.");
              return;
            }

            const fcmKayitBasarili = await fcmCihazKaydet(
              veri.token,
              undefined,
              () => oturumNesliGecerliMi(loginOturumNesli),
            );

            if (fcmKayitBasarili) {
              console.log("FCM CİHAZ KAYDI BAŞARILI:", veri.userId);
            } else {
              console.error("FCM CİHAZ KAYDI BAŞARISIZ:", veri.userId);
            }
          } catch (fcmHata) {
            console.error("LOGIN SONRASI FCM HATASI:", fcmHata);
          }

          console.log("JWT MERKEZI TOKEN SERVISINE KAYDEDILDI");
          console.log("USER ID KAYDEDILDI:", veri.userId);
          console.log("USERNAME KAYDEDILDI:", veri.username);
          console.log("ROLE KAYDEDILDI:", veri.role);

          // ============================================
          // KAYIT KONTROLÜ
          // ============================================

          const kayitliToken = await tokenGetir();

          const kayitliUserId = await AsyncStorage.getItem("userId");

          const kayitliUsername = await AsyncStorage.getItem("username");

          const kayitliRole = await AsyncStorage.getItem("role");

          console.log(
            "TOKEN KONTROL:",
            kayitliToken ? "TOKEN VAR" : "TOKEN YOK",
          );

          console.log("KAYITLI USER ID:", kayitliUserId);
          console.log("KAYITLI USERNAME:", kayitliUsername);
          console.log("KAYITLI ROLE:", kayitliRole);

          // ============================================
          // JWT KONTROLÜ
          // ============================================

          if (!kayitliToken) {
            console.log("JWT KAYDEDILEMEDI");

            setMesaj(t("login.sessionSaveError"));
            setDebugMesaj(t("login.debug.tokenNotSaved"));

            setYukleniyor(false);
            return;
          }

          // GİRİŞ BAŞARILI
          console.log("LOGIN BASARILI");

          setMesaj(t("login.success"));

          setDebugMesaj(
            t("login.debug.successDetails", {
              username: kayitliUsername,
              userId: kayitliUserId,
              role: kayitliRole,
            }),
          );

          // ============================================
          // ANA SAYFAYA GEÇİŞ
          // ============================================

          console.log("ANA SAYFAYA YÖNLENDİRİLİYOR: /home");

          setYukleniyor(false);

          setTimeout(async () => {
            try {
              const bekleyenArama = await bekleyenAramayiGetir();

              if (bekleyenArama && bekleyenArama.actionId !== "reject") {
                console.log("BEKLEYEN ARAMA BULUNDU:", bekleyenArama.callId);

                navigation.reset({
                  index: 0,
                  routes: [{ name: "messages" }],
                });

                return;
              }

              navigation.reset({
                index: 0,
                routes: [{ name: "home" }],
              });
            } catch (hata) {
              console.error("BEKLEYEN ARAMA KONTROL HATASI:", hata);

              navigation.reset({
                index: 0,
                routes: [{ name: "home" }],
              });
            }
          }, 500);
        } catch (hata) {
          console.error("LOGIN JSON / STORAGE HATASI:", hata);

          setMesaj(t("login.userSaveError"));

          setDebugMesaj(
            t("login.debug.tokenSaveError", {
              error: String(hata),
            }),
          );

          setYukleniyor(false);
        }
      } else if (xhr.status === 401) {
        console.log("LOGIN REDDEDİLDİ: HTTP 401");

        setMesaj(t("login.invalidCredentials"));
        setDebugMesaj(t("login.debug.unauthorized"));

        setYukleniyor(false);
      } else if (xhr.status === 400) {
        console.log("LOGIN GEÇERSİZ İSTEK: HTTP 400");

        setMesaj(t("login.invalidRequest"));
        setDebugMesaj(t("login.debug.badRequest"));

        setYukleniyor(false);
      } else {
        console.log("LOGIN HTTP HATASI:", xhr.status);

        if (xhr.status === 0) {
          setMesaj(t("login.serverUnavailable"));
        } else if (xhr.status >= 500) {
          setMesaj(t("login.serverError"));
        } else {
          setMesaj(t("login.loginError"));
        }

        setDebugMesaj(
          t("login.debug.httpError", {
            status: xhr.status,
          }),
        );

        setYukleniyor(false);
      }
    };

    // ============================================
    // NETWORK HATASI
    // ============================================

    xhr.onerror = () => {
      if (cevapIslendi) {
        return;
      }

      cevapIslendi = true;

      console.log("LOGIN NETWORK HATASI");

      setDebugMesaj(t("login.debug.connectionError"));
      setMesaj(t("login.connectionError"));

      setYukleniyor(false);
    };

    // ============================================
    // TIMEOUT
    // ============================================

    xhr.ontimeout = () => {
      if (cevapIslendi) {
        return;
      }

      cevapIslendi = true;

      console.log("LOGIN TIMEOUT");

      setDebugMesaj(t("login.debug.timeout"));
      setMesaj(t("login.timeoutError"));

      setYukleniyor(false);
    };

    // ============================================
    // LOGIN ENDPOINT
    // ============================================

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

  // ============================================
  // ŞİFREMİ UNUTTUM
  // ============================================

  const sifremiUnuttum = () => {
    navigation.navigate("sifreSifirlama");
  };

  // ============================================
  // KAYIT OL
  // ============================================

  const kayitOl = () => {
    console.log("KAYIT OL BASILDI");

    navigation.navigate("register");
  };

  // ============================================
  // EKRAN
  // ============================================

  return (
    <SafeAreaView style={styles.alan}>
      <View style={styles.klavye}>
        <View style={styles.dilSecimAlani}>
          <Text style={styles.dilSecimBaslik}>{t("settings.language")}</Text>

          <View style={styles.dilSecimSatiri}>
            {dilListesi.map((dil) => {
              const secili = i18n.language?.split("-")[0] === dil.kod;

              return (
                <Pressable
                  key={dil.kod}
                  accessibilityRole="button"
                  accessibilityLabel={dil.ad}
                  accessibilityState={{
                    selected: secili,
                    disabled: dilSeciliyor,
                  }}
                  disabled={dilSeciliyor}
                  onPress={() => void dilSec(dil.kod)}
                  style={[
                    styles.dilSecimButonu,
                    secili && styles.dilSecimButonuAktif,
                  ]}
                >
                  <Text style={styles.dilSecimBayrak}>{dil.bayrak}</Text>

                  <Text
                    style={[
                      styles.dilSecimYazi,
                      secili && styles.dilSecimYaziAktif,
                    ]}
                  >
                    {dil.ad}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.kart}>
          <View style={styles.logoAlan}>
            <Image
              source={require("./logo/logo-gonul-bulusmasi.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.baslik}>Gönül Buluşması</Text>

          <Text style={styles.altBaslik}>{t("login.subtitle")}</Text>

          <Text style={styles.etiket}>{t("login.username")}</Text>

          <TextInput
            style={styles.girdi}
            placeholder={t("login.usernamePlaceholder")}
            placeholderTextColor="#999"
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!yukleniyor}
          />

          <Text style={styles.etiket}>{t("login.password")}</Text>

          <TextInput
            style={styles.girdi}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor="#999"
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!yukleniyor}
          />

          <Pressable
            style={styles.sifremiUnuttum}
            onPress={sifremiUnuttum}
            disabled={yukleniyor}
          >
            <Text style={styles.link}>{t("login.forgotPassword")}</Text>
          </Pressable>

          <Pressable
            style={[styles.girisButonu, yukleniyor && styles.girisButonuPasif]}
            onPress={girisYap}
            disabled={yukleniyor}
          >
            <Text style={styles.girisYazi}>
              {yukleniyor ? t("login.loggingIn") : t("login.loginButton")}
            </Text>
          </Pressable>

          {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}

          {debugMesaj ? (
            <View style={styles.debugAlan}>
              <Text style={styles.debugBaslik}>{t("login.debug.title")}</Text>

              <Text style={styles.debugYazi}>{debugMesaj}</Text>
            </View>
          ) : null}

          <View style={styles.kayitSatiri}>
            <Text style={styles.kayitMetni}>
              {t("login.registerQuestion")}{" "}
            </Text>

            <Pressable onPress={kayitOl} disabled={yukleniyor}>
              <Text style={styles.link}>{t("login.registerButton")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  alan: {
    flex: 1,
    backgroundColor: "#FFF7F8",
  },

  dilSecimAlani: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  dilSecimBaslik: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "right",
  },

  dilSecimSatiri: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
  },

  dilSecimButonu: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5D5DA",
    backgroundColor: "#FFFFFF",
  },

  dilSecimButonuAktif: {
    borderColor: "#E91E63",
    backgroundColor: "#FCE4EC",
  },

  dilSecimBayrak: {
    fontSize: 15,
    marginRight: 5,
  },

  dilSecimYazi: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "600",
  },

  dilSecimYaziAktif: {
    color: "#C2185B",
    fontWeight: "800",
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

  etiket: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },

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

  sifremiUnuttum: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 22,
  },

  link: {
    color: "#E91E63",
    fontWeight: "700",
  },

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

  mesaj: {
    textAlign: "center",
    marginTop: 16,
    color: "#E91E63",
    fontWeight: "600",
  },

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
