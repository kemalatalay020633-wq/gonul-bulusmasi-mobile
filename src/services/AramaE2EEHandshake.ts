import type { RTCPeerConnection } from "react-native-webrtc";
import { AramaE2EE } from "./AramaE2EE";
import E2EEDeviceService from "./E2EEDeviceService";

type E2EEPhase = "HELLO" | "RESPONSE" | "CONFIRM" | "READY";

type E2EEEnvelope = {
  version: 1;
  phase: E2EEPhase;
  sessionId: string;
  senderUserId: number;
  recipientUserId: number;
  senderDeviceId: string;
  identityPublicKey: string;
  fingerprint: string;
  ephemeralPublicKey?: string;
  initiatorEphemeralPublicKey?: string;
  responderEphemeralPublicKey?: string;
  salt?: string;
  transcriptHash?: string;
  confirmation?: string;
  signature: string;
};

type E2EEUnsignedEnvelope = Omit<E2EEEnvelope, "signature">;

export type PendingE2EESignal = {
  senderUserId: number;
  sessionId: string;
  payload: string;
};

type E2EEHandshakeOptions = {
  peerConnection: RTCPeerConnection;
  sessionId: string;
  localUserId: number;
  peerUserId: number;
  sendSignal: (payload: string) => Promise<void>;
};

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function asciiToBase64(value: string): string {
  let output = "";

  for (let index = 0; index < value.length; index += 3) {
    const a = value.charCodeAt(index);
    const hasB = index + 1 < value.length;
    const hasC = index + 2 < value.length;
    const b = hasB ? value.charCodeAt(index + 1) : 0;
    const c = hasC ? value.charCodeAt(index + 2) : 0;

    if (a > 0x7f || b > 0x7f || c > 0x7f) {
      throw new Error("E2EE handshake payload yalnızca ASCII içerebilir.");
    }

    output += BASE64_ALPHABET[(a >> 2) & 0x3f];
    output += BASE64_ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    output += hasB ? BASE64_ALPHABET[((b & 0x0f) << 2) | (c >> 6)] : "=";
    output += hasC ? BASE64_ALPHABET[c & 0x3f] : "=";
  }

  return output;
}

function alanDogrula(
  deger: unknown,
  ad: string,
  maksimumUzunluk = 1024,
): asserts deger is string {
  if (
    typeof deger !== "string" ||
    deger.length === 0 ||
    deger.length > maksimumUzunluk
  ) {
    throw new Error(`E2EE: ${ad} geçersiz.`);
  }
}

function zarfImzaVerisi(zarf: E2EEEnvelope): E2EEUnsignedEnvelope {
  const ortak = {
    version: zarf.version,
    phase: zarf.phase,
    sessionId: zarf.sessionId,
    senderUserId: zarf.senderUserId,
    recipientUserId: zarf.recipientUserId,
    senderDeviceId: zarf.senderDeviceId,
    identityPublicKey: zarf.identityPublicKey,
    fingerprint: zarf.fingerprint,
  };

  switch (zarf.phase) {
    case "HELLO":
      return {
        ...ortak,
        ephemeralPublicKey: zarf.ephemeralPublicKey,
        salt: zarf.salt,
      };
    case "RESPONSE":
      return {
        ...ortak,
        initiatorEphemeralPublicKey: zarf.initiatorEphemeralPublicKey,
        responderEphemeralPublicKey: zarf.responderEphemeralPublicKey,
        salt: zarf.salt,
      };
    case "CONFIRM":
      return {
        ...ortak,
        transcriptHash: zarf.transcriptHash,
        confirmation: zarf.confirmation,
      };
    case "READY":
      return {
        ...ortak,
        transcriptHash: zarf.transcriptHash,
      };
  }
}

export class AramaE2EEHandshake {
  private readonly pc: RTCPeerConnection;
  private readonly sessionId: string;
  private readonly localUserId: number;
  private readonly peerUserId: number;
  private readonly sendSignal: (payload: string) => Promise<void>;

  private localDeviceId: string | null = null;
  private localIdentityPublicKey: string | null = null;
  private localFingerprint: string | null = null;
  private localEphemeralPublicKey: string | null = null;
  private peerDeviceId: string | null = null;
  private peerIdentityPublicKey: string | null = null;
  private peerEphemeralPublicKey: string | null = null;
  private peerConfirmationValue: string | null = null;
  private salt: string | null = null;
  private transcriptHash: string | null = null;
  private initiatorHello: E2EEEnvelope | null = null;
  private nativeSessionCreated = false;
  private isInitiator: boolean | null = null;
  private ready = false;
  private closed = false;
  private closePromise: Promise<void> | null = null;
  private localConfirmationSent = false;
  private peerConfirmationVerified = false;
  private localReadySent = false;
  private localSetupPromise: Promise<void> | null = null;
  private initiatorStartPromise: Promise<void> | null = null;
  private messageQueue: Promise<void> = Promise.resolve();
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readonly readyPromise: Promise<void>;

  // STOMP publish teslim edildiğini garanti etmez. Aynı imzalı zarf,
  // oturum boyunca sınırlı aralıklarla yeniden gönderilir.
  private readonly outboundMessages: Partial<Record<E2EEPhase, E2EEEnvelope>> =
    {};
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryPhase: E2EEPhase | null = null;
  private retryAttempts = 0;
  private static readonly RETRY_INTERVAL_MS = 2_000;
  private static readonly MAX_RETRY_ATTEMPTS = 12;

  constructor(options: E2EEHandshakeOptions) {
    this.pc = options.peerConnection;
    this.sessionId = options.sessionId;
    this.localUserId = options.localUserId;
    this.peerUserId = options.peerUserId;
    this.sendSignal = options.sendSignal;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    // Ready bekleyicisi daha sonra kurulabilir. Erken hata unhandled rejection üretmesin.
    void this.readyPromise.catch(() => undefined);
  }

  private retryDurdur(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryPhase = null;
    this.retryAttempts = 0;
  }

  private async guvenilirZarfGonder(zarf: E2EEEnvelope): Promise<void> {
    this.assertOpen();
    this.outboundMessages[zarf.phase] = zarf;
    this.retryDurdur();
    this.retryPhase = zarf.phase;
    await this.sendSignal(JSON.stringify(zarf));
    this.assertOpen();
    this.retryZamanla(zarf.phase);
  }

  private retryZamanla(phase: E2EEPhase): void {
    if (this.closed || this.ready || this.retryPhase !== phase) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void (async () => {
        try {
          this.assertOpen();
          if (this.ready || this.retryPhase !== phase) return;

          if (this.retryAttempts >= AramaE2EEHandshake.MAX_RETRY_ATTEMPTS) {
            const hata = new Error(
              `E2EE: ${phase} mesajı karşı cihaz tarafından zamanında doğrulanmadı.`,
            );
            this.retryDurdur();
            this.rejectReady(hata);
            return;
          }

          const zarf = this.outboundMessages[phase];
          if (!zarf) return;

          this.retryAttempts++;
          console.warn(
            `E2EE: ${phase} yeniden gönderiliyor (${this.retryAttempts}/${AramaE2EEHandshake.MAX_RETRY_ATTEMPTS}).`,
          );
          await this.sendSignal(JSON.stringify(zarf));
          this.assertOpen();
          this.retryZamanla(phase);
        } catch (error) {
          if (!this.closed) {
            console.warn(`E2EE ${phase} yeniden gönderimi başarısız:`, error);
            this.retryZamanla(phase);
          }
        }
      })();
    }, AramaE2EEHandshake.RETRY_INTERVAL_MS);
  }

  private async yinelenenZarfiTekrarGonder(phase: E2EEPhase): Promise<void> {
    const zarf = this.outboundMessages[phase];
    if (!zarf || this.closed) return;
    await this.guvenilirZarfGonder(zarf);
    console.log(`E2EE: Yinelenen mesaj nedeniyle ${phase} tekrar gönderildi.`);
  }

  startInitiator(): Promise<void> {
    this.assertOpen();

    if (this.initiatorStartPromise) {
      return this.initiatorStartPromise;
    }

    const task = this.startInitiatorInternal();
    this.initiatorStartPromise = task;

    void task
      .finally(() => {
        if (this.initiatorStartPromise === task) {
          this.initiatorStartPromise = null;
        }
      })
      .catch(() => undefined);

    return task;
  }

  private async startInitiatorInternal(): Promise<void> {
    this.assertOpen();
    this.isInitiator = true;
    await this.localHazirla();
    this.assertOpen();

    this.salt = await AramaE2EE.guvenliRastgeleBaytUret(32);
    this.assertOpen();
    alanDogrula(this.salt, "oturum salt değeri", 128);
    if (!/^[A-Za-z0-9+/]{43}=$/.test(this.salt)) {
      throw new Error(
        "E2EE: Native salt çıktısı 32 bayt Base64 biçiminde değil.",
      );
    }

    const hello = await this.imzaliZarfOlustur({
      version: 1,
      phase: "HELLO",
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      recipientUserId: this.peerUserId,
      senderDeviceId: this.localDeviceId!,
      identityPublicKey: this.localIdentityPublicKey!,
      fingerprint: this.localFingerprint!,
      ephemeralPublicKey: this.localEphemeralPublicKey!,
      salt: this.salt,
    });

    this.assertOpen();
    this.initiatorHello = hello;
    await this.guvenilirZarfGonder(hello);
    console.log("E2EE: İmzalı HELLO gönderildi.");
  }

  async startResponder(
    pendingSignals: PendingE2EESignal[] = [],
  ): Promise<void> {
    this.assertOpen();
    this.isInitiator = false;
    await this.localHazirla();
    this.assertOpen();

    for (const signal of pendingSignals) {
      await this.handleSignal(
        signal.senderUserId,
        signal.sessionId,
        signal.payload,
      );
      this.assertOpen();
    }
  }

  handleSignal(
    senderUserId: number,
    sessionId: string,
    payload: string,
  ): Promise<void> {
    const task = this.messageQueue.then(async () => {
      this.assertOpen();
      await this.localHazirla();
      this.assertOpen();

      if (senderUserId !== this.peerUserId || sessionId !== this.sessionId) {
        throw new Error("E2EE: Sinyal göndereni veya arama oturumu eşleşmedi.");
      }

      alanDogrula(payload, "el sıkışma mesajı", 2048);
      const parsed: unknown = JSON.parse(payload);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("E2EE: El sıkışma mesajı JSON nesnesi değil.");
      }

      const envelope = parsed as E2EEEnvelope;
      this.zarfiDogrula(envelope);

      if (envelope.phase === "HELLO") {
        await this.helloIsle(envelope);
      } else if (envelope.phase === "RESPONSE") {
        await this.responseIsle(envelope);
      } else if (envelope.phase === "CONFIRM") {
        await this.confirmIsle(envelope);
      } else {
        await this.readyIsle(envelope);
      }
    });

    this.messageQueue = task.catch(() => undefined);
    return task;
  }

  async waitUntilReady(timeoutMs = 45_000): Promise<void> {
    this.assertOpen();
    if (this.ready) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.readyPromise,
        new Promise<void>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "E2EE: Karşılıklı anahtar onayı zaman aşımına uğradı.",
                ),
              ),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    this.assertOpen();
    if (!this.ready) {
      throw new Error("E2EE: Güvenli medya oturumu hazır değil.");
    }
  }

  close(closeNativeSession = true): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.closed = true;
    this.retryDurdur();

    if (!this.ready) {
      this.rejectReady(new Error("E2EE: Arama oturumu kapatıldı."));
    }

    this.closePromise = this.closeInternal(closeNativeSession);
    return this.closePromise;
  }

  private async closeInternal(closeNativeSession: boolean): Promise<void> {
    // Devam eden native oturum hazırlığı bitmeden alanları temizleme.
    const pendingSetup = this.localSetupPromise;
    if (pendingSetup) {
      try {
        await pendingSetup;
      } catch (error) {
        console.warn("E2EE yerel hazırlığı kapatılırken tamamlanamadı:", error);
      }
    }

    // Devam eden sinyal işleyicilerinin tamamlanmasını bekle.
    try {
      await this.messageQueue;
    } catch (error) {
      console.warn("E2EE mesaj kuyruğu kapatılırken hata:", error);
    }

    // Başlatıcı işlemin de tamamlanmasını bekle.
    const pendingInitiatorStart = this.initiatorStartPromise;
    if (pendingInitiatorStart) {
      try {
        await pendingInitiatorStart;
      } catch (error) {
        console.warn(
          "E2EE başlatıcı işlemi kapatılırken tamamlanamadı:",
          error,
        );
      }
    }

    if (this.nativeSessionCreated && closeNativeSession) {
      try {
        await AramaE2EE.oturumKapat(this.pc);
        this.nativeSessionCreated = false;
      } catch (error) {
        console.warn("E2EE native oturumu kapatılamadı:", error);
      }
    }

    this.localEphemeralPublicKey = null;
    this.localIdentityPublicKey = null;
    this.localFingerprint = null;
    this.localDeviceId = null;
    this.peerDeviceId = null;
    this.peerIdentityPublicKey = null;
    this.peerEphemeralPublicKey = null;
    this.peerConfirmationValue = null;
    this.salt = null;
    this.transcriptHash = null;
    this.initiatorHello = null;
  }

  private async localHazirla(): Promise<void> {
    this.assertOpen();
    if (this.nativeSessionCreated) return;
    if (this.localSetupPromise) return this.localSetupPromise;

    this.localSetupPromise = (async () => {
      const kayit = await E2EEDeviceService.cihaziKaydet();
      this.assertOpen();
      const identityPublicKey = await E2EEDeviceService.cihazKimliginiAl();
      this.assertOpen();
      const fingerprint = await AramaE2EE.parmakIziHesapla(identityPublicKey);
      this.assertOpen();

      if (
        kayit.status !== "ACTIVE" ||
        kayit.fingerprint.toLowerCase() !== fingerprint.toLowerCase()
      ) {
        throw new Error("E2EE: Yerel cihaz kimliği aktif veya tutarlı değil.");
      }

      const ephemeralPublicKey = await AramaE2EE.oturumOlustur(this.pc);

      // Native oturum oluşturuldu. Sonraki doğrulama başarısız olsa bile
      // cleanup bu oturumun varlığını bilmelidir.
      this.nativeSessionCreated = true;
      this.assertOpen();

      alanDogrula(ephemeralPublicKey, "geçici X25519 açık anahtarı", 128);
      if (!/^[A-Za-z0-9+/]{43}=$/.test(ephemeralPublicKey)) {
        throw new Error(
          "E2EE: X25519 açık anahtarı 32 bayt Base64 biçiminde değil.",
        );
      }

      this.localDeviceId = kayit.deviceId;
      this.localIdentityPublicKey = identityPublicKey;
      this.localFingerprint = fingerprint;
      this.localEphemeralPublicKey = ephemeralPublicKey;
    })();

    try {
      await this.localSetupPromise;
    } finally {
      this.localSetupPromise = null;
    }
  }

  private zarfiDogrula(zarf: E2EEEnvelope): void {
    if (
      zarf.version !== 1 ||
      !["HELLO", "RESPONSE", "CONFIRM", "READY"].includes(zarf.phase) ||
      zarf.sessionId !== this.sessionId ||
      zarf.senderUserId !== this.peerUserId ||
      zarf.recipientUserId !== this.localUserId
    ) {
      throw new Error("E2EE: El sıkışma başlığı geçersiz.");
    }

    alanDogrula(zarf.senderDeviceId, "gönderen cihaz kimliği", 64);
    alanDogrula(zarf.identityPublicKey, "gönderen cihaz açık anahtarı", 512);
    alanDogrula(zarf.fingerprint, "gönderen cihaz parmak izi", 64);
    alanDogrula(zarf.signature, "el sıkışma imzası", 512);

    if (!/^[0-9a-f]{64}$/i.test(zarf.fingerprint)) {
      throw new Error("E2EE: Cihaz parmak izi biçimi geçersiz.");
    }

    if (zarf.phase === "HELLO") {
      alanDogrula(zarf.ephemeralPublicKey, "gönderen geçici anahtarı", 128);
      alanDogrula(zarf.salt, "oturum salt değeri", 128);
      if (
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.ephemeralPublicKey) ||
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.salt)
      ) {
        throw new Error(
          "E2EE: HELLO anahtar veya salt Base64 biçimi geçersiz.",
        );
      }
    } else if (zarf.phase === "RESPONSE") {
      alanDogrula(
        zarf.initiatorEphemeralPublicKey,
        "başlatıcı geçici anahtarı",
        128,
      );
      alanDogrula(
        zarf.responderEphemeralPublicKey,
        "yanıtlayıcı geçici anahtarı",
        128,
      );
      alanDogrula(zarf.salt, "oturum salt değeri", 128);
      if (
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.initiatorEphemeralPublicKey) ||
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.responderEphemeralPublicKey) ||
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.salt)
      ) {
        throw new Error(
          "E2EE: RESPONSE anahtar veya salt Base64 biçimi geçersiz.",
        );
      }
    } else if (zarf.phase === "CONFIRM") {
      alanDogrula(zarf.transcriptHash, "el sıkışma özeti", 128);
      alanDogrula(zarf.confirmation, "anahtar onayı", 128);
      if (
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.transcriptHash) ||
        !/^[A-Za-z0-9+/]{43}=$/.test(zarf.confirmation)
      ) {
        throw new Error(
          "E2EE: Anahtar onayı veya transcript Base64 biçimi geçersiz.",
        );
      }
    } else {
      alanDogrula(zarf.transcriptHash, "READY el sıkışma özeti", 128);
      if (!/^[A-Za-z0-9+/]{43}=$/.test(zarf.transcriptHash)) {
        throw new Error("E2EE: READY transcript özeti Base64 biçimi geçersiz.");
      }
    }
  }

  private async imzaliZarfOlustur(
    payload: E2EEUnsignedEnvelope,
  ): Promise<E2EEEnvelope> {
    const signingPayload = asciiToBase64(JSON.stringify(payload));
    const signature = await AramaE2EE.handshakeImzala(signingPayload);
    this.assertOpen();
    alanDogrula(signature, "cihaz imzası", 512);
    return { ...payload, signature };
  }

  private async peerImzasiniDogrula(zarf: E2EEEnvelope): Promise<void> {
    const cihazlar = await E2EEDeviceService.karsiTarafCihazlariniListele(
      this.sessionId,
    );
    this.assertOpen();

    const cihaz = cihazlar.find(
      (aday) =>
        aday.deviceId === zarf.senderDeviceId &&
        aday.identityPublicKey === zarf.identityPublicKey &&
        aday.fingerprint.toLowerCase() === zarf.fingerprint.toLowerCase(),
    );

    if (!cihaz) {
      throw new Error(
        "E2EE: Gönderen cihaz, arama katılımcısının kayıtlı aktif cihazları arasında değil.",
      );
    }

    await AramaE2EE.parmakIziniDogrula(
      cihaz.identityPublicKey,
      cihaz.fingerprint,
    );
    this.assertOpen();

    const signingPayload = asciiToBase64(JSON.stringify(zarfImzaVerisi(zarf)));
    const verified = await AramaE2EE.imzaDogrula(
      cihaz.identityPublicKey,
      signingPayload,
      zarf.signature,
    );
    this.assertOpen();

    if (verified !== true) {
      throw new Error("E2EE: Karşı taraf cihaz imzası doğrulanamadı.");
    }

    if (
      this.peerDeviceId &&
      (this.peerDeviceId !== cihaz.deviceId ||
        this.peerIdentityPublicKey !== cihaz.identityPublicKey)
    ) {
      throw new Error("E2EE: Aynı arama içinde karşı cihaz kimliği değişti.");
    }

    this.peerDeviceId = cihaz.deviceId;
    this.peerIdentityPublicKey = cihaz.identityPublicKey;
  }

  private async transcriptHashHesapla(
    salt: string,
    initiatorEphemeralPublicKey: string,
    responderEphemeralPublicKey: string,
  ): Promise<string> {
    const transcript = {
      version: 1,
      sessionId: this.sessionId,
      initiatorUserId: this.isInitiator ? this.localUserId : this.peerUserId,
      responderUserId: this.isInitiator ? this.peerUserId : this.localUserId,
      salt,
      initiatorEphemeralPublicKey,
      responderEphemeralPublicKey,
    };

    return AramaE2EE.sha256Base64(asciiToBase64(JSON.stringify(transcript)));
  }

  private async helloIsle(zarf: E2EEEnvelope): Promise<void> {
    if (this.isInitiator !== false) {
      throw new Error(
        "E2EE: HELLO yalnızca aranan cihaz tarafından kabul edilir.",
      );
    }

    await this.peerImzasiniDogrula(zarf);
    this.assertOpen();

    if (this.transcriptHash) {
      if (
        this.salt === zarf.salt &&
        this.peerEphemeralPublicKey === zarf.ephemeralPublicKey
      ) {
        await this.yinelenenZarfiTekrarGonder("RESPONSE");
        await this.yinelenenZarfiTekrarGonder("CONFIRM");
        return;
      }
      throw new Error("E2EE: Aynı arama oturumu için farklı HELLO reddedildi.");
    }

    const salt = zarf.salt!;
    const initiatorEphemeral = zarf.ephemeralPublicKey!;
    const responderEphemeral = this.localEphemeralPublicKey!;
    const transcriptHash = await this.transcriptHashHesapla(
      salt,
      initiatorEphemeral,
      responderEphemeral,
    );
    this.assertOpen();

    await AramaE2EE.oturumBaslat(
      this.pc,
      initiatorEphemeral,
      salt,
      transcriptHash,
      false,
    );
    this.assertOpen();

    this.salt = salt;
    this.transcriptHash = transcriptHash;
    this.peerEphemeralPublicKey = initiatorEphemeral;

    const response = await this.imzaliZarfOlustur({
      version: 1,
      phase: "RESPONSE",
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      recipientUserId: this.peerUserId,
      senderDeviceId: this.localDeviceId!,
      identityPublicKey: this.localIdentityPublicKey!,
      fingerprint: this.localFingerprint!,
      initiatorEphemeralPublicKey: initiatorEphemeral,
      responderEphemeralPublicKey: responderEphemeral,
      salt,
    });
    this.assertOpen();

    await this.guvenilirZarfGonder(response);

    const confirmation = await AramaE2EE.anahtarOnayiOlustur(this.pc);
    this.assertOpen();
    const confirmationMessage = await this.imzaliZarfOlustur({
      version: 1,
      phase: "CONFIRM",
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      recipientUserId: this.peerUserId,
      senderDeviceId: this.localDeviceId!,
      identityPublicKey: this.localIdentityPublicKey!,
      fingerprint: this.localFingerprint!,
      transcriptHash,
      confirmation,
    });
    this.assertOpen();

    this.localConfirmationSent = true;
    await this.guvenilirZarfGonder(confirmationMessage);
    console.log("E2EE: Yanıtlayıcı anahtar onayı gönderildi.");
  }

  private async responseIsle(zarf: E2EEEnvelope): Promise<void> {
    if (this.isInitiator !== true || !this.initiatorHello) {
      throw new Error("E2EE: Beklenmeyen RESPONSE mesajı.");
    }

    await this.peerImzasiniDogrula(zarf);
    this.assertOpen();
    this.retryDurdur();

    if (this.transcriptHash) {
      if (
        zarf.salt === this.salt &&
        zarf.initiatorEphemeralPublicKey === this.localEphemeralPublicKey &&
        zarf.responderEphemeralPublicKey === this.peerEphemeralPublicKey
      ) {
        await this.yinelenenZarfiTekrarGonder("CONFIRM");
        return;
      }
      throw new Error(
        "E2EE: Aynı arama oturumu için farklı RESPONSE reddedildi.",
      );
    }

    if (
      zarf.salt !== this.salt ||
      zarf.initiatorEphemeralPublicKey !== this.localEphemeralPublicKey
    ) {
      throw new Error(
        "E2EE: RESPONSE, başlatıcının anahtar teklifiyle eşleşmiyor.",
      );
    }

    const responderEphemeral = zarf.responderEphemeralPublicKey!;
    const transcriptHash = await this.transcriptHashHesapla(
      this.salt!,
      this.localEphemeralPublicKey!,
      responderEphemeral,
    );
    this.assertOpen();

    await AramaE2EE.oturumBaslat(
      this.pc,
      responderEphemeral,
      this.salt!,
      transcriptHash,
      true,
    );
    this.assertOpen();

    this.transcriptHash = transcriptHash;
    this.peerEphemeralPublicKey = responderEphemeral;

    const confirmation = await AramaE2EE.anahtarOnayiOlustur(this.pc);
    this.assertOpen();
    const confirmationMessage = await this.imzaliZarfOlustur({
      version: 1,
      phase: "CONFIRM",
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      recipientUserId: this.peerUserId,
      senderDeviceId: this.localDeviceId!,
      identityPublicKey: this.localIdentityPublicKey!,
      fingerprint: this.localFingerprint!,
      transcriptHash,
      confirmation,
    });
    this.assertOpen();

    this.localConfirmationSent = true;
    await this.guvenilirZarfGonder(confirmationMessage);
    console.log("E2EE: Başlatıcı anahtar onayı gönderildi.");
  }

  private async confirmIsle(zarf: E2EEEnvelope): Promise<void> {
    if (!this.transcriptHash || !this.localConfirmationSent) {
      throw new Error(
        "E2EE: Anahtar onayı, yerel oturum hazırlanmasından önce geldi.",
      );
    }

    if (zarf.transcriptHash !== this.transcriptHash) {
      throw new Error("E2EE: Anahtar onayı farklı bir el sıkışma özetine ait.");
    }

    await this.peerImzasiniDogrula(zarf);
    this.assertOpen();
    this.retryDurdur();

    if (this.peerConfirmationVerified) {
      if (this.peerConfirmationValue === zarf.confirmation) {
        await this.yinelenenZarfiTekrarGonder("READY");
        return;
      }
      throw new Error("E2EE: Aynı oturum için farklı anahtar onayı alındı.");
    }

    await AramaE2EE.karsiTarafAnahtarOnayiniDogrula(
      this.pc,
      zarf.confirmation!,
    );
    this.assertOpen();

    this.peerConfirmationValue = zarf.confirmation!;
    this.peerConfirmationVerified = true;

    // READY, karşı tarafın native decryptor'ı doğrulayıp bağladığını bildirir.
    // Yerel RTP göndericileri ancak bu READY alındıktan sonra açılır.
    const readyMessage = await this.imzaliZarfOlustur({
      version: 1,
      phase: "READY",
      sessionId: this.sessionId,
      senderUserId: this.localUserId,
      recipientUserId: this.peerUserId,
      senderDeviceId: this.localDeviceId!,
      identityPublicKey: this.localIdentityPublicKey!,
      fingerprint: this.localFingerprint!,
      transcriptHash: this.transcriptHash,
    });
    this.assertOpen();

    this.localReadySent = true;
    await this.guvenilirZarfGonder(readyMessage);
    console.log("E2EE: Native decryptor hazır bilgisi gönderildi.");
  }

  private async readyIsle(zarf: E2EEEnvelope): Promise<void> {
    if (
      !this.transcriptHash ||
      !this.peerConfirmationVerified ||
      !this.localReadySent ||
      zarf.transcriptHash !== this.transcriptHash
    ) {
      throw new Error(
        "E2EE: READY mesajı beklenen güvenli oturumla eşleşmiyor.",
      );
    }

    await this.peerImzasiniDogrula(zarf);
    this.assertOpen();
    this.retryDurdur();
    if (this.ready) return;
    this.retryDurdur();
    this.ready = true;
    this.resolveReady();
    console.log("E2EE: İki cihaz da decryptor hazır onayını verdi.");
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("E2EE: El sıkışma oturumu kapatılmış.");
    }
  }
}
