import { NativeModules } from "react-native";
import type { RTCPeerConnection } from "react-native-webrtc";
console.log(
  "🔐 E2EE NATIVE MODULE:",
  NativeModules.AramaKimlikModulu
    ? Object.keys(NativeModules.AramaKimlikModulu)
    : "MODÜL BULUNAMADI",
);

type E2EENativeModule = {
  e2eeCreateSession(pcId: number): Promise<string>;

  e2eeInitializeSession(
    pcId: number,
    peerPublicKeyBase64: string,
    saltBase64: string,
    transcriptHashBase64: string,
    isInitiator: boolean,
  ): Promise<void>;

  e2eeCreateKeyConfirmation(pcId: number): Promise<string>;

  e2eeVerifyPeerKeyConfirmation(
    pcId: number,
    confirmationBase64: string,
  ): Promise<boolean>;

  e2eeCloseSession(pcId: number): Promise<void>;
};

type AramaKimlikNativeModule = {
  getOrCreateIdentityPublicKey(): Promise<string>;
  getSecureRandomBytes(length: number): Promise<string>;
  getIdentityFingerprint(publicKeyBase64: string): Promise<string>;
  sha256Base64(payloadBase64: string): Promise<string>;
  signHandshake(payloadBase64: string): Promise<string>;

  verifySignature(
    publicKeyBase64: string,
    payloadBase64: string,
    signatureBase64: string,
  ): Promise<boolean>;
};

const WebRTCModule = NativeModules.WebRTCModule as E2EENativeModule | undefined;

const KimlikModule = NativeModules.AramaKimlikModulu as
  AramaKimlikNativeModule | undefined;

function peerConnectionId(pc: RTCPeerConnection): number {
  const id = (pc as RTCPeerConnection & { _pcId?: number })._pcId;

  if (!Number.isInteger(id) || id === undefined || id < 0) {
    throw new Error("E2EE: WebRTC PeerConnection ID bulunamadı.");
  }

  return id;
}

function nativeModule(): E2EENativeModule {
  if (
    !WebRTCModule ||
    typeof WebRTCModule.e2eeCreateSession !== "function" ||
    typeof WebRTCModule.e2eeInitializeSession !== "function" ||
    typeof WebRTCModule.e2eeCreateKeyConfirmation !== "function" ||
    typeof WebRTCModule.e2eeVerifyPeerKeyConfirmation !== "function" ||
    typeof WebRTCModule.e2eeCloseSession !== "function"
  ) {
    throw new Error("E2EE: Native WebRTC modülü bulunamadı.");
  }

  return WebRTCModule;
}

function kimlikModulu(): AramaKimlikNativeModule {
  if (
    !KimlikModule ||
    typeof KimlikModule.getOrCreateIdentityPublicKey !== "function" ||
    typeof KimlikModule.getSecureRandomBytes !== "function" ||
    typeof KimlikModule.getIdentityFingerprint !== "function" ||
    typeof KimlikModule.sha256Base64 !== "function" ||
    typeof KimlikModule.signHandshake !== "function" ||
    typeof KimlikModule.verifySignature !== "function"
  ) {
    throw new Error("E2EE: Android cihaz kimlik modülü bulunamadı.");
  }

  return KimlikModule;
}

export const AramaE2EE = {
  async guvenliRastgeleBaytUret(length: number): Promise<string> {
    if (!Number.isInteger(length) || length < 1 || length > 1024) {
      throw new Error("E2EE: Rastgele veri uzunluğu geçersiz.");
    }

    const module = kimlikModulu();

    if (typeof module.getSecureRandomBytes !== "function") {
      throw new Error("E2EE: Android güvenli rastgele sayı modülü bulunamadı.");
    }

    const result = await module.getSecureRandomBytes(length);

    if (!result || typeof result !== "string") {
      throw new Error("E2EE: Güvenli rastgele veri üretilemedi.");
    }

    return result;
  },

  async kimlikAcikAnahtariniAl(): Promise<string> {
    return kimlikModulu().getOrCreateIdentityPublicKey();
  },

  async parmakIziHesapla(publicKeyBase64: string): Promise<string> {
    if (!publicKeyBase64 || publicKeyBase64.length > 512) {
      throw new Error("E2EE: Cihaz açık anahtarı geçersiz.");
    }

    const fingerprint =
      await kimlikModulu().getIdentityFingerprint(publicKeyBase64);

    if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
      throw new Error("E2EE: Cihaz parmak izi biçimi geçersiz.");
    }

    return fingerprint;
  },

  async parmakIziniDogrula(
    publicKeyBase64: string,
    expectedFingerprint: string,
  ): Promise<void> {
    if (!/^[0-9a-f]{64}$/i.test(expectedFingerprint)) {
      throw new Error("E2EE: Beklenen cihaz parmak izi geçersiz.");
    }

    const actual = await this.parmakIziHesapla(publicKeyBase64);

    if (actual !== expectedFingerprint.toLowerCase()) {
      throw new Error("E2EE: Cihaz kimliği parmak izi eşleşmedi.");
    }
  },

  async sha256Base64(payloadBase64: string): Promise<string> {
    if (
      !payloadBase64 ||
      payloadBase64.length > 32768 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(payloadBase64)
    ) {
      throw new Error("E2EE: SHA-256 girdi verisi geçersiz.");
    }

    const result = await kimlikModulu().sha256Base64(payloadBase64);

    if (typeof result !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(result)) {
      throw new Error("E2EE: SHA-256 özeti geçersiz.");
    }

    return result;
  },

  async handshakeImzala(payloadBase64: string): Promise<string> {
    if (!payloadBase64 || payloadBase64.length > 32768) {
      throw new Error("E2EE: Handshake verisi geçersiz.");
    }

    return kimlikModulu().signHandshake(payloadBase64);
  },

  async imzaDogrula(
    publicKeyBase64: string,
    payloadBase64: string,
    signatureBase64: string,
  ): Promise<boolean> {
    if (!publicKeyBase64 || !payloadBase64 || !signatureBase64) {
      throw new Error("E2EE: İmza doğrulama parametreleri eksik.");
    }

    return kimlikModulu().verifySignature(
      publicKeyBase64,
      payloadBase64,
      signatureBase64,
    );
  },

  async oturumOlustur(pc: RTCPeerConnection): Promise<string> {
    return nativeModule().e2eeCreateSession(peerConnectionId(pc));
  },

  async oturumBaslat(
    pc: RTCPeerConnection,
    peerPublicKeyBase64: string,
    saltBase64: string,
    transcriptHashBase64: string,
    isInitiator: boolean,
  ): Promise<void> {
    await nativeModule().e2eeInitializeSession(
      peerConnectionId(pc),
      peerPublicKeyBase64,
      saltBase64,
      transcriptHashBase64,
      isInitiator,
    );
  },

  async anahtarOnayiOlustur(pc: RTCPeerConnection): Promise<string> {
    const confirmation = await nativeModule().e2eeCreateKeyConfirmation(
      peerConnectionId(pc),
    );

    if (!confirmation || confirmation.length === 0) {
      throw new Error("E2EE: Yerel anahtar onayı üretilemedi.");
    }

    return confirmation;
  },

  async karsiTarafAnahtarOnayiniDogrula(
    pc: RTCPeerConnection,
    confirmationBase64: string,
  ): Promise<void> {
    if (!confirmationBase64 || confirmationBase64.length > 128) {
      throw new Error("E2EE: Karşı taraf anahtar onayı geçersiz.");
    }

    const verified = await nativeModule().e2eeVerifyPeerKeyConfirmation(
      peerConnectionId(pc),
      confirmationBase64,
    );

    if (verified !== true) {
      throw new Error("E2EE: Karşı taraf anahtar onayı doğrulanamadı.");
    }
  },

  async oturumKapat(pc: RTCPeerConnection): Promise<void> {
    await nativeModule().e2eeCloseSession(peerConnectionId(pc));
  },
};
