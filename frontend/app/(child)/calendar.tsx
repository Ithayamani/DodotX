import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../../src/stores';
import { getThemeColors } from '../../src/constants';
import CalendarView from '../../src/components/CalendarView';

export default function ChildCalendar() {
  const { currentChild, theme } = useAppStore();
  const colors = getThemeColors(theme);

  if (!currentChild) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={styles.text}>No child selected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CalendarView childId={currentChild.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16 },
});
