import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";

import { WEBSOCKET_URL } from "../config/api";

// ============================================
// TYPES
// ============================================

type StompMesajDinleyicisi = (message: IMessage) => void;

type BekleyenAramaOnayi = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type AramaSinyali = {
  tip?: string;
  aramaOturumId?: string | null;
  [key: string]: any;
};

type TokenSaglayici = () => Promise<string | null>;

type BaglantiCallback = () => void;

// ============================================
// MERKEZİ STOMP SERVİSİ
// ============================================

class MerkeziStompServisi {
  private client: Client | null = null;
  private currentUserId: number | null = null;

  private dinleyiciler = new Set<StompMesajDinleyicisi>();
  private subscriptions: StompSubscription[] = [];

  private bekleyenAramaOnaylari = new Map<string, BekleyenAramaOnayi>();

  private tokenSaglayici: TokenSaglayici | null = null;

  private premiumKontrolFonksiyonu: (() => Promise<boolean>) | null = null;

  private baglantiKurulduCallback: BaglantiCallback | null = null;

  private baslatPromise: Promise<boolean> | null = null;

  private generation = 0;

  private readonly reconnectDelay = 3000;
  private readonly ackTimeout = 15000;
  private readonly connectionTimeout = 10000;

  // ============================================
  // TOKEN SAĞLAYICI
  // ============================================

  tokenSaglayicisiniAyarla(callback: TokenSaglayici | null): void {
    this.tokenSaglayici = callback;
  }

  private async tokenAl(): Promise<string | null> {
    if (!this.tokenSaglayici) {
      console.error("❌ Merkezi STOMP: Token sağlayıcısı ayarlanmamış.");

      return null;
    }

    try {
      return await this.tokenSaglayici();
    } catch (error) {
      console.error("❌ Merkezi STOMP token alma hatası:", error);

      return null;
    }
  }

  // ============================================
  // BAĞLANTI CALLBACK
  // ============================================

  baglantiKurulduCallbackAyarla(callback: BaglantiCallback | null): void {
    this.baglantiKurulduCallback = callback;
  }

  private baglantiCallbackiniCalistir(): void {
    try {
      this.baglantiKurulduCallback?.();
    } catch (error) {
      console.error("❌ STOMP bağlantı callback hatası:", error);
    }
  }

  // ============================================
  // SERVİSİ BAŞLAT
  // ============================================

  baslat(): Promise<boolean> {
    // Aynı kullanıcıya ait aktif STOMP istemcisini tekrar başlatma.
    // Özellikle yeniden bağlantı mekanizmasının generation değerini
    // geçersiz kılmasını önler.
    if (this.client?.active && this.currentUserId !== null) {
      console.log(
        "🟢 Merkezi STOMP zaten aktif, yeniden başlatma atlandı:",
        this.currentUserId,
      );

      return Promise.resolve(true);
    }

    if (this.baslatPromise) {
      console.log("⏳ Merkezi STOMP başlatma işlemi devam ediyor.");

      return this.baslatPromise;
    }

    const generation = ++this.generation;

    const promise = this.baslatInternal(generation);

    this.baslatPromise = promise;

    return promise.finally(() => {
      if (this.baslatPromise === promise) {
        this.baslatPromise = null;
      }
    });
  }
  private async baslatInternal(generation: number): Promise<boolean> {
    try {
      // Token al.
      const token = await this.tokenAl();

      // Token beklenirken logout gerçekleşmiş olabilir.
      if (generation !== this.generation) {
        console.log("⏹️ Eski STOMP başlatma isteği iptal edildi.");

        return false;
      }

      // Kullanıcı ID al.
      const userIdText = await AsyncStorage.getItem("userId");

      // AsyncStorage beklenirken oturum değişmiş olabilir.
      if (generation !== this.generation) {
        console.log("⏹️ STOMP başlatma isteği geçersiz kaldı.");

        return false;
      }

      const userId = Number(userIdText);

      if (!token || !Number.isFinite(userId) || userId <= 0) {
        console.warn("⚠️ Merkezi STOMP başlatılamadı: token veya userId yok.");

        return false;
      }

      // Aynı kullanıcı için aktif bağlantı varsa tekrar açma.
      if (this.client && this.currentUserId === userId && this.client.active) {
        console.log("🟢 Merkezi STOMP zaten aktif:", userId);

        return true;
      }

      // Farklı kullanıcıya ait eski bağlantıyı kapat.
      if (this.client) {
        console.log("🔄 Eski STOMP bağlantısı kapatılıyor.");

        this.abonelikleriTemizle();

        this.bekleyenAramaOnaylariniReddet(
          new Error("STOMP kullanıcı oturumu değişti."),
        );

        const eskiClient = this.client;

        this.client = null;
        this.currentUserId = null;

        try {
          await eskiClient.deactivate();
        } catch (error) {
          console.error("❌ Eski STOMP bağlantısı kapatılamadı:", error);
        }

        // Eski bağlantı kapanırken logout veya yeni oturum
        // başlamış olabilir.
        if (generation !== this.generation) {
          console.log(
            "⏹️ Eski STOMP bağlantısı kapatılırken istek iptal edildi.",
          );

          return false;
        }
      }

      this.currentUserId = userId;

      // ==========================================
      // YENİ STOMP CLIENT
      // ==========================================

      const client = new Client({
        webSocketFactory: () => {
          console.log("🔌 WS FACTORY: WebSocket oluşturuluyor:", WEBSOCKET_URL);

          const ws = new WebSocket(WEBSOCKET_URL, ["v12.stomp"]);

          ws.onopen = () => {
            console.log("🟢 WS OPEN:", {
              url: WEBSOCKET_URL,
              readyState: ws.readyState,
            });
          };

          ws.onmessage = (event) => {
            const data = String(event.data ?? "");
            const command = data.split("\n", 1)[0].replace(/\r/g, "");

            console.log("📩 WS INCOMING FRAME:", {
              command,
              uzunluk: data.length,
              readyState: ws.readyState,
            });
          };

          ws.onerror = (event) => {
            console.error("❌ WS NATIVE ERROR:", {
              url: WEBSOCKET_URL,
              message: event.message,
              readyState: ws.readyState,
            });
          };

          ws.onclose = (event) => {
            console.warn("🔴 WS NATIVE CLOSE:", {
              code: event.code,
              reason: event.reason,
              readyState: ws.readyState,
            });
          };

          return ws;
        },

        reconnectDelay: this.reconnectDelay,

        // Home ekranındaki çalışan STOMP yapılandırmasıyla aynı.
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,

        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,

        connectionTimeout: this.connectionTimeout,
        debug: (message) => {
          const guvenliMesaj = message
            .replace(/Authorization:Bearer[^\n]*/gi, "Authorization:[REDACTED]")
            .replace(/Bearer\s+[^\s\n]+/gi, "Bearer [REDACTED]");

          console.log("🧭 STOMP DEBUG:", guvenliMesaj);
        },

        // ========================================
        // BAĞLANMADAN ÖNCE
        // ========================================

        beforeConnect: async () => {
          if (generation !== this.generation) {
            throw new Error("STOMP bağlantı isteği geçersiz.");
          }

          const freshToken = await this.tokenAl();

          // Token beklenirken logout olmuş olabilir.
          if (generation !== this.generation) {
            throw new Error("STOMP oturumu bağlantı sırasında değişti.");
          }

          if (!freshToken) {
            throw new Error("STOMP bağlantısı için geçerli JWT bulunamadı.");
          }

          client.connectHeaders = {
            Authorization: `Bearer ${freshToken}`,
          };

          console.log("🔐 STOMP bağlantısı için güncel JWT alındı.");
        },

        // ========================================
        // BAĞLANTI KURULDU
        // ========================================

        onConnect: () => {
          if (generation !== this.generation) {
            console.warn(
              "⚠️ Eski STOMP bağlantısının onConnect olayı yok sayıldı.",
            );

            return;
          }

          if (this.client !== client) {
            console.warn(
              "⚠️ Aktif olmayan STOMP istemcisinin onConnect olayı yok sayıldı.",
            );

            return;
          }

          console.log("🟢 MERKEZİ STOMP BAĞLANDI:", this.currentUserId);

          this.abonelikleriKur();

          // İlk bağlantıda ve yeniden bağlantılarda çalışır.
          this.baglantiCallbackiniCalistir();
        },

        // ========================================
        // BAĞLANTI KAPANDI
        // ========================================

        onDisconnect: () => {
          console.log("🔴 Merkezi STOMP bağlantısı kapandı.");
        },

        onWebSocketClose: (event) => {
          console.warn("⚠️ STOMP WebSocket kapandı:", event.code, event.reason);
        },

        onWebSocketError: (event) => {
          console.error("❌ STOMP WebSocket hatası:", event);
        },

        // ========================================
        // STOMP SUNUCU HATASI
        // ========================================

        onStompError: (frame) => {
          console.error(
            "❌ STOMP SUNUCU HATASI:",
            frame.headers.message,
            frame.body,
          );

          this.bekleyenAramaOnaylariniReddet(
            new Error(frame.headers.message || "STOMP sunucu hatası."),
          );
        },

        // ========================================
        // İŞLENMEYEN MESAJ
        // ========================================

        onUnhandledMessage: (message) => {
          console.warn(
            "⚠️ STOMP işlenmeyen mesaj:",
            message.headers.destination,
          );
        },
      });

      // Nesil değişmişse istemciyi kaydetme.
      if (generation !== this.generation) {
        console.log("⏹️ STOMP istemcisi oluşturulurken başlatma iptal edildi.");

        return false;
      }

      this.client = client;

      // Bağlantıyı başlat.
      client.activate();

      console.log("🚀 Merkezi STOMP başlatıldı. Kullanıcı:", userId);

      return true;
    } catch (error) {
      console.error("❌ Merkezi STOMP başlatma hatası:", error);

      if (generation === this.generation) {
        this.client = null;
        this.currentUserId = null;
      }

      return false;
    }
  }

  // ============================================
  // ABONELİKLER
  // ============================================

  private abonelikleriKur(): void {
    const client = this.client;
    const userId = this.currentUserId;

    if (!client?.connected || userId === null) {
      console.warn("⚠️ STOMP abonelikleri kurulamadı.");

      return;
    }

    this.abonelikleriTemizle();

    const destinations = [
      "/user/queue/arama-onaylari",
      "/user/queue/arama-hatalari",
      `/topic/arama/${userId}`,
    ];

    for (const destination of destinations) {
      try {
        const subscription = client.subscribe(
          destination,
          (message: IMessage) => {
            // Eski istemciden gelen mesajları işleme.
            if (this.client !== client) {
              return;
            }

            this.mesajiIsle(message);
          },
        );

        this.subscriptions.push(subscription);

        console.log("🟢 MERKEZİ STOMP ABONELİĞİ:", destination);
      } catch (error) {
        console.error("❌ STOMP abonelik hatası:", destination, error);
      }
    }
  }

  // ============================================
  // GELEN MESAJLARI İŞLE
  // ============================================

  private mesajiIsle(message: IMessage): void {
    const destination = message.headers.destination;

    if (!message.body) {
      return;
    }

    let veri: any;

    try {
      veri = JSON.parse(message.body);
    } catch {
      console.warn("⚠️ STOMP JSON çözümlenemedi:", destination);

      return;
    }

    // ==========================================
    // CALL OFFER ACK
    // ==========================================

    if (veri?.tip === "CALL_OFFER_ACK") {
      const oturumId = String(veri?.aramaOturumId ?? "").trim();

      const bekleyen = this.bekleyenAramaOnaylari.get(oturumId);

      if (!bekleyen) {
        console.warn("⚠️ ACK için bekleyen arama yok:", oturumId);

        return;
      }

      clearTimeout(bekleyen.timeout);

      this.bekleyenAramaOnaylari.delete(oturumId);

      bekleyen.resolve();

      console.log("🟢 CALL_OFFER_ACK ALINDI:", oturumId);

      return;
    }

    // ==========================================
    // ARAMA HATA KUYRUĞU
    // ==========================================

    if (
      destination?.includes("/queue/arama-hatalari") ||
      destination?.includes("/queue/hatalar")
    ) {
      console.error("❌ ARAMA SUNUCU HATASI:", veri);

      this.bekleyenAramaOnaylariniReddet(
        new Error(
          veri?.mesaj || veri?.message || "Sunucu arama isteğini reddetti.",
        ),
      );

      return;
    }

    // ==========================================
    // DİĞER DİNLEYİCİLERE İLET
    // ==========================================

    this.dinleyiciler.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error("❌ Merkezi STOMP dinleyici hatası:", error);
      }
    });
  }

  // ============================================
  // MESAJ DİNLEYİCİ EKLE
  // ============================================

  dinle(callback: StompMesajDinleyicisi): () => void {
    this.dinleyiciler.add(callback);

    return () => {
      this.dinleyiciler.delete(callback);
    };
  }

  // ============================================
  // PREMIUM KONTROLÜ
  // ============================================

  premiumKontrolFonksiyonunuAyarla(
    callback: (() => Promise<boolean>) | null,
  ): void {
    this.premiumKontrolFonksiyonu = callback;
  }

  // ============================================
  // STOMP FRAME GÖNDER
  // ============================================

  async frameGonder(destination: string, body: unknown): Promise<boolean> {
    const baslangic = Date.now();

    while (
      !this.client?.connected &&
      Date.now() - baslangic < this.connectionTimeout
    ) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 250);
      });
    }

    const client = this.client;

    if (!client?.connected) {
      console.error("❌ STOMP gönderilemedi: bağlantı yok.", destination);

      return false;
    }

    try {
      client.publish({
        destination,
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
        },
      });

      return true;
    } catch (error) {
      console.error("❌ STOMP publish hatası:", destination, error);

      return false;
    }
  }

  // ============================================
  // WEBRTC ARAMA SİNYALİ GÖNDER
  // ============================================

  async aramaSinyaliGonder(sinyal: AramaSinyali): Promise<void> {
    if (sinyal?.tip === "CALL_OFFER") {
      // Premium kontrolü zorunludur. Callback yoksa güvenli tarafta kal.
      if (!this.premiumKontrolFonksiyonu) {
        throw new Error(
          "Premium kontrol servisi hazır değil. Arama başlatılamadı.",
        );
      }

      const premium = await this.premiumKontrolFonksiyonu();

      if (!premium) {
        throw new Error("Arama başlatmak için Premium üyelik gereklidir.");
      }

      const oturumId = String(sinyal?.aramaOturumId ?? "").trim();

      if (!oturumId) {
        throw new Error("CALL_OFFER için arama oturum kimliği bulunamadı.");
      }

      if (this.bekleyenAramaOnaylari.has(oturumId)) {
        throw new Error("Bu arama oturumu için zaten ACK bekleniyor.");
      }

      let bekleyen!: BekleyenAramaOnayi;

      const ackPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (this.bekleyenAramaOnaylari.get(oturumId) === bekleyen) {
            this.bekleyenAramaOnaylari.delete(oturumId);
          }

          reject(new Error("CALL_OFFER_ACK zaman aşımına uğradı."));
        }, this.ackTimeout);

        bekleyen = {
          resolve,
          reject,
          timeout,
        };

        this.bekleyenAramaOnaylari.set(oturumId, bekleyen);
      });

      try {
        const gonderildi = await this.frameGonder("/app/arama/sinyal", sinyal);

        if (!gonderildi) {
          throw new Error("CALL_OFFER STOMP üzerinden gönderilemedi.");
        }

        await ackPromise;

        console.log("🟢 CALL_OFFER sunucu tarafından onaylandı:", oturumId);
      } catch (error) {
        const mevcut = this.bekleyenAramaOnaylari.get(oturumId);

        if (mevcut === bekleyen) {
          clearTimeout(bekleyen.timeout);

          this.bekleyenAramaOnaylari.delete(oturumId);
        }

        throw error instanceof Error
          ? error
          : new Error("Arama sinyali gönderilemedi.");
      }

      return;
    }

    // ACK gerektirmeyen sinyaller.
    const gonderildi = await this.frameGonder("/app/arama/sinyal", sinyal);

    if (!gonderildi) {
      throw new Error("Arama sinyali STOMP üzerinden gönderilemedi.");
    }
  }

  // ============================================
  // BEKLEYEN ACK İŞLEMLERİNİ REDDET
  // ============================================

  private bekleyenAramaOnaylariniReddet(error: Error): void {
    this.bekleyenAramaOnaylari.forEach((bekleyen) => {
      clearTimeout(bekleyen.timeout);

      bekleyen.reject(error);
    });

    this.bekleyenAramaOnaylari.clear();
  }

  // ============================================
  // ABONELİKLERİ TEMİZLE
  // ============================================

  private abonelikleriTemizle(): void {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.warn("⚠️ STOMP aboneliği kaldırılamadı:", error);
      }
    });

    this.subscriptions = [];
  }

  // ============================================
  // SERVİSİ DURDUR
  // ============================================

  async durdur(): Promise<void> {
    // Bekleyen tüm başlatma işlemlerini geçersiz kıl.
    ++this.generation;

    // Eski Promise'in yeni başlatma işlemini
    // etkilemesini engelle.
    this.baslatPromise = null;

    this.abonelikleriTemizle();

    this.bekleyenAramaOnaylariniReddet(
      new Error("STOMP bağlantısı kapatıldı."),
    );

    const client = this.client;

    this.client = null;
    this.currentUserId = null;

    if (client) {
      try {
        await client.deactivate();
      } catch (error) {
        console.error("❌ Merkezi STOMP kapatma hatası:", error);
      }
    }

    console.log("🔴 Merkezi STOMP servisi durduruldu.");
  }

  // ============================================
  // DURUM
  // ============================================

  bagliMi(): boolean {
    return this.client?.connected === true;
  }

  aktifKullaniciId(): number | null {
    return this.currentUserId;
  }
}

// ============================================
// SINGLETON
// ============================================

const merkeziStompServisi = new MerkeziStompServisi();

export default merkeziStompServisi;
