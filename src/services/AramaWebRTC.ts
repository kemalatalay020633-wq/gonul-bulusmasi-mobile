import AsyncStorage from "@react-native-async-storage/async-storage";

import { Client, IMessage, StompSubscription } from "@stomp/stompjs";

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
};

type AramaOlayCallback = (...args: any[]) => void;

class AramaWebRTC {
  private peerConnection: RTCPeerConnection | null = null;

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

  private remoteDescriptionHazir = false;

  private aramaSonlandiriliyor = false;

  private webRtcBaglandiBildirildi = false; // Aynı anda iki createOffer çalışmasını engeller.
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

  private cevapIsleniyor = false;

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

  ayarla(
    mevcutKullaniciId: number,

    arananKullaniciId: number,

    aramaTuru: AramaTuru,
  ) {
    this.mevcutKullaniciId = mevcutKullaniciId;

    this.arananKullaniciId = arananKullaniciId;

    // UUID yalnızca oturum tanımlayıcısıdır; yetki denetimi sunucudadır.
    this.aramaOturumId = this.yeniAramaOturumId();

    this.aramaTuru = aramaTuru;

    this.aramaSonlandiriliyor = false;

    this.webRtcBaglandiBildirildi = false;

    this.bekleyenIceAdaylari = [];

    this.remoteDescriptionHazir = false;

    console.log("======================================");

    console.log(" WEBRTC ARAMA AYARLANDI");

    console.log(" Mevcut kullanıcı:", mevcutKullaniciId);

    console.log(" Aranan kullanıcı:", arananKullaniciId);

    console.log(" Arama türü:", aramaTuru);

    console.log("======================================");
  } /*\*



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

              this.olayCalistir("baglandi");
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

          void this.iceAdayiEkle(aday);

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

  private aramaSinyaliGonder(
    tip: string,

    bilgiler: {
      sdp?: string;

      aday?: RTCIceCandidateInit;
    } = {},
  ) {
    if (!this.arananKullaniciId) {
      console.warn("  Arama sinyali gönderilemedi. Hedef kullanıcı yok.");

      return;
    }

    if (!this.aramaOturumId) {
      console.warn("Arama sinyali gönderilemedi. Oturum kimliği yok.");
      this.olayCalistir("hata", new Error("Arama oturum kimliği bulunamadı."));
      return;
    }

    if (this.hariciSinyalGonderici) {
      const sinyal: BackendAramaSinyali = {
        hedefKullaniciId: this.arananKullaniciId,

        tur: this.aramaTuru,

        tip,

        sdp: bilgiler.sdp ?? null,

        aday: bilgiler.aday ? JSON.stringify(bilgiler.aday) : null,

        sdpMid: bilgiler.aday?.sdpMid ?? null,

        sdpMLineIndex: bilgiler.aday?.sdpMLineIndex ?? null,

        aramaOturumId: this.aramaOturumId,
      };

      void Promise.resolve(this.hariciSinyalGonderici(sinyal)).catch((hata) => {
        const error =
          hata instanceof Error
            ? hata
            : new Error("Arama sinyali gönderilemedi.");

        console.error(" Harici STOMP arama sinyali hatası:", error);

        this.olayCalistir("hata", error);
      });

      return;
    }

    if (
      !this.stompClient ||
      !this.stompClient.connected ||
      !this.webSocketBagli
    ) {
      console.warn("  Arama sinyali gönderilemedi. STOMP bağlı değil.");

      return;
    }

    if (!this.arananKullaniciId) {
      console.warn("  Arama sinyali gönderilemedi. Hedef kullanıcı yok.");

      return;
    }

    const sinyal: BackendAramaSinyali = {
      hedefKullaniciId: this.arananKullaniciId,

      tur: this.aramaTuru,

      tip,

      sdp: bilgiler.sdp ?? null,

      aday: bilgiler.aday ? JSON.stringify(bilgiler.aday) : null,

      sdpMid: bilgiler.aday?.sdpMid ?? null,

      sdpMLineIndex: bilgiler.aday?.sdpMLineIndex ?? null,

      aramaOturumId: this.aramaOturumId,
    };

    console.log("======================================");

    console.log(" ARAMA SİNYALİ GÖNDERİLİYOR");

    console.log(" Tip:", tip);

    console.log(" Hedef:", this.arananKullaniciId);

    console.log(" Tür:", this.aramaTuru);

    console.log("======================================");

    try {
      this.stompClient.publish({
        destination: "/app/arama/sinyal",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify(sinyal),
      });

      console.log(" ARAMA SİNYALİ BACKEND'E GÖNDERİLDİ");
    } catch (hata) {
      console.error(" Arama sinyali gönderilemedi:", hata);

      const error =
        hata instanceof Error
          ? hata
          : new Error("Arama sinyali gönderilemedi.");

      this.olayCalistir("hata", error);
    }
  } /*\*



   \* =========================================================



   \* KAMERA / MİKROFON



   \* =========================================================



   */

  async medyaAkisiniAl(): Promise<MediaStream> {
    try {
      console.log(" Mikrofon/kamera erişimi isteniyor...");

      const audioOturumuBaslatildi = this.aramaAudioOturumunuBaslat();

      if (!audioOturumuBaslatildi) {
        console.warn(
          "  Android call audio oturumu başlatılamadı; WebRTC medya akışı yine de alınacak.",
        );
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,

        video:
          this.aramaTuru === "VIDEO"
            ? {
                facingMode: "user",

                width: 640,

                height: 480,

                frameRate: 30,
              }
            : false,
      });

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

      this.olayCalistir("hata", error);

      throw error;
    }
  } /*\*



   \* =========================================================



   \* PEER CONNECTION



   \* =========================================================



   */

  async baglantiOlustur(): Promise<RTCPeerConnection> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    if (this.peerConnection) {
      console.log(" Mevcut RTCPeerConnection kullanılıyor."); // ÖNEMLİ:
      // PeerConnection daha önce oluşturulmuş olabilir ancak yerel medya
      // henüz hazır olmayabilir. Bu durumda doğrudan return etmek,
      // createOffer()'ın track'ler eklenmeden çalışmasına neden olur.
      // Sonuç olarak ikinci offer'da m-line sırası değişir ve WebRTC:
      // "The order of m-lines in subsequent offer..." hatası verir.

      if (!this.yerelStream) {
        await this.medyaAkisiniAl();
      }

      if (this.yerelStream) {
        const mevcutGondericiler = this.peerConnection.getSenders();

        this.yerelStream.getTracks().forEach((track) => {
          const zatenEklendi = mevcutGondericiler.some(
            (sender) => sender.track?.id === track.id,
          );

          if (zatenEklendi) {
            console.log(" Track zaten PeerConnection'da:", track.kind);

            return;
          }

          console.log(" Mevcut PeerConnection'a Track ekleniyor:", track.kind);

          this.peerConnection!.addTrack(track, this.yerelStream!);
        });
      }

      return this.peerConnection;
    }

    console.log(" RTCPeerConnection oluşturuluyor...");

    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceSunucular,
    });

    this.peerConnection = peerConnection;

    this.remoteDescriptionHazir = false;

    this.webRtcBaglandiBildirildi = false;

    if (!this.yerelStream) {
      await this.medyaAkisiniAl();
    }

    if (this.yerelStream) {
      const mevcutGondericiler = peerConnection.getSenders();

      this.yerelStream.getTracks().forEach((track) => {
        const zatenEklendi = mevcutGondericiler.some(
          (sender) => sender.track?.id === track.id,
        );

        if (zatenEklendi) {
          console.log(" Track zaten PeerConnection'da:", track.kind);

          return;
        }

        console.log(" Track PeerConnection'a ekleniyor:", track.kind);

        peerConnection.addTrack(track, this.yerelStream!);
      });
    }

    peerConnection.ontrack = (event: any) => {
      console.log(" Uzak medya akışı geldi.");

      if (event.track) {
        console.log(
          " Uzak track:",

          event.track.kind,

          "id:",

          event.track.id,

          "enabled:",

          event.track.enabled,
        );

        if (event.track.kind === "audio") {
          console.log(" UZAK SES TRACK'İ ALINDI");

          try {
            event.track.enabled = true;
          } catch (hata) {
            console.warn("  Uzak audio track aktif edilemedi:", hata);
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
            uzakStream.addTrack(event.track);
          } catch (hata) {
            console.warn("  Uzak track stream'e eklenemedi:", hata);
          }
        }
      }

      if (!uzakStream) {
        console.warn("  Uzak medya stream'i oluşturulamadı.");

        return;
      }

      this.uzakStream = uzakStream;

      console.log(" Uzak stream:", uzakStream.id);

      console.log(" Uzak audio track:", uzakStream.getAudioTracks().length);

      console.log(" Uzak video track:", uzakStream.getVideoTracks().length);

      this.olayCalistir("uzakStream", uzakStream);
    };

    peerConnection.onicecandidate = (event: any) => {
      if (!event.candidate) {
        console.log(" ICE Candidate üretimi tamamlandı.");

        return;
      }

      const aday = event.candidate.toJSON();

      console.log(" ICE Candidate üretildi.");

      this.iceGonder(aday);
    };

    peerConnection.onconnectionstatechange = () => {
      const durum = peerConnection.connectionState;

      console.log(" WebRTC bağlantı durumu:", durum);

      if (durum === "connected") {
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
      const durum = peerConnection.iceConnectionState;

      console.log(" ICE durumu:", durum);

      if (durum === "connected" || durum === "completed") {
        console.log(" ICE BAĞLANTISI KURULDU:", durum);
      }

      if (durum === "failed") {
        console.error(" ICE BAĞLANTISI BAŞARISIZ.");

        this.olayCalistir(
          "hata",

          new Error("WebRTC ICE bağlantısı kurulamadı."),
        );
      }
    };

    peerConnection.onicecandidateerror = (event: any) => {
      console.error(" ICE CANDIDATE ERROR:", {
        errorCode: event?.errorCode,

        errorText: event?.errorText,

        url: event?.url,
      });
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log(" ICE gathering durumu:", peerConnection.iceGatheringState);
    };

    peerConnection.onsignalingstatechange = () => {
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

    const baslatmaPromise = this.aramaBaslatInternal();

    this.aramaBaslatPromise = baslatmaPromise;

    try {
      return await baslatmaPromise;
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

  private async aramaBaslatInternal(): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    console.log("======================================");

    if (this.hariciSinyalGonderici) {
      console.log(" HARİCİ STOMP TAŞIYICISI KULLANILIYOR");
    } else {
      console.log(" ARAMA BAŞLATMADAN ÖNCE STOMP KONTROLÜ");

      console.log(" STOMP bağlı mı:", this.webSocketBagliMi());

      console.log("======================================");

      await this.webSocketBaglantisiAc();

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket bağlantısı hazır değil.");
      }

      console.log(" ARAMA İÇİN STOMP HAZIR");

      console.log(" Arama topic:", `/topic/arama/${this.mevcutKullaniciId}`);
    }

    this.aramaSonlandiriliyor = false; // Yeni bir arama başlatılıyorsa eski offer kilidi temiz olmalı.
    // Ancak burada yeni bir createOffer başlatmıyoruz. Sadece durum
    // tutarlılığını sağlıyoruz.

    this.offerOlusturuluyor = false; // Giden arama başlarken Android call-audio oturumunu aç.
    // SES: ahize, VIDEO: hoparlör.

    this.aramaAudioOturumunuBaslat(); // Karşı taraf cevap verene kadar giden arama için ringback sesi çal.

    await this.aramaSesiniBaslat();

    const peerConnection = await this.baglantiOlustur(); // PeerConnection cleanup sırasında kapandıysa yeni offer üretmeye
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

        this.aramaSinyaliGonder("CALL_OFFER", {
          sdp: mevcutOffer.sdp,
        });

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
      }); // createOffer tamamlandıktan sonra arama kapatılmış olabilir.
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

      await peerConnection.setLocalDescription(offer);

      console.log(" WebRTC Offer oluşturuldu.");

      console.log(" LocalDescription ayarlandı.");

      console.log(" Offer signaling state:", peerConnection.signalingState);

      const teklif = {
        type: offer.type,

        sdp: offer.sdp,
      }; // CALL_OFFER yalnızca local description ayarlandıktan sonra gönderilir.

      this.aramaSinyaliGonder("CALL_OFFER", {
        sdp: offer.sdp ?? undefined,
      });

      console.log(" CALL_OFFER karşı tarafa gönderildi.");

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
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanıcıları ayarlanmamış.");
    }

    console.log(" Gelen teklif kabul ediliyor.");

    if (!this.hariciSinyalGonderici) {
      await this.webSocketBaglantisiAc();

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket bağlantısı hazır değil.");
      }
    }

    this.aramaSonlandiriliyor = false; // Gelen aramanın zilini durdur.

    this.aramaSesiniDurdur(); // Cevapsız arama için açılmış geçici ses oturumunu kapat.
    // Ardından normal WebRTC çağrı ses oturumunu temiz bir şekilde aç.

    this.gelenAramaAudioOturumunuKapat();

    this.aramaAudioOturumunuBaslat();

    const peerConnection = await this.baglantiOlustur();

    if (!teklif.sdp) {
      throw new Error("Teklif SDP bilgisi bulunamadı.");
    }

    const remoteDescription = new RTCSessionDescription({
      type: teklif.type,

      sdp: teklif.sdp,
    });

    console.log(" RemoteDescription ayarlanıyor...");

    await peerConnection.setRemoteDescription(remoteDescription);

    this.remoteDescriptionHazir = true;

    console.log(" RemoteDescription hazır.");

    await this.bekleyenIceAdaylariniEkle();

    console.log(" WebRTC Answer oluşturuluyor...");

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    console.log(" WebRTC Answer oluşturuldu.");

    this.aramaSinyaliGonder("CALL_ANSWER", {
      sdp: answer.sdp ?? undefined,
    });

    return {
      type: answer.type,

      sdp: answer.sdp,
    };
  } /*\*



   \* =========================================================



   \* ANSWER İŞLE



   \* =========================================================



   */

  async cevabiIsle(cevap: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error("PeerConnection bulunamadı.");
    }

    if (!cevap.sdp) {
      throw new Error("Cevap SDP bilgisi bulunamadı.");
    }

    if (this.cevapIsleniyor) {
      console.warn(
        "⚠️ WebRTC Answer zaten işleniyor, ikinci cevap yok sayıldı.",
      );
      return;
    }

    if (this.peerConnection.signalingState !== "have-local-offer") {
      const mevcutRemote = this.peerConnection.remoteDescription;

      if (mevcutRemote?.type === "answer") {
        console.warn(
          "⚠️ WebRTC Answer zaten işlendi, ikinci cevap yok sayıldı.",
        );
        this.remoteDescriptionHazir = true;
        await this.bekleyenIceAdaylariniEkle();
      } else {
        console.warn(
          "⚠️ WebRTC Answer beklenen signalingState'te değil:",
          this.peerConnection.signalingState,
        );
      }

      return;
    }

    this.cevapIsleniyor = true;

    try {
      const peerConnection = this.peerConnection;

      console.log("WebRTC Answer işleniyor...");
      console.log("Answer signaling state:", peerConnection.signalingState);

      const remoteDescription = new RTCSessionDescription({
        type: cevap.type,
        sdp: cevap.sdp,
      });

      await peerConnection.setRemoteDescription(remoteDescription);

      this.remoteDescriptionHazir = true;

      console.log("WebRTC Answer işlendi.");
      console.log(
        "Answer sonrası signaling state:",
        peerConnection.signalingState,
      );

      await this.bekleyenIceAdaylariniEkle();
    } catch (hata) {
      console.error("❌ WebRTC Answer işlenemedi:", hata);
      throw hata;
    } finally {
      this.cevapIsleniyor = false;
    }
  }

  async iceAdayiEkle(aday: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      console.warn("  PeerConnection hazır değil. ICE bekletiliyor.");

      this.bekleyenIceAdaylari.push(aday);

      return;
    }

    if (!this.remoteDescriptionHazir) {
      console.log(" RemoteDescription hazır değil. ICE bekletiliyor.");

      this.bekleyenIceAdaylari.push(aday);

      return;
    }

    try {
      const candidate = new RTCIceCandidate(aday);

      await this.peerConnection.addIceCandidate(candidate);

      console.log(" ICE Candidate eklendi.");
    } catch (hata) {
      console.error(" ICE Candidate eklenemedi:", hata);
    }
  } /*\*



   \* =========================================================



   \* BEKLEYEN ICE



   \* =========================================================



   */

  private async bekleyenIceAdaylariniEkle() {
    if (!this.peerConnection || !this.remoteDescriptionHazir) {
      return;
    }

    if (this.bekleyenIceAdaylari.length === 0) {
      return;
    }

    console.log(
      " Bekleyen ICE adayları ekleniyor:",

      this.bekleyenIceAdaylari.length,
    );

    const adaylar = [...this.bekleyenIceAdaylari];

    this.bekleyenIceAdaylari = [];

    for (const aday of adaylar) {
      try {
        const candidate = new RTCIceCandidate(aday);

        await this.peerConnection.addIceCandidate(candidate);

        console.log(" Bekleyen ICE eklendi.");
      } catch (hata) {
        console.error(" Bekleyen ICE eklenemedi:", hata);
      }
    }
  } /*\*



   \* =========================================================



   \* ICE GÖNDER



   \* =========================================================



   */

  private iceGonder(aday: RTCIceCandidateInit) {
    this.aramaSinyaliGonder("CALL_ICE", {
      aday,
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

    this.aramaSinyaliGonder("CALL_REJECT");
  } /*\*



   \* =========================================================



   \* ARAMAYI BİTİR



   \* =========================================================



   */

  async aramayiBitir(karsiTarafBitirdi = false) {
    if (this.aramaSonlandiriliyor) {
      console.log(" Arama zaten sonlandırılıyor. İkinci cleanup atlandı.");

      return;
    }

    this.aramaSonlandiriliyor = true;

    this.aramaSesiniDurdur();

    this.gelenAramaAudioOturumunuKapat();

    console.log(
      karsiTarafBitirdi
        ? " Karşı taraf aramayı bitirdi. WebRTC bağlantısı kapatılıyor."
        : " WebRTC görüşmesi sonlandırılıyor.",
    );

    if (
      !karsiTarafBitirdi &&
      this.arananKullaniciId &&
      (this.hariciSinyalGonderici ||
        (this.stompClient && this.stompClient.connected && this.webSocketBagli))
    ) {
      console.log(" Kullanıcı aramayı kapattı. CALL_END gönderiliyor.");

      this.aramaSinyaliGonder("CALL_END");
    } else if (karsiTarafBitirdi) {
      console.log(" Gelen CALL_END için tekrar CALL_END gönderilmiyor.");
    }

    this.sesYonlendirmesiniKapat();

    if (this.yerelStream) {
      this.yerelStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (hata) {
          console.warn("  Yerel track kapatma hatası:", hata);
        }
      });

      this.yerelStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.ontrack = null;

        this.peerConnection.onicecandidate = null;

        this.peerConnection.onconnectionstatechange = null;

        this.peerConnection.oniceconnectionstatechange = null;

        this.peerConnection.onicegatheringstatechange = null;

        this.peerConnection.onsignalingstatechange = null;

        this.peerConnection.close();
      } catch (hata) {
        console.warn("PeerConnection kapatma hatası:", hata);
      }

      this.peerConnection = null;
    }

    this.uzakStream = null;

    this.bekleyenIceAdaylari = [];

    this.remoteDescriptionHazir = false;
    this.sonGelenOfferSdp = null;
    this.aramaOturumId = null;
    this.cevapIsleniyor = false;
    this.ringtoneBaslatiliyor = false;

    this.webRtcBaglandiBildirildi = false;

    this.offerOlusturuluyor = false; // Cleanup sonrasında yeni arama başlayabilsin.
    // Devam eden eski Promise varsa kendi finally bloğunda zaten temizlenir.

    this.aramaBaslatPromise = null;

    if (!karsiTarafBitirdi) {
      this.olayCalistir("baglantiKoptu");
      this.aramaSonlandiriliyor = false;

      console.log("✅ Arama temizliği tamamlandı, sonlandırma kilidi açıldı.");
    }
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

    this.yerelStream.getVideoTracks().forEach((track) => {
      track.enabled = acik;
    });

    console.log(acik ? " Kamera açıldı." : " Kamera kapatıldı.");
  } /*\*



   \* =========================================================



   \* KAMERA DEĞİŞTİR



   \* =========================================================



   */

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

    this.remoteDescriptionHazir = false;

    this.olaylariTemizle();
  }
}

const aramaWebRTC = new AramaWebRTC();

export default aramaWebRTC;
