import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, useAppStore } from '../../src/stores';
import { familyAPI } from '../../src/api/client';
import { getThemeColors, THEMES } from '../../src/constants';
import type { Theme, Family } from '../../src/types';

export default function ParentSettings() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { family, setFamily, theme, setTheme } = useAppStore();
  const [localFamily, setLocalFamily] = useState<Family | null>(family);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    try {
      const familyData = await familyAPI.get();
      setLocalFamily(familyData);
      setFamily(familyData);
    } catch (error) {
      console.error('Failed to load family:', error);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      await familyAPI.update({ theme: newTheme });
      setTheme(newTheme);
      Alert.alert('Success', 'Theme updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update theme');
    }
  };

  const handleVacationModeToggle = async () => {
    if (!localFamily) return;
    
    const newMode = !localFamily.vacation_mode;
    try {
      await familyAPI.update({ vacation_mode: newMode });
      const updatedFamily = { ...localFamily, vacation_mode: newMode };
      setLocalFamily(updatedFamily);
      setFamily(updatedFamily);
      
      Alert.alert(
        'Vacation Mode',
        newMode ? 'Vacation mode enabled! 🌴' : 'Daily mode enabled! 🏠'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle vacation mode');
    }
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    try {
      await familyAPI.update({ pin: newPin });
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Success', 'PIN updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update PIN');
    }
  };

  const handleShareFamilyCode = async () => {
    if (!localFamily) return;
    
    try {
      await Share.share({
        message: `Join our KidQuest family! \n\nFamily: ${localFamily.name}\nCode: ${localFamily.code}\n\nDownload KidQuest and enter this code to join!`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Family Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Family</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Family Name</Text>
            <Text style={styles.settingValue}>{localFamily?.name}</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Family Code</Text>
            <View style={styles.codeContainer}>
              <Text style={[styles.code, { backgroundColor: colors.primary }]}>
                {localFamily?.code}
              </Text>
              <TouchableOpacity onPress={handleShareFamilyCode}>
                <Ionicons name="share-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={handleVacationModeToggle}
          >
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonText}>
                {localFamily?.vacation_mode ? '🏠 Switch to Daily Mode' : '🌴 Enable Vacation Mode'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeGrid}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.themeButton,
                  { backgroundColor: getThemeColors(t.value as Theme).primary },
                  theme === t.value && styles.themeButtonSelected,
                ]}
                onPress={() => handleThemeChange(t.value as Theme)}
              >
                <Text style={styles.themeEmoji}>{t.icon}</Text>
                <Text style={styles.themeLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setShowPinModal(true)}
          >
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonText}>🔒 Change PIN</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.settingButton}
            onPress={handleLogout}
          >
            <View style={styles.settingButtonContent}>
              <Text style={[styles.settingButtonText, { color: '#ff4444' }]}>
                Sign Out
              </Text>
              <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/role-select')}
        >
          <Text style={styles.backText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>

      {/* Change PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>Change PIN</Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="New 4-digit PIN"
              placeholderTextColor="#999"
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="Confirm PIN"
              placeholderTextColor="#999"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setNewPin('');
                  setConfirmPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleChangePin}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  code: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    letterSpacing: 2,
  },
  settingButton: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  settingButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  themeButtonSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  themeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
