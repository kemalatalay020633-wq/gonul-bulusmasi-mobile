import { Client, IMessage, IFrame, StompSubscription } from "@stomp/stompjs";

import AsyncStorage from "@react-native-async-storage/async-storage";

const WEBSOCKET_ADRESI = "ws://10.229.201.45:8081/ws-native";

export type StompTestSonucu = {
  basarili: boolean;
  mesaj: string;
};

class StompTest {
  private client: Client | null = null;

  private bagli = false;

  private baglantiPromise: Promise<void> | null = null;

  private subscription: StompSubscription | null = null;

  private kullaniciId: number | null = null;

  private aramaMesajCallback: ((body: string) => void) | null = null;

  /**
   * =========================================================
   * STOMP TEST BAŞLAT
   * =========================================================
   */

  aramaMesajiDinle(callback: (body: string) => void): void {
    this.aramaMesajCallback = callback;
  }

  aramaMesajiDinlemeyiBirak(): void {
    this.aramaMesajCallback = null;
  }

  async gelenAramaDinlemeyeBaslat(
    kullaniciId: number,
  ): Promise<StompTestSonucu> {
    this.kullaniciId = kullaniciId;
    return this.baslat(kullaniciId);
  }

  async sinyalGonder(sinyal: unknown): Promise<void> {
    if (!this.client?.connected || !this.bagli) {
      if (this.baglantiPromise) {
        await this.baglantiPromise;
      }
    }

    if (!this.client?.connected || !this.bagli) {
      throw new Error("STOMP sinyal gönderimi için bağlantı hazır değil.");
    }

    this.client.publish({
      destination: "/app/arama/sinyal",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sinyal),
    });
  }

  async baslat(kullaniciId: number): Promise<StompTestSonucu> {
    this.kullaniciId = kullaniciId;
    console.log("");
    console.log("======================================");
    console.log("🧪🧪🧪 STOMP TEST BAŞLIYOR");
    console.log("======================================");

    console.log("🧪 WebSocket adresi:", WEBSOCKET_ADRESI);

    console.log("🧪 Kullanıcı ID:", kullaniciId);

    /**
     * =====================================================
     * TOKEN
     * =====================================================
     */

    const token = await AsyncStorage.getItem("token");

    if (!token) {
      console.error("❌ STOMP TEST: JWT TOKEN YOK");

      return {
        basarili: false,
        mesaj: "JWT token bulunamadı.",
      };
    }

    console.log("🔐 STOMP TEST TOKEN VAR: EVET");

    /**
     * =====================================================
     * ESKİ CLIENT KAPAT
     * =====================================================
     */

    if (this.client) {
      console.log("🧹 Eski STOMP client kapatılıyor...");

      try {
        await this.client.deactivate();
      } catch (hata) {
        console.warn("⚠️ Eski STOMP client kapatma hatası:", hata);
      }

      this.client = null;
    }

    this.bagli = false;

    /**
     * =====================================================
     * PROMISE
     * =====================================================
     */

    const promise = new Promise<void>((resolve, reject) => {
      let tamamlandi = false;

      /**
       * =================================================
       * TIMEOUT
       * =================================================
       */

      const timeout = setTimeout(async () => {
        if (tamamlandi) {
          return;
        }

        console.error("======================================");

        console.error("❌ STOMP TEST TIMEOUT");

        console.error("❌ 20 saniyede CONNECTED gelmedi.");

        console.error("======================================");

        tamamlandi = true;

        this.bagli = false;

        try {
          if (this.client) {
            await this.client.deactivate();
          }
        } catch (hata) {
          console.warn("⚠️ Timeout sonrası client kapatılamadı:", hata);
        }

        reject(new Error("STOMP CONNECTED 20 saniye içinde gelmedi."));
      }, 20000);

      /**
       * =================================================
       * STOMP CLIENT
       * =================================================
       */

      const client = new Client({
        /**
         * React Native için native WebSocket.
         *
         * brokerURL yerine webSocketFactory
         * kullanıyoruz.
         */

        webSocketFactory: () => {
          console.log("======================================");

          console.log("🌐 STOMP TEST WEBSOCKET FACTORY");

          console.log("🌐 Adres:", WEBSOCKET_ADRESI);

          console.log("🌐 Protocol: v12.stomp");

          console.log("======================================");

          const socket = new WebSocket(WEBSOCKET_ADRESI, ["v12.stomp"]);

          /**
           * =================================================
           * NATIVE WEBSOCKET OPEN
           * =================================================
           *
           * Client üzerinde onWebSocketOpen
           * olmadığı için doğrudan socket'e
           * event ekliyoruz.
           */

          socket.onopen = () => {
            console.log("======================================");

            console.log("🟢🟢🟢 STOMP TEST WEBSOCKET OPEN");

            console.log("======================================");

            console.log("🟢 WebSocket URL:", WEBSOCKET_ADRESI);

            console.log("🟢 WebSocket protocol:", socket.protocol);

            console.log("🟢 WebSocket readyState:", socket.readyState);

            console.log("======================================");
          };

          socket.onerror = (event: Event) => {
            console.error("======================================");

            console.error("🔴 STOMP TEST NATIVE WEBSOCKET ERROR");

            console.error(event);

            console.error("======================================");
          };

          socket.onclose = (event: CloseEvent) => {
            console.log("======================================");

            console.log("🔴 STOMP TEST NATIVE WEBSOCKET CLOSE");

            console.log("🔴 CODE:", event.code);

            console.log("🔴 REASON:", event.reason);

            console.log("🔴 CLEAN:", event.wasClean);

            console.log("======================================");
          };

          socket.onmessage = (event: MessageEvent) => {
            console.log("🟣 NATIVE WEBSOCKET MESSAGE:", event.data);
          };

          console.log("🟢 STOMP TEST WebSocket oluşturuldu.");

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

        reconnectDelay: 0,

        heartbeatIncoming: 0,

        heartbeatOutgoing: 0,

        debug: (mesaj: string) => {
          console.log("🟣 STOMP TEST DEBUG:", mesaj);
        },
      });

      this.client = client;

      /**
       * =================================================
       * CONNECTED
       * =================================================
       */

      client.onConnect = (frame: IFrame) => {
        if (tamamlandi) {
          return;
        }

        console.log("======================================");

        console.log("🟢🟢🟢 STOMP TEST CONNECTED");

        console.log("======================================");

        console.log("🟢 CONNECTED HEADERS:", frame.headers);

        console.log("🟢 Kullanıcı ID:", kullaniciId);

        console.log("🟢 Client connected:", client.connected);

        this.bagli = true;

        /**
         * =================================================
         * SUBSCRIBE
         * =================================================
         */

        const topic = `/topic/arama/${kullaniciId}`;

        console.log("📡 TEST SUBSCRIBE:", topic);

        try {
          this.subscription = client.subscribe(topic, (message: IMessage) => {
            console.log("======================================");

            console.log("📨 STOMP TEST MESAJI GELDİ");

            console.log("======================================");

            console.log("📨 Destination:", message.headers?.destination);

            console.log("📨 Body:", message.body);

            console.log("======================================");
          });

          console.log("🟢 TEST SUBSCRIBE BAŞARILI");

          console.log("🟢 TEST TOPIC:", topic);
        } catch (subscribeHatasi) {
          console.error("❌ TEST SUBSCRIBE HATASI:", subscribeHatasi);
        }

        clearTimeout(timeout);

        tamamlandi = true;

        this.baglantiPromise = null;

        resolve();
      };

      /**
       * =================================================
       * STOMP ERROR
       * =================================================
       */

      client.onStompError = (frame: IFrame) => {
        console.error("======================================");

        console.error("🔴🔴🔴 STOMP TEST ERROR");

        console.error("======================================");

        console.error("🔴 MESSAGE:", frame.headers?.message);

        console.error("🔴 HEADERS:", frame.headers);

        console.error("🔴 BODY:", frame.body);

        console.error("======================================");

        this.bagli = false;

        if (!tamamlandi) {
          clearTimeout(timeout);

          tamamlandi = true;

          this.baglantiPromise = null;

          reject(new Error(frame.headers?.message || "STOMP sunucu hatası."));
        }
      };

      /**
       * =================================================
       * STOMP WEBSOCKET ERROR
       * =================================================
       */

      client.onWebSocketError = (event: Event) => {
        console.error("======================================");

        console.error("🔴🔴🔴 STOMP TEST WEBSOCKET ERROR");

        console.error("======================================");

        console.error(event);

        console.error("======================================");

        this.bagli = false;

        if (!tamamlandi) {
          clearTimeout(timeout);

          tamamlandi = true;

          this.baglantiPromise = null;

          reject(new Error("WebSocket bağlantı hatası."));
        }
      };

      /**
       * =================================================
       * STOMP WEBSOCKET CLOSE
       * =================================================
       */

      client.onWebSocketClose = (event: CloseEvent) => {
        console.log("======================================");

        console.log("🔴🔴🔴 STOMP TEST WEBSOCKET CLOSE");

        console.log("======================================");

        console.log("🔴 CODE:", event.code);

        console.log("🔴 REASON:", event.reason);

        console.log("🔴 CLEAN:", event.wasClean);

        console.log("======================================");

        this.bagli = false;

        this.subscription = null;

        if (!tamamlandi) {
          clearTimeout(timeout);

          tamamlandi = true;

          this.baglantiPromise = null;

          reject(new Error(`WebSocket bağlantısı kapandı. Kod: ${event.code}`));
        }
      };

      /**
       * =================================================
       * ACTIVATE
       * =================================================
       */

      console.log("======================================");

      console.log("📤 STOMP TEST ACTIVATE");

      console.log("📤 WebSocket:", WEBSOCKET_ADRESI);

      console.log("📤 Subprotocol: v12.stomp");

      console.log("======================================");

      try {
        client.activate();

        console.log("🟢 client.activate() ÇAĞRILDI");
      } catch (activateHatasi) {
        console.error("❌ client.activate() HATASI:", activateHatasi);

        clearTimeout(timeout);

        tamamlandi = true;

        reject(
          activateHatasi instanceof Error
            ? activateHatasi
            : new Error("STOMP activate hatası."),
        );
      }
    });

    this.baglantiPromise = promise;

    /**
     * =========================================================
     * SONUÇ
     * =========================================================
     */

    try {
      await promise;

      console.log("======================================");

      console.log("🟢🟢🟢 STOMP TEST BAŞARILI");

      console.log("🟢 Test tamamlandı.");

      console.log("======================================");

      return {
        basarili: true,
        mesaj: "STOMP bağlantısı başarıyla kuruldu.",
      };
    } catch (hata) {
      console.error("======================================");

      console.error("❌❌❌ STOMP TEST BAŞARISIZ");

      console.error("======================================");

      console.error(hata);

      console.error("======================================");

      return {
        basarili: false,
        mesaj:
          hata instanceof Error ? hata.message : "STOMP bağlantısı başarısız.",
      };
    }
  }

  /**
   * =========================================================
   * DURUM
   * =========================================================
   */

  bagliMi(): boolean {
    const client = this.client;

    return this.bagli && client !== null && client.connected;
  }

  /**
   * =========================================================
   * KAPAT
   * =========================================================
   */

  async kapat(): Promise<void> {
    console.log("🔌 STOMP TEST KAPATILIYOR...");

    if (this.subscription) {
      try {
        this.subscription.unsubscribe();
      } catch (hata) {
        console.warn("⚠️ Subscription kapatma hatası:", hata);
      }

      this.subscription = null;
    }

    const client = this.client;

    this.client = null;

    this.bagli = false;

    this.baglantiPromise = null;

    if (client) {
      try {
        if (client.active || client.connected) {
          await client.deactivate();
        }
      } catch (hata) {
        console.warn("⚠️ STOMP client kapatma hatası:", hata);
      }
    }

    console.log("🔌 STOMP TEST KAPATILDI");
  }
}

const stompTest = new StompTest();

export default stompTest;
