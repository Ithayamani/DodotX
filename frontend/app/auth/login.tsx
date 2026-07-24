import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/api/client';
import { useAuthStore } from '../../src/stores';
import { getThemeColors, getClayShadow, FONTS } from '../../src/constants';
import { ClayPressable } from '../../src/utils/animations';

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = getThemeColors('football');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      await setAuth(response.user, response.access_token);
      
      if (response.user.family_id) {
        router.replace('/role-select');
      } else {
        router.replace('/onboarding');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: colors.primary }]}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { borderColor: colors.primary }]}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <ClayPressable
            style={[styles.button, { backgroundColor: colors.primary }, getClayShadow(colors.primary)]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </ClayPressable>

          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
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
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    fontFamily: FONTS.body,
    borderWidth: 2,
  },
  button: {
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  linkText: {
    color: '#fff',
    fontFamily: FONTS.body,
    textAlign: 'center',
    marginTop: 8,
  },
  forgotText: {
    color: '#D4845C',
    fontFamily: FONTS.bodyBold,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 4,
  },
});
