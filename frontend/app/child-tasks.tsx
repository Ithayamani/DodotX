import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Alert } from '../src/utils/alert';
import { getErrorMessage } from '../src/utils/errorMessage';
import { useAppStore } from '../src/stores';
import { tasksAPI, progressAPI, familyAPI } from '../src/api/client';
import { getThemeColors, getClayShadow, FONTS } from '../src/constants';
import { AnimatedCheckmark, ClayPressable } from '../src/utils/animations';
import { isVacationActive } from '../src/utils/vacation';
import type { Task } from '../src/types';

export default function ChildTasksScreen() {
  const router = useRouter();
  const { childId, childName } = useLocalSearchParams<{ childId: string; childName?: string }>();
  const theme = useAppStore((state) => state.theme);
  const colors = getThemeColors(theme);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVacationMode, setIsVacationMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    if (!childId) return;
    try {
      const [tasksData, progressData, familyData] = await Promise.all([
        tasksAPI.getAll(),
        progressAPI.get(String(childId)),
        familyAPI.get(),
      ]);

      const vacationMode = isVacationActive(familyData);
      const filteredTasks = tasksData.filter((task) => {
        if (!task.active) return false;
        return vacationMode ? task.modes.vacation : task.modes.daily;
      });

      setTasks(filteredTasks);
      setCompletedToday(progressData.today_completions);
      setIsVacationMode(vacationMode);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to load tasks'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggle = async (task: Task) => {
    if (!childId) return;
    const isCompleted = completedToday.includes(task.id);

    // Optimistic update
    setCompletedToday((prev) => (isCompleted ? prev.filter((id) => id !== task.id) : [...prev, task.id]));

    try {
      await tasksAPI.toggle(task.id, String(childId));
    } catch (error) {
      // Revert on failure
      setCompletedToday((prev) => (isCompleted ? [...prev, task.id] : prev.filter((id) => id !== task.id)));
      Alert.alert('Error', getErrorMessage(error, 'Failed to update task'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {childName ? `${childName}'s Tasks` : 'Tasks'}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(parent)/tasks')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <View style={styles.content}>
            <View style={[
              styles.modeIndicator,
              { backgroundColor: isVacationMode ? '#D4924A' : colors.primary },
              getClayShadow(colors.primary),
            ]}>
              <Text style={styles.modeIcon}>{isVacationMode ? '🏝️' : '🏠'}</Text>
              <Text style={styles.modeText}>{isVacationMode ? 'Vacation Mode' : 'Regular Mode'}</Text>
            </View>

            <View style={[styles.statsCard, { backgroundColor: colors.card }, getClayShadow(colors.primary)]}>
              <Text style={styles.statsText}>{completedToday.length} / {tasks.length} completed today</Text>
              <Text style={styles.statsSubtext}>Tap a task to mark it done or open on {childName || 'their'} behalf</Text>
            </View>

            <View style={styles.tasksList}>
              {tasks.map((task, index) => {
                const isCompleted = completedToday.includes(task.id);
                return (
                  <Animated.View
                    key={task.id}
                    entering={FadeInDown.delay(index * 60).duration(300).springify()}
                    layout={Layout.springify()}
                  >
                    <ClayPressable
                      style={[
                        styles.taskCard,
                        { backgroundColor: colors.card },
                        getClayShadow(colors.primary),
                        isCompleted && styles.taskCardCompleted,
                      ]}
                      onPress={() => handleToggle(task)}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: colors.primary },
                        isCompleted && { backgroundColor: colors.primary },
                      ]}>
                        <AnimatedCheckmark visible={isCompleted} />
                      </View>
                      <Text style={styles.taskIcon}>{task.icon}</Text>
                      <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>{task.title}</Text>
                        <Text style={styles.taskCategory}>{task.cat}</Text>
                      </View>
                      <View style={[styles.pointsBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.pointsBadgeText}>{task.pts}</Text>
                      </View>
                    </ClayPressable>
                  </Animated.View>
                );
              })}
            </View>

            {tasks.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubtext}>Tap the edit icon above to add some</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: FONTS.headingSemiBold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16 },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 20,
  },
  modeIcon: { fontSize: 20 },
  modeText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#fff' },
  statsCard: {
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  statsText: { fontSize: 18, fontFamily: FONTS.headingSemiBold, color: '#fff', marginBottom: 4 },
  statsSubtext: { fontSize: 13, fontFamily: FONTS.body, color: '#ccc', textAlign: 'center' },
  tasksList: { gap: 12 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  taskCardCompleted: { opacity: 0.6 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: { fontSize: 32 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontFamily: FONTS.headingSemiBold, color: '#fff', marginBottom: 2 },
  taskTitleCompleted: { textDecorationLine: 'line-through' },
  taskCategory: { fontSize: 12, fontFamily: FONTS.body, color: '#ccc', textTransform: 'capitalize' },
  pointsBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pointsBadgeText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 20, fontFamily: FONTS.headingSemiBold, color: '#fff', marginBottom: 8 },
  emptySubtext: { fontSize: 14, fontFamily: FONTS.body, color: '#ccc' },
});
