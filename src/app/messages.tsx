import aramaWebRTC, { AramaMesaji } from "../services/AramaWebRTC";
import {
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { RTCView } from "react-native-webrtc";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
import { router } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import useMessages from "../hooks/useMessages";

import MessagesHeader from "../components/messages/MessagesHeader";

import ConversationList from "../components/messages/ConversationList";

import ConversationPanel from "../components/messages/ConversationPanel";

export default function Messages() {
  /*
   * =========================================================
   * ARAMA DURUM KİLİTLERİ
   * =========================================================
   *
   * Aynı anda birden fazla sesli/görüntülü arama başlatılmasını
   * engeller.
   *
   * Özellikle hızlı çift tıklama veya component yeniden render
   * olduğunda aynı WebSocket Promise'inin birden fazla kez
   * beklenmesini önler.
   */
  const sesliAramaDevamEdiyor = useRef(false);
  const goruntuluAramaDevamEdiyor = useRef(false);

  const [aramaAcik, setAramaAcik] = useState(false);
  const [aramaTuru, setAramaTuru] = useState<"SES" | "VIDEO">("SES");
  const [aramaDurumu, setAramaDurumu] = useState("Aranıyor...");

  /*
   * =========================================================
   * WEBRTC STREAM DURUMLARI
   * =========================================================
   *
   * Arayan tarafın görüntülü arama ekranı Messages içinde
   * açıldığı için yerel ve uzak stream'i burada tutuyoruz.
   */
  const [yerelStreamUrl, setYerelStreamUrl] = useState<string | null>(null);
  const [uzakStreamUrl, setUzakStreamUrl] = useState<string | null>(null);

  // Gelen arama durumu
  const [gelenAramaAcik, setGelenAramaAcik] = useState(false);
  const [gelenAramaMesaji, setGelenAramaMesaji] = useState<Extract<
    AramaMesaji,
    { tip: "CALL_OFFER" }
  > | null>(null);
  const [gelenAramaAdi, setGelenAramaAdi] = useState("Kullanıcı");
  const [gelenAramaTuru, setGelenAramaTuru] = useState<"SES" | "VIDEO">("SES");

  /*
   * =========================================================
   * PREMIUM DURUMU
   * =========================================================
   */

  const [premium, setPremium] = useState<boolean | null>(null);

  const [premiumKontrolHatasi, setPremiumKontrolHatasi] = useState("");

  /*
   * =========================================================
   * API
   * =========================================================
   */

  const API_ADRESI = API_BASE_URL + "/api";
  /*
   * =========================================================
   * MESAJLAR
   * =========================================================
   */

  const {
    users,
    conversation,
    selectedUserId,
    selectedUserName,
    selectedUserActive,
    currentUserId,
    messageMedias,
    loading,
    conversationLoading,
    sending,
    mediaSending,
    recording,
    recordingSeconds,
    mediaMenuOpen,
    messageText,
    error,
    yeniMesajSayisi,
    yaziyor,
    setSelectedUserId,
    handleMessageTextChange,
    handleSendMessage,
    handleDeleteMessage,
    handleMediaButtonClick,
    openMediaPicker,
    startAudioRecording,
    stopAudioRecording,
    getUserDisplayName,
    getUserActive,
    getMediaUrl,
    aramaSinyaliDinle,
    aramaSinyaliGonder,
  } = useMessages();

  /*
   * =========================================================
   * TARİH FORMATLA
   * =========================================================
   */

  const formatDate = (date: string) => {
    if (!date) {
      return "";
    }

    const tarih = new Date(date);

    if (Number.isNaN(tarih.getTime())) {
      return date;
    }

    return tarih.toLocaleString("tr-TR");
  };

  /*
   * =========================================================
   * SESLİ ARAMA
   * =========================================================
   *
   * Arama akışı:
   *
   * 1. Kullanıcı kontrol edilir.
   * 2. AramaWebRTC ayarlanır.
   * 3. aramaBaslat() çağrılır.
   * 4. Mevcut useMessages STOMP bağlantısı kullanılır.
   * 5. WebRTC offer oluşturulur.
   * 6. CALL_OFFER mevcut STOMP bağlantısından gönderilir.
   *
   * DİKKAT:
   *
   * Burada ayrıca:
   *
   * await aramaWebRTC.webSocketBaglantisiAc();
   *
   * çağrılmıyor.
   *
   * Çünkü aramaBaslat() zaten WebSocket bağlantısını
   * kendi içinde yönetiyor.
   *
   * =========================================================
   */

  const handleSesliArama = async () => {
    /*
     * =========================================================
     * ÇİFT TIKLAMA / TEKRARLI ÇAĞRI KONTROLÜ
     * =========================================================
     */
    if (sesliAramaDevamEdiyor.current) {
      console.warn(
        "⚠️ SESLİ ARAMA ZATEN BAŞLATILIYOR. İKİNCİ ÇAĞRI ENGELLENDİ.",
      );
      return;
    }

    /*
     * Kilidi hemen koyuyoruz.
     *
     * Böylece await öncesinde bile ikinci bir çağrı içeri
     * giremez.
     */
    sesliAramaDevamEdiyor.current = true;

    console.log("======================================");
    console.log("📞 SESLİ ARAMA BUTONUNA BASILDI");

    console.log("📞 ARANAN KULLANICI:", {
      selectedUserId,
      selectedUserName,
      currentUserId,
    });

    console.log("======================================");

    setAramaTuru("SES");
    setAramaDurumu("Aranıyor...");
    setYerelStreamUrl(null);
    setUzakStreamUrl(null);
    setAramaAcik(true);

    try {
      /*
       * =====================================================
       * HEDEF KULLANICI KONTROLÜ
       * =====================================================
       */
      if (selectedUserId === null) {
        console.warn("📞 Sesli arama yapılamadı: kullanıcı seçili değil.");
        return;
      }

      /*
       * =====================================================
       * MEVCUT KULLANICI KONTROLÜ
       * =====================================================
       */
      if (currentUserId === null) {
        console.warn(
          "📞 Sesli arama yapılamadı: mevcut kullanıcı ID bulunamadı.",
        );
        return;
      }

      /*
       * =====================================================
       * ID DÖNÜŞÜMÜ
       * =====================================================
       */
      const mevcutKullaniciId = Number(currentUserId);
      const hedefKullaniciId = Number(selectedUserId);

      /*
       * =====================================================
       * ID GEÇERLİLİK KONTROLÜ
       * =====================================================
       */
      if (!Number.isFinite(mevcutKullaniciId)) {
        console.error("❌ Geçersiz mevcut kullanıcı ID:", currentUserId);
        return;
      }

      if (!Number.isFinite(hedefKullaniciId)) {
        console.error("❌ Geçersiz hedef kullanıcı ID:", selectedUserId);
        return;
      }

      /*
       * =====================================================
       * KENDİNİ ARAMA KONTROLÜ
       * =====================================================
       */
      if (mevcutKullaniciId === hedefKullaniciId) {
        console.error("❌ Kullanıcı kendisini arayamaz.");
        return;
      }

      /*
       * =====================================================
       * ARAMA BİLGİLERİ
       * =====================================================
       */
      console.log("📞 SESLİ ARAMA HEDEFİ:", hedefKullaniciId);

      console.log("📞 Mevcut kullanıcı:", mevcutKullaniciId);

      console.log("📞 Aranan kullanıcı:", hedefKullaniciId);

      console.log("📞 Arama türü: SES");

      /*
       * =====================================================
       * WEBRTC AYARLA
       * =====================================================
       */
      await aramaWebRTC.ayarla(mevcutKullaniciId, hedefKullaniciId, "SES");

      console.log("📞 WEBRTC SESLİ ARAMA AYARLANDI");

      /*
       * =====================================================
       * ARAMAYI BAŞLAT
       * =====================================================
       *
       * WebSocket bağlantısını burada ayrıca açmıyoruz.
       *
       * aramaBaslat():
       *
       * - Mevcut STOMP taşıyıcısını kullanır
       * - PeerConnection oluşturur
       * - Mikrofonu açar
       * - Offer oluşturur
       * - CALL_OFFER gönderir
       */
      console.log("🔌 SESLİ ARAMA BAŞLATILIYOR...");

      await aramaWebRTC.aramaBaslat();

      console.log("📞 SESLİ ARAMA BAŞLATILDI");
    } catch (hata) {
      console.error("❌ SESLİ ARAMA BAŞLATMA HATASI:", hata);
      setAramaDurumu("Arama başlatılamadı.");

      /*
       * =====================================================
       * HATA DETAYI
       * =====================================================
       */
      if (hata instanceof Error) {
        console.error("❌ HATA MESAJI:", hata.message);

        console.error("❌ HATA STACK:", hata.stack);
      } else {
        console.error("❌ BİLİNMEYEN HATA:", hata);
      }
    } finally {
      /*
       * =====================================================
       * KİLİDİ AÇ
       * =====================================================
       *
       * WebSocket veya WebRTC işlemi bittiğinde tekrar arama
       * yapılabilmesine izin veriyoruz.
       */
      sesliAramaDevamEdiyor.current = false;

      console.log("🔓 SESLİ ARAMA KİLİDİ AÇILDI");
    }
  };

  /*
   * =========================================================
   * GÖRÜNTÜLÜ ARAMA
   * =========================================================
   *
   * Arama akışı:
   *
   * 1. Kullanıcı kontrol edilir.
   * 2. AramaWebRTC ayarlanır.
   * 3. aramaBaslat() çağrılır.
   * 4. Mevcut useMessages STOMP bağlantısı kullanılır.
   * 5. Kamera + mikrofon açılır.
   * 6. PeerConnection oluşturulur.
   * 7. Offer oluşturulur.
   * 8. CALL_OFFER mevcut STOMP bağlantısından gönderilir.
   *
   * =========================================================
   */

  const handleGoruntuluArama = async () => {
    /*
     * =========================================================
     * ÇİFT TIKLAMA / TEKRARLI ÇAĞRI KONTROLÜ
     * =========================================================
     */
    if (goruntuluAramaDevamEdiyor.current) {
      console.warn(
        "⚠️ GÖRÜNTÜLÜ ARAMA ZATEN BAŞLATILIYOR. İKİNCİ ÇAĞRI ENGELLENDİ.",
      );
      return;
    }

    goruntuluAramaDevamEdiyor.current = true;

    console.log("======================================");
    console.log("📹 GÖRÜNTÜLÜ ARAMA BUTONUNA BASILDI");

    console.log("📹 ARANAN KULLANICI:", {
      selectedUserId,
      selectedUserName,
      currentUserId,
    });

    console.log("======================================");

    setAramaTuru("VIDEO");
    setAramaDurumu("Aranıyor...");
    setYerelStreamUrl(null);
    setUzakStreamUrl(null);
    setAramaAcik(true);

    try {
      /*
       * =====================================================
       * HEDEF KULLANICI KONTROLÜ
       * =====================================================
       */
      if (selectedUserId === null) {
        console.warn("📹 Görüntülü arama yapılamadı: kullanıcı seçili değil.");
        return;
      }

      /*
       * =====================================================
       * MEVCUT KULLANICI KONTROLÜ
       * =====================================================
       */
      if (currentUserId === null) {
        console.warn(
          "📹 Görüntülü arama yapılamadı: mevcut kullanıcı ID bulunamadı.",
        );
        return;
      }

      /*
       * =====================================================
       * ID DÖNÜŞÜMÜ
       * =====================================================
       */
      const mevcutKullaniciId = Number(currentUserId);
      const hedefKullaniciId = Number(selectedUserId);

      /*
       * =====================================================
       * ID GEÇERLİLİK KONTROLÜ
       * =====================================================
       */
      if (!Number.isFinite(mevcutKullaniciId)) {
        console.error("❌ Geçersiz mevcut kullanıcı ID:", currentUserId);
        return;
      }

      if (!Number.isFinite(hedefKullaniciId)) {
        console.error("❌ Geçersiz hedef kullanıcı ID:", selectedUserId);
        return;
      }

      /*
       * =====================================================
       * KENDİNİ ARAMA KONTROLÜ
       * =====================================================
       */
      if (mevcutKullaniciId === hedefKullaniciId) {
        console.error("❌ Kullanıcı kendisini arayamaz.");
        return;
      }

      /*
       * =====================================================
       * ARAMA BİLGİLERİ
       * =====================================================
       */
      console.log("📹 GÖRÜNTÜLÜ ARAMA HEDEFİ:", hedefKullaniciId);

      console.log("📞 Mevcut kullanıcı:", mevcutKullaniciId);

      console.log("📞 Aranan kullanıcı:", hedefKullaniciId);

      console.log("📞 Arama türü: VIDEO");

      /*
       * =====================================================
       * WEBRTC AYARLA
       * =====================================================
       */
      await aramaWebRTC.ayarla(mevcutKullaniciId, hedefKullaniciId, "VIDEO");

      console.log("📞 WEBRTC GÖRÜNTÜLÜ ARAMA AYARLANDI");

      /*
       * =====================================================
       * ARAMAYI BAŞLAT
       * =====================================================
       */
      console.log("🔌 GÖRÜNTÜLÜ ARAMA BAŞLATILIYOR...");

      await aramaWebRTC.aramaBaslat();

      console.log("📹 GÖRÜNTÜLÜ ARAMA BAŞLATILDI");
    } catch (hata) {
      console.error("❌ GÖRÜNTÜLÜ ARAMA BAŞLATMA HATASI:", hata);
      setAramaDurumu("Arama başlatılamadı.");

      /*
       * =====================================================
       * HATA DETAYI
       * =====================================================
       */
      if (hata instanceof Error) {
        console.error("❌ HATA MESAJI:", hata.message);

        console.error("❌ HATA STACK:", hata.stack);
      } else {
        console.error("❌ BİLİNMEYEN HATA:", hata);
      }
      setTimeout(() => setAramaAcik(false), 2000);
    } finally {
      goruntuluAramaDevamEdiyor.current = false;

      console.log("🔓 GÖRÜNTÜLÜ ARAMA KİLİDİ AÇILDI");
    }
  };

  /*
   * =========================================================
   * GELEN ARAMA DİNLEYİCİSİ
   * =========================================================
   *
   * Kullanıcı mesajlar ekranındayken sürekli arama topic'ini
   * dinler. Böylece karşı taraf CALL_OFFER gönderdiğinde
   * gelen arama ekranı açılır.
   */
  useEffect(() => {
    if (currentUserId === null) {
      return;
    }

    const kullaniciId = Number(currentUserId);

    if (!Number.isFinite(kullaniciId)) {
      console.error("❌ GELEN ARAMA: Geçersiz kullanıcı ID:", currentUserId);
      return;
    }

    console.log("======================================");
    console.log("📞 GELEN ARAMA DİNLEYİCİSİ BAŞLATILIYOR");
    console.log("📞 Kullanıcı ID:", kullaniciId);
    console.log("📞 Topic:", `/topic/arama/${kullaniciId}`);
    console.log("======================================");

    aramaWebRTC.olayDinle("teklif", (mesaj) => {
      console.log("======================================");
      console.log("📞📞📞 GELEN ARAMA VAR 📞📞📞");
      console.log("📞 Arayan ID:", mesaj.arayanId);
      console.log("📞 Aranan ID:", mesaj.arananId);
      console.log("📞 Arama türü:", mesaj.aramaTuru);
      console.log("======================================");

      setGelenAramaMesaji(mesaj);
      setGelenAramaTuru(mesaj.aramaTuru);

      // getUserDisplayName'in gerçek imzası ID kabul etmiyorsa
      // arama ekranının açılmasını yine de engellememek için
      // güvenli fallback kullanıyoruz.
      let isim = `Kullanıcı ${mesaj.arayanId}`;

      try {
        const bulunanIsim = getUserDisplayName(mesaj.arayanId);

        if (bulunanIsim) {
          isim = bulunanIsim;
        }
      } catch (hata) {
        console.warn(
          "⚠️ Arayan kullanıcı adı alınamadı, fallback kullanılacak:",
          hata,
        );
      }

      setGelenAramaAdi(isim);
      setGelenAramaAcik(true);
    });

    aramaWebRTC.olayDinle("cevap", async (mesaj) => {
      try {
        await aramaWebRTC.cevabiIsle(mesaj.cevap);
        console.log("🟢 CALL_ANSWER İŞLENDİ");
      } catch (hata) {
        console.error("❌ CALL_ANSWER İŞLEME HATASI:", hata);
      }
    });

    aramaWebRTC.olayDinle("reddet", () => {
      console.log("📵 KARŞI TARAF ARAMAYI REDDETTİ");
      setAramaDurumu("Arama reddedildi.");
      setTimeout(() => {
        setAramaAcik(false);
        setAramaDurumu("Aranıyor...");
      }, 800);

      setGelenAramaAcik(false);
      setGelenAramaMesaji(null);
    });

    aramaWebRTC.olayDinle("bitir", () => {
      console.log("📞 KARŞI TARAF ARAMAYI BİTİRDİ");
      setAramaAcik(false);
      setGelenAramaAcik(false);
      setGelenAramaMesaji(null);
      setYerelStreamUrl(null);
      setUzakStreamUrl(null);
    });

    aramaWebRTC.olayDinle("baglandi", () => {
      console.log("🟢 WEBRTC ARAMA BAĞLANDI");

      const yerel = aramaWebRTC.getYerelStream();
      const uzak = aramaWebRTC.getUzakStream();

      if (yerel) {
        setYerelStreamUrl(yerel.toURL());
      }

      if (uzak) {
        setUzakStreamUrl(uzak.toURL());
      }

      setAramaDurumu("Bağlandı");
    });

    aramaWebRTC.olayDinle("uzakStream", (stream) => {
      console.log("🎥 UZAK STREAM GELDİ");

      try {
        setUzakStreamUrl(stream.toURL());
      } catch (hata) {
        console.error("❌ UZAK STREAM URL OLUŞTURULAMADI:", hata);
      }
    });

    aramaWebRTC.olayDinle("baglantiKoptu", () => {
      console.log("🔴 WEBRTC ARAMA BAĞLANTISI KOPTU");
      setAramaAcik(false);
      setGelenAramaAcik(false);
      setGelenAramaMesaji(null);
      setYerelStreamUrl(null);
      setUzakStreamUrl(null);
    });

    aramaWebRTC.olayDinle("hata", (hata) => {
      console.error("❌ ARAMA WEBRTC HATASI:", hata);
    });

    /*
     * =========================================================
     * TEK STOMP BAĞLANTISI
     * =========================================================
     *
     * useMessages zaten /topic/arama/{kullaniciId}
     * topic'ine abone oluyor.
     *
     * İkinci bir STOMP bağlantısı açılmıyor.
     */
    aramaWebRTC.sinyalGondericiyiAyarla((sinyal) => {
      const gonderildi = aramaSinyaliGonder(sinyal);

      if (!gonderildi) {
        throw new Error(
          "Arama sinyali gönderilemedi. Mevcut STOMP bağlantısı hazır değil.",
        );
      }
    });

    const aramaDinlemeyiBirak = aramaSinyaliDinle((body) => {
      console.log("📨📨📨 useMessages ARAMA SİNYALİ ALDI");
      aramaWebRTC.gelenAramaSinyaliniIsle(body);
    });

    return () => {
      console.log(
        "🧹 GELEN ARAMA DİNLEYİCİSİ TEMİZLENİYOR. Kullanıcı:",
        kullaniciId,
      );

      aramaDinlemeyiBirak();
      aramaWebRTC.sinyalGondericiyiAyarla(null);
    };
  }, [
    currentUserId,
    getUserDisplayName,
    aramaSinyaliDinle,
    aramaSinyaliGonder,
  ]);

  /*
   * =========================================================
   * GELEN ARAMAYI REDDET
   * =========================================================
   */
  const gelenAramayiReddet = () => {
    console.log("📵 GELEN ARAMA REDDEDİLİYOR");

    try {
      aramaWebRTC.aramayiReddet();
    } catch (hata) {
      console.error("❌ GELEN ARAMA REDDETME HATASI:", hata);
    }

    setGelenAramaAcik(false);
    setGelenAramaMesaji(null);
  };

  /*
   * =========================================================
   * GELEN ARAMAYI KABUL ET
   * =========================================================
   */
  const gelenAramayiKabulEt = async () => {
    if (!gelenAramaMesaji) {
      console.error("❌ Kabul edilecek gelen arama bulunamadı.");
      return;
    }

    console.log("======================================");
    console.log("✅ GELEN ARAMA KABUL EDİLİYOR");
    console.log("📞 Arayan ID:", gelenAramaMesaji.arayanId);
    console.log("📞 Arama türü:", gelenAramaMesaji.aramaTuru);
    console.log("======================================");

    try {
      setGelenAramaAcik(false);

      await aramaWebRTC.teklifiKabulEt(gelenAramaMesaji.teklif);

      setGelenAramaMesaji(null);

      console.log("🟢 GELEN ARAMA KABUL EDİLDİ");
    } catch (hata) {
      console.error("❌ GELEN ARAMA KABUL HATASI:", hata);

      setGelenAramaAcik(false);
      setGelenAramaMesaji(null);
    }
  };

  /*
   * =========================================================
   * WEBRTC STREAM SENKRONİZASYONU
   * =========================================================
   *
   * Native WebRTC tarafında stream bazı cihazlarda event ile
   * callback'e gelmeden hemen önce hazır olabildiği için,
   * arama açıkken kısa aralıklarla tekrar kontrol ediyoruz.
   * Bu yalnızca UI state senkronizasyonudur; yeni WebRTC
   * bağlantısı oluşturmaz.
   */
  useEffect(() => {
    if (!aramaAcik || aramaTuru !== "VIDEO") {
      return;
    }

    const streamleriGuncelle = () => {
      try {
        const yerel = aramaWebRTC.getYerelStream();
        const uzak = aramaWebRTC.getUzakStream();

        if (yerel) {
          const url = yerel.toURL();

          setYerelStreamUrl((onceki) => (onceki === url ? onceki : url));
        }

        if (uzak) {
          const url = uzak.toURL();

          setUzakStreamUrl((onceki) => (onceki === url ? onceki : url));
        }
      } catch (hata) {
        console.error("❌ WEBRTC STREAM DURUMU OKUNAMADI:", hata);
      }
    };

    streamleriGuncelle();

    const zamanlayici = setInterval(streamleriGuncelle, 500);

    return () => {
      clearInterval(zamanlayici);
    };
  }, [aramaAcik, aramaTuru]);

  /*
   * =========================================================
   * PREMIUM KONTROLÜ
   * =========================================================
   */

  useEffect(() => {
    let aktif = true;

    const premiumKontrolEt = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        console.log("PREMIUM KONTROL TOKEN VAR MI:", !!token);

        if (!token) {
          console.log("PREMIUM KONTROL: TOKEN YOK");

          if (aktif) {
            setPremium(false);
          }

          return;
        }

        const premiumUrl = `${API_ADRESI}/memberships/me/premium`;

        console.log("PREMIUM KONTROL URL:", premiumUrl);

        const cevap = await fetch(premiumUrl, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        console.log("PREMIUM STATUS:", cevap.status);

        const sonuc = await cevap.json();

        console.log("PREMIUM BODY:", sonuc);

        if (!cevap.ok) {
          throw new Error(`Premium durumu alınamadı. HTTP ${cevap.status}`);
        }

        if (aktif) {
          setPremium(Boolean(sonuc));
        }
      } catch (hata) {
        console.error("PREMIUM KONTROL HATASI:", hata);

        if (aktif) {
          setPremiumKontrolHatasi("Premium üyelik durumu kontrol edilemedi.");

          setPremium(false);
        }
      }
    };

    void premiumKontrolEt();

    return () => {
      aktif = false;
    };
  }, []);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading || premium === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5b3cc4" />

          <Text style={styles.loadingText}>
            {loading
              ? "Mesajlar yükleniyor..."
              : "Premium üyelik kontrol ediliyor..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * PREMIUM DEĞİLSE
   * =========================================================
   */

  if (!premium) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.premiumContainer}>
          <Text style={styles.lockIcon}>🔒</Text>

          <Text style={styles.premiumTitle}>Premium Üyelik Gerekli</Text>

          <Text style={styles.premiumDescription}>
            Mesajları okuyabilmek ve mesaj göndermek için aktif PREMIUM
            üyeliğiniz bulunmalıdır.
          </Text>

          {premiumKontrolHatasi ? (
            <Text style={styles.premiumError}>{premiumKontrolHatasi}</Text>
          ) : null}

          <Pressable
            style={styles.premiumButton}
            onPress={() => router.push("/premium")}
          >
            <Text style={styles.premiumButtonText}>⭐ Premium Ol</Text>
          </Pressable>

          <Pressable
            style={styles.homeButton}
            onPress={() => router.replace("/home")}
          >
            <Text style={styles.homeButtonText}>← Ana Sayfa</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * KONUŞMA SEÇİLMEDİ
   * =========================================================
   */

  const konusmaSecilmedi = selectedUserId === null;

  /*
   * =========================================================
   * PREMIUM KULLANICI
   * =========================================================
   */

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* =====================================================
          GELEN ARAMA MODALI
      ===================================================== */}
      <Modal
        visible={gelenAramaAcik}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={gelenAramayiReddet}
      >
        <View style={styles.gelenAramaOverlay}>
          <View style={styles.gelenAramaKutusu}>
            <Text style={styles.gelenAramaIkon}>
              {gelenAramaTuru === "SES" ? "📞" : "📹"}
            </Text>

            <Text style={styles.gelenAramaBaslik}>{gelenAramaAdi}</Text>

            <Text style={styles.gelenAramaAltBaslik}>
              {gelenAramaTuru === "SES"
                ? "Gelen sesli arama"
                : "Gelen görüntülü arama"}
            </Text>

            <View style={styles.gelenAramaButonlar}>
              <Pressable
                style={styles.reddetButton}
                onPress={gelenAramayiReddet}
              >
                <Text style={styles.reddetButtonText}>❌ Reddet</Text>
              </Pressable>

              <Pressable
                style={styles.kabulEtButton}
                onPress={() => {
                  void gelenAramayiKabulEt();
                }}
              >
                <Text style={styles.kabulEtButtonText}>✅ Kabul Et</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          GİDEN ARAMA MODALI
      ===================================================== */}
      <Modal
        visible={aramaAcik}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          void aramaWebRTC.aramayiBitir();
          setAramaAcik(false);
          setYerelStreamUrl(null);
          setUzakStreamUrl(null);
        }}
      >
        <View style={styles.aramaOverlay}>
          <View style={styles.aramaKutusu}>
            <Text style={styles.aramaIkon}>
              {aramaTuru === "SES" ? "📞" : "📹"}
            </Text>

            <Text style={styles.aramaBaslik}>
              {selectedUserName || "Kullanıcı"} aranıyor...
            </Text>

            {aramaTuru === "VIDEO" ? (
              <View style={styles.gidenGoruntuluAramaAlani}>
                {uzakStreamUrl ? (
                  <RTCView
                    streamURL={uzakStreamUrl}
                    style={styles.gidenUzakVideo}
                    objectFit="cover"
                    mirror={false}
                  />
                ) : (
                  <View style={styles.gidenVideoBekleme}>
                    <Text style={styles.gidenVideoBeklemeIkon}>📹</Text>
                    <Text style={styles.gidenVideoBeklemeMetni}>
                      {aramaDurumu === "Bağlandı"
                        ? "Karşı tarafın görüntüsü bekleniyor..."
                        : "Görüntülü arama bağlanıyor..."}
                    </Text>
                  </View>
                )}

                {yerelStreamUrl ? (
                  <RTCView
                    streamURL={yerelStreamUrl}
                    style={styles.gidenYerelVideo}
                    objectFit="cover"
                    mirror
                  />
                ) : null}
              </View>
            ) : (
              <View style={styles.sesliAramaDurumAlani}>
                <Text style={styles.aramaDurum}>{aramaDurumu}</Text>
              </View>
            )}

            <Text
              style={[
                styles.aramaDurum,
                aramaTuru === "VIDEO" && styles.videoAramaDurum,
              ]}
            >
              {aramaDurumu}
            </Text>

            <Pressable
              style={styles.aramaKapatButton}
              onPress={() => {
                console.log("❌ ARAMA KAPATILDI");
                void aramaWebRTC.aramayiBitir();
                setAramaAcik(false);
                setYerelStreamUrl(null);
                setUzakStreamUrl(null);
                setAramaDurumu("Aranıyor...");
              }}
            >
              <Text style={styles.aramaKapatText}>❌ Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "android" ? "padding" : "padding"}
        keyboardVerticalOffset={0}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <MessagesHeader
          selectedUserId={selectedUserId}
          selectedUserName={selectedUserName}
          selectedUserActive={selectedUserActive}
          yeniMesajSayisi={yeniMesajSayisi}
          onBack={() => router.replace("/home")}
        />

        {/* =================================================
            HATA
        ================================================= */}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* =================================================
            MOBİL KONUŞMALAR
        ================================================= */}

        {konusmaSecilmedi ? (
          <View style={styles.fullScreenList}>
            <View style={styles.listTitleContainer}>
              <Text style={styles.listTitle}>Konuşmalar</Text>

              {users.length > 0 ? (
                <Text style={styles.listCount}>{users.length} konuşma</Text>
              ) : null}
            </View>

            <View style={styles.listContainer}>
              <ConversationList
                users={users}
                selectedUserId={selectedUserId}
                onSelectUser={setSelectedUserId}
                getUserDisplayName={getUserDisplayName}
                getUserActive={getUserActive}
              />
            </View>
          </View>
        ) : (
          /*
           * =================================================
           * MOBİL KONUŞMA PANELİ
           * =================================================
           */

          <View style={styles.fullScreenPanel}>
            {/* =================================================
                KONUŞMALARA GERİ DÖN
            ================================================= */}

            <Pressable
              style={styles.conversationsBackButton}
              onPress={() => setSelectedUserId(null)}
            >
              <Text style={styles.conversationsBackIcon}>←</Text>

              <Text style={styles.conversationsBackText}>Konuşmalar</Text>
            </Pressable>

            {/* =================================================
                AKTİF KONUŞMA
            ================================================= */}

            <View style={styles.panelContainer}>
              <ConversationPanel
                selectedUserId={selectedUserId}
                selectedUserName={selectedUserName}
                selectedUserActive={selectedUserActive}
                conversation={conversation}
                conversationLoading={conversationLoading}
                currentUserId={currentUserId}
                yaziyor={yaziyor}
                messageText={messageText}
                sending={sending}
                mediaSending={mediaSending}
                recording={recording}
                recordingSeconds={recordingSeconds}
                mediaMenuOpen={mediaMenuOpen}
                messageMedias={messageMedias}
                formatDate={formatDate}
                onMessageTextChange={handleMessageTextChange}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onMediaButtonClick={handleMediaButtonClick}
                onOpenMediaPicker={openMediaPicker}
                onStartRecording={startAudioRecording}
                onStopRecording={stopAudioRecording}
                getMediaUrl={getMediaUrl}
                /*
                 * =================================================
                 * SESLİ ARAMA
                 * =================================================
                 */

                onSesliArama={handleSesliArama}
                /*
                 * =================================================
                 * GÖRÜNTÜLÜ ARAMA
                 * =================================================
                 */

                onGoruntuluArama={handleGoruntuluArama}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  /*
   * =======================================================
   * SAFE AREA
   * =======================================================
   */

  safeArea: {
    flex: 1,
    backgroundColor: "#faf9ff",
  },

  /*
   * =======================================================
   * ANA CONTAINER
   * =======================================================
   */

  container: {
    flex: 1,
    backgroundColor: "#faf9ff",
  },

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    backgroundColor: "#faf9ff",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#5b3cc4",
    fontWeight: "600",
    textAlign: "center",
  },

  /*
   * =======================================================
   * HATA
   * =======================================================
   */

  errorBox: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  errorText: {
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 19,
  },

  /*
   * =======================================================
   * MOBİL KONUŞMA LİSTESİ
   * =======================================================
   */

  fullScreenList: {
    flex: 1,
    backgroundColor: "#faf9ff",
  },

  listTitleContainer: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeaff",
  },

  listTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#5b3cc4",
  },

  listCount: {
    fontSize: 13,
    color: "#777777",
    fontWeight: "600",
  },

  listContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  /*
   * =======================================================
   * MOBİL KONUŞMA PANELİ
   * =======================================================
   */

  fullScreenPanel: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  conversationsBackButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeaff",
  },

  conversationsBackIcon: {
    fontSize: 25,
    color: "#5b3cc4",
    marginRight: 8,
    fontWeight: "700",
  },

  conversationsBackText: {
    fontSize: 15,
    color: "#5b3cc4",
    fontWeight: "700",
  },

  panelContainer: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#ffffff",
  },

  /*
   * =======================================================
   * ARAMA EKRANI
   * =======================================================
   */

  gelenAramaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  gelenAramaKutusu: {
    width: "100%",
    maxWidth: 380,
    minHeight: 330,
    backgroundColor: "#ffffff",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 35,
  },

  gelenAramaIkon: {
    fontSize: 65,
    marginBottom: 20,
  },

  gelenAramaBaslik: {
    fontSize: 25,
    fontWeight: "800",
    color: "#222222",
    textAlign: "center",
    marginBottom: 10,
  },

  gelenAramaAltBaslik: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 35,
  },

  gelenAramaButonlar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
  },

  reddetButton: {
    flex: 1,
    maxWidth: 150,
    paddingVertical: 15,
    borderRadius: 28,
    backgroundColor: "#d32f2f",
    alignItems: "center",
    justifyContent: "center",
  },

  reddetButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  kabulEtButton: {
    flex: 1,
    maxWidth: 150,
    paddingVertical: 15,
    borderRadius: 28,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },

  kabulEtButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  aramaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  aramaKutusu: {
    width: "100%",
    maxWidth: 420,
    minHeight: 310,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  gidenGoruntuluAramaAlani: {
    width: "100%",
    height: 390,
    marginTop: 8,
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#000000",
    position: "relative",
  },

  gidenUzakVideo: {
    width: "100%",
    height: "100%",
  },

  gidenYerelVideo: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 105,
    height: 145,
    borderRadius: 12,
    backgroundColor: "#222222",
  },

  gidenVideoBekleme: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  gidenVideoBeklemeIkon: {
    fontSize: 42,
    marginBottom: 10,
  },

  gidenVideoBeklemeMetni: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
  },

  sesliAramaDurumAlani: {
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  videoAramaDurum: {
    marginTop: 2,
  },

  aramaIkon: {
    fontSize: 58,
    marginBottom: 22,
  },

  aramaBaslik: {
    fontSize: 23,
    fontWeight: "800",
    color: "#222222",
    textAlign: "center",
    marginBottom: 12,
  },

  aramaDurum: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  aramaKapatButton: {
    minWidth: 155,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: "#d32f2f",
    alignItems: "center",
    justifyContent: "center",
  },

  aramaKapatText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  homeButton: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#5b3cc4",
  },

  homeButtonText: {
    color: "#5b3cc4",
    fontSize: 13,
    fontWeight: "700",
  },
  premiumContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#ffffff",
  },

  lockIcon: {
    fontSize: 52,
    marginBottom: 18,
  },

  premiumTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222222",
    textAlign: "center",
    marginBottom: 12,
  },

  premiumDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
    textAlign: "center",
    marginBottom: 15,
  },

  premiumError: {
    fontSize: 14,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 15,
  },

  premiumButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: "#5b3cc4",
    alignItems: "center",
    justifyContent: "center",
  },

  premiumButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
