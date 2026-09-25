import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Question = {
  id: number;
  question: string;
  category: string | null;
  type: string | null;
  required: boolean;
  active: boolean;
  options: string | null;
};

type QuestionItemProps = {
  question: Question;
  selected: string[];
  onRadioChange: (questionId: number, value: string) => void;
  onCheckboxChange: (questionId: number, value: string) => void;
};

export default function QuestionItem({
  question,
  selected,
  onRadioChange,
  onCheckboxChange,
}: QuestionItemProps) {
  const options = question.options
    ? question.options
        .split("|")
        .map((option) => option.trim())
        .filter(Boolean)
    : [];

  const soruTipi = question.type?.toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        {question.question}

        {question.required && <Text style={styles.required}> *</Text>}
      </Text>

      {soruTipi === "CHECKBOX" && (
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const secili = selected.includes(option);

            return (
              <TouchableOpacity
                key={option}
                style={styles.optionRow}
                onPress={() => onCheckboxChange(question.id, option)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, secili && styles.checkboxSelected]}
                >
                  {secili && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {soruTipi === "RADIO" && (
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const secili = selected.includes(option);

            return (
              <TouchableOpacity
                key={option}
                style={styles.optionRow}
                onPress={() => onRadioChange(question.id, option)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, secili && styles.radioSelected]}>
                  {secili && <View style={styles.radioInner} />}
                </View>

                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede9fe",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  question: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    color: "#4c1d95",
    marginBottom: 14,
  },

  required: {
    color: "#dc2626",
    fontWeight: "800",
  },

  optionsContainer: {
    width: "100%",
    gap: 10,
  },

  optionRow: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    marginLeft: 10,
    lineHeight: 21,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#a78bfa",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },

  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a78bfa",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#7c3aed",
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7c3aed",
  },
});
