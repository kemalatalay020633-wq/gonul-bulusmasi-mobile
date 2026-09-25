import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function ProfileLoading() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#7c3aed" />

        <Text style={styles.text}>Profil yükleniyor...</Text>
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
    maxWidth: 450,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ede9fe",
    shadowColor: "#5b21b6",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },

  text: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#4c1d95",
    textAlign: "center",
  },
});
