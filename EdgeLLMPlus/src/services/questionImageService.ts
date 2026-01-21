import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Android-first: loads pre-generated question images as *Android app assets* and
 * copies them into a readable filesystem path for OCR.
 *
 * Notes:
 * - We copy <repo>/assets/questions_images into android/app/src/main/assets/questions_images at build time
 *   (see android/app/build.gradle task: copyQuestionImagesToAssets).
 * - At runtime on Android, we use RNFS.copyFileAssets() to copy a single image into cache and return file:// uri.
 */
export class QuestionImageService {
  private static getAndroidAssetPath(questionId: number): string {
    // Path relative to android/app/src/main/assets
    return `questions_images/question_${questionId}.png`;
  }

  private static getCacheFilePath(questionId: number): string {
    return `${RNFS.CachesDirectoryPath}/question_images/question_${questionId}.png`;
  }

  /**
   * Returns a file:// URI that should be readable by native OCR on Android.
   * Copies from android_asset into cache on first use.
   */
  static async ensureReadableFileUri(questionId: number): Promise<string | null> {
    if (Platform.OS !== 'android') {
      // Android-focused implementation. (Can be extended for iOS later.)
      return null;
    }

    try {
      const dstDir = `${RNFS.CachesDirectoryPath}/question_images`;
      const dstPath = this.getCacheFilePath(questionId);
      const dstUri = dstPath.startsWith('file://') ? dstPath : `file://${dstPath}`;

      const exists = await RNFS.exists(dstPath);
      if (exists) return dstUri;

      await RNFS.mkdir(dstDir);

      // Copy from android asset into cache. Requires build.gradle task to populate assets/questions_images.
      const assetPath = this.getAndroidAssetPath(questionId);
      // @ts-expect-error: react-native-fs types may not include copyFileAssets, but it's available on Android.
      await RNFS.copyFileAssets(assetPath, dstPath);

      return dstUri;
    } catch (e) {
      console.error('[QuestionImageService] ensureReadableFileUri failed:', e);
      return null;
    }
  }
}

