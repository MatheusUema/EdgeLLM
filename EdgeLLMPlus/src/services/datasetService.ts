import { PedagogyQuestion } from '../types';

// Import JSON datasets - Metro bundler will handle these
// Note: The path is relative to this file location
const cdpkData = require('../../assets/datasets/maths.json');

export interface DatasetService {
  loadQuestions(
    sampleSize?: number
  ): Promise<PedagogyQuestion[]>;
  getAllQuestions(): PedagogyQuestion[];
  shuffleArray<T>(array: T[]): T[];
}

/**
 * Dataset service for loading pedagogy benchmark questions from bundled JSON files
 */
export const DatasetService: DatasetService = {
  /**
   * Load questions from bundled JSON dataset
   * @param config 
   * @param sampleSize - Optional number of questions to return (randomly sampled)
   * @returns Array of pedagogy questions
   */
  async loadQuestions(
    sampleSize?: number
  ): Promise<PedagogyQuestion[]> {
    try {
      // Get the appropriate dataset
      const allQuestions: PedagogyQuestion[] = (cdpkData as PedagogyQuestion[]);

      if (!Array.isArray(allQuestions)) {
        throw new Error(`Invalid dataset format. Expected an array.`);
      }

      // If no sample size specified, return all questions
      if (!sampleSize || sampleSize <= 0) {
        return allQuestions;
      }

      // Shuffle and sample
      const shuffled = this.shuffleArray([...allQuestions]);
      return shuffled.slice(0, Math.min(sampleSize, shuffled.length));
    } catch (error) {
      console.error(`Error loading dataset:`, error);
      throw new Error(
        `Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Get all questions without sampling
   * @param config - 'cdpk' or 'send'
   * @returns Array of all pedagogy questions
   */
  getAllQuestions(): PedagogyQuestion[] {
    const dataset = cdpkData;
    return dataset as PedagogyQuestion[];
  },

  /**
   * Shuffle array randomly using Fisher-Yates algorithm
   * @param array - Array to shuffle
   * @returns New shuffled array
   */
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};
