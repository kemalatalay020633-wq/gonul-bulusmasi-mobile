import { useTranslation } from "react-i18next";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ExploreScreen() {
  const { t } = useTranslation();

  const dokumaniAc = () => {
    Linking.openURL("https://docs.expo.dev").catch(() => {
      console.warn("Dokümantasyon bağlantısı açılamadı.");
    });
  };

  const bolumler = [
    {
      baslik: t("explore.sections.routing.title"),
      aciklama: t("explore.sections.routing.description"),
      detay: t("explore.sections.routing.layoutDescription"),
      ekBilgi: t("explore.sections.routing.layoutEnd"),
      ikon: "🧭",
    },
    {
      baslik: t("explore.sections.platforms.title"),
      aciklama: t("explore.sections.platforms.description"),
      detay: t("explore.sections.platforms.descriptionEnd"),
      ikon: "📱",
    },
    {
      baslik: t("explore.sections.images.title"),
      aciklama: t("explore.sections.images.description"),
      detay: t("explore.sections.images.descriptionEnd"),
      ikon: "🖼️",
    },
    {
      baslik: t("explore.sections.themes.title"),
      aciklama: t("explore.sections.themes.description"),
      detay: t("explore.sections.themes.descriptionEnd"),
      ikon: "🎨",
    },
    {
      baslik: t("explore.sections.animations.title"),
      aciklama: t("explore.sections.animations.description"),
      detay: t("explore.sections.animations.descriptionEnd"),
      ikon: "✨",
    },
  ];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌍</Text>

          <Text style={styles.title}>{t("explore.title")}</Text>

          <Text style={styles.description}>{t("explore.description")}</Text>

          <Pressable
            onPress={dokumaniAc}
            style={({ pressed }) => [
              styles.documentButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.documentButtonText}>
              {t("explore.expoDocumentation")} ↗
            </Text>
          </Pressable>
        </View>

        <View style={styles.sections}>
          {bolumler.map((bolum, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{bolum.ikon}</Text>

                <Text style={styles.cardTitle}>{bolum.baslik}</Text>
              </View>

              <Text style={styles.cardDescription}>{bolum.aciklama}</Text>

              <Text style={styles.cardDetail}>{bolum.detay}</Text>

              {"ekBilgi" in bolum && bolum.ekBilgi ? (
                <Text style={styles.cardDetail}>{bolum.ekBilgi}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Gönül Buluşması</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
  },

  container: {
    width: "100%",
    maxWidth: 700,
    paddingHorizontal: 18,
  },

  header: {
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 35 : 25,
    paddingBottom: 28,
  },

  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#263653",
    textAlign: "center",
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    color: "#68758B",
    textAlign: "center",
    lineHeight: 23,
  },

  documentButton: {
    backgroundColor: "#5268D8",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  documentButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.7,
  },

  sections: {
    gap: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECF3",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  cardIcon: {
    fontSize: 25,
  },

  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#263653",
  },

  cardDescription: {
    fontSize: 14,
    color: "#46536A",
    lineHeight: 22,
    marginBottom: 8,
  },

  cardDetail: {
    fontSize: 13,
    color: "#778398",
    lineHeight: 21,
    marginTop: 5,
  },

  footer: {
    textAlign: "center",
    color: "#8994A7",
    fontSize: 13,
    marginTop: 28,
    marginBottom: 15,
  },
});
