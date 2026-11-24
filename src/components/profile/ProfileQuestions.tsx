import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { profilSorusunuCevir } from "../../utils/profilSoruCevirisi";
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
  const { t, i18n } = useTranslation("editProfile");

  const dil = i18n.resolvedLanguage || i18n.language || "tr";

  /**
   * Kategori adını yalnızca ekranda gösterirken çevirir.
   * Backend'den gelen kategori değerini değiştirmez.
   */
  const kategoriCevir = (kategori: string | null): string => {
    const kategoriMetni =
      kategori?.trim() || t("profileQuestions.generalCategory");

    return profilSorusunuCevir(kategoriMetni, dil);
  };

  /**
   * Kategorileri orijinal değerleri üzerinden gruplandırır.
   * Böylece farklı kategoriler çeviri sonucunda aynı metne
   * dönüşse bile yanlışlıkla birleştirilmez.
   */
  const categories = useMemo(() => {
    return Array.from(
      new Set(questions.map((question) => question.category?.trim() || "")),
    );
  }, [questions]);

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <Text style={styles.title}>{t("profileQuestions.title")}</Text>

      {/* Açıklama */}
      <Text style={styles.description}>
        {t("profileQuestions.description")}
      </Text>

      {/* Kategori ve sorular */}
      {categories.map((category) => {
        const categoryQuestions = questions.filter(
          (question) => (question.category?.trim() || "") === category,
        );

        return (
          <View
            key={category || "general-category"}
            style={styles.categoryContainer}
          >
            <Text style={styles.categoryTitle}>
              {kategoriCevir(category || null)}
            </Text>

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

      {/* Soru bulunamadığında */}
      {questions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("profileQuestions.empty")}</Text>
        </View>
      )}

      {/* Hata mesajı */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Kaydet butonu */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        disabled={saving}
        onPress={onSave}
        activeOpacity={0.8}
      >
        {saving ? (
          <>
            <ActivityIndicator size="small" color="#FFFCFA" />

            <Text style={styles.saveButtonText}>
              {t("profileQuestions.saving")}
            </Text>
          </>
        ) : (
          <Text style={styles.saveButtonText}>
            {t("profileQuestions.save")}
          </Text>
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
    color: "#7A263C",
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#80666D",
    marginBottom: 18,
  },

  categoryContainer: {
    width: "100%",
    marginBottom: 16,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#A12E4A",
    marginBottom: 10,
  },

  emptyContainer: {
    width: "100%",
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#F5DCE3",
    alignItems: "center",
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 14,
    color: "#80666D",
    textAlign: "center",
  },

  errorContainer: {
    width: "100%",
    backgroundColor: "#FCE8EC",
    borderWidth: 1,
    borderColor: "#EFC1CC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#9B2947",
    textAlign: "center",
  },

  saveButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#8F2942",
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
    color: "#FFFCFA",
    fontSize: 16,
    fontWeight: "700",
  },
});
