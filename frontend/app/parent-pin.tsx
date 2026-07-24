import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, familyAPI } from '../src/api/client';
import { useAppStore, useAuthStore } from '../src/stores';
import { getThemeColors, getClayShadow, FONTS } from '../src/constants';
import { ClayPressable } from '../src/utils/animations';
import { Alert } from '../src/utils/alert';

export default function ParentPin() {
  const router = useRouter();
  const theme = useAppStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const [pin, setPin] = useState('');
  const colors = getThemeColors(theme);

  const setParentUnlocked = useAppStore((state) => state.setParentUnlocked);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleVerify = async () => {
    if (pin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
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

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetPassword('');
    setResetNewPin('');
    setResetConfirmPin('');
  };

  const handleResetPin = async () => {
    if (!resetPassword) {
      Alert.alert('Error', 'Enter your account password');
      return;
    }

    if (resetNewPin.length !== 6 || resetConfirmPin.length !== 6) {
      Alert.alert('Error', 'New PIN must be exactly 6 digits');
      return;
    }

    if (resetNewPin !== resetConfirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'Could not determine your account email. Please log in again.');
      return;
    }

    setResetLoading(true);
    try {
      // Re-proves identity with the account password (the first factor) since the PIN
      // (the second factor) is exactly what's been forgotten -- this is the only path in
      // that doesn't require already knowing the PIN, unlike Settings' "Change PIN".
      await authAPI.login({ email: user.email, password: resetPassword });
    } catch (error) {
      Alert.alert('Incorrect Password', 'Please try again');
      setResetLoading(false);
      return;
    }

    try {
      await familyAPI.update({ pin: resetNewPin });
      closeResetModal();
      setParentUnlocked(true);
      router.replace('/(parent)');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset PIN. Please try again.');
    } finally {
      setResetLoading(false);
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
        <Text style={styles.subtitle}>Enter your 6-digit PIN</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.primary }]}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          placeholder="• • • • • •"
          placeholderTextColor="#999"
        />

        <ClayPressable
          style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary)]}
          onPress={handleVerify}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </ClayPressable>

        <TouchableOpacity onPress={() => setShowResetModal(true)} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showResetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }, getClayShadow(colors.primary)]}>
            <Text style={styles.modalTitle}>Reset PIN</Text>
            <Text style={styles.modalSubtitle}>
              Enter your account password to set a new PIN.
            </Text>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.primary }]}
              placeholder="Account password"
              placeholderTextColor="#999"
              value={resetPassword}
              onChangeText={setResetPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.modalInput, { borderColor: colors.primary }]}
              placeholder="New 6-digit PIN"
              placeholderTextColor="#999"
              value={resetNewPin}
              onChangeText={setResetNewPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <TextInput
              style={[styles.modalInput, { borderColor: colors.primary }]}
              placeholder="Confirm new PIN"
              placeholderTextColor="#999"
              value={resetConfirmPin}
              onChangeText={setResetConfirmPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeResetModal}
                disabled={resetLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <ClayPressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleResetPin}
                disabled={resetLoading}
              >
                <Text style={styles.modalButtonText}>{resetLoading ? 'Resetting…' : 'Reset PIN'}</Text>
              </ClayPressable>
            </View>
          </View>
        </View>
      </Modal>
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
    fontFamily: FONTS.headingBold,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#ccc',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
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
    borderRadius: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  backButton: {
    marginTop: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  forgotButton: {
    marginTop: 20,
    padding: 8,
  },
  forgotText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: FONTS.headingBold,
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: '#ccc',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.headingSemiBold,
  },
});
