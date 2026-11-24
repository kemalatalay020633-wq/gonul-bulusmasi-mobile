import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import * as RNLocalize from "react-native-localize";

import ar from "./ceviriler/ar.json";
import de from "./ceviriler/de.json";
import en from "./ceviriler/en.json";
import ru from "./ceviriler/ru.json";
import tr from "./ceviriler/tr.json";

const DIL_ANAHTARI = "uygulama_dili";

export const desteklenenDiller = ["tr", "en", "de", "ar", "ru"] as const;

export type DesteklenenDil = (typeof desteklenenDiller)[number];

type CeviriDosyasi = typeof tr;

type MesajCeviriDosyasi = Record<string, unknown>;

type MesajCevirileri = Record<DesteklenenDil, MesajCeviriDosyasi>;

/**
 * Mesajlaşma modülünün beş dildeki çevirileri.
 *
 * Bu nesne ayrı bir namespace olarak kullanılır:
 * useTranslation("messages")
 */
const mesajCevirileri: MesajCevirileri = {
  tr: {
    header: {
      back: "Geri",
      brand: "Gönül Buluşması",
      conversations: "Sohbetler",
      title: "Mesajlar",
      subtitle: "Sohbetlerin burada",
      chat: "Sohbet",
      online: "Çevrimiçi",
      offline: "Çevrimdışı",
      unreadMessages: "{{count}} okunmamış mesaj",
    },
    media: {
      attach: "Dosya ekle",
      closeMenu: "Menüyü kapat",
      share: "Paylaş",
      subtitle: "Paylaşmak istediğin içeriği seç",
      close: "Kapat",
      photo: "Fotoğraf",
      video: "Video",
      audio: "Ses",
      document: "Belge",
      camera: "Kamera",
      location: "Konum",
      uploading: "Yükleniyor...",
    },
    conversation: {
      mediaMessage: "Medya",
      loading: "Sohbetler yükleniyor...",
      online: "Çevrimiçi",
      offline: "Çevrimdışı",
      emptyTitle: "Henüz sohbetin yok",
      emptyDescription:
        "Yeni insanlarla tanışarak sohbet etmeye başlayabilirsin.",
    },
    input: {
      placeholder: "Mesajını yaz...",
      send: "Gönder",
      record: "Ses kaydet",
      attachment: "Dosya ekle",
    },
    message: {
      today: "Bugün",
      yesterday: "Dün",
      deleted: "Bu mesaj silindi",
      sending: "Gönderiliyor...",
      failed: "Gönderilemedi",
    },
    actions: {
      copy: "Kopyala",
      delete: "Sil",
      cancel: "Vazgeç",
      confirm: "Onayla",
      block: "Engelle",
      unblock: "Engeli kaldır",
    },
    menu: {
      title: "Konuşma işlemleri",
      permissionLoading: "İzin durumu kontrol ediliyor...",
      revokeCallPermission: "Arama iznini geri al",
      grantCallPermission: "Arama izni ver",
      report: "Şikâyet et",
      processing: "İşlem yapılıyor...",
      blockedByUser: "Bu kullanıcı sizi engelledi",
      blockUser: "Kullanıcıyı engelle",
      blockTitle: "Kullanıcıyı engelle",
      blockMessage:
        "{{name}} kullanıcısını engellemek istiyor musunuz? Engelleme sırasında mesajlaşma ve arama kullanılamaz.",
      unblockTitle: "Engeli kaldır",
      unblockMessage:
        "{{name}} kullanıcısının engelini kaldırmak istiyor musunuz?",
    },
    errors: {
      locationTitle: "Konum Hatası",
      locationUnavailable: "Konum bağlantısı bulunamadı.",
      invalidCoordinates: "Geçersiz koordinat bilgisi.",
      mapTitle: "Harita Açılamadı",
      mapError:
        "Konum haritada açılamadı. İnternet bağlantısını ve harita uygulamasını kontrol edin.",
      errorTitle: "Hata",
      videoError: "Video açılamadı.",
      audioError: "Ses dosyası açılamadı.",
      fileError: "Dosya açılamadı.",
    },
  },

  en: {
    header: {
      back: "Back",
      brand: "Gönül Buluşması",
      conversations: "Conversations",
      title: "Messages",
      subtitle: "Your conversations are here",
      chat: "Chat",
      online: "Online",
      offline: "Offline",
      unreadMessages: "{{count}} unread messages",
    },
    media: {
      attach: "Attach file",
      closeMenu: "Close menu",
      share: "Share",
      subtitle: "Choose what you want to share",
      close: "Close",
      photo: "Photo",
      video: "Video",
      audio: "Audio",
      document: "Document",
      camera: "Camera",
      location: "Location",
      uploading: "Uploading...",
    },
    conversation: {
      mediaMessage: "Media",
      loading: "Loading conversations...",
      online: "Online",
      offline: "Offline",
      emptyTitle: "No conversations yet",
      emptyDescription: "Meet new people and start chatting.",
    },
    input: {
      placeholder: "Write a message...",
      send: "Send",
      record: "Record audio",
      attachment: "Attach file",
    },
    message: {
      today: "Today",
      yesterday: "Yesterday",
      deleted: "This message was deleted",
      sending: "Sending...",
      failed: "Failed to send",
    },
    actions: {
      copy: "Copy",
      delete: "Delete",
      cancel: "Cancel",
      confirm: "Confirm",
      block: "Block",
      unblock: "Unblock",
    },
    menu: {
      title: "Conversation options",
      permissionLoading: "Checking permission...",
      revokeCallPermission: "Revoke call permission",
      grantCallPermission: "Allow calls",
      report: "Report",
      processing: "Processing...",
      blockedByUser: "This user blocked you",
      blockUser: "Block user",
      blockTitle: "Block user",
      blockMessage:
        "Do you want to block {{name}}? Messaging and calls will be unavailable while blocked.",
      unblockTitle: "Unblock user",
      unblockMessage: "Do you want to unblock {{name}}?",
    },
    errors: {
      locationTitle: "Location Error",
      locationUnavailable: "Location link could not be found.",
      invalidCoordinates: "Invalid coordinate information.",
      mapTitle: "Unable to Open Map",
      mapError:
        "The location could not be opened on the map. Check your internet connection and map application.",
      errorTitle: "Error",
      videoError: "Could not open video.",
      audioError: "Could not open audio file.",
      fileError: "Could not open file.",
    },
  },

  de: {
    header: {
      back: "Zurück",
      brand: "Gönül Buluşması",
      conversations: "Unterhaltungen",
      title: "Nachrichten",
      subtitle: "Hier sind deine Unterhaltungen",
      chat: "Chat",
      online: "Online",
      offline: "Offline",
      unreadMessages: "{{count}} ungelesene Nachrichten",
    },
    media: {
      attach: "Datei anhängen",
      closeMenu: "Menü schließen",
      share: "Teilen",
      subtitle: "Wähle aus, was du teilen möchtest",
      close: "Schließen",
      photo: "Foto",
      video: "Video",
      audio: "Audio",
      document: "Dokument",
      camera: "Kamera",
      location: "Standort",
      uploading: "Wird hochgeladen...",
    },
    conversation: {
      mediaMessage: "Medien",
      loading: "Unterhaltungen werden geladen...",
      online: "Online",
      offline: "Offline",
      emptyTitle: "Noch keine Unterhaltungen",
      emptyDescription: "Lerne neue Menschen kennen und beginne zu chatten.",
    },
    input: {
      placeholder: "Nachricht schreiben...",
      send: "Senden",
      record: "Audio aufnehmen",
      attachment: "Datei anhängen",
    },
    message: {
      today: "Heute",
      yesterday: "Gestern",
      deleted: "Diese Nachricht wurde gelöscht",
      sending: "Wird gesendet...",
      failed: "Senden fehlgeschlagen",
    },
    actions: {
      copy: "Kopieren",
      delete: "Löschen",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      block: "Blockieren",
      unblock: "Blockierung aufheben",
    },
    menu: {
      title: "Gesprächsoptionen",
      permissionLoading: "Berechtigung wird geprüft...",
      revokeCallPermission: "Anrufberechtigung entziehen",
      grantCallPermission: "Anrufe erlauben",
      report: "Melden",
      processing: "Wird verarbeitet...",
      blockedByUser: "Dieser Nutzer hat dich blockiert",
      blockUser: "Nutzer blockieren",
      blockTitle: "Nutzer blockieren",
      blockMessage:
        "Möchtest du {{name}} blockieren? Während der Blockierung sind Nachrichten und Anrufe nicht verfügbar.",
      unblockTitle: "Blockierung aufheben",
      unblockMessage: "Möchtest du die Blockierung von {{name}} aufheben?",
    },
    errors: {
      locationTitle: "Standortfehler",
      locationUnavailable: "Standortverknüpfung nicht gefunden.",
      invalidCoordinates: "Ungültige Koordinaten.",
      mapTitle: "Karte konnte nicht geöffnet werden",
      mapError:
        "Der Standort konnte nicht auf der Karte geöffnet werden. Überprüfe deine Internetverbindung und Karten-App.",
      errorTitle: "Fehler",
      videoError: "Video konnte nicht geöffnet werden.",
      audioError: "Audiodatei konnte nicht geöffnet werden.",
      fileError: "Datei konnte nicht geöffnet werden.",
    },
  },

  ar: {
    header: {
      back: "رجوع",
      brand: "Gönül Buluşması",
      conversations: "المحادثات",
      title: "الرسائل",
      subtitle: "محادثاتك هنا",
      chat: "دردشة",
      online: "متصل",
      offline: "غير متصل",
      unreadMessages: "{{count}} رسالة غير مقروءة",
    },
    media: {
      attach: "إرفاق ملف",
      closeMenu: "إغلاق القائمة",
      share: "مشاركة",
      subtitle: "اختر المحتوى الذي تريد مشاركته",
      close: "إغلاق",
      photo: "صورة",
      video: "فيديو",
      audio: "صوت",
      document: "مستند",
      camera: "الكاميرا",
      location: "الموقع",
      uploading: "جارٍ التحميل...",
    },
    conversation: {
      mediaMessage: "وسائط",
      loading: "جارٍ تحميل المحادثات...",
      online: "متصل",
      offline: "غير متصل",
      emptyTitle: "لا توجد محادثات بعد",
      emptyDescription: "تعرّف على أشخاص جدد وابدأ المحادثة.",
    },
    input: {
      placeholder: "اكتب رسالتك...",
      send: "إرسال",
      record: "تسجيل صوت",
      attachment: "إرفاق ملف",
    },
    message: {
      today: "اليوم",
      yesterday: "أمس",
      deleted: "تم حذف هذه الرسالة",
      sending: "جارٍ الإرسال...",
      failed: "فشل الإرسال",
    },
    actions: {
      copy: "نسخ",
      delete: "حذف",
      cancel: "إلغاء",
      confirm: "تأكيد",
      block: "حظر",
      unblock: "إلغاء الحظر",
    },
    menu: {
      title: "خيارات المحادثة",
      permissionLoading: "جارٍ التحقق من الإذن...",
      revokeCallPermission: "إلغاء إذن الاتصال",
      grantCallPermission: "السماح بالمكالمات",
      report: "إبلاغ",
      processing: "جارٍ التنفيذ...",
      blockedByUser: "قام هذا المستخدم بحظرك",
      blockUser: "حظر المستخدم",
      blockTitle: "حظر المستخدم",
      blockMessage:
        "هل تريد حظر {{name}}؟ لن تكون الرسائل والمكالمات متاحة أثناء الحظر.",
      unblockTitle: "إلغاء الحظر",
      unblockMessage: "هل تريد إلغاء حظر {{name}}؟",
    },
    errors: {
      locationTitle: "خطأ في الموقع",
      locationUnavailable: "تعذر العثور على رابط الموقع.",
      invalidCoordinates: "معلومات الإحداثيات غير صالحة.",
      mapTitle: "تعذر فتح الخريطة",
      mapError:
        "تعذر فتح الموقع على الخريطة. تحقق من اتصال الإنترنت وتطبيق الخرائط.",
      errorTitle: "خطأ",
      videoError: "تعذر فتح الفيديو.",
      audioError: "تعذر فتح الملف الصوتي.",
      fileError: "تعذر فتح الملف.",
    },
  },

  ru: {
    header: {
      back: "Назад",
      brand: "Gönül Buluşması",
      conversations: "Беседы",
      title: "Сообщения",
      subtitle: "Ваши беседы здесь",
      chat: "Чат",
      online: "В сети",
      offline: "Не в сети",
      unreadMessages: "Непрочитанных сообщений: {{count}}",
    },
    media: {
      attach: "Прикрепить файл",
      closeMenu: "Закрыть меню",
      share: "Поделиться",
      subtitle: "Выберите, чем хотите поделиться",
      close: "Закрыть",
      photo: "Фото",
      video: "Видео",
      audio: "Аудио",
      document: "Документ",
      camera: "Камера",
      location: "Местоположение",
      uploading: "Загрузка...",
    },
    conversation: {
      mediaMessage: "Медиа",
      loading: "Загрузка бесед...",
      online: "В сети",
      offline: "Не в сети",
      emptyTitle: "Пока нет бесед",
      emptyDescription: "Знакомьтесь с новыми людьми и начинайте общаться.",
    },
    input: {
      placeholder: "Введите сообщение...",
      send: "Отправить",
      record: "Записать аудио",
      attachment: "Прикрепить файл",
    },
    message: {
      today: "Сегодня",
      yesterday: "Вчера",
      deleted: "Это сообщение удалено",
      sending: "Отправка...",
      failed: "Не удалось отправить",
    },
    actions: {
      copy: "Копировать",
      delete: "Удалить",
      cancel: "Отмена",
      confirm: "Подтвердить",
      block: "Заблокировать",
      unblock: "Разблокировать",
    },
    menu: {
      title: "Параметры беседы",
      permissionLoading: "Проверка разрешения...",
      revokeCallPermission: "Отозвать разрешение на звонки",
      grantCallPermission: "Разрешить звонки",
      report: "Пожаловаться",
      processing: "Выполняется...",
      blockedByUser: "Этот пользователь заблокировал вас",
      blockUser: "Заблокировать пользователя",
      blockTitle: "Заблокировать пользователя",
      blockMessage:
        "Заблокировать пользователя {{name}}? Во время блокировки сообщения и звонки будут недоступны.",
      unblockTitle: "Разблокировать пользователя",
      unblockMessage: "Разблокировать пользователя {{name}}?",
    },
    errors: {
      locationTitle: "Ошибка местоположения",
      locationUnavailable: "Ссылка на местоположение не найдена.",
      invalidCoordinates: "Недопустимые координаты.",
      mapTitle: "Не удалось открыть карту",
      mapError:
        "Не удалось открыть местоположение на карте. Проверьте подключение к интернету и приложение карт.",
      errorTitle: "Ошибка",
      videoError: "Не удалось открыть видео.",
      audioError: "Не удалось открыть аудиофайл.",
      fileError: "Не удалось открыть файл.",
    },
  },
};

/**
 * Dil kodunu kontrol eder.
 */
function dilGecerliMi(dil: string | null | undefined): dil is DesteklenenDil {
  if (!dil) {
    return false;
  }

  const normalizeDil = dil.split("-")[0].split("_")[0].toLowerCase();

  return desteklenenDiller.includes(normalizeDil as DesteklenenDil);
}

/**
 * Gelen dil kodunu desteklenen dile dönüştürür.
 *
 * tr-TR -> tr
 * en-US -> en
 * de-DE -> de
 * ar-SA -> ar
 * ru-RU -> ru
 */
function diliNormalizeEt(
  dil: string | null | undefined,
): DesteklenenDil | null {
  if (!dil) {
    return null;
  }

  const normalizeDil = dil.split("-")[0].split("_")[0].toLowerCase();

  if (dilGecerliMi(normalizeDil)) {
    return normalizeDil as DesteklenenDil;
  }

  return null;
}

/**
 * Çeviri kaynaklarını oluşturur.
 *
 * translation:
 * Mevcut JSON çevirileri.
 *
 * messages:
 * Mesajlaşma modülünün ayrı namespace çevirileri.
 *
 * Mevcut JSON dosyalarındaki doğrudan namespace'ler de korunur.
 */
function kaynakOlustur(
  ceviri: CeviriDosyasi,
  mesajCevirisi: MesajCeviriDosyasi,
) {
  const mevcutKaynaklar = ceviri as Record<string, unknown>;

  return {
    ...mevcutKaynaklar,

    translation: ceviri,

    messages: {
      ...(mevcutKaynaklar.messages as Record<string, unknown> | undefined),
      ...mesajCevirisi,
    },
  };
}

/**
 * Beş dilin çeviri kaynakları.
 */
const kaynaklar = {
  tr: kaynakOlustur(tr, mesajCevirileri.tr),
  en: kaynakOlustur(en, mesajCevirileri.en),
  de: kaynakOlustur(de, mesajCevirileri.de),
  ar: kaynakOlustur(ar, mesajCevirileri.ar),
  ru: kaynakOlustur(ru, mesajCevirileri.ru),
};

/**
 * Kayıtlı ve doğrudan kullanılabilir namespace'leri belirler.
 */
const namespaceListesi = Array.from(
  new Set([
    "translation",
    "messages",
    ...Object.keys(tr).filter(
      (anahtar) =>
        typeof (tr as Record<string, unknown>)[anahtar] === "object" &&
        (tr as Record<string, unknown>)[anahtar] !== null,
    ),
  ]),
);

/**
 * Arapça için RTL yazım yönünü ayarlar.
 */
function rtlYonunuAyarla(dil: DesteklenenDil): boolean {
  const rtlGerekli = dil === "ar";

  const yenidenBaslatGerekli = I18nManager.isRTL !== rtlGerekli;

  I18nManager.allowRTL(rtlGerekli);
  I18nManager.forceRTL(rtlGerekli);

  return yenidenBaslatGerekli;
}

/**
 * Uygulamanın mevcut dilini getirir.
 */
export function mevcutDiliGetir(): DesteklenenDil {
  const aktifDil = i18n.resolvedLanguage || i18n.language;

  return diliNormalizeEt(aktifDil) ?? "tr";
}

/**
 * Uygulama dilini değiştirir.
 */
export async function diliDegistir(dil: DesteklenenDil): Promise<boolean> {
  const normalizeDil = diliNormalizeEt(dil);

  if (!normalizeDil) {
    throw new Error("Desteklenmeyen uygulama dili.");
  }

  await AsyncStorage.setItem(DIL_ANAHTARI, normalizeDil);

  const yenidenBaslatGerekli = rtlYonunuAyarla(normalizeDil);

  await i18n.changeLanguage(normalizeDil);

  console.log("UYGULAMA DİLİ DEĞİŞTİRİLDİ:", normalizeDil);

  return yenidenBaslatGerekli;
}

/**
 * Telefonun sistem dilini getirir.
 */
function sistemDiliniGetir(): DesteklenenDil {
  try {
    const yerelDiller = RNLocalize.getLocales();

    for (const yerelDil of yerelDiller) {
      const dil = diliNormalizeEt(
        yerelDil.languageTag || yerelDil.languageCode,
      );

      if (dil) {
        return dil;
      }
    }
  } catch (hata) {
    console.error("SİSTEM DİLİ ALINAMADI:", hata);
  }

  return "tr";
}

/**
 * i18next yapılandırma ayarları.
 */
const i18nAyarlar = {
  resources: kaynaklar,

  fallbackLng: ["en", "tr"],

  supportedLngs: [...desteklenenDiller],

  load: "languageOnly" as const,

  defaultNS: "translation",

  fallbackNS: ["translation"],

  ns: namespaceListesi,

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },

  returnNull: false,

  returnEmptyString: false,

  debug: false,
};

/**
 * Uygulama açılırken kayıtlı dili yükler.
 *
 * Öncelik:
 * 1. Kullanıcının kayıtlı dili.
 * 2. Telefonun sistem dili.
 * 3. Türkçe.
 */
async function diliBaslat(): Promise<void> {
  try {
    const kayitliDil = await AsyncStorage.getItem(DIL_ANAHTARI);

    const kayitliDilNormalize = diliNormalizeEt(kayitliDil);

    const secilenDil: DesteklenenDil =
      kayitliDilNormalize ?? sistemDiliniGetir();

    rtlYonunuAyarla(secilenDil);

    await i18n.use(initReactI18next).init({
      ...i18nAyarlar,
      lng: secilenDil,
    });

    console.log("UYGULAMA DİLİ BAŞLATILDI:", secilenDil);
  } catch (hata) {
    console.error("DİL BAŞLATMA HATASI:", hata);

    if (!i18n.isInitialized) {
      try {
        rtlYonunuAyarla("tr");

        await i18n.use(initReactI18next).init({
          ...i18nAyarlar,
          lng: "tr",
        });

        console.log("UYGULAMA TÜRKÇE OLARAK BAŞLATILDI.");
      } catch (yedekHata) {
        console.error("TÜRKÇE DİL BAŞLATMA HATASI:", yedekHata);
      }
    }
  }
}

/**
 * Uygulamanın dil başlatma işlemi.
 *
 * App.tsx içerisinde beklenebilir.
 */
export const i18nHazir = diliBaslat();

/**
 * i18next nesnesi.
 */
export default i18n;
