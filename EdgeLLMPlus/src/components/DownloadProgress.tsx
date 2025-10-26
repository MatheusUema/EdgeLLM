import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ProgressBar from "./ProgressBar";

interface DownloadProgressProps {
  selectedGGUF: string | null;
  progress: number;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  selectedGGUF,
  progress,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>Downloading :</Text>
      <Text style={styles.subtitle2}>{selectedGGUF}</Text>
      <ProgressBar progress={progress} />
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
  subtitle2: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    color: "#93C5FD",
  },
});

