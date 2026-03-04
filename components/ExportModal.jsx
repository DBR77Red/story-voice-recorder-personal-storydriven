import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { exportStoryText, getDefaultFilename } from '../utils/exportText';

export default function ExportModal({ visible, storyText, onClose }) {
  const [filename, setFilename] = useState('');
  const [loading, setLoading]   = useState(false);

  // Reset filename to a fresh timestamp each time the modal opens
  useEffect(() => {
    if (visible) {
      setFilename(getDefaultFilename());
    }
  }, [visible]);

  const handleSave = async () => {
    if (!filename.trim()) return;
    setLoading(true);
    try {
      await exportStoryText(storyText, filename.trim());
      onClose();
    } catch (err) {
      Alert.alert('Export failed', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Export story</Text>
          <Text style={styles.label}>Filename</Text>
          <TextInput
            style={styles.input}
            value={filename}
            onChangeText={setFilename}
            autoFocus
            selectTextOnFocus
            placeholder="story_YYYY-MM-DD_HHhmm"
            placeholderTextColor="#555"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Text style={styles.hint}>The file will be saved as <Text style={styles.hintBold}>{filename || '…'}.txt</Text></Text>

          <View style={styles.row}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.btn, styles.btnCancel]}
              disabled={loading}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.btn, styles.btnSave, (!filename.trim() || loading) && styles.btnDisabled]}
              disabled={!filename.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#2c2c2e',
    color: '#f0f0f0',
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  hintBold: {
    color: '#999',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#2c2c2e',
  },
  btnSave: {
    backgroundColor: '#c0392b',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnCancelText: {
    color: '#ccc',
    fontWeight: '600',
    fontSize: 16,
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
