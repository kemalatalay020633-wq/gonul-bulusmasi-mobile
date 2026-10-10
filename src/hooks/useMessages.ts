import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from "@react-native-documents/picker";
import { Client, IMessage } from "@stomp/stompjs";
import { Alert, NativeModules } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import type { MessageMediaDto } from "../types/messageMedia";

import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, WEBSOCKET_URL } from "../config/api";
import aramaWebRTC from "../services/AramaWebRTC";
const API_ADRESI = API_BASE_URL + "/api";

const { SesKayitModule } = NativeModules as {
  SesKayitModule?: {
    startRecorder: () => Promise<string>;
    stopRecorder: () => Promise<string | null>;
  };
};

function sesKayitModuluGetir() {
  if (!SesKayitModule) {
    throw new Error(
      "SesKayitModule bulunamadı. Android native ses kayıt modülü eklenmelidir.",
    );
  }

  return SesKayitModule;
}

const SUNUCU_ADRESI = API_BASE_URL;

const WEBSOCKET_ADRESI = WEBSOCKET_URL;
export type MessageDto = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  sentAt: string;
};

type ConversationUser = {
  userId: number;
  lastMessage: MessageDto;
};

type UserInfo = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  active?: boolean;
  isActive?: boolean;
  enabled?: boolean;
};

type UserInfoMap = Record<number, UserInfo>;

type MessageMediaMap = Record<number, MessageMediaDto[]>;

type MediaType = "image" | "video" | "audio" | "file";

type MediaAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type WebSocketMessage = {
  type?: string;
  destination?: string;
  body?: string;
  command?: string;
};

function useMessages() {
  /*
   * =========================================================
   * STATE
   * =========================================================
   */
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<MessageDto[]>([]);

  const [conversation, setConversation] = useState<MessageDto[]>([]);

  const [selectedUserId, setSelectedUserIdState] = useState<number | null>(
    null,
  );

  const [messageText, setMessageText] = useState("");

  const [yaziyor, setYaziyor] = useState(false);

  const [userInfoMap, setUserInfoMap] = useState<UserInfoMap>({});

  const [userInfoLoading, setUserInfoLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const [conversationLoading, setConversationLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const [mediaSending, setMediaSending] = useState(false);

  const [recording, setRecording] = useState(false);

  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);

  const [error, setError] = useState("");

  /*
   * =========================================================
   * YENİ MESAJ SAYILARI
   * =========================================================
   */

  const [yeniMesajSayilari, setYeniMesajSayilari] = useState<
    Record<number, number>
  >({});

  const yeniMesajSayisi = useMemo(() => {
    return Object.values(yeniMesajSayilari).reduce(
      (toplam, sayi) => toplam + sayi,
      0,
    );
  }, [yeniMesajSayilari]);

  /*
   * =========================================================
   * BİLDİRİMLER
   * =========================================================
   */

  const [bildirimler, setBildirimler] = useState<any[]>([]);

  const [bildirimSayisi, setBildirimSayisi] = useState(0);

  /*
   * =========================================================
   * MEDYA
   * =========================================================
   */

  const [messageMedias, setMessageMedias] = useState<MessageMediaMap>({});

  /*
   * =========================================================
   * REFS
   * =========================================================
   */

  const selectedUserIdRef = useRef<number | null>(null);

  const stompClientRef = useRef<Client | null>(null);

  const stompBagliRef = useRef(false);

  /*
   * =========================================================
   * ARAMA SİNYAL DİNLEYİCİLERİ
   * =========================================================
   */
  const aramaSinyalDinleyicileriRef = useRef<Set<(body: string) => void>>(
    new Set(),
  );

  /*
   * =========================================================
   * ARAMA SİNYAL DİNLEYİCİLERİ
   * =========================================================
   *
   * Arama için ayrı bir STOMP bağlantısı açmıyoruz.
   * Mevcut mesaj STOMP bağlantısı üzerinden
   * /topic/arama/{currentUserId} dinlenir.
   */

  const yaziyorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountedRef = useRef(true);

  /*
   * =========================================================
   * NATIVE SES KAYIT
   * =========================================================
   */

  const audioKayitUriRef = useRef<string | null>(null);

  /*
   * =========================================================
   * TOKEN
   * =========================================================
   */

  const getToken = useCallback(async () => {
    return await AsyncStorage.getItem("token");
  }, []);

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  const getCurrentUserId = useCallback(async () => {
    const value = await AsyncStorage.getItem("userId");

    if (!value) {
      return null;
    }

    const id = Number(value);

    if (Number.isNaN(id)) {
      return null;
    }

    return id;
  }, []);

  /*
   * =========================================================
   * HATA MESAJI
   * =========================================================
   */

  const hataMesaji = useCallback((hata: unknown, varsayilan: string) => {
    if (hata instanceof Error) {
      if (hata.message?.trim()) {
        return hata.message;
      }
    }

    return varsayilan;
  }, []);

  /*
   * =========================================================
   * API İSTEĞİ
   * =========================================================
   */

  const apiGetir = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getToken();

      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_ADRESI}${url}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await AsyncStorage.multiRemove(["token", "userId", "username", "role"]);

        throw new Error("Oturum süreniz sona erdi.");
      }

      const text = await response.text();

      let data: any = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const mesaj =
          data?.mesaj || data?.message || `İstek başarısız: ${response.status}`;

        throw new Error(mesaj);
      }

      return data;
    },
    [getToken],
  );

  /*
   * =========================================================
   * KULLANICI ADI
   * =========================================================
   */

  const getUserDisplayName = useCallback(
    (userId: number) => {
      const user = userInfoMap[userId];

      if (!user) {
        return `Kullanıcı #${userId}`;
      }

      if (user.username?.trim()) {
        return user.username;
      }

      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        return fullName;
      }

      if (user.name?.trim()) {
        return user.name;
      }

      return `Kullanıcı #${userId}`;
    },
    [userInfoMap],
  );

  /*
   * =========================================================
   * AKTİF Mİ?
   * =========================================================
   */

  const getUserActive = useCallback(
    (userId: number) => {
      const user = userInfoMap[userId];

      if (!user) {
        return null;
      }

      if (typeof user.active === "boolean") {
        return user.active;
      }

      if (typeof user.isActive === "boolean") {
        return user.isActive;
      }

      if (typeof user.enabled === "boolean") {
        return user.enabled;
      }

      return null;
    },
    [userInfoMap],
  );

  /*
   * =========================================================
   * MESAJI EKLE / GÜNCELLE
   * =========================================================
   */

  const mesajEkleVeyaGuncelle = useCallback(
    (eskiMesajlar: MessageDto[], yeniMesaj: MessageDto) => {
      const index = eskiMesajlar.findIndex(
        (mesaj) => mesaj.id === yeniMesaj.id,
      );

      if (index === -1) {
        return [...eskiMesajlar, yeniMesaj];
      }

      const yeniListe = [...eskiMesajlar];

      yeniListe[index] = {
        ...eskiMesajlar[index],
        ...yeniMesaj,
      };

      return yeniListe;
    },
    [],
  );

  /*
   * =========================================================
   * MESAJ MEDYALARINI GETİR
   * =========================================================
   *
   * Bir mesaj geldiğinde medya kaydını da hemen getirir.
   * Böylece fotoğraf mesajı sadece dosya adı olarak kalmaz;
   * MessageItem / ConversationPanel içinde gerçek fotoğraf
   * anında gösterilir.
   */
  const mesajMedyalariniGetir = useCallback(
    async (mesajId: number, yeniMesajMi: boolean = false) => {
      const MAX_DENEME = yeniMesajMi ? 8 : 1;
      const BEKLEME_MS = 500;

      for (let deneme = 1; deneme <= MAX_DENEME; deneme++) {
        try {
          const token = await getToken();

          if (!token) {
            console.log("MEDYA GETİRME ATLANDI: TOKEN YOK. MESAJ:", mesajId);
            return;
          }

          const response = await fetch(
            `${API_ADRESI}/message-media/message/${mesajId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );

          if (!response.ok) {
            console.error(
              "MESAJ MEDYALARI GETİRİLEMEDİ:",
              mesajId,
              "DENEME:",
              deneme,
              "HTTP:",
              response.status,
            );

            /*
             * Eski mesajlarda retry yapma.
             */
            if (!yeniMesajMi) {
              return;
            }
          } else {
            const text = await response.text();

            /*
             * Sunucu boş cevap döndürdüyse:
             *
             * Eski mesaj:
             *   -> Medya yok kabul et ve çık.
             *
             * Yeni mesaj:
             *   -> Upload henüz tamamlanmamış olabilir.
             *   -> Retry yap.
             */
            if (!text.trim()) {
              if (!yeniMesajMi) {
                return;
              }

              console.log(
                "YENİ MESAJ MEDYASI HENÜZ HAZIR:",
                mesajId,
                "DENEME:",
                deneme,
              );
            } else {
              const medyalar = JSON.parse(text) as MessageMediaDto[];

              if (Array.isArray(medyalar) && medyalar.length > 0) {
                setMessageMedias((previous) => ({
                  ...previous,
                  [mesajId]: medyalar,
                }));

                console.log(
                  "MESAJ MEDYASI BAŞARIYLA GETİRİLDİ:",
                  mesajId,
                  "DENEME:",
                  deneme,
                  "ADET:",
                  medyalar.length,
                );

                return;
              }

              /*
               * ÖNEMLİ:
               *
               * Eski mesajlarda boş dizi:
               *   medya yok demektir.
               *
               * Yeni mesajlarda:
               *   upload yarış durumu olabilir.
               */
              if (!yeniMesajMi) {
                return;
              }

              console.log(
                "YENİ MESAJ MEDYASI HENÜZ HAZIR:",
                mesajId,
                "DENEME:",
                deneme,
              );
            }
          }
        } catch (err) {
          console.error(
            "MESAJ MEDYASI GETİRME HATASI:",
            mesajId,
            "DENEME:",
            deneme,
            err,
          );

          /*
           * Eski mesajlarda hata varsa tekrar tekrar
           * bekletme.
           */
          if (!yeniMesajMi) {
            return;
          }
        }

        /*
         * Sadece yeni WebSocket mesajlarında retry.
         */
        if (yeniMesajMi && deneme < MAX_DENEME) {
          await new Promise<void>((resolve) => setTimeout(resolve, BEKLEME_MS));
        }
      }

      if (yeniMesajMi) {
        console.warn("YENİ MESAJ MEDYASI TÜM DENEMELERDE BULUNAMADI:", mesajId);
      }
    },
    [getToken],
  );

  /*
   * =========================================================
   * STOMP MESAJ GÖNDER
   * =========================================================
   */

  /*
   * =========================================================
   * PREMIUM KONTROLÜ
   * =========================================================
   * Mesaj, medya ve arama gibi iletişim özelliklerinde
   * frontend kontrolü kullanıcı deneyimi içindir. Backend de
   * ayrıca kontrol edecektir.
   */
  const premiumKontrolEt = useCallback(async (): Promise<boolean> => {
    try {
      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Oturum gerekli",
          "Bu özelliği kullanmak için giriş yapmalısınız.",
        );
        return false;
      }

      const response = await fetch(`${API_ADRESI}/memberships/me/premium`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const responseText = await response.text();

      console.log("PREMIUM KONTROL HTTP:", response.status);
      console.log("PREMIUM KONTROL CEVABI:", responseText);

      if (!response.ok) {
        throw new Error(
          `Premium durumu kontrol edilemedi. HTTP ${response.status}`,
        );
      }

      let premium = false;

      try {
        const sonuc: unknown = JSON.parse(responseText);

        if (typeof sonuc === "boolean") {
          premium = sonuc;
        } else if (typeof sonuc === "object" && sonuc !== null) {
          const veri = sonuc as {
            premium?: unknown;
            aktif?: unknown;
          };

          if (typeof veri.premium === "boolean") {
            premium = veri.premium;
          } else if (typeof veri.aktif === "boolean") {
            premium = veri.aktif;
          }
        }
      } catch {
        premium = responseText.trim().toLowerCase() === "true";
      }

      console.log("PREMIUM KONTROL SONUCU:", premium);

      if (!premium) {
        Alert.alert(
          "🔒 Premium Üyelik Gerekli",
          "Mesaj, dosya gönderme ve sesli/görüntülü arama özelliklerini kullanabilmek için Premium üye olmanız gerekiyor.",
          [
            {
              text: "Vazgeç",
              style: "cancel",
            },
            {
              text: "⭐ Premium Ol",
              onPress: () => {
                navigation.navigate("premium");
              },
            },
          ],
        );

        return false;
      }

      return true;
    } catch (error) {
      console.error("PREMIUM KONTROL HATASI:", error);

      return false;
    }
  }, [getToken, navigation]);

  const stompFrameGonder = useCallback(
    async (destination: string, body: any): Promise<boolean> => {
      console.log("📡 STOMP MESAJ GÖNDERİLMEK ÜZERE:", destination);

      const maksimumBekleme = 10000;
      const kontrolAraligi = 100;
      const baslangic = Date.now();

      while (Date.now() - baslangic < maksimumBekleme) {
        const client = stompClientRef.current;

        if (client && client.connected === true) {
          try {
            client.publish({
              destination,
              body: JSON.stringify(body),
              headers: {
                "content-type": "application/json",
              },
            });

            console.log("📡 STOMP MESAJI BAŞARIYLA GÖNDERİLDİ:", {
              destination,
              tip: body?.tip,
              hedefKullaniciId: body?.hedefKullaniciId,
            });

            return true;
          } catch (err) {
            console.error("❌ STOMP PUBLISH HATASI:", err);
            return false;
          }
        }

        console.log("⏳ STOMP HAZIR DEĞİL, BEKLENİYOR...", {
          clientVarMi: !!client,
          clientConnected: client?.connected === true,
          stompBagli: stompBagliRef.current,
        });

        await new Promise<void>((resolve) => {
          setTimeout(resolve, kontrolAraligi);
        });
      }

      console.error("❌ STOMP 10 SANİYE İÇİNDE HAZIR OLMADI.");

      return false;
    },
    [],
  );
  /*
   * =========================================================
   * ARAMA SİNYAL DİNLE
   * =========================================================
   */
  const aramaSinyaliDinle = useCallback((callback: (body: string) => void) => {
    aramaSinyalDinleyicileriRef.current.add(callback);

    return () => {
      aramaSinyalDinleyicileriRef.current.delete(callback);
    };
  }, []);

  /*
   * =========================================================
   * ARAMA SİNYALİ GÖNDER
   * =========================================================
   */
  const aramaSinyaliGonder = useCallback(
    async (sinyal: any): Promise<void> => {
      /*
       * Sadece yeni çağrıyı başlatan CALL_OFFER Premium kontrolünden geçer.
       */
      if (sinyal?.tip === "CALL_OFFER") {
        console.log("📞 CALL_OFFER PREMIUM KONTROLÜ BAŞLIYOR.");

        const premium = await premiumKontrolEt();

        console.log("📞 CALL_OFFER PREMIUM SONUCU:", premium);

        if (!premium) {
          console.log("📵 CALL_OFFER PREMIUM OLMADIĞI İÇİN ENGELLENDİ.");

          throw new Error("Arama başlatmak için Premium üyelik gereklidir.");
        }
      }

      console.log("📞 ARAMA SİNYALİ STOMP'A GÖNDERİLİYOR:", {
        tip: sinyal?.tip,
        hedefKullaniciId: sinyal?.hedefKullaniciId,
      });

      const gonderildi = await stompFrameGonder("/app/arama/sinyal", sinyal);

      if (!gonderildi) {
        console.error(
          "❌ ARAMA SİNYALİ GÖNDERİLEMEDİ: STOMP BAĞLANTISI HAZIR DEĞİL.",
        );

        throw new Error(
          "Arama sinyali gönderilemedi. WebSocket/STOMP bağlantısı hazır değil.",
        );
      }

      console.log("📞 ARAMA SİNYALİ BAŞARIYLA STOMP'A GÖNDERİLDİ:", {
        tip: sinyal?.tip,
        hedefKullaniciId: sinyal?.hedefKullaniciId,
      });
    },
    [premiumKontrolEt, stompFrameGonder],
  );
  /*
   * =========================================================
   * ARAMA İZNİ VER
   * =========================================================
   *
   * Mevcut kullanıcı:
   *   izinVerenKullanici
   *
   * Seçilen kullanıcı:
   *   izinVerilenKullanici
   *
   * Yani:
   *
   * Ayşe -> Kemal
   *
   * Ayşe, Kemal'in Ayşe'yi aramasına izin veriyor.
   */
  const aramaIzniVer = useCallback(
    async (kullaniciId: number) => {
      console.log("📞 ARAMA İZNİ VERİLİYOR:", kullaniciId);

      return await apiGetir("/arama-izinleri/ver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kullaniciId,
        }),
      });
    },
    [apiGetir],
  );

  /*
   * =========================================================
   * ARAMA İZNİNİ GERİ AL
   * =========================================================
   */
  const aramaIzniGeriAl = useCallback(
    async (kullaniciId: number) => {
      console.log("📵 ARAMA İZNİ GERİ ALINIYOR:", kullaniciId);

      return await apiGetir(`/arama-izinleri/geri-al/${kullaniciId}`, {
        method: "DELETE",
      });
    },
    [apiGetir],
  );

  /*
   * =========================================================
   * ARAMA İZNİ DURUMUNU KONTROL ET
   * =========================================================
   *
   * Mevcut kullanıcı:
   *   izinVeren
   *
   * kullaniciId:
   *   izin verilen kişi
   *
   * Örnek:
   * Ayşe giriş yaptı.
   * Ayşe -> Kemal izni var mı?
   */
  const aramaIzniKontrolEt = useCallback(
    async (kullaniciId: number) => {
      console.log("🔎 ARAMA İZNİ KONTROL EDİLİYOR:", kullaniciId);

      return await apiGetir(`/arama-izinleri/kontrol/${kullaniciId}`, {
        method: "GET",
      });
    },
    [apiGetir],
  );

  /*
   * =========================================================
   * ARAMA İZNİ VAR MI?
   * =========================================================
   *
   * Bu endpoint boolean döndürür.
   *
   * Arama yapan kullanıcı açısından:
   *
   * hedef kullanıcı -> mevcut kullanıcıya
   * arama izni vermiş mi?
   */
  const aramaIzniVarMi = useCallback(
    async (kullaniciId: number) => {
      console.log("🔎 ARAMA İZNİ VAR MI:", kullaniciId);

      return await apiGetir(`/arama-izinleri/var-mi/${kullaniciId}`, {
        method: "GET",
      });
    },
    [apiGetir],
  );
  /*
   * =========================================================
   * STOMP MESAJ İŞLE
   * =========================================================
   */

  const stompMesajIsle = useCallback(
    (message: IMessage) => {
      try {
        const destination = message.headers.destination;
        const bodyPart = message.body;

        console.log("📨 STOMP MESAJI GELDİ:", {
          destination,
          body: bodyPart,
        });

        if (!bodyPart) {
          console.log("⚠️ STOMP MESAJ BODY BOŞ");
          return;
        }

        let veri: any;

        try {
          veri = JSON.parse(bodyPart);
        } catch {
          console.log("❌ STOMP JSON PARSE EDİLEMEDİ:", bodyPart);
          return;
        }

        /*
         * =========================================================
         * ARAMA SİNYALİ
         * =========================================================
         */
        if (destination?.includes("/topic/arama/")) {
          console.log("📨📨📨 STOMP ARAMA TOPIC MESAJI GELDİ");
          console.log("📨 DESTINATION:", destination);
          console.log("📨 BODY:", bodyPart);
          console.log(
            "📨 ARAMA DİNLEYİCİ SAYISI:",
            aramaSinyalDinleyicileriRef.current.size,
          );

          aramaSinyalDinleyicileriRef.current.forEach((callback) => {
            try {
              console.log(
                "📨📨📨 useMessages ARAMA SİNYALİ DİNLİYİCİYE AKTARILIYOR",
              );

              callback(bodyPart);
            } catch (hata) {
              console.error("❌ ARAMA SİNYAL CALLBACK HATASI:", hata);
            }
          });

          return;
        }

        /*
         * =========================================================
         * YENİ MESAJ
         * =========================================================
         */
        if (destination?.includes("/topic/yeni-mesaj/")) {
          const yeniMesaj = veri as MessageDto;

          console.log("📩 YENİ MESAJ GELDİ:", yeniMesaj);

          void getCurrentUserId().then((currentId) => {
            if (currentId === null) {
              console.log(
                "⚠️ YENİ MESAJ İŞLENEMEDİ: currentUserId bulunamadı.",
              );
              return;
            }

            const kendiMesajim =
              Number(yeniMesaj.senderId) === Number(currentId);

            const acikKonusma = selectedUserIdRef.current;

            const konusmaAcik =
              acikKonusma !== null &&
              (Number(yeniMesaj.senderId) === Number(acikKonusma) ||
                (kendiMesajim &&
                  Number(yeniMesaj.receiverId) === Number(acikKonusma)));

            if (konusmaAcik) {
              if (kendiMesajim) {
                setConversation((previous) =>
                  mesajEkleVeyaGuncelle(previous, yeniMesaj),
                );

                setMessages((previous) =>
                  mesajEkleVeyaGuncelle(previous, yeniMesaj),
                );
              } else {
                const okunmusMesaj = {
                  ...yeniMesaj,
                  read: true,
                };

                setConversation((previous) =>
                  mesajEkleVeyaGuncelle(previous, okunmusMesaj),
                );

                setMessages((previous) =>
                  mesajEkleVeyaGuncelle(previous, okunmusMesaj),
                );

                void stompFrameGonder("/app/okundu", {
                  id: yeniMesaj.id,
                  receiverId: currentId,
                  content: yeniMesaj.content || "",
                });

                setYeniMesajSayilari((previous) => {
                  const yeni = {
                    ...previous,
                  };

                  delete yeni[yeniMesaj.senderId];

                  return yeni;
                });
              }
            } else {
              if (!kendiMesajim) {
                setYeniMesajSayilari((previous) => ({
                  ...previous,
                  [yeniMesaj.senderId]: (previous[yeniMesaj.senderId] || 0) + 1,
                }));
              }

              setMessages((previous) =>
                mesajEkleVeyaGuncelle(previous, yeniMesaj),
              );
            }

            /*
             * Yeni mesajın medya kaydını hemen getir.
             * Fotoğraf / video / ses mesajı ekranda
             * mümkün olduğunca hızlı görünür.
             */
            void mesajMedyalariniGetir(yeniMesaj.id);
          });

          return;
        }

        /*
         * =========================================================
         * MESAJ OKUNDU
         * =========================================================
         */
        if (destination?.includes("/topic/mesaj-okundu/")) {
          const okunanMesaj = veri as MessageDto;

          console.log("📖 MESAJ OKUNDU:", okunanMesaj);

          setConversation((previous) =>
            previous.map((mesaj) =>
              mesaj.id === okunanMesaj.id
                ? {
                    ...mesaj,
                    ...okunanMesaj,
                    read: true,
                  }
                : mesaj,
            ),
          );

          setMessages((previous) =>
            previous.map((mesaj) =>
              mesaj.id === okunanMesaj.id
                ? {
                    ...mesaj,
                    ...okunanMesaj,
                    read: true,
                  }
                : mesaj,
            ),
          );

          return;
        }

        /*
         * =========================================================
         * YAZIYOR
         * =========================================================
         */
        if (destination?.includes("/topic/yaziyor/")) {
          console.log("✍️ YAZIYOR BİLDİRİMİ:", veri);

          if (veri === false) {
            setYaziyor(false);
            return;
          }

          const yazanId = typeof veri === "number" ? veri : Number(veri);

          setYaziyor(
            selectedUserIdRef.current !== null &&
              Number(selectedUserIdRef.current) === Number(yazanId),
          );

          return;
        }

        /*
         * =========================================================
         * TANIMSIZ DESTINATION
         * =========================================================
         */
        console.log("⚠️ STOMP TANIMSIZ DESTINATION:", destination);
      } catch (err) {
        console.error("❌ STOMP MESAJ İŞLEME HATASI:", err);
      }
    },
    [
      getCurrentUserId,
      mesajEkleVeyaGuncelle,
      mesajMedyalariniGetir,
      stompFrameGonder,
    ],
  );

  /*
   * =========================================================
   * STOMP MESAJ HANDLER REF
   * =========================================================
   *
   * STOMP subscription sabit kalır.
   * Güncel mesaj işleyici ref üzerinden çağrılır.
   *
   * Böylece stompMesajIsle yeniden oluşturulsa bile
   * STOMP bağlantısının yaşam döngüsü değişmez.
   */
  const stompMesajIsleRef = useRef<(message: IMessage) => void>(() => {});

  stompMesajIsleRef.current = stompMesajIsle;
  /*
   * =========================================================
   * WEBRTC ARAMA <-> MESAJ STOMP ENTEGRASYONU
   * =========================================================
   *
   * AramaWebRTC kendi WebSocket/STOMP bağlantısını açmaz.
   * Gelen arama sinyalleri mevcut mesaj STOMP bağlantısından
   * AramaWebRTC'ye aktarılır; giden sinyaller de aynı bağlantı
   * üzerinden /app/arama/sinyal hedefine gönderilir.
   */

  /*
   * =========================================================
   * WEBRTC ARAMA <-> MESAJ STOMP ENTEGRASYONU
   * =========================================================
   *
   * AramaWebRTC için tek sinyal dinleyicisi burada bulunur.
   * Gelen ve giden sinyaller mevcut mesaj STOMP bağlantısını
   * kullanır. İkinci bir sinyal dinleyicisi kurulmaz.
   */

  useEffect(() => {
    let aktif = true;

    const dinleyiciTemizle = aramaSinyaliDinle((body) => {
      if (!aktif) {
        return;
      }

      try {
        console.log("📨 WEBRTC ARAMA SİNYALİ TEK NOKTADAN İŞLENİYOR");

        aramaWebRTC.gelenAramaSinyaliniIsle(body);
      } catch (hata) {
        console.error("❌ WEBRTC GELEN ARAMA SİNYALİ İŞLEME HATASI:", hata);
      }
    });

    aramaWebRTC.sinyalGondericiyiAyarla((sinyal) => {
      if (!aktif) {
        return;
      }

      void aramaSinyaliGonder(sinyal).catch((hata) => {
        console.error("❌ WEBRTC SİNYALİ GÖNDERİLEMEDİ:", hata);
      });
    });

    console.log("🟢 WEBRTC -> MESAJ STOMP TAŞIYICISI BAĞLANDI");

    return () => {
      aktif = false;

      dinleyiciTemizle();
      aramaWebRTC.sinyalGondericiyiAyarla(null);

      console.log("🔴 WEBRTC -> MESAJ STOMP TAŞIYICISI AYRILDI");
    };
  }, [aramaSinyaliDinle, aramaSinyaliGonder]);
  /*
   * =========================================================
   * STOMP SUBSCRIBE
   * =========================================================
   */

  /*
   * =========================================================
   * STOMP SUBSCRIBE
   * =========================================================
   */

  /*
   * =========================================================
   * STOMP SUBSCRIBE
   * =========================================================
   */

  const stompSubscribe = useCallback((destination: string) => {
    const client = stompClientRef.current;

    if (!client) {
      console.log("STOMP SUBSCRIBE YAPILAMADI: client yok:", destination);
      return null;
    }

    if (!client.connected) {
      console.log(
        "STOMP SUBSCRIBE YAPILAMADI: client bağlı değil:",
        destination,
      );
      return null;
    }

    try {
      const subscription = client.subscribe(
        destination,
        (message: IMessage) => {
          try {
            stompMesajIsleRef.current(message);
          } catch (err) {
            console.error("❌ STOMP MESAJ HANDLER HATASI:", err);
          }
        },
      );

      console.log("🟢 STOMP SUBSCRIBE YAPILDI:", destination);

      return subscription;
    } catch (err) {
      console.error("❌ STOMP SUBSCRIBE HATASI:", destination, err);

      return null;
    }
  }, []);

  /*
   * =========================================================
   * NATIVE WEBSOCKET / STOMP BAĞLANTISI
   * =========================================================
   *
   * Mobil uygulamada SockJS kullanmıyoruz.
   *
   * Backend:
   *   /ws       -> SockJS
   *   /ws-native -> Native WebSocket
   *
   * React Native tarafında doğrudan native WebSocket
   * üzerinden /ws-native endpointine bağlanıyoruz.
   */
  /*
   * =========================================================
   * WEBSOCKET / STOMP BAĞLANTISI
   * =========================================================
   */

  /*
   * =========================================================
   * NATIVE WEBSOCKET / STOMP BAĞLANTISI
   * =========================================================
   */

  const websocketBaglan = useCallback(async () => {
    const token = await getToken();
    const currentUserId = await getCurrentUserId();

    console.log("STOMP KİMLİK KONTROLÜ:", {
      tokenVarMi: Boolean(token),
      currentUserId,
      websocketAdresi: WEBSOCKET_ADRESI,
    });

    if (!token || currentUserId === null) {
      console.log(
        "STOMP BAĞLANTI ATLADI: token veya currentUserId bulunamadı.",
      );
      return;
    }

    const mevcutClient = stompClientRef.current;

    if (mevcutClient?.active || mevcutClient?.connected) {
      console.log("🟡 STOMP ZATEN AKTİF. YENİ BAĞLANTI AÇILMAYACAK.");
      return;
    }

    console.log("🔌 STOMP BAĞLANTISI BAŞLATILIYOR:", WEBSOCKET_ADRESI);

    const client = new Client({
      webSocketFactory: () => {
        console.log("🔌 NATIVE WEBSOCKET OLUŞTURULUYOR:", WEBSOCKET_ADRESI);

        return new WebSocket(WEBSOCKET_ADRESI, ["v12.stomp"]);
      },

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 3000,

      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,

      debug: (str) => {
        console.log("🟣 STOMP:", str);
      },

      onConnect: (frame) => {
        console.log("🟢🟢🟢 STOMP CONNECTED 🟢🟢🟢");

        console.log("STOMP FRAME:", frame);

        /*
         * Önce bağlantıyı hazır kabul et.
         */
        stompBagliRef.current = true;
        stompClientRef.current = client;

        console.log("🟢 STOMP CLIENT HAZIR:", {
          connected: client.connected,
          active: client.active,
        });

        /*
         * =====================================================
         * SUBSCRIPTIONS
         * =====================================================
         */

        stompSubscribe(`/topic/yeni-mesaj/${currentUserId}`);

        stompSubscribe(`/topic/mesaj-okundu/${currentUserId}`);

        stompSubscribe(`/topic/yaziyor/${currentUserId}`);

        stompSubscribe(`/topic/arama/${currentUserId}`);

        console.log("🟢🟢🟢 STOMP TÜM ABONELİKLER TAMAMLANDI 🟢🟢🟢");
      },

      onStompError: (frame) => {
        console.error(
          "❌ STOMP SUNUCU HATASI:",
          frame.headers["message"],
          frame.body,
        );

        stompBagliRef.current = false;
      },

      onWebSocketError: (event) => {
        console.error("❌ WEBSOCKET HATASI:", event);

        stompBagliRef.current = false;
      },

      onWebSocketClose: (event) => {
        console.log("🔴 WEBSOCKET KAPANDI:", event);

        stompBagliRef.current = false;
      },

      onDisconnect: () => {
        console.log("🔴 STOMP DISCONNECT");

        stompBagliRef.current = false;
      },
    });

    /*
     * Client'ı activate etmeden önce ref'e koy.
     */
    stompClientRef.current = client;

    console.log("🚀🚀🚀 STOMP CLIENT ACTIVATE ÇAĞRILIYOR 🚀🚀🚀");

    client.activate();
  }, [getToken, getCurrentUserId, stompSubscribe]);
  /*
   * =========================================================
   * KULLANICI BİLGİLERİ
   * =========================================================
   */

  const kullaniciBilgileriniGetir = useCallback(
    async (kullaniciIdleri: number[]) => {
      if (kullaniciIdleri.length === 0) {
        return;
      }

      try {
        setUserInfoLoading(true);

        const sonuclar = await Promise.all(
          kullaniciIdleri.map(async (id) => {
            try {
              return await apiGetir(`/users/${id}`);
            } catch {
              return null;
            }
          }),
        );

        setUserInfoMap((previous) => {
          const yeni = {
            ...previous,
          };

          sonuclar.forEach((user) => {
            if (user && user.id) {
              yeni[user.id] = user;
            }
          });

          return yeni;
        });
      } finally {
        setUserInfoLoading(false);
      }
    },
    [apiGetir],
  );

  /*
   * =========================================================
   * MESAJLARI GETİR
   * =========================================================
   */

  const mesajlariGetir = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      const [gelen, gonderilen] = await Promise.all([
        apiGetir("/messages/inbox"),
        apiGetir("/messages/sent"),
      ]);

      const tumMesajlar = [
        ...(Array.isArray(gelen) ? gelen : []),
        ...(Array.isArray(gonderilen) ? gonderilen : []),
      ] as MessageDto[];

      const benzersiz = Array.from(
        new Map(tumMesajlar.map((mesaj) => [mesaj.id, mesaj])).values(),
      );

      setMessages(benzersiz);
    } catch (err) {
      console.error("MESAJLAR YÜKLENEMEDİ:", err);

      setError(hataMesaji(err, "Mesajlar alınamadı."));
    } finally {
      setLoading(false);
    }
  }, [apiGetir, hataMesaji]);

  /*
   * =========================================================
   * KONUŞMA GETİR
   * =========================================================
   */

  const konusmayiGetir = useCallback(
    async (kullaniciId: number) => {
      try {
        setConversationLoading(true);

        setError("");

        const data = await apiGetir(`/messages/conversation/${kullaniciId}`);

        const liste = Array.isArray(data) ? (data as MessageDto[]) : [];

        setConversation(liste);

        /*
         * Konuşma açılır açılmaz mevcut mesajların medyalarını
         * birlikte getir. Böylece eski fotoğraflar da doğrudan
         * konuşma içinde görünür.
         */
        if (liste.length > 0) {
          const medyaKontrolMesajlari = liste.filter((mesaj) => {
            const icerik = (mesaj.content || "").toLowerCase().trim();

            return (
              /\.(jpg|jpeg|png|webp|gif|mp4|mov|avi|webm|mp3|wav|ogg|m4a|aac|flac)$/i.test(
                icerik,
              ) ||
              icerik.startsWith("http://") ||
              icerik.startsWith("https://") ||
              icerik.includes("/uploads/")
            );
          });

          if (medyaKontrolMesajlari.length > 0) {
            await Promise.all(
              medyaKontrolMesajlari.map((mesaj) =>
                mesajMedyalariniGetir(mesaj.id, false),
              ),
            );
          }
        }

        setMessages((previous) => {
          const map = new Map<number, MessageDto>();

          previous.forEach((mesaj) => map.set(mesaj.id, mesaj));

          liste.forEach((mesaj) => map.set(mesaj.id, mesaj));

          return Array.from(map.values());
        });

        /*
         * Okunmamışları bildir
         */

        const currentUserId = await getCurrentUserId();

        if (currentUserId !== null) {
          liste
            .filter(
              (mesaj) =>
                Number(mesaj.receiverId) === Number(currentUserId) &&
                !mesaj.read,
            )
            .forEach((mesaj) => {
              stompFrameGonder("/app/okundu", {
                id: mesaj.id,
                receiverId: currentUserId,
                content: mesaj.content || "",
              });
            });
        }

        /*
         * Konuşmanın bildirimi temizle
         */

        setYeniMesajSayilari((previous) => {
          const yeni = {
            ...previous,
          };

          delete yeni[kullaniciId];

          return yeni;
        });
      } catch (err) {
        console.error("KONUŞMA YÜKLENEMEDİ:", err);

        setError(hataMesaji(err, "Konuşma alınamadı."));
      } finally {
        setConversationLoading(false);
      }
    },
    [
      apiGetir,
      getCurrentUserId,
      hataMesaji,
      mesajMedyalariniGetir,
      stompFrameGonder,
    ],
  );

  /*
   * =========================================================
   * SEÇİLİ KULLANICI
   * =========================================================
   */

  const setSelectedUserId = useCallback(
    (id: number | null) => {
      selectedUserIdRef.current = id;

      setSelectedUserIdState(id);

      setYaziyor(false);

      if (yaziyorTimerRef.current) {
        clearTimeout(yaziyorTimerRef.current);

        yaziyorTimerRef.current = null;
      }

      if (id !== null) {
        void konusmayiGetir(id);
      } else {
        setConversation([]);
      }
    },
    [konusmayiGetir],
  );

  /*
   * =========================================================
   * KONUŞMA LİSTESİ
   * =========================================================
   */

  const users = useMemo<ConversationUser[]>(() => {
    const map = new Map<number, MessageDto>();

    messages.forEach((mesaj) => {
      let digerId = mesaj.senderId;

      if (
        selectedUserIdRef.current !== null &&
        (mesaj.senderId === selectedUserIdRef.current ||
          mesaj.receiverId === selectedUserIdRef.current)
      ) {
        digerId = selectedUserIdRef.current;
      }

      const mevcut = map.get(digerId);

      if (!mevcut) {
        map.set(digerId, mesaj);
        return;
      }

      const mevcutTarih = new Date(mevcut.sentAt).getTime();

      const yeniTarih = new Date(mesaj.sentAt).getTime();

      if (yeniTarih > mevcutTarih) {
        map.set(digerId, mesaj);
      }
    });

    return Array.from(map.entries())
      .map(([userId, lastMessage]) => ({
        userId,
        lastMessage,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessage.sentAt).getTime() -
          new Date(a.lastMessage.sentAt).getTime(),
      );
  }, [messages]);

  /*
   * =========================================================
   * DOĞRU KONUŞMA LİSTESİ
   * =========================================================
   */

  const [currentUserIdState, setCurrentUserIdState] = useState<number | null>(
    null,
  );

  useEffect(() => {
    void getCurrentUserId().then(setCurrentUserIdState);
  }, [getCurrentUserId]);

  const conversationUsers = useMemo<ConversationUser[]>(() => {
    const map = new Map<number, MessageDto>();

    if (currentUserIdState === null) {
      return [];
    }

    messages.forEach((mesaj) => {
      const digerId =
        Number(mesaj.senderId) === Number(currentUserIdState)
          ? mesaj.receiverId
          : mesaj.senderId;

      const mevcut = map.get(digerId);

      if (!mevcut) {
        map.set(digerId, mesaj);
        return;
      }

      if (
        new Date(mesaj.sentAt).getTime() > new Date(mevcut.sentAt).getTime()
      ) {
        map.set(digerId, mesaj);
      }
    });

    return Array.from(map.entries())
      .map(([userId, lastMessage]) => ({
        userId,
        lastMessage,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessage.sentAt).getTime() -
          new Date(a.lastMessage.sentAt).getTime(),
      );
  }, [messages, currentUserIdState]);

  /*
   * =========================================================
   * KULLANICI BİLGİLERİNİ YÜKLE
   * =========================================================
   */

  useEffect(() => {
    if (conversationUsers.length === 0) {
      return;
    }

    const eksikIdler = conversationUsers
      .map((user) => user.userId)
      .filter((id) => !userInfoMap[id]);

    if (eksikIdler.length > 0) {
      void kullaniciBilgileriniGetir(eksikIdler);
    }
  }, [conversationUsers, userInfoMap, kullaniciBilgileriniGetir]);

  /*
   * =========================================================
   * YAZIYOR BİLDİR
   * =========================================================
   */

  const yaziyorBildir = useCallback(() => {
    const id = selectedUserIdRef.current;

    if (id === null) {
      return;
    }

    stompFrameGonder("/app/yaziyor", {
      receiverId: id,
      content: "",
    });
  }, [stompFrameGonder]);

  /*
   * =========================================================
   * YAZMIYOR BİLDİR
   * =========================================================
   */

  const yazmiyorBildir = useCallback(() => {
    const id = selectedUserIdRef.current;

    if (id === null) {
      return;
    }

    stompFrameGonder("/app/yazmiyor", {
      receiverId: id,
      content: "",
    });

    setYaziyor(false);
  }, [stompFrameGonder]);

  /*
   * =========================================================
   * MESAJ YAZISI DEĞİŞTİ
   * =========================================================
   */

  const handleMessageTextChange = useCallback(
    (value: string) => {
      setMessageText(value);

      if (!value.trim() || selectedUserIdRef.current === null) {
        yazmiyorBildir();
        return;
      }

      yaziyorBildir();

      if (yaziyorTimerRef.current) {
        clearTimeout(yaziyorTimerRef.current);
      }

      yaziyorTimerRef.current = setTimeout(() => {
        yazmiyorBildir();

        yaziyorTimerRef.current = null;
      }, 3000);
    },
    [yaziyorBildir, yazmiyorBildir],
  );

  /*
   * =========================================================
   * MESAJ GÖNDER
   * =========================================================
   */

  const handleSendMessage = useCallback(async () => {
    console.log("=================================");
    console.log("GÖNDER BUTONUNA BASILDI");
    console.log("MESSAGE TEXT:", messageText);
    console.log("SELECTED USER:", selectedUserIdRef.current);
    console.log("=================================");

    const selectedId = selectedUserIdRef.current;

    if (!(await premiumKontrolEt())) {
      return;
    }

    if (selectedId === null) {
      setError("Önce bir konuşma seçin.");
      return;
    }

    const icerik = messageText.trim();

    if (!icerik) {
      return;
    }

    if (icerik.length > 2000) {
      setError("Mesaj en fazla 2000 karakter olabilir.");
      return;
    }

    try {
      setSending(true);

      setError("");

      if (yaziyorTimerRef.current) {
        clearTimeout(yaziyorTimerRef.current);

        yaziyorTimerRef.current = null;
      }

      yazmiyorBildir();

      console.log("MESAJ GÖNDERİLİYOR:", {
        receiverId: selectedId,
        content: icerik,
      });

      const gonderildi = await stompFrameGonder("/app/mesaj", {
        receiverId: selectedId,
        content: icerik,
      });

      if (!gonderildi) {
        throw new Error(
          "Mesaj gönderilemedi. WebSocket/STOMP bağlantısı hazır değil.",
        );
      }

      console.log("STOMP MESAJ GÖNDERİLDİ:", {
        receiverId: selectedId,
        content: icerik,
      });

      setMessageText("");

      console.log("MESAJ BAŞARIYLA GÖNDERİLDİ:", {
        receiverId: selectedId,
        content: icerik,
      });
    } catch (err) {
      console.error("MESAJ GÖNDERME HATASI:", err);

      setError(hataMesaji(err, "Mesaj gönderilemedi."));
    } finally {
      setSending(false);
    }
  }, [
    messageText,
    stompFrameGonder,
    yazmiyorBildir,
    hataMesaji,
    premiumKontrolEt,
  ]);
  /*
   * =========================================================
   * MESAJ SİL
   * =========================================================
   */

  const handleDeleteMessage = useCallback(
    async (mesajId: number) => {
      try {
        setError("");

        await apiGetir(`/messages/${mesajId}`, {
          method: "DELETE",
        });

        setConversation((previous) =>
          previous.filter((mesaj) => mesaj.id !== mesajId),
        );

        setMessages((previous) =>
          previous.filter((mesaj) => mesaj.id !== mesajId),
        );

        setMessageMedias((previous) => {
          const yeni = {
            ...previous,
          };

          delete yeni[mesajId];

          return yeni;
        });
      } catch (err) {
        console.error("MESAJ SİLME HATASI:", err);

        setError(hataMesaji(err, "Mesaj silinemedi."));
      }
    },
    [apiGetir, hataMesaji],
  );

  /*
   * =========================================================
   * MEDYA MENÜSÜ
   * =========================================================
   */

  const handleMediaButtonClick = useCallback(() => {
    if (sending || mediaSending || recording) {
      return;
    }

    setMediaMenuOpen((previous) => !previous);
  }, [sending, mediaSending, recording]);

  /*
   * =========================================================
   * MEDYA TÜRÜ
   * =========================================================
   */

  const getMediaType = useCallback(
    (mimeType: string, fileName: string): MessageMediaDto["type"] => {
      const mime = mimeType.toLowerCase();

      const name = fileName.toLowerCase();

      if (
        mime.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(name)
      ) {
        return "IMAGE";
      }

      if (mime.startsWith("video/") || /\.(mp4|mov|avi|webm)$/i.test(name)) {
        return "VIDEO";
      }

      if (
        mime.startsWith("audio/") ||
        /\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i.test(name)
      ) {
        return "AUDIO";
      }

      return "FILE";
    },
    [],
  );

  /*
   * =========================================================
   * MEDYA URL
   * =========================================================
   */
  const getMediaUrl = useCallback((mediaUrl: string) => {
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      return mediaUrl;
    }

    let dosyaAdi = mediaUrl;

    if (dosyaAdi.startsWith("/uploads/")) {
      dosyaAdi = dosyaAdi.substring("/uploads/".length);
    } else if (dosyaAdi.startsWith("uploads/")) {
      dosyaAdi = dosyaAdi.substring("uploads/".length);
    } else if (dosyaAdi.startsWith("/")) {
      dosyaAdi = dosyaAdi.substring(1);
    }

    return `${API_ADRESI}/message-media/file/${encodeURIComponent(dosyaAdi)}`;
  }, []);
  /*
   * =========================================================
   * MEDYA YÜKLE
   * =========================================================
   */

  const medyaYukle = useCallback(
    async (asset: MediaAsset, type: MediaType) => {
      const selectedId = selectedUserIdRef.current;

      if (!(await premiumKontrolEt())) {
        return;
      }

      if (selectedId === null) {
        setError("Önce bir konuşma seçin.");
        return;
      }

      try {
        setMediaSending(true);

        setError("");

        const token = await getToken();

        if (!token) {
          throw new Error("Oturum bulunamadı.");
        }

        const fileName = asset.fileName || `medya-${Date.now()}`;

        const mimeType =
          asset.mimeType || (type === "image" ? "image/jpeg" : "video/mp4");

        const medyaTipi = getMediaType(mimeType, fileName);

        /*
         * Önce gerçek mesaj oluştur.
         */

        const mesajResponse = await fetch(`${API_ADRESI}/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            receiverId: selectedId,
            content: fileName,
          }),
        });

        if (!mesajResponse.ok) {
          throw new Error("Medya mesajı oluşturulamadı.");
        }

        const yeniMesaj = (await mesajResponse.json()) as MessageDto;

        /*
         * =========================================================
         * MEDYA UPLOAD
         * =========================================================
         *
         * React Native / Expo ortamında FormData'ya düz JS nesnesi
         * vermek yerine expo-file-system File kullanıyoruz.
         *
         * Ayrıca gerçek mesaj ID'sini ve HTTP cevabını ayrıntılı
         * olarak logluyoruz. Böylece messages.id ile
         * message_media.message_id eşleşmesini kontrol edebiliriz.
         */
        const formData = new FormData();

        const dosya = {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        };

        console.log("========================================");
        console.log("MEDYA DOSYASI HAZIR");
        console.log("DOSYA URI:", dosya.uri);
        console.log("DOSYA ADI:", dosya.name);
        console.log("DOSYA TYPE:", dosya.type);
        console.log("MESAJ ID:", yeniMesaj.id);
        console.log("ALICI ID:", selectedId);
        console.log("MEDYA TÜRÜ:", medyaTipi);
        console.log("========================================");

        formData.append("file", dosya as any);
        formData.append("type", medyaTipi);
        const medyaUploadUrl =
          `${API_ADRESI}/message-media/upload` +
          `?messageId=${encodeURIComponent(String(yeniMesaj.id))}` +
          `&type=${encodeURIComponent(medyaTipi)}`;

        console.log("========================================");
        console.log("MEDYA UPLOAD BAŞLIYOR");
        console.log("URL:", medyaUploadUrl);
        console.log("MESSAGE ID:", yeniMesaj.id);
        console.log("TYPE:", medyaTipi);
        console.log("========================================");

        const medyaResponse = await fetch(medyaUploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formData,
        });

        // Response sadece bir kez okunuyor.
        const medyaResponseText = await medyaResponse.text();

        console.log("========================================");
        console.log("MEDYA UPLOAD SONUCU");
        console.log("MESSAGE ID:", yeniMesaj.id);
        console.log("HTTP STATUS:", medyaResponse.status);
        console.log("HTTP OK:", medyaResponse.ok);
        console.log("STATUS TEXT:", medyaResponse.statusText);
        console.log("RESPONSE:", medyaResponseText);
        console.log("========================================");

        if (!medyaResponse.ok) {
          throw new Error(
            `Medya yüklenemedi. HTTP ${medyaResponse.status} - ${medyaResponseText}`,
          );
        }

        let yeniMedya: MessageMediaDto;

        try {
          yeniMedya = JSON.parse(medyaResponseText) as MessageMediaDto;
        } catch (jsonError) {
          console.error("MEDYA RESPONSE JSON PARSE HATASI:", jsonError);

          throw new Error(
            `Medya yükleme başarılı görünüyor ancak sunucu JSON dönmedi: ${medyaResponseText}`,
          );
        }

        console.log("========================================");
        console.log("MEDYA BAŞARIYLA YÜKLENDİ");
        console.log("MESAJ ID:", yeniMesaj.id);
        console.log("MEDYA ID:", yeniMedya?.id);
        console.log("MEDYA MESSAGE ID:", yeniMedya?.messageId);
        console.log("MEDYA FILE NAME:", yeniMedya?.fileName);
        console.log("MEDYA URL:", yeniMedya?.mediaUrl);
        console.log("MEDYA TYPE:", yeniMedya?.type);
        console.log("========================================");

        setConversation((previous) =>
          mesajEkleVeyaGuncelle(previous, yeniMesaj),
        );

        setMessages((previous) => mesajEkleVeyaGuncelle(previous, yeniMesaj));

        setMessageMedias((previous) => ({
          ...previous,
          [yeniMesaj.id]: [...(previous[yeniMesaj.id] || []), yeniMedya],
        }));

        console.log("MEDYA KAYIT KONTROLÜ BAŞLIYOR. MESSAGE ID:", yeniMesaj.id);

        void mesajMedyalariniGetir(yeniMesaj.id);
      } catch (err) {
        console.error("MEDYA YÜKLEME HATASI:", err);

        setError(hataMesaji(err, "Medya gönderilemedi."));
      } finally {
        setMediaSending(false);
      }
    },
    [
      getToken,
      getMediaType,
      mesajEkleVeyaGuncelle,
      hataMesaji,
      premiumKontrolEt,
    ],
  );

  /*
   * =========================================================
   * MEDYA SEÇ
   * =========================================================
   */

  /*
   * =========================================================
   * MEDYA SEÇ
   * =========================================================
   */

  const openMediaPicker = useCallback(
    async (type: MediaType) => {
      setMediaMenuOpen(false);

      try {
        /*
         * =====================================================
         * FOTOĞRAF
         * =====================================================
         */

        if (type === "image") {
          const result = await launchImageLibrary({
            mediaType: "photo",
            selectionLimit: 1,
            includeBase64: false,
          });

          if (result.didCancel || !result.assets?.[0]) {
            return;
          }

          const asset = result.assets[0];

          if (!asset.uri) {
            Alert.alert("Hata", "Fotoğraf dosyasının URI bilgisi alınamadı.");

            return;
          }

          await medyaYukle(
            {
              uri: asset.uri,
              fileName: asset.fileName || `foto-${Date.now()}.jpg`,
              mimeType: asset.type || "image/jpeg",
            },
            "image",
          );

          return;
        }

        /*
         * =====================================================
         * VİDEO
         * =====================================================
         */

        if (type === "video") {
          const result = await launchImageLibrary({
            mediaType: "video",
            selectionLimit: 1,
            includeBase64: false,
          });

          if (result.didCancel || !result.assets?.[0]) {
            return;
          }

          const asset = result.assets[0];

          if (!asset.uri) {
            Alert.alert("Hata", "Video dosyasının URI bilgisi alınamadı.");

            return;
          }

          await medyaYukle(
            {
              uri: asset.uri,
              fileName: asset.fileName || `video-${Date.now()}.mp4`,
              mimeType: asset.type || "video/mp4",
            },
            "video",
          );

          return;
        }

        /*
         * =====================================================
         * SES / DOSYA
         * =====================================================
         */

        const [result] = await pick({
          type: type === "audio" ? [types.audio] : [types.allFiles],
        });

        if (!result.uri) {
          Alert.alert("Hata", "Dosyanın URI bilgisi alınamadı.");

          return;
        }

        await medyaYukle(
          {
            uri: result.uri,
            fileName:
              result.name ||
              `${type === "audio" ? "ses" : "dosya"}-${Date.now()}`,
            mimeType:
              result.type ||
              (type === "audio" ? "audio/mpeg" : "application/octet-stream"),
          },
          type,
        );
      } catch (err) {
        if (
          isErrorWithCode(err) &&
          err.code === errorCodes.OPERATION_CANCELED
        ) {
          return;
        }

        console.error("MEDYA SEÇİCİ HATASI:", err);

        setError(hataMesaji(err, "Medya seçilemedi."));
      }
    },
    [medyaYukle, hataMesaji],
  );
  /*
   * =========================================================
   * SES KAYDI
   * =========================================================
   */

  /*
   * =========================================================
   * SES KAYDI BAŞLAT
   * =========================================================
   */

  const startAudioRecording = useCallback(async () => {
    if (!(await premiumKontrolEt())) {
      return;
    }

    if (selectedUserIdRef.current === null) {
      setError("Önce bir konuşma seçin.");

      return;
    }

    if (recording || mediaSending) {
      return;
    }

    try {
      setError("");

      /*
       * Native Android mikrofon kaydı
       */
      const uri = await sesKayitModuluGetir().startRecorder();

      audioKayitUriRef.current = uri;

      console.log("🎙️ SES KAYDI BAŞLADI:", uri);

      setRecording(true);

      setRecordingSeconds(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch (err) {
      console.error("❌ SES KAYDI BAŞLATILAMADI:", err);

      audioKayitUriRef.current = null;

      setRecording(false);

      setRecordingSeconds(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);

        recordingTimerRef.current = null;
      }

      setError(hataMesaji(err, "Mikrofon açılamadı."));
    }
  }, [premiumKontrolEt, recording, mediaSending, hataMesaji]);

  /*
   * =========================================================
   * SES KAYDI DURDUR
   * =========================================================
   */
  /*
   * =========================================================
   * SES KAYDI DURDUR
   * =========================================================
   */

  const stopAudioRecording = useCallback(async () => {
    if (!recording) {
      return;
    }

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);

        recordingTimerRef.current = null;
      }

      /*
       * Native Android mikrofon kaydı durdur
       */
      const uri = await sesKayitModuluGetir().stopRecorder();

      console.log("🎙️ SES KAYDI DURDU:", uri);

      audioKayitUriRef.current = null;

      setRecording(false);

      if (!uri) {
        setRecordingSeconds(0);

        setError("Ses kaydı oluşturulamadı.");

        return;
      }

      const sure = recordingSeconds;

      await medyaYukle(
        {
          uri,
          fileName: `ses-${Date.now()}.m4a`,
          mimeType: "audio/mp4",
        },
        "audio",
      );

      console.log(`SES KAYDI GÖNDERİLDİ: ${sure} saniye`);

      setRecordingSeconds(0);
    } catch (err) {
      console.error("❌ SES KAYDI DURDURULAMADI:", err);

      setRecording(false);

      setRecordingSeconds(0);

      setError(hataMesaji(err, "Ses kaydı gönderilemedi."));
    } finally {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);

        recordingTimerRef.current = null;
      }
    }
  }, [recording, recordingSeconds, medyaYukle, hataMesaji]);

  /*
   * =========================================================
   * İLK YÜKLEME
   * =========================================================
   */

  /*
   * =========================================================
   * MESAJLARI İLK YÜKLE
   * =========================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    console.log("🟢 useMessages MOUNT OLDU.");

    void mesajlariGetir();
  }, [mesajlariGetir]);
  /*
   * =========================================================
   * STOMP BAĞLANTISI
   * =========================================================
   */

  useEffect(() => {
    let temizlendi = false;

    console.log("🔌 STOMP BAĞLANTI EFFECT ÇALIŞTI.");

    const baslat = async () => {
      if (temizlendi) {
        return;
      }

      await websocketBaglan();
    };

    void baslat();

    return () => {
      temizlendi = true;

      console.log("🧹 STOMP BAĞLANTI EFFECT CLEANUP.");

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);

        reconnectTimerRef.current = null;
      }

      const client = stompClientRef.current;

      if (!client) {
        stompBagliRef.current = false;
        return;
      }

      /*
       * Gerçek component kapanıyorsa STOMP kapatılır.
       */
      console.log("🔴 STOMP CLIENT DEACTIVATE ÇAĞRILIYOR.");

      stompBagliRef.current = false;

      stompClientRef.current = null;

      void client.deactivate();
    };
  }, [websocketBaglan]);
  /*
   * =========================================================
   * SEÇİLİ KULLANICI DEĞİŞİNCE
   * =========================================================
   */

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  /*
   * =========================================================
   * SEÇİLİ KULLANICI BİLGİSİ
   * =========================================================
   */

  const selectedUserName =
    selectedUserId !== null ? getUserDisplayName(selectedUserId) : "";

  const selectedUserActive =
    selectedUserId !== null ? getUserActive(selectedUserId) : null;

  /*
   * =========================================================
   * MEDYA URL
   * =========================================================
   */

  const normalizeMedyaUrl = useCallback(
    (url: string) => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      return getMediaUrl(url);
    },
    [getMediaUrl],
  );

  /*
   * =========================================================
   * RETURN
   * =========================================================
   */

  return {
    messages,

    users: conversationUsers,

    conversation,

    selectedUserId,

    selectedUserName,

    selectedUserActive,

    currentUserId: currentUserIdState,

    messageMedias,

    userInfoLoading,

    loading,

    conversationLoading,

    sending,

    mediaSending,

    recording,

    recordingSeconds,

    mediaMenuOpen,

    messageText,

    error,

    yeniMesajSayisi,

    bildirimler,

    bildirimSayisi,

    yaziyor,

    webSocketBagli: stompClientRef.current?.connected === true,

    setSelectedUserId,

    setMessageText,

    handleMessageTextChange,

    handleSendMessage,

    handleDeleteMessage,

    handleMediaButtonClick,

    openMediaPicker,

    startAudioRecording,

    stopAudioRecording,

    getUserDisplayName,

    getUserActive,

    getMediaUrl: normalizeMedyaUrl,

    /*
     * Arama sinyalleşmesi mevcut mesaj STOMP bağlantısını kullanır.
     */
    premiumKontrolEt,

    aramaSinyaliDinle,
    aramaSinyaliGonder,

    /*
     * Arama izinleri
     */
    aramaIzniVer,
    aramaIzniGeriAl,
    aramaIzniKontrolEt,
    aramaIzniVarMi,

    mesajiOkunduYap: (mesaj: MessageDto) => {
      const currentId = currentUserIdState;

      if (currentId === null) {
        return;
      }

      stompFrameGonder("/app/okundu", {
        id: mesaj.id,
        receiverId: currentId,
        content: mesaj.content || "",
      });

      setConversation((previous) =>
        previous.map((item) =>
          item.id === mesaj.id
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      setMessages((previous) =>
        previous.map((item) =>
          item.id === mesaj.id
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );
    },
  };
}

export default useMessages;
