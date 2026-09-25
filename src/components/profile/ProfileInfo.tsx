import React from "react";
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
  ilgiAlanlari = [],
}: ProfileInfoProps) {
  const aciklamaGetir = (
    liste: EnumSecenegi[],
    kod: string | number | null | undefined,
  ): string => {
    if (kod === null || kod === undefined || String(kod).trim() === "") {
      return "-";
    }

    const bulunan = liste.find((item) => Number(item.kod) === Number(kod));

    return bulunan?.aciklama ?? "-";
  };

  const ilgiAlanlariniGetir = (): string => {
    if (
      profile.interests === null ||
      profile.interests === undefined ||
      String(profile.interests).trim() === ""
    ) {
      return "-";
    }

    const deger = String(profile.interests);

    const parcalar = deger
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parcalar.length === 0) {
      return "-";
    }

    const aciklamalar = parcalar.map((item) => {
      const bulunan = ilgiAlanlari.find(
        (alan) => Number(alan.kod) === Number(item),
      );

      return bulunan?.aciklama ?? item;
    });

    return aciklamalar.join(", ");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Bilgilerim</Text>

      <View style={styles.card}>
        <BilgiSatiri etiket="Hakkımda" deger={profile.about || "-"} />

        <BilgiSatiri
          etiket="Meslek"
          deger={aciklamaGetir(meslekler, profile.profession)}
        />

        <BilgiSatiri
          etiket="Eğitim"
          deger={aciklamaGetir(egitimler, profile.education)}
        />

        <BilgiSatiri
          etiket="Boy"
          deger={profile.height ? `${profile.height} cm` : "-"}
        />

        <BilgiSatiri
          etiket="Kilo"
          deger={profile.weight ? `${profile.weight} kg` : "-"}
        />

        <BilgiSatiri
          etiket="Medeni Durum"
          deger={aciklamaGetir(medeniDurumlar, profile.maritalStatus)}
        />

        <BilgiSatiri
          etiket="Din"
          deger={aciklamaGetir(mezhepler, profile.religion)}
        />

        <BilgiSatiri etiket="İlgi Alanları" deger={ilgiAlanlariniGetir()} />

        <BilgiSatiri
          etiket="Profil Durumu"
          deger={profile.profileVerified ? "Doğrulanmış" : "Doğrulanmamış"}
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
    width: 115,
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
