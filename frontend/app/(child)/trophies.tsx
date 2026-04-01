import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAppStore } from '../../src/stores';
import { progressAPI } from '../../src/api/client';
import { getThemeColors } from '../../src/constants';
import type { Trophy } from '../../src/types';

export default function ChildTrophies() {
  const { currentChild, theme } = useAppStore();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
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
      setTrophies(progressData.trophies);
    } catch (error) {
      console.error('Failed to load trophies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const earnedCount = trophies.filter(t => t.earned).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Trophy Cabinet</Text>
          <Text style={styles.subtitle}>{earnedCount} / {trophies.length} earned</Text>
        </View>

        <View style={styles.grid}>
          {trophies.map((trophy) => (
            <View
              key={trophy.id}
              style={[
                styles.trophyCard,
                { backgroundColor: colors.card },
                !trophy.earned && styles.trophyCardLocked,
              ]}
            >
              <View style={styles.trophyIconContainer}>
                <Text style={[
                  styles.trophyIcon,
                  !trophy.earned && styles.trophyIconLocked,
                ]}>
                  {trophy.icon}
                </Text>
                {trophy.earned && (
                  <View style={[styles.earnedBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.earnedStar}>🌟</Text>
                  </View>
                )}
              </View>
              
              <Text style={[
                styles.trophyName,
                !trophy.earned && styles.trophyNameLocked,
              ]}>
                {trophy.name}
              </Text>
              
              <Text style={styles.trophyCondition}>
                {trophy.condition}
              </Text>
              
              {!trophy.earned && (
                <View style={styles.lockIcon}>
                  <Text style={styles.lockEmoji}>🔒</Text>
                </View>
              )}
            </View>
          ))}
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trophyCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 180,
  },
  trophyCardLocked: {
    opacity: 0.5,
  },
  trophyIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  trophyIcon: {
    fontSize: 56,
  },
  trophyIconLocked: {
    opacity: 0.3,
  },
  earnedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedStar: {
    fontSize: 16,
  },
  trophyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  trophyNameLocked: {
    color: '#999',
  },
  trophyCondition: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  lockIcon: {
    marginTop: 8,
  },
  lockEmoji: {
    fontSize: 20,
  },
});
