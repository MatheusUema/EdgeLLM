import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { ModelService } from "../services/modelService";
import { FileService } from "../services/fileService";
import { LlamaContext } from "../types";

export const useModel = () => {
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedModelFormat, setSelectedModelFormat] = useState("");
  const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
  const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const fetchAvailableGGUFs = useCallback(async (modelFormat: string) => {
    setIsFetching(true);
    try {
      const files = await FileService.fetchAvailableGGUFs(modelFormat);
      setAvailableGGUFs(files);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch .gguf files from Hugging Face API.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const handleFormatSelection = useCallback(
    (format: string) => {
      setSelectedModelFormat(format);
      setAvailableGGUFs([]);
      fetchAvailableGGUFs(format);
    },
    [fetchAvailableGGUFs]
  );

  const loadModel = useCallback(async (modelName: string): Promise<boolean> => {
    console.log("loadModel", modelName);
    try {
      const llamaContext = await ModelService.loadModel(modelName);
      setContext(llamaContext);
      console.log("context",context);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error Loading Model", errorMessage);
      return false;
    }
  }, []);

  const loadDownloadedModel = useCallback(async (fileName: string): Promise<boolean> => {
    console.log("loadDownloadedModel", fileName);
    const destPath = FileService.getModelPath(fileName);
    const fileExists = await FileService.checkFileExists(destPath);
    if (fileExists) {
      const llamaContext = await ModelService.loadModel(fileName);
      setContext(llamaContext);
      return true;
    }
    return false;
  }, []);

  const downloadAndLoadModel = useCallback(
    async (fileName: string) => {
      const downloadUrl = FileService.getModelDownloadUrl(selectedModelFormat, fileName);
      setIsDownloading(true);
      setProgress(0);
      console.log("downloadAndLoadModel", fileName);
      const destPath = FileService.getModelPath(fileName);
      const fileExists = await FileService.checkFileExists(destPath);
      if (fileExists) {
        const success = await loadModel(fileName);
        if (success) {
          Alert.alert("Info", `File already exists, loaded directly.`);
        }
        setIsDownloading(false);
        return;
      }

      try {
        await FileService.downloadModel(fileName, downloadUrl, (progress) =>
          setProgress(progress)
        );
        Alert.alert("Success", `Model downloaded successfully.`);
        await loadModel(fileName);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Error", `Download failed: ${errorMessage}`);
      } finally {
        setIsDownloading(false);
      }
    },
    [selectedModelFormat, loadModel]
  );

  const releaseModel = useCallback(async () => {
    if(context) {
      ModelService.releaseModel();
      setContext(null);
      console.log("releaseModel");
      setSelectedGGUF(null);
    }
  }, []);

  const checkDownloadedModels = useCallback(async () => {
    const models = await FileService.getDownloadedModels();
    setDownloadedModels(models);
  }, []);

  return {
    context,
    isDownloading,
    progress,
    selectedModelFormat,
    selectedGGUF,
    setSelectedGGUF,
    availableGGUFs,
    downloadedModels,
    isFetching,
    handleFormatSelection,
    loadDownloadedModel,
    downloadAndLoadModel,
    releaseModel,
    checkDownloadedModels,
  };
};

