import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import type { MessageDto } from "../../types/message";
import type { MessageMediaDto } from "../../types/messageMedia";

import MessageInput from "./MessageInput";

type MediaType = "image" | "video" | "audio" | "file";

type ConversationPanelProps = {
  conversation: MessageDto[];
  selectedUserId: number | null;
  currentUserId: number | null;
  selectedUserName: string;
  selectedUserActive: boolean | null;
  yaziyor: boolean;
  conversationLoading: boolean;
  messageMedias: Record<number, MessageMediaDto[]>;
  formatDate: (date: string) => string;
  getMediaUrl: (mediaUrl: string) => string;
  messageText: string;
  sending: boolean;
  mediaSending: boolean;
  recording: boolean;
  recordingSeconds: number;
  mediaMenuOpen: boolean;
  onMessageTextChange: (value: string) => void;
  onSendMessage: () => void;
  onDeleteMessage: (messageId: number) => void;
  onMediaButtonClick: () => void;
  onOpenMediaPicker: (type: MediaType) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

function ConversationPanel({
  conversation,
  selectedUserId,
  currentUserId,
  selectedUserName,
  selectedUserActive,
  yaziyor,
  conversationLoading,
  messageMedias,
  formatDate,
  getMediaUrl,
  messageText,
  sending,
  mediaSending,
  recording,
  recordingSeconds,
  mediaMenuOpen,
  onMessageTextChange,
  onSendMessage,
  onDeleteMessage,
  onMediaButtonClick,
  onOpenMediaPicker,
  onStartRecording,
  onStopRecording,
}: ConversationPanelProps) {
  const listeRef = useRef<FlatList<MessageDto>>(null);

  // Medya sadece ekranda görünen mesajlar için indirilecek.
  // Böylece 50 mesaj = 50 medya isteği yerine sadece görünür medya yüklenir.
  const [medyaYerelUrl, setMedyaYerelUrl] = useState<Record<number, string>>(
    {},
  );

  const medyaIndiriliyorRef = useRef<Set<number>>(new Set());
  const medyaKuyrukRef = useRef<MessageMediaDto[]>([]);
  const aktifMedyaIndirmeRef = useRef(0);
  const gorunenMesajIdleriRef = useRef<Set<number>>(new Set());
  const [gorunenMesajVersion, setGorunenMesajVersion] = useState(0);

  const MAX_ESZAMANLI_MEDYA = 2;

  useEffect(() => {
    setMedyaYerelUrl({});
    medyaIndiriliyorRef.current.clear();
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId === null || conversationLoading) {
      return;
    }

    const zamanlayici = setTimeout(() => {
      listeRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);

    return () => clearTimeout(zamanlayici);
  }, [selectedUserId, conversation.length, conversationLoading]);

  const medyaAc = async (media: MessageMediaDto) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Oturum gerekli",
          "Medya açmak için tekrar giriş yapmanız gerekiyor.",
        );
        return;
      }

      const url = getMediaUrl(media.mediaUrl);

      console.log("MEDYA AUTHENTICATED OPEN BAŞLADI:", {
        mediaId: media.id,
        fileName: media.fileName,
        mimeType: media.mimeType,
        url,
      });

      // Korunan medya URL'si doğrudan Linking.openURL ile açılırsa
      // Android Authorization header göndermez ve backend 401 döner.
      // Önce JWT ile indirip cihazın cache klasörüne kaydediyoruz.
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "*/*",
        },
      });

      console.log("MEDYA AUTHENTICATED OPEN SONUCU:", {
        mediaId: media.id,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");

        console.error("MEDYA AUTHENTICATED OPEN HATASI:", {
          mediaId: media.id,
          status: response.status,
          response: responseText,
        });

        if (response.status === 401) {
          Alert.alert(
            "Oturum süresi doldu",
            "Medya için yetkilendirme başarısız oldu. Lütfen tekrar giriş yapın.",
          );
        } else if (response.status === 403) {
          Alert.alert(
            "Erişim reddedildi",
            "Bu medyaya erişim izniniz bulunmuyor.",
          );
        } else if (response.status === 404) {
          Alert.alert(
            "Medya bulunamadı",
            "Bu medya dosyası sunucuda bulunamadı.",
          );
        } else {
          Alert.alert(
            "Medya açılamadı",
            `Sunucu ${response.status} kodu döndürdü.`,
          );
        }

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size <= 0) {
        console.error("MEDYA BOŞ GELDİ:", media.id);
        Alert.alert("Hata", "Medya dosyası boş geldi.");
        return;
      }

      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const result = reader.result;

          if (typeof result !== "string" || !result.startsWith("data:")) {
            console.error("MEDYA DATA URI OLUŞTURULAMADI:", media.id);
            Alert.alert("Hata", "Medya dosyası hazırlanamadı.");
            return;
          }

          const base64 = result.split(",")[1];

          if (!base64) {
            console.error("MEDYA BASE64 VERİSİ OLUŞTURULAMADI:", media.id);
            Alert.alert("Hata", "Medya verisi hazırlanamadı.");
            return;
          }

          let uzanti = "";

          if (media.fileName && media.fileName.includes(".")) {
            uzanti = media.fileName.substring(media.fileName.lastIndexOf("."));
          }

          if (!uzanti && media.mimeType) {
            const mimeUzantilari: Record<string, string> = {
              "video/mp4": ".mp4",
              "video/webm": ".webm",
              "video/quicktime": ".mov",
              "video/x-msvideo": ".avi",
              "audio/mpeg": ".mp3",
              "audio/mp3": ".mp3",
              "audio/wav": ".wav",
              "audio/ogg": ".ogg",
              "audio/webm": ".webm",
              "audio/mp4": ".m4a",
              "audio/x-m4a": ".m4a",
              "image/jpeg": ".jpg",
              "image/png": ".png",
              "image/webp": ".webp",
              "image/gif": ".gif",
            };

            uzanti = mimeUzantilari[media.mimeType] || "";
          }

          if (!uzanti) {
            uzanti = ".bin";
          }

          const temizDosyaAdi = (media.fileName || `medya_${media.id}${uzanti}`)
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/\.+/g, ".");

          const dosyaAdi = temizDosyaAdi.includes(".")
            ? temizDosyaAdi
            : `medya_${media.id}${uzanti}`;

          const cacheDirectory = FileSystem.cacheDirectory;

          if (!cacheDirectory) {
            console.error("CACHE DIRECTORY BULUNAMADI:", media.id);
            Alert.alert("Hata", "Cihazın geçici dosya alanı bulunamadı.");
            return;
          }

          const dosyaUri = `${cacheDirectory}${Date.now()}_${dosyaAdi}`;

          await FileSystem.writeAsStringAsync(dosyaUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          console.log("MEDYA LOCAL DOSYAYA YAZILDI:", {
            mediaId: media.id,
            fileName: dosyaAdi,
            localUri: dosyaUri,
            size: blob.size,
          });

          const destekleniyor = await Linking.canOpenURL(dosyaUri);

          if (!destekleniyor) {
            Alert.alert(
              "Medya açılamadı",
              "Bu medya türünü cihazınızda açabilecek bir uygulama bulunamadı.",
            );
            return;
          }

          await Linking.openURL(dosyaUri);
        } catch (error) {
          console.error("MEDYA LOCAL DOSYA HATASI:", {
            mediaId: media.id,
            error,
          });

          Alert.alert("Hata", "Medya cihazda açılırken bir hata oluştu.");
        }
      };

      reader.onerror = (error) => {
        console.error("MEDYA FILEREADER HATASI:", {
          mediaId: media.id,
          error,
        });

        Alert.alert("Hata", "Medya okunamadı.");
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("MEDYA AUTHENTICATED OPEN EXCEPTION:", {
        mediaId: media.id,
        error,
      });

      Alert.alert("Hata", "Medya açılırken bir hata oluştu.");
    }
  };

  const medyaIndirTek = useCallback(
    async (media: MessageMediaDto) => {
      if (medyaYerelUrl[media.id]) {
        return;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        return;
      }

      medyaIndiriliyorRef.current.add(media.id);
      aktifMedyaIndirmeRef.current += 1;

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          console.error("MEDYA İNDİRİLEMEDİ: TOKEN YOK:", media.id);
          return;
        }

        const url = getMediaUrl(media.mediaUrl);

        console.log("MEDYA AUTHENTICATED DOWNLOAD BAŞLADI:", {
          mediaId: media.id,
          fileName: media.fileName,
          url,
        });

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "image/*",
          },
        });

        console.log("MEDYA AUTHENTICATED DOWNLOAD SONUCU:", {
          mediaId: media.id,
          status: response.status,
          ok: response.ok,
        });

        if (!response.ok) {
          const responseText = await response.text().catch(() => "");

          console.error("MEDYA İNDİRME HATASI:", {
            mediaId: media.id,
            status: response.status,
            response: responseText,
          });

          return;
        }

        const blob = await response.blob();

        if (!blob || blob.size <= 0) {
          console.error("MEDYA BOŞ GELDİ:", media.id);
          return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result;

          if (typeof result !== "string" || !result.startsWith("data:")) {
            console.error("MEDYA DATA URI OLUŞTURULAMADI:", media.id);
            return;
          }

          setMedyaYerelUrl((previous) => ({
            ...previous,
            [media.id]: result,
          }));

          console.log("MEDYA BAŞARIYLA LOCAL URI'YE ÇEVRİLDİ:", {
            mediaId: media.id,
            fileName: media.fileName,
            size: blob.size,
          });
        };

        reader.onerror = (error) => {
          console.error("MEDYA FILEREADER HATASI:", media.id, error);
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("MEDYA AUTHENTICATED DOWNLOAD EXCEPTION:", {
          mediaId: media.id,
          error,
        });
      } finally {
        medyaIndiriliyorRef.current.delete(media.id);
        aktifMedyaIndirmeRef.current = Math.max(
          0,
          aktifMedyaIndirmeRef.current - 1,
        );

        // Kuyruktan sıradaki medya dosyasını başlat.
        void medyaKuyrugunuCalistir();
      }
    },
    [getMediaUrl, medyaYerelUrl],
  );

  const medyaKuyrugunuCalistir = useCallback(async () => {
    while (
      aktifMedyaIndirmeRef.current < MAX_ESZAMANLI_MEDYA &&
      medyaKuyrukRef.current.length > 0
    ) {
      const media = medyaKuyrukRef.current.shift();

      if (!media) {
        return;
      }

      if (medyaYerelUrl[media.id]) {
        continue;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        continue;
      }

      void medyaIndirTek(media);
    }
  }, [medyaIndirTek, medyaYerelUrl]);

  const medyaIndirmeyiPlanla = useCallback(
    (media: MessageMediaDto) => {
      const resimMi =
        media.type === "IMAGE" || media.mimeType?.startsWith("image/");

      if (!resimMi) {
        return;
      }

      if (medyaYerelUrl[media.id]) {
        return;
      }

      if (medyaIndiriliyorRef.current.has(media.id)) {
        return;
      }

      if (medyaKuyrukRef.current.some((item) => item.id === media.id)) {
        return;
      }

      medyaKuyrukRef.current.push(media);
      void medyaKuyrugunuCalistir();
    },
    [medyaKuyrugunuCalistir, medyaYerelUrl],
  );

  const gorunenMesajlariMedyaIcinYukle = useCallback(() => {
    if (gorunenMesajIdleriRef.current.size === 0) {
      return;
    }

    const gorunenMesajIdleri = gorunenMesajIdleriRef.current;

    for (const mesajId of gorunenMesajIdleri) {
      const medyalar = messageMedias[mesajId] || [];

      for (const media of medyalar) {
        medyaIndirmeyiPlanla(media);
      }
    }
  }, [messageMedias, medyaIndirmeyiPlanla]);

  useEffect(() => {
    gorunenMesajlariMedyaIcinYukle();
  }, [gorunenMesajVersion, gorunenMesajlariMedyaIcinYukle]);

  useEffect(() => {
    // Kullanıcı değiştiğinde eski konuşmanın medya kuyruğunu temizle.
    medyaKuyrukRef.current = [];
    gorunenMesajIdleriRef.current.clear();
    setMedyaYerelUrl({});
    setGorunenMesajVersion((value) => value + 1);
  }, [selectedUserId]);

  const renderMedia = (media: MessageMediaDto) => {
    const url = getMediaUrl(media.mediaUrl);
    console.log("🔥 YENİ MEDYA KODU ÇALIŞIYOR 🔥", media.fileName);
    if (media.type === "IMAGE" || media.mimeType?.startsWith("image/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.imageContainer}
          onPress={() => medyaAc(media)}
        >
          {medyaYerelUrl[media.id] ? (
            <Image
              key={`${media.id}-${medyaYerelUrl[media.id]}`}
              source={{ uri: medyaYerelUrl[media.id] }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => {
                console.log(
                  "MEDYA GÖRSELİ BAŞARIYLA EKRANA BASILDI:",
                  media.fileName,
                );
              }}
              onError={(error) => {
                console.error("LOCAL MEDYA GÖRSEL HATASI:", {
                  dosya: media.fileName,
                  mediaId: media.id,
                  hata: error.nativeEvent,
                });
              }}
            />
          ) : (
            <View style={styles.imageLoadingContainer}>
              <Text style={styles.imageLoadingText}>
                Fotoğraf yükleniyor...
              </Text>
            </View>
          )}
        </Pressable>
      );
    }

    if (media.type === "VIDEO" || media.mimeType?.startsWith("video/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaCard}
          onPress={() => medyaAc(media)}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>🎬</Text>
          </View>

          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle}>Video</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Videoyu aç"}
            </Text>
          </View>

          <Text style={styles.mediaOpenIcon}>▶</Text>
        </Pressable>
      );
    }

    if (media.type === "AUDIO" || media.mimeType?.startsWith("audio/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaCard}
          onPress={() => medyaAc(media)}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>🎵</Text>
          </View>

          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle}>Ses</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Ses dosyasını aç"}
            </Text>
          </View>

          <Text style={styles.mediaOpenIcon}>▶</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={media.id}
        style={styles.mediaCard}
        onPress={() => medyaAc(media)}
      >
        <View style={styles.mediaIconContainer}>
          <Text style={styles.mediaIcon}>📎</Text>
        </View>

        <View style={styles.mediaInfo}>
          <Text style={styles.mediaTitle}>Dosya</Text>

          <Text style={styles.mediaFileName} numberOfLines={1}>
            {media.fileName || "Dosyayı aç"}
          </Text>
        </View>

        <Text style={styles.mediaOpenIcon}>↗</Text>
      </Pressable>
    );
  };

  const gorunenMesajDegisti = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ item: MessageDto }>;
      changed: Array<{ item: MessageDto }>;
    }) => {
      const yeniIdler = new Set<number>();

      for (const kayit of viewableItems) {
        if (kayit.item?.id !== undefined && kayit.item?.id !== null) {
          yeniIdler.add(Number(kayit.item.id));
        }
      }

      gorunenMesajIdleriRef.current = yeniIdler;
      setGorunenMesajVersion((value) => value + 1);
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  const renderMessage = ({ item }: { item: MessageDto }) => {
    const kendiMesaji =
      currentUserId !== null && Number(item.senderId) === Number(currentUserId);

    const medias = messageMedias[item.id] || [];

    const gonderenAdi = kendiMesaji ? "Siz" : selectedUserName;

    return (
      <View
        style={[
          styles.messageRow,
          kendiMesaji ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        <View style={styles.messageWrapper}>
          {!kendiMesaji && (
            <Text style={styles.senderName} numberOfLines={1}>
              {gonderenAdi}
            </Text>
          )}

          <View
            style={[
              styles.messageBubble,
              kendiMesaji
                ? styles.messageBubbleMine
                : styles.messageBubbleOther,
            ]}
          >
            {item.content ? (
              <Text
                style={[
                  styles.messageContent,
                  kendiMesaji
                    ? styles.messageContentMine
                    : styles.messageContentOther,
                ]}
              >
                {item.content}
              </Text>
            ) : null}

            {medias.length > 0 && (
              <View
                style={[
                  styles.mediaList,
                  item.content ? styles.mediaWithText : styles.mediaWithoutText,
                ]}
              >
                {medias.map((media) => renderMedia(media))}
              </View>
            )}

            <View style={styles.messageMeta}>
              <Text
                style={[
                  styles.messageTime,
                  kendiMesaji
                    ? styles.messageTimeMine
                    : styles.messageTimeOther,
                ]}
              >
                {formatDate(item.sentAt)}
              </Text>

              {kendiMesaji && (
                <>
                  <Text
                    style={[
                      styles.readStatus,
                      item.read
                        ? styles.readStatusRead
                        : styles.readStatusUnread,
                    ]}
                  >
                    {item.read ? "✓✓" : "✓"}
                  </Text>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        "Mesajı Sil",
                        "Bu mesajı silmek istediğinize emin misiniz?",
                        [
                          {
                            text: "Vazgeç",
                            style: "cancel",
                          },
                          {
                            text: "Sil",
                            style: "destructive",
                            onPress: () => onDeleteMessage(Number(item.id)),
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (selectedUserId === null) {
    return (
      <View style={styles.emptyPanel}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyAvatar}>
            <Text style={styles.emptyAvatarText}>💬</Text>
          </View>

          <Text style={styles.emptyTitle}>Bir konuşma seçin</Text>

          <Text style={styles.emptyText}>
            Mesajlaşmaya başlamak için konuşma listesinden bir kullanıcı seçin.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* KONUŞMA HEADER */}

      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {selectedUserName?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {selectedUserName || "Kullanıcı"}
          </Text>

          {selectedUserActive !== null && (
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  selectedUserActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  selectedUserActive ? styles.activeText : styles.inactiveText,
                ]}
                numberOfLines={1}
              >
                {selectedUserActive ? "Çevrimiçi" : "Çevrimdışı"}
              </Text>
            </View>
          )}

          {yaziyor && (
            <Text style={styles.typingText} numberOfLines={1}>
              {selectedUserName} yazıyor...
            </Text>
          )}
        </View>

        {selectedUserActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Aktif</Text>
          </View>
        )}
      </View>

      {/* MESAJLAR */}

      <View style={styles.messageArea}>
        {conversationLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Konuşma yükleniyor...</Text>
          </View>
        ) : conversation.length === 0 ? (
          <View style={styles.noMessageContainer}>
            <View style={styles.noMessageIcon}>
              <Text style={styles.noMessageIconText}>💬</Text>
            </View>

            <Text style={styles.noMessageTitle}>Henüz mesaj yok.</Text>

            <Text style={styles.noMessageText}>İlk mesajı gönderin.</Text>
          </View>
        ) : (
          <FlatList
            ref={listeRef}
            data={conversation}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={40}
            onViewableItemsChanged={gorunenMesajDegisti}
            viewabilityConfig={viewabilityConfig}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messageListContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              if (!conversationLoading && conversation.length > 0) {
                requestAnimationFrame(() => {
                  listeRef.current?.scrollToEnd({
                    animated: false,
                  });
                });
              }
            }}
          />
        )}
      </View>

      {/* =====================================================
          MESAJ INPUT
          EKRANIN ALTINDA SABİT ALAN
      ===================================================== */}

      <View style={styles.inputContainer}>
        <MessageInput
          messageText={messageText}
          sending={sending}
          mediaSending={mediaSending}
          recording={recording}
          recordingSeconds={recordingSeconds}
          mediaMenuOpen={mediaMenuOpen}
          onMessageTextChange={onMessageTextChange}
          onSendMessage={onSendMessage}
          onMediaButtonClick={onMediaButtonClick}
          onOpenMediaPicker={onOpenMediaPicker}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
        />
      </View>
    </View>
  );
}

export default ConversationPanel;

const styles = StyleSheet.create({
  /*
   * ANA PANEL
   */

  container: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    backgroundColor: "#ffffff",
  },

  /*
   * BOŞ PANEL
   */

  emptyPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: "#faf9ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  emptyContent: {
    alignItems: "center",
    width: "100%",
  },

  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeaff",
  },

  emptyAvatarText: {
    fontSize: 34,
  },

  emptyTitle: {
    color: "#5b3cc4",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    color: "#888888",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },

  /*
   * HEADER
   */

  header: {
    width: "100%",
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeaff",
  },

  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: "#eeeaff",
  },

  headerAvatarText: {
    color: "#5b3cc4",
    fontSize: 19,
    fontWeight: "800",
  },

  headerInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  headerName: {
    color: "#4d35a8",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  activeDot: {
    backgroundColor: "#2e9d55",
  },

  inactiveDot: {
    backgroundColor: "#999999",
  },

  statusText: {
    fontSize: 11,
    lineHeight: 15,
  },

  activeText: {
    color: "#218838",
  },

  inactiveText: {
    color: "#999999",
  },

  typingText: {
    color: "#7b61c9",
    fontSize: 10,
    lineHeight: 14,
    fontStyle: "italic",
    marginTop: 2,
  },

  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#edf8f0",
    marginLeft: 6,
  },

  activeBadgeText: {
    color: "#218838",
    fontSize: 10,
    fontWeight: "700",
  },

  /*
   * MESAJ ALANI
   */

  messageArea: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "#faf9ff",
  },

  messageListContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 15,
    flexGrow: 1,
  },

  /*
   * MESAJ SATIRI
   */

  messageRow: {
    width: "100%",
    marginVertical: 3,
    flexDirection: "row",
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  messageRowOther: {
    justifyContent: "flex-start",
  },

  messageWrapper: {
    maxWidth: "84%",
    minWidth: 0,
  },

  senderName: {
    color: "#6b5ca5",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginLeft: 8,
    marginBottom: 3,
  },

  /*
   * MESAJ BALONU
   */

  messageBubble: {
    maxWidth: "100%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    overflow: "hidden",
  },

  messageBubbleMine: {
    backgroundColor: "#5b3cc4",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },

  messageBubbleOther: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eeeaff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },

  messageContent: {
    fontSize: 15,
    lineHeight: 21,
  },

  messageContentMine: {
    color: "#ffffff",
  },

  messageContentOther: {
    color: "#333333",
  },

  /*
   * MEDYA
   */

  mediaList: {
    width: "100%",
  },

  mediaWithText: {
    marginTop: 7,
  },

  mediaWithoutText: {
    marginTop: 0,
  },

  imageContainer: {
    width: 220,
    maxWidth: "100%",
    height: 220,
    marginTop: 5,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#eeeeee",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeeee",
  },

  imageLoadingText: {
    color: "#888888",
    fontSize: 12,
  },

  mediaCard: {
    width: "100%",
    minHeight: 58,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91,60,196,0.10)",
  },

  mediaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.80)",
  },

  mediaIcon: {
    fontSize: 20,
  },

  mediaInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },

  mediaTitle: {
    color: "#4d35a8",
    fontSize: 12,
    fontWeight: "800",
  },

  mediaFileName: {
    color: "#777777",
    fontSize: 10,
    marginTop: 2,
  },

  mediaOpenIcon: {
    color: "#5b3cc4",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 7,
  },

  /*
   * MESAJ META
   */

  messageMeta: {
    minHeight: 16,
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  messageTime: {
    fontSize: 10,
  },

  messageTimeMine: {
    color: "rgba(255,255,255,0.70)",
  },

  messageTimeOther: {
    color: "#999999",
  },

  readStatus: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "800",
  },

  readStatusRead: {
    color: "#72cfff",
  },

  readStatusUnread: {
    color: "rgba(255,255,255,0.70)",
  },

  deleteButton: {
    width: 25,
    height: 25,
    marginLeft: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIcon: {
    fontSize: 13,
  },

  /*
   * INPUT CONTAINER
   *
   * Input artık mesaj alanından tamamen ayrı.
   * FlatList bu alanı kapatamaz.
   */

  inputContainer: {
    width: "100%",
    flexShrink: 0,
    minHeight: 68,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#eeeaff",
    zIndex: 20,
    elevation: 20,
  },

  /*
   * LOADING
   */

  loadingContainer: {
    flex: 1,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  loadingText: {
    color: "#8a7ab8",
    fontSize: 14,
    textAlign: "center",
  },

  /*
   * MESAJ YOK
   */

  noMessageContainer: {
    flex: 1,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  noMessageIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeaff",
  },

  noMessageIconText: {
    fontSize: 25,
  },

  noMessageTitle: {
    color: "#5b3cc4",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },

  noMessageText: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
  },
});
