import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEBSOCKET_URL } from "../config/api";
const WEBSOCKET_ADRESI = WEBSOCKET_URL;
export type StompTestSonucu = {
  basarili: boolean;
  mesaj: string;
};
type WebSocketEvent = Event & {
  data?: any;
};
class StompTest {
  private socket: WebSocket | null = null;
  private bagli = false;
  private baglantiPromise: Promise<void> | null = null;
  private kullaniciId: number | null = null;
  private aramaMesajCallback: ((body: string) => void) | null = null;
  private gelenVeriBuffer = "";
  private abonelikId: string | null = null;
  private baglantiTamamlandiCallback: (() => void) | null = null;
  private baglantiHataCallback: ((hata: Error) => void) | null = null;
  /**
   * =========================================================
   * STOMP MESAJ DİNLEME
   * =========================================================
   */
  aramaMesajiDinle(callback: (body: string) => void): void {
    this.aramaMesajCallback = callback;
  }
  aramaMesajiDinlemeyiBirak(): void {
    this.aramaMesajCallback = null;
  }
  /**
   * =========================================================
   * GELEN STOMP FRAME PARSE
   * =========================================================
   */
  private stompFrameGonder(
    komut: string,
    headers: Record<string, string> = {},
    body = "",
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket açık değil.");
    }
    let frame = `${komut}\r\n`;
    for (const [anahtar, deger] of Object.entries(headers)) {
      frame += `${anahtar}:${deger}\r\n`;
    }
    frame += "\r\n";
    frame += body;
    frame += "\0";
    const byteDizisi = Array.from(
      new Uint8Array(
        Array.from(frame).map((karakter) => karakter.charCodeAt(0)),
      ),
    );
    console.log("======================================");
    console.log("📤 STOMP FRAME GÖNDERİLİYOR");
    console.log("======================================");
    console.log("📤 FRAME JSON:", JSON.stringify(frame));
    console.log("📦 FRAME BYTE UZUNLUĞU ->", byteDizisi.length);
    console.log("📦 FRAME SON 20 BYTE ->", byteDizisi.slice(-20));
    console.log(
      "📦 FRAME SON KARAKTER KODU ->",
      frame.charCodeAt(frame.length - 1),
    );
    console.log("📦 NUL VAR MI ->", frame.includes("\0"));
    console.log(
      "📦 SON KARAKTER ->",
      JSON.stringify(frame.charAt(frame.length - 1)),
    );
    console.log("======================================");
    this.socket.send(frame);
  }
  private gelenFrameIsle(frame: string): void {
    if (!frame) {
      return;
    } // STOMP heartbeat
    if (frame === "\n" || frame.trim() === "") {
      return;
    }
    const satirlar = frame.split(/\r?\n/);
    const komut = satirlar[0]?.trim();
    if (!komut) {
      return;
    }
    let ayiriciIndex = satirlar.indexOf("");
    if (ayiriciIndex === -1) {
      ayiriciIndex = satirlar.length;
    }
    const headers: Record<string, string> = {};
    for (let i = 1; i < ayiriciIndex; i++) {
      const satir = satirlar[i];
      const ikiNokta = satir.indexOf(":");
      if (ikiNokta === -1) {
        continue;
      }
      const anahtar = satir.substring(0, ikiNokta);
      const deger = satir.substring(ikiNokta + 1);
      headers[anahtar] = deger;
    }
    const body =
      ayiriciIndex < satirlar.length
        ? satirlar.slice(ayiriciIndex + 1).join("\n")
        : "";
    console.log("📥 STOMP FRAME GELDİ:", komut);
    console.log("📥 STOMP HEADERS:", headers);
    switch (komut) {
      case "CONNECTED":
        this.connectedFrameIsle(headers);
        break;
      case "MESSAGE":
        console.log("📨 STOMP MESSAGE GELDİ");
        console.log("📨 Destination:", headers.destination);
        console.log("📨 Body:", body);
        if (headers.destination === `/topic/arama/${this.kullaniciId}`) {
          this.aramaMesajCallback?.(body);
        }
        break;
      case "ERROR":
        console.error("🔴 STOMP ERROR");
        console.error("🔴 Message:", headers.message);
        console.error("🔴 Body:", body);
        this.bagli = false;
        if (this.baglantiHataCallback) {
          const hata = new Error(
            headers.message || body || "STOMP sunucu hatası.",
          );
          const callback = this.baglantiHataCallback;
          this.baglantiHataCallback = null;
          callback(hata);
        }
        break;
      default:
        console.log("ℹ️ STOMP FRAME:", komut);
        break;
    }
  }
  private gelenVeriyiIsle(veri: string): void {
    this.gelenVeriBuffer += veri;
    while (true) {
      const nullIndex = this.gelenVeriBuffer.indexOf("\0");
      if (nullIndex === -1) {
        break;
      }
      const frame = this.gelenVeriBuffer.substring(0, nullIndex);
      this.gelenVeriBuffer = this.gelenVeriBuffer.substring(nullIndex + 1);
      this.gelenFrameIsle(frame);
    } // Sunucu heartbeat'i frame sonlandırıcısı olmadan \n olarak gelebilir.
    if (this.gelenVeriBuffer === "\n") {
      this.gelenVeriBuffer = "";
    }
  }
  /**
   * =========================================================
   * CONNECTED FRAME
   * =========================================================
   */
  private connectedFrameIsle(headers: Record<string, string>): void {
    if (this.bagli) {
      return;
    }
    console.log("======================================");
    console.log("🟢🟢🟢 STOMP TEST CONNECTED");
    console.log("======================================");
    console.log("🟢 CONNECTED HEADERS:", headers);
    console.log("🟢 Kullanıcı ID:", this.kullaniciId);
    this.bagli = true;
    const kullaniciId = this.kullaniciId;
    if (!kullaniciId) {
      console.error("❌ CONNECTED geldi fakat kullanıcı ID yok.");
    } else {
      this.abonelikId = `arama-${kullaniciId}`;
      const topic = `/topic/arama/${kullaniciId}`;
      console.log("📡 TEST SUBSCRIBE:", topic);
      try {
        this.stompFrameGonder("SUBSCRIBE", {
          id: this.abonelikId,
          destination: topic,
          ack: "auto",
        });
        console.log("🟢 TEST SUBSCRIBE BAŞARILI");
        console.log("🟢 TEST TOPIC:", topic);
      } catch (hata) {
        console.error("❌ TEST SUBSCRIBE HATASI:", hata);
      }
    }
    if (this.baglantiTamamlandiCallback) {
      const callback = this.baglantiTamamlandiCallback;
      this.baglantiTamamlandiCallback = null;
      this.baglantiHataCallback = null;
      callback();
    }
  }
  /**
   * =========================================================
   * ARAMA MESAJI DİNLEME
   * =========================================================
   */
  async gelenAramaDinlemeyeBaslat(
    kullaniciId: number,
  ): Promise<StompTestSonucu> {
    this.kullaniciId = kullaniciId;
    return this.baslat(kullaniciId);
  }
  /**
   * =========================================================
   * SİNYAL GÖNDER
   * =========================================================
   */
  async sinyalGonder(sinyal: unknown): Promise<void> {
    if (!this.bagli) {
      if (this.baglantiPromise) {
        await this.baglantiPromise;
      }
    }
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      !this.bagli
    ) {
      throw new Error("STOMP sinyal gönderimi için bağlantı hazır değil.");
    }
    const body = JSON.stringify(sinyal);
    this.stompFrameGonder(
      "SEND",
      {
        destination: "/app/arama/sinyal",
        "content-type": "application/json",
      },
      body,
    );
    console.log("📤 STOMP SİNYAL GÖNDERİLDİ:", body);
  }
  /**
   * =========================================================
   * STOMP BAŞLAT
   * =========================================================
   */
  async baslat(kullaniciId: number): Promise<StompTestSonucu> {
    this.kullaniciId = kullaniciId;
    console.log("");
    console.log("======================================");
    console.log("🧪🧪🧪 MANUEL STOMP TEST BAŞLIYOR");
    console.log("======================================");
    console.log("🧪 WebSocket adresi:", WEBSOCKET_ADRESI);
    console.log("🧪 Kullanıcı ID:", kullaniciId);
    console.log("🧪 STOMP.js DEVRE DIŞI");
    console.log("🧪 Native WebSocket + manuel STOMP 1.2 kullanılacak.");
    console.log("======================================");
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("❌ STOMP TEST: JWT TOKEN YOK");
      return {
        basarili: false,
        mesaj: "JWT token bulunamadı.",
      };
    }
    console.log("🔐 STOMP TEST TOKEN VAR: EVET");
    console.log("🔐 JWT uzunluğu:", token.length);
    await this.kapat();
    this.bagli = false;
    this.gelenVeriBuffer = "";
    const promise = new Promise<void>((resolve, reject) => {
      let tamamlandi = false;
      const tamamla = () => {
        if (tamamlandi) {
          return;
        }
        tamamlandi = true;
        if (this.baglantiTamamlandiCallback) {
          this.baglantiTamamlandiCallback = null;
        }
        if (this.baglantiHataCallback) {
          this.baglantiHataCallback = null;
        }
        resolve();
      };
      const hataVer = (hata: Error) => {
        if (tamamlandi) {
          return;
        }
        tamamlandi = true;
        this.bagli = false;
        if (this.baglantiTamamlandiCallback) {
          this.baglantiTamamlandiCallback = null;
        }
        if (this.baglantiHataCallback) {
          this.baglantiHataCallback = null;
        }
        reject(hata);
      };
      this.baglantiTamamlandiCallback = tamamla;
      this.baglantiHataCallback = hataVer;
      const timeout = setTimeout(() => {
        if (tamamlandi) {
          return;
        }
        console.error("======================================");
        console.error("❌ STOMP TEST TIMEOUT");
        console.error("❌ 20 saniyede CONNECTED gelmedi.");
        console.error("======================================");
        this.bagli = false;
        try {
          this.socket?.close();
        } catch (hata) {
          console.warn("⚠️ Timeout sonrası socket kapatılamadı:", hata);
        }
        hataVer(new Error("STOMP CONNECTED 20 saniye içinde gelmedi."));
      }, 20000);
      const socket = new WebSocket(WEBSOCKET_ADRESI, ["v12.stomp"]);
      this.socket = socket;
      console.log("======================================");
      console.log("🌐 NATIVE WEBSOCKET OLUŞTURULDU");
      console.log("🌐 Adres:", WEBSOCKET_ADRESI);
      console.log(
        "🌐 Subprotocol: native WebSocket (STOMP manuel gönderilecek)",
      );
      console.log("======================================");
      socket.onopen = () => {
        if (tamamlandi) {
          return;
        }
        console.log("======================================");
        console.log("🟢🟢🟢 NATIVE WEBSOCKET OPEN");
        console.log("======================================");
        console.log("🟢 WebSocket URL:", WEBSOCKET_ADRESI);
        console.log(
          "🟢 WebSocket protocol:",
          (socket as WebSocket & { protocol?: string }).protocol || "(yok)",
        );
        console.log("🟢 WebSocket readyState:", socket.readyState);
        /**
         * =====================================================
         * MANUEL STOMP CONNECT
         * =====================================================
         *
         * Burada @stomp/stompjs kullanılmıyor.
         *
         * Spring'e doğrudan gerçek STOMP 1.2 CONNECT frame'i
         * gönderiyoruz.
         *
         * En kritik bölüm:
         * Authorization:Bearer <JWT>
         *
         * ve frame'in sonunda \0 bulunmasıdır.
         */
        try {
          this.stompFrameGonder("CONNECT", {
            "accept-version": "1.2",
            host: "localhost",
            "heart-beat": "0,0",
            Authorization: `Bearer ${token}`,
          });
          console.log("======================================");
          console.log("📤 Authorization header GÖNDERİLİYOR (JWT VAR).");
          console.log("======================================");
        } catch (hata) {
          clearTimeout(timeout);
          hataVer(
            hata instanceof Error
              ? hata
              : new Error("STOMP CONNECT gönderilemedi."),
          );
        }
      };
      socket.onmessage = (event: WebSocketEvent) => {
        console.log("======================================");
        console.log("📥 NATIVE WEBSOCKET MESSAGE");
        console.log("======================================");
        try {
          const veri = event.data;
          if (typeof veri === "string") {
            console.log("📥 Veri:", veri.replace(/\0/g, "\0"));
            this.gelenVeriyiIsle(veri);
          } else {
            console.log("📥 Veri tipi:", typeof veri);
            console.log("📥 Veri:", veri);
            this.gelenVeriyiIsle(String(veri));
          }
        } catch (hata) {
          console.error("❌ Gelen STOMP frame işleme hatası:", hata);
        }
      };
      socket.onerror = (event: Event) => {
        console.error("======================================");
        console.error("🔴🔴🔴 NATIVE WEBSOCKET ERROR");
        console.error("======================================");
        console.error(event);
        console.error("======================================");
        clearTimeout(timeout);
        hataVer(new Error("WebSocket bağlantı hatası."));
      };

      socket.onclose = (event: any) => {
        console.log("======================================");
        console.log("🔴🔴🔴 NATIVE WEBSOCKET CLOSE");
        console.log("======================================");
        console.log("🔴 CODE:", event.code);
        console.log("🔴 REASON:", event.reason);
        console.log("🔴 CLEAN:", event.wasClean);
        console.log("======================================");

        clearTimeout(timeout);

        this.bagli = false;
        this.gelenVeriBuffer = "";

        if (!tamamlandi) {
          hataVer(
            new Error(`WebSocket bağlantısı kapandı. Kod: ${event.code}`),
          );
        }
      };
    });
    this.baglantiPromise = promise;
    try {
      await promise;
      console.log("======================================");
      console.log("🟢🟢🟢 MANUEL STOMP TEST BAŞARILI");
      console.log("🟢 STOMP CONNECTED alındı.");
      console.log("🟢 Kullanıcı ID:", kullaniciId);
      console.log("======================================");
      this.baglantiPromise = null;
      return {
        basarili: true,
        mesaj: "STOMP bağlantısı başarıyla kuruldu.",
      };
    } catch (hata) {
      console.error("======================================");
      console.error("❌❌❌ MANUEL STOMP TEST BAŞARISIZ");
      console.error("======================================");
      console.error(hata);
      console.error("======================================");
      this.baglantiPromise = null;
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
    return (
      this.bagli &&
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN
    );
  }
  /**
   * =========================================================
   * KAPAT
   * =========================================================
   */
  async kapat(): Promise<void> {
    console.log("🔌 MANUEL STOMP TEST KAPATILIYOR...");
    const socket = this.socket;
    this.socket = null;
    this.bagli = false;
    this.baglantiPromise = null;
    this.gelenVeriBuffer = "";
    this.abonelikId = null;
    this.baglantiTamamlandiCallback = null;
    this.baglantiHataCallback = null;
    if (socket) {
      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          // STOMP bağlantısı kurulmuşsa düzgün DISCONNECT gönder.
          if (socket.readyState === WebSocket.OPEN) {
            try {
              let frame = "DISCONNECT\r\n\r\n\0";
              socket.send(frame);
            } catch {
              // Socket kapanırken gönderim başarısız olabilir.
            }
          }
          socket.close();
        }
      } catch (hata) {
        console.warn("⚠️ WebSocket kapatma hatası:", hata);
      }
    }
    console.log("🔌 MANUEL STOMP TEST KAPATILDI");
  }
}
const stompTest = new StompTest();
export default stompTest;
