import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';

export default function ForgotPassword() {
  const router = useRouter();
  const colors = getThemeColors('gaming');

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(trimmedEmail);
      setStep('code');
      Alert.alert(
        'Code Sent',
        'If an account exists with this email, a 6-digit reset code has been sent. Check your inbox.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.resetPassword(email.trim().toLowerCase(), code, newPassword);
      Alert.alert(
        'Password Reset!',
        result.message,
        [{ text: 'Sign In', onPress: () => router.replace('/auth/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'code') setStep('email');
            else router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {step === 'email' ? (
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter the email linked to your parent account and we'll send a 6-digit reset code.
            </Text>

            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, (!email.trim() || loading) && styles.disabled]}
              onPress={handleSendCode}
              disabled={!email.trim() || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name="key" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <TextInput
              style={[styles.codeInput, { borderColor: colors.primary }]}
              placeholder="000000"
              placeholderTextColor="#555"
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
            />

            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="New password (min 6 chars)"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="Confirm new password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSendCode()}>
              <Text style={styles.resendText}>Didn't get the code? Resend</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: '#D4845C',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#ffffff',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 8,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  resendText: {
    color: '#D4845C',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
});
