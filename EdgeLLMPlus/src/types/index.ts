export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
  thought?: string;
  showThought?: boolean;
  imageUri?: string;
}

export interface CompletionData {
  token: string;
}

export interface CompletionResult {
  timings: {
    predicted_per_second: number;
  };
}

export interface LlamaContext {
  completion: (
    params: {
      messages: Message[];
      n_predict: number;
      stop: string[];
    },
    callback: (data: CompletionData) => void
  ) => Promise<CompletionResult>;
  stopCompletion: () => Promise<void>;
}

export interface ModelFormat {
  label: string;
}

export interface LlamaParams {
  model: string;
  use_mlock: boolean;
  n_ctx: number;
  n_gpu_layers: number;
}

declare module "react-native-image-crop-picker" {
  export interface Image {
    path: string;
    mime?: string;
    filename?: string;
    size?: number;
  }

  export interface CropPickerOptions {
    mediaType?: "photo" | "video" | "any";
    cropping?: boolean;
    freeStyleCropEnabled?: boolean;
    includeExif?: boolean;
    compressImageQuality?: number;
    compressImageMaxWidth?: number;
    compressImageMaxHeight?: number;
    multiple?: boolean;
    useFrontCamera?: boolean;
  }

  interface CropPickerApi {
    openCamera(options?: CropPickerOptions): Promise<Image>;
    openPicker(options?: CropPickerOptions): Promise<Image>;
  }

  const ImageCropPicker: CropPickerApi;
}
