import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, Redirect } from 'expo-router';
import { useAppStore } from '../../src/stores';
import { progressAPI, cheersAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';
import { hapticLight } from '../../src/utils/haptics';
import { AnimatedProgress } from '../../src/utils/animations';
import type { Progress, CheerMessage } from '../../src/types';

export default function ChildHome() {
  const router = useRouter();
  const { currentChild, theme } = useAppStore();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [cheers, setCheers] = useState<CheerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, [currentChild]);

  const loadData = async () => {
    if (!currentChild) return;
    
    try {
      const [progressData, cheersData] = await Promise.all([
        progressAPI.get(currentChild.id),
        cheersAPI.get(currentChild.id),
      ]);
      setProgress(progressData);
      setCheers(cheersData.slice(0, 3));
    } catch (error) {
      Alert.alert('Error', 'Failed to load your progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (!currentChild) {
    return <Redirect href="/role-select" />;
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const earnedTrophies = progress?.trophies.filter(t => t.earned).length || 0;
  const nextReward = progress?.rewards.find(r => !r.unlocked);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {currentChild?.name}! 👋</Text>
          <TouchableOpacity onPress={() => { hapticLight(); router.push('/role-select'); }}>
            <Text style={styles.switchProfile}>Switch Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Level Card */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.levelCard, { backgroundColor: colors.card }]}>
          <Text style={styles.avatar}>{currentChild?.avatar}</Text>
          <View style={styles.levelInfo}>
            <Text style={styles.levelName}>{progress?.level.name}</Text>
            <AnimatedProgress
              progress={progress?.level.progress || 0}
              color={colors.primary}
              height={8}
            />
            <Text style={[styles.points, { marginTop: 8 }]}>{progress?.points || 0} points</Text>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>{progress?.today_tasks_count || 0}</Text>
            <Text style={styles.statLabel}>Tasks Today</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(140).springify()} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>{progress?.streak || 0} 🔥</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>{earnedTrophies}/8 🏆</Text>
            <Text style={styles.statLabel}>Trophies</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).springify()} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>{progress?.rewards.filter(r => r.unlocked).length || 0}</Text>
            <Text style={styles.statLabel}>Rewards Won</Text>
          </Animated.View>
        </View>

        {/* Next Reward */}
        {nextReward && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={styles.sectionTitle}>Next Reward</Text>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardIcon}>{nextReward.icon}</Text>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardName}>{nextReward.name}</Text>
                <Text style={styles.rewardDesc}>{nextReward.desc}</Text>
                <View style={styles.rewardProgress}>
                  <View
                    style={[
                      styles.rewardProgressFill,
                      { backgroundColor: colors.primary, width: `${nextReward.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.rewardPoints}>
                  {progress?.points || 0} / {nextReward.pts} points
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Cheers */}
        {cheers.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={styles.sectionTitle}>Recent Cheers 💬</Text>
            {cheers.map((cheer) => (
              <View key={cheer.id} style={styles.cheerCard}>
                <Text style={styles.cheerSender}>{cheer.sender_name}</Text>
                <Text style={styles.cheerMessage}>{cheer.message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchProfile: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  levelCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    alignItems: 'center',
  },
  avatar: {
    fontSize: 64,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  points: {
    fontSize: 16,
    color: '#ccc',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
  },
  section: {
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    gap: 16,
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
    marginBottom: 12,
  },
  rewardProgress: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  rewardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardPoints: {
    fontSize: 14,
    color: '#ccc',
  },
  cheerCard: {
    marginBottom: 12,
  },
  cheerSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cheerMessage: {
    fontSize: 14,
    color: '#ccc',
  },
});
