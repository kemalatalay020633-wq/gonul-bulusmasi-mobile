import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhoneCall, Video as VideoIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as RNFS from "react-native-fs";
import Video from "react-native-video";

import { RTCView } from "react-native-webrtc";
import aramaWebRTC, { type AramaTuru } from "../../services/AramaWebRTC";

import type { MessageDto } from "../../types/message";
import type { MessageMediaDto } from "../../types/messageMedia";

import { Hoparlor } from "../../services/Hoparlor";
import MessageInput from "./MessageInput";

type MediaType = "image" | "video" | "audio" | "file";

type RTCSessionDescriptionInit = {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
};

type AramaDurumu = "YOK" | "ARAMA_YAPILIYOR" | "GELEN_ARAMA" | "BAGLANDI";

type ConversationPanelProps = {
  conversation: MessageDto[];

  selectedUserId: number | null;

  currentUserId: number | null;

  selectedUserName: string;

  selectedUserActive: boolean | null;

  yaziyor: boolean;

  conversationLoading: boolean;

  messageMedias: Record<number, MessageMediaDto[]>;

  formatDate: (date: string) => string;

  getMediaUrl: (mediaUrl: string) => string;

  messageText: string;

  sending: boolean;

  mediaSending: boolean;

  recording: boolean;

  recordingSeconds: number;

  mediaMenuOpen: boolean;

  onMessageTextChange: (value: string) => void;

  onSendMessage: () => void;

  onDeleteMessage: (messageId: number) => void;

  onMediaButtonClick: () => void;

  onOpenMediaPicker: (type: MediaType) => void;

  onStartRecording: () => void;

  onStopRecording: () => void;

  onSesliArama: () => void;

  onGoruntuluArama: () => void;

  aramaIzniAktif: boolean;

  aramaIzniYukleniyor: boolean;

  onAramaIzniDegistir: () => void;
};

type VideoPlayerModalProps = {
  uri: string | null;

  visible: boolean;

  onClose: () => void;
};

function VideoPlayerModal({ uri, visible, onClose }: VideoPlayerModalProps) {
  if (!uri) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <VideoPlayerContent uri={uri} onClose={onClose} />
    </Modal>
  );
}

function VideoPlayerContent({
  uri,
  onClose,
}: {
  uri: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.videoModalContainer}>
      <Pressable style={styles.videoCloseButton} onPress={onClose}>
        <Text style={styles.videoCloseButtonText}>✕</Text>
      </Pressable>

      <Video
        source={{
          uri: uri,
        }}
        style={styles.videoPlayer}
        resizeMode="contain"
        controls={true}
        paused={false}
        repeat={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        onError={(error) => {
          console.error("❌ VİDEO OYNATMA HATASI:", error);
        }}
      />
    </View>
  );
}

function ConversationPanel({
  conversation,

  selectedUserId,

  currentUserId,

  selectedUserName,

  selectedUserActive,

  yaziyor,

  conversationLoading,

  messageMedias,

  formatDate,

  getMediaUrl,

  messageText,

  sending,

  mediaSending,

  recording,

  recordingSeconds,

  mediaMenuOpen,

  onMessageTextChange,

  onSendMessage,

  onDeleteMessage,

  onMediaButtonClick,

  onOpenMediaPicker,

  onStartRecording,

  onStopRecording,

  onSesliArama,

  onGoruntuluArama,

  aramaIzniAktif,

  aramaIzniYukleniyor,

  onAramaIzniDegistir,
}: ConversationPanelProps) {
  const listeRef = useRef<FlatList<MessageDto>>(null);

  const [videoOynatmaUri, setVideoOynatmaUri] = useState<string | null>(null);

  /*
   * ============================================================
   * WEBRTC ARAMA DURUMU
   * ============================================================
   */

  const [aramaGorunur, setAramaGorunur] = useState(false);
  const [aramaTuru, setAramaTuru] = useState<AramaTuru>("SES");
  const [aramaDurumu, setAramaDurumu] = useState<AramaDurumu>("YOK");
  const [aramaArayanId, setAramaArayanId] = useState<number | null>(null);
  const [gelenTeklif, setGelenTeklif] =
    useState<RTCSessionDescriptionInit | null>(null);
  const [yerelStreamUrl, setYerelStreamUrl] = useState<string | null>(null);
  const [uzakStreamUrl, setUzakStreamUrl] = useState<string | null>(null);
  const [aramaSuresi, setAramaSuresi] = useState(0);
  const [hoparlorAcik, setHoparlorAcik] = useState(false);
  const [aramaSonuMesaji, setAramaSonuMesaji] = useState("");
  const [aramaSonuGorunur, setAramaSonuGorunur] = useState(false);
  const aramaSonuZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const aramaSonlandirmaRef = useRef(false);
  const uzakStreamKontrolRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const aramaListenerTemizleyicilerRef = useRef<Array<() => void>>([]);

  /*
   * ============================================================
   * WEBRTC ARAMA YÖNETİMİ
   * ============================================================
   */

  const aramaAkisiniGuncelle = useCallback(() => {
    const yerel = aramaWebRTC.getYerelStream();
    const uzak = aramaWebRTC.getUzakStream();

    if (yerel) {
      try {
        const url = yerel.toURL();

        if (url) {
          setYerelStreamUrl(url);
        }
      } catch (error) {
        console.error("❌ YEREL STREAM GÜNCELLEME HATASI:", error);
      }
    }

    if (uzak) {
      try {
        const url = uzak.toURL();

        if (url) {
          setUzakStreamUrl(url);
        }
      } catch (error) {
        console.error("❌ UZAK STREAM GÜNCELLEME HATASI:", error);
      }
    }
  }, []);

  const yerelStreamiGoster = useCallback(() => {
    try {
      const yerel = aramaWebRTC.getYerelStream();

      if (!yerel) {
        console.log("🎥 YEREL STREAM HENÜZ HAZIR DEĞİL");
        return;
      }

      const url = yerel.toURL();
      console.log("🎥 YEREL STREAM URL:", url);

      if (url) {
        setYerelStreamUrl(url);
      }
    } catch (error) {
      console.error("❌ YEREL STREAM GÖSTERME HATASI:", error);
    }
  }, []);

  const aramaTemizle = useCallback(async () => {
    console.log("🧹 ARAMA TEMİZLE BAŞLADI");

    // Kapat butonuna basıldığında karşı tarafa açıkça CALL_END gönder.
    // Ekranı kapatma işlemi sinyal gönderimi hata verse bile çalışmalı.
    aramaSonlandirmaRef.current = true;

    if (aramaSonuZamanlayiciRef.current) {
      clearTimeout(aramaSonuZamanlayiciRef.current);
      aramaSonuZamanlayiciRef.current = null;
    }

    if (uzakStreamKontrolRef.current) {
      clearInterval(uzakStreamKontrolRef.current);
      uzakStreamKontrolRef.current = null;
    }

    try {
      console.log("📴 Kapat butonu: karşı tarafa CALL_END gönderiliyor...");
      await aramaWebRTC.aramayiBitir(false);
      console.log("✅ CALL_END gönderildi, WebRTC temizlendi");
    } catch (error) {
      console.error("❌ CALL_END / ARAMA KAPATMA HATASI:", error);
    } finally {
      setAramaSonuGorunur(false);
      setAramaSonuMesaji("");
      setAramaGorunur(false);
      setAramaDurumu("YOK");
      setAramaArayanId(null);
      setGelenTeklif(null);
      setYerelStreamUrl(null);
      setUzakStreamUrl(null);
      setAramaSuresi(0);
      setHoparlorAcik(false);
      console.log("🧹 ARAMA EKRANI KAPATILDI");
    }
  }, []);

  const aramaSonlandirmayiGoster = useCallback((mesaj: string) => {
    // UI her durumda kapanmalı. Kilit yalnızca WebRTC cleanup işleminin
    // tekrar çalışmasını engeller; ekranın kapanmasını engellememelidir.
    const zatenSonlandiriliyor = aramaSonlandirmaRef.current;
    aramaSonlandirmaRef.current = true;

    console.log("📴 ARAMA SONLANDI:", mesaj);

    setAramaSonuGorunur(false);
    setAramaSonuMesaji(mesaj);
    setAramaGorunur(false);
    setAramaDurumu("YOK");
    setGelenTeklif(null);
    setAramaArayanId(null);
    setYerelStreamUrl(null);
    setUzakStreamUrl(null);
    setAramaSuresi(0);
    setHoparlorAcik(false);

    if (zatenSonlandiriliyor) {
      console.log("⛔ WebRTC zaten temizleniyor; yalnızca UI kapatıldı.");
      return;
    }

    void aramaWebRTC.aramayiBitir(true).catch((hata) => {
      console.error("❌ KARŞI TARAF SONLANDIRMA TEMİZLİĞİ HATASI:", hata);
    });
  }, []);
  const aramaOlaylariniKur = useCallback(() => {
    // ConversationPanel kendi listener'larını yönetir.
    // Singleton AramaWebRTC üzerindeki diğer listener'lara dokunulmaz.
    aramaListenerTemizleyicilerRef.current.forEach((temizle) => {
      try {
        temizle();
      } catch (hata) {
        console.warn("⚠️ WEBRTC LISTENER TEMİZLEME HATASI:", hata);
      }
    });
    aramaListenerTemizleyicilerRef.current = [];

    console.log("======================================");
    console.log("📞 WEBRTC EVENT LISTENER'LARI KURULUYOR");
    console.log("📞 Kullanıcı:", currentUserId);
    console.log("📞 Karşı kullanıcı:", selectedUserId);
    console.log("======================================");

    /*
     * ============================================================
     * GELEN TEKLİF
     * ============================================================
     */

    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("teklif", (mesaj) => {
        console.log("======================================");
        console.log("📲 GELEN ARAMA EVENT");
        console.log("📲 Mesaj:", mesaj);
        console.log("======================================");

        if (currentUserId === null) {
          console.error("❌ currentUserId NULL");
          return;
        }

        // Önceki aramadan kalan UI kilidini yeni arama için sıfırla.
        aramaSonlandirmaRef.current = false;

        console.log("🔓 Yeni gelen arama için sonlandırma kilidi sıfırlandı.");

        // Gelen aramanın WebRTC oturum bilgilerini ayarla.
        aramaWebRTC.ayarla(currentUserId, mesaj.arayanId, mesaj.aramaTuru);

        setAramaTuru(mesaj.aramaTuru);
        setHoparlorAcik(mesaj.aramaTuru === "VIDEO");
        setAramaArayanId(mesaj.arayanId);
        setGelenTeklif(mesaj.teklif);
        setAramaDurumu("GELEN_ARAMA");
        setAramaGorunur(true);

        console.log("✅ Gelen arama ekranı açıldı.");
        console.log("📞 Arayan kullanıcı:", mesaj.arayanId);
        console.log("📞 Arama türü:", mesaj.aramaTuru);
      }),
    );

    /*
     * ============================================================
     * CEVAP
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("cevap", async (mesaj) => {
        console.log("======================================");
        console.log("📞 CEVAP EVENT GELDİ");
        console.log("📞 Mesaj:", mesaj);
        console.log("======================================");

        try {
          await aramaWebRTC.cevabiIsle(mesaj.cevap);

          console.log("📞 CEVAP BAŞARIYLA İŞLENDİ");

          yerelStreamiGoster();
          aramaAkisiniGuncelle();

          setAramaDurumu("BAGLANDI");

          console.log("🟢 ARAMA DURUMU: BAGLANDI");
        } catch (error) {
          console.error("❌ ARAMA CEVAP İŞLEME HATASI:", error);
        }
      }),
    );

    /*
     * ============================================================
     * ICE
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("ice", (mesaj) => {
        console.log("🧊 GELEN ICE CALLBACK:", mesaj.aday);
      }),
    );

    /*
     * ============================================================
     * REDDET
     * ============================================================
     *
     * BURASI KRİTİK.
     *
     * Karşı taraf reddettiğinde burası çalışmalı.
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("reddet", () => {
        console.log("======================================");
        console.log("🚨🚨🚨 REDDET CALLBACK GELDİ 🚨🚨🚨");
        console.log("🚨 KARŞI TARAF ARAMAYI REDDETTİ");
        console.log("🚨 ARAYAN TARAF UI SONLANDIRILIYOR");
        console.log("======================================");

        void aramaSonlandirmayiGoster(`${selectedUserName} aramayı reddetti.`);
      }),
    );

    /*
     * ============================================================
     * KARŞI TARAF ÇAĞRIYI BİTİRDİ
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("bitir", () => {
        console.log("======================================");
        console.log("📴 BITIR CALLBACK GELDİ");
        console.log("📴 KARŞI TARAF ARAMAYI SONLANDIRDI");
        console.log("======================================");

        void aramaSonlandirmayiGoster("Karşı taraf görüşmeyi sonlandırdı.");
      }),
    );

    /*
     * ============================================================
     * UZAK STREAM
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("uzakStream", (stream) => {
        console.log("🎥 UZAK STREAM EVENT GELDİ");

        try {
          const url = stream.toURL();

          console.log("🎥 UZAK STREAM URL:", url);

          if (url) {
            setUzakStreamUrl(url);

            if (!aramaSonlandirmaRef.current) {
              setAramaGorunur(true);
            }
          }
        } catch (error) {
          console.error("❌ UZAK STREAM URL HATASI:", error);
        }
      }),
    );

    /*
     * ============================================================
     * BAĞLANDI
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("baglandi", () => {
        console.log("======================================");
        console.log("🟢 BAGLANDI CALLBACK GELDİ");
        console.log("======================================");

        /*
         * Eğer çağrı sonlandırılıyorsa modal tekrar açılmasın.
         */
        if (aramaSonlandirmaRef.current) {
          console.log(
            "⛔ ARAMA SONLANDIRMA BEKLENİYOR, MODAL YENİDEN AÇILMIYOR",
          );
          return;
        }

        setAramaGorunur(true);

        const yerel = aramaWebRTC.getYerelStream();
        const uzak = aramaWebRTC.getUzakStream();

        console.log("🎥 BAĞLANTI SONRASI STREAM DURUMU:", {
          yerelVar: !!yerel,
          uzakVar: !!uzak,
        });

        if (yerel) {
          try {
            const url = yerel.toURL();

            console.log("🎥 BAĞLANTI SONRASI YEREL URL:", url);

            setYerelStreamUrl(url);
          } catch (error) {
            console.error("❌ YEREL STREAM URL HATASI:", error);
          }
        }

        if (uzak) {
          try {
            const url = uzak.toURL();

            console.log("🎥 BAĞLANTI SONRASI UZAK URL:", url);

            setUzakStreamUrl(url);
          } catch (error) {
            console.error("❌ UZAK STREAM URL HATASI:", error);
          }
        }

        setAramaDurumu("BAGLANDI");
      }),
    );

    /*
     * ============================================================
     * BAĞLANTI KOPTU
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("baglantiKoptu", () => {
        console.log("======================================");
        console.log("🔴 BAĞLANTI KOPTU CALLBACK GELDİ");
        console.log("======================================");

        /*
         * Eğer zaten reddetme/bitirme callback'i çalıştıysa
         * onun UI akışını bozma.
         */
        if (aramaSonlandirmaRef.current) {
          console.log(
            "⛔ SONLANDIRMA DEVAM EDİYOR, BAGLANTI_KOPTU UI'YA MÜDAHALE ETMİYOR",
          );
          return;
        }

        setAramaDurumu("YOK");
        setYerelStreamUrl(null);
        setUzakStreamUrl(null);
      }),
    );

    /*
     * ============================================================
     * HATA
     * ============================================================
     */
    aramaListenerTemizleyicilerRef.current.push(
      aramaWebRTC.olayDinle("hata", (hata) => {
        console.error("======================================");
        console.error("❌ WEBRTC HATA CALLBACK");
        console.error("❌ HATA:", hata);
        console.error("======================================");

        Alert.alert("Arama hatası", hata.message);

        void aramaTemizle();
      }),
    );

    console.log("======================================");
    console.log("✅ WEBRTC EVENT LISTENER'LARI KURULDU");
    console.log("======================================");
  }, [
    aramaAkisiniGuncelle,
    aramaSonlandirmayiGoster,
    aramaTemizle,
    currentUserId,
    selectedUserId,
    selectedUserName,
    yerelStreamiGoster,
  ]);

  useEffect(() => {
    if (currentUserId === null || selectedUserId === null) {
      return;
    }

    console.log("======================================");
    console.log("📞 CONVERSATION PANEL ARAMA HAZIRLIĞI");
    console.log("📞 Mevcut kullanıcı:", currentUserId);
    console.log("📞 Seçili kullanıcı:", selectedUserId);
    console.log("======================================");

    aramaWebRTC.ayarla(currentUserId, selectedUserId, "SES");

    aramaOlaylariniKur();

    return () => {
      console.log("🧹 ARAMA OLAYLARI TEMİZLENİYOR");

      aramaListenerTemizleyicilerRef.current.forEach((temizle) => {
        try {
          temizle();
        } catch (hata) {
          console.warn("⚠️ WEBRTC LISTENER TEMİZLEME HATASI:", hata);
        }
      });

      aramaListenerTemizleyicilerRef.current = [];
    };
  }, [currentUserId, selectedUserId, aramaOlaylariniKur]);
  useEffect(() => {
    if (!aramaGorunur) {
      return;
    }

    uzakStreamKontrolRef.current = setInterval(() => {
      aramaAkisiniGuncelle();
    }, 500);

    return () => {
      if (uzakStreamKontrolRef.current) {
        clearInterval(uzakStreamKontrolRef.current);
        uzakStreamKontrolRef.current = null;
      }
    };
  }, [aramaGorunur, aramaAkisiniGuncelle]);

  useEffect(() => {
    if (aramaDurumu !== "BAGLANDI") {
      setAramaSuresi(0);
      return;
    }

    const zamanlayici = setInterval(() => {
      setAramaSuresi((sure) => sure + 1);
    }, 1000);

    return () => clearInterval(zamanlayici);
  }, [aramaDurumu]);

  useEffect(() => {
    return () => {
      if (aramaSonuZamanlayiciRef.current) {
        clearTimeout(aramaSonuZamanlayiciRef.current);
        aramaSonuZamanlayiciRef.current = null;
      }
    };
  }, []);

  const aramaBaslat = async (tur: AramaTuru) => {
    if (currentUserId === null || selectedUserId === null) {
      Alert.alert("Arama yapılamadı", "Önce bir kullanıcı seçmelisiniz.");
      return;
    }

    try {
      if (!aramaIzniAktif) {
        Alert.alert("Arama yapılamadı", "Karşı taraf arama izni vermemiş.");
        return;
      }

      // Önceki görüşmeden kalan sonlandırma kilidini yeni çağrı için sıfırla.
      aramaSonlandirmaRef.current = false;
      setAramaTuru(tur);
      setHoparlorAcik(tur === "VIDEO");
      setAramaDurumu("ARAMA_YAPILIYOR");
      setAramaGorunur(true);
      setAramaArayanId(currentUserId);

      aramaWebRTC.ayarla(currentUserId, selectedUserId, tur);

      await aramaWebRTC.aramaBaslat();

      // Arayan tarafın kendi kamera görüntüsünü hemen ekrana al.
      yerelStreamiGoster();
      aramaAkisiniGuncelle();
    } catch (error) {
      console.error("ARAMA BAŞLATMA HATASI:", error);
      Alert.alert(
        "Arama başlatılamadı",
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
      );
      await aramaTemizle();
    }
  };

  const gelenAramayiKabulEt = async () => {
    if (
      aramaArayanId === null ||
      gelenTeklif === null ||
      currentUserId === null
    ) {
      return;
    }

    try {
      // Önceki görüşmeden kalan kilit gelen çağrının kabulünü engellemesin.
      aramaSonlandirmaRef.current = false;
      aramaWebRTC.ayarla(currentUserId, aramaArayanId, aramaTuru);

      setHoparlorAcik(aramaTuru === "VIDEO");
      setAramaDurumu("ARAMA_YAPILIYOR");

      await aramaWebRTC.teklifiKabulEt(gelenTeklif);

      // Aranan tarafın kendi kamera görüntüsünü de garanti et.
      yerelStreamiGoster();
      setGelenTeklif(null);
      aramaAkisiniGuncelle();
    } catch (error) {
      console.error("GELEN ARAMA KABUL HATASI:", error);
      Alert.alert(
        "Arama kabul edilemedi",
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
      );
      await aramaTemizle();
    }
  };

  const gelenAramayiReddet = async () => {
    if (aramaSonlandirmaRef.current) {
      console.log("⛔ Arama zaten sonlandırılıyor.");
      return;
    }

    console.log("📵 GELEN ARAMA REDDEDİLİYOR");

    // Geç gelen WebRTC olaylarının ekranı yeniden açmasını engelle.
    aramaSonlandirmaRef.current = true;

    // Önce kullanıcı arayüzünü hemen kapat.
    setGelenTeklif(null);
    setAramaGorunur(false);
    setAramaSonuGorunur(false);
    setAramaSonuMesaji("");
    setAramaDurumu("YOK");
    setAramaArayanId(null);
    setYerelStreamUrl(null);
    setUzakStreamUrl(null);
    setAramaSuresi(0);
    setHoparlorAcik(false);

    try {
      // Reddetme sinyalini gönder.
      aramaWebRTC.aramayiReddet();

      // CALL_END göndermeden yerel WebRTC kaynaklarını temizle.
      await aramaWebRTC.aramayiBitir(true);

      console.log("✅ Arama reddedildi ve kaynaklar temizlendi");
    } catch (hata) {
      console.error("❌ GELEN ARAMA REDDETME HATASI:", hata);
    }
  };
  const aramaSuresiniFormatla = (toplamSaniye: number) => {
    const dakika = Math.floor(toplamSaniye / 60);
    const saniye = toplamSaniye % 60;

    return `${String(dakika).padStart(2, "0")}:${String(saniye).padStart(2, "0")}`;
  };

  /*
   * ============================================================
   * MEDYA YÖNETİMİ
   * ============================================================
   */

  const [medyaYerelUrl, setMedyaYerelUrl] = useState<Record<number, string>>(
    {},
  );

  const medyaIndiriliyorRef = useRef<Set<number>>(new Set());

  const medyaKuyrukRef = useRef<MessageMediaDto[]>([]);

  const aktifMedyaIndirmeRef = useRef(0);

  const gorunenMesajIdleriRef = useRef<Set<number>>(new Set());

  const [gorunenMesajVersion, setGorunenMesajVersion] = useState(0);

  const MAX_ESZAMANLI_MEDYA = 2;

  /*
   * ============================================================
   * KULLANICI DEĞİŞİNCE MEDYAYI TEMİZLE
   * ============================================================
   */

  useEffect(() => {
    setMedyaYerelUrl({});

    medyaIndiriliyorRef.current.clear();

    medyaKuyrukRef.current = [];

    gorunenMesajIdleriRef.current.clear();
  }, [selectedUserId]);

  /*
   * ============================================================
   * KONUŞMA AÇILINCA EN ALTA KAYDIR
   * ============================================================
   */

  useEffect(() => {
    if (selectedUserId === null || conversationLoading) {
      return;
    }

    const zamanlayici = setTimeout(() => {
      listeRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);

    return () => clearTimeout(zamanlayici);
  }, [selectedUserId, conversation.length, conversationLoading]);

  /*
   * ============================================================
   * MEDYA AÇ
   * ============================================================
   */

  const medyaAc = async (media: MessageMediaDto) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Oturum gerekli",
          "Medya açmak için tekrar giriş yapmanız gerekiyor.",
        );

        return;
      }

      const url = getMediaUrl(media.mediaUrl);

      console.log("MEDYA AUTHENTICATED OPEN BAŞLADI:", {
        mediaId: media.id,
        fileName: media.fileName,
        mimeType: media.mimeType,
        url,
      });

      /*
       * Korunan medya URL'si doğrudan
       * Linking.openURL ile açılırsa Authorization
       * header gitmez.
       *
       * Önce JWT ile indiriyoruz.
       */

      const response = await fetch(url, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,

          Accept: "*/*",
        },
      });

      console.log("MEDYA AUTHENTICATED OPEN SONUCU:", {
        mediaId: media.id,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");

        console.error("MEDYA AUTHENTICATED OPEN HATASI:", {
          mediaId: media.id,
          status: response.status,
          response: responseText,
        });

        if (response.status === 401) {
          Alert.alert(
            "Oturum süresi doldu",
            "Medya için yetkilendirme başarısız oldu. Lütfen tekrar giriş yapın.",
          );
        } else if (response.status === 403) {
          Alert.alert(
            "Erişim reddedildi",
            "Bu medyaya erişim izniniz bulunmuyor.",
          );
        } else if (response.status === 404) {
          Alert.alert(
            "Medya bulunamadı",
            "Bu medya dosyası sunucuda bulunamadı.",
          );
        } else {
          Alert.alert(
            "Medya açılamadı",
            `Sunucu ${response.status} kodu döndürdü.`,
          );
        }

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size <= 0) {
        console.error("MEDYA BOŞ GELDİ:", media.id);

        Alert.alert("Hata", "Medya dosyası boş geldi.");

        return;
      }

      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const result = reader.result;

          if (typeof result !== "string" || !result.startsWith("data:")) {
            console.error("MEDYA DATA URI OLUŞTURULAMADI:", media.id);

            Alert.alert("Hata", "Medya dosyası hazırlanamadı.");

            return;
          }

          const base64 = result.split(",")[1];

          if (!base64) {
            console.error("MEDYA BASE64 VERİSİ OLUŞTURULAMADI:", media.id);

            Alert.alert("Hata", "Medya verisi hazırlanamadı.");

            return;
          }

          let uzanti = "";

          if (media.fileName && media.fileName.includes(".")) {
            uzanti = media.fileName.substring(media.fileName.lastIndexOf("."));
          }

          if (!uzanti && media.mimeType) {
            const mimeUzantilari: Record<string, string> = {
              "video/mp4": ".mp4",

              "video/webm": ".webm",

              "video/quicktime": ".mov",

              "video/x-msvideo": ".avi",

              "audio/mpeg": ".mp3",

              "audio/mp3": ".mp3",

              "audio/wav": ".wav",

              "audio/ogg": ".ogg",

              "audio/webm": ".webm",

              "audio/mp4": ".m4a",

              "audio/x-m4a": ".m4a",

              "image/jpeg": ".jpg",

              "image/png": ".png",

              "image/webp": ".webp",

              "image/gif": ".gif",
            };

            uzanti = mimeUzantilari[media.mimeType] || "";
          }

          if (!uzanti) {
            uzanti = ".bin";
          }

          const temizDosyaAdi = (media.fileName || `medya_${media.id}${uzanti}`)
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/\.+/g, ".");

          const dosyaAdi = temizDosyaAdi.includes(".")
            ? temizDosyaAdi
            : `medya_${media.id}${uzanti}`;

          const cacheDirectory = RNFS.CachesDirectoryPath;

          if (!cacheDirectory) {
            console.error("CACHE DIRECTORY BULUNAMADI:", media.id);

            Alert.alert("Hata", "Cihazın geçici dosya alanı bulunamadı.");

            return;
          }

          const dosyaYolu = `${cacheDirectory}/${Date.now()}_${dosyaAdi}`;
          const dosyaUri = `file://${dosyaYolu}`;

          await RNFS.writeFile(dosyaYolu, base64, "base64");

          console.log("MEDYA LOCAL DOSYAYA YAZILDI:", {
            mediaId: media.id,
            fileName: dosyaAdi,
            localUri: dosyaUri,
            size: blob.size,
          });

          /*
           * ====================================================
           * VİDEO
           * ====================================================
           */

          if (media.type === "VIDEO" || media.mimeType?.startsWith("video/")) {
            console.log("MEDYA VİDEO UYGULAMA İÇİNDE AÇILIYOR:", {
              mediaId: media.id,

              fileName: dosyaAdi,

              localUri: dosyaUri,

              mimeType: media.mimeType || "video/mp4",
            });

            setVideoOynatmaUri(dosyaUri);

            return;
          }

          /*
           * ====================================================
           * DİĞER DOSYALAR
           * ====================================================
           */

          console.log("MEDYA LOCAL DOSYA URI HAZIR:", {
            mediaId: media.id,

            fileName: dosyaAdi,

            localUri: dosyaUri,

            mimeType: media.mimeType || "application/octet-stream",
          });

          Alert.alert(
            "Dosya hazır",
            "Bu medya türü için Android dış uygulama açma desteği ayrıca yapılandırılabilir.",
          );
        } catch (error) {
          console.error("MEDYA LOCAL DOSYA HATASI:", {
            mediaId: media.id,

            error,
          });

          Alert.alert("Hata", "Medya cihazda açılırken bir hata oluştu.");
        }
      };

      reader.onerror = (error) => {
        console.error("MEDYA FILEREADER HATASI:", {
          mediaId: media.id,

          error,
        });

        Alert.alert("Hata", "Medya okunamadı.");
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("MEDYA AUTHENTICATED OPEN EXCEPTION:", {
        mediaId: media.id,

        error,
      });

      Alert.alert("Hata", "Medya açılırken bir hata oluştu.");
    }
  };

  /*
   * ============================================================
   * TEK MEDYA İNDİR
   * ============================================================
   */

  const medyaIndirTek = useCallback(
    async (media: MessageMediaDto) => {
      if (medyaYerelUrl[media.id]) {
        return;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        return;
      }

      medyaIndiriliyorRef.current.add(media.id);

      aktifMedyaIndirmeRef.current += 1;

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          console.error("MEDYA İNDİRİLEMEDİ: TOKEN YOK:", media.id);

          return;
        }

        const url = getMediaUrl(media.mediaUrl);

        console.log("MEDYA AUTHENTICATED DOWNLOAD BAŞLADI:", {
          mediaId: media.id,

          fileName: media.fileName,

          url,
        });

        const response = await fetch(url, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,

            Accept: "image/*",
          },
        });

        console.log("MEDYA AUTHENTICATED DOWNLOAD SONUCU:", {
          mediaId: media.id,

          status: response.status,

          ok: response.ok,
        });

        if (!response.ok) {
          const responseText = await response.text().catch(() => "");

          console.error("MEDYA İNDİRME HATASI:", {
            mediaId: media.id,

            status: response.status,

            response: responseText,
          });

          return;
        }

        const blob = await response.blob();

        if (!blob || blob.size <= 0) {
          console.error("MEDYA BOŞ GELDİ:", media.id);

          return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result;

          if (typeof result !== "string" || !result.startsWith("data:")) {
            console.error("MEDYA DATA URI OLUŞTURULAMADI:", media.id);

            return;
          }

          setMedyaYerelUrl((previous) => ({
            ...previous,

            [media.id]: result,
          }));

          console.log("MEDYA BAŞARIYLA LOCAL URI'YE ÇEVRİLDİ:", {
            mediaId: media.id,

            fileName: media.fileName,

            size: blob.size,
          });
        };

        reader.onerror = (error) => {
          console.error("MEDYA FILEREADER HATASI:", media.id, error);
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("MEDYA AUTHENTICATED DOWNLOAD EXCEPTION:", {
          mediaId: media.id,

          error,
        });
      } finally {
        medyaIndiriliyorRef.current.delete(media.id);

        aktifMedyaIndirmeRef.current = Math.max(
          0,
          aktifMedyaIndirmeRef.current - 1,
        );

        void medyaKuyrugunuCalistir();
      }
    },
    [getMediaUrl, medyaYerelUrl],
  );

  /*
   * ============================================================
   * MEDYA KUYRUĞU
   * ============================================================
   */

  const medyaKuyrugunuCalistir = useCallback(async () => {
    while (
      aktifMedyaIndirmeRef.current < MAX_ESZAMANLI_MEDYA &&
      medyaKuyrukRef.current.length > 0
    ) {
      const media = medyaKuyrukRef.current.shift();

      if (!media) {
        return;
      }

      if (medyaYerelUrl[media.id]) {
        continue;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        continue;
      }

      void medyaIndirTek(media);
    }
  }, [medyaIndirTek, medyaYerelUrl]);

  /*
   * ============================================================
   * MEDYA İNDİRMEYİ PLANLA
   * ============================================================
   */

  const medyaIndirmeyiPlanla = useCallback(
    (media: MessageMediaDto) => {
      const resimMi =
        media.type === "IMAGE" || media.mimeType?.startsWith("image/");

      if (!resimMi) {
        return;
      }

      if (medyaYerelUrl[media.id]) {
        return;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        return;
      }

      if (medyaKuyrukRef.current.some((item) => item.id === media.id)) {
        return;
      }

      medyaKuyrukRef.current.push(media);

      void medyaKuyrugunuCalistir();
    },
    [medyaKuyrugunuCalistir, medyaYerelUrl],
  );

  /*
   * ============================================================
   * GÖRÜNEN MESAJLARIN MEDYALARINI YÜKLE
   * ============================================================
   */

  const gorunenMesajlariMedyaIcinYukle = useCallback(() => {
    if (gorunenMesajIdleriRef.current.size === 0) {
      return;
    }

    const gorunenMesajIdleri = gorunenMesajIdleriRef.current;

    for (const mesajId of gorunenMesajIdleri) {
      const medyalar = messageMedias[mesajId] || [];

      for (const media of medyalar) {
        medyaIndirmeyiPlanla(media);
      }
    }
  }, [messageMedias, medyaIndirmeyiPlanla]);

  useEffect(() => {
    gorunenMesajlariMedyaIcinYukle();
  }, [gorunenMesajVersion, gorunenMesajlariMedyaIcinYukle]);

  /*
   * ============================================================
   * MEDYA RENDER
   * ============================================================
   */

  const renderMedia = (media: MessageMediaDto) => {
    const url = getMediaUrl(media.mediaUrl);

    console.log("🔥 YENİ MEDYA KODU ÇALIŞIYOR 🔥", media.fileName);

    /*
     * ========================================================
     * RESİM
     * ========================================================
     */

    if (media.type === "IMAGE" || media.mimeType?.startsWith("image/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.imageContainer}
          onPress={() => medyaAc(media)}
        >
          {medyaYerelUrl[media.id] ? (
            <Image
              key={`${media.id}-${medyaYerelUrl[media.id]}`}
              source={{
                uri: medyaYerelUrl[media.id],
              }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => {
                console.log(
                  "MEDYA GÖRSELİ BAŞARIYLA EKRANA BASILDI:",
                  media.fileName,
                );
              }}
              onError={(error) => {
                console.error("LOCAL MEDYA GÖRSEL HATASI:", {
                  dosya: media.fileName,

                  mediaId: media.id,

                  hata: error.nativeEvent,
                });
              }}
            />
          ) : (
            <View style={styles.imageLoadingContainer}>
              <Text style={styles.imageLoadingText}>
                Fotoğraf yükleniyor...
              </Text>
            </View>
          )}
        </Pressable>
      );
    }

    /*
     * ========================================================
     * VİDEO
     * ========================================================
     */

    if (media.type === "VIDEO" || media.mimeType?.startsWith("video/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaCard}
          onPress={() => medyaAc(media)}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>🎬</Text>
          </View>

          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle}>Video</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Videoyu aç"}
            </Text>
          </View>

          <Text style={styles.mediaOpenIcon}>▶</Text>
        </Pressable>
      );
    }

    /*
     * ========================================================
     * SES
     * ========================================================
     */

    if (media.type === "AUDIO" || media.mimeType?.startsWith("audio/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaCard}
          onPress={() => medyaAc(media)}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>🎵</Text>
          </View>

          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle}>Ses</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Ses dosyasını aç"}
            </Text>
          </View>

          <Text style={styles.mediaOpenIcon}>▶</Text>
        </Pressable>
      );
    }

    /*
     * ========================================================
     * DOSYA
     * ========================================================
     */

    return (
      <Pressable
        key={media.id}
        style={styles.mediaCard}
        onPress={() => medyaAc(media)}
      >
        <View style={styles.mediaIconContainer}>
          <Text style={styles.mediaIcon}>📎</Text>
        </View>

        <View style={styles.mediaInfo}>
          <Text style={styles.mediaTitle}>Dosya</Text>

          <Text style={styles.mediaFileName} numberOfLines={1}>
            {media.fileName || "Dosyayı aç"}
          </Text>
        </View>

        <Text style={styles.mediaOpenIcon}>↗</Text>
      </Pressable>
    );
  };

  /*
   * ============================================================
   * GÖRÜNEN MESAJ DEĞİŞTİ
   * ============================================================
   */

  const gorunenMesajDegisti = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{
        item: MessageDto;
      }>;

      changed: Array<{
        item: MessageDto;
      }>;
    }) => {
      const yeniIdler = new Set<number>();

      for (const kayit of viewableItems) {
        if (kayit.item?.id !== undefined && kayit.item?.id !== null) {
          yeniIdler.add(Number(kayit.item.id));
        }
      }

      gorunenMesajIdleriRef.current = yeniIdler;

      setGorunenMesajVersion((value) => value + 1);
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  /*
   * ============================================================
   * MESAJ RENDER
   * ============================================================
   */

  const renderMessage = ({ item }: { item: MessageDto }) => {
    const kendiMesaji =
      currentUserId !== null && Number(item.senderId) === Number(currentUserId);

    const medias = messageMedias[item.id] || [];

    const gonderenAdi = kendiMesaji ? "Siz" : selectedUserName;

    return (
      <View
        style={[
          styles.messageRow,

          kendiMesaji ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        <View style={styles.messageWrapper}>
          <View
            style={[
              styles.messageBubble,

              kendiMesaji
                ? styles.messageBubbleMine
                : styles.messageBubbleOther,
            ]}
          >
            {item.content ? (
              <Text
                style={[
                  styles.messageContent,

                  kendiMesaji
                    ? styles.messageContentMine
                    : styles.messageContentOther,
                ]}
              >
                {item.content}
              </Text>
            ) : null}

            {medias.length > 0 && (
              <View
                style={[
                  styles.mediaList,

                  item.content ? styles.mediaWithText : styles.mediaWithoutText,
                ]}
              >
                {medias.map((media) => renderMedia(media))}
              </View>
            )}

            <View style={styles.messageMeta}>
              <Text
                style={[
                  styles.messageTime,

                  kendiMesaji
                    ? styles.messageTimeMine
                    : styles.messageTimeOther,
                ]}
              >
                {(() => {
                  const tarih = new Date(item.sentAt);
                  return Number.isNaN(tarih.getTime())
                    ? formatDate(item.sentAt)
                    : tarih.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                })()}
              </Text>

              {kendiMesaji && (
                <>
                  <Text
                    style={[
                      styles.readStatus,

                      item.read
                        ? styles.readStatusRead
                        : styles.readStatusUnread,
                    ]}
                  >
                    {item.read ? "✓✓" : "✓"}
                  </Text>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        "Mesajı Sil",

                        "Bu mesajı silmek istediğinize emin misiniz?",

                        [
                          {
                            text: "Vazgeç",

                            style: "cancel",
                          },

                          {
                            text: "Sil",

                            style: "destructive",

                            onPress: () => onDeleteMessage(Number(item.id)),
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  /*
   * ============================================================
   * KONUŞMA SEÇİLİ DEĞİL
   * ============================================================
   */

  if (selectedUserId === null) {
    return (
      <View style={styles.emptyPanel}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyAvatar}>
            <Text style={styles.emptyAvatarText}>💬</Text>
          </View>

          <Text style={styles.emptyTitle}>Bir konuşma seçin</Text>

          <Text style={styles.emptyText}>
            Mesajlaşmaya başlamak için konuşma listesinden bir kullanıcı seçin.
          </Text>
        </View>
      </View>
    );
  }

  /*
   * ============================================================
   * ANA EKRAN
   * ============================================================
   */

  return (
    <>
      <View style={styles.container}>
        {/* =====================================================
            KONUŞMA HEADER
        ===================================================== */}

        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {selectedUserName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {selectedUserName || "Kullanıcı"}
            </Text>

            {selectedUserActive !== null && (
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,

                    selectedUserActive ? styles.activeDot : styles.inactiveDot,
                  ]}
                />

                <Text
                  style={[
                    styles.statusText,

                    selectedUserActive
                      ? styles.activeText
                      : styles.inactiveText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedUserActive ? "Çevrimiçi" : "Çevrimdışı"}
                </Text>
              </View>
            )}

            {yaziyor && (
              <Text style={styles.typingText} numberOfLines={1}>
                {selectedUserName} yazıyor...
              </Text>
            )}
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.ustAramaButonu}
              onPress={() => void aramaBaslat("VIDEO")}
              accessibilityLabel="Görüntülü ara"
            >
              <VideoIcon size={23} color="#E53935" strokeWidth={2} />
            </Pressable>
            <Pressable
              style={styles.ustAramaButonu}
              onPress={() => void aramaBaslat("SES")}
              accessibilityLabel="Sesli ara"
            >
              <PhoneCall size={23} color="#852B49" strokeWidth={2} />
            </Pressable>
            <Pressable
              style={[
                styles.aramaIzniButonu,
                aramaIzniAktif
                  ? styles.aramaIzniButonuAktif
                  : styles.aramaIzniButonuPasif,
                aramaIzniYukleniyor && styles.aramaIzniButonuDevreDisi,
              ]}
              onPress={onAramaIzniDegistir}
              disabled={aramaIzniYukleniyor}
            >
              <Text style={styles.aramaIzniButonuIkon}>
                {aramaIzniAktif ? "📵" : "📞"}
              </Text>

              <Text style={styles.aramaIzniButonuMetni} numberOfLines={1}>
                {aramaIzniYukleniyor
                  ? "Kontrol..."
                  : aramaIzniAktif
                    ? "İzni Geri Al"
                    : "Arama İzni Ver"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* =====================================================
            MESAJLAR
        ===================================================== */}

        <View style={styles.messageArea}>
          {conversationLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Konuşma yükleniyor...</Text>
            </View>
          ) : conversation.length === 0 ? (
            <View style={styles.noMessageContainer}>
              <View style={styles.noMessageIcon}>
                <Text style={styles.noMessageIconText}>💬</Text>
              </View>

              <Text style={styles.noMessageTitle}>Henüz mesaj yok.</Text>

              <Text style={styles.noMessageText}>İlk mesajı gönderin.</Text>
            </View>
          ) : (
            <FlatList
              ref={listeRef}
              data={conversation}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMessage}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={40}
              onViewableItemsChanged={gorunenMesajDegisti}
              viewabilityConfig={viewabilityConfig}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messageListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                if (!conversationLoading && conversation.length > 0) {
                  requestAnimationFrame(() => {
                    listeRef.current?.scrollToEnd({
                      animated: false,
                    });
                  });
                }
              }}
            />
          )}
        </View>

        {/* =====================================================
            MESAJ INPUT + ARAMA BUTONLARI
        ===================================================== */}

        <View style={styles.inputContainer}>
          {/* ===================================================
              ARAMA BUTONLARI
          =================================================== */}

          {/* ===================================================
              MESAJ INPUT
          =================================================== */}

          <View style={styles.mesajInputAlani}>
            <MessageInput
              messageText={messageText}
              sending={sending}
              mediaSending={mediaSending}
              recording={recording}
              recordingSeconds={recordingSeconds}
              mediaMenuOpen={mediaMenuOpen}
              onMessageTextChange={onMessageTextChange}
              onSendMessage={onSendMessage}
              onMediaButtonClick={onMediaButtonClick}
              onOpenMediaPicker={onOpenMediaPicker}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
            />
          </View>
        </View>
      </View>

      {/* =======================================================
          WEBRTC ARAMA OVERLAY
          Yeni sayfa açılmaz; mevcut mesaj ekranının üzerinde çalışır.
      ======================================================= */}

      <Modal
        visible={aramaGorunur}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          void aramaTemizle();
        }}
      >
        <View style={styles.aramaOverlay}>
          <View style={styles.aramaHeader}>
            <Text style={styles.aramaBaslik}>
              {aramaTuru === "VIDEO" ? "Görüntülü Arama" : "Sesli Arama"}
            </Text>
            <Text style={styles.aramaKullaniciAdi}>
              {selectedUserName || "Kullanıcı"}
            </Text>
          </View>

          {aramaTuru === "VIDEO" ? (
            <View style={styles.goruntuluAramaAlani}>
              {uzakStreamUrl ? (
                <RTCView
                  streamURL={uzakStreamUrl}
                  style={styles.uzakVideo}
                  objectFit="cover"
                  mirror={false}
                  zOrder={0}
                />
              ) : (
                <View style={styles.videoBeklemeAlani}>
                  <Text style={styles.videoBeklemeIkon}>📹</Text>
                  <Text style={styles.videoBeklemeMetni}>
                    {aramaDurumu === "GELEN_ARAMA"
                      ? "Gelen görüntülü arama"
                      : "Bağlantı bekleniyor..."}
                  </Text>
                </View>
              )}

              {yerelStreamUrl && (
                <RTCView
                  streamURL={yerelStreamUrl}
                  style={styles.yerelVideo}
                  objectFit="cover"
                  mirror
                  zOrder={1}
                />
              )}
            </View>
          ) : (
            <View style={styles.sesliAramaAlani}>
              <View style={styles.aramaAvatar}>
                <Text style={styles.aramaAvatarText}>
                  {selectedUserName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>

              <Text style={styles.sesliAramaIsmi}>
                {selectedUserName || "Kullanıcı"}
              </Text>

              <Text style={styles.aramaDurumMetni}>
                {aramaDurumu === "BAGLANDI"
                  ? aramaSuresiniFormatla(aramaSuresi)
                  : aramaDurumu === "GELEN_ARAMA"
                    ? "Sizi arıyor..."
                    : "Aranıyor..."}
              </Text>
            </View>
          )}

          {aramaDurumu === "GELEN_ARAMA" ? (
            <View style={styles.gelenAramaButonlari}>
              <Pressable
                style={[styles.aramaKontrolButonu, styles.aramaReddetButonu]}
                onPress={gelenAramayiReddet}
              >
                <Text style={styles.aramaKontrolIkon}>✕</Text>
                <Text style={styles.aramaKontrolMetni}>Reddet</Text>
              </Pressable>

              <Pressable
                style={[styles.aramaKontrolButonu, styles.aramaKabulButonu]}
                onPress={() => void gelenAramayiKabulEt()}
              >
                <Text style={styles.aramaKontrolIkon}>✓</Text>
                <Text style={styles.aramaKontrolMetni}>Kabul Et2</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.aramaKontrolleri}>
              <Pressable
                style={[
                  styles.aramaKontrolButonu,
                  hoparlorAcik && styles.aramaKontrolButonuAktif,
                ]}
                onPress={() => {
                  const yeniDurum = !hoparlorAcik;

                  try {
                    const basarili = Hoparlor.hoparloruDegistir(yeniDurum);

                    if (basarili) {
                      setHoparlorAcik(yeniDurum);
                      console.log(
                        yeniDurum
                          ? "🔊 Hoparlör açıldı."
                          : "🔈 Ahizeye geçildi.",
                      );
                    } else {
                      console.error(
                        "❌ Hoparlör durumu değiştirilemedi. Aktif ses oturumu yok.",
                      );
                    }
                  } catch (error) {
                    console.error("❌ Hoparlör değiştirilemedi:", error);
                  }
                }}
              >
                <Text style={styles.aramaKontrolIkon}>
                  {hoparlorAcik ? "🔊" : "🔈"}
                </Text>
                <Text style={styles.aramaKontrolMetni}>
                  {hoparlorAcik ? "Hoparlör" : "Ahize"}
                </Text>
              </Pressable>

              {aramaTuru === "VIDEO" && (
                <>
                  <Pressable
                    style={styles.aramaKontrolButonu}
                    onPress={() => aramaWebRTC.kamerayiDegistir(false)}
                  >
                    <Text style={styles.aramaKontrolIkon}>📹</Text>
                    <Text style={styles.aramaKontrolMetni}>Kamera</Text>
                  </Pressable>

                  <Pressable
                    style={styles.aramaKontrolButonu}
                    onPress={() => aramaWebRTC.kamerayiCevir()}
                  >
                    <Text style={styles.aramaKontrolIkon}>🔄</Text>
                    <Text style={styles.aramaKontrolMetni}>Çevir</Text>
                  </Pressable>
                </>
              )}

              <Pressable
                style={[styles.aramaKontrolButonu, styles.aramaBitirButonu]}
                onPress={() => void aramaTemizle()}
              >
                <Text style={styles.aramaKontrolIkon}>🔴</Text>
                <Text style={styles.aramaKontrolMetni}>Kapat2</Text>
              </Pressable>
            </View>
          )}

          {aramaSonuGorunur && (
            <View style={styles.aramaSonuBildirim}>
              <Text style={styles.aramaSonuBildirimBaslik}>
                Arama sona erdi
              </Text>
              <Text style={styles.aramaSonuBildirimMetin}>
                {aramaSonuMesaji}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* =======================================================
          VİDEO OYNATICI
      ======================================================= */}

      <VideoPlayerModal
        uri={videoOynatmaUri}
        visible={videoOynatmaUri !== null}
        onClose={() => setVideoOynatmaUri(null)}
      />
    </>
  );
}

export default ConversationPanel;

/*
 * ==============================================================
 * STYLES
 * ==============================================================
 */

const styles = StyleSheet.create({
  /*
   * ==========================================================
   * ANA PANEL
   * ==========================================================
   */

  container: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    backgroundColor: "#FFF4F7",
  },

  /*
   * ==========================================================
   * BOŞ PANEL
   * ==========================================================
   */

  emptyPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFF7FA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  emptyContent: {
    alignItems: "center",

    width: "100%",
  },

  emptyAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE7EF",
    borderWidth: 1,
    borderColor: "#F5B8CE",
  },

  emptyAvatarText: {
    fontSize: 34,
  },

  emptyTitle: {
    color: "#7D1D43",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    color: "#888888",

    fontSize: 14,

    lineHeight: 21,

    textAlign: "center",

    maxWidth: 320,
  },

  /*
   * ==========================================================
   * HEADER
   * ==========================================================
   */

  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F4DCE5",
    shadowColor: "#7D1D43",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  headerAvatar: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FCE7EF",
    borderWidth: 2,
    borderColor: "#F5B8CE",
    marginRight: 11,
  },

  headerAvatarText: {
    color: "#92264F",

    fontSize: 19,

    fontWeight: "800",
  },

  headerInfo: {
    flex: 1,

    minWidth: 0,

    justifyContent: "center",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 8,
    gap: 5,
  },

  aramaIzniButonu: {
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    maxWidth: 82,
    minHeight: 36,
    paddingHorizontal: 7,
    borderRadius: 18,
  },

  aramaIzniButonuAktif: {
    backgroundColor: "#FCE8EC",

    borderColor: "#E9A8BE",
  },

  aramaIzniButonuPasif: {
    backgroundColor: "#FBE8EF",

    borderColor: "#E9B8C9",
  },

  aramaIzniButonuDevreDisi: {
    opacity: 0.55,
  },

  aramaIzniButonuIkon: {
    fontSize: 13,

    marginRight: 4,
  },

  aramaIzniButonuMetni: {
    color: "#7D1D43",

    fontSize: 9,

    lineHeight: 11,

    fontWeight: "800",

    flexShrink: 1,

    textAlign: "center",
  },

  headerName: {
    color: "#7D1D43",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  statusContainer: {
    flexDirection: "row",

    alignItems: "center",

    marginTop: 3,
  },

  statusDot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    marginRight: 5,
  },

  activeDot: {
    backgroundColor: "#2e9d55",
  },

  inactiveDot: {
    backgroundColor: "#999999",
  },

  statusText: {
    fontSize: 11,

    lineHeight: 15,
  },

  activeText: {
    color: "#218838",
  },

  inactiveText: {
    color: "#999999",
  },

  typingText: {
    color: "#C12F65",

    fontSize: 10,

    lineHeight: 14,

    fontStyle: "italic",

    marginTop: 2,
  },

  activeBadge: {
    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 12,

    backgroundColor: "#edf8f0",

    marginLeft: 6,
  },

  activeBadgeText: {
    color: "#218838",

    fontSize: 10,

    fontWeight: "700",
  },

  /*
   * ==========================================================
   * MESAJ ALANI
   * ==========================================================
   */

  messageArea: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "#FFF4F7",
  },

  messageListContent: {
    paddingTop: 16,
    paddingBottom: 18,
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  /*
   * ==========================================================
   * MESAJ SATIRI
   * ==========================================================
   */

  messageRow: {
    width: "100%",
    marginVertical: 5,
    flexDirection: "row",
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  messageRowOther: {
    justifyContent: "flex-start",
  },

  messageWrapper: {
    minWidth: 0,
    maxWidth: "82%",
  },

  senderName: {
    color: "#8D4562",

    fontSize: 11,

    lineHeight: 15,

    fontWeight: "700",

    marginLeft: 8,

    marginBottom: 3,
  },

  /*
   * ==========================================================
   * MESAJ BALONU
   * ==========================================================
   */

  messageBubble: {
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    elevation: 1,
    shadowColor: "#7D1D43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  messageBubbleMine: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: "#C12F65",
    borderBottomRightRadius: 6,
  },

  messageBubbleOther: {
    borderWidth: 1,
    borderColor: "#F4DCE5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
  },

  messageContent: {
    fontSize: 15,

    lineHeight: 21,
  },

  messageContentMine: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },

  messageContentOther: {
    color: "#292329",
  },

  /*
   * ==========================================================
   * MEDYA
   * ==========================================================
   */

  mediaList: {
    width: "100%",
  },

  mediaWithText: {
    marginTop: 7,
  },

  mediaWithoutText: {
    marginTop: 0,
  },

  imageContainer: {
    width: 220,

    maxWidth: "100%",

    height: 220,

    marginTop: 5,

    borderRadius: 14,

    overflow: "hidden",

    backgroundColor: "#eeeeee",
  },

  image: {
    width: "100%",

    height: "100%",
  },

  imageLoadingContainer: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#eeeeee",
  },

  imageLoadingText: {
    color: "#888888",

    fontSize: 12,
  },

  mediaCard: {
    width: "100%",

    minHeight: 58,

    marginTop: 5,

    paddingHorizontal: 9,

    paddingVertical: 8,

    borderRadius: 12,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "rgba(194,47,101,0.09)",
  },

  mediaIconContainer: {
    width: 40,

    height: 40,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "rgba(255,255,255,0.80)",
  },

  mediaIcon: {
    fontSize: 20,
  },

  mediaInfo: {
    flex: 1,

    minWidth: 0,

    marginLeft: 9,
  },

  mediaTitle: {
    color: "#7D1D43",

    fontSize: 12,

    fontWeight: "800",
  },

  mediaFileName: {
    color: "#777777",

    fontSize: 10,

    marginTop: 2,
  },

  mediaOpenIcon: {
    color: "#92264F",

    fontSize: 15,

    fontWeight: "800",

    marginLeft: 7,
  },

  /*
   * ==========================================================
   * MESAJ META
   * ==========================================================
   */

  messageMeta: {
    minHeight: 16,

    marginTop: 5,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "flex-end",
  },

  messageTime: {
    fontSize: 10,
  },

  messageTimeMine: {
    color: "rgba(255,255,255,0.70)",
  },

  messageTimeOther: {
    color: "#999999",
  },

  readStatus: {
    marginLeft: 4,

    fontSize: 12,

    fontWeight: "800",
  },

  readStatusRead: {
    color: "#72cfff",
  },

  readStatusUnread: {
    color: "rgba(255,255,255,0.70)",
  },

  deleteButton: {
    width: 25,

    height: 25,

    marginLeft: 3,

    alignItems: "center",

    justifyContent: "center",
  },

  deleteIcon: {
    fontSize: 13,
  },

  /*
   * ==========================================================
   * INPUT CONTAINER
   * ==========================================================
   */

  inputContainer: {
    width: "100%",
    flexShrink: 0,
    minHeight: 76,
    zIndex: 20,
    elevation: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F4DCE5",
    shadowColor: "#7D1D43",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  /*
   * ==========================================================
   * ARAMA BUTONLARI
   * ==========================================================
   */

  aramaButonlari: {
    flexDirection: "row",

    alignItems: "center",

    paddingLeft: 3,

    paddingRight: 4,

    gap: 5,
  },

  aramaButonu: {
    width: 44,

    height: 44,

    borderRadius: 22,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FBE8EF",
  },

  aramaButonuIkon: {
    fontSize: 21,
  },

  mesajInputAlani: {
    minWidth: 0,

    flex: 1,
    width: "100%",
  },

  /*
   * ==========================================================
   * ARAMA OVERLAY
   * ==========================================================
   */

  aramaOverlay: {
    flex: 1,
    backgroundColor: "#4B142B",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingBottom: 35,
  },

  aramaHeader: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  aramaBaslik: {
    color: "#FFFCFA",
    fontSize: 15,
    fontWeight: "700",
  },

  aramaKullaniciAdi: {
    color: "#FFFCFA",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 6,
  },

  sesliAramaAlani: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  aramaAvatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#92264F",
    borderWidth: 4,
    borderColor: "#F5B8CE",
    marginBottom: 22,
  },

  aramaAvatarText: {
    color: "#FFFCFA",
    fontSize: 48,
    fontWeight: "800",
  },

  sesliAramaIsmi: {
    color: "#FFFCFA",
    fontSize: 25,
    fontWeight: "800",
  },

  aramaDurumMetni: {
    color: "#F1C8D7",
    fontSize: 15,
    marginTop: 9,
  },

  goruntuluAramaAlani: {
    flex: 1,
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
  },

  uzakVideo: {
    width: "100%",
    height: "100%",
  },

  yerelVideo: {
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

  videoBeklemeAlani: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  videoBeklemeIkon: {
    fontSize: 45,
    marginBottom: 10,
  },

  videoBeklemeMetni: {
    color: "#FFFCFA",
    fontSize: 15,
  },

  aramaKontrolleri: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 15,
  },

  gelenAramaButonlari: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 20,
  },

  aramaKontrolButonu: {
    minWidth: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3a3448",
    paddingHorizontal: 9,
  },

  aramaKontrolIkon: {
    color: "#FFFCFA",
    fontSize: 22,
  },

  aramaKontrolMetni: {
    color: "#FFFCFA",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "700",
  },

  aramaBitirButonu: {
    backgroundColor: "#E11D48",
  },

  aramaReddetButonu: {
    backgroundColor: "#E11D48",
  },

  aramaKabulButonu: {
    backgroundColor: "#2e9d55",
  },

  aramaKontrolButonuAktif: {
    backgroundColor: "#92264F",
  },

  aramaSonuBildirim: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 105,
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(91, 22, 48, 0.96)",
  },

  aramaSonuBildirimBaslik: {
    color: "#FFFCFA",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  aramaSonuBildirimMetin: {
    color: "#eeeeee",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  /*
   * ==========================================================
   * VİDEO MODAL
   * ==========================================================
   */

  videoModalContainer: {
    flex: 1,

    backgroundColor: "#000000",

    alignItems: "center",

    justifyContent: "center",
  },

  videoPlayer: {
    width: "100%",

    height: "100%",
  },

  videoCloseButton: {
    position: "absolute",

    top: 42,

    right: 18,

    zIndex: 50,

    elevation: 50,

    width: 42,

    height: 42,

    borderRadius: 21,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "rgba(0,0,0,0.65)",
  },

  videoCloseButtonText: {
    color: "#FFFCFA",

    fontSize: 22,

    fontWeight: "800",
  },

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  loadingContainer: {
    flex: 1,

    minHeight: 120,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 20,
  },

  loadingText: {
    color: "#8a7ab8",

    fontSize: 14,

    textAlign: "center",
  },

  /*
   * ==========================================================
   * MESAJ YOK
   * ==========================================================
   */

  noMessageContainer: {
    flex: 1,

    minHeight: 150,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 30,
  },

  noMessageIcon: {
    width: 58,

    height: 58,

    borderRadius: 29,

    marginBottom: 12,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FBE8EF",
  },

  noMessageIconText: {
    fontSize: 25,
  },

  noMessageTitle: {
    color: "#92264F",

    fontSize: 17,

    fontWeight: "800",

    textAlign: "center",

    marginBottom: 4,
  },

  noMessageText: {
    color: "#888888",

    fontSize: 13,

    textAlign: "center",
  },
  ustAramaButonu: {
    width: 40,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F5",
    marginHorizontal: 2,
  },
  ustAramaIkonu: { fontSize: 23, color: "#8B2948", fontWeight: "700" },
});
