import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores';
import { getThemeColors, getClayShadow } from '../../src/constants';

export default function ParentLayout() {
  const theme = useAppStore((state) => state.theme);
  const parentUnlocked = useAppStore((state) => state.parentUnlocked);
  const colors = getThemeColors(theme);

  // Require the PIN to be re-verified every session — direct navigation, deep links,
  // or a page reload must not be able to bypass the parent-pin screen.
  if (!parentUnlocked) {
    return <Redirect href="/parent-pin" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          ...getClayShadow(colors.primary),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Children',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
