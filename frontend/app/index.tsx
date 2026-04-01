import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores';
import { getThemeColors } from '../src/constants';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Check if user has completed onboarding
        if (!user.family_id) {
          router.replace('/onboarding');
        }
      }
    }
  }, [isAuthenticated, isLoading, user]);

  const colors = getThemeColors('football');

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.logo}>⭐</Text>
        <Text style={styles.title}>KidQuest</Text>
        <Text style={styles.tagline}>Daily tasks. Epic rewards. Family fun.</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutline, { borderColor: colors.primary }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.buttonTextOutline, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>Join as Visitor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonOutline: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonTextOutline: {
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
  },
  linkText: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.8,
  },
});
