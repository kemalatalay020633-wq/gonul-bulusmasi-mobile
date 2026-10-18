import { Mic, Send, Smile, Square } from "lucide-react-native";
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

export default function MessageInput({
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
  const gonderilebilir =
    !sending && !mediaSending && messageText.trim().length > 0;

  const formatRecordingTime = (seconds: number) => {
    const dakika = Math.floor(seconds / 60);
    const saniye = seconds % 60;
    return `${String(dakika).padStart(2, "0")}:${String(saniye).padStart(2, "0")}`;
  };

  const enterHandler = () => {
    if (gonderilebilir) {
      Keyboard.dismiss();
      onSendMessage();
    }
  };

  return (
    <View style={styles.container}>
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
            accessibilityRole="button"
            accessibilityLabel="Ses kaydını durdur ve gönder"
            style={[styles.stopButton, mediaSending && styles.disabledButton]}
            disabled={mediaSending}
            onPress={onStopRecording}
          >
            <Square size={17} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.stopButtonText}>Gönder</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Emoji"
              style={styles.emojiButton}
              onPress={() => onMessageTextChange(messageText)}
            >
              <Smile size={23} color="#852B49" strokeWidth={1.9} />
            </Pressable>

            <View style={styles.textInputWrapper}>
              <TextInput
                value={messageText}
                onChangeText={onMessageTextChange}
                placeholder="Mesaj yazın..."
                placeholderTextColor="#8C898A"
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

            <View style={styles.mediaButtonWrapper}>
              <MediaMenu
                mediaMenuOpen={mediaMenuOpen}
                sending={sending}
                mediaSending={mediaSending}
                onMediaButtonClick={onMediaButtonClick}
                onOpenMediaPicker={onOpenMediaPicker}
              />
            </View>
          </View>

          {gonderilebilir ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı gönder"
              style={[
                styles.sendButton,
                (sending || mediaSending) && styles.disabledButton,
              ]}
              disabled={!gonderilebilir}
              onPress={onSendMessage}
            >
              {sending ? (
                <Text style={styles.sendButtonText}>…</Text>
              ) : (
                <Send size={21} color="#FFFFFF" strokeWidth={2.4} />
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ses kaydını başlat"
              style={[
                styles.microphoneButton,
                (sending || mediaSending) && styles.disabledButton,
              ]}
              disabled={sending || mediaSending}
              onPress={onStartRecording}
            >
              <Mic size={22} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      )}

      {mediaSending && !recording ? (
        <View style={styles.uploadStatusContainer}>
          <Text style={styles.uploadStatusText}>Medya yükleniyor…</Text>
        </View>
      ) : null}

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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFDFC",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E9E1E4",
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: Platform.OS === "android" ? 8 : 8,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    minWidth: 0,
  },
  composer: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E8E0E4",
    backgroundColor: "#FFFFFF",
  },
  emojiButton: {
    width: 34,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  textInputWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  textInput: {
    width: "100%",
    minHeight: 38,
    maxHeight: 110,
    paddingHorizontal: 5,
    paddingTop: Platform.OS === "ios" ? 9 : 7,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    color: "#282326",
    fontSize: 16,
    lineHeight: 21,
  },
  disabledInput: { opacity: 0.55 },
  mediaButtonWrapper: {
    minHeight: 40,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  microphoneButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#287B55",
  },
  sendButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#287B55",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
    marginLeft: 2,
  },
  disabledButton: { opacity: 0.45 },
  recordingContainer: {
    width: "100%",
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F3F5",
    borderRadius: 18,
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
    marginRight: 9,
    backgroundColor: "#B72F4B",
  },
  recordingTextContainer: { flex: 1, minWidth: 0 },
  recordingText: { color: "#51464B", fontSize: 14, fontWeight: "600" },
  recordingTime: {
    color: "#8D2947",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  stopButton: {
    minWidth: 88,
    height: 42,
    flexShrink: 0,
    paddingHorizontal: 12,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#287B55",
  },
  stopButtonIcon: { color: "#FFFFFF", fontSize: 12, marginRight: 7 },
  stopButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  uploadStatusContainer: {
    paddingTop: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadStatusText: { color: "#6C5961", fontSize: 11, fontWeight: "600" },
  characterContainer: {
    width: "100%",
    alignItems: "flex-end",
    paddingRight: 6,
    paddingTop: 3,
  },
  characterText: { color: "#938A8E", fontSize: 10 },
  characterWarning: { color: "#B72F4B", fontWeight: "700" },
});
