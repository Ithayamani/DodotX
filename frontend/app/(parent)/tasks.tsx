import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Switch } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores';
import { tasksAPI, aiAPI, childrenAPI } from '../../src/api/client';
import { getThemeColors, TASK_CATEGORIES } from '../../src/constants';
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy, hapticSelection } from '../../src/utils/haptics';
import type { Task, TaskCategory } from '../../src/types';

export default function ParentTasks() {
  const theme = useAppStore((state) => state.theme);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✓');
  const [points, setPoints] = useState('10');
  const [category, setCategory] = useState<TaskCategory>('chores');
  const [daily, setDaily] = useState(true);
  const [vacation, setVacation] = useState(false);
  const [active, setActive] = useState(true);
  
  // AI form state
  const [childAge, setChildAge] = useState('');
  const [interests, setInterests] = useState('');
  const [goals, setGoals] = useState('');
  const [aiSuggestions, setAISuggestions] = useState<any[]>([]);
  
  // Smart AI Panel state
  const [autoRoutineLoading, setAutoRoutineLoading] = useState(false);
  const [difficultyLoading, setDifficultyLoading] = useState(false);
  const [rewardSugLoading, setRewardSugLoading] = useState(false);
  const [difficultyResult, setDifficultyResult] = useState<any>(null);
  const [rewardSuggestions, setRewardSuggestions] = useState<any[]>([]);
  const [showSmartPanel, setShowSmartPanel] = useState(false);
  
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const tasksData = await tasksAPI.getAll();
      setTasks(tasksData);
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

  const handleAutoRoutines = async () => {
    hapticMedium();
    setAutoRoutineLoading(true);
    try {
      const result = await aiAPI.autoGenerateRoutines();
      await loadData();
      Alert.alert('Routines Created!', result.message || `${result.tasks?.length || 0} AI-generated routines added.`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to auto-generate routines');
    } finally {
      setAutoRoutineLoading(false);
    }
  };

  const handleAdjustDifficulty = async () => {
    setDifficultyLoading(true);
    try {
      const result = await aiAPI.adjustDifficulty();
      setDifficultyResult(result);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to analyze difficulty');
    } finally {
      setDifficultyLoading(false);
    }
  };

  const handleSuggestRewards = async () => {
    setRewardSugLoading(true);
    try {
      const result = await aiAPI.suggestRewards();
      setRewardSuggestions(result.suggestions || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to suggest rewards');
    } finally {
      setRewardSugLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setIcon('✓');
    setPoints('10');
    setCategory('chores');
    setDaily(true);
    setVacation(false);
    setActive(true);
    setEditingTask(null);
  };

  const handleAdd = () => {
    hapticLight();
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (task: Task) => {
    hapticLight();
    setEditingTask(task);
    setTitle(task.title);
    setIcon(task.icon);
    setPoints(task.pts.toString());
    setCategory(task.cat);
    setDaily(task.modes.daily);
    setVacation(task.modes.vacation);
    setActive(task.active);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const pts = parseInt(points);
    if (isNaN(pts) || pts < 1 || pts > 100) {
      Alert.alert('Error', 'Points must be between 1 and 100');
      return;
    }

    try {
      const taskData = {
        title: title.trim(),
        icon,
        pts,
        cat: category,
        modes: { daily, vacation },
        active,
      };

      if (editingTask) {
        await tasksAPI.update(editingTask.id, taskData);
        hapticSuccess();
        Alert.alert('Success', 'Task updated!');
      } else {
        await tasksAPI.create(taskData);
        hapticSuccess();
        Alert.alert('Success', 'Task created!');
      }

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save task');
    }
  };

  const handleDelete = (task: Task) => {
    hapticHeavy();
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksAPI.delete(task.id);
              loadData();
              Alert.alert('Success', 'Task deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleAISuggestions = async () => {
    const age = parseInt(childAge);
    if (isNaN(age) || age < 3 || age > 18) {
      Alert.alert('Error', 'Please enter a valid age (3-18)');
      return;
    }

    setAILoading(true);
    try {
      const suggestions = await aiAPI.suggestTasks({
        child_age: age,
        interests: interests.split(',').map(i => i.trim()).filter(Boolean),
        goals: goals,
        current_tasks_count: tasks.length,
      });
      
      setAISuggestions(suggestions);
      Alert.alert('Success', `Got ${suggestions.length} AI suggestions!`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to get AI suggestions');
    } finally {
      setAILoading(false);
    }
  };

  const handleAddAISuggestion = async (suggestion: any) => {
    try {
      await tasksAPI.create({
        title: suggestion.title,
        icon: suggestion.icon,
        pts: suggestion.pts,
        cat: suggestion.cat,
        modes: suggestion.modes,
      });
      
      setAISuggestions(prev => prev.filter(s => s.title !== suggestion.title));
      loadData();
      Alert.alert('Success', 'Task added from AI suggestion!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add task');
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
            <Text style={styles.title}>Tasks</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.aiButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAIModal(true)}
              >
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.aiButtonText}>AI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAdd}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Smart Panel */}
          <TouchableOpacity
            style={[styles.smartPanelToggle, { backgroundColor: colors.card }]}
            onPress={() => setShowSmartPanel(!showSmartPanel)}
            activeOpacity={0.7}
          >
            <View style={styles.smartPanelHeader}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={styles.smartPanelTitle}>AI Smart Assistant</Text>
            </View>
            <Ionicons name={showSmartPanel ? 'chevron-up' : 'chevron-down'} size={18} color="#aaa" />
          </TouchableOpacity>

          {showSmartPanel && (
            <View style={[styles.smartPanelContent, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.smartBtn, { borderColor: colors.primary }]}
                onPress={handleAutoRoutines}
                disabled={autoRoutineLoading}
                activeOpacity={0.7}
              >
                {autoRoutineLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="flash" size={20} color={colors.primary} />
                )}
                <View style={styles.smartBtnText}>
                  <Text style={styles.smartBtnLabel}>Auto-Generate Routines</Text>
                  <Text style={styles.smartBtnDesc}>AI creates daily routines for your family</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smartBtn, { borderColor: '#9B6DAE' }]}
                onPress={handleAdjustDifficulty}
                disabled={difficultyLoading}
                activeOpacity={0.7}
              >
                {difficultyLoading ? (
                  <ActivityIndicator size="small" color="#9B6DAE" />
                ) : (
                  <Ionicons name="trending-up" size={20} color="#9B6DAE" />
                )}
                <View style={styles.smartBtnText}>
                  <Text style={styles.smartBtnLabel}>Adjust Difficulty</Text>
                  <Text style={styles.smartBtnDesc}>Adapts tasks based on completion behavior</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smartBtn, { borderColor: '#D4924A' }]}
                onPress={handleSuggestRewards}
                disabled={rewardSugLoading}
                activeOpacity={0.7}
              >
                {rewardSugLoading ? (
                  <ActivityIndicator size="small" color="#D4924A" />
                ) : (
                  <Ionicons name="gift" size={20} color="#D4924A" />
                )}
                <View style={styles.smartBtnText}>
                  <Text style={styles.smartBtnLabel}>Suggest Rewards</Text>
                  <Text style={styles.smartBtnDesc}>AI picks rewards your kids will love</Text>
                </View>
              </TouchableOpacity>

              {difficultyResult && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>Behavior Analysis</Text>
                  <Text style={styles.resultText}>{difficultyResult.analysis}</Text>
                  {difficultyResult.suggestions?.map((s: any, i: number) => (
                    <View key={i} style={styles.suggestionRow}>
                      <Text style={styles.suggestionIcon}>{s.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{s.action}: {s.title} ({s.pts} pts)</Text>
                        <Text style={styles.suggestionReason}>{s.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {rewardSuggestions.length > 0 && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>Reward Ideas</Text>
                  {rewardSuggestions.map((r: any, i: number) => (
                    <View key={i} style={styles.suggestionRow}>
                      <Text style={styles.suggestionIcon}>{r.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{r.title} — {r.cost} pts</Text>
                        <Text style={styles.suggestionReason}>{r.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.tasksList}>
            {tasks.map((task, index) => (
              <Animated.View
                key={task.id}
                entering={FadeInDown.delay(index * 50).duration(250).springify()}
                layout={Layout.springify()}
              >
                <View style={[styles.taskCard, { backgroundColor: colors.card }]}>
                <Text style={styles.taskIcon}>{task.icon}</Text>
                
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskMetaText}>{task.pts} pts</Text>
                    <Text style={styles.taskDivider}>•</Text>
                    <Text style={styles.taskMetaText}>{task.cat}</Text>
                    <Text style={styles.taskDivider}>•</Text>
                    <Text style={styles.taskMetaText}>
                      {task.modes.daily && 'Daily'}
                      {task.modes.daily && task.modes.vacation && ' & '}
                      {task.modes.vacation && 'Vacation'}
                    </Text>
                  </View>
                </View>

                <View style={styles.taskActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(task)} activeOpacity={0.6}>
                    <Ionicons name="pencil" size={20} color="#5A9FCF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(task)} activeOpacity={0.6}>
                    <Ionicons name="trash-outline" size={20} color="#C47070" />
                  </TouchableOpacity>
                </View>
              </View>
              </Animated.View>
            ))}
          </View>

          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add or ✨ for AI suggestions</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Add Task'}
              </Text>
              
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Task Title"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Emoji Icon</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: colors.primary, fontSize: 28, textAlign: 'center' }]}
                    placeholder="🎯"
                    placeholderTextColor="#999"
                    value={icon}
                    onChangeText={(text) => {
                      // Take only the last emoji entered if user types multiple
                      if (text.length > 0) {
                        // Get the last character/emoji
                        const chars = [...text];
                        setIcon(chars[chars.length - 1]);
                      } else {
                        setIcon('');
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Points</Text>
                  <TextInput
                    style={[styles.inputSmall, { borderColor: colors.primary }]}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={points}
                    onChangeText={setPoints}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {TASK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      category === cat.value && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => { hapticSelection(); setCategory(cat.value as TaskCategory); }}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Daily Mode</Text>
                <Switch value={daily} onValueChange={setDaily} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Vacation Mode</Text>
                <Switch value={vacation} onValueChange={setVacation} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch value={active} onValueChange={setActive} />
              </View>

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

      {/* AI Suggestions Modal */}
      <Modal visible={showAIModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={32} color={colors.primary} />
                <Text style={styles.modalTitle}>AI Task Suggestions</Text>
              </View>
              
              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Child's Age"
                placeholderTextColor="#999"
                value={childAge}
                onChangeText={setChildAge}
                keyboardType="number-pad"
              />

              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Interests (comma separated)"
                placeholderTextColor="#999"
                value={interests}
                onChangeText={setInterests}
              />

              <TextInput
                style={[styles.input, { borderColor: colors.primary }]}
                placeholder="Goals (optional)"
                placeholderTextColor="#999"
                value={goals}
                onChangeText={setGoals}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleAISuggestions}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Generate Suggestions</Text>
                )}
              </TouchableOpacity>

              {aiSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                  {aiSuggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionCard}>
                      <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                        <Text style={styles.suggestionMeta}>
                          {suggestion.pts} pts • {suggestion.cat}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addSuggestionButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleAddAISuggestion(suggestion)}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { marginTop: 16 }]}
                onPress={() => {
                  setShowAIModal(false);
                  setAISuggestions([]);
                  setChildAge('');
                  setInterests('');
                  setGoals('');
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  taskIcon: {
    fontSize: 32,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskMetaText: {
    fontSize: 12,
    color: '#ccc',
  },
  taskDivider: {
    color: '#666',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Smart Panel Styles
  smartPanelToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  smartPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartPanelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  smartPanelContent: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 4,
    gap: 10,
  },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  smartBtnText: {
    flex: 1,
  },
  smartBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  smartBtnDesc: {
    fontSize: 12,
    color: '#888',
  },
  resultBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 18,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  suggestionIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ddd',
  },
  suggestionReason: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
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
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  suggestions: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 24,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: 12,
    color: '#ccc',
  },
  addSuggestionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
