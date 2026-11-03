import {
  Camera,
  FileText,
  Image as ImageIcon,
  MapPin,
  Music,
  Plus,
  Video,
  X,
} from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type MediaType = "image" | "video" | "audio" | "file" | "camera" | "location";

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
                  Sohbete medya, dosya veya konum ekle
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
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("image")}
              >
                <View style={[styles.iconContainer, styles.imageIcon]}>
                  <ImageIcon size={25} color="#852B49" />
                </View>
                <Text style={styles.optionTitle}>Fotoğraf</Text>
              </Pressable>

              <Pressable
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("video")}
              >
                <View style={[styles.iconContainer, styles.videoIcon]}>
                  <Video size={25} color="#6241B7" />
                </View>
                <Text style={styles.optionTitle}>Video</Text>
              </Pressable>

              <Pressable
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("audio")}
              >
                <View style={[styles.iconContainer, styles.audioIcon]}>
                  <Music size={25} color="#287B55" />
                </View>
                <Text style={styles.optionTitle}>Ses</Text>
              </Pressable>

              <Pressable
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("file")}
              >
                <View style={[styles.iconContainer, styles.fileIcon]}>
                  <FileText size={25} color="#9A6718" />
                </View>
                <Text style={styles.optionTitle}>Belge</Text>
              </Pressable>

              <Pressable
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("camera")}
              >
                <View style={[styles.iconContainer, styles.cameraIcon]}>
                  <Camera size={25} color="#287B55" />
                </View>
                <Text style={styles.optionTitle}>Kamera</Text>
              </Pressable>

              {/* KONUM PAYLAŞIMI */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Konum paylaş"
                style={styles.option}
                disabled={disabled}
                onPress={() => medyaSec("location")}
              >
                <View style={[styles.iconContainer, styles.locationIcon]}>
                  <MapPin size={25} color="#2875B8" />
                </View>
                <Text style={styles.optionTitle}>Konum</Text>
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
    backgroundColor: "#F9E3EB",
  },

  disabledButton: {
    opacity: 0.4,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(180, 25, 55, 0.45)",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFBFC",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#EEDBE3",
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
    backgroundColor: "#FCEAF0",
  },

  closeButtonPressed: {
    opacity: 0.7,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },

  option: {
    flexGrow: 1,
    flexBasis: "28%",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFF5F8",
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
    backgroundColor: "#F8E3EA",
  },

  fileIcon: {
    backgroundColor: "#FCEBCF",
  },

  cameraIcon: {
    backgroundColor: "#DDF3E7",
  },

  locationIcon: {
    backgroundColor: "#DFEDFA",
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
    backgroundColor: "#852B49",
    marginRight: 8,
  },

  loadingText: {
    color: "#852B49",
    fontSize: 12,
    fontWeight: "600",
  },
});
