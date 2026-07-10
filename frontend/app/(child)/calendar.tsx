import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../../src/stores';
import { getThemeColors } from '../../src/constants';
import CalendarView from '../../src/components/CalendarView';

export default function ChildCalendar() {
  const { currentChild, theme } = useAppStore();
  const colors = getThemeColors(theme);

  if (!currentChild) {
    return <Redirect href="/role-select" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CalendarView childId={currentChild.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
});
