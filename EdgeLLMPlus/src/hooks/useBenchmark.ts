import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { BenchmarkService } from '../services/benchmarkService';
import { BenchmarkResult } from '../types';
import { LlamaContext } from '../types';
import RNFS from 'react-native-fs';

export interface UseBenchmarkReturn {
  isRunning: boolean;
  progress: number;
  currentTest: number;
  totalTests: number;
  results: BenchmarkResult[];
  error: string | null;
  startBenchmark: () => Promise<void>;
  stopBenchmark: () => Promise<void>;
  exportResults: () => Promise<string | null>;
}

/**
 * React hook for running benchmark tests
 * Manages benchmark state and orchestrates the benchmark process
 */
export const useBenchmark = (context: LlamaContext | null): UseBenchmarkReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkService, setBenchmarkService] = useState<BenchmarkService | null>(null);

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
    setTotalTests(15); // 5 questions * 3 modalities

    try {
      const service = new BenchmarkService(context);
      setBenchmarkService(service);

      // Run benchmark with progress updates
      const benchmarkResults = await service.runBenchmark((current, total) => {
        setCurrentTest(current);
        const progressPercent = Math.floor((current / total) * 100);
        setProgress(progressPercent);
      });

      setResults(benchmarkResults);
      setProgress(100);

      // Export results automatically
      try {
        const filePath = await service.exportToCSV();
        const summary = service.getSummary();
        
        Alert.alert(
          'Benchmark Complete',
          `Completed ${summary.totalTests} tests.\n\n` +
          `Text: ${summary.correctByModality.text.correct}/${summary.correctByModality.text.total}\n` +
          `Image: ${summary.correctByModality.image.correct}/${summary.correctByModality.image.total}\n` +
          `Voice: ${summary.correctByModality.voice.correct}/${summary.correctByModality.voice.total}\n\n` +
          `Results saved to: ${filePath}`,
          [{ text: 'OK' }]
        );
      } catch (exportError) {
        console.error('Error exporting results:', exportError);
        Alert.alert(
          'Benchmark Complete',
          'Benchmark finished but failed to export results. Check console for details.'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Benchmark Error', errorMessage);
      console.error('Benchmark error:', err);
    } finally {
      setIsRunning(false);
      setBenchmarkService(null);
    }
  }, [context]);

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
    if (!benchmarkService || results.length === 0) {
      Alert.alert('No Results', 'No benchmark results to export.');
      return null;
    }

    try {
      const filePath = await benchmarkService.exportToCSV();
      Alert.alert('Export Complete', `Results exported to:\n${filePath}`);
      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Export Error', `Failed to export results: ${errorMessage}`);
      return null;
    }
  }, [benchmarkService, results]);

  return {
    isRunning,
    progress,
    currentTest,
    totalTests,
    results,
    error,
    startBenchmark,
    stopBenchmark,
    exportResults,
  };
};
