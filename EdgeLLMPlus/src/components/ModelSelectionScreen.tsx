import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";

interface ModelSelectionScreenProps {
  modelFormats: Array<{ label: string }>;
  selectedModelFormat: string;
  onFormatSelect: (format: string) => void;
  availableGGUFs: string[];
  isFetching: boolean;
  downloadedModels: string[];
  selectedGGUF: string | null;
  onGGUFSelect: (file: string, isDownloaded: boolean) => void;
}

export const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({
  modelFormats,
  selectedModelFormat,
  onFormatSelect,
  availableGGUFs,
  isFetching,
  downloadedModels,
  selectedGGUF,
  onGGUFSelect,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>Escolha um formato de modelo</Text>
      {modelFormats.map((format) => (
        <TouchableOpacity
          key={format.label}
          style={[
            styles.button,
            selectedModelFormat === format.label && styles.selectedButton,
          ]}
          onPress={() => onFormatSelect(format.label)}
        >
          <Text style={styles.buttonText}>{format.label}</Text>
        </TouchableOpacity>
      ))}

      {selectedModelFormat && (
        <View>
          <Text style={styles.subtitle}>Escolha um arquivo .gguf</Text>
          {isFetching && <ActivityIndicator size="small" color="#2563EB" />}
          {availableGGUFs.map((file, index) => {
            const isDownloaded = downloadedModels.includes(file);
            return (
              <View key={index} style={styles.modelContainer}>
                <TouchableOpacity
                  style={[
                    styles.modelButton,
                    selectedGGUF === file && styles.selectedButton,
                    isDownloaded && styles.downloadedModelButton,
                  ]}
                  onPress={() => onGGUFSelect(file, isDownloaded)}
                >
                  <View style={styles.modelButtonContent}>
                    <View style={styles.modelStatusContainer}>
                      {isDownloaded ? (
                        <View style={styles.downloadedIndicator}>
                          <Text style={styles.downloadedIcon}>▼</Text>
                        </View>
                      ) : (
                        <View style={styles.notDownloadedIndicator}>
                          <Text style={styles.notDownloadedIcon}>▽</Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.buttonTextGGUF,
                          selectedGGUF === file && styles.selectedButtonText,
                          isDownloaded && styles.downloadedText,
                        ]}
                      >
                        {file.split("-").pop()}
                      </Text>
                    </View>
                    {isDownloaded && (
                      <View style={styles.loadModelIndicator}>
                        <Text style={styles.loadModelText}>Conversar →</Text>
                      </View>
                    )}
                    {!isDownloaded && (
                      <View style={styles.downloadIndicator}>
                        <Text style={styles.downloadText}>Carregar →</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
    marginTop: 16,
  },
  button: {
    backgroundColor: "#93C5FD",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: "#93C5FD",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modelContainer: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  modelButton: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadedModelButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 1,
  },
  modelButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  downloadedIndicator: {
    backgroundColor: "#DBEAFE",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  notDownloadedIndicator: {
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  downloadedIcon: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "bold",
  },
  notDownloadedIcon: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },
  downloadedText: {
    color: "#1E40AF",
  },
  loadModelIndicator: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  loadModelText: {
    color: "#3B82F6",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  downloadIndicator: {
    backgroundColor: "#DCF9E5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  downloadText: {
    color: "#16A34A",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  buttonTextGGUF: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

