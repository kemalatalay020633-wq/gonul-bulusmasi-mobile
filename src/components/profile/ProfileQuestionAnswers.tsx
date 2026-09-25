import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type ProfilSorusu = {
  id: number;
  question: string;
  category?: string | null;
  required?: boolean;
  active?: boolean;
};

type ProfilCevabi = {
  id: number;
  profileId?: number;
  questionId?: number;
  answer: string;
};

type ProfileQuestionAnswersProps = {
  questions: ProfilSorusu[];
  answers: ProfilCevabi[];
  loading?: boolean;
};

export default function ProfileQuestionAnswers({
  questions,
  answers,
  loading = false,
}: ProfileQuestionAnswersProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sorular ve Cevaplar</Text>

        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#7c3aed" />

          <Text style={styles.loadingText}>
            Sorular ve cevaplar yükleniyor...
          </Text>
        </View>
      </View>
    );
  }

  const doluCevaplar = answers.filter(
    (cevap) => typeof cevap.answer === "string" && cevap.answer.trim() !== "",
  );

  if (doluCevaplar.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sorular ve Cevaplar</Text>

        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Henüz profil sorularına cevap verilmemiş.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sorular ve Cevaplar</Text>

      <View style={styles.list}>
        {doluCevaplar.map((cevap) => {
          const soru = questions.find(
            (item) => Number(item.id) === Number(cevap.questionId),
          );

          return (
            <View key={cevap.id} style={styles.answerCard}>
              <Text style={styles.question}>
                {soru?.question || "Profil sorusu"}
              </Text>

              <Text style={styles.answer}>{cevap.answer}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 24,
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5b21b6",
    marginBottom: 14,
  },

  loadingBox: {
    width: "100%",
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },

  list: {
    width: "100%",
    gap: 12,
  },
  emptyBox: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
  },
  answerCard: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
  },

  question: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5b21b6",
    lineHeight: 23,
    marginBottom: 8,
  },

  answer: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 23,
  },
});
