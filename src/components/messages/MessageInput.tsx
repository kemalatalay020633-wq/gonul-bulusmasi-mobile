import React from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import MediaMenu from "./MediaMenu";

type MediaType = "image" | "video" | "audio" | "file";

type MessageInputProps = {
  messageText: string;
  sending: boolean;
  mediaSending: boolean;
  recording: boolean;
  recordingSeconds: number;
  mediaMenuOpen: boolean;

  onMessageTextChange: (value: string) => void;
  onSendMessage: () => void;
  onMediaButtonClick: () => void;
  onOpenMediaPicker: (type: MediaType) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

function MessageInput({
  messageText,
  sending,
  mediaSending,
  recording,
  recordingSeconds,
  mediaMenuOpen,
  onMessageTextChange,
  onSendMessage,
  onMediaButtonClick,
  onOpenMediaPicker,
  onStartRecording,
  onStopRecording,
}: MessageInputProps) {
  const formatRecordingTime = (seconds: number) => {
    const dakika = Math.floor(seconds / 60);
    const saniye = seconds % 60;

    return (
      String(dakika).padStart(2, "0") + ":" + String(saniye).padStart(2, "0")
    );
  };

  const gonderilebilir =
    !sending && !mediaSending && messageText.trim().length > 0;

  const enterHandler = () => {
    if (gonderilebilir) {
      Keyboard.dismiss();
      onSendMessage();
    }
  };

  return (
    <View style={styles.container}>
      {/* =================================================
          SES KAYDI
      ================================================= */}

      {recording ? (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />

            <View style={styles.recordingTextContainer}>
              <Text style={styles.recordingText} numberOfLines={1}>
                Ses kaydediliyor
              </Text>

              <Text style={styles.recordingTime}>
                {formatRecordingTime(recordingSeconds)}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.stopButton, mediaSending && styles.disabledButton]}
            disabled={mediaSending}
            onPress={onStopRecording}
          >
            <Text style={styles.stopButtonIcon}>⏹</Text>

            <Text style={styles.stopButtonText} numberOfLines={1}>
              Durdur
            </Text>
          </Pressable>
        </View>
      ) : (
        /* =================================================
           NORMAL MESAJ GİRİŞİ
        ================================================= */

        <View style={styles.inputRow}>
          {/* MEDYA */}

          <View style={styles.mediaButtonWrapper}>
            <MediaMenu
              mediaMenuOpen={mediaMenuOpen}
              sending={sending}
              mediaSending={mediaSending}
              onMediaButtonClick={onMediaButtonClick}
              onOpenMediaPicker={onOpenMediaPicker}
            />
          </View>

          {/* MİKROFON */}

          <Pressable
            style={[
              styles.microphoneButton,
              (sending || mediaSending) && styles.disabledButton,
            ]}
            disabled={sending || mediaSending}
            onPress={onStartRecording}
          >
            <Text style={styles.microphoneIcon}>🎙️</Text>
          </Pressable>

          {/* MESAJ INPUT */}

          <View style={styles.textInputWrapper}>
            <TextInput
              value={messageText}
              onChangeText={onMessageTextChange}
              placeholder="Mesajınızı yazın..."
              placeholderTextColor="#999999"
              maxLength={2000}
              multiline
              editable={!sending && !mediaSending}
              style={[
                styles.textInput,
                (sending || mediaSending) && styles.disabledInput,
              ]}
              textAlignVertical="center"
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={enterHandler}
            />
          </View>

          {/* GÖNDER */}

          <Pressable
            style={[
              styles.sendButton,
              !gonderilebilir && styles.sendButtonDisabled,
            ]}
            disabled={!gonderilebilir}
            onPress={onSendMessage}
          >
            <Text
              style={[
                styles.sendButtonText,
                !gonderilebilir && styles.sendButtonTextDisabled,
              ]}
              numberOfLines={1}
            >
              {sending ? "..." : "Gönder"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* =================================================
          MEDYA YÜKLENİYOR
      ================================================= */}

      {mediaSending && !recording ? (
        <View style={styles.uploadStatusContainer}>
          <Text style={styles.uploadStatusText}>⏳ Medya yükleniyor...</Text>
        </View>
      ) : null}

      {/* =================================================
          KARAKTER SAYACI
      ================================================= */}

      {!recording && messageText.length > 0 ? (
        <View style={styles.characterContainer}>
          <Text
            style={[
              styles.characterText,
              messageText.length >= 1900 && styles.characterWarning,
            ]}
          >
            {messageText.length}/2000
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default MessageInput;

const styles = StyleSheet.create({
  /*
   * =========================================================
   * ANA CONTAINER
   * =========================================================
   */

  container: {
    width: "100%",
    backgroundColor: "#ffffff",

    borderTopWidth: 1,
    borderTopColor: "#eeeaff",

    paddingHorizontal: 8,
    paddingTop: 7,

    /*
     * Android navigation bar için ekstra alan.
     *
     * Önceden 8px idi.
     * Şimdi input navigation bar'ın arkasında kalmayacak.
     */
    paddingBottom: Platform.OS === "android" ? 45 : 8,
  },

  /*
   * =========================================================
   * INPUT ROW
   * =========================================================
   */

  inputRow: {
    width: "100%",

    flexDirection: "row",
    alignItems: "flex-end",

    minWidth: 0,
  },

  /*
   * =========================================================
   * MEDYA BUTONU
   * =========================================================
   */

  mediaButtonWrapper: {
    flexShrink: 0,
  },

  /*
   * =========================================================
   * MİKROFON
   * =========================================================
   */

  microphoneButton: {
    width: 42,
    height: 42,

    flexShrink: 0,

    borderRadius: 21,

    marginLeft: 5,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#f1edf9",
  },

  microphoneIcon: {
    fontSize: 19,
  },

  /*
   * =========================================================
   * TEXT INPUT WRAPPER
   * =========================================================
   */

  textInputWrapper: {
    flex: 1,

    minWidth: 0,

    marginLeft: 6,
  },

  /*
   * =========================================================
   * TEXT INPUT
   * =========================================================
   */

  textInput: {
    width: "100%",

    minHeight: 42,
    maxHeight: 105,

    paddingHorizontal: 13,
    paddingVertical: 9,

    borderWidth: 1,
    borderColor: "#ddd7f0",

    borderRadius: 21,

    backgroundColor: "#faf9ff",

    color: "#333333",

    fontSize: 14,

    lineHeight: 20,
  },

  disabledInput: {
    opacity: 0.55,
  },

  /*
   * =========================================================
   * GÖNDER
   * =========================================================
   */

  sendButton: {
    width: 66,
    height: 42,

    flexShrink: 0,

    marginLeft: 6,

    borderRadius: 21,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#5b3cc4",
  },

  sendButtonDisabled: {
    backgroundColor: "#ddd9e8",
  },

  sendButtonText: {
    color: "#ffffff",

    fontSize: 12,
    fontWeight: "800",

    textAlign: "center",
  },

  sendButtonTextDisabled: {
    color: "#999999",
  },

  /*
   * =========================================================
   * DEVRE DIŞI
   * =========================================================
   */

  disabledButton: {
    opacity: 0.45,
  },

  /*
   * =========================================================
   * SES KAYDI
   * =========================================================
   */

  recordingContainer: {
    width: "100%",

    minHeight: 58,

    paddingHorizontal: 8,
    paddingVertical: 7,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#faf9ff",

    borderRadius: 14,
  },

  recordingInfo: {
    flex: 1,

    minWidth: 0,

    flexDirection: "row",
    alignItems: "center",
  },

  recordingDot: {
    width: 10,
    height: 10,

    flexShrink: 0,

    borderRadius: 5,

    marginRight: 8,

    backgroundColor: "#dc2626",
  },

  recordingTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  recordingText: {
    color: "#555555",

    fontSize: 13,

    fontWeight: "600",
  },

  recordingTime: {
    color: "#5b3cc4",

    fontSize: 13,

    fontWeight: "800",

    marginTop: 2,
  },

  /*
   * =========================================================
   * KAYDI DURDUR
   * =========================================================
   */

  stopButton: {
    minWidth: 86,
    height: 40,

    flexShrink: 0,

    paddingHorizontal: 10,

    borderRadius: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#5b3cc4",
  },

  stopButtonIcon: {
    fontSize: 13,

    marginRight: 5,
  },

  stopButtonText: {
    color: "#ffffff",

    fontSize: 12,

    fontWeight: "800",
  },

  /*
   * =========================================================
   * MEDYA YÜKLEME
   * =========================================================
   */

  uploadStatusContainer: {
    paddingTop: 5,

    alignItems: "center",
    justifyContent: "center",
  },

  uploadStatusText: {
    color: "#5b3cc4",

    fontSize: 11,

    fontWeight: "600",
  },

  /*
   * =========================================================
   * KARAKTER SAYACI
   * =========================================================
   */

  characterContainer: {
    width: "100%",

    alignItems: "flex-end",

    paddingRight: 6,
    paddingTop: 2,
  },

  characterText: {
    color: "#999999",

    fontSize: 9,
  },

  characterWarning: {
    color: "#dc2626",

    fontWeight: "700",
  },
});
