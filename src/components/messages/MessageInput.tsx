import { Mic, Send, Smile, Square } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MediaMenu from "./MediaMenu";

type MediaType = "image" | "video" | "audio" | "file" | "camera" | "location";
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
const EMOJI_CATEGORIES = [
  {
    title: "Yüzler",
    icon: "😀",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤗",
      "🤭",
      "🫢",
      "🫣",
      "🤫",
      "🤔",
      "🫡",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "😮‍💨",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "🥴",
      "😵",
      "🤯",
      "🥳",
      "😎",
      "🤓",
      "😕",
      "😟",
      "🙁",
      "😮",
      "😲",
      "😳",
      "🥺",
      "🥹",
      "😦",
      "😨",
      "😰",
      "😢",
      "😭",
      "😱",
      "😖",
      "😞",
      "😩",
      "😫",
      "🥱",
      "😤",
      "😡",
      "😠",
      "🤬",
      "😈",
      "💀",
      "💩",
      "🤡",
      "👻",
      "👽",
      "🤖",
    ],
  },
  {
    title: "Eller",
    icon: "👋",
    emojis: [
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🫰",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "🫵",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🙏",
      "✍️",
      "💅",
      "💪",
    ],
  },
  {
    title: "Kalpler",
    icon: "❤️",
    emojis: [
      "❤️",
      "🩷",
      "🧡",
      "💛",
      "💚",
      "💙",
      "🩵",
      "💜",
      "🤎",
      "🖤",
      "🩶",
      "🤍",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "❣️",
      "💌",
      "💋",
      "💍",
      "💐",
      "🌹",
    ],
  },
  {
    title: "Hayvanlar",
    icon: "🐻",
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🙈",
      "🙉",
      "🙊",
      "🐔",
      "🐧",
      "🐦",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
      "🐺",
      "🐴",
      "🦄",
      "🐝",
      "🦋",
      "🐌",
      "🐞",
      "🐜",
      "🕷️",
      "🐢",
      "🐍",
      "🦎",
      "🦖",
      "🐙",
      "🦑",
      "🦐",
      "🦀",
      "🐠",
      "🐟",
      "🐬",
      "🐳",
      "🦈",
      "🐊",
      "🐘",
      "🦒",
      "🦘",
      "🐎",
      "🐑",
      "🦙",
      "🐕",
      "🐈",
      "🦜",
      "🦢",
      "🦝",
      "🦦",
      "🦔",
    ],
  },
  {
    title: "Yiyecek",
    icon: "🍎",
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🥬",
      "🥒",
      "🌶️",
      "🌽",
      "🥕",
      "🧄",
      "🧅",
      "🥔",
      "🍞",
      "🥐",
      "🧀",
      "🥚",
      "🍳",
      "🥞",
      "🥓",
      "🍗",
      "🌭",
      "🍔",
      "🍟",
      "🍕",
      "🥪",
      "🌮",
      "🌯",
      "🥗",
      "🍝",
      "🍜",
      "🍣",
      "🍱",
      "🍤",
      "🍚",
      "🍦",
      "🍰",
      "🎂",
      "🍫",
      "🍿",
      "🍩",
      "🍪",
      "☕",
      "🧋",
    ],
  },
  {
    title: "Etkinlik",
    icon: "🎉",
    emojis: [
      "🎉",
      "🎊",
      "🎈",
      "🎁",
      "🎀",
      "🎂",
      "🎄",
      "🎃",
      "🎆",
      "✨",
      "🏆",
      "🏅",
      "🥇",
      "⚽",
      "🏀",
      "🎾",
      "🏐",
      "🎱",
      "🏓",
      "🥊",
      "🎯",
      "🎮",
      "🎲",
      "🎻",
      "🎸",
      "🎹",
      "🥁",
      "🎤",
      "🎧",
      "🎬",
      "🎨",
    ],
  },
  {
    title: "Doğa",
    icon: "🌿",
    emojis: [
      "🌍",
      "🌎",
      "🌏",
      "🌕",
      "🌙",
      "⭐",
      "🌟",
      "💫",
      "☀️",
      "🌤️",
      "⛅",
      "🌦️",
      "🌧️",
      "⛈️",
      "❄️",
      "☃️",
      "🌈",
      "☔",
      "💧",
      "🔥",
      "🌊",
      "🌸",
      "🌼",
      "🌻",
      "🌺",
      "🌷",
      "🌹",
      "🌱",
      "🌲",
      "🌳",
      "🌴",
      "🌵",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🪴",
      "🌾",
      "🌿",
    ],
  },
  {
    title: "Semboller",
    icon: "✨",
    emojis: [
      "💯",
      "💢",
      "💥",
      "💦",
      "💨",
      "💬",
      "💭",
      "💤",
      "🔔",
      "🔕",
      "🎵",
      "🎶",
      "🔒",
      "🔓",
      "🔑",
      "💡",
      "⚠️",
      "🚫",
      "✅",
      "❌",
      "❓",
      "❗",
      "‼️",
      "⁉️",
      "♻️",
      "🔞",
      "✔️",
      "☑️",
      "⭐",
    ],
  },
] as const;

const SON_EMOJILER = [
  "❤️",
  "😂",
  "🥰",
  "😊",
  "😍",
  "👍",
  "🙏",
  "😘",
  "🔥",
  "🎉",
  "😭",
  "💯",
];

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
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(-1);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(SON_EMOJILER);
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef({
    start: messageText.length,
    end: messageText.length,
  });

  const gonderilebilir =
    !sending && !mediaSending && messageText.trim().length > 0;
  const formatRecordingTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const enterHandler = () => {
    if (gonderilebilir) {
      Keyboard.dismiss();
      setEmojiPanelOpen(false);
      onSendMessage();
    }
  };

  const emojiEkle = (emoji: string) => {
    if (sending || mediaSending || recording) return;
    const start = Math.min(selectionRef.current.start, messageText.length);
    const end = Math.min(
      Math.max(selectionRef.current.end, start),
      messageText.length,
    );
    if (messageText.length + emoji.length > 2000) return;
    const yeniMetin =
      messageText.slice(0, start) + emoji + messageText.slice(end);
    const yeniImlec = start + emoji.length;
    selectionRef.current = { start: yeniImlec, end: yeniImlec };
    onMessageTextChange(yeniMetin);
    setRecentEmojis((prev) =>
      [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 24),
    );
  };

  const emojiler =
    emojiCategory === -1
      ? recentEmojis
      : EMOJI_CATEGORIES[emojiCategory].emojis;

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
        <>
          {emojiPanelOpen && (
            <View style={styles.emojiPanel}>
              <View style={styles.emojiPanelHeader}>
                <Text style={styles.emojiPanelTitle}>Emoji seç</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Emoji panelini kapat"
                  onPress={() => setEmojiPanelOpen(false)}
                  style={styles.emojiCloseButton}
                >
                  <Text style={styles.emojiCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Son kullanılan emojiler"
                  onPress={() => setEmojiCategory(-1)}
                  style={[
                    styles.categoryButton,
                    emojiCategory === -1 && styles.categoryButtonActive,
                  ]}
                >
                  <Text style={styles.categoryIcon}>🕘</Text>
                </Pressable>
                {EMOJI_CATEGORIES.map((category, index) => (
                  <Pressable
                    key={category.title}
                    accessibilityRole="button"
                    accessibilityLabel={`${category.title} emojileri`}
                    onPress={() => setEmojiCategory(index)}
                    style={[
                      styles.categoryButton,
                      emojiCategory === index && styles.categoryButtonActive,
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.categoryTitle}>
                {emojiCategory === -1
                  ? "Son kullanılanlar"
                  : EMOJI_CATEGORIES[emojiCategory].title}
              </Text>
              <ScrollView
                style={styles.emojiScroll}
                contentContainerStyle={styles.emojiGrid}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="always"
              >
                {emojiler.map((emoji, index) => (
                  <Pressable
                    key={`${emoji}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${emoji} emojisini ekle`}
                    style={styles.emojiItem}
                    disabled={
                      sending || mediaSending || messageText.length >= 2000
                    }
                    onPress={() => emojiEkle(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputRow}>
            <View style={styles.composer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Emoji panelini aç veya kapat"
                style={[
                  styles.emojiButton,
                  emojiPanelOpen && styles.emojiButtonActive,
                ]}
                onPress={() => {
                  if (emojiPanelOpen) setEmojiPanelOpen(false);
                  else {
                    Keyboard.dismiss();
                    setEmojiPanelOpen(true);
                  }
                }}
              >
                <Smile size={23} color="#852B49" strokeWidth={1.9} />
              </Pressable>
              <View style={styles.textInputWrapper}>
                <TextInput
                  ref={inputRef}
                  value={messageText}
                  onChangeText={onMessageTextChange}
                  onSelectionChange={(event) => {
                    selectionRef.current = event.nativeEvent.selection;
                  }}
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
        </>
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EADDE3",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 9 : 8,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    minWidth: 0,
  },
  composer: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E5D2DC",
    backgroundColor: "#FBF9FA",
  },
  emojiButton: {
    width: 36,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  emojiButtonActive: { backgroundColor: "#F9E3EB" },
  textInputWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  textInput: {
    width: "100%",
    minHeight: 40,
    maxHeight: 116,
    paddingHorizontal: 5,
    paddingTop: Platform.OS === "ios" ? 9 : 7,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    color: "#30252B",
    fontSize: 15,
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
  emojiPanel: {
    marginBottom: 9,
    padding: 10,
    height: 300,
    borderRadius: 20,
    backgroundColor: "#FFFCFD",
    borderWidth: 1,
    borderColor: "#E8D3DD",
    shadowColor: "#4C2438",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emojiPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  emojiPanelTitle: { color: "#54263B", fontSize: 15, fontWeight: "800" },
  emojiCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEAF0",
  },
  emojiCloseText: { color: "#852B49", fontSize: 15, fontWeight: "700" },
  categoryRow: { alignItems: "center", gap: 6, paddingVertical: 4 },
  categoryButton: {
    width: 37,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryButtonActive: { backgroundColor: "#F9E3EB", borderColor: "#D8A9BB" },
  categoryIcon: { fontSize: 19 },
  categoryTitle: {
    marginTop: 7,
    marginBottom: 5,
    color: "#765364",
    fontSize: 12,
    fontWeight: "700",
  },
  emojiScroll: { flex: 1 },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 4,
  },
  emojiItem: {
    width: "12.5%",
    minWidth: 32,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  emojiText: { fontSize: 25, textAlign: "center" },
  microphoneButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#852B49",
    elevation: 2,
    shadowColor: "#6B1D3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#852B49",
    elevation: 2,
    shadowColor: "#6B1D3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
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
    backgroundColor: "#FFF3F7",
    borderWidth: 1,
    borderColor: "#F1D3DF",
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
    backgroundColor: "#C12F65",
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
    backgroundColor: "#852B49",
  },
  stopButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  uploadStatusContainer: {
    paddingTop: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadStatusText: { color: "#805B6B", fontSize: 11, fontWeight: "600" },
  characterContainer: {
    width: "100%",
    alignItems: "flex-end",
    paddingRight: 6,
    paddingTop: 3,
  },
  characterText: { color: "#938A8E", fontSize: 10 },
  characterWarning: { color: "#B72F4B", fontWeight: "700" },
});
