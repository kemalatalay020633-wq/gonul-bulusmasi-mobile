import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { API_BASE_URL, WEBSOCKET_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InCallManager from "react-native-incall-manager";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { Hoparlor } from "./Hoparlor";

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
};

class AramaWebRTC {
  private peerConnection: RTCPeerConnection | null = null;

  private yerelStream: MediaStream | null = null;

  private uzakStream: MediaStream | null = null;

  private mevcutKullaniciId: number | null = null;

  private arananKullaniciId: number | null = null;

  private aramaTuru: AramaTuru = "SES";

  /**
   * =========================================================
   * STOMP CLIENT
   * =========================================================
   */

  private stompClient: Client | null = null;

  private webSocketBagli = false;

  private webSocketBaglantiPromise: Promise<void> | null = null;

  private aramaSubscription: StompSubscription | null = null;

  private hariciSinyalGonderici:
    | ((sinyal: BackendAramaSinyali) => void | Promise<void>)
    | null = null;

  /**
   * =========================================================
   * ICE
   * =========================================================
   */

  private bekleyenIceAdaylari: RTCIceCandidateInit[] = [];

  private remoteDescriptionHazir = false;

  private aramaSonlandiriliyor = false;
  private webRtcBaglandiBildirildi = false;

  // AynÄ± anda iki createOffer Ã§alÄ±ÅŸmasÄ±nÄ± engeller.
  // Ã–zellikle medya alma ile arama baÅŸlatmanÄ±n yarÄ±ÅŸmasÄ± halinde
  // SDP m-line sÄ±rasÄ±nÄ±n bozulmasÄ±nÄ± Ã¶nler.
  private offerOlusturuluyor = false;

  // AynÄ± arama iÃ§in aramaBaslat() birden fazla kez tetiklenirse
  // ikinci Ã§aÄŸrÄ± yeni bir createOffer baÅŸlatmaz; ilk Ã§aÄŸrÄ±nÄ±n
  // Promise'ini bekler. BÃ¶ylece aynÄ± PeerConnection kapanmadan
  // ikinci offer Ã¼retme yarÄ±ÅŸÄ± oluÅŸmaz.
  private aramaBaslatPromise: Promise<RTCSessionDescriptionInit> | null = null;

  /**
   * =========================================================
   * ARAMA SESÄ° / ANDROID CALL AUDIO
   * =========================================================
   */

  private aramaSesiCalisiyor = false;
  private aramaAudioOturumuAcik = false;
  private hoparlorAcik = false;

  private aramaSesiniBaslat() {
    try {
      if (this.aramaSesiCalisiyor) {
        console.log("â­ï¸ Arama ringback sesi zaten Ã§alÄ±ÅŸÄ±yor.");
        return;
      }

      // GÄ°DEN ARAMA: karÅŸÄ± taraf cevap verene kadar ringback Ã§al.
      // Incoming arama iÃ§in startRingtone(), outgoing arama iÃ§in
      // startRingback() kullanÄ±lmalÄ±dÄ±r.
      InCallManager.startRingback("_DEFAULT_");

      this.aramaSesiCalisiyor = true;

      console.log("ğŸ””ğŸ“ GÄ°DEN ARAMA RINGBACK BAÅLATILDI (_DEFAULT_)");
    } catch (hata) {
      this.aramaSesiCalisiyor = false;
      console.warn("âš ï¸ Giden arama ringback baÅŸlatÄ±lamadÄ±:", hata);
    }
  }

  private gelenAramaSesiniBaslat() {
    try {
      if (this.aramaSesiCalisiyor) {
        console.log("â­ï¸ Gelen arama ringtone zaten Ã§alÄ±ÅŸÄ±yor.");
        return;
      }

      // GELEN ARAMA: kullanÄ±cÄ± cevaplayana/reddedene kadar telefon zili.
      InCallManager.startRingtone("_DEFAULT_", 1000, "", 1000);

      this.aramaSesiCalisiyor = true;

      console.log("ğŸ””ğŸ“ GELEN ARAMA RINGTONE BAÅLATILDI");
    } catch (hata) {
      this.aramaSesiCalisiyor = false;
      console.warn("âš ï¸ Gelen arama ringtone baÅŸlatÄ±lamadÄ±:", hata);
    }
  }

  private aramaSesiniDurdur() {
    try {
      if (!this.aramaSesiCalisiyor) {
        return;
      }

      try {
        InCallManager.stopRingback();
      } catch (hata) {
        console.warn("âš ï¸ Ringback durdurulamadÄ±:", hata);
      }

      try {
        InCallManager.stopRingtone();
      } catch (hata) {
        console.warn("âš ï¸ Ringtone durdurulamadÄ±:", hata);
      }

      this.aramaSesiCalisiyor = false;

      console.log("ğŸ”•ğŸ“ ARAMA ZÄ°L SESÄ° DURDURULDU");
    } catch (hata) {
      this.aramaSesiCalisiyor = false;
      console.warn("âš ï¸ Arama zil sesi durdurulamadÄ±:", hata);
    }
  }

  private aramaSesiniTemizle() {
    try {
      try {
        InCallManager.stopRingback();
      } catch {}

      try {
        InCallManager.stopRingtone();
      } catch {}
    } finally {
      this.aramaSesiCalisiyor = false;
    }
  }

  private aramaAudioOturumunuBaslat(): boolean {
    try {
      if (this.aramaAudioOturumuAcik) {
        console.log("â­ï¸ CALL AUDIO OTURUMU ZATEN AÃ‡IK");
        return true;
      }

      const medya = this.aramaTuru === "VIDEO" ? "video" : "audio";

      console.log("======================================");
      console.log("ğŸ§ CALL AUDIO OTURUMU BAÅLATILIYOR");
      console.log("ğŸ§ Medya:", medya);
      console.log("======================================");

      const baslatildi = Hoparlor.aramayiBaslat(medya);

      if (!baslatildi) {
        console.warn("âš ï¸ CALL AUDIO OTURUMU BAÅLATILAMADI.");

        this.aramaAudioOturumuAcik = false;
        this.hoparlorAcik = false;

        return false;
      }

      // GÃ¶rÃ¼ntÃ¼lÃ¼ aramada hoparlÃ¶r varsayÄ±lan olarak AÃ‡IK,
      // sesli aramada ahize varsayÄ±lan olarak AÃ‡IK olsun.
      this.hoparlorAcik = this.aramaTuru === "VIDEO";
      this.aramaAudioOturumuAcik = true;

      console.log("======================================");
      console.log("ğŸ§ğŸ“ CALL AUDIO OTURUMU BAÅLATILDI");
      console.log(
        this.hoparlorAcik
          ? "ğŸ”Š VIDEO: HOPARLÃ–R AÃ‡IK"
          : "ğŸ”ˆ SES: AHÄ°ZE AÃ‡IK",
      );
      console.log("======================================");

      return true;
    } catch (hata) {
      this.aramaAudioOturumuAcik = false;
      this.hoparlorAcik = false;

      console.warn("âš ï¸ CALL AUDIO OTURUMU BAÅLATILAMADI:", hata);

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

      console.log("ğŸ§ğŸ“ CALL AUDIO OTURUMU KAPATILDI");
    } catch (hata) {
      this.aramaAudioOturumuAcik = false;
      console.warn("âš ï¸ Call audio oturumu kapatÄ±lamadÄ±:", hata);
    }
  }

  private readonly iceSunucular = [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
  ];

  /**
   * =========================================================
   * AYARLA
   * =========================================================
   */

  ayarla(
    mevcutKullaniciId: number,
    arananKullaniciId: number,
    aramaTuru: AramaTuru,
  ) {
    this.mevcutKullaniciId = mevcutKullaniciId;

    this.arananKullaniciId = arananKullaniciId;

    this.aramaTuru = aramaTuru;
    this.aramaSonlandiriliyor = false;
    this.webRtcBaglandiBildirildi = false;
    this.bekleyenIceAdaylari = [];
    this.remoteDescriptionHazir = false;

    console.log("======================================");

    console.log("ğŸ“ WEBRTC ARAMA AYARLANDI");

    console.log("ğŸ“ Mevcut kullanÄ±cÄ±:", mevcutKullaniciId);

    console.log("ğŸ“ Aranan kullanÄ±cÄ±:", arananKullaniciId);

    console.log("ğŸ“ Arama tÃ¼rÃ¼:", aramaTuru);

    console.log("======================================");
  }

  /**
   * =========================================================
   * OLAY DÄ°NLE
   * =========================================================
   */

  olayDinle<K extends keyof AramaOlaylari>(
    olay: K,
    callback: AramaOlaylari[K],
  ) {
    this.olaylar[olay] = callback;
  }

  private olaylar: Partial<AramaOlaylari> = {};

  private hoparloruAc() {
    try {
      if (!this.aramaAudioOturumuAcik) {
        this.aramaAudioOturumunuBaslat();
      }

      const basarili = Hoparlor.ac();

      if (!basarili) {
        console.warn(
          "âš ï¸ HoparlÃ¶r Hoparlor servisi tarafÄ±ndan aÃ§Ä±lamadÄ±.",
        );
        return;
      }

      this.hoparlorAcik = true;

      console.log(
        this.aramaTuru === "VIDEO"
          ? "ğŸ”ŠğŸ“¹ GÃ¶rÃ¼ntÃ¼lÃ¼ arama: HOPARLÃ–R AÃ‡ILDI"
          : "ğŸ”ŠğŸ“ Sesli arama: HOPARLÃ–R AÃ‡ILDI",
      );
    } catch (hata) {
      console.warn("âš ï¸ HoparlÃ¶r aÃ§Ä±lamadÄ±:", hata);
    }
  }

  private sesYonlendirmesiniKapat() {
    this.aramaAudioOturumunuKapat();
    console.log("ğŸ”Š Ses yÃ¶nlendirmesi kapatÄ±ldÄ±.");
  }

  public hoparloruDegistir(acik: boolean) {
    try {
      if (!this.aramaAudioOturumuAcik) {
        this.aramaAudioOturumunuBaslat();
      }

      const basarili = Hoparlor.hoparloruDegistir(acik);

      if (!basarili) {
        console.warn("âš ï¸ HoparlÃ¶r yÃ¶nlendirmesi deÄŸiÅŸtirilemedi.");
        return;
      }

      this.hoparlorAcik = acik;

      console.log(
        acik ? "ğŸ”Š HoparlÃ¶r aÃ§Ä±ldÄ±." : "ğŸ”ˆ Ahizeye geÃ§ildi.",
      );
    } catch (hata) {
      console.warn("âš ï¸ HoparlÃ¶r deÄŸiÅŸtirilemedi:", hata);
    }
  }

  sinyalGondericiyiAyarla(
    gonderici: ((sinyal: BackendAramaSinyali) => void | Promise<void>) | null,
  ): void {
    this.hariciSinyalGonderici = gonderici;
  }

  /**
   * =========================================================
   * STOMP WEBSOCKET BAÄLANTISI
   *
   * Ã–NEMLÄ°:
   *
   * brokerURL KULLANMIYORUZ.
   *
   * React Native native WebSocket
   * oluÅŸturuyoruz.
   *
   * AyrÄ±ca v12.stomp subprotocol
   * aÃ§Ä±kÃ§a gÃ¶nderiliyor.
   * =========================================================
   */

  async webSocketBaglantisiAc(): Promise<void> {
    // Harici STOMP taÅŸÄ±yÄ±cÄ±sÄ± (useMessages) kullanÄ±lÄ±yorsa
    // AramaWebRTC kendi /ws-native baÄŸlantÄ±sÄ±nÄ± kesinlikle aÃ§maz.
    if (this.hariciSinyalGonderici) {
      console.log("======================================");
      console.log("ğŸ“¡ HARÄ°CÄ° STOMP TAÅIYICISI AKTÄ°F");
      console.log("â­ï¸ AramaWebRTC native STOMP baÄŸlantÄ±sÄ± aÃ§Ä±lmayacak.");
      console.log("======================================");
      return;
    }

    if (this.webSocketBagli && this.stompClient && this.stompClient.connected) {
      console.log("======================================");

      console.log("ğŸŸ¢ ARAMA STOMP ZATEN BAÄLI");

      console.log("======================================");

      return;
    }

    if (this.webSocketBaglantiPromise) {
      console.log("======================================");

      console.log("â³ MEVCUT STOMP BAÄLANTISI BEKLENÄ°YOR");

      console.log("======================================");

      return this.webSocketBaglantiPromise;
    }

    if (this.mevcutKullaniciId === null) {
      throw new Error(
        "WebSocket baÄŸlantÄ±sÄ± iÃ§in mevcut kullanÄ±cÄ± ID bulunamadÄ±.",
      );
    }

    const kullaniciId = this.mevcutKullaniciId;

    const promise = new Promise<void>(async (resolve, reject) => {
      let tamamlandi = false;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      /**
       * =====================================================
       * TIMEOUT TEMÄ°ZLE
       * =====================================================
       */

      const temizleTimeout = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);

          timeoutId = null;
        }
      };

      /**
       * =====================================================
       * BAÅARILI
       * =====================================================
       */

      const basari = () => {
        if (tamamlandi) {
          return;
        }

        tamamlandi = true;

        temizleTimeout();

        this.webSocketBagli = true;

        this.webSocketBaglantiPromise = null;

        resolve();
      };

      /**
       * =====================================================
       * HATA
       * =====================================================
       */

      const hata = (error: Error) => {
        if (tamamlandi) {
          return;
        }

        tamamlandi = true;

        temizleTimeout();

        this.webSocketBagli = false;

        this.webSocketBaglantiPromise = null;

        reject(error);
      };

      try {
        /**
         * =================================================
         * TOKEN
         * =================================================
         */

        const token = await AsyncStorage.getItem("token");

        if (!token) {
          hata(
            new Error("WebSocket baÄŸlantÄ±sÄ± iÃ§in JWT token bulunamadÄ±."),
          );

          return;
        }

        console.log("======================================");

        console.log("ğŸ”Œ ARAMA STOMP BAÄLANTISI AÃ‡ILIYOR");

        console.log("ğŸ”Œ Adres:", WEBSOCKET_ADRESI);

        console.log("ğŸ”Œ KullanÄ±cÄ± ID:", kullaniciId);

        console.log("ğŸ” JWT bulundu: EVET");

        console.log("======================================");

        /**
         * =================================================
         * ESKÄ° CLIENT KAPAT
         * =================================================
         */

        if (this.stompClient) {
          try {
            console.log("ğŸ§¹ Eski STOMP client kapatÄ±lÄ±yor.");

            await this.stompClient.deactivate();
          } catch (eskiHata) {
            console.warn("âš ï¸ Eski STOMP client kapatÄ±lamadÄ±:", eskiHata);
          }

          this.stompClient = null;
        }

        this.aramaSubscription = null;

        this.webSocketBagli = false;

        /**
         * =================================================
         * STOMP CLIENT
         * =================================================
         *
         * BURASI EN Ã–NEMLÄ° KISIM.
         *
         * brokerURL YOK.
         *
         * webSocketFactory VAR.
         *
         * Native WebSocket:
         *
         * new WebSocket(
         *   URL,
         *   ["v12.stomp"]
         * )
         * =================================================
         */

        const client = new Client({
          webSocketFactory: () => {
            console.log("======================================");
            console.log("ğŸŒ ARAMA WEBSOCKET FACTORY");
            console.log("ğŸŒ Adres:", WEBSOCKET_ADRESI);
            console.log("ğŸŒ Protocol: v12.stomp");
            console.log("======================================");

            const socket = new WebSocket(WEBSOCKET_ADRESI, ["v12.stomp"]);

            /**
             * =========================================
             * NATIVE WEBSOCKET OPEN
             * =========================================
             */
            socket.onopen = () => {
              console.log("======================================");
              console.log("ğŸŸ¢ğŸŸ¢ğŸŸ¢ ARAMA NATIVE WEBSOCKET OPEN");
              console.log("======================================");

              console.log("ğŸŸ¢ URL:", WEBSOCKET_ADRESI);
              console.log("ğŸŸ¢ Protocol:", socket.protocol);
              console.log("ğŸŸ¢ ReadyState:", socket.readyState);

              console.log("======================================");
            };

            /**
             * =========================================
             * NATIVE WEBSOCKET ERROR
             * =========================================
             */
            socket.onerror = (event: Event) => {
              console.error("======================================");
              console.error("ğŸ”´ğŸ”´ğŸ”´ ARAMA NATIVE WEBSOCKET ERROR");
              console.error("======================================");

              console.error(event);

              console.error("======================================");
            };

            /**
             * =========================================
             * NATIVE WEBSOCKET CLOSE
             * =========================================
             */
            socket.onclose = (event: CloseEvent) => {
              console.log("======================================");
              console.log("ğŸ”´ğŸ”´ğŸ”´ ARAMA NATIVE WEBSOCKET CLOSE");
              console.log("======================================");

              console.log("ğŸ”´ Code:", event.code);
              console.log("ğŸ”´ Reason:", event.reason);
              console.log("ğŸ”´ Clean:", event.wasClean);

              console.log("======================================");
            };

            /**
             * =========================================
             * NATIVE MESSAGE
             * =========================================
             */
            socket.onmessage = (event: MessageEvent) => {
              console.log("======================================");
              console.log("ğŸŸ£ğŸŸ£ğŸŸ£ NATIVE WEBSOCKET MESSAGE GELDÄ°");
              console.log("======================================");

              /**
               * GÃ¼venlik nedeniyle mesajÄ±n tamamÄ±nÄ±
               * burada yazdÄ±rmÄ±yoruz.
               */
              if (typeof event.data === "string") {
                console.log("ğŸŸ£ Gelen mesaj uzunluÄŸu:", event.data.length);
              } else {
                console.log("ğŸŸ£ Gelen mesaj tipi:", typeof event.data);
              }

              console.log("======================================");
            };

            console.log("ğŸŸ¢ Native WebSocket nesnesi oluÅŸturuldu.");

            return socket;
          },

          /**
           * =================================================
           * CONNECT HEADERS
           * =================================================
           */
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },

          /**
           * =================================================
           * RECONNECT
           * =================================================
           */
          reconnectDelay: 0,

          /**
           * =================================================
           * HEARTBEAT
           * =================================================
           */
          heartbeatIncoming: 0,
          heartbeatOutgoing: 0,

          /**
           * =================================================
           * DEBUG
           * =================================================
           */
          debug: (mesaj: string) => {
            /**
             * JWT tokenÄ±n console'a yazÄ±lmasÄ±nÄ± engelle.
             */
            if (mesaj.includes("Authorization:")) {
              const temizMesaj = mesaj.replace(
                /Authorization:Bearer\s+[^\s]+/gi,
                "Authorization:Bearer [TOKEN]",
              );

              console.log("ğŸ”µ STOMP DEBUG:", temizMesaj);

              return;
            }

            console.log("ğŸ”µ STOMP DEBUG:", mesaj);
          },

          /**
           * =================================================
           * STOMP CONNECTED
           * =================================================
           */
          onConnect: (frame) => {
            try {
              console.log("======================================");
              console.log("ğŸŸ¢ğŸŸ¢ğŸŸ¢ ARAMA STOMP CONNECTED");
              console.log("======================================");
              console.log("ğŸŸ¢ STOMP VERSION:", frame.headers["version"]);
              console.log("ğŸŸ¢ SESSION:", frame.headers["session"]);
              console.log("ğŸŸ¢ STOMP connected:", client.connected);

              this.webSocketBagli = true;

              const topic = `/topic/arama/${kullaniciId}`;

              if (this.aramaSubscription) {
                try {
                  this.aramaSubscription.unsubscribe();
                } catch (unsubscribeHatasi) {
                  console.warn(
                    "âš ï¸ Eski arama subscription kapatÄ±lamadÄ±:",
                    unsubscribeHatasi,
                  );
                }
                this.aramaSubscription = null;
              }

              this.aramaSubscription = client.subscribe(
                topic,
                (message: IMessage) => {
                  console.log("======================================");
                  console.log("ğŸ“¨ğŸ“¨ğŸ“¨ ARAMA STOMP MESSAGE");
                  console.log("======================================");
                  console.log("ğŸ“¨ Destination:", message.headers.destination);
                  console.log("ğŸ“¨ Body length:", message.body?.length ?? 0);
                  console.log("======================================");

                  this.gelenAramaSinyaliniIsle(message.body);
                },
              );

              console.log("ğŸŸ¢ ARAMA TOPIC SUBSCRIBE TAMAM");
              console.log("ğŸŸ¢ TOPIC:", topic);
              console.log("======================================");

              basari();
              this.olaylar.baglandi?.();
            } catch (connectHatasi) {
              const error =
                connectHatasi instanceof Error
                  ? connectHatasi
                  : new Error("STOMP CONNECT iÅŸlemi baÅŸarÄ±sÄ±z.");

              console.error("âŒ STOMP CONNECT HANDLER HATASI:", error);

              this.webSocketBagli = false;
              hata(error);
            }
          },

          /**
           * =================================================
           * STOMP ERROR
           * =================================================
           */
          onStompError: (frame) => {
            console.error("======================================");
            console.error("ğŸ”´ğŸ”´ğŸ”´ STOMP ERROR");
            console.error("======================================");

            console.error("ğŸ”´ MESSAGE:", frame.headers["message"]);

            /**
             * Body iÃ§inde JWT varsa tamamÄ±nÄ± basmÄ±yoruz.
             */
            console.error("ğŸ”´ BODY LENGTH:", frame.body?.length ?? 0);

            console.error("======================================");

            this.webSocketBagli = false;
          },

          /**
           * =================================================
           * WEBSOCKET ERROR
           * =================================================
           */
          onWebSocketError: (event) => {
            console.error("======================================");
            console.error("ğŸ”´ğŸ”´ğŸ”´ STOMP WEBSOCKET ERROR");
            console.error("======================================");

            console.error(event);

            console.error("======================================");

            this.webSocketBagli = false;
          },

          /**
           * =================================================
           * WEBSOCKET CLOSE
           * =================================================
           */
          onWebSocketClose: (event) => {
            console.log("======================================");
            console.log("ğŸ”´ğŸ”´ğŸ”´ STOMP WEBSOCKET CLOSE");
            console.log("======================================");

            console.log("ğŸ”´ Code:", event.code);
            console.log("ğŸ”´ Reason:", event.reason);
            console.log("ğŸ”´ Clean:", event.wasClean);

            console.log("======================================");

            this.webSocketBagli = false;
          },
        });

        this.stompClient = client;

        /**
         * =====================================================
         * STOMP CONNECT HANDLER
         * =====================================================
         *
         * onConnect yalnÄ±zca Client options iÃ§inde tanÄ±mlÄ±dÄ±r.
         * Sonradan tekrar ezilmez.
         */
        /**
         * =====================================================
         * STOMP ERROR
         * =====================================================
         */

        client.onStompError = (frame) => {
          console.error("======================================");

          console.error("ğŸ”´ğŸ”´ğŸ”´ STOMP ERROR");

          console.error("======================================");

          console.error("ğŸ”´ Headers:", frame.headers);

          console.error("ğŸ”´ Body:", frame.body);

          console.error("======================================");

          const mesaj =
            frame.headers?.message || frame.body || "STOMP sunucu hatasÄ±.";

          const error = new Error(mesaj);

          this.webSocketBagli = false;

          this.olaylar.hata?.(error);

          hata(error);
        };

        /**
         * =====================================================
         * WEBSOCKET ERROR
         * =====================================================
         */

        client.onWebSocketError = (event) => {
          console.error("======================================");

          console.error("ğŸ”´ğŸ”´ğŸ”´ STOMP WEBSOCKET ERROR");

          console.error("======================================");

          console.error(event);

          console.error("======================================");

          const error = new Error("Arama WebSocket baÄŸlantÄ± hatasÄ±.");

          this.webSocketBagli = false;

          this.olaylar.hata?.(error);

          hata(error);
        };

        /**
         * =====================================================
         * WEBSOCKET CLOSE
         * =====================================================
         */

        client.onWebSocketClose = (event) => {
          console.log("======================================");

          console.log("ğŸ”´ğŸ”´ğŸ”´ STOMP WEBSOCKET CLOSE");

          console.log("======================================");

          console.log("ğŸ”´ Code:", event.code);

          console.log("ğŸ”´ Reason:", event.reason);

          console.log("ğŸ”´ Clean:", event.wasClean);

          console.log("======================================");

          this.webSocketBagli = false;

          this.aramaSubscription = null;

          if (tamamlandi) {
            this.olaylar.baglantiKoptu?.();
          } else {
            hata(
              new Error(
                `Arama WebSocket baÄŸlantÄ±sÄ± kurulmadan kapandÄ±. Kod: ${event.code}`,
              ),
            );
          }
        };

        /**
         * =====================================================
         * TIMEOUT
         * =====================================================
         */

        timeoutId = setTimeout(() => {
          if (tamamlandi) {
            return;
          }

          console.error("======================================");

          console.error("âŒâŒâŒ STOMP CONNECT TIMEOUT âŒâŒâŒ");

          console.error("======================================");

          console.error(
            `${WEBSOCKET_BAGLANTI_TIMEOUT_MS / 1000} saniye iÃ§inde STOMP CONNECTED alÄ±namadÄ±.`,
          );

          console.error("STOMP connected:", client.connected);

          console.error("STOMP active:", client.active);

          console.error("======================================");

          const error = new Error(
            "Arama WebSocket baÄŸlantÄ±sÄ± zaman aÅŸÄ±mÄ±na uÄŸradÄ±. STOMP CONNECTED alÄ±namadÄ±.",
          );

          this.webSocketBagli = false;

          this.olaylar.hata?.(error);

          hata(error);

          void client.deactivate();
        }, WEBSOCKET_BAGLANTI_TIMEOUT_MS);

        /**
         * =====================================================
         * ACTIVATE
         * =====================================================
         */

        console.log("======================================");

        console.log("ğŸ“¤ STOMP CLIENT ACTIVATE");

        console.log("======================================");

        client.activate();

        console.log("ğŸŸ¢ STOMP CLIENT ACTIVATE Ã‡AÄRILDI");
      } catch (connectHatasi) {
        console.error("======================================");

        console.error("âŒ STOMP BAÄLANTI BAÅLATMA HATASI");

        console.error("======================================");

        console.error(connectHatasi);

        console.error("======================================");

        const error =
          connectHatasi instanceof Error
            ? connectHatasi
            : new Error("Arama WebSocket baÄŸlantÄ±sÄ± kurulamadÄ±.");

        this.webSocketBagli = false;

        this.olaylar.hata?.(error);

        hata(error);
      }
    });

    this.webSocketBaglantiPromise = promise;

    try {
      await promise;

      console.log("======================================");

      console.log("ğŸŸ¢ğŸŸ¢ğŸŸ¢ ARAMA STOMP HAZIR");

      console.log("ğŸŸ¢ STOMP baÄŸlÄ±:", this.webSocketBagli);

      console.log("======================================");
    } catch (hata) {
      this.webSocketBaglantiPromise = null;

      this.webSocketBagli = false;

      throw hata;
    }
  }

  /**
   * =========================================================
   * GELEN ARAMALARI DÄ°NLEMEYÄ° BAÅLAT
   * =========================================================
   *
   * KullanÄ±cÄ± arama baÅŸlatmadan Ã¶nce de arama topic'ini
   * dinler. BÃ¶ylece karÅŸÄ± taraf aradÄ±ÄŸÄ±nda CALL_OFFER
   * doÄŸrudan uygulamaya ulaÅŸÄ±r.
   */
  async gelenAramalariDinlemeyeBaslat(kullaniciId: number): Promise<void> {
    if (!Number.isFinite(kullaniciId)) {
      throw new Error("GeÃ§ersiz kullanÄ±cÄ± ID.");
    }

    this.mevcutKullaniciId = kullaniciId;

    console.log("======================================");
    console.log("ğŸ“ GELEN ARAMA DÄ°NLEME BAÅLATILIYOR");
    console.log("ğŸ“ KullanÄ±cÄ± ID:", kullaniciId);
    console.log("ğŸ“ Topic:", `/topic/arama/${kullaniciId}`);
    console.log("======================================");

    if (this.hariciSinyalGonderici) {
      console.log("ğŸ“¡ Harici STOMP taÅŸÄ±yÄ±cÄ±sÄ± aktif.");
      console.log(
        "â­ï¸ Native STOMP baÄŸlantÄ±sÄ± aÃ§Ä±lmadan dinleme hazÄ±r.",
      );
    } else {
      await this.webSocketBaglantisiAc();
    }

    console.log("======================================");
    console.log("ğŸŸ¢ GELEN ARAMA DÄ°NLEME HAZIR");
    console.log("ğŸŸ¢ KullanÄ±cÄ± ID:", kullaniciId);
    console.log("ğŸŸ¢ Topic:", `/topic/arama/${kullaniciId}`);
    console.log("======================================");
  }

  /**
   * =========================================================
   * GELEN ARAMA MESAJI
   * =========================================================
   */

  public gelenAramaSinyaliniIsle(body: string) {
    try {
      console.log("======================================");

      console.log("ğŸ“©ğŸ“©ğŸ“© ARAMA SÄ°NYALÄ° ALINDI");

      console.log("======================================");

      console.log("ğŸ“© BODY:", body);

      const sinyal: BackendAramaSinyali = JSON.parse(body);

      /**
       * Backend'deki hedefKullaniciId
       * mevcut yapÄ±da sinyalin
       * gÃ¶nderen kullanÄ±cÄ±sÄ±nÄ±
       * temsil ediyor.
       */

      const gonderenKullaniciId = sinyal.hedefKullaniciId;

      if (!gonderenKullaniciId) {
        console.warn(
          "âš ï¸ Gelen arama sinyalinde gÃ¶nderen kullanÄ±cÄ± ID yok.",
        );

        return;
      }

      const aramaTuru: AramaTuru = sinyal.tur === "VIDEO" ? "VIDEO" : "SES";

      switch (sinyal.tip) {
        case "CALL_OFFER": {
          if (!sinyal.sdp) {
            console.warn("âš ï¸ CALL_OFFER SDP iÃ§ermiyor.");

            return;
          }

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

          this.arananKullaniciId = gonderenKullaniciId;

          // GELEN ARAMA: karÅŸÄ± taraf cevap verene/reddedene kadar telefon zili Ã§al.
          void this.gelenAramaSesiniBaslat();

          console.log("======================================");

          console.log("ğŸ“ GELEN CALL_OFFER");

          console.log("ğŸ“ Arayan:", gonderenKullaniciId);

          console.log("ğŸ“ TÃ¼r:", aramaTuru);

          console.log("======================================");

          this.olaylar.teklif?.(mesaj);

          break;
        }

        case "CALL_ANSWER": {
          if (!sinyal.sdp) {
            console.warn("âš ï¸ CALL_ANSWER SDP iÃ§ermiyor.");

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

          console.log(
            "ğŸ“ GELEN CALL_ANSWER",
            "GÃ¶nderen:",
            gonderenKullaniciId,
          );

          this.aramaSesiniDurdur();
          this.olaylar.cevap?.(mesaj);

          break;
        }

        case "CALL_ICE": {
          if (!sinyal.aday) {
            console.warn("âš ï¸ CALL_ICE aday iÃ§ermiyor.");

            return;
          }

          let aday: RTCIceCandidateInit;

          try {
            aday =
              typeof sinyal.aday === "string"
                ? JSON.parse(sinyal.aday)
                : (sinyal.aday as any);
          } catch (hata) {
            console.error("âŒ ICE aday JSON parse edilemedi:", hata);

            return;
          }

          const mesaj: AramaMesaji = {
            tip: "CALL_ICE",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,

            aday,
          };

          console.log("ğŸ§Š GELEN CALL_ICE", "GÃ¶nderen:", gonderenKullaniciId);

          this.olaylar.ice?.(mesaj);

          void this.iceAdayiEkle(aday);

          break;
        }

        case "CALL_REJECT": {
          const mesaj: AramaMesaji = {
            tip: "CALL_REJECT",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,
          };

          console.log(
            "ğŸ“µ GELEN CALL_REJECT",
            "GÃ¶nderen:",
            gonderenKullaniciId,
          );

          this.aramaSesiniDurdur();
          this.olaylar.reddet?.(mesaj);

          break;
        }

        case "CALL_END": {
          const mesaj: AramaMesaji = {
            tip: "CALL_END",

            arayanId: gonderenKullaniciId,

            arananId: this.mevcutKullaniciId!,
          };

          console.log("ğŸ“ GELEN CALL_END", "GÃ¶nderen:", gonderenKullaniciId);

          this.aramaSesiniDurdur();

          // KarÅŸÄ± taraf zaten CALL_END gÃ¶nderdi.
          // Bu nedenle baÄŸlantÄ±yÄ± kapatÄ±rken tekrar CALL_END gÃ¶ndermiyoruz.
          void this.aramayiBitir(true);

          this.olaylar.bitir?.(mesaj);

          break;
        }

        default:
          console.warn("âš ï¸ Bilinmeyen arama sinyal tipi:", sinyal.tip);
      }
    } catch (hata) {
      console.error("âŒ Arama sinyali iÅŸlenemedi:", hata);

      const error =
        hata instanceof Error ? hata : new Error("Arama sinyali iÅŸlenemedi.");

      this.olaylar.hata?.(error);
    }
  }

  /**
   * =========================================================
   * BACKEND'E WEBRTC SIGNALING GÃ–NDER
   * =========================================================
   */

  private aramaSinyaliGonder(
    tip: string,
    bilgiler: {
      sdp?: string;
      aday?: RTCIceCandidateInit;
    } = {},
  ) {
    if (!this.arananKullaniciId) {
      console.warn(
        "âš ï¸ Arama sinyali gÃ¶nderilemedi. Hedef kullanÄ±cÄ± yok.",
      );
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
      };
      void Promise.resolve(this.hariciSinyalGonderici(sinyal)).catch((hata) => {
        const error =
          hata instanceof Error
            ? hata
            : new Error("Arama sinyali gÃ¶nderilemedi.");
        console.error("âŒ Harici STOMP arama sinyali hatasÄ±:", error);
        this.olaylar.hata?.(error);
      });
      return;
    }

    if (
      !this.stompClient ||
      !this.stompClient.connected ||
      !this.webSocketBagli
    ) {
      console.warn("âš ï¸ Arama sinyali gÃ¶nderilemedi. STOMP baÄŸlÄ± deÄŸil.");
      return;
    }

    if (!this.arananKullaniciId) {
      console.warn(
        "âš ï¸ Arama sinyali gÃ¶nderilemedi. Hedef kullanÄ±cÄ± yok.",
      );

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
    };

    console.log("======================================");

    console.log("ğŸ“¤ ARAMA SÄ°NYALÄ° GÃ–NDERÄ°LÄ°YOR");

    console.log("ğŸ“¤ Tip:", tip);

    console.log("ğŸ“¤ Hedef:", this.arananKullaniciId);

    console.log("ğŸ“¤ TÃ¼r:", this.aramaTuru);

    console.log("======================================");

    try {
      this.stompClient.publish({
        destination: "/app/arama/sinyal",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify(sinyal),
      });

      console.log("âœ… ARAMA SÄ°NYALÄ° BACKEND'E GÃ–NDERÄ°LDÄ°");
    } catch (hata) {
      console.error("âŒ Arama sinyali gÃ¶nderilemedi:", hata);

      const error =
        hata instanceof Error
          ? hata
          : new Error("Arama sinyali gÃ¶nderilemedi.");

      this.olaylar.hata?.(error);
    }
  }

  /**
   * =========================================================
   * KAMERA / MÄ°KROFON
   * =========================================================
   */

  async medyaAkisiniAl(): Promise<MediaStream> {
    try {
      console.log("ğŸ™ï¸ğŸ“¹ Mikrofon/kamera eriÅŸimi isteniyor...");

      const audioOturumuBaslatildi = this.aramaAudioOturumunuBaslat();

      if (!audioOturumuBaslatildi) {
        console.warn(
          "âš ï¸ Android call audio oturumu baÅŸlatÄ±lamadÄ±; WebRTC medya akÄ±ÅŸÄ± yine de alÄ±nacak.",
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

      console.log("ğŸ™ï¸ğŸ“¹ Yerel medya akÄ±ÅŸÄ± alÄ±ndÄ±.");

      console.log(
        "ğŸ™ï¸ Audio track sayÄ±sÄ±:",
        stream.getAudioTracks().length,
      );

      console.log("ğŸ“¹ Video track sayÄ±sÄ±:", stream.getVideoTracks().length);

      return stream;
    } catch (hata) {
      console.error("âŒ Mikrofon/kamera eriÅŸim hatasÄ±:", hata);

      const error =
        hata instanceof Error
          ? hata
          : new Error("Mikrofon veya kamera eriÅŸilemedi.");

      this.olaylar.hata?.(error);

      throw error;
    }
  }

  /**
   * =========================================================
   * PEER CONNECTION
   * =========================================================
   */

  async baglantiOlustur(): Promise<RTCPeerConnection> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanÄ±cÄ±larÄ± ayarlanmamÄ±ÅŸ.");
    }

    if (this.peerConnection) {
      console.log("ğŸ”— Mevcut RTCPeerConnection kullanÄ±lÄ±yor.");

      // Ã–NEMLÄ°:
      // PeerConnection daha Ã¶nce oluÅŸturulmuÅŸ olabilir ancak yerel medya
      // henÃ¼z hazÄ±r olmayabilir. Bu durumda doÄŸrudan return etmek,
      // createOffer()'Ä±n track'ler eklenmeden Ã§alÄ±ÅŸmasÄ±na neden olur.
      // SonuÃ§ olarak ikinci offer'da m-line sÄ±rasÄ± deÄŸiÅŸir ve WebRTC:
      // "The order of m-lines in subsequent offer..." hatasÄ± verir.
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
            console.log("â­ï¸ Track zaten PeerConnection'da:", track.kind);
            return;
          }

          console.log(
            "ğŸ™ï¸ğŸ“¹ Mevcut PeerConnection'a Track ekleniyor:",
            track.kind,
          );

          this.peerConnection!.addTrack(track, this.yerelStream!);
        });
      }

      return this.peerConnection;
    }

    console.log("ğŸ”— RTCPeerConnection oluÅŸturuluyor...");

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
          console.log("â­ï¸ Track zaten PeerConnection'da:", track.kind);
          return;
        }

        console.log("ğŸ™ï¸ğŸ“¹ Track PeerConnection'a ekleniyor:", track.kind);

        peerConnection.addTrack(track, this.yerelStream!);
      });
    }

    peerConnection.ontrack = (event: any) => {
      console.log("ğŸ¥ Uzak medya akÄ±ÅŸÄ± geldi.");

      if (event.track) {
        console.log(
          "ğŸ§ Uzak track:",
          event.track.kind,
          "id:",
          event.track.id,
          "enabled:",
          event.track.enabled,
        );

        if (event.track.kind === "audio") {
          console.log("ğŸ”ŠğŸ”ŠğŸ”Š UZAK SES TRACK'Ä° ALINDI");

          try {
            event.track.enabled = true;
          } catch (hata) {
            console.warn("âš ï¸ Uzak audio track aktif edilemedi:", hata);
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
            console.warn("âš ï¸ Uzak track stream'e eklenemedi:", hata);
          }
        }
      }

      if (!uzakStream) {
        console.warn("âš ï¸ Uzak medya stream'i oluÅŸturulamadÄ±.");
        return;
      }

      this.uzakStream = uzakStream;

      console.log("ğŸ¥ Uzak stream:", uzakStream.id);
      console.log(
        "ğŸ™ï¸ Uzak audio track:",
        uzakStream.getAudioTracks().length,
      );
      console.log("ğŸ“¹ Uzak video track:", uzakStream.getVideoTracks().length);

      this.olaylar.uzakStream?.(uzakStream);
    };

    peerConnection.onicecandidate = (event: any) => {
      if (!event.candidate) {
        console.log("ğŸ§Š ICE Candidate Ã¼retimi tamamlandÄ±.");

        return;
      }

      const aday = event.candidate.toJSON();

      console.log("ğŸ§Š ICE Candidate Ã¼retildi.");

      this.iceGonder(aday);
    };

    peerConnection.onconnectionstatechange = () => {
      const durum = peerConnection.connectionState;

      console.log("ğŸ“¡ WebRTC baÄŸlantÄ± durumu:", durum);

      if (durum === "connected") {
        console.log("ğŸŸ¢ WEBRTC BAÄLANTISI KURULDU!");
        if (!this.webRtcBaglandiBildirildi) {
          this.webRtcBaglandiBildirildi = true;
          this.aramaSesiniDurdur();

          // WebRTC baÄŸlandÄ±ktan sonra ses yÃ¶nlendirmesini deÄŸiÅŸtirme.
          // BaÅŸlangÄ±Ã§ yÃ¶nlendirmesi arama tÃ¼rÃ¼ne gÃ¶re zaten belirlendi.
          // KullanÄ±cÄ±nÄ±n manuel hoparlÃ¶r/ahize tercihi korunur.
          console.log(
            this.hoparlorAcik
              ? "ğŸ”Š BaÄŸlantÄ± kuruldu: HOPARLÃ–R AÃ‡IK"
              : "ğŸ”ˆ BaÄŸlantÄ± kuruldu: AHÄ°ZE AÃ‡IK",
          );

          this.olaylar.baglandi?.();
        }
      }

      if (
        durum === "disconnected" ||
        durum === "failed" ||
        durum === "closed"
      ) {
        console.log("ğŸ”´ WebRTC baÄŸlantÄ±sÄ± koptu:", durum);
        if (!this.aramaSonlandiriliyor) {
          this.olaylar.baglantiKoptu?.();
        }
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const durum = peerConnection.iceConnectionState;
      console.log("ğŸ§Š ICE durumu:", durum);

      if (durum === "connected" || durum === "completed") {
        console.log("ğŸŸ¢ğŸ§Š ICE BAÄLANTISI KURULDU:", durum);
      }

      if (durum === "failed") {
        console.error("ğŸ”´ğŸ§Š ICE BAÄLANTISI BAÅARISIZ.");
        this.olaylar.hata?.(new Error("WebRTC ICE baÄŸlantÄ±sÄ± kurulamadÄ±."));
      }
    };

    peerConnection.onicecandidateerror = (event: any) => {
      console.error("ğŸ”´ğŸ§Š ICE CANDIDATE ERROR:", {
        errorCode: event?.errorCode,
        errorText: event?.errorText,
        url: event?.url,
      });
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log(
        "ğŸ§Š ICE gathering durumu:",
        peerConnection.iceGatheringState,
      );
    };

    peerConnection.onsignalingstatechange = () => {
      console.log("ğŸ“¡ Signaling durumu:", peerConnection.signalingState);
    };

    return peerConnection;
  }

  /**
   * =========================================================
   * ARAMA BAÅLAT
   * =========================================================
   */

  async aramaBaslat(): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanÄ±cÄ±larÄ± ayarlanmamÄ±ÅŸ.");
    }

    // AynÄ± arama iÃ§in aramaBaslat() birden fazla kez tetiklenirse
    // ikinci Ã§aÄŸrÄ± ilk Ã§aÄŸrÄ±nÄ±n sonucunu bekler.
    //
    // Ã–NEMLÄ°:
    // Eski yapÄ±da ikinci Ã§aÄŸrÄ± "offerOlusturuluyor" hatasÄ± fÄ±rlatÄ±yor,
    // Ã¼st katman da bunu aramayÄ± kapatma sebebi olarak yorumlayabiliyordu.
    // SonuÃ§ta ilk createOffer tamamlanmadan PeerConnection kapanÄ±yor
    // ve:
    // "Failed to set local offer sdp: Called in wrong state: closed"
    // hatasÄ± oluÅŸuyordu.
    if (this.aramaBaslatPromise) {
      console.warn(
        "â­ï¸ Arama zaten baÅŸlatÄ±lÄ±yor. Ä°kinci arama baÅŸlatma isteÄŸi ilk iÅŸlemi bekleyecek.",
      );

      return this.aramaBaslatPromise;
    }

    const baslatmaPromise = this.aramaBaslatInternal();

    this.aramaBaslatPromise = baslatmaPromise;

    try {
      return await baslatmaPromise;
    } finally {
      // Sadece halen aynÄ± Promise tutuluyorsa temizle.
      if (this.aramaBaslatPromise === baslatmaPromise) {
        this.aramaBaslatPromise = null;
      }
    }
  }

  /**
   * =========================================================
   * ARAMA BAÅLAT - ASIL Ä°ÅLEM
   * =========================================================
   */
  private async aramaBaslatInternal(): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanÄ±cÄ±larÄ± ayarlanmamÄ±ÅŸ.");
    }

    console.log("======================================");

    if (this.hariciSinyalGonderici) {
      console.log("ğŸ“¡ HARÄ°CÄ° STOMP TAÅIYICISI KULLANILIYOR");
    } else {
      console.log("ğŸ”Œ ARAMA BAÅLATMADAN Ã–NCE STOMP KONTROLÃœ");

      console.log("ğŸ”Œ STOMP baÄŸlÄ± mÄ±:", this.webSocketBagliMi());

      console.log("======================================");

      await this.webSocketBaglantisiAc();

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket baÄŸlantÄ±sÄ± hazÄ±r deÄŸil.");
      }

      console.log("ğŸŸ¢ ARAMA Ä°Ã‡Ä°N STOMP HAZIR");

      console.log(
        "ğŸ“¡ Arama topic:",
        `/topic/arama/${this.mevcutKullaniciId}`,
      );
    }

    this.aramaSonlandiriliyor = false;

    // Yeni bir arama baÅŸlatÄ±lÄ±yorsa eski offer kilidi temiz olmalÄ±.
    // Ancak burada yeni bir createOffer baÅŸlatmÄ±yoruz. Sadece durum
    // tutarlÄ±lÄ±ÄŸÄ±nÄ± saÄŸlÄ±yoruz.
    this.offerOlusturuluyor = false;

    // Arama baÅŸlar baÅŸlamaz Android call-audio oturumunu aÃ§.
    // SES: ahize, VIDEO: hoparlÃ¶r.
    this.aramaAudioOturumunuBaslat();

    // KarÅŸÄ± taraf cevap verene kadar giden arama sesi Ã§al.
    void this.aramaSesiniBaslat();

    const peerConnection = await this.baglantiOlustur();

    // PeerConnection cleanup sÄ±rasÄ±nda kapandÄ±ysa yeni offer Ã¼retmeye
    // Ã§alÄ±ÅŸmayalÄ±m. Bu kontrol "closed" hatasÄ±nÄ± daha anlaÅŸÄ±lÄ±r hale getirir.
    if ((peerConnection.signalingState as string) === "closed") {
      throw new Error(
        "WebRTC PeerConnection arama baÅŸlamadan Ã¶nce kapandÄ±.",
      );
    }

    // AynÄ± Promise korumasÄ± nedeniyle normal ÅŸartlarda buraya ikinci
    // createOffer Ã§aÄŸrÄ±sÄ± ulaÅŸmaz. Yine de gÃ¼venlik kontrolÃ¼ bÄ±rakÄ±yoruz.
    if (this.offerOlusturuluyor) {
      console.warn(
        "â­ï¸ WebRTC Offer halen oluÅŸturuluyor. Mevcut arama iÅŸlemi korunuyor.",
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

      throw new Error("WebRTC Offer halen oluÅŸturuluyor.");
    }

    // Arayan tarafta yeni offer Ã¼retilecekse signaling state stable olmalÄ±.
    if (peerConnection.signalingState !== "stable") {
      const mevcutOffer = peerConnection.localDescription;

      if (mevcutOffer?.type === "offer" && mevcutOffer.sdp) {
        console.warn(
          "âš ï¸ PeerConnection zaten local offer iÃ§eriyor. Mevcut offer tekrar gÃ¶nderiliyor.",
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
        `WebRTC Offer oluÅŸturulamadÄ±. Signaling durumu: ${peerConnection.signalingState}`,
      );
    }

    this.offerOlusturuluyor = true;

    try {
      console.log("ğŸ“¤ WebRTC Offer oluÅŸturuluyor...");

      // Offer oluÅŸturulurken PeerConnection'Ä±n kapatÄ±lmadÄ±ÄŸÄ±ndan emin ol.
      if ((peerConnection.signalingState as string) === "closed") {
        throw new Error(
          "WebRTC PeerConnection kapalÄ± olduÄŸu iÃ§in Offer oluÅŸturulamadÄ±.",
        );
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.aramaTuru === "VIDEO",
      });

      // createOffer tamamlandÄ±ktan sonra arama kapatÄ±lmÄ±ÅŸ olabilir.
      // KapalÄ± PeerConnection'a setLocalDescription gÃ¶ndermiyoruz.
      if (
        (peerConnection.signalingState as string) === "closed" ||
        this.peerConnection !== peerConnection ||
        this.aramaSonlandiriliyor
      ) {
        throw new Error(
          "Arama Offer oluÅŸturulurken sonlandÄ±rÄ±ldÄ±; LocalDescription ayarlanmadÄ±.",
        );
      }

      await peerConnection.setLocalDescription(offer);

      console.log("ğŸ“¤ WebRTC Offer oluÅŸturuldu.");
      console.log("ğŸ“¤ LocalDescription ayarlandÄ±.");
      console.log("ğŸ“¤ Offer signaling state:", peerConnection.signalingState);

      const teklif = {
        type: offer.type,
        sdp: offer.sdp,
      };

      // CALL_OFFER yalnÄ±zca local description ayarlandÄ±ktan sonra gÃ¶nderilir.
      this.aramaSinyaliGonder("CALL_OFFER", {
        sdp: offer.sdp ?? undefined,
      });

      console.log("ğŸ“¤ CALL_OFFER karÅŸÄ± tarafa gÃ¶nderildi.");

      return teklif;
    } finally {
      this.offerOlusturuluyor = false;
    }
  }

  /**
   * =========================================================
   * GELEN OFFER'I KABUL ET
   * =========================================================
   */

  async teklifiKabulEt(
    teklif: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    if (this.mevcutKullaniciId === null || this.arananKullaniciId === null) {
      throw new Error("Arama kullanÄ±cÄ±larÄ± ayarlanmamÄ±ÅŸ.");
    }

    console.log("ğŸ“ Gelen teklif kabul ediliyor.");

    if (!this.hariciSinyalGonderici) {
      await this.webSocketBaglantisiAc();

      if (!this.webSocketBagliMi()) {
        throw new Error("Arama WebSocket baÄŸlantÄ±sÄ± hazÄ±r deÄŸil.");
      }
    }

    this.aramaSonlandiriliyor = false;

    // Gelen aramanÄ±n zilini durdur.
    this.aramaSesiniDurdur();

    // Arama kabul edildiÄŸi anda Android call-audio oturumunu aÃ§.
    // VarsayÄ±lan olarak hoparlÃ¶r ve mikrofon aktif olur.
    this.aramaAudioOturumunuBaslat();

    const peerConnection = await this.baglantiOlustur();

    if (!teklif.sdp) {
      throw new Error("Teklif SDP bilgisi bulunamadÄ±.");
    }

    const remoteDescription = new RTCSessionDescription({
      type: teklif.type,

      sdp: teklif.sdp,
    });

    console.log("ğŸ“¥ RemoteDescription ayarlanÄ±yor...");

    await peerConnection.setRemoteDescription(remoteDescription);

    this.remoteDescriptionHazir = true;

    console.log("ğŸŸ¢ RemoteDescription hazÄ±r.");

    await this.bekleyenIceAdaylariniEkle();

    console.log("ğŸ“¤ WebRTC Answer oluÅŸturuluyor...");

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    console.log("ğŸ“¤ WebRTC Answer oluÅŸturuldu.");

    this.aramaSinyaliGonder("CALL_ANSWER", {
      sdp: answer.sdp ?? undefined,
    });

    return {
      type: answer.type,

      sdp: answer.sdp,
    };
  }

  /**
   * =========================================================
   * ANSWER Ä°ÅLE
   * =========================================================
   */

  async cevabiIsle(cevap: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error("PeerConnection bulunamadÄ±.");
    }

    if (!cevap.sdp) {
      throw new Error("Cevap SDP bilgisi bulunamadÄ±.");
    }

    console.log("ğŸ“¥ WebRTC Answer iÅŸleniyor...");

    const remoteDescription = new RTCSessionDescription({
      type: cevap.type,

      sdp: cevap.sdp,
    });

    await this.peerConnection.setRemoteDescription(remoteDescription);

    this.remoteDescriptionHazir = true;

    console.log("ğŸ“¥ WebRTC Answer iÅŸlendi.");

    await this.bekleyenIceAdaylariniEkle();
  }

  /**
   * =========================================================
   * ICE EKLE
   * =========================================================
   */

  async iceAdayiEkle(aday: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      console.warn("âš ï¸ PeerConnection hazÄ±r deÄŸil. ICE bekletiliyor.");

      this.bekleyenIceAdaylari.push(aday);

      return;
    }

    if (!this.remoteDescriptionHazir) {
      console.log("â³ RemoteDescription hazÄ±r deÄŸil. ICE bekletiliyor.");

      this.bekleyenIceAdaylari.push(aday);

      return;
    }

    try {
      const candidate = new RTCIceCandidate(aday);

      await this.peerConnection.addIceCandidate(candidate);

      console.log("ğŸ§Š ICE Candidate eklendi.");
    } catch (hata) {
      console.error("âŒ ICE Candidate eklenemedi:", hata);
    }
  }

  /**
   * =========================================================
   * BEKLEYEN ICE
   * =========================================================
   */

  private async bekleyenIceAdaylariniEkle() {
    if (!this.peerConnection || !this.remoteDescriptionHazir) {
      return;
    }

    if (this.bekleyenIceAdaylari.length === 0) {
      return;
    }

    console.log(
      "ğŸ§Š Bekleyen ICE adaylarÄ± ekleniyor:",
      this.bekleyenIceAdaylari.length,
    );

    const adaylar = [...this.bekleyenIceAdaylari];

    this.bekleyenIceAdaylari = [];

    for (const aday of adaylar) {
      try {
        const candidate = new RTCIceCandidate(aday);

        await this.peerConnection.addIceCandidate(candidate);

        console.log("ğŸ§Š Bekleyen ICE eklendi.");
      } catch (hata) {
        console.error("âŒ Bekleyen ICE eklenemedi:", hata);
      }
    }
  }

  /**
   * =========================================================
   * ICE GÃ–NDER
   * =========================================================
   */

  private iceGonder(aday: RTCIceCandidateInit) {
    this.aramaSinyaliGonder("CALL_ICE", {
      aday,
    });
  }

  /**
   * =========================================================
   * ARAMAYI REDDET
   * =========================================================
   */

  aramayiReddet() {
    if (!this.arananKullaniciId) {
      return;
    }

    console.log("ğŸ“µ Arama reddediliyor.");

    this.aramaSesiniDurdur();
    this.aramaAudioOturumunuKapat();

    this.aramaSinyaliGonder("CALL_REJECT");
  }

  /**
   * =========================================================
   * ARAMAYI BÄ°TÄ°R
   * =========================================================
   */

  async aramayiBitir(karsiTarafBitirdi = false) {
    if (this.aramaSonlandiriliyor) {
      console.log(
        "â­ï¸ Arama zaten sonlandÄ±rÄ±lÄ±yor. Ä°kinci cleanup atlandÄ±.",
      );
      return;
    }

    this.aramaSonlandiriliyor = true;

    this.aramaSesiniDurdur();

    console.log(
      karsiTarafBitirdi
        ? "ğŸ“ KarÅŸÄ± taraf aramayÄ± bitirdi. WebRTC baÄŸlantÄ±sÄ± kapatÄ±lÄ±yor."
        : "ğŸ“ WebRTC gÃ¶rÃ¼ÅŸmesi sonlandÄ±rÄ±lÄ±yor.",
    );

    if (
      !karsiTarafBitirdi &&
      this.arananKullaniciId &&
      (this.hariciSinyalGonderici ||
        (this.stompClient && this.stompClient.connected && this.webSocketBagli))
    ) {
      console.log(
        "ğŸ“¤ KullanÄ±cÄ± aramayÄ± kapattÄ±. CALL_END gÃ¶nderiliyor.",
      );
      this.aramaSinyaliGonder("CALL_END");
    } else if (karsiTarafBitirdi) {
      console.log("â›” Gelen CALL_END iÃ§in tekrar CALL_END gÃ¶nderilmiyor.");
    }

    this.sesYonlendirmesiniKapat();

    if (this.yerelStream) {
      this.yerelStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (hata) {
          console.warn("âš ï¸ Yerel track kapatma hatasÄ±:", hata);
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
        console.warn("PeerConnection kapatma hatasÄ±:", hata);
      }
      this.peerConnection = null;
    }

    this.uzakStream = null;
    this.bekleyenIceAdaylari = [];
    this.remoteDescriptionHazir = false;
    this.webRtcBaglandiBildirildi = false;
    this.offerOlusturuluyor = false;

    // Cleanup sonrasÄ±nda yeni arama baÅŸlayabilsin.
    // Devam eden eski Promise varsa kendi finally bloÄŸunda zaten temizlenir.
    this.aramaBaslatPromise = null;

    if (!karsiTarafBitirdi) {
      this.olaylar.baglantiKoptu?.();
    }
  }

  /**
   * =========================================================
   * STOMP BAÄLANTISINI KAPAT
   * =========================================================
   */

  async webSocketBaglantisiniKapat() {
    if (this.hariciSinyalGonderici && !this.stompClient) {
      console.log("ğŸ“¡ Harici STOMP taÅŸÄ±yÄ±cÄ±sÄ± kullanÄ±lÄ±yor.");
      console.log(
        "â­ï¸ AramaWebRTC native STOMP baÄŸlantÄ±sÄ± kapatÄ±lmayacak.",
      );
      this.webSocketBagli = false;
      this.webSocketBaglantiPromise = null;
      return;
    }

    console.log("ğŸ”Œ Arama STOMP baÄŸlantÄ±sÄ± kapatÄ±lÄ±yor.");

    /**
     * Subscription kapat
     */

    if (this.aramaSubscription) {
      try {
        this.aramaSubscription.unsubscribe();

        console.log("ğŸ“¡ Arama subscription kapatÄ±ldÄ±.");
      } catch (hata) {
        console.warn("âš ï¸ Arama subscription kapatma hatasÄ±:", hata);
      }

      this.aramaSubscription = null;
    }

    /**
     * STOMP client kapat
     */

    const client = this.stompClient;

    this.stompClient = null;

    this.webSocketBagli = false;

    this.webSocketBaglantiPromise = null;

    if (client) {
      try {
        if (client.active || client.connected) {
          console.log("ğŸ“¤ STOMP client deactivate Ã§aÄŸrÄ±lÄ±yor.");

          await client.deactivate();
        }
      } catch (hata) {
        console.warn("âš ï¸ STOMP client kapatma hatasÄ±:", hata);
      }
    }

    console.log("ğŸ”Œ Arama STOMP baÄŸlantÄ±sÄ± kapatÄ±ldÄ±.");
  }

  /**
   * =========================================================
   * MÄ°KROFON
   * =========================================================
   */

  mikrofonuDegistir(acik: boolean) {
    if (!this.yerelStream) {
      return;
    }

    this.yerelStream.getAudioTracks().forEach((track) => {
      track.enabled = acik;
    });

    console.log(
      acik ? "ğŸ™ï¸ Mikrofon aÃ§Ä±ldÄ±." : "ğŸ”‡ Mikrofon kapatÄ±ldÄ±.",
    );
  }

  /**
   * =========================================================
   * KAMERA
   * =========================================================
   */

  kamerayiDegistir(acik: boolean) {
    if (!this.yerelStream) {
      return;
    }

    this.yerelStream.getVideoTracks().forEach((track) => {
      track.enabled = acik;
    });

    console.log(acik ? "ğŸ“¹ Kamera aÃ§Ä±ldÄ±." : "ğŸš« Kamera kapatÄ±ldÄ±.");
  }

  /**
   * =========================================================
   * KAMERA DEÄÄ°ÅTÄ°R
   * =========================================================
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

      console.log("ğŸ”„ Kamera deÄŸiÅŸtirildi.");
    } else {
      console.warn("âš ï¸ Bu cihazda kamera deÄŸiÅŸtirme desteklenmiyor.");
    }
  }

  /**
   * =========================================================
   * STREAM GETTER
   * =========================================================
   */

  getYerelStream(): MediaStream | null {
    return this.yerelStream;
  }

  getUzakStream(): MediaStream | null {
    return this.uzakStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * =========================================================
   * STOMP BAÄLI MI
   * =========================================================
   */

  webSocketBagliMi(): boolean {
    const client = this.stompClient;

    return this.webSocketBagli && client !== null && client.connected;
  }

  /**
   * =========================================================
   * MÄ°KROFON KISA METOTLARI
   * =========================================================
   */

  mikrofonKapat() {
    this.mikrofonuDegistir(false);
  }

  mikrofonAc() {
    this.mikrofonuDegistir(true);
  }

  /**
   * =========================================================
   * KAMERA KISA METOTLARI
   * =========================================================
   */

  kameraKapat() {
    this.kamerayiDegistir(false);
  }

  kameraAc() {
    this.kamerayiDegistir(true);
  }

  /**
   * =========================================================
   * OLAYLARI TEMÄ°ZLE
   * =========================================================
   */

  olaylariTemizle() {
    this.olaylar = {};
  }

  /**
   * =========================================================
   * TAM TEMÄ°ZLE
   * =========================================================
   */

  async temizle() {
    try {
      if (this.peerConnection || this.yerelStream || this.arananKullaniciId) {
        await this.aramayiBitir();
      }
    } catch (hata) {
      console.warn("Arama temizleme hatasÄ±:", hata);
    }

    try {
      await this.webSocketBaglantisiniKapat();
    } catch (hata) {
      console.warn("STOMP temizleme hatasÄ±:", hata);
    }

    this.aramaSesiniTemizle();

    this.mevcutKullaniciId = null;

    this.arananKullaniciId = null;

    this.aramaTuru = "SES";
    this.aramaAudioOturumuAcik = false;
    this.hoparlorAcik = false;
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
