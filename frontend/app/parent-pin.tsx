import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { familyAPI } from '../src/api/client';
import { useAppStore } from '../src/stores';
import { getThemeColors } from '../src/constants';

export default function ParentPin() {
  const router = useRouter();
  const theme = useAppStore((state) => state.theme);
  const [pin, setPin] = useState('');
  const colors = getThemeColors(theme);

  const setParentUnlocked = useAppStore((state) => state.setParentUnlocked);

  const handleVerify = async () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }

    try {
      await familyAPI.verifyPin(pin);
      setParentUnlocked(true);
      router.replace('/(parent)');
    } catch (error) {
      Alert.alert('Incorrect PIN', 'Please try again');
      setPin('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Parent Access</Text>
        <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.primary }]}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          placeholder="• • • •"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
});
