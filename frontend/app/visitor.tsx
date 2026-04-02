import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  SafeAreaView, ScrollView, RefreshControl, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { visitorAPI } from '../src/api/client';

const { width } = Dimensions.get('window');

interface ChildData {
  name: string;
  avatar: string;
  profile_picture: string | null;
  points: number;
  streak: number;
  perfect_days: number;
  level: { name: string; min: number; max: number; progress: number };
  trophies_count: number;
  tasks_done_today: number;
}

interface VisitorData {
  family_name: string;
  theme: string;
  vacation_mode: boolean;
  children: ChildData[];
  total_tasks: number;
  total_rewards: number;
}

export default function VisitorView() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'dashboard'>('code');
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<VisitorData | null>(null);

  const fetchVisitorData = async (code: string) => {
    const result = await visitorAPI.getView(code.trim().toUpperCase());
    setData(result);
    return result;
  };

  const handleVerifyCode = async () => {
    const code = familyCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter a valid family code');
      return;
    }
    setLoading(true);
    try {
      await fetchVisitorData(code);
      setStep('dashboard');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Invalid or expired family code';
      Alert.alert('Code Error', detail);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchVisitorData(familyCode);
    } catch {}
    setRefreshing(false);
  }, [familyCode]);

  if (step === 'code') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.codeContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="eye-outline" size={40} color="#7EB8DA" />
            </View>
            <Text style={styles.title}>Visitor View</Text>
            <Text style={styles.subtitle}>
              Enter the family code to view{'\n'}children's progress (read-only)
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="ABCDEF"
              placeholderTextColor="#555"
              value={familyCode}
              onChangeText={(t) => setFamilyCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              textAlign="center"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.viewButton, (!familyCode.trim() || loading) && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={!familyCode.trim() || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.viewButtonText}>View Family Progress</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Ask the parent for the family code.{'\n'}No account needed — just view.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Dashboard view
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('code')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerFamily}>{data?.family_name || 'Family'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="eye-outline" size={12} color="#7EB8DA" />
              <Text style={styles.badgeText}>Visitor View</Text>
            </View>
            {data?.vacation_mode && (
              <View style={[styles.badge, { backgroundColor: 'rgba(212,132,92,0.15)' }]}>
                <Text style={styles.badgeText2}>Vacation Mode</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7EB8DA" />}
      >
        {/* Family Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data?.total_tasks || 0}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data?.children?.length || 0}</Text>
            <Text style={styles.statLabel}>Kids</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data?.total_rewards || 0}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
        </View>

        {/* Children Progress Cards */}
        {data?.children?.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyText}>No children in this family yet</Text>
          </View>
        )}

        {data?.children?.map((child, index) => (
          <View key={index} style={styles.childCard}>
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{child.avatar}</Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childLevel}>{child.level?.name || 'Beginner'}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsValue}>{child.points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>

            {/* Level Progress Bar */}
            <View style={styles.levelBarContainer}>
              <View style={styles.levelBarBg}>
                <View
                  style={[styles.levelBarFill, { width: `${Math.min(child.level?.progress || 0, 100)}%` }]}
                />
              </View>
              <Text style={styles.levelProgressText}>
                {Math.round(child.level?.progress || 0)}%
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatIcon}>🔥</Text>
                <Text style={styles.quickStatValue}>{child.streak}</Text>
                <Text style={styles.quickStatLabel}>Streak</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatIcon}>✅</Text>
                <Text style={styles.quickStatValue}>{child.tasks_done_today}</Text>
                <Text style={styles.quickStatLabel}>Today</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatIcon}>⭐</Text>
                <Text style={styles.quickStatValue}>{child.perfect_days}</Text>
                <Text style={styles.quickStatLabel}>Perfect</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatIcon}>🏆</Text>
                <Text style={styles.quickStatValue}>{child.trophies_count}</Text>
                <Text style={styles.quickStatLabel}>Trophies</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={18} color="#7EB8DA" />
          <Text style={styles.infoNoteText}>
            This is a read-only view. Pull down to refresh.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  codeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(126,184,218,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#1c2128',
    borderWidth: 2,
    borderColor: '#7EB8DA',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 24,
  },
  viewButton: {
    width: '100%',
    backgroundColor: '#5A8FA8',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Dashboard styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2128',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerFamily: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(126,184,218,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#7EB8DA',
    fontWeight: '600',
  },
  badgeText2: {
    fontSize: 11,
    color: '#D4845C',
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1c2128',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#b0b8c1',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2d333b',
  },

  // Child cards
  childCard: {
    backgroundColor: '#1c2128',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d333b',
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 28,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  childLevel: {
    fontSize: 13,
    color: '#D4845C',
    fontWeight: '500',
  },
  pointsBadge: {
    backgroundColor: 'rgba(212,132,92,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4845C',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#D4845C',
    fontWeight: '600',
  },

  levelBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  levelBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#2d333b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: '#D4845C',
    borderRadius: 4,
  },
  levelProgressText: {
    fontSize: 11,
    color: '#b0b8c1',
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },

  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#b0b8c1',
    marginTop: 2,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#b0b8c1',
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#7EB8DA',
    fontStyle: 'italic',
  },
});
