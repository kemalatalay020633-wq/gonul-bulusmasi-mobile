import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
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

  const medyaGoster = (media: MessageMediaDto) => {
    const url = getMediaUrl(media.mediaUrl);

    /*
     * FOTOĞRAF
     */
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

    /*
     * VİDEO
     */
    if (media.type === "VIDEO" || media.mimeType?.startsWith("video/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaButton}
          onPress={() => Linking.openURL(url)}
        >
          <Text style={styles.mediaIcon}>🎬</Text>

          <View style={styles.mediaTextContainer}>
            <Text style={styles.mediaTitle}>Video</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Videoyu aç"}
            </Text>
          </View>

          <Text style={styles.openIcon}>▶</Text>
        </Pressable>
      );
    }

    /*
     * SES
     */
    if (media.type === "AUDIO" || media.mimeType?.startsWith("audio/")) {
      return (
        <Pressable
          key={media.id}
          style={styles.mediaButton}
          onPress={() => Linking.openURL(url)}
        >
          <Text style={styles.mediaIcon}>🎵</Text>

          <View style={styles.mediaTextContainer}>
            <Text style={styles.mediaTitle}>Ses</Text>

            <Text style={styles.mediaFileName} numberOfLines={1}>
              {media.fileName || "Ses dosyasını aç"}
            </Text>
          </View>

          <Text style={styles.openIcon}>▶</Text>
        </Pressable>
      );
    }

    /*
     * DOSYA
     */
    return (
      <Pressable
        key={media.id}
        style={styles.mediaButton}
        onPress={() => Linking.openURL(url)}
      >
        <Text style={styles.mediaIcon}>📎</Text>

        <View style={styles.mediaTextContainer}>
          <Text style={styles.mediaTitle}>Dosya</Text>

          <Text style={styles.mediaFileName} numberOfLines={1}>
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
          <Text
            style={[
              styles.messageContent,
              isMine ? styles.messageContentMine : styles.messageContentOther,
            ]}
          >
            {message.content}
          </Text>
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
    marginVertical: 4,
  },

  messageItemMine: {
    alignItems: "flex-end",
  },

  messageItemOther: {
    alignItems: "flex-start",
  },

  senderName: {
    color: "#6b5ca5",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
    marginBottom: 3,
  },

  messageBubble: {
    maxWidth: "82%",
    minWidth: 40,
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: "#eeeaff",
  },

  messageContent: {
    fontSize: 14,
    lineHeight: 21,
  },

  messageContentMine: {
    color: "#ffffff",
  },

  messageContentOther: {
    color: "#333333",
  },

  mediaList: {
    width: "100%",
  },

  mediaListWithText: {
    marginTop: 6,
  },

  mediaListWithoutText: {
    marginTop: 0,
  },

  imageContainer: {
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eeeeee",
  },

  image: {
    width: 240,
    height: 260,
  },

  mediaButton: {
    minHeight: 58,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  mediaIcon: {
    fontSize: 24,
    marginRight: 9,
  },

  mediaTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  mediaTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },

  mediaFileName: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
  },

  openIcon: {
    color: "#ffffff",
    fontSize: 16,
    marginLeft: 8,
  },

  messageMeta: {
    marginTop: 5,
    minHeight: 16,
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
    fontWeight: "700",
  },

  readStatusRead: {
    color: "#8fd6ff",
  },

  readStatusUnread: {
    color: "rgba(255,255,255,0.70)",
  },
});
