import AsyncStorage from "@react-native-async-storage/async-storage";
// src/app/home.tsx
import { API_BASE_URL } from "../config/api";
const API_ADRESI = API_BASE_URL + "/api";
export type Bildirim = {
  id: number;
  kullaniciId: number;
  ilgiliId: number | null;
  baslik: string;
  mesaj: string;
  tip: string;
  okundu: boolean;
  createdAt: string;
};

type BackendBildirim = {
  id: number;
  relatedId?: number | null;
  userId?: number;
  type?: string;
  title?: string;
  content?: string;
  read?: boolean;
  createdAt?: string;
};

function kimlikDogrula(token: string): void {
  if (!token || !token.trim()) {
    throw new Error("Oturum bulunamadı.");
  }
}

function bildirimDonustur(bildirim: BackendBildirim): Bildirim {
  return {
    id: bildirim.id,

    kullaniciId: bildirim.userId ?? 0,

    ilgiliId: bildirim.relatedId ?? null,

    baslik: bildirim.title ?? "",

    mesaj: bildirim.content ?? "",

    tip: bildirim.type ?? "",

    okundu: bildirim.read ?? false,

    createdAt: bildirim.createdAt ?? "",
  };
}

function bildirimListesiniDonustur(bildirimler: BackendBildirim[]): Bildirim[] {
  return bildirimler.map((bildirim) => bildirimDonustur(bildirim));
}

async function istekYap<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  kimlikDogrula(token);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let hataMesaji = `HTTP ${response.status}`;

    try {
      const hata = await response.json();

      if (typeof hata === "string") {
        hataMesaji = hata;
      } else if (hata?.message) {
        hataMesaji = hata.message;
      } else if (hata?.error) {
        hataMesaji = hata.error;
      }
    } catch {
      // Hata gövdesi JSON değilse HTTP durumunu kullan.
    }

    throw new Error(hataMesaji);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/*
 * =========================================================
 * TÜM BİLDİRİMLERİ GETİR
 * =========================================================
 */

export async function bildirimleriGetir(
  token: string,
  kullaniciId: number,
): Promise<Bildirim[]> {
  kimlikDogrula(token);

  const veriler = await istekYap<BackendBildirim[]>(
    `${API_ADRESI}/bildirimler/${kullaniciId}`,
    token,
    {
      method: "GET",
    },
  );

  return bildirimListesiniDonustur(veriler);
}

/*
 * =========================================================
 * OKUNMAMIŞ BİLDİRİMLERİ GETİR
 * =========================================================
 */

export async function okunmamisBildirimleriGetir(
  token: string,
  kullaniciId: number,
): Promise<Bildirim[]> {
  kimlikDogrula(token);

  const veriler = await istekYap<BackendBildirim[]>(
    `${API_ADRESI}/bildirimler/${kullaniciId}/okunmamis`,
    token,
    {
      method: "GET",
    },
  );

  return bildirimListesiniDonustur(veriler);
}

/*
 * =========================================================
 * OKUNMAMIŞ BİLDİRİM SAYISI
 * =========================================================
 */

export async function okunmamisBildirimSayisiGetir(
  token: string,
  kullaniciId: number,
): Promise<number> {
  kimlikDogrula(token);

  const sonuc = await istekYap<string>(
    `${API_ADRESI}/bildirimler/${kullaniciId}/sayisi`,
    token,
    {
      method: "GET",
    },
  );

  const sayi = Number(sonuc);

  if (Number.isNaN(sayi)) {
    throw new Error("Bildirim sayısı geçersiz.");
  }

  return sayi;
}

/*
 * =========================================================
 * BİLDİRİMİ OKUNDU YAP
 * =========================================================
 */

export async function bildirimOkunduYap(
  token: string,
  bildirimId: number,
  kullaniciId: number,
): Promise<void> {
  kimlikDogrula(token);

  await istekYap<void>(
    `${API_ADRESI}/bildirimler/${bildirimId}/okundu?kullaniciId=${kullaniciId}`,
    token,
    {
      method: "PUT",
    },
  );
}

/*
 * =========================================================
 * TÜM BİLDİRİMLERİ OKUNDU YAP
 * =========================================================
 */

export async function tumBildirimleriOkunduYap(
  token: string,
  kullaniciId: number,
): Promise<void> {
  kimlikDogrula(token);

  await istekYap<void>(
    `${API_ADRESI}/bildirimler/${kullaniciId}/tumunu-okundu`,
    token,
    {
      method: "PUT",
    },
  );
}

/*
 * =========================================================
 * PROFİLİME BAKANLARI GETİR
 * =========================================================
 */

export async function profilimeBakanlariGetir(
  token: string,
  kullaniciId: number,
): Promise<Bildirim[]> {
  kimlikDogrula(token);

  const veriler = await istekYap<BackendBildirim[]>(
    `${API_ADRESI}/bildirimler/${kullaniciId}/profilime-bakanlar`,
    token,
    {
      method: "GET",
    },
  );

  return bildirimListesiniDonustur(veriler);
}

/*
 * =========================================================
 * OTURUM BİLGİSİNDEN TOKEN AL
 * =========================================================
 */

export async function bildirimTokenGetir(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

/*
 * =========================================================
 * OTURUM BİLGİSİNDEN KULLANICI ID AL
 * =========================================================
 */

export async function bildirimKullaniciIdGetir(): Promise<number | null> {
  const kullaniciId = await AsyncStorage.getItem("userId");

  if (!kullaniciId) {
    return null;
  }

  const id = Number(kullaniciId);

  if (Number.isNaN(id)) {
    return null;
  }

  return id;
}
