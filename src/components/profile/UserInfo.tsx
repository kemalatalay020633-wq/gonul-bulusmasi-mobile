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
          deger={`${user.firstName} ${user.lastName}`.trim()}
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
      <Text style={styles.value}>{deger || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#F4C45B",
    marginBottom: 11,
  },
  card: {
    width: "100%",
    backgroundColor: "#410052",
    borderWidth: 1,
    borderColor: "#8E4B9E",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  row: {
    width: "100%",
    minHeight: 43,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#704078",
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#E8C8F0",
  },
  value: {
    flex: 1.25,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
