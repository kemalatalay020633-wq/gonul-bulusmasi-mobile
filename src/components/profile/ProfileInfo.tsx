import { StyleSheet, Text, View } from "react-native";

type EnumSecenegi = {
  kod: number;
  aciklama: string;
};

type ProfileInfoData = {
  id: number;
  userId: number;
  about: string | null;
  profession: string | number | null;
  education: string | number | null;
  height: number | null;
  weight: number | null;
  maritalStatus: string | number | null;
  religion: string | number | null;
  interests: string | number | null;
  profilePhoto: string | null;
  profileVerified: boolean;
};

type ProfileInfoProps = {
  profile: ProfileInfoData;
  meslekler?: EnumSecenegi[];
  egitimler?: EnumSecenegi[];
  medeniDurumlar?: EnumSecenegi[];
  mezhepler?: EnumSecenegi[];
  ilgiAlanlari?: EnumSecenegi[];
};

export default function ProfileInfo({
  profile,
  meslekler = [],
  egitimler = [],
  medeniDurumlar = [],
  mezhepler = [],
}: ProfileInfoProps) {
  const aciklamaGetir = (
    liste: EnumSecenegi[],
    kod: string | number | null | undefined,
  ): string => {
    if (kod === null || kod === undefined || String(kod).trim() === "") {
      return "-";
    }

    const bulunan = liste.find((item) => Number(item.kod) === Number(kod));
    return bulunan?.aciklama ?? String(kod);
  };

  const bilgiler = [
    {
      etiket: "Meslek",
      deger: aciklamaGetir(meslekler, profile.profession),
      ikon: "✧",
    },
    {
      etiket: "Eğitim",
      deger: aciklamaGetir(egitimler, profile.education),
      ikon: "◇",
    },
    {
      etiket: "Boy",
      deger: profile.height ? `${profile.height} cm` : "-",
      ikon: "↕",
    },
    {
      etiket: "Kilo",
      deger: profile.weight ? `${profile.weight} kg` : "-",
      ikon: "◉",
    },
    {
      etiket: "Medeni Durum",
      deger: aciklamaGetir(medeniDurumlar, profile.maritalStatus),
      ikon: "♡",
    },
    {
      etiket: "Mezhep",
      deger: aciklamaGetir(mezhepler, profile.religion),
      ikon: "✥",
    },
    {
      etiket: "Profil Durumu",
      deger: profile.profileVerified ? "Doğrulanmış" : "Doğrulanmamış",
      ikon: "✓",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Bilgilerim</Text>
      <View style={styles.card}>
        {bilgiler.map((bilgi, index) => (
          <View
            key={`${bilgi.etiket}-${index}`}
            style={[
              styles.item,
              index % 2 === 0 ? styles.itemLeft : styles.itemRight,
            ]}
          >
            <Text style={styles.icon}>{bilgi.ikon}</Text>
            <View style={styles.itemText}>
              <Text style={styles.label}>{bilgi.etiket}</Text>
              <Text style={styles.value}>{bilgi.deger}</Text>
            </View>
          </View>
        ))}
      </View>
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    width: "50%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#704078",
  },
  itemLeft: {
    borderRightWidth: 1,
    borderRightColor: "#F4C45B",
    paddingRight: 9,
  },
  itemRight: {
    paddingLeft: 10,
  },
  icon: {
    width: 24,
    textAlign: "center",
    color: "#F4C45B",
    fontSize: 21,
    fontWeight: "900",
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: "#E8C8F0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
