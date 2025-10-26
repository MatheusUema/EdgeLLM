import RNFS from "react-native-fs";
import axios from "axios";
import { HF_TO_GGUF } from "../constants";

export const FileService = {
  /**
   * Check if a file exists at the given path
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    try {
      return await RNFS.exists(filePath);
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  },

  /**
   * Get all downloaded GGUF models from documents directory
   */
  async getDownloadedModels(): Promise<string[]> {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      return files
        .filter((file) => file.name.endsWith(".gguf"))
        .map((file) => file.name);
    } catch (error) {
      console.error("Error checking downloaded models:", error);
      return [];
    }
  },

  /**
   * Download a model from Hugging Face
   */
  async downloadModel(
    modelName: string,
    downloadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
    
    try {
      const fileExists = await this.checkFileExists(destPath);
      if (fileExists) {
        await RNFS.unlink(destPath);
        console.log(`Deleted existing file at ${destPath}`);
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: destPath,
        progressDivider: 5,
        begin: (res) => {
          console.log("Response begin:", res);
        },
        progress: ({ bytesWritten, contentLength }: { bytesWritten: number; contentLength: number }) => {
          const progress = (bytesWritten / contentLength) * 100;
          onProgress(Math.floor(progress));
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        return destPath;
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to download model: ${errorMessage}`);
    }
  },

  /**
   * Fetch available GGUF files for a given model format from Hugging Face
   */
  async fetchAvailableGGUFs(modelFormat: string): Promise<string[]> {
    try {
      const repository = HF_TO_GGUF[modelFormat];
      if (!repository) {
        throw new Error(`No repository mapping found for ${modelFormat}`);
      }

      const response = await axios.get(
        `https://huggingface.co/api/models/${repository}`
      );

      const files = response.data.siblings.filter((file: any) =>
        file.rfilename.endsWith(".gguf")
      );

      return files.map((file: any) => file.rfilename);
    } catch (error) {
      console.error("Error fetching GGUF files:", error);
      throw new Error("Failed to fetch .gguf files from Hugging Face API.");
    }
  },

  /**
   * Get the download URL for a model file
   */
  getModelDownloadUrl(modelFormat: string, fileName: string): string {
    const repository = HF_TO_GGUF[modelFormat];
    if (!repository) {
      throw new Error(`No repository mapping found for ${modelFormat}`);
    }
    return `https://huggingface.co/${repository}/resolve/main/${fileName}`;
  },

  /**
   * Get the full path for a model file
   */
  getModelPath(fileName: string): string {
    return `${RNFS.DocumentDirectoryPath}/${fileName}`;
  },
};

