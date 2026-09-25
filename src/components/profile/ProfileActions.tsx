import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ProfileActionsProps = {
  onLogout?: () => void;
};

export default function ProfileActions({ onLogout }: ProfileActionsProps) {
  const anaSayfayaGit = () => {
    router.push("/home");
  };

  const profiliDuzenle = () => {
    router.push("/profile/edit");
  };

  const cikisYap = () => {
    Alert.alert(
      "Çıkış Yap",
      "Oturumunuzu kapatmak istediğinize emin misiniz?",
      [
        {
          text: "Vazgeç",
          style: "cancel",
        },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "token",
              "userId",
              "username",
              "role",
            ]);

            if (onLogout) {
              onLogout();
            } else {
              router.replace("/");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={anaSayfayaGit}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>🏠 Ana Sayfa</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={profiliDuzenle}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>✏️ Profili Düzenle</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={cikisYap}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪 Çıkış Yap</Text>
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
