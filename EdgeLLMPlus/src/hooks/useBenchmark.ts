import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { BenchmarkResult, PedagogyQuestion } from '../types';
import { LlamaContext } from '../types';
import RNFS from 'react-native-fs';
import { DatasetService } from '../services/datasetService';

export interface UseBenchmarkReturn {
  isRunning: boolean;
  progress: number;
  currentTest: number;
  totalTests: number;
  results: BenchmarkResult[];
  error: string | null;
  currentQuestionText: string;
  currentQuestionId: number | null;
  startBenchmark: () => Promise<void>;
  stopBenchmark: () => Promise<void>;
  exportResults: () => Promise<string | null>;
  reportCurrentResult: (data: {
    llmResponse: string;
    completionTime: number;
    tokensPerSecond: number;
  }) => void;
}

/**
 * React hook for running benchmark tests
 * Manages benchmark state and orchestrates the benchmark process
 */
export const useBenchmark = (context: LlamaContext | null, modelName: string | null): UseBenchmarkReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const questionsRef = useRef<PedagogyQuestion[]>([]);
  const questionIndexRef = useRef<number>(0);

  const formatQuestion = useCallback((question: PedagogyQuestion): string => {
    return `${question.question}\n\nA. ${question.answer_a}\nB. ${question.answer_b}\nC. ${question.answer_c}\nD. ${question.answer_d}\n\nPlease select the correct answer (A, B, C, or D).`;
  }, []);

  const exportResultsArray = useCallback(async (rows: BenchmarkResult[]): Promise<string> => {
    const csvHeaders = [
      'Question ID',
      'Modality',
      'Question Text',
      'LLM Response',
      'Correct Answer',
      'Is Correct',
      'Completion Time (ms)',
      'Tokens Per Second',
    ];

    const csvRows = rows.map((result) => {
      return [
        result.questionId.toString(),
        result.modality,
        `"${result.questionText.replace(/"/g, '""')}"`,
        `"${result.llmResponse.replace(/"/g, '""')}"`,
        result.correctAnswer,
        result.isCorrect ? 'true' : 'false',
        result.completionTime.toString(),
        result.tokensPerSecond.toFixed(2),
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const fileName = `benchmark_results_${dd}_${MM}_${yyyy}_${hh}_${mm}_${ss}.csv`;
    // Sanitize model name for use in file path (remove invalid characters)
    const sanitizedModelName = modelName ? modelName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'unknown_model';
    const outputDir = `${RNFS.ExternalDirectoryPath}/${sanitizedModelName}`;
    const filePath = `${outputDir}/${fileName}`;
    await RNFS.mkdir(outputDir);
    await RNFS.writeFile(filePath, csvContent, 'utf8');
    return filePath;
  }, [modelName]);

  /**
   * Start the benchmark
   */
  const startBenchmark = useCallback(async () => {
    if (!context) {
      setError('Model not loaded. Please load a model first.');
      Alert.alert('Error', 'Model not loaded. Please load a model first.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults([]);
    setCurrentTest(0);
    setCurrentQuestionText('');
    setCurrentQuestionId(null);

    try {
      // Load questions (UI-driven benchmark: chat sends, chat measures)
      const questions = await DatasetService.loadQuestions('cdpk', 1);
      questionsRef.current = questions;
      questionIndexRef.current = 0;
      setTotalTests(questions.length);

      if (questions.length === 0) {
        throw new Error('No questions found for benchmark.');
      }

      // Publish first question to UI (ChatScreen will type + auto-send)
      const first = questions[0];
      setCurrentQuestionId(first.question_id);
      setCurrentQuestionText(formatQuestion(first));
      setCurrentTest(1);
      setProgress(Math.floor((1 / questions.length) * 100));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Benchmark Error', errorMessage);
      console.error('Benchmark error:', err);
    }
  }, [context, formatQuestion]);

  /**
   * Stop the benchmark (if needed in future)
   */
  const stopBenchmark = useCallback(async () => {
    setIsRunning(false);
    setError('Benchmark stopped by user');
    // Note: BenchmarkService doesn't currently support cancellation
    // This is a placeholder for future implementation
  }, []);

  /**
   * Export results to CSV
   */
  const exportResults = useCallback(async (): Promise<string | null> => {
    if (results.length === 0) {
      Alert.alert('No Results', 'No benchmark results to export.');
      return null;
    }

    try {
      const filePath = await exportResultsArray(results);
      Alert.alert('Export Complete', `Results exported to:\n${filePath}`);
      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Export Error', `Failed to export results: ${errorMessage}`);
      return null;
    }
  }, [exportResultsArray, results]);

  const reportCurrentResult = useCallback(
    (data: { llmResponse: string; completionTime: number; tokensPerSecond: number }) => {
      if (!isRunning) return;
      const questions = questionsRef.current;
      const idx = questionIndexRef.current;
      const q = questions[idx];
      if (!q) return;

      // Minimal correctness check: match letter A/B/C/D anywhere
      const responseUpper = (data.llmResponse || '').toUpperCase();
      const match = responseUpper.match(/\b([ABCD])\b/);
      const predicted = match?.[1] ?? '';
      const isCorrect = predicted ? predicted === q.correct_answer.toUpperCase() : responseUpper.includes(q.correct_answer.toUpperCase());

      const resultRow: BenchmarkResult = {
        questionId: q.question_id,
        modality: 'text',
        questionText: q.question,
        llmResponse: data.llmResponse,
        correctAnswer: q.correct_answer,
        isCorrect,
        completionTime: data.completionTime,
        tokensPerSecond: data.tokensPerSecond,
      };

      setResults((prev) => {
        const updated = [...prev, resultRow];

        // If we just finished the last question, auto-export + alert.
        if (idx + 1 >= questions.length) {
          // Defer side-effects out of the state updater.
          setTimeout(async () => {
            try {
              const filePath = await exportResultsArray(updated);
              const correct = updated.filter(r => r.isCorrect).length;

              Alert.alert(
                'Benchmark Complete',
                `Completed ${updated.length} tests.\n\n` +
                `Correct: ${correct}/${updated.length}\n\n` +
                `Results saved to:\n${filePath}`,
                [{ text: 'OK' }]
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              Alert.alert('Benchmark Complete', `Benchmark finished but failed to export results: ${msg}`);
            }
          }, 0);
        }

        return updated;
      });

      // Advance
      const nextIdx = idx + 1;
      questionIndexRef.current = nextIdx;

      if (nextIdx >= questions.length) {
        setProgress(100);
        setIsRunning(false);
        setCurrentQuestionText('');
        setCurrentQuestionId(null);
        return;
      }

      const nextQ = questions[nextIdx];
      setCurrentQuestionId(nextQ.question_id);
      setCurrentQuestionText(formatQuestion(nextQ));
      setCurrentTest(nextIdx + 1);
      setProgress(Math.floor(((nextIdx + 1) / questions.length) * 100));
    },
    [exportResultsArray, formatQuestion, isRunning]
  );

  return {
    isRunning,
    progress,
    currentTest,
    totalTests,
    results,
    error,
    currentQuestionText,
    currentQuestionId,
    startBenchmark,
    stopBenchmark,
    exportResults,
    reportCurrentResult,
  };
};
