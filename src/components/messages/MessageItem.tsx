import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MessageDto } from "../../types/message";
import type { MessageMediaDto } from "../../types/messageMedia";

type MessageItemProps = {
  message: MessageDto;
  currentUserId: number | null;
  medias?: MessageMediaDto[];
  senderName: string;
  formatDate: (date: string) => string;
  getMediaUrl: (mediaUrl: string) => string;
};

function MessageItem({
  message,
  currentUserId,
  medias = [],
  senderName,
  formatDate,
  getMediaUrl,
}: MessageItemProps) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenGetir = async () => {
      try {
        const mevcutToken = await AsyncStorage.getItem("token");
        setToken(mevcutToken);
      } catch (hata) {
        console.error("MEDYA TOKEN ALINAMADI:", hata);
      }
    };

    void tokenGetir();
  }, []);

  const isMine =
    currentUserId !== null &&
    Number(message.senderId) === Number(currentUserId);

  // Konum mesajındaki Google Maps bağlantısını bul.
  const konumBaglantisi =
    message.content
      ?.match(/https?:\/\/[^\s]+/i)?.[0]
      ?.replace(/[),.;]+$/, "") ?? null;

  // Koordinatları URL içinden veya mesaj metninden çıkar.
  const koordinatEslesmesi =
    konumBaglantisi?.match(
      /[?&]query=(-?\d{1,3}(?:\.\d+)?)(?:,|%2C)(-?\d{1,3}(?:\.\d+)?)/i,
    ) ?? message.content?.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);

  const konumEnlem = koordinatEslesmesi?.[1];
  const konumBoylam = koordinatEslesmesi?.[2];

  const konumMesaji =
    konumBaglantisi !== null &&
    /google\.[^/]+\/maps/i.test(konumBaglantisi) &&
    Boolean(konumEnlem && konumBoylam);

  // Harita kartının önizleme görseli.
  const konumHaritaOnizleme =
    konumEnlem && konumBoylam
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${konumEnlem},${konumBoylam}&zoom=15&size=600x280&markers=${konumEnlem},${konumBoylam},red-pushpin`
      : null;

  // Konumu Google Maps üzerinde aç.
  const konumuAc = async () => {
    try {
      if (!konumBaglantisi) {
        Alert.alert("Konum Hatası", "Konum bağlantısı bulunamadı.");
        return;
      }

      const koordinatlar =
        konumBaglantisi.match(
          /[?&]query=(-?\d{1,3}(?:\.\d+)?)(?:,|%2C)(-?\d{1,3}(?:\.\d+)?)/i,
        ) ?? message.content?.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);

      if (!koordinatlar) {
        await Linking.openURL(konumBaglantisi);
        return;
      }

      const enlem = Number(koordinatlar[1]);
      const boylam = Number(koordinatlar[2]);

      if (
        !Number.isFinite(enlem) ||
        !Number.isFinite(boylam) ||
        enlem < -90 ||
        enlem > 90 ||
        boylam < -180 ||
        boylam > 180
      ) {
        Alert.alert("Konum Hatası", "Geçersiz koordinat bilgisi.");
        return;
      }

      // Android üzerinde ADB ile test edilen Google Maps arama bağlantısı.
      const haritaBaglantisi = `https://www.google.com/maps/search/?api=1&query=${enlem}%2C${boylam}`;

      console.log("KONUM KARTINA BASILDI");
      console.log("ENLEM:", enlem);
      console.log("BOYLAM:", boylam);
      console.log("HARITA BAGLANTISI:", haritaBaglantisi);

      await Linking.openURL(haritaBaglantisi);
    } catch (hata) {
      console.error("KONUM AÇMA HATASI:", hata);

      Alert.alert(
        "Harita Açılamadı",
        "Konum haritada açılamadı. İnternet bağlantısını ve harita uygulamasını kontrol edin.",
      );
    }
  };

  const medyaGoster = (media: MessageMediaDto) => {
    const url = getMediaUrl(media.mediaUrl);

    if (media.type === "IMAGE" || media.mimeType?.startsWith("image/")) {
      return (
        <View key={media.id} style={styles.imageContainer}>
          <Image
            source={{
              uri: url,
              headers: token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : undefined,
            }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      );
    }

    if (media.type === "VIDEO" || media.mimeType?.startsWith("video/")) {
      return (
        <Pressable
          key={media.id}
          style={[
            styles.mediaButton,
            isMine ? styles.mediaButtonMine : styles.mediaButtonOther,
          ]}
          onPress={() => {
            void Linking.openURL(url).catch((hata) => {
              console.error("VIDEO AÇMA HATASI:", hata);
              Alert.alert("Hata", "Video açılamadı.");
            });
          }}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>▶</Text>
          </View>

          <View style={styles.mediaTextContainer}>
            <Text
              style={[
                styles.mediaTitle,
                isMine ? styles.mediaTitleMine : styles.mediaTitleOther,
              ]}
            >
              Video
            </Text>

            <Text
              style={[
                styles.mediaFileName,
                isMine ? styles.mediaFileNameMine : styles.mediaFileNameOther,
              ]}
              numberOfLines={1}
            >
              {media.fileName || "Videoyu aç"}
            </Text>
          </View>

          <Text style={styles.openIcon}>↗</Text>
        </Pressable>
      );
    }

    if (media.type === "AUDIO" || media.mimeType?.startsWith("audio/")) {
      return (
        <Pressable
          key={media.id}
          style={[
            styles.mediaButton,
            isMine ? styles.mediaButtonMine : styles.mediaButtonOther,
          ]}
          onPress={() => {
            void Linking.openURL(url).catch((hata) => {
              console.error("SES DOSYASI AÇMA HATASI:", hata);
              Alert.alert("Hata", "Ses dosyası açılamadı.");
            });
          }}
        >
          <View style={styles.mediaIconContainer}>
            <Text style={styles.mediaIcon}>♫</Text>
          </View>

          <View style={styles.mediaTextContainer}>
            <Text
              style={[
                styles.mediaTitle,
                isMine ? styles.mediaTitleMine : styles.mediaTitleOther,
              ]}
            >
              Ses dosyası
            </Text>

            <Text
              style={[
                styles.mediaFileName,
                isMine ? styles.mediaFileNameMine : styles.mediaFileNameOther,
              ]}
              numberOfLines={1}
            >
              {media.fileName || "Ses dosyasını aç"}
            </Text>
          </View>

          <Text style={styles.openIcon}>↗</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={media.id}
        style={[
          styles.mediaButton,
          isMine ? styles.mediaButtonMine : styles.mediaButtonOther,
        ]}
        onPress={() => {
          void Linking.openURL(url).catch((hata) => {
            console.error("DOSYA AÇMA HATASI:", hata);
            Alert.alert("Hata", "Dosya açılamadı.");
          });
        }}
      >
        <View style={styles.mediaIconContainer}>
          <Text style={styles.mediaIcon}>📎</Text>
        </View>

        <View style={styles.mediaTextContainer}>
          <Text
            style={[
              styles.mediaTitle,
              isMine ? styles.mediaTitleMine : styles.mediaTitleOther,
            ]}
          >
            Dosya
          </Text>

          <Text
            style={[
              styles.mediaFileName,
              isMine ? styles.mediaFileNameMine : styles.mediaFileNameOther,
            ]}
            numberOfLines={1}
          >
            {media.fileName || "Dosyayı aç"}
          </Text>
        </View>

        <Text style={styles.openIcon}>↗</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.messageItem,
        isMine ? styles.messageItemMine : styles.messageItemOther,
      ]}
    >
      {!isMine && <Text style={styles.senderName}>{senderName}</Text>}

      <View
        style={[
          styles.messageBubble,
          isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
        ]}
      >
        {message.content ? (
          konumMesaji ? (
            <Pressable
              style={[
                styles.locationCard,
                isMine ? styles.locationCardMine : styles.locationCardOther,
              ]}
              onPress={() => {
                void konumuAc();
              }}
              accessibilityRole="button"
              accessibilityLabel="Paylaşılan konumu Google Maps üzerinde aç"
            >
              {konumHaritaOnizleme ? (
                <Image
                  source={{ uri: konumHaritaOnizleme }}
                  style={styles.locationMapPreview}
                  resizeMode="cover"
                  accessibilityLabel="Paylaşılan konumun harita önizlemesi"
                />
              ) : (
                <View style={styles.locationMapFallback}>
                  <Text style={styles.locationMapFallbackIcon}>📍</Text>
                  <Text style={styles.locationMapFallbackText}>
                    Harita önizlemesi
                  </Text>
                </View>
              )}

              <View style={styles.locationContentRow}>
                <View style={styles.locationIconContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                </View>

                <View style={styles.locationTextContainer}>
                  <Text
                    style={[
                      styles.locationTitle,
                      isMine
                        ? styles.locationTitleMine
                        : styles.locationTitleOther,
                    ]}
                  >
                    Konum paylaşıldı
                  </Text>

                  <Text
                    style={[
                      styles.locationDescription,
                      isMine
                        ? styles.locationDescriptionMine
                        : styles.locationDescriptionOther,
                    ]}
                  >
                    Haritayı Aç ↗
                  </Text>
                </View>

                <Text
                  style={[
                    styles.locationOpenIcon,
                    isMine
                      ? styles.locationOpenIconMine
                      : styles.locationOpenIconOther,
                  ]}
                >
                  ↗
                </Text>
              </View>
            </Pressable>
          ) : (
            <Text
              style={[
                styles.messageContent,
                isMine ? styles.messageContentMine : styles.messageContentOther,
              ]}
            >
              {message.content}
            </Text>
          )
        ) : null}

        {medias.length > 0 && (
          <View
            style={[
              styles.mediaList,
              message.content
                ? styles.mediaListWithText
                : styles.mediaListWithoutText,
            ]}
          >
            {medias.map((media) => medyaGoster(media))}
          </View>
        )}

        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              isMine ? styles.messageTimeMine : styles.messageTimeOther,
            ]}
          >
            {formatDate(message.sentAt)}
          </Text>

          {isMine && (
            <Text
              style={[
                styles.readStatus,
                message.read ? styles.readStatusRead : styles.readStatusUnread,
              ]}
            >
              {message.read ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default MessageItem;

const styles = StyleSheet.create({
  messageItem: {
    width: "100%",
    marginVertical: 5,
    paddingHorizontal: 3,
  },

  messageItemMine: {
    alignItems: "flex-end",
  },

  messageItemOther: {
    alignItems: "flex-start",
  },

  senderName: {
    color: "#80509B",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 12,
    marginBottom: 5,
  },

  messageBubble: {
    maxWidth: "86%",
    minWidth: 55,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
  },

  messageBubbleMine: {
    backgroundColor: "#A044B5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 7,
  },

  messageBubbleOther: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: "#EADCF1",
  },

  messageContent: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },

  messageContentMine: {
    color: "#FFFFFF",
  },

  messageContentOther: {
    color: "#33263D",
  },

  mediaList: {
    width: "100%",
  },

  mediaListWithText: {
    marginTop: 9,
  },

  mediaListWithoutText: {
    marginTop: 0,
  },

  locationCard: {
    width: 260,
    maxWidth: "100%",
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
  },

  locationMapPreview: {
    width: "100%",
    height: 132,
    backgroundColor: "#EDE3F2",
  },

  locationMapFallback: {
    width: "100%",
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE3F2",
  },

  locationMapFallbackIcon: {
    fontSize: 30,
    marginBottom: 5,
  },

  locationMapFallbackText: {
    color: "#6E6079",
    fontSize: 11,
    fontWeight: "600",
  },

  locationContentRow: {
    minHeight: 76,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  locationCardMine: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.2)",
  },

  locationCardOther: {
    backgroundColor: "#F8F0FB",
    borderColor: "#EADCF1",
  },

  locationIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(130,95,190,0.13)",
    marginRight: 10,
  },

  locationIcon: {
    fontSize: 22,
  },

  locationTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 5,
  },

  locationTitleMine: {
    color: "#FFFFFF",
  },

  locationTitleOther: {
    color: "#4B315F",
  },

  locationDescription: {
    fontSize: 10,
    lineHeight: 15,
  },

  locationDescriptionMine: {
    color: "rgba(255,255,255,0.78)",
  },

  locationDescriptionOther: {
    color: "#81728D",
  },

  locationOpenIcon: {
    fontSize: 19,
    fontWeight: "700",
    marginLeft: 7,
  },

  locationOpenIconMine: {
    color: "#FFFFFF",
  },

  locationOpenIconOther: {
    color: "#80509B",
  },

  imageContainer: {
    marginTop: 5,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#F0EDF5",
  },

  image: {
    width: 240,
    height: 260,
  },

  mediaButton: {
    minHeight: 66,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  mediaButtonMine: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.16)",
  },

  mediaButtonOther: {
    backgroundColor: "#F8F0FB",
    borderColor: "#EADCF1",
  },

  mediaIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    marginRight: 10,
  },

  mediaIcon: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },

  mediaTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  mediaTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  mediaTitleMine: {
    color: "#FFFFFF",
  },

  mediaTitleOther: {
    color: "#4B315F",
  },

  mediaFileName: {
    fontSize: 11,
  },

  mediaFileNameMine: {
    color: "rgba(255,255,255,0.78)",
  },

  mediaFileNameOther: {
    color: "#81728D",
  },

  openIcon: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 8,
  },

  messageMeta: {
    marginTop: 7,
    minHeight: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  messageTime: {
    fontSize: 10,
    fontWeight: "500",
  },

  messageTimeMine: {
    color: "rgba(255,255,255,0.72)",
  },

  messageTimeOther: {
    color: "#9B8DA4",
  },

  readStatus: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "800",
  },

  readStatusRead: {
    color: "#A9E7FF",
  },

  readStatusUnread: {
    color: "rgba(255,255,255,0.72)",
  },
});
