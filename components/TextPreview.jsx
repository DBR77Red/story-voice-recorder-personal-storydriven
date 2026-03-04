import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Scrollable text area that shows the accumulated story text (white) and the
 * live interim transcript (grey italic) at the bottom.
 */
export default function TextPreview({ storyText, interimText }) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom whenever content grows
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [storyText, interimText]);

  const isEmpty = !storyText && !interimText;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {isEmpty ? (
        <Text style={styles.placeholder}>
          Tap the record button and start speaking…
        </Text>
      ) : (
        <View>
          {storyText ? (
            <Text style={styles.storyText} selectable>
              {storyText}
            </Text>
          ) : null}
          {interimText ? (
            <Text style={styles.interimText}>{interimText}</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  placeholder: {
    color: '#555',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 40,
  },
  storyText: {
    color: '#f0f0f0',
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  interimText: {
    color: '#888',
    fontSize: 17,
    lineHeight: 28,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
