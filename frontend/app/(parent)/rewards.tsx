import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores';
import { rewardsAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';
import type { Reward } from '../../src/types';

export default function ParentRewards() {
  const theme = useAppStore((state) => state.theme);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎁');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const rewardsData = await rewardsAPI.getAll();
      setRewards(rewardsData);
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

  const resetForm = () => {
    setName('');
    setIcon('🎁');
    setPoints('');
    setDescription('');
    setEditingReward(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setName(reward.name);
    setIcon(reward.icon);
    setPoints(reward.pts.toString());
    setDescription(reward.desc);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a reward name');
      return;
    }

    const pts = parseInt(points);
    if (isNaN(pts) || pts < 1) {
      Alert.alert('Error', 'Points must be at least 1');
      return;
    }

    try {
      const rewardData = {
        name: name.trim(),
        icon,
        pts,
        desc: description.trim(),
      };

      if (editingReward) {
        await rewardsAPI.update(editingReward.id, rewardData);
        Alert.alert('Success', 'Reward updated!');
      } else {
        await rewardsAPI.create(rewardData);
        Alert.alert('Success', 'Reward created!');
      }

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save reward');
    }
  };

  const handleDelete = (reward: Reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await rewardsAPI.delete(reward.id);
              loadData();
              Alert.alert('Success', 'Reward deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reward');
            }
          },
        },
      ]
    );
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
            <Text style={styles.title}>Rewards</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.rewardsList}>
            {rewards.map((reward) => (
              <View key={reward.id} style={[styles.rewardCard, { backgroundColor: colors.card }]}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardName}>{reward.name}</Text>
                  <Text style={styles.rewardDesc}>{reward.desc}</Text>
                  <View style={[styles.pointsBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.pointsText}>{reward.pts} points</Text>
                  </View>
                </View>

                <View style={styles.rewardActions}>
                  <TouchableOpacity onPress={() => handleEdit(reward)}>
                    <Ionicons name="pencil" size={20} color="#4a90e2" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(reward)}>
                    <Ionicons name="trash-outline" size={20} color="#C47070" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {rewards.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎁</Text>
              <Text style={styles.emptyText}>No rewards yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add a reward</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Reward Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={styles.modalTitle}>
                {editingReward ? 'Edit Reward' : 'Add Reward'}
              </Text>
              
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Reward Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.inputSmall, { borderColor: colors.primary }]}
                  placeholder="Icon"
                  placeholderTextColor="#999"
                  value={icon}
                  onChangeText={setIcon}
                  maxLength={2}
                />
                <TextInput
                  style={[styles.inputSmall, { borderColor: colors.primary }]}
                  placeholder="Points Required"
                  placeholderTextColor="#999"
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="number-pad"
                />
              </View>

              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Description"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  rewardIcon: {
    fontSize: 48,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  rewardActions: {
    flexDirection: 'row',
    gap: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
  },
  modalScrollContent: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputSmall: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
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
