import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/api/client';
import { getThemeColors, getClayShadow, FONTS } from '../../src/constants';
import { hapticSuccess, hapticError, hapticLight } from '../../src/utils/haptics';
import { ClayPressable } from '../../src/utils/animations';

// Password validation rules
function validatePassword(pw: string) {
  return {
    length: pw.length >= 8,
    number: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
}

export default function ForgotPassword() {
  const router = useRouter();
  const colors = getThemeColors('gaming');

  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const pwRules = useMemo(() => validatePassword(newPassword), [newPassword]);
  const allValid = pwRules.length && pwRules.number && pwRules.special;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(trimmedEmail);
      hapticSuccess();
      setStep('code');
      Alert.alert('Code Sent', 'Check your email inbox for a 6-digit reset code.');
    } catch (error: any) {
      hapticError();
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
    if (!allValid) {
      Alert.alert('Error', 'Password does not meet all requirements');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email.trim().toLowerCase(), code, newPassword);
      hapticSuccess();
      setStep('done');
    } catch (error: any) {
      hapticError();
      const detail = error.response?.data?.detail || 'Failed to reset password';
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
    }
  };

  // Success screen after reset
  if (step === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneContent}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(0,229,160,0.12)' }]}>  
            <Ionicons name="checkmark-circle" size={48} color="#00E5A0" />
          </View>
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been updated.{'\n'}You can now sign in with your new password.
          </Text>
          <ClayPressable
            style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary)]}
            onPress={() => { hapticLight(); router.replace('/auth/login'); }}
          >
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </ClayPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticLight();
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

            <ClayPressable
              style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary), (!email.trim() || loading) && styles.disabled]}
              onPress={handleSendCode}
              disabled={!email.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Code</Text>
              )}
            </ClayPressable>
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

            {/* Password input with toggle */}
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.passwordInput, { borderColor: colors.primary }]}
                placeholder="New password"
                placeholderTextColor="#666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Password strength rules */}
            {newPassword.length > 0 && (
              <View style={styles.rulesBox}>
                <RuleItem label="At least 8 characters" met={pwRules.length} />
                <RuleItem label="At least 1 number" met={pwRules.number} />
                <RuleItem label="At least 1 special character (!@#$...)" met={pwRules.special} />
              </View>
            )}

            <TextInput
              style={[styles.input, { borderColor: passwordsMatch ? '#00E5A0' : (confirmPassword.length > 0 ? '#C47070' : colors.primary) }]}
              placeholder="Confirm new password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />

            <ClayPressable
              style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary), (loading || !allValid || !passwordsMatch || code.length !== 6) && styles.disabled]}
              onPress={handleResetPassword}
              disabled={loading || !allValid || !passwordsMatch || code.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </ClayPressable>

            <TouchableOpacity onPress={() => { hapticLight(); handleSendCode(); }}>
              <Text style={styles.resendText}>Didn't get the code? Resend</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RuleItem({ label, met }: { label: string; met: boolean }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={met ? '#00E5A0' : '#555'}
      />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
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
    paddingBottom: 40,
    gap: 14,
  },
  doneContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: '#D4845C',
    fontFamily: FONTS.bodyBold,
  },
  input: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#ffffff',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 28,
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    letterSpacing: 8,
  },
  passwordRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#ffffff',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 8,
  },
  rulesBox: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: '#888',
  },
  ruleTextMet: {
    color: '#00E5A0',
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: FONTS.headingSemiBold,
  },
  resendText: {
    color: '#D4845C',
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
});
