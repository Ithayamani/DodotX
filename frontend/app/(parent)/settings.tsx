import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Share, Image, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuthStore, useAppStore } from '../../src/stores';
import { familyAPI, aiAPI } from '../../src/api/client';
import { getThemeColors, THEMES } from '../../src/constants';
import type { Theme, Family } from '../../src/types';

export default function ParentSettings() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { family, setFamily, theme, setTheme } = useAppStore();
  const [localFamily, setLocalFamily] = useState<Family | null>(family);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [parentProfilePic, setParentProfilePic] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAIThemeModal, setShowAIThemeModal] = useState(false);
  const [themeDescription, setThemeDescription] = useState('');
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    try {
      const familyData = await familyAPI.get();
      setLocalFamily(familyData);
      setFamily(familyData);
      if (familyData.parent_profile_picture) {
        setParentProfilePic(familyData.parent_profile_picture);
      }
    } catch (error) {
      console.error('Failed to load family:', error);
    }
  };

  const getCurrentMode = () => {
    if (!localFamily) return 'Regular';
    
    if (!localFamily.vacation_mode) return 'Regular Mode';
    
    const today = new Date().toISOString().split('T')[0];
    const start = localFamily.vacation_start_date;
    const end = localFamily.vacation_end_date;
    
    if (start && end && start <= today && today <= end) {
      return `Vacation Mode (until ${end})`;
    }
    
    return 'Regular Mode';
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

  const handlePickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingImage(true);
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await familyAPI.update({ parent_profile_picture: base64Image });
        setParentProfilePic(base64Image);
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload profile picture');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleGenerateAITheme = async () => {
    if (!themeDescription.trim()) {
      Alert.alert('Error', 'Please describe the theme you want');
      return;
    }

    setGeneratingTheme(true);
    try {
      const customTheme = await aiAPI.generateTheme(themeDescription.trim());
      
      // Save to family
      await familyAPI.update({ custom_theme: customTheme });
      
      const updatedFamily = { ...localFamily!, custom_theme: customTheme };
      setLocalFamily(updatedFamily);
      setFamily(updatedFamily);
      setShowAIThemeModal(false);
      setThemeDescription('');
      
      Alert.alert(
        'Theme Generated!',
        `"${customTheme.name}" has been created and saved! You can apply it from the theme section.`
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate theme');
    } finally {
      setGeneratingTheme(false);
    }
  };

  const handleEnableVacationMode = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextWeek.toISOString().split('T')[0]);
    setShowVacationModal(true);
  };

  const handleToggleVacationMode = async (enabled: boolean) => {
    if (enabled) {
      handleEnableVacationMode();
    } else {
      setSavingMode(true);
      try {
        await familyAPI.update({
          vacation_mode: false,
          vacation_start_date: null as any,
          vacation_end_date: null as any,
        });
        
        const updatedFamily = {
          ...localFamily!,
          vacation_mode: false,
          vacation_start_date: undefined,
          vacation_end_date: undefined,
        };
        setLocalFamily(updatedFamily);
        setFamily(updatedFamily);
        
        Alert.alert('Regular Mode Enabled!', 'Daily tasks are now active');
      } catch (error) {
        Alert.alert('Error', 'Failed to switch mode');
      } finally {
        setSavingMode(false);
      }
    }
  };

  const handleSaveVacationMode = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please enter both start and end dates');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }

    try {
      await familyAPI.update({
        vacation_mode: true,
        vacation_start_date: startDate,
        vacation_end_date: endDate,
      });
      
      const updatedFamily = {
        ...localFamily!,
        vacation_mode: true,
        vacation_start_date: startDate,
        vacation_end_date: endDate,
      };
      setLocalFamily(updatedFamily);
      setFamily(updatedFamily);
      setShowVacationModal(false);
      
      Alert.alert(
        'Vacation Mode Enabled! 🏝️',
        `Vacation tasks active from ${startDate} to ${endDate}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to enable vacation mode');
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
        message: `Join our DoneDash family! \n\nFamily: ${localFamily.name}\nCode: ${localFamily.code}\n\nDownload DoneDash and enter this code to join!`,
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

  const handleRegenerateCode = async () => {
    try {
      const result = await familyAPI.regenerateCode();
      const updatedFamily = { ...localFamily!, code: result.code, code_generated_at: result.generated_at };
      setLocalFamily(updatedFamily);
      setFamily(updatedFamily);
      Alert.alert('New Code Generated!', `Your new family code is: ${result.code}\nIt expires in 60 minutes.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate code');
    }
  };

  const getCodeExpiryInfo = () => {
    if (!localFamily?.code_generated_at) return { expired: false, minutesLeft: 60 };
    const generatedAt = new Date(localFamily.code_generated_at).getTime();
    const expiresAt = generatedAt + (60 * 60 * 1000); // 60 minutes
    const now = Date.now();
    const minutesLeft = Math.max(0, Math.ceil((expiresAt - now) / (60 * 1000)));
    return { expired: minutesLeft <= 0, minutesLeft };
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Picture Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handlePickProfileImage} activeOpacity={0.7} disabled={uploadingImage}>
              <View style={[styles.profileImageContainer, { borderColor: colors.primary }]}>
                {uploadingImage ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : parentProfilePic ? (
                  <Image source={{ uri: parentProfilePic }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Ionicons name="person" size={48} color="#999" />
                  </View>
                )}
                <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.profileHint}>Tap to change your profile picture</Text>
          </View>
        </View>

        {/* Mode Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Task Mode</Text>
          
          <View style={styles.modeToggleRow}>
            <View style={styles.modeToggleInfo}>
              <Text style={styles.modeToggleIcon}>
                {localFamily?.vacation_mode ? '🏝️' : '🏠'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeToggleLabel}>
                  {localFamily?.vacation_mode ? 'Vacation Mode' : 'Regular Mode'}
                </Text>
                <Text style={styles.modeToggleDesc}>
                  {localFamily?.vacation_mode
                    ? `Active until ${localFamily?.vacation_end_date || 'N/A'}`
                    : 'Daily tasks active'}
                </Text>
              </View>
            </View>
            {savingMode ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={localFamily?.vacation_mode || false}
                onValueChange={handleToggleVacationMode}
                trackColor={{ false: '#555', true: '#ff9800' }}
                thumbColor={localFamily?.vacation_mode ? '#fff' : '#ccc'}
              />
            )}
          </View>

          {localFamily?.vacation_mode && (
            <TouchableOpacity
              style={[styles.modeButton, { backgroundColor: '#ff9800' }]}
              onPress={handleEnableVacationMode}
              activeOpacity={0.7}
            >
              <Text style={styles.modeButtonText}>Edit Vacation Dates</Text>
            </TouchableOpacity>
          )}
        </View>

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
                activeOpacity={0.7}
              >
                <Text style={styles.themeEmoji}>{t.icon}</Text>
                <Text style={styles.themeLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.aiThemeButton, { borderColor: colors.primary }]}
            onPress={() => setShowAIThemeModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.aiThemeButtonText, { color: colors.primary }]}>
              Generate Custom Theme with AI
            </Text>
          </TouchableOpacity>
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

        {/* Family Invite Code Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Family Invite Code</Text>
          
          {(() => {
            const { expired, minutesLeft } = getCodeExpiryInfo();
            return (
              <View style={styles.codeSection}>
                <View style={styles.codeDisplay}>
                  <Text style={[styles.codeText, expired && styles.codeExpired]}>
                    {localFamily?.code || '------'}
                  </Text>
                  {expired ? (
                    <View style={styles.expiredBadge}>
                      <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                    </View>
                  ) : (
                    <Text style={styles.codeTimer}>
                      {minutesLeft} min left
                    </Text>
                  )}
                </View>
                
                <Text style={styles.codeHint}>
                  Share this code with family members to join. Codes expire after 60 minutes for security.
                </Text>

                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={[styles.codeActionButton, { backgroundColor: colors.primary }]}
                    onPress={handleShareFamilyCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.codeActionText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.codeActionButton, { backgroundColor: expired ? '#ff9800' : '#555' }]}
                    onPress={handleRegenerateCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.codeActionText}>
                      {expired ? 'Generate New Code' : 'Regenerate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
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

      {/* AI Theme Generator Modal */}
      <Modal visible={showAIThemeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
              <Text style={styles.modalTitle}>AI Theme Generator</Text>
            </View>
            <Text style={styles.modalDesc}>
              Describe the theme you want and AI will create a custom color palette for your app!
            </Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder='e.g. "Sunset beach vibes" or "Space galaxy purple"'
              placeholderTextColor="#999"
              value={themeDescription}
              onChangeText={setThemeDescription}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAIThemeModal(false);
                  setThemeDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleGenerateAITheme}
                disabled={generatingTheme}
              >
                {generatingTheme ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Generate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vacation Mode Modal */}
      <Modal visible={showVacationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>🏝️ Vacation Mode</Text>
            <Text style={styles.modalDesc}>Set the dates for vacation mode. Vacation tasks will be shown instead of daily tasks during this period.</Text>
            
            <Text style={styles.inputLabel}>Start Date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={endDate}
              onChangeText={setEndDate}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowVacationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff9800' }]}
                onPress={handleSaveVacationMode}
              >
                <Text style={styles.modalButtonText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  // Profile Picture Styles
  profileSection: {
    alignItems: 'center',
    gap: 12,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileHint: {
    fontSize: 13,
    color: '#aaa',
  },
  // Mode Toggle Styles
  modeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modeToggleIcon: {
    fontSize: 32,
  },
  modeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modeToggleDesc: {
    fontSize: 13,
    color: '#aaa',
  },
  modeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIcon: {
    fontSize: 40,
  },
  modeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modeDesc: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  modeButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // AI Theme Button
  aiThemeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  aiThemeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
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
  // Family Code Styles
  codeSection: {
    gap: 12,
  },
  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  codeExpired: {
    opacity: 0.4,
    textDecorationLine: 'line-through',
  },
  codeTimer: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  expiredBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  codeHint: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  codeActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  codeActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
