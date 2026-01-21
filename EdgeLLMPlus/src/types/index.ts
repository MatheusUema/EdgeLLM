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

export interface PedagogyQuestion {
  question_id: number;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  answer_e: string | null;
  answer_f: string | null;
  answer_g: string | null;
  correct_answer: string;
  category: string;
  pedagogical_subdomain: string;
  age_group: string;
  year: number;
  secondary_category: string | null;
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
