import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAppStore } from '../../src/stores';
import { tasksAPI, progressAPI, familyAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';
import type { Task } from '../../src/types';

export default function ChildTasks() {
  const { currentChild, family, theme } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [points, setPoints] = useState(0);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, [currentChild]);

  const loadData = async () => {
    if (!currentChild) return;
    
    try {
      const [tasksData, progressData, familyData] = await Promise.all([
        tasksAPI.getAll(),
        progressAPI.get(currentChild.id),
        familyAPI.get(),
      ]);
      
      const vacationMode = familyData.vacation_mode;
      const filteredTasks = tasksData.filter(task => {
        if (!task.active) return false;
        if (vacationMode) return task.modes.vacation;
        return task.modes.daily;
      });
      
      setTasks(filteredTasks);
      setCompletedToday(progressData.today_completions);
      setPoints(progressData.points);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTaskToggle = async (task: Task) => {
    if (!currentChild) return;
    
    const isCompleted = completedToday.includes(task.id);
    
    try {
      // Optimistic update
      if (isCompleted) {
        setCompletedToday(prev => prev.filter(id => id !== task.id));
        setPoints(prev => prev - task.pts);
      } else {
        setCompletedToday(prev => [...prev, task.id]);
        setPoints(prev => prev + task.pts);
        
        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show confetti
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      
      // API call
      const result = await tasksAPI.toggle(task.id, currentChild.id);
      setPoints(result.points);
      
    } catch (error) {
      console.error('Failed to toggle task:', error);
      // Revert optimistic update
      if (isCompleted) {
        setCompletedToday(prev => [...prev, task.id]);
      } else {
        setCompletedToday(prev => prev.filter(id => id !== task.id));
      }
      Alert.alert('Error', 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const todayPoints = tasks
    .filter(task => completedToday.includes(task.id))
    .reduce((sum, task) => sum + task.pts, 0);

  const isVacationMode = family?.vacation_mode || false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showConfetti && (
        <ConfettiCannon
          count={50}
          origin={{ x: 0, y: 0 }}
          fadeOut={true}
          autoStart={true}
          fallSpeed={2000}
        />
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Tasks</Text>
            <View style={[styles.pointsBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.pointsText}>{points} pts</Text>
            </View>
          </View>

          {/* Mode Indicator */}
          <View style={[
            styles.modeIndicator,
            { backgroundColor: isVacationMode ? '#ff9800' : colors.primary }
          ]}>
            <Text style={styles.modeIcon}>
              {isVacationMode ? '🏝️' : '🏠'}
            </Text>
            <Text style={styles.modeText}>
              {isVacationMode ? 'Vacation Mode' : 'Regular Mode'}
            </Text>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statsText}>
              {completedToday.length} / {tasks.length} completed today
            </Text>
            <Text style={styles.statsSubtext}>+{todayPoints} points earned</Text>
          </View>

          {/* Tasks */}
          <View style={styles.tasksList}>
            {tasks.map((task) => {
              const isCompleted = completedToday.includes(task.id);
              
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    { backgroundColor: colors.card },
                    isCompleted && styles.taskCardCompleted,
                  ]}
                  onPress={() => handleTaskToggle(task)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    isCompleted && { backgroundColor: colors.primary },
                  ]}>
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  
                  <Text style={styles.taskIcon}>{task.icon}</Text>
                  
                  <View style={styles.taskInfo}>
                    <Text style={[
                      styles.taskTitle,
                      isCompleted && styles.taskTitleCompleted,
                    ]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskCategory}>{task.cat}</Text>
                  </View>
                  
                  <View style={[styles.pointsBadgeSmall, { backgroundColor: colors.primary }]}>
                    <Text style={styles.pointsBadgeText}>{task.pts}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No tasks for today!</Text>
              <Text style={styles.emptySubtext}>Check back tomorrow</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modeIcon: {
    fontSize: 20,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#ccc',
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
  taskCardCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskCategory: {
    fontSize: 12,
    color: '#ccc',
    textTransform: 'capitalize',
  },
  pointsBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
});
