import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import {
  diliBelirle,
  profilSorusunuCevir,
} from "../../utils/profilSoruCevirisi";

type EnumSecenegi = {
  kod: number | string;
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
  const { t, i18n } = useTranslation("myProfile");

  const dil = diliBelirle(i18n.resolvedLanguage || i18n.language || "tr");

  const metniCevir = (metin: string | number | null | undefined): string => {
    if (metin === null || metin === undefined) {
      return "-";
    }

    const deger = String(metin).trim();

    if (!deger) {
      return "-";
    }

    return profilSorusunuCevir(deger, dil);
  };

  const aciklamaGetir = (
    liste: EnumSecenegi[],
    kod: string | number | null | undefined,
  ): string => {
    if (kod === null || kod === undefined || String(kod).trim() === "") {
      return "-";
    }

    const arananKod = String(kod).trim();

    const bulunan = liste.find((item) => String(item.kod).trim() === arananKod);

    if (bulunan) {
      return metniCevir(bulunan.aciklama);
    }

    return metniCevir(arananKod);
  };

  const ilgiAlanlariniGetir = (): string => {
    if (
      profile.interests === null ||
      profile.interests === undefined ||
      String(profile.interests).trim() === ""
    ) {
      return "-";
    }

    const hamDeger = String(profile.interests).trim();

    let degerler: string[];

    try {
      if (hamDeger.startsWith("[")) {
        const jsonDeger = JSON.parse(hamDeger);

        degerler = Array.isArray(jsonDeger)
          ? jsonDeger.map((item) => String(item).trim())
          : [hamDeger];
      } else {
        degerler = hamDeger
          .split(/[,|;]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      degerler = hamDeger
        .split(/[,|;]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const cevrilmis = degerler.map((deger) => {
      const bulunan = ilgiAlanlari.find(
        (item) => String(item.kod).trim() === deger,
      );

      return bulunan ? metniCevir(bulunan.aciklama) : metniCevir(deger);
    });

    return cevrilmis.join(", ");
  };

  const bilgiler = [
    {
      etiket: t("profileInfo.profession"),
      deger: aciklamaGetir(meslekler, profile.profession),
      ikon: "✧",
    },
    {
      etiket: t("profileInfo.education"),
      deger: aciklamaGetir(egitimler, profile.education),
      ikon: "◇",
    },
    {
      etiket: t("profileInfo.height"),
      deger: profile.height
        ? `${profile.height} ${t("profileInfo.centimeter")}`
        : "-",
      ikon: "↕",
    },
    {
      etiket: t("profileInfo.weight"),
      deger: profile.weight
        ? `${profile.weight} ${t("profileInfo.kilogram")}`
        : "-",
      ikon: "◉",
    },
    {
      etiket: t("profileInfo.maritalStatus"),
      deger: aciklamaGetir(medeniDurumlar, profile.maritalStatus),
      ikon: "♡",
    },
    {
      etiket: t("profileInfo.religion"),
      deger: aciklamaGetir(mezhepler, profile.religion),
      ikon: "✥",
    },
    {
      etiket: t("profileInfo.interests"),
      deger: ilgiAlanlariniGetir(),
      ikon: "☆",
    },
    {
      etiket: t("profileInfo.verificationStatus"),
      deger: profile.profileVerified
        ? t("profileInfo.verified")
        : t("profileInfo.notVerified"),
      ikon: "✓",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("profileInfo.title")}</Text>

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
