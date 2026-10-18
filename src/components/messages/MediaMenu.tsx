import {
  FileText,
  Image as ImageIcon,
  Music,
  Plus,
  Video,
  X,
} from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type MediaType = "image" | "video" | "audio" | "file";

type MediaMenuProps = {
  mediaMenuOpen: boolean;
  sending: boolean;
  mediaSending: boolean;
  onMediaButtonClick: () => void;
  onOpenMediaPicker: (type: MediaType) => void;
};

function MediaMenu({
  mediaMenuOpen,
  sending,
  mediaSending,
  onMediaButtonClick,
  onOpenMediaPicker,
}: MediaMenuProps) {
  const disabled = sending || mediaSending;

  const medyaSec = (type: MediaType) => {
    if (disabled) return;
    onOpenMediaPicker(type);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Medya veya dosya ekle"
        style={({ pressed }) => [
          styles.attachButton,
          pressed && styles.attachButtonPressed,
          disabled && styles.disabledButton,
        ]}
        disabled={disabled}
        onPress={onMediaButtonClick}
      >
        <Plus size={27} color="#7C2948" strokeWidth={1.9} />
      </Pressable>

      <Modal
        visible={mediaMenuOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onMediaButtonClick}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menüyü kapat"
            style={styles.overlay}
            onPress={onMediaButtonClick}
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuTitle}>Paylaş</Text>
                <Text style={styles.menuSubtitle}>
                  Sohbete medya veya dosya ekle
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
                onPress={onMediaButtonClick}
              >
                <X size={19} color="#6F5963" strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  disabled && styles.optionDisabled,
                ]}
                disabled={disabled}
                onPress={() => medyaSec("image")}
              >
                <View style={[styles.iconContainer, styles.imageIcon]}>
                  <ImageIcon size={25} color="#852B49" strokeWidth={1.9} />
                </View>
                <Text style={styles.optionTitle}>Fotoğraf</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  disabled && styles.optionDisabled,
                ]}
                disabled={disabled}
                onPress={() => medyaSec("video")}
              >
                <View style={[styles.iconContainer, styles.videoIcon]}>
                  <Video size={25} color="#6241B7" strokeWidth={1.9} />
                </View>
                <Text style={styles.optionTitle}>Video</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  disabled && styles.optionDisabled,
                ]}
                disabled={disabled}
                onPress={() => medyaSec("audio")}
              >
                <View style={[styles.iconContainer, styles.audioIcon]}>
                  <Music size={25} color="#287B55" strokeWidth={1.9} />
                </View>
                <Text style={styles.optionTitle}>Ses</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  disabled && styles.optionDisabled,
                ]}
                disabled={disabled}
                onPress={() => medyaSec("file")}
              >
                <View style={[styles.iconContainer, styles.fileIcon]}>
                  <FileText size={25} color="#9A6718" strokeWidth={1.9} />
                </View>
                <Text style={styles.optionTitle}>Belge</Text>
              </Pressable>
            </View>

            {mediaSending && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingDot} />
                <Text style={styles.loadingText}>Medya yükleniyor...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default MediaMenu;

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    justifyContent: "center",
  },

  attachButton: {
    width: 40,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  attachButtonPressed: {
    backgroundColor: "#F8E8ED",
  },

  disabledButton: {
    opacity: 0.4,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(25, 14, 22, 0.42)",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFCFA",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#F1E4E9",
  },

  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9C8D0",
    marginBottom: 18,
  },

  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  menuTitle: {
    color: "#321E29",
    fontSize: 20,
    fontWeight: "800",
  },

  menuSubtitle: {
    color: "#8A7A82",
    fontSize: 12,
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5EDF1",
  },

  closeButtonPressed: {
    opacity: 0.7,
  },

  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  option: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFF8FA",
  },

  optionPressed: {
    backgroundColor: "#F8E8ED",
  },

  optionDisabled: {
    opacity: 0.4,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  imageIcon: {
    backgroundColor: "#F8DDE7",
  },

  videoIcon: {
    backgroundColor: "#E9E1FA",
  },

  audioIcon: {
    backgroundColor: "#DFF3E8",
  },

  fileIcon: {
    backgroundColor: "#FCEBCF",
  },

  optionTitle: {
    color: "#45333D",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EDE2E7",
  },

  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7C2948",
    marginRight: 8,
  },

  loadingText: {
    color: "#7C2948",
    fontSize: 12,
    fontWeight: "600",
  },
});
