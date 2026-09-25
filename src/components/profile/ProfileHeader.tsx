import React from "react";
import { StyleSheet, Text, View } from "react-native";

type UserProfile = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
};

type ProfileHeaderProps = {
  user: UserProfile | null;
};

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>

        <Text style={styles.name}>Profil</Text>
      </View>
    );
  }

  const adSoyad = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        {user.profilePhoto ? (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>👤</Text>
          </View>
        ) : (
          <Text style={styles.avatarText}>👤</Text>
        )}
      </View>

      <Text style={styles.name}>{adSoyad || "Profil"}</Text>

      <Text style={styles.username}>@{user.username}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ede9fe",
    borderWidth: 3,
    borderColor: "#ddd6fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },

  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
  },

  avatarText: {
    fontSize: 42,
  },

  photoIcon: {
    fontSize: 36,
  },

  name: {
    fontSize: 25,
    fontWeight: "800",
    color: "#4c1d95",
    textAlign: "center",
  },

  username: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "600",
    color: "#7c3aed",
    textAlign: "center",
  },
});
