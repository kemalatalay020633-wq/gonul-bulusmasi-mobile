import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MessagesHeaderProps = {
  selectedUserId?: number | null;
  selectedUserName?: string;
  selectedUserActive?: boolean | null;
  yeniMesajSayisi?: number;
  onBack?: () => void;
};

export default function MessagesHeader({
  selectedUserId = null,
  selectedUserName = "",
  selectedUserActive = null,
  yeniMesajSayisi = 0,
  onBack,
}: MessagesHeaderProps) {
  const kullaniciSecili = selectedUserId !== null;

  return (
    <View style={styles.container}>
      <View style={styles.leftArea}>
        {onBack ? (
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            android_ripple={{ color: "rgba(91,60,196,0.12)" }}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        ) : null}

        <View style={styles.titleArea}>
          <Text style={styles.title}>Mesajlar</Text>

          {kullaniciSecili && selectedUserName ? (
            <View style={styles.selectedUserRow}>
              <View
                style={[
                  styles.statusDot,
                  selectedUserActive === true
                    ? styles.onlineDot
                    : styles.offlineDot,
                ]}
              />

              <Text style={styles.selectedUserName} numberOfLines={1}>
                {selectedUserName}
              </Text>

              {selectedUserActive !== null ? (
                <Text
                  style={[
                    styles.statusText,
                    selectedUserActive ? styles.onlineText : styles.offlineText,
                  ]}
                >
                  {selectedUserActive ? "Çevrimiçi" : "Çevrimdışı"}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.subtitle}>Konuşmalarınız</Text>
          )}
        </View>
      </View>

      <View style={styles.rightArea}>
        {yeniMesajSayisi > 0 ? (
          <View style={styles.notification}>
            <Text style={styles.notificationIcon}>🔔</Text>

            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>
                {yeniMesajSayisi > 99 ? "99+" : yeniMesajSayisi}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFCFA",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeaff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  leftArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#f5f1ff",
  },

  backIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: "#5b3cc4",
    fontWeight: "700",
  },

  titleArea: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#24164f",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#77718a",
    fontWeight: "500",
  },

  selectedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minWidth: 0,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  onlineDot: {
    backgroundColor: "#35B779",
  },

  offlineDot: {
    backgroundColor: "#A88F95",
  },

  selectedUserName: {
    flexShrink: 1,
    maxWidth: 150,
    fontSize: 12,
    color: "#4b4164",
    fontWeight: "700",
  },

  statusText: {
    marginLeft: 7,
    fontSize: 10,
    fontWeight: "700",
  },

  onlineText: {
    color: "#277A54",
  },

  offlineText: {
    color: "#80666D",
  },

  rightArea: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  notification: {
    minWidth: 42,
    height: 38,
    paddingHorizontal: 7,
    borderRadius: 19,
    backgroundColor: "#f5f1ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationIcon: {
    fontSize: 17,
  },

  notificationBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    marginLeft: 3,
    borderRadius: 10,
    backgroundColor: "#B72F4B",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationText: {
    color: "#FFFCFA",
    fontSize: 9,
    fontWeight: "800",
  },
});
