import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ViewShot from 'react-native-view-shot';
import { View, Text, StyleSheet } from 'react-native';
import { PedagogyQuestion } from '../types';

interface QuestionImageCaptureProps {
  question: PedagogyQuestion | null;
}

export interface QuestionImageCaptureRef {
  capture: () => Promise<string | null>;
}

/**
 * Component that renders a question in a hidden ViewShot container
 * and provides a method to capture it as an image
 */
export const QuestionImageCapture = forwardRef<QuestionImageCaptureRef, QuestionImageCaptureProps>(
  ({ question }, ref) => {
    const viewShotRef = useRef<ViewShot | null>(null);

    useImperativeHandle(ref, () => ({
      capture: async (): Promise<string | null> => {
        if (!viewShotRef.current || !question) {
          return null;
        }

        try {
          const captureFn = (viewShotRef.current as unknown as { capture?: () => Promise<string> }).capture;
          if (typeof captureFn !== 'function') {
            return null;
          }

          const uri = await captureFn();
          console.log('Question image captured:', uri);
          return uri;
        } catch (error) {
          console.error('Error capturing question image:', error);
          return null;
        }
      },
    }));

    if (!question) {
      return null;
    }

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View
          collapsable={false}
          style={styles.hiddenContainer}
        >
          <Text style={styles.questionText}>{question.question}</Text>
          <Text style={styles.answerText}>A. {question.answer_a}</Text>
          <Text style={styles.answerText}>B. {question.answer_b}</Text>
          <Text style={styles.answerText}>C. {question.answer_c}</Text>
          <Text style={styles.answerText}>D. {question.answer_d}</Text>
          {question.answer_e && (
            <Text style={styles.answerText}>E. {question.answer_e}</Text>
          )}
          {question.answer_f && (
            <Text style={styles.answerText}>F. {question.answer_f}</Text>
          )}
          {question.answer_g && (
            <Text style={styles.answerText}>G. {question.answer_g}</Text>
          )}
          <Text style={styles.answerText}>Please, select the correct answer (A, B, C, or D).</Text>
        </View>
      </ViewShot>
    );
  }
);

QuestionImageCapture.displayName = 'QuestionImageCapture';

const styles = StyleSheet.create({
  hiddenContainer: {
    opacity: 0,
    position: 'absolute',
    left: -9999,
    backgroundColor: '#FFFFFF',
    padding: 20,
    minWidth: 300,
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000000',
  },
  answerText: {
    fontSize: 20,
    marginBottom: 12,
    color: '#000000',
  },
});
