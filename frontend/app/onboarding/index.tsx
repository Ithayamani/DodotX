import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { familyAPI, childrenAPI } from '../../src/api/client';
import { useAppStore, useAuthStore } from '../../src/stores';
import { getThemeColors, THEMES, AVATARS } from '../../src/constants';
import type { Theme } from '../../src/types';

export default function Onboarding() {
  const router = useRouter();
  const setFamily = useAppStore((state) => state.setFamily);
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [childName, setChildName] = useState('');
  const [childAvatar, setChildAvatar] = useState('👦');
  const [theme, setTheme] = useState<Theme>('gaming');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = getThemeColors(theme);

  // Check if user already has a family
  useEffect(() => {
    const checkExistingFamily = async () => {
      if (user?.family_id) {
        try {
          const family = await familyAPI.get();
          setFamily(family);
          router.replace('/role-select');
        } catch (error) {
          // No existing family - continue
        }
      }
    };
    checkExistingFamily();
  }, [user]);

  const handleComplete = async () => {
    if (pin !== pinConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      // Try to create family
      try {
        const family = await familyAPI.create({ name: familyName, pin, theme });
        setFamily(family);
      } catch (familyError: any) {
        // A family already exists for this account (e.g. an earlier onboarding attempt
        // partially completed). Apply what was just entered on this screen to it instead
        // of silently keeping whatever PIN/theme happened to be set the first time --
        // otherwise the user believes the PIN they just typed is active when it isn't.
        if (familyError.response?.status === 400) {
          const existingFamily = await familyAPI.update({ name: familyName, pin, theme });
          setFamily(existingFamily);
        } else {
          throw familyError;
        }
      }

      // Create first child (if they don't have one already)
      try {
        await childrenAPI.create({ name: childName, avatar: childAvatar });
      } catch (childError: any) {
        // Child might already exist, that's okay
        // Child creation skipped
      }

      router.replace('/role-select');
    } catch (error: any) {
      Alert.alert('Setup Failed', error.response?.data?.detail || 'Could not complete setup');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Family & Child</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.primary }]}
        placeholder="Family Name"
        placeholderTextColor="#999"
        value={familyName}
        onChangeText={setFamilyName}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.primary }]}
        placeholder="Child's Pet Name / Nickname"
        placeholderTextColor="#999"
        value={childName}
        onChangeText={setChildName}
      />
      <Text style={styles.privacyNote}>
        Use a nickname or pet name for your child's privacy
      </Text>
      <Text style={styles.label}>Choose Avatar</Text>
      <View style={styles.avatarGrid}>
        {AVATARS.slice(0, 12).map((avatar) => (
          <TouchableOpacity
            key={avatar}
            style={[styles.avatarButton, childAvatar === avatar && { backgroundColor: colors.primary }]}
            onPress={() => setChildAvatar(avatar)}
          >
            <Text style={styles.avatarEmoji}>{avatar}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => setStep(2)}
        disabled={!familyName || !childName}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Theme</Text>
      <View style={styles.themeGrid}>
        {THEMES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.themeButton,
              { backgroundColor: getThemeColors(t.value as Theme).primary },
              theme === t.value && styles.themeButtonSelected
            ]}
            onPress={() => setTheme(t.value as Theme)}
          >
            <Text style={styles.themeEmoji}>{t.icon}</Text>
            <Text style={styles.themeLabel}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => setStep(3)}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Parent PIN</Text>
      <Text style={styles.description}>Create a 4-digit PIN to access parent settings</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.primary }]}
        placeholder="Enter 4-digit PIN"
        placeholderTextColor="#999"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
      />
      <TextInput
        style={[styles.input, { borderColor: colors.primary }]}
        placeholder="Confirm PIN"
        placeholderTextColor="#999"
        value={pinConfirm}
        onChangeText={setPinConfirm}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleComplete}
        disabled={loading || !pin || !pinConfirm}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Setup DodotX</Text>
        <Text style={styles.subtitle}>Step {step} of 3</Text>
      </View>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 4,
  },
  stepContent: {
    padding: 24,
    gap: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
  },
  privacyNote: {
    fontSize: 13,
    color: '#7ec8e3',
    fontStyle: 'italic',
    marginTop: -8,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeButton: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  themeButtonSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  themeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
