import React from "react";
import { StyleSheet, Text, View } from "react-native";

type UserProfile = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string | null;
  profilePhoto: string | null;
  city: string | null;
  active: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserInfoProps = {
  user: UserProfile;
};

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hesap Bilgilerim</Text>

      <View style={styles.card}>
        <BilgiSatiri etiket="Kullanıcı Adı" deger={user.username} />

        <BilgiSatiri etiket="E-posta" deger={user.email} />

        <BilgiSatiri
          etiket="Ad Soyad"
          deger={`${user.firstName} ${user.lastName}`}
        />

        <BilgiSatiri etiket="Doğum Tarihi" deger={user.birthDate || "-"} />

        <BilgiSatiri etiket="Telefon" deger={user.phoneNumber || "-"} />

        <BilgiSatiri etiket="Şehir" deger={user.city || "-"} />

        <BilgiSatiri
          etiket="Hesap Durumu"
          deger={user.active ? "Aktif" : "Pasif"}
        />

        <BilgiSatiri
          etiket="E-posta Durumu"
          deger={user.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
        />

        <BilgiSatiri
          etiket="Telefon Durumu"
          deger={user.phoneVerified ? "Doğrulandı" : "Doğrulanmadı"}
          son
        />
      </View>
    </View>
  );
}

type BilgiSatiriProps = {
  etiket: string;
  deger: string;
  son?: boolean;
};

function BilgiSatiri({ etiket, deger, son = false }: BilgiSatiriProps) {
  return (
    <View style={[styles.row, !son && styles.rowBorder]}>
      <Text style={styles.label}>{etiket}</Text>

      <Text style={styles.value}>{deger}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5b21b6",
    marginBottom: 12,
  },

  card: {
    width: "100%",
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  row: {
    width: "100%",
    minHeight: 48,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#ede9fe",
  },

  label: {
    width: 120,
    fontSize: 14,
    fontWeight: "700",
    color: "#5b21b6",
  },

  value: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#374151",
  },
});
