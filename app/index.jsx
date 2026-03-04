import React, { useState, useCallback } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import RecordButton from '../components/RecordButton';
import TextPreview from '../components/TextPreview';
import ExportModal from '../components/ExportModal';
import { useDeepgram } from '../hooks/useDeepgram';
import {
  parseCommands,
  hasDeleteCommand,
  deleteLastSentence,
} from '../hooks/useCommandParser';

export default function HomeScreen() {
  const [storyText, setStoryText]           = useState('');
  const [interimText, setInterimText]       = useState('');
  const [showExport, setShowExport]         = useState(false);

  // -----------------------------------------------------------------------
  // Transcript handlers
  // -----------------------------------------------------------------------

  const handleFinalTranscript = useCallback((raw) => {
    setInterimText('');

    if (hasDeleteCommand(raw)) {
      setStoryText((prev) => deleteLastSentence(prev));
      return;
    }

    const parsed = parseCommands(raw);
    if (!parsed) return;

    setStoryText((prev) => {
      if (!prev) return parsed;
      // After a paragraph command there's already "\n\n", don't add a space.
      const spacer = prev.endsWith('\n') ? '' : ' ';
      return prev + spacer + parsed;
    });
  }, []);

  const handleInterimTranscript = useCallback((raw) => {
    setInterimText(raw);
  }, []);

  const handleError = useCallback((err) => {
    Alert.alert('Recording error', err.message ?? 'Unknown error');
  }, []);

  // -----------------------------------------------------------------------
  // Deepgram hook
  // -----------------------------------------------------------------------

  const { isRecording, startRecording, stopRecording } = useDeepgram({
    onFinalTranscript: handleFinalTranscript,
    onInterimTranscript: handleInterimTranscript,
    onError: handleError,
  });

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // -----------------------------------------------------------------------
  // New / clear
  // -----------------------------------------------------------------------

  const handleNew = useCallback(() => {
    if (!storyText && !interimText) return;
    Alert.alert('New story', 'Clear the current text?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setStoryText('');
          setInterimText('');
        },
      },
    ]);
  }, [storyText, interimText]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>VoiceStory</Text>
        <TouchableOpacity
          onPress={handleNew}
          style={styles.newBtn}
          accessibilityLabel="New story"
        >
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Live text preview */}
      <TextPreview storyText={storyText} interimText={interimText} />

      {/* Footer: Export + Record */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => setShowExport(true)}
          style={[styles.exportBtn, !storyText && styles.exportBtnDisabled]}
          disabled={!storyText}
          accessibilityLabel="Export story"
        >
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>

        <RecordButton isRecording={isRecording} onPress={handleToggleRecord} />

        {/* Spacer so the record button stays centred */}
        <View style={styles.exportBtn} />
      </View>

      {/* Recording indicator label */}
      {isRecording && (
        <Text style={styles.recordingLabel}>● Recording</Text>
      )}

      {/* Export modal */}
      <ExportModal
        visible={showExport}
        storyText={storyText}
        onClose={() => setShowExport(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  appTitle: {
    color: '#f0f0f0',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  newBtnText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  exportBtn: {
    width: 90,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnDisabled: {
    opacity: 0.3,
  },
  exportBtnText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '600',
  },
  recordingLabel: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1,
  },
});
