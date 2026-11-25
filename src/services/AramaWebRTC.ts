import { NativeModules } from "react-native";

const WebRTCNativeCamera = NativeModules.WebRTCModule as {
  mediaStreamTrackSetCaptureEnabled?: (
    trackId: string,
    enabled: boolean,
  ) => void;
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import type { RTCRtpEncodingParameters } from "react-native-webrtc";

import InCallManager from "react-native-incall-manager";
import { createSound } from "react-native-nitro-sound";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";
import { API_BASE_URL, WEBSOCKET_URL } from "../config/api";

import { AramaE2EEHandshake } from "./AramaE2EEHandshake";
import { Hoparlor } from "./Hoparlor";

type RTCSessionDescriptionInit = {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
};
type RTCIceCandidateInit = any;

const SUNUCU_ADRESI = API_BASE_URL;

const WEBSOCKET_ADRESI = WEBSOCKET_URL;

const WEBSOCKET_BAGLANTI_TIMEOUT_MS = 15000;

export type AramaTuru = "SES" | "VIDEO";

export type AramaMesaji =
  | {
      tip: "CALL_OFFER";

      arayanId: number;

      arananId: number;

      aramaTuru: AramaTuru;

      teklif: RTCSessionDescriptionInit;
    }
  | {
      tip: "CALL_ANSWER";

      arayanId: number;

      arananId: number;

      cevap: RTCSessionDescriptionInit;
    }
  | {
      tip: "CALL_ICE";

      arayanId: number;

      arananId: number;

      aday: RTCIceCandidateInit;
    }
  | {
      tip: "CALL_REJECT";

      arayanId: number;

      arananId: number;
    }
  | {
      tip: "CALL_END";

      arayanId: number;

      arananId: number;
    };

type AramaOlaylari = {
  teklif: (
    mesaj: AramaMesaji & {
      tip: "CALL_OFFER";
    },
  ) => void;

  cevap: (
    mesaj: AramaMesaji & {
      tip: "CALL_ANSWER";
    },
  ) => void;

  ice: (
    mesaj: AramaMesaji & {
      tip: "CALL_ICE";
    },
  ) => void;

  reddet: (
    mesaj: AramaMesaji & {
      tip: "CALL_REJECT";
    },
  ) => void;

  bitir: (
    mesaj: AramaMesaji & {
      tip: "CALL_END";
    },
  ) => void;

  e2ee: (
    gonderenKullaniciId: number,
    aramaOturumId: string,
    e2eeVerisi: string,
  ) => void;

  webSocketBaglandi: () => void;
  baglandi: () => void;

  uzakStream: (stream: MediaStream) => void;

  baglantiKoptu: () => void;

  hata: (hata: Error) => void;
};

type BackendAramaSinyali = {
  hedefKullaniciId: number;

  tur: string;

  tip: string;

  sdp?: string | null;

  aday?: string | null;

  sdpMid?: string | null;

  sdpMLineIndex?: number | null;

  aramaOturumId?: string | null;

  e2eeVerisi?: string | null;
};

type AramaOlayCallback = (...args: any[]) => void;

class AramaWebRTC {
  private peerConnection: RTCPeerConnection | null = null;

  private e2eeHandshake: AramaE2EEHandshake | null = null;
  private e2eeBekleyenSinyaller: Array<{
    senderUserId: number;
    sessionId: string;
    payload: string;
  }> = [];
  private e2eeBekleyenGondericiler: Array<{
    sender: any;
    track: any;
    detached: boolean;
  }> = [];

  private yerelStream: MediaStream | null = null;

  private uzakStream: MediaStream | null = null;

  private mevcutKullaniciId: number | null = null;

  private arananKullaniciId: number | null = null;

  private aramaOturumId: string | null = null;

  private aramaTuru: AramaTuru = "SES"; /*\*



   \* =========================================================



   \* STOMP CLIENT



   \* =========================================================



   */

  private stompClient: Client | null = null;

  private webSocketBagli = false;

  private webSocketBaglantiPromise: Promise<void> | null = null;

  private aramaSubscription: StompSubscription | null = null;

  private hariciSinyalGonderici:
    ((sinyal: BackendAramaSinyali) => void | Promise<void>) | null = null; /*\*



   \* =========================================================



   \* ICE



   \* =========================================================



   */

  private bekleyenIceAdaylari: RTCIceCandidateInit[] = [];

  // Giden ICE, backend CALL_OFFER_ACK gelene kadar ayrı kuyrukta tutulur.
  private offerAckBekleniyor = false;
  private gidenIceAktarimiSuruyor = false;
  private gidenIceAktarimPromise: {
    nesil: number;
    promise: Promise<void>;
  } | null = null;
  private gidenIceTekrarDenemeIstendi = false;
  private bekleyenGidenIceAdaylari: RTCIceCandidateInit[] = [];

  private remoteDescriptionHazir = false;

  private aramaSonlandiriliyor = false;
  private aramaNesli = 0;

  private webRtcBaglandiBildirildi = false;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private statsOkumaSuruyor = false;
  // Aynı anda iki createOffer çalışmasını engeller.
  // Özellikle medya alma ile arama başlatmanın yarışması halinde
  // SDP m-line sırasının bozulmasını önler.

  private offerOlusturuluyor = false; // Aynı arama için aramaBaslat() birden fazla kez tetiklenirse
  // ikinci çağrı yeni bir createOffer başlatmaz; ilk çağrının
  // Promise'ini bekler. Böylece aynı PeerConnection kapanmadan
  // ikinci offer üretme yarışı oluşmaz.

  private aramaBaslatPromise: Promise<RTCSessionDescriptionInit> | null =
    null; /*\*



   \* =========================================================



   \* ARAMA SESİ / ANDROID CALL AUDIO



   \* =========================================================



   */

  private aramaSesiCalisiyor = false;

  private aramaAudioOturumuAcik = false;

  private ringbackDonguAktif = false;
  private ringbackOynatici = createSound();
  private ringtoneOynatici = createSound();
  private ringbackDinleyiciHazir = false;
  private ringtoneDinleyiciHazir = false;

  private ringtoneDonguAktif = false;

  private ringtoneBaslatiliyor = false;

  private sonGelenOfferSdp: string | null = null;
  private bekleyenGelenTeklif: Extract<
    AramaMesaji,
    { tip: "CALL_OFFER" }
  > | null = null;

  private cevapIsleniyor = false;

  // Aynı gelen aramanın iki farklı UI dinleyicisinden
  // eş zamanlı kabul edilmesini engeller.
  private gelenAramaKabulPromise: Promise<RTCSessionDescriptionInit> | null =
    null;

  private ringbackHoparlorOnceAcik = false;

  private gelenAramaAudioOturumuAcik = false;

  private hoparlorAcik = false;

  private async sesOturumunuHazirla() {
    try {
      InCallManager.start({
        media: "audio",
        auto: true,
      });

      try {
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (hata) {
        console.warn("Ses oturumu hoparlör yönlendirmesi ayarlanamadı:", hata);
      }
    } catch (hata) {
      console.warn("Android ses oturumu hazırlanamadı:", hata);
    }
  }

  private async ringbackMp3Baslat() {
    const uri =
      "android.resource://com.anonymous.gonulbulusmasimobile/raw/ringback";

    if (!this.ringbackDinleyiciHazir) {
      this.ringbackOynatici.addPlaybackEndListener(() => {
        if (this.ringbackDonguAktif) {
          void this.ringbackOynatici.startPlayer(uri).catch((hata) => {
            console.warn("Ringback tekrar başlatılamadı:", hata);
          });
        }
      });
      this.ringbackDinleyiciHazir = true;
    }

    await this.ringbackOynatici.startPlayer(uri);
    await this.ringbackOynatici.setVolume(1);
  }

  private async ringtoneMp3Baslat() {
    const uri =
      "android.resource://com.anonymous.gonulbulusmasimobile/raw/ringtone";

    if (!this.ringtoneDinleyiciHazir) {
      this.ringtoneOynatici.addPlaybackEndListener(() => {
        if (this.ringtoneDonguAktif) {
          void this.ringtoneOynatici.startPlayer(uri).catch((hata) => {
            console.warn("Ringtone tekrar başlatılamadı:", hata);
          });
        }
      });
      this.ringtoneDinleyiciHazir = true;
    }

    await this.ringtoneOynatici.startPlayer(uri);
    await this.ringtoneOynatici.setVolume(1);
  }

  private ringbackMp3Durdur() {
    this.ringbackDonguAktif = false;

    if (this.ringbackDinleyiciHazir) {
      try {
        this.ringbackOynatici.removePlaybackEndListener();
      } catch (hata) {
        console.warn("Ringback dinleyicisi kaldırılamadı:", hata);
      }
      this.ringbackDinleyiciHazir = false;
    }

    void this.ringbackOynatici.stopPlayer().catch(() => {});
  }

  private ringtoneMp3Durdur() {
    this.ringtoneDonguAktif = false;

    if (this.ringtoneDinleyiciHazir) {
      try {
        this.ringtoneOynatici.removePlaybackEndListener();
      } catch (hata) {
        console.warn("Ringtone dinleyicisi kaldırılamadı:", hata);
      }
      this.ringtoneDinleyiciHazir = false;
    }

    void this.ringtoneOynatici.stopPlayer().catch(() => {});
  }

  private async aramaSesiniBaslat() {
    try {
      if (this.aramaSesiCalisiyor) {
        console.log("Arama ringback sesi zaten çalışıyor.");
        return;
      }

      this.ringbackHoparlorOnceAcik = this.hoparlorAcik;

      // Hoparlörü otomatik açma.
      // Ses yönlendirmesini mevcut arama oturumu yönetsin.
      this.ringbackDonguAktif = true;
      this.aramaSesiCalisiyor = true;

      await this.ringbackMp3Baslat();

      console.log("GİDEN ARAMA MP3 RINGBACK BAŞLATILDI");
    } catch (hata) {
      this.ringbackMp3Durdur();
      this.aramaSesiCalisiyor = false;
      this.ringbackDonguAktif = false;

      console.warn("Giden arama ringback başlatılamadı:", hata);
    }
  }

  private gelenAramaAudioOturumunuBaslat(): boolean {
    try {
      if (this.gelenAramaAudioOturumuAcik) {
        return true;
      }

      console.log("GELEN ARAMA ZIL SESI ICIN ANDROID AUDIO OTURUMU ACILIYOR");

      InCallManager.start({
        media: "audio",
        auto: true,
      });

      try {
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (hata) {
        console.warn("Gelen arama hoparlor yonlendirmesi ayarlanamadi:", hata);
      }

      this.gelenAramaAudioOturumuAcik = true;

      console.log("GELEN ARAMA ANDROID AUDIO OTURUMU HAZIR");

      return true;
    } catch (hata) {
      this.gelenAramaAudioOturumuAcik = false;

      console.warn("Gelen arama Android audio oturumu acilamadi:", hata);

      return false;
    }
  }

  private gelenAramaAudioOturumunuKapat() {
    if (!this.gelenAramaAudioOturumuAcik) {
      return;
    }

    try {
      InCallManager.stop();

      console.log("GELEN ARAMA GECICI AUDIO OTURUMU KAPATILDI");
    } catch (hata) {
      console.warn("Gelen arama gecici audio oturumu kapatilamadi:", hata);
    } finally {
      this.gelenAramaAudioOturumuAcik = false;
    }
  }

  private async gelenAramaSesiniBaslat() {
    if (this.aramaSesiCalisiyor || this.ringtoneBaslatiliyor) {
      console.log("Gelen arama ringtone zaten çalışıyor/başlatılıyor.");
      return;
    }

    this.ringtoneBaslatiliyor = true;

    try {
      const audioHazir = this.gelenAramaAudioOturumunuBaslat();

      if (!audioHazir) {
        console.warn("Gelen arama için Android ses oturumu hazır değil.");
      }

      try {
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (hata) {
        console.warn("Gelen arama hoparlör yönlendirmesi ayarlanamadı:", hata);
      }

      this.ringtoneDonguAktif = true;
      this.aramaSesiCalisiyor = true;

      await this.ringtoneMp3Baslat();

      console.log("GELEN ARAMA MP3 RINGTONE BAŞLATILDI");
    } catch (hata) {
      this.ringtoneMp3Durdur();
      this.aramaSesiCalisiyor = false;
      console.warn("Gelen arama ringtone başlatılamadı:", hata);
    } finally {
      this.ringtoneBaslatiliyor = false;
    }
  }

  private aramaSesiniDurdur() {
    this.ringbackMp3Durdur();
    this.ringtoneMp3Durdur();

    try {
      InCallManager.stopRingback();
    } catch (hata) {
      console.warn("Sistem ringback temizlenemedi:", hata);
    }

    try {
      InCallManager.stopRingtone();
    } catch (hata) {
      console.warn("Sistem ringtone temizlenemedi:", hata);
    }

    try {
      InCallManager.setForceSpeakerphoneOn(this.ringbackHoparlorOnceAcik);
    } catch (hata) {
      console.warn("Ses yönlendirmesi geri yüklenemedi:", hata);
    }

    this.aramaSesiCalisiyor = false;
    console.log("ARAMA MP3 ZİL SESLERİ DURDURULDU");
  }

  private aramaSesiniTemizle() {
    this.ringbackMp3Durdur();
    this.ringtoneMp3Durdur();

    try {
      InCallManager.stopRingback();
    } catch {}

    try {
      InCallManager.stopRingtone();
    } catch {}

    this.aramaSesiCalisiyor = false;
    this.ringbackHoparlorOnceAcik = false;
  }

  private aramaAudioOturumunuBaslat(): boolean {
    try {
      if (this.aramaAudioOturumuAcik) {
        console.log(" CALL AUDIO OTURUMU ZATEN AÇIK");

        return true;
      }

      const medya = this.aramaTuru === "VIDEO" ? "video" : "audio";

      console.log("======================================");

      console.log(" CALL AUDIO OTURUMU BAŞLATILIYOR");

      console.log(" Medya:", medya);

      console.log("======================================");

      const baslatildi = Hoparlor.aramayiBaslat(medya);

      if (!baslatildi) {
        console.warn("  CALL AUDIO OTURUMU BAŞLATILAMADI.");

        this.aramaAudioOturumuAcik = false;

        this.hoparlorAcik = false;

        return false;
      } // Görüntülü aramada hoparlör varsayılan olarak AÇIK,
      // sesli aramada ahize varsayılan olarak AÇIK olsun.

      this.hoparlorAcik = this.aramaTuru === "VIDEO";

      this.aramaAudioOturumuAcik = true;

      console.log("======================================");

      console.log(" CALL AUDIO OTURUMU BAŞLATILDI");

      console.log(
        this.hoparlorAcik ? " VIDEO: HOPARLÖR AÇIK" : " SES: AHİZE AÇIK",
      );

      console.log("======================================");

      return true;
    } catch (hata) {
      this.aramaAudioOturumuAcik = false;

      this.hoparlorAcik = false;

      console.warn("  CALL AUDIO OTURUMU BAŞLATILAMADI:", hata);

      return false;
    }
  }

  private aramaAudioOturumunuKapat() {
    try {
      if (!this.aramaAudioOturumuAcik) {
        return;
      }

      Hoparlor.aramayiBitir();

      this.aramaAudioOturumuAcik = false;

      this.hoparlorAcik = false;

      console.log(" CALL AUDIO OTURUMU KAPATILDI");
    } catch (hata) {
      this.aramaAudioOturumuAcik = false;

      console.warn("  Call audio oturumu kapatılamadı:", hata);
    }
  }

  private readonly iceSunucular = [
    {
      urls: "stun:stun.l.google.com:19302",
    },

    {
      urls: "stun:stun1.l.google.com:19302",
    },
  ]; /*\*



   \* =========================================================



   \* AYARLA



   \* =========================================================



   */

  private yeniAramaOturumId(): string {
    const parca = () =>
      Math.floor(Math.random() * 0x10000)
        .toString(16)
        .padStart(4, "0");

    return `${parca()}${parca()}-${parca()}-4${parca().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${parca().slice(1)}-${parca()}${parca()}${parca()}`;
  }

  /**
   * Oturum açmış kullanıcının kimliğini WebRTC/E2EE katmanına tanıtır.
   * Arama ayarından önce çağrılabilir; ayarla() ve gelenAramayiAyarla()
   * çağrıları bu değeri kendi oturum bilgileriyle günceller.
   */
  public kullaniciKimliginiAyarla(kullaniciId: number): void {
    if (!Number.isSafeInteger(kullaniciId) || kullaniciId <= 0) {
      throw new Error("Geçersiz kullanıcı ID.");
    }

    this.mevcutKullaniciId = kullaniciId;
  }

  ayarla(
    mevcutKullaniciId: number,
    arananKullaniciId: number,
    aramaTuru: AramaTuru,
  ) {
    // Devam eden bir arama oturumu varsa üzerine yazma.
    if (this.aramaOturumId && !this.aramaSonlandiriliyor) {
      console.warn(
        "AKTİF ARAMA OTURUMU KORUNDU. Yeni oturum oluşturulmadı.",
        this.aramaOturumId,
      );
      return;
    }

    this.aramaNesli++;
    this.mevcutKullaniciId = mevcutKullaniciId;
    this.arananKullaniciId = arananKullaniciId;

    this.aramaOturumId = this.yeniAramaOturumId();

    this.aramaTuru = aramaTuru;

    this.aramaSonlandiriliyor = false;
    this.webRtcBaglandiBildirildi = false;

    this.bekleyenIceAdaylari = [];
    this.offerAckBekleniyor = false;
    this.gidenIceAktarimiSuruyor = false;
    this.gidenIceTekrarDenemeIstendi = false;
    this.bekleyenGidenIceAdaylari = [];
    this.e2eeBekleyenSinyaller = [];
    this.e2eeBekleyenGondericiler = [];
    this.remoteDescriptionHazir = false;
    this.cevapIsleniyor = false;

    console.log("======================================");
    console.log("WEBRTC ARAMA AYARLANDI");
    console.log("Mevcut kullanıcı:", mevcutKullaniciId);
    console.log("Aranan kullanıcı:", arananKullaniciId);
    console.log("Arama türü:", aramaTuru);
    console.log("======================================");
  }
  gelenAramayiAyarla(
    mevcutKullaniciId: number,
    arayanKullaniciId: number,
    aramaTuru: AramaTuru,
    aramaOturumId: string,
  ) {
    if (
      !Number.isFinite(mevcutKullaniciId) ||
      !Number.isFinite(arayanKullaniciId) ||
      mevcutKullaniciId <= 0 ||
      arayanKullaniciId <= 0
    ) {
      throw new Error("Gelen arama kullanıcı bilgileri geçersiz.");
    }

    if (!aramaOturumId?.trim()) {
      throw new Error("Gelen arama oturum kimliği bulunamadı.");
    }

    const aktifPeerConnection =
      this.peerConnection && this.peerConnection.signalingState !== "closed";

    if (
      this.aramaSonlandiriliyor ||
      this.aramaOturumId !== null ||
      aktifPeerConnection
    ) {
      throw new Error(
        "Başka bir arama oturumu hâlâ aktif veya temizleniyor. Yeni gelen arama yüklenmedi.",
      );
    }

    this.aramaNesli++;
    this.bekleyenGelenTeklif = null;
    this.mevcutKullaniciId = mevcutKullaniciId;
    this.arananKullaniciId = arayanKullaniciId;

    // Sunucunun oluşturduğu gerçek oturum kimliği korunur.
    // yeniAramaOturumId() burada kesinlikle çağrılmaz.
    this.aramaOturumId = aramaOturumId;
    this.sonGelenOfferSdp = null;

    this.aramaTuru = aramaTuru;

    this.aramaSonlandiriliyor = false;
    this.webRtcBaglandiBildirildi = false;
    this.bekleyenIceAdaylari = [];
    this.offerAckBekleniyor = false;
    this.gidenIceAktarimiSuruyor = false;
    this.gidenIceTekrarDenemeIstendi = false;
    this.bekleyenGidenIceAdaylari = [];
    this.e2eeBekleyenSinyaller = [];
    this.e2eeBekleyenGondericiler = [];
    this.remoteDescriptionHazir = false;
    this.cevapIsleniyor = false;

    console.log("GELEN ARAMA WEBRTC OTURUMU HAZIRLANDI");
    console.log("Arayan kullanıcı:", arayanKullaniciId);
    console.log("Aranan kullanıcı:", mevcutKullaniciId);
    console.log("Arama türü:", aramaTuru);
    console.log("Oturum kimliği:", aramaOturumId);
  }
  async fcmIleGelenAramayiYukle(
    mevcutKullaniciId: number,
    arayanKullaniciId: number,
    aramaTuru: AramaTuru,
    aramaOturumId: string,
    teklifSdp: string,
  ): Promise<void> {
    if (!teklifSdp?.trim()) {
      throw new Error("Gelen aramanın SDP bilgisi boş.");
    }

    if (
      this.aramaOturumId === aramaOturumId &&
      this.sonGelenOfferSdp === teklifSdp &&
      !this.aramaSonlandiriliyor
    ) {
      console.warn("Aynı FCM arama teklifi daha önce işlendi.");
      return;
    }

    this.gelenAramayiAyarla(
      mevcutKullaniciId,
      arayanKullaniciId,
      aramaTuru,
      aramaOturumId,
    );

    this.sonGelenOfferSdp = teklifSdp;

    const mesaj: AramaMesaji = {
      tip: "CALL_OFFER",
      arayanId: arayanKullaniciId,
      arananId: mevcutKullaniciId,
      aramaTuru,
      teklif: {
        type: "offer",
        sdp: teklifSdp,
      },
    };

    await this.gelenAramaSesiniBaslat();

    this.olayCalistir("teklif", mesaj);

    console.log("FCM ÜZERİNDEN GELEN ARAMA WEBRTC'YE AKTARILDI");
  }

  /*\*



   \* =========================================================



   \* OLAY DİNLE



   \* =========================================================



   */

  olayDinle<K extends keyof AramaOlaylari>(
    olay: K,

    callback: AramaOlaylari[K],
  ): () => void {
    const dinleyici = callback as AramaOlayCallback;

    let dinleyiciler = this.olaylar.get(olay);

    if (!dinleyiciler) {
      dinleyiciler = [];

      this.olaylar.set(olay, dinleyiciler);
    }

    dinleyiciler.push(dinleyici);

    if (olay === "teklif" && this.bekleyenGelenTeklif) {
      const bekleyen = this.bekleyenGelenTeklif;
      this.bekleyenGelenTeklif = null;

      try {
        (
          dinleyici as (
            mesaj: Extract<AramaMesaji, { tip: "CALL_OFFER" }>,
          ) => void
        )(bekleyen);

        console.log("BEKLEYEN GELEN ARAMA TEKLİFİ TESLİM EDİLDİ");
      } catch (hata) {
        console.error("BEKLEYEN TEKLİF İŞLENEMEDİ:", hata);
      }
    }

    return () => {
      const mevcutDinleyiciler = this.olaylar.get(olay);

      if (!mevcutDinleyiciler) {
        return;
      }

      const index = mevcutDinleyiciler.indexOf(dinleyici);

      if (index !== -1) {
        mevcutDinleyiciler.splice(index, 1);
      }

      if (mevcutDinleyiciler.length === 0) {
        this.olaylar.delete(olay);
      }
    };
  }

  private olaylar = new Map<keyof AramaOlaylari, AramaOlayCallback[]>();

  constructor() {}

  private olayCalistir(olay: keyof AramaOlaylari, ...args: any[]): void {
    const dinleyiciler = this.olaylar.get(olay);

    if (!dinleyiciler || dinleyiciler.length === 0) {
      if (olay === "teklif" && args[0]?.tip === "CALL_OFFER") {
        this.bekleyenGelenTeklif = args[0];
        console.warn("GELEN ARAMA TEKLİFİ DİNLEYİCİ BEKLEMEK ÜZERE SAKLANDI");
      }
      return;
    }

    for (const callback of [...dinleyiciler]) {
      try {
        callback(...args);
      } catch (hata) {
        console.error(`Arama olayı callback hatası (${String(olay)}):`, hata);
      }
    }
  }

  private hoparloruAc() {
    try {
      if (!this.aramaAudioOturumuAcik) {
        this.aramaAudioOturumunuBaslat();
      }

      const basarili = Hoparlor.ac();

      if (!basarili) {
        console.warn("  Hoparlör Hoparlor servisi tarafından açılamadı.");

        return;
      }

      this.hoparlorAcik = true;

      console.log(
        this.aramaTuru === "VIDEO"
          ? " Görüntülü arama: HOPARLÖR AÇILDI"
          : " Sesli arama: HOPARLÖR AÇILDI",
      );
    } catch (hata) {
      console.warn("  Hoparlör açılamadı:", hata);
    }
  }

  private sesYonlendirmesiniKapat() {
    this.aramaAudioOturumunuKapat();

    console.log(" Ses yönlendirmesi kapatıldı.");
  }

  public hoparloruDegistir(acik: boolean) {
    try {
      if (!this.aramaAudioOturumuAcik) {
        this.aramaAudioOturumunuBaslat();
      }

      const basarili = Hoparlor.hoparloruDegistir(acik);

      if (!basarili) {
        console.warn("  Hoparlör yönlendirmesi değiştirilemedi.");

        return;
      }

      this.hoparlorAcik = acik;

      console.log(acik ? " Hoparlör açıldı." : " Ahizeye geçildi.");
    } catch (hata) {
      console.warn("  Hoparlör değiştirilemedi:", hata);
    }
  }

  sinyalGondericiyiAyarla(
    gonderici: ((sinyal: BackendAramaSinyali) => void | Promise<void>) | null,
  ): void {
    this.hariciSinyalGonderici = gonderici;
  }

  /**
   * STOMP yeniden bağlandığında bekleyen ICE adaylarını aktarır.
   * CALL_OFFER mesajını tekrar göndermez.
   */
  stompBaglantisiYenidenKuruldu(): void {
    const nesil = this.aramaNesli;

    // Aktarım sürüyorsa reconnect olayını kaybetme.
    // Mevcut aktarım bitince kuyruk yeniden kontrol edilecek.
    if (this.gidenIceAktarimPromise?.nesil === nesil) {
      this.gidenIceTekrarDenemeIstendi = true;
      console.log(
        "⏳ ICE AKTARIMI SÜRÜYOR; STOMP RECONNECT YENİDEN DENEMEYE KAYDEDİLDİ.",
      );
      return;
    }

    if (
      this.aramaSonlandiriliyor ||
      !this.aramaOturumId ||
      this.offerAckBekleniyor ||
      this.bekleyenGidenIceAdaylari.length === 0
    ) {
      return;
    }

    console.log(
      "🔄 STOMP YENİDEN BAĞLANDI: BEKLEYEN ICE KUYRUĞU KONTROL EDİLİYOR.",
      this.bekleyenGidenIceAdaylari.length,
    );

    void this.bekleyenGidenIceAdaylariniGonder().catch((hata) => {
      if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
        return;
      }

      console.error(
        "❌ STOMP YENİDEN BAĞLANTI SONRASI ICE AKTARIMI BAŞARISIZ:",
        hata,
      );
    });
  } /*\*



   \* =========================================================



   \* STOMP WEBSOCKET BAĞLANTISI



   \*



   \* ÖNEMLİ:



   \*



   \* brokerURL KULLANMIYORUZ.



   \*



   \* React Native native WebSocket



   \* oluşturuyoruz.



   \*



   \* Ayrıca v12.stomp subprotocol



   \* açıkça gönderiliyor.



   \* =========================================================



   */

  async webSocketBaglantisiAc(): Promise<void> {
    if (this.hariciSinyalGonderici) {
      console.log("======================================");

      console.log(" HARİCİ STOMP TAŞIYICISI AKTİF");

      console.log(" AramaWebRTC native STOMP bağlantısı açılmayacak.");

      console.log("======================================");

      return;
    }

    if (this.webSocketBagli && this.stompClient?.connected) {
      console.log(" ARAMA STOMP ZATEN BAĞLI");

      return;
    }

    if (this.webSocketBaglantiPromise) {
      console.log(" MEVCUT STOMP BAĞLANTISI BEKLENİYOR");

      return this.webSocketBaglantiPromise;
    }

    if (this.mevcutKullaniciId === null) {
      throw new Error(
        "WebSocket bağlantısı için mevcut kullanıcı ID bulunamadı.",
      );
    }

    const kullaniciId = this.mevcutKullaniciId;

    const promise = new Promise<void>(async (resolve, reject) => {
      let tamamlandi = false;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const temizleTimeout = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);

          timeoutId = null;
        }
      };

      const basari = () => {
        if (tamamlandi) return;

        tamamlandi = true;

        temizleTimeout();

        this.webSocketBagli = true;

        this.webSocketBaglantiPromise = null;

        resolve();
      };

      const hata = (error: Error) => {
        if (tamamlandi) return;

        tamamlandi = true;

        temizleTimeout();

        this.webSocketBagli = false;

        this.webSocketBaglantiPromise = null;

        reject(error);
      };

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          hata(new Error("WebSocket bağlantısı için JWT token bulunamadı."));

          return;
        }

        console.log("======================================");

        console.log(" ARAMA STOMP BAĞLANTISI AÇILIYOR");

        console.log(" Adres:", WEBSOCKET_ADRESI);

        console.log(" Kullanıcı ID:", kullaniciId);

        console.log(" JWT bulundu: EVET");

        console.log("======================================");

        if (this.stompClient) {
          try {
            await this.stompClient.deactivate();
          } catch (eskiHata) {
            console.warn(" Eski STOMP client kapatılamadı:", eskiHata);
          }

          this.stompClient = null;
        }

        this.aramaSubscription = null;

        this.webSocketBagli = false;

        const client = new Client({
          /*



           \* STOMP.js CONNECT frame'ini kendisi üretir.



           \* Native WebSocket'e manuel STOMP frame gönderilmiyor.



           */

          webSocketFactory: () => {
            console.log("📞 ARAMA WEBSOCKET FACTORY");

            console.log("📞 URL:", WEBSOCKET_ADRESI);

            const socket = new WebSocket(WEBSOCKET_ADRESI, ["v12.stomp"]);

            console.log(
              "📞 Protocol:",
              (socket as WebSocket & { protocol?: string }).protocol ?? "",
            );

            return socket;
          },

          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },

          reconnectDelay: 0,

          heartbeatIncoming: 0,

          heartbeatOutgoing: 0,

          debug: (mesaj: string) => {
            if (mesaj.includes("Authorization:")) {
              const temizMesaj = mesaj.replace(
                /Authorization:Bearer\s+[^\s]+/gi,

                "Authorization:Bearer [TOKEN]",
              );

              console.log(" STOMP DEBUG:", temizMesaj);

              return;
            }

            console.log(" STOMP DEBUG:", mesaj);
          },

          onConnect: (frame) => {
            try {
              console.log("======================================");

              console.log(" ARAMA STOMP CONNECTED");

              console.log(" STOMP VERSION:", frame.headers["version"]);

              console.log(" SESSION:", frame.headers["session"]);

              console.log(" STOMP connected:", client.connected);

              console.log("======================================");

              this.webSocketBagli = true;

              const topic = `/topic/arama/${kullaniciId}`;

              if (this.aramaSubscription) {
                try {
                  this.aramaSubscription.unsubscribe();
                } catch (unsubscribeHatasi) {
                  console.warn(
                    " Eski arama subscription kapatılamadı:",

                    unsubscribeHatasi,
                  );
                }

                this.aramaSubscription = null;
              }

              this.aramaSubscription = client.subscribe(
                topic,

                (message: IMessage) => {
                  console.log(" ARAMA STOMP MESSAGE");

                  console.log(" Destination:", message.headers.destination);

                  console.log(" Body length:", message.body?.length ?? 0);

                  this.gelenAramaSinyaliniIsle(message.body);
                },
              );

              console.log(" ARAMA TOPIC SUBSCRIBE TAMAM:", topic);

              basari();

              this.olayCalistir("webSocketBaglandi");
            } catch (connectHatasi) {
              const error =
                connectHatasi instanceof Error
                  ? connectHatasi
                  : new Error("STOMP CONNECT işlemi başarısız.");

              console.error(" STOMP CONNECT HANDLER HATASI:", error);

              this.webSocketBagli = false;

              hata(error);
            }
          },

          onStompError: (frame) => {
            console.error(" STOMP ERROR");

            console.error(" MESSAGE:", frame.headers["message"]);

            console.error(" BODY LENGTH:", frame.body?.length ?? 0);

            const mesaj =
              frame.headers?.message || frame.body || "STOMP sunucu hatası.";

            const error = new Error(mesaj);

            this.webSocketBagli = false;

            this.olayCalistir("hata", error);

            hata(error);
          },

          onWebSocketError: (event) => {
            console.error(" STOMP WEBSOCKET ERROR:", event);

            const error = new Error("Arama WebSocket bağlantı hatası.");

            this.webSocketBagli = false;

            this.olayCalistir("hata", error);

            hata(error);
          },

          onWebSocketClose: (event) => {
            console.log(
              " STOMP WEBSOCKET CLOSE:",

              event.code,

              event.reason,

              event.wasClean,
            );

            this.webSocketBagli = false;

            this.aramaSubscription = null;

            if (tamamlandi) {
              this.olayCalistir("baglantiKoptu");
            } else {
              hata(
                new Error(
                  `Arama WebSocket bağlantısı kurulmadan kapandı. Kod: ${event.code}`,
                ),
              );
            }
          },
        });

        this.stompClient = client;

        timeoutId = setTimeout(() => {
          if (tamamlandi) return;

          console.error(" STOMP CONNECT TIMEOUT");

          console.error(
            `${WEBSOCKET_BAGLANTI_TIMEOUT_MS / 1000} saniye içinde STOMP CONNECTED alınamadı.`,
          );

          console.error("STOMP connected:", client.connected);

          console.error("STOMP active:", client.active);

          const error = new Error(
            "Arama WebSocket bağlantısı zaman aşımına uğradı. STOMP CONNECTED alınamadı.",
          );

          this.webSocketBagli = false;

          this.olayCalistir("hata", error);

          hata(error);

          void client.deactivate();
        }, WEBSOCKET_BAGLANTI_TIMEOUT_MS);

        console.log(" STOMP CLIENT ACTIVATE");

        client.activate();

        console.log(" STOMP CLIENT ACTIVATE ÇAĞRILDI");
      } catch (connectHatasi) {
        console.error(" STOMP BAĞLANTI BAŞLATMA HATASI:", connectHatasi);

        const error =
          connectHatasi instanceof Error
            ? connectHatasi
            : new Error("Arama WebSocket bağlantısı kurulamadı.");

        this.webSocketBagli = false;

        this.olayCalistir("hata", error);

        hata(error);
      }
    });

    this.webSocketBaglantiPromise = promise;

    try {
      await promise;

      console.log(" ARAMA STOMP HAZIR");

      console.log(" STOMP bağlı:", this.webSocketBagli);
    } catch (hata) {
      this.webSocketBaglantiPromise = null;

      this.webSocketBagli = false;

      throw hata;
    }
  } /*\*



   \* =========================================================



   \* GELEN ARAMALARI DİNLEMEYİ BAŞLAT



   \* =========================================================



   \*



   \* Kullanıcı arama başlatmadan önce de arama topic'ini



   \* dinler. Böylece karşı taraf aradığında CALL_OFFER



   \* doğrudan uygulamaya ulaşır.



   */

  async gelenAramalariDinlemeyeBaslat(kullaniciId: number): Promise<void> {
    if (!Number.isFinite(kullaniciId)) {
      throw new Error("Geçersiz kullanıcı ID.");
    }

    this.mevcutKullaniciId = kullaniciId;

    console.log("======================================");

    console.log(" GELEN ARAMA DİNLEME BAŞLATILIYOR");

    console.log(" Kullanıcı ID:", kullaniciId);

    console.log(" Topic:", `/topic/arama/${kullaniciId}`);

    console.log("======================================");

    if (this.hariciSinyalGonderici) {
      console.log(" Harici STOMP taşıyıcısı aktif.");

      console.log(" Native STOMP bağlantısı açılmadan dinleme hazır.");
    } else {
      await this.webSocketBaglantisiAc();
    }

    console.log("======================================");

    console.log(" GELEN ARAMA DİNLEME HAZIR");

    console.log(" Kullanıcı ID:", kullaniciId);

    console.log(" Topic:", `/topic/arama/${kullaniciId}`);

    console.log("======================================");
  } /*\*



   \* =========================================================



   \* GELEN ARAMA MESAJI



   \* =========================================================



   */

  public gelenAramaSinyaliniIsle(body: string) {
    try {
      console.log("======================================");

      console.log(" ARAMA SİNYALİ ALINDI");

      console.log("======================================");

      console.log(" BODY:", body);

      const sinyal: BackendAramaSinyali = JSON.parse(body); /*\*



       \* Backend'deki hedefKullaniciId



       \* mevcut yapıda sinyalin



       \* gönderen kullanıcısını



       \* temsil ediyor.



       */

      const gonderenKullaniciId = sinyal.hedefKullaniciId;

      console.log("========== ARAMA SİNYALİ KİMLİK KONTROLÜ ==========", {
        tip: sinyal.tip,
        gelenOturumId: sinyal.aramaOturumId,
        aktifOturumId: this.aramaOturumId,
        gelenGonderenId: gonderenKullaniciId,
        beklenenKarsiKullaniciId: this.arananKullaniciId,
        mevcutKullaniciId: this.mevcutKullaniciId,
        aramaNesli: this.aramaNesli,
        sonlandiriliyor: this.aramaSonlandiriliyor,
      });
      if (!gonderenKullaniciId) {
        console.warn("  Gelen arama sinyalinde gönderen kullanıcı ID yok.");

        return;
      }

      const aramaTuru: AramaTuru = sinyal.tur === "VIDEO" ? "VIDEO" : "SES";

      if (sinyal.tip === "CALL_OFFER") {
        if (!sinyal.aramaOturumId) {
          console.warn("Gelen CALL_OFFER arama oturum kimliği içermiyor.");
          return;
        }
      } else {
        if (
          !sinyal.aramaOturumId ||
          !this.aramaOturumId ||
          sinyal.aramaOturumId !== this.aramaOturumId
        ) {
          console.warn(
            "Arama sinyali oturum kimliğiyle eşleşmedi, yok sayıldı.",
          );
          return;
        }
      }

      switch (sinyal.tip) {
        case "CALL_OFFER": {
          if (!sinyal.sdp) {
            console.warn("  CALL_OFFER SDP içermiyor.");

            return;
          } // Duplicate CALL_OFFER aynı SDP ile tekrar geldiyse ikinci kez

          // ringtone ve gelen arama UI oluşturulmasın.
          if (
            this.sonGelenOfferSdp === sinyal.sdp &&
            this.arananKullaniciId === gonderenKullaniciId &&
            !this.aramaSonlandiriliyor
          ) {
            console.warn("⚠️ Aynı CALL_OFFER tekrar geldi, yok sayıldı.");
            return;
          }

          this.sonGelenOfferSdp = sinyal.sdp;
          this.aramaOturumId = sinyal.aramaOturumId!;

          const mesaj: AramaMesaji = {
            tip: "CALL_OFFER",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,

            aramaTuru,

            teklif: {
              type: "offer",

              sdp: sinyal.sdp,
            },
          };

          this.aramaTuru = aramaTuru;

          this.arananKullaniciId = gonderenKullaniciId; // GELEN ARAMA: karşı taraf cevap verene/reddedene kadar telefon zili çal.

          void this.gelenAramaSesiniBaslat();

          console.log("======================================");

          console.log(" GELEN CALL_OFFER");

          console.log(" Arayan:", gonderenKullaniciId);

          console.log(" Tür:", aramaTuru);

          console.log("======================================");

          this.olayCalistir("teklif", mesaj);

          break;
        }

        case "CALL_ANSWER": {
          if (!sinyal.sdp) {
            console.warn("  CALL_ANSWER SDP içermiyor.");

            return;
          }

          const mesaj: AramaMesaji = {
            tip: "CALL_ANSWER",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,

            cevap: {
              type: "answer",

              sdp: sinyal.sdp,
            },
          };

          console.log(" GELEN CALL_ANSWER", "Gönderen:", gonderenKullaniciId);

          this.aramaSesiniDurdur();

          this.olayCalistir("cevap", mesaj);

          break;
        }

        case "CALL_ICE": {
          if (!sinyal.aday) {
            console.warn("  CALL_ICE aday içermiyor.");

            return;
          }

          let aday: RTCIceCandidateInit;

          try {
            aday =
              typeof sinyal.aday === "string"
                ? JSON.parse(sinyal.aday)
                : (sinyal.aday as any);
          } catch (hata) {
            console.error(" ICE aday JSON parse edilemedi:", hata);

            return;
          }

          const mesaj: AramaMesaji = {
            tip: "CALL_ICE",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,

            aday,
          };

          console.log(" GELEN CALL_ICE", "Gönderen:", gonderenKullaniciId);

          this.olayCalistir("ice", mesaj);

          void this.iceAdayiEkle(aday).catch((hata) => {
            if (this.aramaSonlandiriliyor || !this.aramaOturumId) {
              console.warn("Eski aramanın ICE işlemi yok sayıldı:", hata);
              return;
            }

            console.error("ICE işlemi beklenmeyen şekilde başarısız:", hata);
          });

          break;
        }

        case "CALL_REJECT": {
          const mesaj: AramaMesaji = {
            tip: "CALL_REJECT",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,
          };

          console.log(" GELEN CALL_REJECT", "Gönderen:", gonderenKullaniciId);

          this.aramaSesiniDurdur();

          this.olayCalistir("reddet", mesaj);

          break;
        }

        case "CALL_END": {
          const mesaj: AramaMesaji = {
            tip: "CALL_END",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,
          };

          console.log(" GELEN CALL_END", "Gönderen:", gonderenKullaniciId);

          this.aramaSesiniDurdur(); // Önce UI'ye karşı tarafın aramayı bitirdiğini bildir.
          // Böylece aranan taraftaki kapatma butonu anında kaybolur.

          this.olayCalistir("bitir", mesaj); // Karşı taraf zaten CALL_END gönderdi.
          // Bu nedenle bağlantıyı kapatırken tekrar CALL_END göndermiyoruz.

          void this.aramayiBitir(true);

          break;
        }

        case "E2EE_KEY_EXCHANGE": {
          const sessionId = sinyal.aramaOturumId;
          const payload = sinyal.e2eeVerisi;
          if (
            !sessionId ||
            sessionId !== this.aramaOturumId ||
            typeof payload !== "string" ||
            payload.length === 0 ||
            payload.length > 2048
          ) {
            console.warn("E2EE sinyali geçersiz veya başka oturuma ait.");
            return;
          }
          const pending = {
            senderUserId: gonderenKullaniciId,
            sessionId,
            payload,
          };
          const handshake = this.e2eeHandshake;
          if (!handshake || !this.peerConnection) {
            if (this.e2eeBekleyenSinyaller.length >= 32) {
              console.warn("E2EE bekleyen sinyal sınırına ulaşıldı.");
              return;
            }
            this.e2eeBekleyenSinyaller.push(pending);
          } else {
            void handshake
              .handleSignal(
                pending.senderUserId,
                pending.sessionId,
                pending.payload,
              )
              .catch((hata) => {
                if (
                  this.e2eeHandshake === handshake &&
                  this.aramaOturumId === sessionId
                )
                  this.e2eeHatasi(hata);
              });
          }
          this.olayCalistir("e2ee", gonderenKullaniciId, sessionId, payload);
          break;
        }

        default:
          console.warn("  Bilinmeyen arama sinyal tipi:", sinyal.tip);
      }
    } catch (hata) {
      console.error(" Arama sinyali işlenemedi:", hata);

      const error =
        hata instanceof Error ? hata : new Error("Arama sinyali işlenemedi.");

      this.olayCalistir("hata", error);
    }
  } /*\*



   \* =========================================================



   \* BACKEND'E WEBRTC SIGNALING GÖNDER



   \* =========================================================



   */

  private async e2eeSinyaliGonder(
    payload: string,
    baglam: {
      nesil: number;
      sessionId: string;
      peerUserId: number;
      aramaTuru: AramaTuru;
    },
  ): Promise<void> {
    if (!payload || payload.length > 2048)
      throw new Error("E2EE sinyali geçersiz.");

    if (
      baglam.nesil !== this.aramaNesli ||
      baglam.sessionId !== this.aramaOturumId ||
      baglam.peerUserId !== this.arananKullaniciId ||
      this.aramaSonlandiriliyor
    ) {
      throw new Error("E2EE: Eski arama nesline ait sinyal engellendi.");
    }

    const sinyal: BackendAramaSinyali = {
      hedefKullaniciId: baglam.peerUserId,
      tur: baglam.aramaTuru,
      tip: "E2EE_KEY_EXCHANGE",
      sdp: null,
      aday: null,
      sdpMid: null,
      sdpMLineIndex: null,
      aramaOturumId: baglam.sessionId,
      e2eeVerisi: payload,
    };

    const hariciGonderici = this.hariciSinyalGonderici;
    if (hariciGonderici) {
      await hariciGonderici(sinyal);
      return;
    }

    const client = this.stompClient;
    if (!client || !client.connected || !this.webSocketBagli)
      throw new Error("E2EE sinyali gönderilemedi: STOMP bağlı değil.");

    client.publish({
      destination: "/app/arama/sinyal",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sinyal),
    });
  }
  private async e2eeHandshakeOlustur(baslatanTaraf: boolean): Promise<void> {
    const pc = this.peerConnection;
    const sessionId = this.aramaOturumId;
    const localUserId = this.mevcutKullaniciId;
    const peerUserId = this.arananKullaniciId;

    if (!pc || !sessionId || localUserId === null || peerUserId === null) {
      throw new Error("E2EE: PeerConnection veya arama kimlikleri eksik.");
    }

    if (this.e2eeHandshake) {
      return;
    }

    const nesil = this.aramaNesli;
    const aramaTuru = this.aramaTuru;

    const handshake = new AramaE2EEHandshake({
      peerConnection: pc,
      sessionId,
      localUserId,
      peerUserId,
      sendSignal: (payload) =>
        this.e2eeSinyaliGonder(payload, {
          nesil,
          sessionId,
          peerUserId,
          aramaTuru,
        }),
    });

    this.e2eeHandshake = handshake;

    try {
      if (baslatanTaraf) {
        await handshake.startInitiator();
      } else {
        const pendingSignals = this.e2eeBekleyenSinyaller.filter(
          (item) => item.sessionId === sessionId,
        );

        this.e2eeBekleyenSinyaller = this.e2eeBekleyenSinyaller.filter(
          (item) => item.sessionId !== sessionId,
        );

        await handshake.startResponder(pendingSignals);
      }
    } catch (hata) {
      // Eski handshake'in hatası yeni aramayı sonlandırmamalı.
      const ayniAramaHalaAktif =
        this.aramaNesli === nesil &&
        this.e2eeHandshake === handshake &&
        this.aramaOturumId === sessionId &&
        this.peerConnection === pc &&
        !this.aramaSonlandiriliyor;

      if (ayniAramaHalaAktif) {
        this.e2eeHatasi(hata);
      } else {
        console.warn("Eski E2EE handshake hatası yok sayıldı:", hata);
      }

      throw hata;
    }
  }

  private async e2eeGondericileriEtkinlestir(
    trackleriEtkinlestir: boolean = true,
  ): Promise<void> {
    const nesil = this.aramaNesli;
    const peerConnection = this.peerConnection;
    const bekleyenler = this.e2eeBekleyenGondericiler;

    if (!peerConnection || this.aramaSonlandiriliyor) {
      throw new Error("E2EE: Aktif PeerConnection bulunamadı.");
    }

    const aramaHalaAyni = (): boolean =>
      this.aramaNesli === nesil &&
      this.peerConnection === peerConnection &&
      this.e2eeBekleyenGondericiler === bekleyenler &&
      !this.aramaSonlandiriliyor;

    for (const item of bekleyenler) {
      if (!aramaHalaAyni()) {
        console.warn("Eski arama E2EE gönderici işlemi durduruldu.");
        return;
      }

      const mevcutTrack = item.sender.track;

      if (mevcutTrack === item.track) {
        console.log(
          "E2EE: Sender zaten doğru track'e bağlı:",
          item.track.kind,
          item.track.id,
        );
      } else if (mevcutTrack == null) {
        await item.sender.replaceTrack(item.track);
        console.log(
          "E2EE: Sender track bağlandı:",
          item.track.kind,
          item.track.id,
        );
      } else {
        throw new Error(
          `E2EE: Beklenmeyen sender track'i. Tür: ${item.track.kind}`,
        );
      }

      if (!aramaHalaAyni()) {
        console.warn("Eski arama replaceTrack sonucu yok sayıldı.");
        return;
      }

      // Yalnızca video göndericisine maksimum 30 FPS uygula.
      if (item.track.kind === "video") {
        try {
          const parameters = item.sender.getParameters();

          if (!parameters.encodings?.length) {
            console.warn(
              "VIDEO FPS: RTP encoding bulunamadı, varsayılan ayarlar korunuyor.",
            );
          } else {
            for (const encoding of parameters.encodings) {
              encoding.maxFramerate = 60;
            }

            await item.sender.setParameters(parameters);

            if (!aramaHalaAyni()) {
              console.warn("Eski arama FPS sonucu yok sayıldı.");
              return;
            }

            const applied = item.sender
              .getParameters()
              .encodings.map(
                (encoding: RTCRtpEncodingParameters) => encoding.maxFramerate,
              );

            console.log("VIDEO FPS SINIRI UYGULANDI:", applied);
          }
        } catch (fpsError) {
          if (!aramaHalaAyni()) {
            console.warn("Eski aramanın FPS işlemi durduruldu.");
            return;
          }

          // FPS ayarı başarısız olsa bile E2EE güvenliği korunur.
          console.warn("VIDEO FPS AYARI UYGULANAMADI:", fpsError);
        }
      }

      if (!aramaHalaAyni()) {
        console.warn("Eski arama medya izi etkinleştirilmedi.");
        return;
      }

      if (trackleriEtkinlestir) {
        item.track.enabled = true;
      }
    }

    // Yalnızca hâlâ aynı aramaya ait listeyi temizle.
    if (trackleriEtkinlestir && aramaHalaAyni()) {
      this.e2eeBekleyenGondericiler = [];
    }
  }

  private e2eeHatasi(hata: unknown): void {
    const error =
      hata instanceof Error ? hata : new Error("E2EE handshake başarısız.");
    console.error("E2EE güvenli oturum kurulamadı:", error);
    this.olayCalistir("hata", error);
    void this.aramayiBitir().catch((cleanupHatasi) =>
      console.error(
        "E2EE hata sonrası arama temizliği başarısız:",
        cleanupHatasi,
      ),
    );
  }

  private async aramaSinyaliGonder(
    tip: string,
    bilgiler: {
      sdp?: string;
      aday?: RTCIceCandidateInit;
      e2eeVerisi?: string;
    } = {},
  ): Promise<void> {
    const hedefKullaniciId = this.arananKullaniciId;
    const aramaOturumId = this.aramaOturumId;

    if (!hedefKullaniciId) {
      throw new Error("Arama sinyali gönderilemedi: hedef kullanıcı yok.");
    }
    if (!aramaOturumId) {
      throw new Error("Arama sinyali gönderilemedi: oturum kimliği yok.");
    }
    if (this.aramaSonlandiriliyor && tip !== "CALL_END") {
      throw new Error("Arama sonlandırıldığı için sinyal gönderilemedi.");
    }

    const sinyal: BackendAramaSinyali = {
      hedefKullaniciId,
      tur: this.aramaTuru,
      tip,
      sdp: bilgiler.sdp ?? null,
      aday: bilgiler.aday ? JSON.stringify(bilgiler.aday) : null,
      sdpMid: bilgiler.aday?.sdpMid ?? null,
      sdpMLineIndex: bilgiler.aday?.sdpMLineIndex ?? null,
      aramaOturumId,
      e2eeVerisi: bilgiler.e2eeVerisi ?? null,
    };

    console.log(
      "📤 ARAMA SİNYALİ GÖNDERİLİYOR:",
      tip,
      "Hedef:",
      hedefKullaniciId,
    );

    // CALL_OFFER ACK korelasyonu useMessages taşıyıcısında kurulur.
    // Native fallback yalnızca publish yapabildiğinden ACK garantisi veremez.
    if (tip === "CALL_OFFER" && !this.hariciSinyalGonderici) {
      throw new Error(
        "CALL_OFFER_ACK için harici STOMP sinyal taşıyıcısı gerekli.",
      );
    }

    if (this.hariciSinyalGonderici) {
      await this.hariciSinyalGonderici(sinyal);
      console.log("🟢 ARAMA SİNYALİ HARİCİ TAŞIYICIYLA TAMAMLANDI:", tip);
      return;
    }

    const client = this.stompClient;
    if (!client || !client.connected || !this.webSocketBagli) {
      throw new Error("Arama sinyali gönderilemedi: STOMP bağlı değil.");
    }

    client.publish({
      destination: "/app/arama/sinyal",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sinyal),
    });
    console.log("🟢 ARAMA SİNYALİ STOMP ÜZERİNDEN YAYINLANDI:", tip);
  }

  private bekleyenGidenIceAdaylariniGonder(): Promise<void> {
    const nesil = this.aramaNesli;

    if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
      return Promise.reject(
        new Error(
          "Arama sonlandırıldı; bekleyen ICE adayları gönderilmeyecek.",
        ),
      );
    }

    const mevcut = this.gidenIceAktarimPromise;

    if (mevcut?.nesil === nesil) {
      return mevcut.promise;
    }

    const promise = this.bekleyenGidenIceAdaylariniGonderInternal(nesil);
    const kayit = { nesil, promise };

    this.gidenIceAktarimPromise = kayit;

    void promise
      .finally(() => {
        if (this.gidenIceAktarimPromise !== kayit) {
          return;
        }

        this.gidenIceAktarimPromise = null;

        const tekrarDenemeIstendi = this.gidenIceTekrarDenemeIstendi;
        this.gidenIceTekrarDenemeIstendi = false;

        if (
          tekrarDenemeIstendi &&
          nesil === this.aramaNesli &&
          !this.aramaSonlandiriliyor &&
          !!this.aramaOturumId &&
          !this.offerAckBekleniyor &&
          this.bekleyenGidenIceAdaylari.length > 0
        ) {
          console.log(
            "🔄 STOMP RECONNECT SONRASI KALAN ICE ADAYLARI TEKRAR GÖNDERİLİYOR.",
          );
          void this.bekleyenGidenIceAdaylariniGonder().catch((hata) => {
            if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
              return;
            }
            console.error(
              "❌ STOMP RECONNECT SONRASI ICE TEKRAR DENEMESİ BAŞARISIZ:",
              hata,
            );
          });
        }
      })
      .catch(() => undefined);

    return promise;
  }

  private async bekleyenGidenIceAdaylariniGonderInternal(
    nesil: number,
  ): Promise<void> {
    if (
      nesil !== this.aramaNesli ||
      this.aramaSonlandiriliyor ||
      !this.aramaOturumId
    ) {
      throw new Error("Arama oturumu değişti; bekleyen ICE gönderilemedi.");
    }

    this.gidenIceAktarimiSuruyor = true;

    try {
      while (this.bekleyenGidenIceAdaylari.length > 0) {
        if (
          nesil !== this.aramaNesli ||
          this.aramaSonlandiriliyor ||
          !this.aramaOturumId
        ) {
          throw new Error("Arama oturumu değişti; bekleyen ICE gönderilemedi.");
        }

        const aday = this.bekleyenGidenIceAdaylari[0];

        if (!aday) {
          this.bekleyenGidenIceAdaylari.shift();
          continue;
        }

        await this.aramaSinyaliGonder("CALL_ICE", { aday });

        if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
          throw new Error("ICE gönderimi sırasında arama oturumu değişti.");
        }

        // Aday yalnızca gönderim başarılı olduktan sonra kuyruktan çıkarılır.
        if (this.bekleyenGidenIceAdaylari[0] === aday) {
          this.bekleyenGidenIceAdaylari.shift();
        }
      }

      console.log("BEKLEYEN GİDEN ICE ADAYLARI SIRAYLA GÖNDERİLDİ.");
    } catch (hata) {
      // Gönderilemeyen adayları silme. Aynı oturumda kuyrukta koru.
      throw hata;
    } finally {
      // Eski aramanın finally bloğu yeni aramanın bayraklarını değiştiremez.
      if (nesil === this.aramaNesli) {
        this.gidenIceAktarimiSuruyor = false;
        this.offerAckBekleniyor = false;
      }
    }
  }

  /*\*



   \* =========================================================



   \* KAMERA / MİKROFON



   \* =========================================================



   */

  async medyaAkisiniAl(): Promise<MediaStream> {
    const nesil = this.aramaNesli;
    this.aramaNesliniDogrula(nesil);
    try {
      console.log(" Mikrofon/kamera erişimi isteniyor...");

      const audioOturumuBaslatildi = this.aramaAudioOturumunuBaslat();

      if (!audioOturumuBaslatildi) {
        console.warn(
          "  Android call audio oturumu başlatılamadı; WebRTC medya akışı yine de alınacak.",
        );
      }
      console.log("🟢 GET USER MEDIA BAŞLIYOR", {
        nesil,
        mevcutNesil: this.aramaNesli,
        aramaTuru: this.aramaTuru,
        zaman: Date.now(),
      });
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video:
          this.aramaTuru === "VIDEO"
            ? {
                facingMode: "user",
                width: 640,
                height: 480,
                frameRate: 60,
              }
            : false,
      });
      console.log("🟢 GET USER MEDIA TAMAMLANDI", {
        nesil,
        mevcutNesil: this.aramaNesli,
        streamId: stream.id,
        tracks: stream.getTracks().map((track) => ({
          id: track.id,
          kind: track.kind,
          readyState: track.readyState,
        })),
        zaman: Date.now(),
      });
      // Medya izni beklenirken arama değişmiş olabilir.
      if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
        console.error(
          "🔴 KAMERA AKIŞI NESİL UYUŞMAZLIĞI NEDENİYLE DURDURULUYOR",
          {
            medyaNesli: nesil,
            mevcutNesil: this.aramaNesli,
            aramaSonlandiriliyor: this.aramaSonlandiriliyor,
            streamId: stream.id,
          },
        );

        console.trace("🔴 İLK KAMERA STOP ÇAĞRI ZİNCİRİ");

        stream.getTracks().forEach((track) => track.stop());

        throw new Error(
          "Medya akışı eski arama nesline ait; kullanıma alınmadı.",
        );
      }

      this.yerelStream = stream;

      console.log(" Yerel medya akışı alındı.");

      console.log(" Audio track sayısı:", stream.getAudioTracks().length);

      console.log(" Video track sayısı:", stream.getVideoTracks().length);

      return stream;
    } catch (hata) {
      console.error(" Mikrofon/kamera erişim hatası:", hata);

      const error =
        hata instanceof Error
          ? hata
          : new Error("Mikrofon veya kamera erişilemedi.");

      if (nesil === this.aramaNesli && !this.aramaSonlandiriliyor) {
        this.olayCalistir("hata", error);
      }

      throw error;
    }
  } /*\*



   \* =========================================================



   \* PEER CONNECTION



   \* =========================================================



   */

  async baglantiOlustur(): Promise<RTCPeerConnection> {
    const nesil = this.aramaNesli;
    this.aramaNesliniDogrula(nesil);

    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    if (this.peerConnection) {
      const mevcutPeerConnection = this.peerConnection;

      console.log(" Mevcut RTCPeerConnection kullanılıyor."); // ÖNEMLİ:
      // PeerConnection daha önce oluşturulmuş olabilir ancak yerel medya
      // henüz hazır olmayabilir. Bu durumda doğrudan return etmek,
      // createOffer()'ın track'ler eklenmeden çalışmasına neden olur.
      // Sonuç olarak ikinci offer'da m-line sırası değişir ve WebRTC:
      // "The order of m-lines in subsequent offer..." hatası verir.

      if (!this.yerelStream) {
        await this.medyaAkisiniAl();

        this.aramaNesliniDogrula(nesil);

        if (this.peerConnection !== mevcutPeerConnection) {
          throw new Error("Medya hazırlanırken PeerConnection değişti.");
        }
      }

      if (this.yerelStream) {
        const transceivers = mevcutPeerConnection.getTransceivers();
        this.yerelStream.getTracks().forEach((track) => {
          if (
            this.e2eeBekleyenGondericiler.some(
              (item) => item.track.id === track.id,
            )
          )
            return;

          console.log("========== TRANSCEIVER KARŞILAŞTIRMA ==========");

          transceivers.forEach((item: any, index: number) => {
            console.log("TRANSCEIVER:", {
              index,
              mid: item.mid,
              kind: item.receiver?.track?.kind,
              receiverTrackId: item.receiver?.track?.id,
              senderTrackId: item.sender?.track?.id,
              direction: item.direction,
              currentDirection: item.currentDirection,
              stopped: item.stopped,
            });
          });

          console.log(
            "YEREL TRACKLER:",
            this.yerelStream?.getTracks().map((track) => ({
              id: track.id,
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
            })),
          );
          // Remote SDP içindeki ilgili medya bölümünün MID değerini bul.
          const remoteSdp = mevcutPeerConnection.remoteDescription?.sdp ?? "";
          const remoteMediaSection = remoteSdp
            .split(/(?=m=)/)
            .find((section) => section.startsWith(`m=${track.kind} `));

          const remoteMid = remoteMediaSection
            ?.match(/(?:^|\r?\n)a=mid:([^\r\n]+)/)?.[1]
            ?.trim();

          // Öncelik, uzak SDP'deki MID ile eşleşen transceiver'dadır.
          let transceiver: any = remoteMid
            ? transceivers.find(
                (item: any) =>
                  item.mid === remoteMid &&
                  item.receiver?.track?.kind === track.kind &&
                  !item.stopped,
              )
            : undefined;

          // Remote MID henüz yoksa kullanılmamış sender'ı seç.
          if (!transceiver) {
            const adaylar = transceivers.filter(
              (item: any) =>
                item.receiver?.track?.kind === track.kind &&
                !item.stopped &&
                !item.sender?.track &&
                !this.e2eeBekleyenGondericiler.some(
                  (pending) => pending.sender === item.sender,
                ),
            );

            // Remote SDP mevcutsa MID atanmış transceiver önceliklidir.
            transceiver =
              (remoteSdp
                ? adaylar.find((item: any) => item.mid !== null)
                : undefined) ?? adaylar[0];
          }

          if (!transceiver?.sender) {
            throw new Error(
              `E2EE: ${track.kind} için doğru ve kullanılabilir transceiver sender bulunamadı. MID: ${remoteMid ?? "yok"}`,
            );
          }

          // Yerel medya gönderebilmek için transceiver yönünü düzenle.
          // Uzak SDP'nin izin vermediği yön yine WebRTC tarafından kısıtlanır.
          if (
            transceiver.direction === "recvonly" ||
            transceiver.direction === "inactive"
          ) {
            transceiver.direction = "sendrecv";
          }

          // Aynı sender'a ikinci bir track kuyruğu ekleme.
          if (
            this.e2eeBekleyenGondericiler.some(
              (pending) => pending.sender === transceiver.sender,
            )
          ) {
            return;
          }

          console.log("YEREL TRACK TRANSCEIVER EŞLEŞMESİ:", {
            trackKind: track.kind,
            trackId: track.id,
            remoteMid,
            selectedMid: transceiver.mid,
            direction: transceiver.direction,
            senderTrackId: transceiver.sender.track?.id ?? null,
          });

          track.enabled = false;
          this.e2eeBekleyenGondericiler.push({
            sender: transceiver.sender,
            track,
            detached: transceiver.sender.track == null,
          });
        });
      }

      this.aramaNesliniDogrula(nesil);

      if (this.peerConnection !== mevcutPeerConnection) {
        throw new Error("Mevcut PeerConnection artık aktif değil.");
      }

      return mevcutPeerConnection;
    }

    console.log(" RTCPeerConnection oluşturuluyor...");

    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceSunucular,
    });

    this.peerConnection = peerConnection;

    this.remoteDescriptionHazir = false;

    this.webRtcBaglandiBildirildi = false;
    this.e2eeBekleyenGondericiler = [];
    const audioTransceiver = peerConnection.addTransceiver("audio", {
      direction: "sendrecv",
    });
    const videoTransceiver =
      this.aramaTuru === "VIDEO"
        ? peerConnection.addTransceiver("video", { direction: "sendrecv" })
        : null;

    if (!this.yerelStream) {
      await this.medyaAkisiniAl();

      this.aramaNesliniDogrula(nesil);

      if (this.peerConnection !== peerConnection) {
        throw new Error("Medya hazırlanırken yeni PeerConnection değişti.");
      }
    }

    this.aramaNesliniDogrula(nesil);

    if (this.peerConnection !== peerConnection) {
      throw new Error("PeerConnection artık bu arama nesline ait değil.");
    }

    if (this.yerelStream) {
      this.yerelStream.getTracks().forEach((track) => {
        const sender =
          track.kind === "audio"
            ? audioTransceiver.sender
            : track.kind === "video"
              ? videoTransceiver?.sender
              : undefined;
        if (!sender)
          throw new Error(
            `E2EE: ${track.kind} için transceiver sender bulunamadı.`,
          );
        track.enabled = false;
        this.e2eeBekleyenGondericiler.push({
          sender,
          track,
          detached: sender.track == null,
        });
      });
    }
    peerConnection.ontrack = (event: any) => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      console.log("========== UZAK TRACK KONTROLÜ ==========");

      console.log("Uzak medya akışı geldi.");

      console.log("Track türü:", event.track?.kind);
      console.log("Track ID:", event.track?.id);
      console.log("Track enabled:", event.track?.enabled);
      console.log("Track muted:", event.track?.muted);
      console.log("Track readyState:", event.track?.readyState);

      console.log("Stream sayısı:", event.streams?.length ?? 0);

      if (event.streams?.[0]) {
        console.log(
          "Uzak ses track sayısı:",
          event.streams[0].getAudioTracks().length,
        );

        console.log(
          "Uzak görüntü track sayısı:",
          event.streams[0].getVideoTracks().length,
        );
      }

      console.log("==========================================");

      if (event.track) {
        console.log(
          "Uzak track:",
          event.track.kind,
          "id:",
          event.track.id,
          "enabled:",
          event.track.enabled,
          "muted:",
          event.track.muted,
          "readyState:",
          event.track.readyState,
        );

        if (event.track.kind === "audio") {
          console.log("UZAK SES TRACK'İ ALINDI");

          try {
            event.track.enabled = true;
          } catch (hata) {
            console.warn("Uzak audio track aktif edilemedi:", hata);
          }
        }

        if (event.track.kind === "video") {
          console.log("UZAK GÖRÜNTÜ TRACK'İ ALINDI");

          try {
            event.track.enabled = true;
          } catch (hata) {
            console.warn("Uzak video track aktif edilemedi:", hata);
          }
        }
      }

      let uzakStream: MediaStream | null = null;

      if (event.streams && event.streams.length > 0) {
        uzakStream = event.streams[0] as MediaStream;
      } else {
        if (!this.uzakStream) {
          this.uzakStream = new MediaStream();
        }

        uzakStream = this.uzakStream;

        if (event.track) {
          try {
            const mevcutTrack = uzakStream
              .getTracks()
              .some((track) => track.id === event.track.id);

            if (!mevcutTrack) {
              uzakStream.addTrack(event.track);
            }
          } catch (hata) {
            console.warn("Uzak track stream'e eklenemedi:", hata);
          }
        }
      }

      if (!uzakStream) {
        console.warn("Uzak medya stream'i oluşturulamadı.");

        return;
      }

      this.uzakStream = uzakStream;

      console.log("========== UZAK STREAM SON DURUM ==========");

      console.log("Uzak stream ID:", uzakStream.id);

      console.log("Uzak audio track:", uzakStream.getAudioTracks().length);

      console.log("Uzak video track:", uzakStream.getVideoTracks().length);

      uzakStream.getTracks().forEach((track) => {
        console.log("Stream track:", {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      console.log("===========================================");

      this.olayCalistir("uzakStream", uzakStream);
    };

    peerConnection.onicecandidate = (event: any) => {
      // Eski veya kapatılmış aramanın ICE sinyalini gönderme.
      if (
        nesil !== this.aramaNesli ||
        this.aramaSonlandiriliyor ||
        this.peerConnection !== peerConnection ||
        !this.aramaOturumId
      ) {
        console.log(
          "ICE adayı yok sayıldı: arama kapalı veya oturum değişmiş.",
        );
        return;
      }

      if (!event.candidate) {
        console.log("ICE Candidate üretimi tamamlandı.");
        return;
      }

      const aday = event.candidate.toJSON();

      console.log("ICE Candidate üretildi.");

      this.iceGonder(aday);
    };

    peerConnection.onconnectionstatechange = () => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      const durum = peerConnection.connectionState;

      console.log(" WebRTC bağlantı durumu:", durum);

      if (durum === "connected") {
        this.statsOlcumunuBaslat(peerConnection, nesil);

        console.log(" WEBRTC BAĞLANTISI KURULDU!");

        if (!this.webRtcBaglandiBildirildi) {
          this.webRtcBaglandiBildirildi = true;

          this.aramaSesiniDurdur(); // WebRTC bağlandıktan sonra ses yönlendirmesini değiştirme.
          // Başlangıç yönlendirmesi arama türüne göre zaten belirlendi.
          // Kullanıcının manuel hoparlör/ahize tercihi korunur.

          console.log(
            this.hoparlorAcik
              ? " Bağlantı kuruldu: HOPARLÖR AÇIK"
              : " Bağlantı kuruldu: AHİZE AÇIK",
          );

          this.olayCalistir("baglandi");
        }
      }

      if (
        durum === "disconnected" ||
        durum === "failed" ||
        durum === "closed"
      ) {
        console.log(" WebRTC bağlantısı koptu:", durum);

        if (!this.aramaSonlandiriliyor) {
          this.olayCalistir("baglantiKoptu");
        }
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      const durum = peerConnection.iceConnectionState;

      console.log("📡 ICE DURUMU:", durum);
      console.log("📡 PEER CONNECTION DURUMU:", peerConnection.connectionState);
      console.log("📡 SIGNALING DURUMU:", peerConnection.signalingState);
      console.log("📡 ICE GATHERING DURUMU:", peerConnection.iceGatheringState);

      if (durum === "connected" || durum === "completed") {
        console.log("✅ ICE BAĞLANTISI KURULDU:", durum);
      }

      if (durum === "failed") {
        console.error("❌ ICE BAĞLANTISI BAŞARISIZ.");

        this.olayCalistir(
          "hata",
          new Error("WebRTC ICE bağlantısı kurulamadı."),
        );
      }

      if (durum === "disconnected") {
        console.warn("⚠️ ICE BAĞLANTISI KESİLDİ.");
      }

      if (durum === "checking") {
        console.log("⏳ ICE bağlantı yolu kontrol ediliyor.");
      }
    };

    peerConnection.onicecandidateerror = (event: any) => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      console.error("❌ ICE CANDIDATE ERROR:", {
        errorCode: event?.errorCode,
        errorText: event?.errorText,
        url: event?.url,
      });
    };

    peerConnection.onicegatheringstatechange = () => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      console.log(" ICE gathering durumu:", peerConnection.iceGatheringState);
    };

    peerConnection.onsignalingstatechange = () => {
      if (
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        return;
      }

      console.log(" Signaling durumu:", peerConnection.signalingState);
    };

    return peerConnection;
  } /*\*



   \* =========================================================



   \* ARAMA BAŞLAT



   \* =========================================================



   */

  async aramaBaslat(): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    } // Aynı arama için aramaBaslat() birden fazla kez tetiklenirse
    // ikinci çağrı ilk çağrının sonucunu bekler.
    //
    // ÖNEMLİ:
    // Eski yapıda ikinci çağrı "offerOlusturuluyor" hatası fırlatıyor,
    // üst katman da bunu aramayı kapatma sebebi olarak yorumlayabiliyordu.
    // Sonuçta ilk createOffer tamamlanmadan PeerConnection kapanıyor
    // ve:
    // "Failed to set local offer sdp: Called in wrong state: closed"
    // hatası oluşuyordu.

    if (this.aramaBaslatPromise) {
      console.warn(
        " Arama zaten başlatılıyor. İkinci arama başlatma isteği ilk işlemi bekleyecek.",
      );

      return this.aramaBaslatPromise;
    }

    const baslatmaNesli = this.aramaNesli;
    const baslatmaPromise = this.aramaBaslatInternal();

    this.aramaBaslatPromise = baslatmaPromise;

    try {
      return await baslatmaPromise;
    } catch (hata) {
      // Yalnızca hatanın ait olduğu arama hâlâ aktifse temizlik yap.
      if (this.aramaNesli === baslatmaNesli && !this.aramaSonlandiriliyor) {
        try {
          await this.aramayiBitir();
        } catch (cleanupHatasi) {
          console.error(
            "CALL_OFFER başarısızlığı sonrası temizlik hatası:",
            cleanupHatasi,
          );
        }
      } else {
        console.warn(
          "Eski arama başlatma işlemi hata verdi. Yeni aramaya dokunulmadı.",
        );
      }

      throw hata;
    } finally {
      // Sadece halen aynı Promise tutuluyorsa temizle.
      if (this.aramaBaslatPromise === baslatmaPromise) {
        this.aramaBaslatPromise = null;
      }
    }
  } /*\*



   \* =========================================================



   \* ARAMA BAŞLAT - ASIL İŞLEM



   \* =========================================================



   */

  private aramaNesliniDogrula(nesil: number): void {
    if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
      throw new Error("Arama oturumu değişti veya sonlandırıldı.");
    }
  }

  private async aramaBaslatInternal(): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    const nesil = this.aramaNesli;
    this.aramaNesliniDogrula(nesil);

    console.log("======================================");

    if (this.hariciSinyalGonderici) {
      console.log(" HARİCİ STOMP TAŞIYICISI KULLANILIYOR");
    } else {
      console.log(" ARAMA BAŞLATMADAN ÖNCE STOMP KONTROLÜ");

      console.log(" STOMP bağlı mı:", this.webSocketBagliMi());

      console.log("======================================");

      await this.webSocketBaglantisiAc();
      this.aramaNesliniDogrula(nesil);

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket bağlantısı hazır değil.");
      }

      console.log(" ARAMA İÇİN STOMP HAZIR");

      console.log(" Arama topic:", `/topic/arama/${this.mevcutKullaniciId}`);
    }

    this.offerOlusturuluyor = false; // Giden arama başlarken Android call-audio oturumunu aç.
    // SES: ahize, VIDEO: hoparlör.

    this.aramaAudioOturumunuBaslat(); // Karşı taraf cevap verene kadar giden arama için ringback sesi çal.

    await this.aramaSesiniBaslat();
    this.aramaNesliniDogrula(nesil);

    const peerConnection = await this.baglantiOlustur();
    this.aramaNesliniDogrula(nesil);
    if (this.peerConnection !== peerConnection) {
      throw new Error("Arama PeerConnection nesli değişti.");
    } // PeerConnection cleanup sırasında kapandıysa yeni offer üretmeye
    // çalışmayalım. Bu kontrol "closed" hatasını daha anlaşılır hale getirir.

    if ((peerConnection.signalingState as string) === "closed") {
      throw new Error("WebRTC PeerConnection arama başlamadan önce kapandı.");
    } // Aynı Promise koruması nedeniyle normal şartlarda buraya ikinci
    // createOffer çağrısı ulaşmaz. Yine de güvenlik kontrolü bırakıyoruz.

    if (this.offerOlusturuluyor) {
      console.warn(
        " WebRTC Offer halen oluşturuluyor. Mevcut arama işlemi korunuyor.",
      );

      if (
        peerConnection.localDescription?.type === "offer" &&
        peerConnection.localDescription.sdp
      ) {
        return {
          type: peerConnection.localDescription.type,

          sdp: peerConnection.localDescription.sdp,
        };
      }

      throw new Error("WebRTC Offer halen oluşturuluyor.");
    } // Arayan tarafta yeni offer üretilecekse signaling state stable olmalı.

    if (peerConnection.signalingState !== "stable") {
      const mevcutOffer = peerConnection.localDescription;

      if (mevcutOffer?.type === "offer" && mevcutOffer.sdp) {
        console.warn(
          "  PeerConnection zaten local offer içeriyor. Mevcut offer tekrar gönderiliyor.",
        );

        const mevcutTeklif: RTCSessionDescriptionInit = {
          type: mevcutOffer.type,

          sdp: mevcutOffer.sdp,
        };

        this.offerAckBekleniyor = true;

        this.aramaNesliniDogrula(nesil);

        await this.aramaSinyaliGonder("CALL_OFFER", {
          sdp: mevcutOffer.sdp,
        });

        this.aramaNesliniDogrula(nesil);

        await this.bekleyenGidenIceAdaylariniGonder();

        this.aramaNesliniDogrula(nesil);

        await this.e2eeHandshakeOlustur(true);

        this.aramaNesliniDogrula(nesil);

        return mevcutTeklif;
      }

      throw new Error(
        `WebRTC Offer oluşturulamadı. Signaling durumu: ${peerConnection.signalingState}`,
      );
    }

    this.offerOlusturuluyor = true;

    try {
      console.log(" WebRTC Offer oluşturuluyor..."); // Offer oluşturulurken PeerConnection'ın kapatılmadığından emin ol.

      if ((peerConnection.signalingState as string) === "closed") {
        throw new Error(
          "WebRTC PeerConnection kapalı olduğu için Offer oluşturulamadı.",
        );
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,

        offerToReceiveVideo: this.aramaTuru === "VIDEO",
      });
      this.aramaNesliniDogrula(nesil);
      // createOffer tamamlandıktan sonra arama kapatılmış olabilir.
      // Kapalı PeerConnection'a setLocalDescription göndermiyoruz.

      if (
        (peerConnection.signalingState as string) === "closed" ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        throw new Error(
          "Arama Offer oluşturulurken sonlandırıldı; LocalDescription ayarlanmadı.",
        );
      }

      // setLocalDescription ICE üretimini hemen başlatabilir. ACK gelmeden
      // hiçbir adayın backend'e ulaşmaması için bayrağı önceden aç.
      this.offerAckBekleniyor = true;
      this.bekleyenGidenIceAdaylari = [];
      await peerConnection.setLocalDescription(offer);
      this.aramaNesliniDogrula(nesil);
      if (
        this.peerConnection !== peerConnection ||
        (peerConnection.signalingState as string) === "closed"
      ) {
        throw new Error("LocalDescription ayarlanırken arama sonlandırıldı.");
      }

      console.log(" WebRTC Offer oluşturuldu.");

      console.log(" LocalDescription ayarlandı.");

      console.log(" Offer signaling state:", peerConnection.signalingState);

      const teklif = {
        type: offer.type,

        sdp: offer.sdp,
      }; // CALL_OFFER yalnızca local description ayarlandıktan sonra gönderilir.

      // Harici sinyal göndericisi CALL_OFFER_ACK gelmeden resolve olmaz.
      await this.aramaSinyaliGonder("CALL_OFFER", {
        sdp: offer.sdp ?? undefined,
      });
      this.aramaNesliniDogrula(nesil);

      await this.bekleyenGidenIceAdaylariniGonder();
      this.aramaNesliniDogrula(nesil);

      await this.e2eeHandshakeOlustur(true);
      this.aramaNesliniDogrula(nesil);
      console.log(
        " CALL_OFFER ACK alındı, ICE kuyruğu boşaltıldı ve E2EE başlatıldı.",
      );

      return teklif;
    } finally {
      this.offerOlusturuluyor = false;
    }
  } /*\*



   \* =========================================================



   \* GELEN OFFER'I KABUL ET



   \* =========================================================



   */

  async teklifiKabulEt(
    teklif: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    if (this.gelenAramaKabulPromise) {
      console.warn("Gelen arama kabul işlemi zaten devam ediyor.");
      return this.gelenAramaKabulPromise;
    }

    const kabulPromise = this.teklifiKabulEtIcerik(teklif);
    this.gelenAramaKabulPromise = kabulPromise;

    try {
      return await kabulPromise;
    } finally {
      if (this.gelenAramaKabulPromise === kabulPromise) {
        this.gelenAramaKabulPromise = null;
      }
    }
  }

  private async teklifiKabulEtIcerik(
    teklif: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    console.log("========== GELEN ARAMA KABUL KONTROLÜ ==========");
    console.log("Aktif oturum:", this.aramaOturumId);
    console.log("Aranan kullanıcı:", this.arananKullaniciId);
    console.log("Mevcut kullanıcı:", this.mevcutKullaniciId);
    console.log("Arama nesli:", this.aramaNesli);
    console.log("================================================");

    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    if (!this.aramaOturumId) {
      throw new Error("Gelen arama oturum kimliği bulunamadı.");
    }

    if (!teklif.sdp) {
      throw new Error("Teklif SDP bilgisi bulunamadı.");
    }

    const nesil = this.aramaNesli;
    const oturumId = this.aramaOturumId;

    this.aramaNesliniDogrula(nesil);

    console.log("Gelen teklif kabul ediliyor.");
    console.log("Gelen arama oturum kimliği mevcut.");

    if (!this.hariciSinyalGonderici) {
      await this.webSocketBaglantisiAc();

      this.aramaNesliniDogrula(nesil);

      if (this.aramaOturumId !== oturumId) {
        throw new Error("Gelen arama oturumu değişti.");
      }

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket bağlantısı hazır değil.");
      }
    }

    this.aramaNesliniDogrula(nesil);

    // Gelen aramanın zilini durdur.
    this.aramaSesiniDurdur();

    // Geçici gelen arama ses oturumunu kapat.
    this.gelenAramaAudioOturumunuKapat();

    // Normal WebRTC çağrı ses oturumunu aç.
    this.aramaAudioOturumunuBaslat();

    const peerConnection = await this.baglantiOlustur();

    this.aramaNesliniDogrula(nesil);

    if (
      this.peerConnection !== peerConnection ||
      (peerConnection.signalingState as string) === "closed"
    ) {
      throw new Error("Gelen arama PeerConnection nesli değişti.");
    }

    const remoteDescription = new RTCSessionDescription({
      type: teklif.type,
      sdp: teklif.sdp,
    });

    console.log("RemoteDescription ayarlanıyor...");

    await peerConnection.setRemoteDescription(remoteDescription);

    this.aramaNesliniDogrula(nesil);

    if (
      this.peerConnection !== peerConnection ||
      (peerConnection.signalingState as string) === "closed"
    ) {
      throw new Error("RemoteDescription sırasında arama sonlandırıldı.");
    }

    this.remoteDescriptionHazir = true;

    // Uzak SDP geldikten sonra bekleyen E2EE sender'larını
    // gerçek MID değerlerine göre yeniden eşleştir.
    const remoteSections = (teklif.sdp ?? "").split(/(?=m=)/);
    const transceivers = peerConnection.getTransceivers();

    for (const pending of this.e2eeBekleyenGondericiler) {
      const mediaSection = remoteSections.find((section) =>
        section.startsWith(`m=${pending.track.kind} `),
      );

      const remoteMid = mediaSection
        ?.match(/(?:^|\r?\n)a=mid:([^\r\n]+)/)?.[1]
        ?.trim();

      if (!remoteMid) {
        throw new Error(
          `E2EE: ${pending.track.kind} için uzak SDP MID bulunamadı.`,
        );
      }

      const target = transceivers.find(
        (item: any) =>
          item.mid === remoteMid &&
          item.receiver?.track?.kind === pending.track.kind &&
          !item.stopped,
      );

      if (!target?.sender) {
        throw new Error(
          `E2EE: ${pending.track.kind} MID=${remoteMid} sender bulunamadı.`,
        );
      }

      if (target.sender.track && target.sender.track !== pending.track) {
        throw new Error(
          `E2EE: MID=${remoteMid} sender üzerinde beklenmeyen track var.`,
        );
      }

      const oldSender = pending.sender;

      if (oldSender !== target.sender) {
        console.warn("E2EE SENDER MID DÜZELTMESİ:", {
          kind: pending.track.kind,
          trackId: pending.track.id,
          oldMid:
            transceivers.find((item: any) => item.sender === oldSender)?.mid ??
            null,
          newMid: target.mid,
        });

        pending.sender = target.sender;
        pending.detached = target.sender.track == null;
      }

      if (target.direction === "recvonly" || target.direction === "inactive") {
        target.direction = "sendrecv";
      }

      console.log("E2EE SENDER MID DOĞRULANDI:", {
        kind: pending.track.kind,
        mid: target.mid,
        direction: target.direction,
        senderTrackId: target.sender.track?.id ?? null,
      });
    }

    console.log("RemoteDescription hazır.");

    await this.bekleyenIceAdaylariniEkle();

    this.aramaNesliniDogrula(nesil);

    if (this.peerConnection !== peerConnection) {
      throw new Error("ICE işlemi sırasında PeerConnection değişti.");
    }

    console.log("WebRTC Answer oluşturuluyor...");
    const videoSection = (teklif.sdp ?? "")
      .split(/(?=m=)/)
      .find((section) => section.startsWith("m=video "));

    const videoMid = videoSection
      ?.match(/(?:^|\r?\n)a=mid:([^\r\n]+)/)?.[1]
      ?.trim();

    const videoTransceiver = peerConnection
      .getTransceivers()
      .find(
        (t) =>
          t.mid === videoMid &&
          t.receiver.track?.kind === "video" &&
          !t.stopped,
      );

    console.log("========== ANSWER ÖNCESİ VIDEO DURUMU ==========");
    console.log("VIDEO TRANSCEIVER:", {
      mid: videoTransceiver?.mid,
      direction: videoTransceiver?.direction,
      currentDirection: videoTransceiver?.currentDirection,
      senderTrack: videoTransceiver?.sender.track?.id ?? null,
      senderTrackKind: videoTransceiver?.sender.track?.kind ?? null,
      senderTrackEnabled: videoTransceiver?.sender.track?.enabled ?? null,
    });

    const videoOfferSection = teklif.sdp
      ?.split(/(?=m=)/)
      .find((section) => section.startsWith("m=video"));

    console.log(
      "GELEN OFFER VIDEO YÖNÜ:",
      videoOfferSection?.match(
        /a=(sendrecv|sendonly|recvonly|inactive)/,
      )?.[0] ?? "YÖN BULUNAMADI",
    );
    console.log("========== TÜM TRANSCEIVER DURUMLARI ==========");

    peerConnection.getTransceivers().forEach((t, index) => {
      console.log(`TRANSCEIVER ${index}:`, {
        mid: t.mid,
        direction: t.direction,
        currentDirection: t.currentDirection,
        senderTrackId: t.sender.track?.id ?? null,
        senderTrackKind: t.sender.track?.kind ?? null,
        receiverTrackId: t.receiver.track?.id ?? null,
        receiverTrackKind: t.receiver.track?.kind ?? null,
        receiverTrackState: t.receiver.track?.readyState ?? null,
      });
    });

    console.log("========== OFFER MEDIA BÖLÜMLERİ ==========");

    const offerSections = (teklif.sdp ?? "").split(/(?=m=)/);

    offerSections.forEach((section, index) => {
      if (!section.startsWith("m=")) return;

      console.log(`OFFER MEDIA ${index}:`, {
        media: section.split("\r\n")[0],
        mid: section.match(/a=mid:(.+)/)?.[1] ?? null,
        direction:
          section.match(/a=(sendrecv|sendonly|recvonly|inactive)/)?.[0] ??
          "DEFAULT",
      });
    });
    // Önce E2EE el sıkışmasını tamamla.
    // Track bağlanacak ancak Answer gönderilene kadar kapalı kalacak.
    try {
      await this.e2eeHandshakeOlustur(false);

      this.aramaNesliniDogrula(nesil);

      const handshake = this.e2eeHandshake;

      if (!handshake) {
        throw new Error("E2EE handshake oturumu oluşturulamadı.");
      }

      await handshake.waitUntilReady(45_000);

      this.aramaNesliniDogrula(nesil);

      if (
        this.peerConnection !== peerConnection ||
        this.e2eeHandshake !== handshake
      ) {
        throw new Error("E2EE oturumu değişti.");
      }

      // Native E2EE sender hazır. Track'i Answer öncesinde bağla.
      // Track.enabled false kalmaya devam eder.
      await this.e2eeGondericileriEtkinlestir(false);

      this.aramaNesliniDogrula(nesil);
    } catch (e2eeHata) {
      const ayniAramaHalaAktif =
        this.aramaNesli === nesil &&
        this.aramaOturumId === oturumId &&
        this.peerConnection === peerConnection &&
        !this.aramaSonlandiriliyor;

      if (ayniAramaHalaAktif) {
        this.e2eeHatasi(e2eeHata);
      } else {
        console.warn("Eski gelen arama E2EE hatası yok sayıldı:", e2eeHata);
      }

      throw e2eeHata;
    }

    // Sender track bağlıyken Answer oluştur.
    const answer = await peerConnection.createAnswer();

    // GEÇİCİ SDP TEŞHİSİ
    const answerVideoSection = answer.sdp
      ?.split(/(?=m=)/)
      .find((section: string) => section.startsWith("m=video"));

    console.log("========== ANSWER VIDEO SDP ==========");
    console.log(answerVideoSection ?? "ANSWER VIDEO SECTION BULUNAMADI");

    console.log(
      "ANSWER VIDEO YÖNÜ:",
      answerVideoSection?.match(
        /a=(sendrecv|sendonly|recvonly|inactive)/,
      )?.[0] ?? "YÖN BULUNAMADI",
    );

    console.log("ANSWER ÖNCESİ TRANSCEIVER:");
    console.log({
      direction: videoTransceiver?.direction,
      currentDirection: videoTransceiver?.currentDirection,
      senderTrack: videoTransceiver?.sender.track?.id ?? null,
    });

    this.aramaNesliniDogrula(nesil);

    if (
      this.peerConnection !== peerConnection ||
      (peerConnection.signalingState as string) === "closed"
    ) {
      throw new Error("Answer oluşturulurken arama sonlandırıldı.");
    }

    await peerConnection.setLocalDescription(answer);

    this.aramaNesliniDogrula(nesil);

    if (
      this.peerConnection !== peerConnection ||
      (peerConnection.signalingState as string) === "closed"
    ) {
      throw new Error("LocalDescription sırasında arama sonlandırıldı.");
    }

    console.log("WebRTC Answer oluşturuldu.");

    await this.aramaSinyaliGonder("CALL_ANSWER", {
      sdp: answer.sdp ?? undefined,
    });

    this.aramaNesliniDogrula(nesil);

    if (this.peerConnection !== peerConnection) {
      throw new Error("CALL_ANSWER gönderilirken PeerConnection değişti.");
    }

    // Answer gönderildi. Artık yerel medya track'lerini etkinleştir.
    await this.e2eeGondericileriEtkinlestir(true);

    this.aramaNesliniDogrula(nesil);

    return {
      type: answer.type,
      sdp: answer.sdp,
    };
  }

  /*\*



   \* =========================================================



   \* ANSWER İŞLE



   \* =========================================================



   */

  async cevabiIsle(cevap: RTCSessionDescriptionInit) {
    const peerConnection = this.peerConnection;

    if (!peerConnection) {
      throw new Error("PeerConnection bulunamadı.");
    }

    if (!cevap.sdp) {
      throw new Error("Cevap SDP bilgisi bulunamadı.");
    }

    const nesil = this.aramaNesli;

    this.aramaNesliniDogrula(nesil);

    if (this.cevapIsleniyor) {
      console.warn("WebRTC Answer zaten işleniyor, ikinci cevap yok sayıldı.");
      return;
    }

    if (peerConnection.signalingState !== "have-local-offer") {
      const mevcutRemote = peerConnection.remoteDescription;

      if (mevcutRemote?.type === "answer") {
        console.warn("WebRTC Answer zaten işlendi.");
        this.remoteDescriptionHazir = true;

        await this.bekleyenIceAdaylariniEkle();

        this.aramaNesliniDogrula(nesil);

        if (this.peerConnection !== peerConnection) {
          throw new Error("ICE işlemi sırasında PeerConnection değişti.");
        }
      } else {
        console.warn(
          "WebRTC Answer beklenen signalingState'te değil:",
          peerConnection.signalingState,
        );
      }

      return;
    }

    this.cevapIsleniyor = true;

    try {
      console.log("WebRTC Answer işleniyor...");
      console.log("Answer signaling state:", peerConnection.signalingState);

      const remoteDescription = new RTCSessionDescription({
        type: cevap.type,
        sdp: cevap.sdp,
      });

      await peerConnection.setRemoteDescription(remoteDescription);

      this.aramaNesliniDogrula(nesil);

      if (this.peerConnection !== peerConnection) {
        throw new Error("RemoteDescription sırasında PeerConnection değişti.");
      }

      this.remoteDescriptionHazir = true;

      console.log("WebRTC Answer işlendi.");

      await this.bekleyenIceAdaylariniEkle();

      this.aramaNesliniDogrula(nesil);

      if (this.peerConnection !== peerConnection) {
        throw new Error("ICE işlemi sırasında PeerConnection değişti.");
      }

      const handshake = this.e2eeHandshake;

      if (!handshake) {
        throw new Error("E2EE: CALL_ANSWER geldi ancak handshake bulunamadı.");
      }

      await handshake.waitUntilReady(45_000);

      this.aramaNesliniDogrula(nesil);

      if (
        this.peerConnection !== peerConnection ||
        this.e2eeHandshake !== handshake
      ) {
        throw new Error(
          "E2EE: Anahtar doğrulaması sırasında arama oturumu değişti.",
        );
      }

      await this.e2eeGondericileriEtkinlestir();

      this.aramaNesliniDogrula(nesil);

      if (this.peerConnection !== peerConnection) {
        throw new Error("E2EE etkinleştirilirken PeerConnection değişti.");
      }
    } catch (hata) {
      console.error("WebRTC Answer işlenemedi:", hata);

      if (
        this.aramaNesli === nesil &&
        !this.aramaSonlandiriliyor &&
        this.peerConnection === peerConnection &&
        this.e2eeHandshake
      ) {
        this.e2eeHatasi(hata);
      }

      throw hata;
    } finally {
      if (this.aramaNesli === nesil && this.peerConnection === peerConnection) {
        this.cevapIsleniyor = false;
      }
    }
  }

  async iceAdayiEkle(aday: RTCIceCandidateInit) {
    const nesil = this.aramaNesli;

    this.aramaNesliniDogrula(nesil);

    const peerConnection = this.peerConnection;

    if (!peerConnection) {
      console.warn("PeerConnection hazır değil. ICE bekletiliyor.");
      this.bekleyenIceAdaylari.push(aday);
      return;
    }

    if (!this.remoteDescriptionHazir) {
      console.log("RemoteDescription hazır değil. ICE bekletiliyor.");
      this.bekleyenIceAdaylari.push(aday);
      return;
    }

    try {
      const candidate = new RTCIceCandidate(aday);

      await peerConnection.addIceCandidate(candidate);

      if (
        nesil !== this.aramaNesli ||
        this.aramaSonlandiriliyor ||
        this.peerConnection !== peerConnection
      ) {
        console.warn("Eski arama ICE sonucu yok sayıldı.");
        return;
      }

      console.log("ICE Candidate eklendi.");
    } catch (hata) {
      if (
        nesil !== this.aramaNesli ||
        this.aramaSonlandiriliyor ||
        this.peerConnection !== peerConnection
      ) {
        console.warn("Eski arama ICE hatası yok sayıldı:", hata);
        return;
      }

      console.error("ICE Candidate eklenemedi:", hata);
    }
  }

  private async bekleyenIceAdaylariniEkle() {
    const nesil = this.aramaNesli;
    const peerConnection = this.peerConnection;

    if (!peerConnection || !this.remoteDescriptionHazir) {
      return;
    }

    if (this.bekleyenIceAdaylari.length === 0) {
      return;
    }

    this.aramaNesliniDogrula(nesil);

    console.log(
      "Bekleyen ICE adayları ekleniyor:",
      this.bekleyenIceAdaylari.length,
    );

    const adaylar = [...this.bekleyenIceAdaylari];

    this.bekleyenIceAdaylari = [];

    for (let i = 0; i < adaylar.length; i++) {
      if (
        nesil !== this.aramaNesli ||
        this.aramaSonlandiriliyor ||
        this.peerConnection !== peerConnection
      ) {
        console.warn("ICE kuyruğu eski arama nedeniyle durduruldu.");
        return;
      }

      if (!this.remoteDescriptionHazir) {
        this.bekleyenIceAdaylari.unshift(...adaylar.slice(i));
        console.warn("RemoteDescription kapandı. Kalan ICE adayları korundu.");
        return;
      }

      try {
        const candidate = new RTCIceCandidate(adaylar[i]);

        await peerConnection.addIceCandidate(candidate);

        if (
          nesil !== this.aramaNesli ||
          this.aramaSonlandiriliyor ||
          this.peerConnection !== peerConnection
        ) {
          console.warn("Eski aramanın ICE sonucu yok sayıldı.");
          return;
        }

        console.log("Bekleyen ICE eklendi.");
      } catch (hata) {
        if (
          nesil !== this.aramaNesli ||
          this.aramaSonlandiriliyor ||
          this.peerConnection !== peerConnection
        ) {
          console.warn("Eski aramanın ICE işlemi durduruldu:", hata);
          return;
        }

        console.error("Bekleyen ICE eklenemedi:", hata);

        // Aynı oturumda başarısız olan ve henüz işlenmeyen adayları koru.
        this.bekleyenIceAdaylari.unshift(...adaylar.slice(i));
        return;
      }
    }
  }

  private iceGonder(aday: RTCIceCandidateInit): void {
    const nesil = this.aramaNesli;

    if (this.aramaSonlandiriliyor || !this.aramaOturumId) {
      console.warn("Eski veya kapanan aramaya ait ICE adayı gönderilmedi.");
      return;
    }

    // Bütün adaylar aynı kuyruktan ve üretim sırasıyla gönderilir.
    this.bekleyenGidenIceAdaylari.push(aday);

    if (this.offerAckBekleniyor || this.gidenIceAktarimiSuruyor) {
      console.log(
        "⏳ GİDEN ICE ACK/AKTARIM NEDENİYLE BEKLETİLDİ:",
        this.bekleyenGidenIceAdaylari.length,
      );
      return;
    }

    console.log(
      "📤 GİDEN ICE KUYRUĞU BAŞLATILIYOR:",
      this.bekleyenGidenIceAdaylari.length,
    );

    void this.bekleyenGidenIceAdaylariniGonder().catch((hata) => {
      if (nesil !== this.aramaNesli || this.aramaSonlandiriliyor) {
        return;
      }

      const error =
        hata instanceof Error
          ? hata
          : new Error("ICE kuyruk aktarımı başarısız.");

      console.error("❌ GİDEN ICE KUYRUK AKTARIMI BAŞARISIZ:", error);
      this.olayCalistir("hata", error);
    });
  } /*\*



   \* =========================================================



   \* ARAMAYI REDDET



   \* =========================================================



   */

  aramayiReddet() {
    if (!this.arananKullaniciId) {
      return;
    }

    console.log(" Arama reddediliyor.");

    this.aramaSesiniDurdur();

    this.gelenAramaAudioOturumunuKapat();

    this.aramaAudioOturumunuKapat();

    void this.aramaSinyaliGonder("CALL_REJECT").catch((hata) => {
      console.warn("CALL_REJECT gönderilemedi:", hata);
    });
  } /*\*



   \* =========================================================



   \* ARAMAYI BİTİR



   \* =========================================================



   */

  private statsOlcumunuDurdur(): void {
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }

    this.statsOkumaSuruyor = false;
  }

  private statsOlcumunuBaslat(
    peerConnection: RTCPeerConnection,
    nesil: number,
  ): void {
    this.statsOlcumunuDurdur();

    let okumaSuruyor = false;

    const olcumYap = async (): Promise<void> => {
      if (
        okumaSuruyor ||
        nesil !== this.aramaNesli ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor ||
        peerConnection.connectionState !== "connected"
      ) {
        return;
      }

      okumaSuruyor = true;
      this.statsOkumaSuruyor = true;

      try {
        const rapor = await peerConnection.getStats();

        if (
          nesil !== this.aramaNesli ||
          this.peerConnection !== peerConnection ||
          this.aramaSonlandiriliyor
        ) {
          return;
        }

        const sonuclar: any[] = [];

        rapor.forEach((stat: any) => {
          if (stat.type !== "inbound-rtp" && stat.type !== "outbound-rtp") {
            return;
          }

          const codec = stat.codecId ? rapor.get(stat.codecId) : undefined;

          sonuclar.push({
            id: stat.id,
            type: stat.type,
            kind: stat.kind ?? stat.mediaType,

            // Gönderim ve alım verileri
            bytesSent: stat.bytesSent,
            packetsSent: stat.packetsSent,
            bytesReceived: stat.bytesReceived,
            packetsReceived: stat.packetsReceived,
            packetsLost: stat.packetsLost,

            // Video kare istatistikleri
            framesEncoded: stat.framesEncoded,
            framesSent: stat.framesSent,
            framesReceived: stat.framesReceived,
            framesDecoded: stat.framesDecoded,
            framesDropped: stat.framesDropped,
            keyFramesEncoded: stat.keyFramesEncoded,
            keyFramesDecoded: stat.keyFramesDecoded,

            // Görüntü boyutu ve performans
            frameWidth: stat.frameWidth,
            frameHeight: stat.frameHeight,
            framesPerSecond: stat.framesPerSecond,
            totalDecodeTime: stat.totalDecodeTime,

            // Ses istatistikleri
            audioLevel: stat.audioLevel,
            totalSamplesReceived: stat.totalSamplesReceived,
            totalSamplesSent: stat.totalSamplesSent,
            concealedSamples: stat.concealedSamples,
            jitter: stat.jitter,

            // Codec ve bağlantı bilgileri
            codecId: stat.codecId,
            codecMimeType: codec?.mimeType,
            codecPayloadType: codec?.payloadType,
            mid: stat.mid,
            ssrc: stat.ssrc,
            trackIdentifier: stat.trackIdentifier,

            // Ek bağlantı bilgileri
            retransmittedPacketsSent: stat.retransmittedPacketsSent,
            retransmittedBytesSent: stat.retransmittedBytesSent,
            nackCount: stat.nackCount,
            pliCount: stat.pliCount,
            firCount: stat.firCount,
          });
        });

        console.log(
          "📊 WEBRTC RTP DETAYLI İSTATİSTİKLERİ:",
          JSON.stringify(
            {
              aramaNesli: nesil,
              zaman: new Date().toISOString(),
              sonuclar,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        console.error("❌ WEBRTC GETSTATS HATASI:", error);
      } finally {
        okumaSuruyor = false;

        if (nesil === this.aramaNesli) {
          this.statsOkumaSuruyor = false;
        }
      }
    };

    void olcumYap();

    this.statsTimer = setInterval(() => {
      void olcumYap();
    }, 3000);
  }

  async aramayiBitir(karsiTarafBitirdi = false) {
    console.log("========== ARAMA TEMİZLEME ÇAĞRILDI ==========");
    console.log("Karşı taraf bitirdi:", karsiTarafBitirdi);
    console.log("Mevcut oturum:", this.aramaOturumId);
    console.log("Mevcut kullanıcı:", this.mevcutKullaniciId);
    console.log("Karşı kullanıcı:", this.arananKullaniciId);
    console.log("Arama nesli:", this.aramaNesli);
    console.trace("ARAMAYI_BITIR ÇAĞRI ZİNCİRİ");
    console.log("==============================================");
    console.log(
      "🔴 ARAMAYI BITIR ÇAĞRI YIĞINI:",
      {
        karsiTarafBitirdi,
        sessionId: this.aramaOturumId,
        peerUserId: this.arananKullaniciId,
        generation: this.aramaNesli,
      },
      new Error().stack,
    );
    if (this.aramaSonlandiriliyor) {
      console.log("Arama zaten sonlandırılıyor. İkinci cleanup atlandı.");
      return;
    }

    this.aramaSonlandiriliyor = true;
    this.statsOlcumunuDurdur();
    const cleanupNesli = ++this.aramaNesli;

    // Eski aramanın tüm kaynaklarını await öncesinde sabitle.
    const eskiSessionId = this.aramaOturumId;
    const eskiHedefKullaniciId = this.arananKullaniciId;
    const eskiAramaTuru = this.aramaTuru;
    const eskiHandshake = this.e2eeHandshake;
    const eskiPeerConnection = this.peerConnection;
    const eskiYerelStream = this.yerelStream;
    const eskiHariciGonderici = this.hariciSinyalGonderici;
    const eskiStompClient = this.stompClient;
    const eskiWebSocketBagli = this.webSocketBagli;

    // Yeni arama eski kaynaklara erişemesin.
    this.e2eeHandshake = null;
    this.peerConnection = null;
    this.yerelStream = null;
    this.uzakStream = null;

    this.bekleyenGelenTeklif = null;
    this.e2eeBekleyenSinyaller = [];
    this.e2eeBekleyenGondericiler = [];
    this.bekleyenIceAdaylari = [];
    this.bekleyenGidenIceAdaylari = [];

    this.offerAckBekleniyor = false;
    this.gidenIceAktarimiSuruyor = false;
    this.gidenIceTekrarDenemeIstendi = false;
    this.remoteDescriptionHazir = false;
    this.sonGelenOfferSdp = null;
    console.log("⚠️ ARAMA OTURUM KİMLİĞİ SİLİNİYOR:", {
      aramaOturumId: this.aramaOturumId,
      aramaNesli: this.aramaNesli,
    });
    this.aramaOturumId = null;
    this.cevapIsleniyor = false;
    this.ringtoneBaslatiliyor = false;
    this.webRtcBaglandiBildirildi = false;
    this.offerOlusturuluyor = false;
    this.aramaBaslatPromise = null;

    // Ortak Android ses oturumunu ilk await öncesinde kapat.
    this.aramaSesiniDurdur();
    this.gelenAramaAudioOturumunuKapat();
    this.sesYonlendirmesiniKapat();

    console.log(
      karsiTarafBitirdi
        ? "Karşı taraf aramayı bitirdi. Eski WebRTC kaynakları kapatılıyor."
        : "WebRTC görüşmesi sonlandırılıyor.",
    );

    // CALL_END yalnızca eski aramanın sabitlenmiş bilgileriyle gönderilir.
    if (!karsiTarafBitirdi && eskiHedefKullaniciId && eskiSessionId) {
      const sinyal: BackendAramaSinyali = {
        hedefKullaniciId: eskiHedefKullaniciId,
        tur: eskiAramaTuru,
        tip: "CALL_END",
        sdp: null,
        aday: null,
        sdpMid: null,
        sdpMLineIndex: null,
        aramaOturumId: eskiSessionId,
        e2eeVerisi: null,
      };

      try {
        if (eskiHariciGonderici) {
          await eskiHariciGonderici(sinyal);
        } else if (
          eskiStompClient &&
          eskiStompClient.connected &&
          eskiWebSocketBagli
        ) {
          eskiStompClient.publish({
            destination: "/app/arama/sinyal",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(sinyal),
          });
        }
      } catch (hata) {
        console.warn("CALL_END gönderilemedi:", hata);
      }
    } else if (karsiTarafBitirdi) {
      console.log("Gelen CALL_END için tekrar CALL_END gönderilmiyor.");
    }

    // Yalnızca eski handshake kapatılıyor.
    if (eskiHandshake) {
      try {
        await eskiHandshake.close(false);
      } catch (hata) {
        console.warn("Eski E2EE handshake temizliği başarısız:", hata);
      }
    }

    // Eski medya akışını kapat.
    if (eskiYerelStream) {
      console.error("🔴 ARAMA TEMİZLİĞİ KAMERAYI DURDURUYOR", {
        cleanupNesli,
        mevcutNesil: this.aramaNesli,
        streamId: eskiYerelStream.id,
        tracks: eskiYerelStream.getTracks().map((track) => ({
          id: track.id,
          kind: track.kind,
          readyState: track.readyState,
        })),
      });

      console.trace("🔴 ARAMA TEMİZLİĞİ STOP ÇAĞRI ZİNCİRİ");

      eskiYerelStream.getTracks().forEach((track) => {
        try {
          // Önce WebRTC track'ini sonlandır.
          track.stop();

          // Ardından native medya kaynağını serbest bırak.
          // Video track için bu işlem fiziksel kamerayı da kapatır.
          track.release();

          console.log("✅ NATIVE TRACK RELEASE TAMAMLANDI:", {
            trackId: track.id,
            kind: track.kind,
          });
        } catch (hata) {
          console.warn("Eski yerel track kapatma hatası:", hata);
        }
      });
    }

    // Yalnızca eski PeerConnection kapatılıyor.
    if (eskiPeerConnection) {
      try {
        eskiPeerConnection.ontrack = null;
        eskiPeerConnection.onicecandidate = null;
        eskiPeerConnection.onconnectionstatechange = null;
        eskiPeerConnection.oniceconnectionstatechange = null;
        eskiPeerConnection.onicegatheringstatechange = null;
        eskiPeerConnection.onsignalingstatechange = null;
        eskiPeerConnection.close();
      } catch (hata) {
        console.warn("Eski PeerConnection kapatma hatası:", hata);
      }
    }
    // Temizlik sırasında yeni arama başladıysa yeni aramanın
    // kaynaklarına dokunma, ancak eski temizliğin kilidini mutlaka aç.
    if (cleanupNesli !== this.aramaNesli) {
      console.log("Eski arama temizlendi; yeni arama durumu korundu.");

      this.aramaSonlandiriliyor = false;

      console.log("Eski aramanın sonlandırma kilidi açıldı.");
      return;
    }

    if (!karsiTarafBitirdi) {
      this.olayCalistir("baglantiKoptu");
    }

    // Her iki sonlandırma yolunda da kilit açılmalı.
    // Yeni aramanın temizleme işlemi engellenmemeli.
    this.aramaSonlandiriliyor = false;
    console.log("Arama temizliği tamamlandı. Sonlandırma kilidi açıldı.", {
      karsiTarafBitirdi,
    });
  } /*\*



   \* =========================================================



   \* STOMP BAĞLANTISINI KAPAT



   \* =========================================================



   */

  async webSocketBaglantisiniKapat() {
    if (this.hariciSinyalGonderici && !this.stompClient) {
      console.log(" Harici STOMP taşıyıcısı kullanılıyor.");

      console.log(" AramaWebRTC native STOMP bağlantısı kapatılmayacak.");

      this.webSocketBagli = false;

      this.webSocketBaglantiPromise = null;

      return;
    }

    console.log(" Arama STOMP bağlantısı kapatılıyor."); /*\*



     \* Subscription kapat



     */

    if (this.aramaSubscription) {
      try {
        this.aramaSubscription.unsubscribe();

        console.log(" Arama subscription kapatıldı.");
      } catch (hata) {
        console.warn("  Arama subscription kapatma hatası:", hata);
      }

      this.aramaSubscription = null;
    } /*\*



     \* STOMP client kapat



     */

    const client = this.stompClient;

    this.stompClient = null;

    this.webSocketBagli = false;

    this.webSocketBaglantiPromise = null;

    if (client) {
      try {
        if (client.active || client.connected) {
          console.log(" STOMP client deactivate çağrılıyor.");

          await client.deactivate();
        }
      } catch (hata) {
        console.warn("  STOMP client kapatma hatası:", hata);
      }
    }

    console.log(" Arama STOMP bağlantısı kapatıldı.");
  } /*\*



   \* =========================================================



   \* MİKROFON



   \* =========================================================



   */

  mikrofonuDegistir(acik: boolean) {
    if (!this.yerelStream) {
      return;
    }

    this.yerelStream.getAudioTracks().forEach((track) => {
      track.enabled = acik;
    });

    console.log(acik ? " Mikrofon açıldı." : " Mikrofon kapatıldı.");
  } /*\*



   \* =========================================================



   \* KAMERA



   \* =========================================================



   */

  kamerayiDegistir(acik: boolean) {
    if (!this.yerelStream) {
      return;
    }

    const captureControl =
      WebRTCNativeCamera.mediaStreamTrackSetCaptureEnabled;

    if (typeof captureControl !== "function") {
      console.error(
        "Native kamera kontrol metodu bulunamadı. Android uygulamasını yeniden derleyin.",
      );
      return;
    }

    this.yerelStream.getVideoTracks().forEach((track) => {
      track.enabled = acik;
      captureControl(track.id, acik);
    });

    console.log(
      acik
        ? "Kamera açıldı (track + fiziksel capture)."
        : "Kamera kapatıldı (track + fiziksel capture).",
    );
  }

  kamerayiCevir() {
    if (!this.yerelStream) {
      return;
    }

    const videoTracks = this.yerelStream.getVideoTracks();

    if (videoTracks.length === 0) {
      return;
    }

    const videoTrack = videoTracks[0];

    const kameraTrack = videoTrack as any;

    if (typeof kameraTrack._switchCamera === "function") {
      kameraTrack._switchCamera();

      console.log(" Kamera değiştirildi.");
    } else {
      console.warn("  Bu cihazda kamera değiştirme desteklenmiyor.");
    }
  } /*\*



   \* =========================================================



   \* STREAM GETTER



   \* =========================================================



   */

  getYerelStream(): MediaStream | null {
    return this.yerelStream;
  }

  getUzakStream(): MediaStream | null {
    return this.uzakStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  } /*\*



   \* =========================================================



   \* STOMP BAĞLI MI



   \* =========================================================



   */

  webSocketBagliMi(): boolean {
    const client = this.stompClient;

    return this.webSocketBagli && client !== null && client.connected;
  } /*\*



   \* =========================================================



   \* MİKROFON KISA METOTLARI



   \* =========================================================



   */

  mikrofonKapat() {
    this.mikrofonuDegistir(false);
  }

  mikrofonAc() {
    this.mikrofonuDegistir(true);
  } /*\*



   \* =========================================================



   \* KAMERA KISA METOTLARI



   \* =========================================================



   */

  kameraKapat() {
    this.kamerayiDegistir(false);
  }

  kameraAc() {
    this.kamerayiDegistir(true);
  } /*\*



   \* =========================================================



   \* OLAYLARI TEMİZLE



   \* =========================================================



   */

  olaylariTemizle() {
    this.olaylar.clear();
  } /*\*



   \* =========================================================



   \* TAM TEMİZLE



   \* =========================================================



   */

  async temizle() {
    try {
      if (this.peerConnection || this.yerelStream || this.arananKullaniciId) {
        await this.aramayiBitir();
      }
    } catch (hata) {
      console.warn("Arama temizleme hatası:", hata);
    }

    try {
      await this.webSocketBaglantisiniKapat();
    } catch (hata) {
      console.warn("STOMP temizleme hatası:", hata);
    }

    this.aramaSesiniTemizle();

    this.aramaSonlandiriliyor = false;

    this.webRtcBaglandiBildirildi = false;

    this.aramaBaslatPromise = null;

    this.uzakStream = null;

    this.bekleyenIceAdaylari = [];
    this.bekleyenGidenIceAdaylari = [];
    this.offerAckBekleniyor = false;
    this.gidenIceAktarimiSuruyor = false;
    this.e2eeBekleyenSinyaller = [];
    this.e2eeBekleyenGondericiler = [];

    this.remoteDescriptionHazir = false;

    this.olaylariTemizle();
  }
}

const aramaWebRTC = new AramaWebRTC();

export default aramaWebRTC;
