import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RTCView } from "react-native-webrtc";

import aramaWebRTC, {
  type AramaMesaji,
} from "../services/AramaWebRTC";

import {
  bekleyenAramayiGetir,
  bekleyenAramayiSil,
} from "../services/bekleyenAramaServisi";

import { gelenAramaBildiriminiKapat } from "../services/aramaBildirimServisi";
import { Hoparlor } from "../services/Hoparlor";

type GelenTeklif = Extract<AramaMesaji, { tip: "CALL_OFFER" }>;

type AramaDurumu =
  | "HAZIRLANIYOR"
  | "GELEN_ARAMA"
  | "BAGLANIYOR"
  | "BAGLANDI"
  | "SONLANDI";

export default function IncomingCallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const kaynakEkran = route.params?.kaynakEkran;

  const [arayanAdi, setArayanAdi] = useState("Gelen arama");
  const [aramaTuru, setAramaTuru] = useState<"SES" | "VIDEO">("SES");
  const [aramaDurumu, setAramaDurumu] =
    useState<AramaDurumu>("HAZIRLANIYOR");

  const [gelenTeklif, setGelenTeklif] =
    useState<GelenTeklif | null>(null);

  const [yerelStreamUrl, setYerelStreamUrl] =
    useState<string | null>(null);

  const [uzakStreamUrl, setUzakStreamUrl] =
    useState<string | null>(null);

  const [islemDevamEdiyor, setIslemDevamEdiyor] = useState(false);
  const [hoparlorAcik, setHoparlorAcik] = useState(false);
  const [kameraAcik, setKameraAcik] = useState(true);

  const callIdRef = useRef<string | null>(null);
  const arayanIdRef = useRef<number | null>(null);
  const islemKilidiRef = useRef(false);
  const sonlandirildiRef = useRef(false);

  const bildirimiTemizle = useCallback(async () => {
    const callId = callIdRef.current;

    try {
      const bekleyen = await bekleyenAramayiGetir();

      // Yeni gelen başka bir aramanın kaydını silme.
      if (!bekleyen || bekleyen.callId === callId) {
        await bekleyenAramayiSil();
      }

      if (callId) {
        await gelenAramaBildiriminiKapat(callId);
      }
    } catch (hata) {
      console.error("ARAMA BİLDİRİM TEMİZLEME HATASI:", hata);
    }
  }, []);

  const ekraniKapat = useCallback(() => {
    // Arama başka bir ekrandan geldiyse Messages ve IncomingCall
    // ekranlarını birlikte kapatıp kullanıcının önceki ekranına dön.
    if (kaynakEkran && kaynakEkran !== "messages") {
      const state = navigation.getState();

      if (state?.routes?.length >= 3) {
        navigation.pop(2);
        return;
      }
    }

    // Soğuk açılışta Messages ekranı başlangıç ekranıdır.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "messages" }],
      });
    }
  }, [navigation, kaynakEkran]);

  useEffect(() => {
    let aktif = true;

    const bilgileriYukle = async () => {
      try {
        const bekleyen = await bekleyenAramayiGetir();

        if (!aktif || !bekleyen) {
          return;
        }

        const arayanId = Number(bekleyen.callerId);

        if (!Number.isInteger(arayanId) || arayanId <= 0) {
          console.error("GEÇERSİZ GELEN ARAMA KULLANICI ID");
          return;
        }

        callIdRef.current = bekleyen.callId;
        arayanIdRef.current = arayanId;

        setArayanAdi(
          bekleyen.callerName?.trim() ||
            `Kullanıcı ${arayanId}`,
        );

        setAramaTuru(
          bekleyen.callType === "VIDEO" ? "VIDEO" : "SES",
        );

        console.log("YENİ GELEN ARAMA EKRANI HAZIR:", {
          callId: bekleyen.callId,
          arayanId,
        });
      } catch (hata) {
        console.error("GELEN ARAMA BİLGİLERİ OKUNAMADI:", hata);
      }
    };

    void bilgileriYukle();

    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    const temizleyiciler: Array<() => void> = [];

    temizleyiciler.push(
      aramaWebRTC.olayDinle("teklif", (mesaj) => {
        if (sonlandirildiRef.current) {
          return;
        }

        const arayanId = Number(mesaj.arayanId);

        if (
          arayanIdRef.current !== null &&
          arayanId !== arayanIdRef.current
        ) {
          console.warn("BAŞKA ARAMAYA AİT TEKLİF YOK SAYILDI");
          return;
        }

        arayanIdRef.current = arayanId;

        setGelenTeklif(mesaj);
        setAramaTuru(mesaj.aramaTuru);
        setAramaDurumu("GELEN_ARAMA");

        console.log("YENİ EKRAN WEBRTC TEKLİFİNİ ALDI");
      }),
    );

    temizleyiciler.push(
      aramaWebRTC.olayDinle("baglandi", () => {
        if (sonlandirildiRef.current) {
          return;
        }

        setAramaDurumu("BAGLANDI");
        setHoparlorAcik(Hoparlor.hoparlorDurumu());

        const yerel = aramaWebRTC.getYerelStream();
        const uzak = aramaWebRTC.getUzakStream();

        setYerelStreamUrl(yerel?.toURL() ?? null);
        setUzakStreamUrl(uzak?.toURL() ?? null);
      }),
    );

    temizleyiciler.push(
      aramaWebRTC.olayDinle("uzakStream", (stream) => {
        if (!sonlandirildiRef.current) {
          setUzakStreamUrl(stream.toURL());
        }
      }),
    );

    const aramaSonlandi = () => {
      if (sonlandirildiRef.current) {
        return;
      }

      sonlandirildiRef.current = true;
      setAramaDurumu("SONLANDI");
      void bildirimiTemizle();
      ekraniKapat();
    };

    temizleyiciler.push(
      aramaWebRTC.olayDinle("bitir", aramaSonlandi),
    );

    temizleyiciler.push(
      aramaWebRTC.olayDinle("reddet", aramaSonlandi),
    );

    return () => {
      temizleyiciler.forEach((temizle) => temizle());
    };
  }, [bildirimiTemizle, ekraniKapat]);

  const aramayiKabulEt = async () => {
    if (
      islemKilidiRef.current ||
      sonlandirildiRef.current ||
      !gelenTeklif
    ) {
      return;
    }

    islemKilidiRef.current = true;
    setIslemDevamEdiyor(true);
    setAramaDurumu("BAGLANIYOR");

    try {
      await aramaWebRTC.teklifiKabulEt(gelenTeklif.teklif);

      setYerelStreamUrl(
        aramaWebRTC.getYerelStream()?.toURL() ?? null,
      );

      setUzakStreamUrl(
        aramaWebRTC.getUzakStream()?.toURL() ?? null,
      );

      setGelenTeklif(null);
      setHoparlorAcik(Hoparlor.hoparlorDurumu());

      await bildirimiTemizle();

      console.log("YENİ EKRANDAN ARAMA KABUL EDİLDİ");
    } catch (hata) {
      console.error("ARAMA KABUL HATASI:", hata);

      Alert.alert(
        "Arama kabul edilemedi",
        hata instanceof Error
          ? hata.message
          : "Bağlantı kurulamadı.",
      );

      setAramaDurumu("GELEN_ARAMA");
    } finally {
      islemKilidiRef.current = false;
      setIslemDevamEdiyor(false);
    }
  };

  const aramayiSonlandir = async (reddet: boolean) => {
    if (islemKilidiRef.current || sonlandirildiRef.current) {
      return;
    }

    islemKilidiRef.current = true;
    sonlandirildiRef.current = true;
    setIslemDevamEdiyor(true);

    try {
      if (reddet) {
        aramaWebRTC.aramayiReddet();
      }

      // Mevcut servisin temizleme mekanizmasını kullan.
      await aramaWebRTC.aramayiBitir(reddet);

      await bildirimiTemizle();

      setAramaDurumu("SONLANDI");
      ekraniKapat();
    } catch (hata) {
      console.error("ARAMA SONLANDIRMA HATASI:", hata);
      sonlandirildiRef.current = false;
    } finally {
      islemKilidiRef.current = false;
      setIslemDevamEdiyor(false);
    }
  };

  const goruntulu = aramaTuru === "VIDEO";
  const baglandi = aramaDurumu === "BAGLANDI";
  const baglaniyor = aramaDurumu === "BAGLANIYOR";
  const teklifHazir = aramaDurumu === "GELEN_ARAMA" && !!gelenTeklif;

  return (
    <SafeAreaView style={styles.legacyAramaOverlay}>
      <StatusBar barStyle="light-content" backgroundColor="#321126" />

      <View style={styles.legacyHeader}>
        <Text style={styles.legacyBaslik}>
          {goruntulu ? "Görüntülü Arama" : "Sesli Arama"}
        </Text>
        <Text style={styles.legacyKullaniciAdi}>
          {arayanAdi || "Kullanıcı"}
        </Text>
      </View>

      {goruntulu ? (
        <View style={styles.legacyVideoAlani}>
          {baglandi && uzakStreamUrl ? (
            <RTCView
              streamURL={uzakStreamUrl}
              style={styles.legacyUzakVideo}
              objectFit="cover"
              mirror={false}
              zOrder={0}
            />
          ) : (
            <View style={styles.legacyVideoBekleme}>
              <Text style={styles.legacyVideoIkon}>📹</Text>
              <Text style={styles.legacyVideoMetni}>
                {baglaniyor
                  ? "Güvenli bağlantı kuruluyor..."
                  : teklifHazir
                    ? "Gelen görüntülü arama"
                    : "Bağlantı bekleniyor..."}
              </Text>
              {!teklifHazir && !baglandi && (
                <ActivityIndicator color="#FFF9EF" style={{ marginTop: 16 }} />
              )}
            </View>
          )}

          {baglandi && yerelStreamUrl && (
            <RTCView
              streamURL={yerelStreamUrl}
              style={styles.legacyYerelVideo}
              objectFit="cover"
              mirror
              zOrder={1}
            />
          )}
        </View>
      ) : (
        <View style={styles.legacySesliAlan}>
          <View style={styles.legacyAvatar}>
            <Text style={styles.legacyAvatarText}>
              {arayanAdi.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>

          <Text style={styles.legacySesliIsim}>{arayanAdi}</Text>

          <Text style={styles.legacyDurum}>
            {baglandi
              ? "Bağlandı"
              : baglaniyor
                ? "Güvenli bağlantı kuruluyor..."
                : teklifHazir
                  ? "Sizi arıyor..."
                  : aramaDurumu === "SONLANDI"
                    ? "Arama sona erdi"
                    : "Arama hazırlanıyor..."}
          </Text>
        </View>
      )}

      {baglandi ? (
        <View style={styles.legacyKontroller}>
          <Pressable
            style={[
              styles.legacyKontrolButonu,
              hoparlorAcik && styles.legacyKontrolAktif,
            ]}
            onPress={() => {
              const yeniDurum = !hoparlorAcik;
              const basarili = Hoparlor.hoparloruDegistir(yeniDurum);

              if (basarili) {
                setHoparlorAcik(yeniDurum);
              } else {
                console.error("HOPARLÖR DURUMU DEĞİŞTİRİLEMEDİ");
              }
            }}
          >
            <Text style={styles.legacyKontrolIkon}>
              {hoparlorAcik ? "🔊" : "🔈"}
            </Text>
            <Text style={styles.legacyKontrolMetni}>
              {hoparlorAcik ? "Hoparlör" : "Ahize"}
            </Text>
          </Pressable>

          {goruntulu && (
            <>
              <Pressable
                style={[
                  styles.legacyKontrolButonu,
                  !kameraAcik && styles.legacyKontrolAktif,
                ]}
                onPress={() => {
                  const yeniDurum = !kameraAcik;
                  aramaWebRTC.kamerayiDegistir(yeniDurum);
                  setKameraAcik(yeniDurum);
                }}
              >
                <Text style={styles.legacyKontrolIkon}>
                  {kameraAcik ? "📹" : "🚫"}
                </Text>
                <Text style={styles.legacyKontrolMetni}>
                  {kameraAcik ? "Kamera" : "Kapalı"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.legacyKontrolButonu}
                onPress={() => aramaWebRTC.kamerayiCevir()}
              >
                <Text style={styles.legacyKontrolIkon}>🔄</Text>
                <Text style={styles.legacyKontrolMetni}>Çevir</Text>
              </Pressable>
            </>
          )}

          <Pressable
            disabled={islemDevamEdiyor}
            style={[
              styles.legacyKontrolButonu,
              styles.legacyBitirButonu,
            ]}
            onPress={() => void aramayiSonlandir(false)}
          >
            <Text style={styles.legacyKontrolIkon}>✕</Text>
            <Text style={styles.legacyKontrolMetni}>Kapat</Text>
          </Pressable>
        </View>
      ) : baglaniyor ? (
        <View style={styles.legacyBaglantiAlani}>
          <ActivityIndicator color="#FFF9EF" />
          <Text style={styles.legacyBaglantiMetni}>
            Güvenli bağlantı kuruluyor...
          </Text>
        </View>
      ) : (
        <View style={styles.legacyGelenButonlar}>
          <Pressable
            disabled={islemDevamEdiyor}
            style={[
              styles.legacyKontrolButonu,
              styles.legacyReddetButonu,
              islemDevamEdiyor && styles.legacyPasif,
            ]}
            onPress={() => void aramayiSonlandir(true)}
          >
            <Text style={styles.legacyKontrolIkon}>✕</Text>
            <Text style={styles.legacyKontrolMetni}>Reddet</Text>
          </Pressable>

          <Pressable
            disabled={!teklifHazir || islemDevamEdiyor}
            style={[
              styles.legacyKontrolButonu,
              styles.legacyKabulButonu,
              (!teklifHazir || islemDevamEdiyor) && styles.legacyPasif,
            ]}
            onPress={() => void aramayiKabulEt()}
          >
            <Text style={styles.legacyKontrolIkon}>
              {islemDevamEdiyor ? "…" : "✓"}
            </Text>
            <Text style={styles.legacyKontrolMetni}>
              {islemDevamEdiyor ? "Bağlanıyor..." : "Kabul Et"}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101828",
  },
  ustAlan: {
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  uygulamaAdi: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B8C7E0",
    letterSpacing: 3,
  },
  aramaTuru: {
    marginTop: 18,
    fontSize: 17,
    color: "#D0D5DD",
  },
  ortaAlan: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#344054",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#667085",
  },
  avatarYazi: {
    color: "#FFFFFF",
    fontSize: 64,
    fontWeight: "700",
  },
  arayanAdi: {
    marginTop: 28,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  durum: {
    marginTop: 14,
    color: "#D0D5DD",
    fontSize: 16,
    textAlign: "center",
  },
  yukleniyor: {
    marginTop: 22,
  },
  altAlan: {
    paddingHorizontal: 30,
    paddingBottom: 45,
    alignItems: "center",
  },
  butonSatiri: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
  },
  buton: {
    minWidth: 116,
    minHeight: 90,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  reddetButonu: {
    backgroundColor: "#D92D20",
  },
  kabulButonu: {
    backgroundColor: "#12B76A",
  },
  pasifButon: {
    opacity: 0.45,
  },
  butonIkon: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  butonYazi: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 5,
  },
  guvenlikMetni: {
    marginTop: 28,
    color: "#98A2B3",
    fontSize: 13,
  },
  videoAlan: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  uzakVideo: {
    width: "100%",
    height: "100%",
  },
  yerelVideo: {
    position: "absolute",
    width: 105,
    height: 145,
    right: 12,
    top: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  legacyAramaOverlay: {
    flex: 1,
    backgroundColor: "#321126",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: 28,
  },
  legacyHeader: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  legacyBaslik: {
    color: "#FFF9EF",
    fontSize: 15,
    fontWeight: "700",
  },
  legacyKullaniciAdi: {
    color: "#FFF9EF",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 6,
  },
  legacySesliAlan: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  legacyAvatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4B1836",
    borderWidth: 4,
    borderColor: "#D6AD58",
    marginBottom: 22,
  },
  legacyAvatarText: {
    color: "#FFF9EF",
    fontSize: 48,
    fontWeight: "800",
  },
  legacySesliIsim: {
    color: "#FFF9EF",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
  },
  legacyDurum: {
    color: "#E8D7B4",
    fontSize: 15,
    marginTop: 9,
    textAlign: "center",
  },
  legacyVideoAlani: {
    flex: 1,
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
  },
  legacyUzakVideo: {
    width: "100%",
    height: "100%",
  },
  legacyYerelVideo: {
    position: "absolute",
    top: 18,
    right: 15,
    width: 105,
    height: 145,
    borderRadius: 12,
    backgroundColor: "#222222",
    zIndex: 100,
    elevation: 20,
  },
  legacyVideoBekleme: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legacyVideoIkon: {
    fontSize: 45,
    marginBottom: 10,
  },
  legacyVideoMetni: {
    color: "#FFF9EF",
    fontSize: 15,
    textAlign: "center",
  },
  legacyKontroller: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  legacyGelenButonlar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 20,
  },
  legacyKontrolButonu: {
    minWidth: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#654A2B",
    paddingHorizontal: 9,
  },
  legacyKontrolIkon: {
    color: "#FFF9EF",
    fontSize: 22,
  },
  legacyKontrolMetni: {
    color: "#FFF9EF",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "700",
  },
  legacyReddetButonu: {
    backgroundColor: "#E11D48",
  },
  legacyKabulButonu: {
    backgroundColor: "#2E9D55",
  },
  legacyBitirButonu: {
    backgroundColor: "#E11D48",
  },
  legacyKontrolAktif: {
    backgroundColor: "#4B1836",
  },
  legacyPasif: {
    opacity: 0.45,
  },
  legacyBaglantiAlani: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  legacyBaglantiMetni: {
    color: "#FFF9EF",
    fontSize: 13,
    fontWeight: "600",
  },
});
