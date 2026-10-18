import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileErrorProps = {
  error: string;
  onHome: () => void;
};

export default function ProfileError({ error, onHome }: ProfileErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        <Text style={styles.title}>Profil Yüklenemedi</Text>

        <Text style={styles.errorText}>
          {error || "Profil bilgileri alınırken bir hata oluştu."}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onHome}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>🏠 Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    backgroundColor: "#faf5ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFCFA",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F5DCE3",
    shadowColor: "#7A263C",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },

  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FCE8EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  icon: {
    fontSize: 34,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#672036",
    textAlign: "center",
    marginBottom: 12,
  },

  errorText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#80666D",
    textAlign: "center",
    marginBottom: 24,
  },

  button: {
    width: "100%",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#8F2942",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  buttonText: {
    color: "#FFFCFA",
    fontSize: 16,
    fontWeight: "700",
  },
});
