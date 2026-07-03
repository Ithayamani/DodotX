import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/stores';
import { childrenAPI, progressAPI } from '../../src/api/client';
import { getThemeColors, AVATARS } from '../../src/constants';
import { hapticHeavy, hapticLight } from '../../src/utils/haptics';
import type { Child } from '../../src/types';

export default function ParentChildren() {
  const router = useRouter();
  const theme = useAppStore((state) => state.theme);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenProgress, setChildrenProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAvatar, setNewChildAvatar] = useState('👦');
  const [newChildAge, setNewChildAge] = useState('');
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const childrenData = await childrenAPI.getAll();
      setChildren(childrenData);
      
      // Load progress for each child
      const progressPromises = childrenData.map(child => 
        progressAPI.get(child.id).catch(() => null)
      );
      const progressResults = await Promise.all(progressPromises);
      
      const progressMap: Record<string, any> = {};
      childrenData.forEach((child, index) => {
        if (progressResults[index]) {
          progressMap[child.id] = progressResults[index];
        }
      });
      setChildrenProgress(progressMap);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      await childrenAPI.create({
        name: newChildName.trim(),
        avatar: newChildAvatar,
        age: newChildAge ? parseInt(newChildAge) : undefined,
      });
      
      setShowAddModal(false);
      setNewChildName('');
      setNewChildAvatar('👦');
      setNewChildAge('');
      loadData();
      
      Alert.alert('Success', 'Child added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add child');
    }
  };

  const handleDeleteChild = (child: Child) => {
    Alert.alert(
      'Delete Child',
      `Are you sure you want to remove ${child.name}? This will delete all their progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await childrenAPI.delete(child.id);
              loadData();
              Alert.alert('Success', 'Child removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove child');
            }
          },
        },
      ]
    );
  };

  const handlePickChildProfilePic = async (child: Child) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant photo library access.');
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
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await childrenAPI.update(child.id, { profile_picture: base64Image });
        loadData();
        Alert.alert('Success', `${child.name}'s photo updated!`);
      } catch (error) {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Children</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.childrenList}>
            {children.map((child) => {
              const progress = childrenProgress[child.id];
              
              return (
                <View key={child.id} style={[styles.childCard, { backgroundColor: colors.card }]}>
                  <TouchableOpacity onPress={() => handlePickChildProfilePic(child)} activeOpacity={0.7}>
                    <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
                      {child.profile_picture ? (
                        <Image source={{ uri: child.profile_picture }} style={styles.childProfileImage} />
                      ) : (
                        <Text style={styles.avatar}>{child.avatar}</Text>
                      )}
                      <View style={[styles.smallCameraIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="camera" size={10} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    {child.age && (
                      <Text style={styles.childAge}>Age: {child.age}</Text>
                    )}
                    
                    {progress && (
                      <View style={styles.stats}>
                        <Text style={styles.statText}>{progress.points} pts</Text>
                        <Text style={styles.statDivider}>•</Text>
                        <Text style={styles.statText}>{progress.streak} 🔥</Text>
                        <Text style={styles.statDivider}>•</Text>
                        <Text style={styles.statText}>
                          {progress.trophies.filter((t: any) => t.earned).length}/8 🏆
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => {
                      hapticHeavy();
                      handleDeleteChild(child);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#C47070" />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {children.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👶</Text>
              <Text style={styles.emptyText}>No children yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add a child</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/role-select')}
          >
            <Text style={styles.backText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Child Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>Add Child</Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="Child's Pet Name / Nickname"
              placeholderTextColor="#999"
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <Text style={styles.privacyNote}>Use a nickname for your child's privacy</Text>

            <TextInput
              style={[styles.input, { borderColor: colors.primary }]}
              placeholder="Age (optional)"
              placeholderTextColor="#999"
              value={newChildAge}
              onChangeText={setNewChildAge}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.slice(0, 12).map((avatar) => (
                <TouchableOpacity
                  key={avatar}
                  style={[
                    styles.avatarButton,
                    newChildAvatar === avatar && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setNewChildAvatar(avatar)}
                >
                  <Text style={styles.avatarEmoji}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewChildName('');
                  setNewChildAge('');
                  setNewChildAvatar('👦');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddChild}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
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
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childrenList: {
    gap: 12,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  avatar: {
    fontSize: 48,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  childProfileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  smallCameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  childAge: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#ccc',
  },
  statDivider: {
    color: '#666',
  },
  deleteButton: {
    padding: 14,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(196, 112, 112, 0.1)',
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(196, 112, 112, 0.3)',
    transform: [{ scale: 0.92 }],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
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
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  privacyNote: {
    fontSize: 12,
    color: '#7ec8e3',
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 8,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
