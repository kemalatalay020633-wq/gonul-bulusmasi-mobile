import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { tokenSil } from "../../services/tokenServisi";
type ProfileActionsProps = {
  onLogout?: () => void;
};

export default function ProfileActions({ onLogout }: ProfileActionsProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation("myProfile");

  const anaSayfayaGit = () => {
    navigation.navigate("home");
  };

  const profiliDuzenle = () => {
    navigation.navigate("profileEdit");
  };

  const cikisYap = () => {
    Alert.alert(t("actions.logoutTitle"), t("actions.logoutConfirm"), [
      {
        text: t("actions.cancel"),
        style: "cancel",
      },
      {
        text: t("actions.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await Promise.all([
              tokenSil(),
              AsyncStorage.multiRemove(["userId", "username", "role"]),
            ]);

            if (onLogout) {
              onLogout();
            } else {
              navigation.replace("index");
            }
          } catch (hata) {
            console.error("PROFİL ÇIKIŞ HATASI:", hata);

            Alert.alert(
              t("actions.logoutTitle"),
              "Oturum kapatılırken bir hata oluştu.",
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={anaSayfayaGit}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>🏠 {t("actions.home")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={profiliDuzenle}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>✏️ {t("actions.editProfile")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={cikisYap}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪 {t("actions.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },

  button: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DC2626",
  },

  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700",
  },
});
