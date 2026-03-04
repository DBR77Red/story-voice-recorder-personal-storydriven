import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

const PULSE_SIZE = 88;
const BUTTON_SIZE = 72;

export default function RecordButton({ isRecording, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef   = useRef(null);

  useEffect(() => {
    if (isRecording) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => loopRef.current?.stop();
  }, [isRecording, pulseAnim]);

  return (
    <View style={styles.wrapper}>
      {/* Pulse ring behind the button */}
      <Animated.View
        style={[
          styles.pulse,
          {
            opacity: isRecording ? 0.35 : 0,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.button, isRecording && styles.buttonRecording]}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        accessibilityRole="button"
      >
        {/* Inner square (stop icon) when recording, circle otherwise */}
        <View style={isRecording ? styles.stopIcon : styles.micDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#e05252',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  buttonRecording: {
    backgroundColor: '#e74c3c',
  },
  micDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  stopIcon: {
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
