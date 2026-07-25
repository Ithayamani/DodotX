import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../src/utils/alert';
import { authAPI } from '../src/api/client';
import { useAppStore, useAuthStore } from '../src/stores';
import { getThemeColors, getClayShadow, FONTS } from '../src/constants';
import { ClayPressable } from '../src/utils/animations';

export default function ParentPassword() {
  const router = useRouter();
  const theme = useAppStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = getThemeColors(theme);

  const setParentUnlocked = useAppStore((state) => state.setParentUnlocked);

  const handleVerify = async () => {
    if (!password) {
      Alert.alert('Error', 'Enter your account password');
      return;
    }
    if (!user?.email) {
      Alert.alert('Error', 'Could not determine your account email. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Re-verifies identity via the account password itself, rather than a separate
      // PIN -- one less secret to remember, and it can't drift out of sync the way a
      // standalone PIN could.
      await authAPI.login({ email: user.email, password });
      setParentUnlocked(true);
      router.replace('/(parent)');
    } catch (error) {
      Alert.alert('Incorrect Password', 'Please try again');
      setPassword('');
    } finally {
      setLoading(false);
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
        <Text style={styles.subtitle}>Enter your account password</Text>

        <TextInput
          style={[styles.input, { borderColor: colors.primary }]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Password"
          placeholderTextColor="#999"
          onSubmitEditing={handleVerify}
        />

        <ClayPressable
          style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary)]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify'}</Text>
        </ClayPressable>

        <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
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
    padding: 18,
    fontSize: 18,
    fontFamily: FONTS.body,
    textAlign: 'center',
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
});
