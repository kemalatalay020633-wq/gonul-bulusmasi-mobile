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
            android_ripple={{
              color: "rgba(214,173,88,0.2)",
              borderless: true,
            }}
            hitSlop={6}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : null}

        <View style={styles.titleArea}>
          <Text style={styles.eyebrow}>
            {kullaniciSecili ? "GÖNÜL BULUŞMASI" : "SOHBETLERİN"}
          </Text>

          <Text style={styles.title} numberOfLines={1}>
            {kullaniciSecili && selectedUserName
              ? selectedUserName
              : "Mesajlar"}
          </Text>

          {kullaniciSecili ? (
            <View style={styles.selectedUserRow}>
              <View
                style={[
                  styles.statusDot,
                  selectedUserActive === true
                    ? styles.onlineDot
                    : styles.offlineDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  selectedUserActive === true
                    ? styles.onlineText
                    : styles.offlineText,
                ]}
              >
                {selectedUserActive === null
                  ? "Sohbet"
                  : selectedUserActive
                    ? "Çevrimiçi"
                    : "Çevrimdışı"}
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Güzel bir sohbet başlat</Text>
          )}
        </View>
      </View>

      {yeniMesajSayisi > 0 ? (
        <View style={styles.notification}>
          <Text style={styles.notificationIcon}>✉</Text>

          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>
              {yeniMesajSayisi > 99 ? "99+" : yeniMesajSayisi}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.headerMark}>
          <Text style={styles.headerMarkText}>♡</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#43152F",
    borderBottomWidth: 2,
    borderBottomColor: "#D6AD58",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#9A7026",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  },

  leftArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: "rgba(214,173,88,0.12)",
    borderWidth: 1,
    borderColor: "#B99043",
    overflow: "hidden",
  },

  backIcon: {
    fontSize: 34,
    lineHeight: 38,
    marginTop: -4,
    color: "#E5C477",
    fontWeight: "500",
  },

  titleArea: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: "#D9B96F",
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: "800",
    marginBottom: 3,
  },

  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
    color: "#FFF7E8",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#E7D5B5",
    fontWeight: "500",
  },

  selectedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  onlineDot: {
    backgroundColor: "#43C58B",
  },

  offlineDot: {
    backgroundColor: "#B9A88C",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  onlineText: {
    color: "#65D7A3",
  },

  offlineText: {
    color: "#D7C8AD",
  },

  notification: {
    minWidth: 44,
    height: 42,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#54203D",
    borderWidth: 1,
    borderColor: "#D6AD58",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  notificationIcon: {
    color: "#E5C477",
    fontSize: 19,
    fontWeight: "700",
  },

  notificationBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    marginLeft: 4,
    borderRadius: 10,
    backgroundColor: "#D6AD58",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationText: {
    color: "#43152F",
    fontSize: 9,
    fontWeight: "900",
  },

  headerMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#54203D",
    borderWidth: 1.3,
    borderColor: "#D6AD58",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  headerMarkText: {
    color: "#E5C477",
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "500",
  },
});
