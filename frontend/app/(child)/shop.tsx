import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Redirect } from 'expo-router';
import { useAppStore } from '../../src/stores';
import { progressAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';
import { AnimatedProgress } from '../../src/utils/animations';
import type { RewardStatus } from '../../src/types';

export default function ChildShop() {
  const { currentChild, theme } = useAppStore();
  const [rewards, setRewards] = useState<RewardStatus[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, [currentChild]);

  const loadData = async () => {
    if (!currentChild) return;
    
    try {
      const progressData = await progressAPI.get(currentChild.id);
      setRewards(progressData.rewards);
      setPoints(progressData.points);
    } catch (error) {
      Alert.alert('Error', 'Failed to load rewards');
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

  const unlockedCount = rewards.filter(r => r.unlocked).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reward Shop</Text>
          <View style={[styles.pointsBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.pointsText}>{points} points</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statsText}>{unlockedCount} rewards unlocked! 🎉</Text>
        </View>

        <View style={styles.rewardsList}>
          {rewards.map((reward, index) => (
            <Animated.View
              key={reward.id}
              entering={FadeInDown.delay(index * 80).duration(300).springify()}
            >
              <View
                style={[
                  styles.rewardCard,
                  { backgroundColor: colors.card },
                  !reward.unlocked && styles.rewardCardLocked,
                ]}
              >
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                {reward.unlocked && (
                  <View style={[styles.unlockedBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unlockedText}>WON!</Text>
                  </View>
                )}
                {!reward.unlocked && (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedIcon}>🔒</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.rewardInfo}>
                <Text style={[
                  styles.rewardName,
                  !reward.unlocked && styles.rewardNameLocked,
                ]}>
                  {reward.name}
                </Text>
                <Text style={styles.rewardDesc}>{reward.desc}</Text>
                
                <View style={styles.progressContainer}>
                  <AnimatedProgress
                    progress={Math.min(reward.progress, 100)}
                    color={colors.primary}
                    height={8}
                  />
                  <Text style={styles.progressText}>
                    {points} / {reward.pts} pts
                  </Text>
                </View>
              </View>
            </View>
            </Animated.View>
          ))}
        </View>

        {rewards.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>No rewards yet</Text>
            <Text style={styles.emptySubtext}>Ask your parents to add some!</Text>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  rewardsList: {
    gap: 16,
  },
  rewardCard: {
    padding: 20,
    borderRadius: 16,
  },
  rewardCardLocked: {
    opacity: 0.7,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rewardIcon: {
    fontSize: 48,
  },
  unlockedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  lockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedIcon: {
    fontSize: 24,
  },
  rewardInfo: {
    gap: 8,
  },
  rewardName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  rewardNameLocked: {
    color: '#999',
  },
  rewardDesc: {
    fontSize: 14,
    color: '#ccc',
  },
  progressContainer: {
    marginTop: 8,
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
  progressText: {
    fontSize: 12,
    color: '#ccc',
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
