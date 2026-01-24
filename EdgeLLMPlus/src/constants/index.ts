import { ModelFormat } from "../types";

export const INITIAL_CONVERSATION = [
  {
    role: "system" as const,
    content: "This is a conversation between user and assistant, a friendly chatbot.",
  },
];

export const MODEL_FORMATS: ModelFormat[] = [
  // { label: "SmolLM2-360M-Instruct-Q8_0" },
  { label: "SmolLM2-360M-Instruct-Q4_K_M" },
  // { label: "SmolLM2-360M-Instruct-Q3_K_M" },
  { label: "LFM2-700M-GGUF" },
  // { label: "Ministral-3b-instruct-Q8_0" },
  { label: "Ministral-3b-instruct-Q4_K_M" },
  // { label: "Ministral-3b-instruct-Q2_K" },
  // { label: "Qwen3-1.7B-Q2_K" },
  { label: "Qwen3-1.7B-Q4_K_M" },
  // { label: "Qwen3-1.7B-Q8_0" },
];

export const HF_TO_GGUF: Record<string, string> = {
  "SmolLM2-360M-Instruct-Q8_0": "matheusUema/SmolLM2-360M-Instruct-Q8_0-GGUF",
  "SmolLM2-360M-Instruct-Q4_K_M": "matheusUema/SmolLM2-360M-Instruct-Q4_K_M-GGUF",
  "SmolLM2-360M-Instruct-Q3_K_M": "matheusUema/SmolLM2-360M-Instruct-Q3_K_M-GGUF",
  "LFM2-700M-GGUF": "LiquidAI/LFM2-700M-GGUF",
  "Ministral-3b-instruct-Q8_0": "matheusUema/Ministral-3b-instruct-Q8_0-GGUF",
  "Ministral-3b-instruct-Q4_K_M": "matheusUema/Ministral-3b-instruct-Q4_K_M-GGUF",
  "Ministral-3b-instruct-Q2_K": "matheusUema/Ministral-3b-instruct-Q2_K-GGUF",
  "Qwen3-1.7B-Q2_K": "matheusUema/Qwen3-1.7B-Q2_K-GGUF",
  "Qwen3-1.7B-Q4_K_M": "matheusUema/Qwen3-1.7B-Q4_K_M-GGUF",
  "Qwen3-1.7B-Q8_0": "matheusUema/Qwen3-1.7B-Q8_0-GGUF",
};

export const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "user:",
  "assistant:",
  "<|im_end|>",
  "<|eot_id|>",
  "<|end▁of▁sentence|>",
  "<|end_of_text|>",
  "<｜end▁of▁sentence｜>",
];

export const LLAMA_PARAMS = {
  use_mlock: true,
  n_ctx: 2048,
  n_gpu_layers: 1,
};

export const MAX_PREDICT = 10000;
export const AUTO_SCROLL_THRESHOLD = 100;

