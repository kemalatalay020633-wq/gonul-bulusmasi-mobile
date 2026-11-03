import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import KimlikDogrulamaliAvatar from "../../components/common/KimlikDogrulamaliAvatar";
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
    if (!tarih) return "";

    const tarihNesnesi = new Date(tarih);

    if (Number.isNaN(tarihNesnesi.getTime())) {
      return tarih;
    }

    const simdi = new Date();

    const ayniGun =
      tarihNesnesi.getDate() === simdi.getDate() &&
      tarihNesnesi.getMonth() === simdi.getMonth() &&
      tarihNesnesi.getFullYear() === simdi.getFullYear();

    if (ayniGun) {
      return tarihNesnesi.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return tarihNesnesi.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
    });
  };

  const renderConversation = ({ item }: { item: ConversationUser }) => {
    const aktif = getUserActive(item.userId);
    const secili = selectedUserId === item.userId;
    const kullaniciAdi = getUserDisplayName(item.userId);

    const sonMesaj = item.lastMessage?.content?.trim() || "📎 Medya mesajı";

    const avatarHarf =
      kullaniciAdi && kullaniciAdi.length > 0
        ? kullaniciAdi.charAt(0).toLocaleUpperCase("tr-TR")
        : "?";

    return (
      <Pressable
        style={[
          styles.conversationItem,
          secili && styles.conversationItemSelected,
        ]}
        onPress={() => onSelectUser(item.userId)}
        android_ripple={{ color: "#F4E4C1" }}
      >
        {/* PROFİL FOTOĞRAFI */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, secili && styles.avatarSelected]}>
            <KimlikDogrulamaliAvatar
              kullaniciId={item.userId}
              boyut={56}
              altYazi={userInfoLoading ? "…" : avatarHarf}
              imageStyle={styles.avatarImage}
            />
          </View>

          {/* ÇEVRİMİÇİ GÖSTERGESİ */}
          {aktif === true ? <View style={styles.avatarOnlineDot} /> : null}
        </View>

        {/* KONUŞMA BİLGİLERİ */}
        <View style={styles.conversationContent}>
          <View style={styles.topLine}>
            <Text
              style={[styles.name, secili && styles.nameSelected]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {userInfoLoading ? "Yükleniyor..." : kullaniciAdi}
            </Text>

            <Text
              style={[styles.date, secili && styles.dateSelected]}
              numberOfLines={1}
            >
              {tarihFormatla(item.lastMessage?.sentAt)}
            </Text>
          </View>

          <View style={styles.bottomLine}>
            <View style={styles.messageInfo}>
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

              <Text
                style={[
                  styles.lastMessage,
                  secili && styles.lastMessageSelected,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {sonMesaj}
              </Text>
            </View>

            <Text style={[styles.arrow, secili && styles.arrowSelected]}>
              ›
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>♡</Text>
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
          removeClippedSubviews={false}
        />
      )}
    </View>
  );
}

export default ConversationList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFF9F0",
  },

  listContent: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  conversationItem: {
    width: "100%",
    minHeight: 88,
    marginBottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFEFC",
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "#D6AD58",
    shadowColor: "#9A7026",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 3,
  },

  conversationItemSelected: {
    backgroundColor: "#FFF5DF",
    borderWidth: 1.8,
    borderColor: "#B8862D",
    shadowOpacity: 0.2,
    elevation: 4,
  },

  avatarWrapper: {
    width: 60,
    height: 60,
    marginRight: 13,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EBD2",
    borderWidth: 2,
    borderColor: "#D4A84F",
    padding: 2,
  },

  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  avatarSelected: {
    borderColor: "#A97920",
    borderWidth: 2.5,
  },

  avatarOnlineDot: {
    position: "absolute",
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#35A978",
    borderWidth: 2,
    borderColor: "#FFFEFC",
  },

  conversationContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0,
  },

  name: {
    flex: 1,
    minWidth: 0,
    color: "#42152F",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    marginRight: 8,
  },

  nameSelected: {
    color: "#7A1D43",
  },

  date: {
    color: "#92774C",
    fontSize: 10,
    fontWeight: "700",
  },

  dateSelected: {
    color: "#A77820",
  },

  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  messageInfo: {
    flex: 1,
    minWidth: 0,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  activeDot: {
    backgroundColor: "#35A978",
  },

  inactiveDot: {
    backgroundColor: "#B9A88C",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },

  activeText: {
    color: "#279B70",
  },

  inactiveText: {
    color: "#917F70",
  },

  lastMessage: {
    color: "#81716C",
    fontSize: 12,
    lineHeight: 18,
    paddingRight: 5,
  },

  lastMessageSelected: {
    color: "#71334B",
    fontWeight: "600",
  },

  arrow: {
    color: "#C3973F",
    fontSize: 29,
    fontWeight: "400",
    marginLeft: 7,
    width: 16,
    textAlign: "center",
  },

  arrowSelected: {
    color: "#95651A",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3D9",
    borderWidth: 1.8,
    borderColor: "#D6AD58",
    marginBottom: 18,
  },

  emptyIcon: {
    color: "#A97920",
    fontSize: 45,
    lineHeight: 50,
  },

  emptyTitle: {
    color: "#42152F",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 9,
  },

  emptyText: {
    color: "#917F70",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
});
