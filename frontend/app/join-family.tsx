import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { familyAPI } from '../src/api/client';
import { useAppStore, useAuthStore } from '../src/stores';
import { getThemeColors, getClayShadow, FONTS } from '../src/constants';
import { ClayPressable } from '../src/utils/animations';
import type { Theme } from '../src/types';

export default function JoinFamily() {
  const router = useRouter();
  const { setCurrentChild, setTheme } = useAppStore();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'code' | 'name'>('code');
  const [familyCode, setFamilyCode] = useState('');
  const [petName, setPetName] = useState('');
  const [familyInfo, setFamilyInfo] = useState<{ family_id: string; family_name: string; theme: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const colors = getThemeColors('football');

  const handleVerifyCode = async () => {
    const code = familyCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter a valid family code');
      return;
    }

    setLoading(true);
    try {
      const result = await familyAPI.verifyCode(code);
      setFamilyInfo(result);
      setStep('name');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Invalid or expired family code';
      Alert.alert('Code Error', detail);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!petName.trim()) {
      Alert.alert('Error', 'Please enter a pet name');
      return;
    }

    setLoading(true);
    try {
      const result = await familyAPI.joinChild(familyCode.trim().toUpperCase(), petName.trim());

      // Store the JWT token so child API calls are authenticated, going through the
      // auth store (not raw AsyncStorage) so in-memory auth state stays consistent.
      if (result.access_token && result.user) {
        await setAuth(result.user, result.access_token);
      }

      // Set the child in the app store
      setCurrentChild({
        id: result.child_id,
        name: petName.trim(),
        avatar: '👦',
        family_id: result.family_id,
        created_at: new Date().toISOString(),
      });

      if (familyInfo?.theme) {
        setTheme(familyInfo.theme as Theme);
      }

      Alert.alert(
        'Welcome! 🎉',
        `You joined ${familyInfo?.family_name || 'the family'}!`,
        [{ text: 'Let\'s Go!', onPress: () => router.replace('/(child)') }]
      );
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to join family';
      Alert.alert('Error', detail);
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
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (step === 'name') {
            setStep('code');
          } else {
            router.back();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {step === 'code' ? (
          /* Step 1: Enter Family Code */
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🏠</Text>
            </View>
            <Text style={styles.title}>Join Your Family</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code your parent shared with you
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="ABCDEF"
              placeholderTextColor="#666"
              value={familyCode}
              onChangeText={(text) => setFamilyCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              textAlign="center"
              autoFocus
            />

            <ClayPressable
              style={[styles.button, { backgroundColor: '#4A9B6B' }, getClayShadow('#4A9B6B'), (!familyCode.trim() || loading) && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={!familyCode.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </ClayPressable>

            <Text style={styles.hint}>
              Codes expire after 60 minutes.{'\n'}Ask your parent if you need a new one.
            </Text>
          </View>
        ) : (
          /* Step 2: Enter Pet Name */
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🎉</Text>
            </View>
            <Text style={styles.title}>Almost There!</Text>
            <Text style={styles.subtitle}>
              Joining{' '}
              <Text style={styles.familyName}>{familyInfo?.family_name}</Text>
            </Text>

            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Your pet name or nickname"
              placeholderTextColor="#666"
              value={petName}
              onChangeText={setPetName}
              autoFocus
            />
            <Text style={styles.privacyNote}>
              Use a nickname for your privacy — no real names needed!
            </Text>

            <ClayPressable
              style={[styles.button, { backgroundColor: '#D4845C' }, getClayShadow('#D4845C'), (!petName.trim() || loading) && styles.buttonDisabled]}
              onPress={handleJoinFamily}
              disabled={!petName.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Join Family</Text>
              )}
            </ClayPressable>
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
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  familyName: {
    color: '#D4845C',
    fontFamily: FONTS.bodyBold,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    fontFamily: FONTS.headingSemiBold,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderColor: '#4A9B6B',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontSize: 32,
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 24,
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderColor: '#D4845C',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    fontFamily: FONTS.body,
    color: '#ffffff',
    marginBottom: 8,
  },
  privacyNote: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: '#7ec8e3',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  hint: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
