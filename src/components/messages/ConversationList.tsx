import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { MessageDto } from "../../types/message";

type ConversationUser = {
  userId: number;
  lastMessage: MessageDto;
};

type ConversationListProps = {
  users: ConversationUser[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
  getUserDisplayName: (userId: number) => string;
  getUserActive: (userId: number) => boolean | null;
  userInfoLoading?: boolean;
};

function ConversationList({
  users,
  selectedUserId,
  onSelectUser,
  getUserDisplayName,
  getUserActive,
  userInfoLoading = false,
}: ConversationListProps) {
  const tarihFormatla = (tarih?: string) => {
    if (!tarih) {
      return "";
    }

    const tarihNesnesi = new Date(tarih);

    if (Number.isNaN(tarihNesnesi.getTime())) {
      return tarih;
    }

    return tarihNesnesi.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderConversation = ({ item }: { item: ConversationUser }) => {
    const aktif = getUserActive(item.userId);

    const secili = selectedUserId === item.userId;

    const kullaniciAdi = getUserDisplayName(item.userId);

    const sonMesaj = item.lastMessage?.content?.trim() || "Medya mesajı";

    const avatarHarf =
      kullaniciAdi && kullaniciAdi.length > 0
        ? kullaniciAdi.charAt(0).toUpperCase()
        : "?";

    return (
      <Pressable
        style={[
          styles.conversationItem,
          secili && styles.conversationItemSelected,
        ]}
        onPress={() => onSelectUser(item.userId)}
        android_ripple={{
          color: "#eeeaff",
        }}
      >
        {/* AVATAR */}
        <View style={[styles.avatar, secili && styles.avatarSelected]}>
          <Text
            style={[styles.avatarText, secili && styles.avatarTextSelected]}
          >
            {userInfoLoading ? "?" : avatarHarf}
          </Text>
        </View>

        {/* ANA İÇERİK */}
        <View style={styles.conversationContent}>
          {/* İSİM */}
          <Text
            style={[styles.name, secili && styles.nameSelected]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userInfoLoading ? "Yükleniyor..." : kullaniciAdi}
          </Text>

          {/* DURUM */}
          {aktif !== null ? (
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  aktif ? styles.activeDot : styles.inactiveDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  aktif ? styles.activeText : styles.inactiveText,
                ]}
                numberOfLines={1}
              >
                {aktif ? "Çevrimiçi" : "Çevrimdışı"}
              </Text>
            </View>
          ) : null}

          {/* SON MESAJ */}
          <Text
            style={[styles.lastMessage, secili && styles.lastMessageSelected]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {sonMesaj}
          </Text>

          {/* TARİH */}
          <Text
            style={[styles.date, secili && styles.dateSelected]}
            numberOfLines={1}
          >
            {tarihFormatla(item.lastMessage?.sentAt)}
          </Text>
        </View>

        {/* SAĞ OK */}
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
          </View>

          <Text style={styles.emptyTitle}>Henüz mesajınız yok</Text>

          <Text style={styles.emptyText}>
            Bir kullanıcıyla mesajlaşmaya başladığınızda konuşmalarınız burada
            görünecek.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

export default ConversationList;

const styles = StyleSheet.create({
  /*
   * ANA CONTAINER
   */
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#faf9ff",
  },

  /*
   * LİSTE
   */
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },

  /*
   * KONUŞMA KARTI
   */
  conversationItem: {
    width: "100%",
    minHeight: 92,

    paddingHorizontal: 16,
    paddingVertical: 12,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#ffffff",

    borderBottomWidth: 1,
    borderBottomColor: "#eeeaf8",
  },

  /*
   * SEÇİLİ KONUŞMA
   */
  conversationItemSelected: {
    backgroundColor: "#f0ecff",

    borderLeftWidth: 4,
    borderLeftColor: "#5b3cc4",

    paddingLeft: 12,
  },

  /*
   * AVATAR
   */
  avatar: {
    width: 58,
    height: 58,

    borderRadius: 29,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,

    backgroundColor: "#eeeaff",
  },

  avatarSelected: {
    backgroundColor: "#5b3cc4",
  },

  avatarText: {
    color: "#5b3cc4",
    fontSize: 21,
    fontWeight: "800",
  },

  avatarTextSelected: {
    color: "#ffffff",
  },

  /*
   * KONUŞMA İÇERİĞİ
   */
  conversationContent: {
    flex: 1,
    minWidth: 0,

    justifyContent: "center",
  },

  /*
   * KULLANICI ADI
   */
  name: {
    color: "#29252f",

    fontSize: 17,
    lineHeight: 22,

    fontWeight: "800",

    marginBottom: 3,
  },

  nameSelected: {
    color: "#4d35a8",
  },

  /*
   * DURUM
   */
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 3,
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
    fontWeight: "600",
  },

  activeText: {
    color: "#218838",
  },

  inactiveText: {
    color: "#888888",
  },

  /*
   * SON MESAJ
   */
  lastMessage: {
    color: "#707070",

    fontSize: 14,
    lineHeight: 19,

    marginTop: 1,

    paddingRight: 4,
  },

  lastMessageSelected: {
    color: "#5b3cc4",
    fontWeight: "600",
  },

  /*
   * TARİH
   */
  date: {
    color: "#999999",

    fontSize: 10,

    marginTop: 4,
  },

  dateSelected: {
    color: "#7b61c9",
  },

  /*
   * SAĞ OK
   */
  arrow: {
    color: "#aaa3bd",

    fontSize: 30,
    fontWeight: "300",

    marginLeft: 8,

    width: 20,

    textAlign: "center",
  },

  /*
   * BOŞ LİSTE
   */
  emptyContainer: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 35,
  },

  emptyIconContainer: {
    width: 78,
    height: 78,

    borderRadius: 39,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#eeeaff",

    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
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
  },
});
