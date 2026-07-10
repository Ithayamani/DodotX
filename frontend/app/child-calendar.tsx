import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../src/stores';
import { getThemeColors } from '../src/constants';
import CalendarView from '../src/components/CalendarView';

export default function ChildCalendarScreen() {
  const router = useRouter();
  const { childId, childName } = useLocalSearchParams<{ childId: string; childName?: string }>();
  const theme = useAppStore((state) => state.theme);
  const colors = getThemeColors(theme);

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
          {childName ? `${childName}'s Calendar` : 'Calendar'}
        </Text>
        <View style={styles.backButton} />
      </View>
      {childId ? (
        <CalendarView childId={String(childId)} showTitle={false} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.text}>No child selected</Text>
        </View>
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
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16 },
});
