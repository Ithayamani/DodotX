import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../stores';
import { progressAPI } from '../api/client';
import { getThemeColors } from '../constants';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<string, string> = {
  complete: '#3DBE6B',
  partial: '#F2B23E',
  none: 'rgba(255,255,255,0.08)',
};

const VACATION_COLOR = '#4FC3F7';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface Props {
  childId: string;
  showTitle?: boolean;
}

export default function CalendarView({ childId, showTitle = true }: Props) {
  const theme = useAppStore((state) => state.theme);
  const colors = getThemeColors(theme);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refDate, setRefDate] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const res = await progressAPI.getCalendar(childId);
      setData(res);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const days = data?.days || {};
  const milestones = data?.milestones || [];
  const currentStreak = data?.current_streak || 0;
  const longestStreak = data?.longest_streak || 0;
  const completeDays = data?.complete_days || 0;
  const vacation = data?.vacation || { active: false };

  const isVacationDay = (dateStr: string) =>
    !!(vacation.active && vacation.start && vacation.end && dateStr >= vacation.start && dateStr <= vacation.end);

  const canGoNext = year < new Date().getFullYear() || (year === new Date().getFullYear() && month < new Date().getMonth());

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.content}>
        {showTitle && <Text style={styles.title}>Streak Calendar</Text>}

        {/* Streak summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>🔥 {currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>🏆 {longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statValue}>✅ {completeDays}</Text>
            <Text style={styles.statLabel}>Perfect Days</Text>
          </View>
        </View>

        {currentStreak >= 5 && (
          <View style={[styles.streakBanner, { backgroundColor: colors.primary }]}>
            <Text style={styles.streakBannerText}>
              {currentStreak >= 5 && currentStreak < 7
                ? `🔥 ${currentStreak}-day streak! ${7 - currentStreak} more to your Week Streak reward!`
                : `🔥 Amazing! You're on a ${currentStreak}-day streak!`}
            </Text>
          </View>
        )}

        {vacation.active && vacation.start && vacation.end && (
          <View style={[styles.vacationBanner, { borderColor: VACATION_COLOR }]}>
            <Text style={styles.vacationBannerText}>
              🏖️ Vacation mode: {vacation.start} → {vacation.end}
            </Text>
          </View>
        )}

        {/* Month navigation */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setRefDate(new Date(year, month - 1, 1))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity
              disabled={!canGoNext}
              onPress={() => canGoNext && setRefDate(new Date(year, month + 1, 1))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={24} color={canGoNext ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, idx) => {
              if (d === null) return <View key={`e${idx}`} style={styles.dayCell} />;
              const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
              const status = days[dateStr]?.status || 'empty';
              const isToday = dateStr === todayStr;
              const isVac = isVacationDay(dateStr);
              const bg = status === 'empty' ? 'transparent' : STATUS_COLORS[status];
              const borderColor = isToday ? colors.primary : isVac ? VACATION_COLOR : 'transparent';
              return (
                <View key={dateStr} style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayInner,
                      { backgroundColor: bg },
                      (isToday || isVac) && { borderWidth: 2, borderColor },
                    ]}
                  >
                    <Text style={[styles.dayText, status === 'complete' && styles.dayTextStrong]}>{d}</Text>
                    {isVac && <Text style={styles.vacationMark}>🏖️</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.complete }]} />
              <Text style={styles.legendText}>All done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.partial }]} />
              <Text style={styles.legendText}>Some done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.none }]} />
              <Text style={styles.legendText}>None</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendVacation]} />
              <Text style={styles.legendText}>Vacation</Text>
            </View>
          </View>
        </View>

        {/* Milestone rewards */}
        <Text style={styles.sectionTitle}>Streak Rewards 🎁</Text>
        <View style={styles.milestoneList}>
          {milestones.map((m: any) => (
            <View
              key={m.days}
              style={[
                styles.milestoneCard,
                { backgroundColor: colors.card },
                !m.earned && styles.milestoneLocked,
              ]}
            >
              <Text style={styles.milestoneIcon}>{m.earned ? m.icon : '🔒'}</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneName}>{m.name}</Text>
                <Text style={styles.milestoneDesc}>{m.days}-day streak → {m.reward}</Text>
              </View>
              {m.earned && (
                <View style={[styles.earnedBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.earnedText}>UNLOCKED</Text>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#ccc', textAlign: 'center' },
  streakBanner: { padding: 12, borderRadius: 12, marginBottom: 16 },
  streakBannerText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 14 },
  calendarCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', color: '#999', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dayInner: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dayText: { color: '#ddd', fontSize: 13 },
  dayTextStrong: { color: '#fff', fontWeight: 'bold' },
  vacationMark: { position: 'absolute', top: 1, right: 2, fontSize: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendVacation: { backgroundColor: 'transparent', borderWidth: 2, borderColor: VACATION_COLOR },
  legendText: { color: '#ccc', fontSize: 12 },
  vacationBanner: { padding: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1.5, backgroundColor: 'rgba(79,195,247,0.08)' },
  vacationBannerText: { color: '#9fdcf5', fontWeight: '600', textAlign: 'center', fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 12 },
  milestoneList: { gap: 10 },
  milestoneCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  milestoneLocked: { opacity: 0.6 },
  milestoneIcon: { fontSize: 32 },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  milestoneDesc: { fontSize: 12, color: '#ccc' },
  earnedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  earnedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
