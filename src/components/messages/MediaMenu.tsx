import React from "react";
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
    if (disabled) {
      return;
    }

    onOpenMediaPicker(type);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.attachButton, disabled && styles.disabledButton]}
        disabled={disabled}
        onPress={onMediaButtonClick}
      >
        <Text style={styles.attachIcon}>📎</Text>
      </Pressable>

      <Modal
        visible={mediaMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={onMediaButtonClick}
      >
        <Pressable style={styles.overlay} onPress={onMediaButtonClick}>
          <Pressable
            style={styles.menu}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Medya Gönder</Text>

              <Pressable
                style={styles.closeButton}
                onPress={onMediaButtonClick}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.options}>
              <Pressable
                style={[styles.option, disabled && styles.optionDisabled]}
                disabled={disabled}
                onPress={() => medyaSec("image")}
              >
                <View style={[styles.iconContainer, styles.imageIcon]}>
                  <Text style={styles.optionIcon}>🖼️</Text>
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Fotoğraf</Text>

                  <Text style={styles.optionDescription}>
                    Galeriden fotoğraf seç
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.option, disabled && styles.optionDisabled]}
                disabled={disabled}
                onPress={() => medyaSec("video")}
              >
                <View style={[styles.iconContainer, styles.videoIcon]}>
                  <Text style={styles.optionIcon}>🎬</Text>
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Video</Text>

                  <Text style={styles.optionDescription}>
                    Galeriden video seç
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.option, disabled && styles.optionDisabled]}
                disabled={disabled}
                onPress={() => medyaSec("audio")}
              >
                <View style={[styles.iconContainer, styles.audioIcon]}>
                  <Text style={styles.optionIcon}>🎵</Text>
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Ses Dosyası</Text>

                  <Text style={styles.optionDescription}>
                    Cihazdan ses dosyası seç
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.option, disabled && styles.optionDisabled]}
                disabled={disabled}
                onPress={() => medyaSec("file")}
              >
                <View style={[styles.iconContainer, styles.fileIcon]}>
                  <Text style={styles.optionIcon}>📄</Text>
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Dosya</Text>

                  <Text style={styles.optionDescription}>
                    Cihazdan dosya seç
                  </Text>
                </View>
              </Pressable>
            </View>

            {mediaSending && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Medya yükleniyor...</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default MediaMenu;

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },

  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eeeaff",
  },

  disabledButton: {
    opacity: 0.45,
  },

  attachIcon: {
    fontSize: 21,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },

  menu: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingBottom: 12,
    overflow: "hidden",
  },

  menuHeader: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeaff",
  },

  menuTitle: {
    color: "#4d35a8",
    fontSize: 18,
    fontWeight: "700",
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f1fa",
  },

  closeText: {
    color: "#666666",
    fontSize: 17,
    fontWeight: "600",
  },

  options: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  option: {
    minHeight: 68,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1eff7",
  },

  optionDisabled: {
    opacity: 0.45,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  imageIcon: {
    backgroundColor: "#eeeaff",
  },

  videoIcon: {
    backgroundColor: "#f3e8ff",
  },

  audioIcon: {
    backgroundColor: "#eaf7ef",
  },

  fileIcon: {
    backgroundColor: "#fff4df",
  },

  optionIcon: {
    fontSize: 23,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionTitle: {
    color: "#333333",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },

  optionDescription: {
    color: "#888888",
    fontSize: 12,
  },

  loadingContainer: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  loadingText: {
    color: "#5b3cc4",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
