import api from "./api";
import { tokenGetir } from "./tokenServisi";
import { AramaE2EE } from "./AramaE2EE";

export type E2EEDeviceStatus = "ACTIVE" | "REVOKED";

export interface E2EEChallengeResponse {
  challenge: string;
  signingPayload: string;
  expiresInSeconds: number;
}

export interface E2EEDeviceRegisterResponse {
  deviceId: string;
  fingerprint: string;
  status: E2EEDeviceStatus;
}

export interface E2EEDeviceResponse {
  deviceId: string;
  fingerprint: string;
  identityPublicKey: string;
  status: E2EEDeviceStatus;
  createdAt: string;
  revokedAt: string | null;
}

export interface E2EEPeerDeviceResponse {
  deviceId: string;
  fingerprint: string;
  identityPublicKey: string;
}

async function yetkiliIstekKontrolu(): Promise<string> {
  const token = await tokenGetir();

  if (!token || !token.trim()) {
    throw new Error("E2EE: Kullanıcı oturumu bulunamadı.");
  }

  return token;
}

function yetkilendirmeBasligi(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const E2EEDeviceService = {
  async cihazlariListele(): Promise<E2EEDeviceResponse[]> {
    const token = await yetkiliIstekKontrolu();

    const response = await api.get<E2EEDeviceResponse[]>("/e2ee/devices", {
      headers: yetkilendirmeBasligi(token),
    });

    return response.data;
  },

  async karsiTarafCihazlariniListele(
    aramaOturumId: string,
  ): Promise<E2EEPeerDeviceResponse[]> {
    if (
      !aramaOturumId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        aramaOturumId,
      )
    ) {
      throw new Error("E2EE: Arama oturum kimliği geçersiz.");
    }

    const token = await yetkiliIstekKontrolu();

    const response = await api.get<E2EEPeerDeviceResponse[]>(
      `/e2ee/devices/call/${encodeURIComponent(aramaOturumId)}/peer`,
      { headers: yetkilendirmeBasligi(token) },
    );

    if (!Array.isArray(response.data)) {
      throw new Error("E2EE: Karşı taraf cihaz listesi geçersiz.");
    }

    return response.data.filter(
      (cihaz) =>
        typeof cihaz.deviceId === "string" &&
        typeof cihaz.fingerprint === "string" &&
        typeof cihaz.identityPublicKey === "string" &&
        cihaz.identityPublicKey.length > 0,
    );
  },

  async cihazKimliginiAl(): Promise<string> {
    const publicKey = await AramaE2EE.kimlikAcikAnahtariniAl();

    if (!publicKey || publicKey.length > 512) {
      throw new Error("E2EE: Cihaz açık anahtarı geçersiz.");
    }

    return publicKey;
  },

  async cihaziKaydet(): Promise<E2EEDeviceRegisterResponse> {
    const token = await yetkiliIstekKontrolu();
    const identityPublicKey = await this.cihazKimliginiAl();

    const mevcutCihazlar = await this.cihazlariListele();

    const mevcutCihaz = mevcutCihazlar.find(
      (cihaz) =>
        cihaz.status === "ACTIVE" &&
        cihaz.identityPublicKey === identityPublicKey,
    );

    if (mevcutCihaz) {
      return {
        deviceId: mevcutCihaz.deviceId,
        fingerprint: mevcutCihaz.fingerprint,
        status: mevcutCihaz.status,
      };
    }

    const challengeResponse = await api.post<E2EEChallengeResponse>(
      "/e2ee/devices/challenge",
      { identityPublicKey },
      { headers: yetkilendirmeBasligi(token) },
    );

    const { challenge, signingPayload } = challengeResponse.data;

    if (!challenge || !signingPayload) {
      throw new Error("E2EE: Backend challenge yanıtı geçersiz.");
    }

    const signature = await AramaE2EE.handshakeImzala(signingPayload);

    if (!signature) {
      throw new Error("E2EE: Cihaz imzası üretilemedi.");
    }

    const registerResponse = await api.post<E2EEDeviceRegisterResponse>(
      "/e2ee/devices",
      {
        identityPublicKey,
        challenge,
        signature,
      },
      { headers: yetkilendirmeBasligi(token) },
    );

    return registerResponse.data;
  },

  async cihazIptalEt(deviceId: string): Promise<void> {
    if (!deviceId) {
      throw new Error("E2EE: Cihaz kimliği belirtilmedi.");
    }

    const token = await yetkiliIstekKontrolu();

    await api.delete(`/e2ee/devices/${encodeURIComponent(deviceId)}`, {
      headers: yetkilendirmeBasligi(token),
    });
  },
};

export default E2EEDeviceService;
