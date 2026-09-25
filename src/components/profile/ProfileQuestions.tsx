import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QuestionItem from "./QuestionItem";

type Question = {
  id: number;
  question: string;
  category: string | null;
  type: string | null;
  required: boolean;
  active: boolean;
  options: string | null;
};

type ProfileQuestionsProps = {
  questions: Question[];
  answers: Record<number, string[]>;
  saving: boolean;
  error: string;
  onRadioChange: (questionId: number, value: string) => void;
  onCheckboxChange: (questionId: number, value: string) => void;
  onSave: () => void;
};

export default function ProfileQuestions({
  questions,
  answers,
  saving,
  error,
  onRadioChange,
  onCheckboxChange,
  onSave,
}: ProfileQuestionsProps) {
  const categories = useMemo(() => {
    return Array.from(
      new Set(questions.map((question) => question.category || "GENEL")),
    );
  }, [questions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Soruları</Text>

      <Text style={styles.description}>
        Size uygun seçenekleri işaretleyerek profilinizi tamamlayın.
      </Text>

      {categories.map((category) => {
        const categoryQuestions = questions.filter(
          (question) => (question.category || "GENEL") === category,
        );

        return (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>

            {categoryQuestions.map((question) => (
              <QuestionItem
                key={question.id}
                question={question}
                selected={answers[question.id] || []}
                onRadioChange={onRadioChange}
                onCheckboxChange={onCheckboxChange}
              />
            ))}
          </View>
        );
      })}

      {questions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aktif profil sorusu bulunmuyor.</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        disabled={saving}
        onPress={onSave}
        activeOpacity={0.8}
      >
        {saving ? (
          <>
            <ActivityIndicator size="small" color="#ffffff" />

            <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
          </>
        ) : (
          <Text style={styles.saveButtonText}>Profil Cevaplarını Kaydet</Text>
        )}
      </TouchableOpacity>
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
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
    marginBottom: 18,
  },

  categoryContainer: {
    width: "100%",
    marginBottom: 16,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6d28d9",
    marginBottom: 10,
  },

  emptyContainer: {
    width: "100%",
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  errorContainer: {
    width: "100%",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#b91c1c",
    textAlign: "center",
  },

  saveButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
