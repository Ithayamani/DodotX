import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useAppStore } from '../src/stores';
import { familyAPI, childrenAPI } from '../src/api/client';
import { getThemeColors } from '../src/constants';
import type { Child } from '../src/types';

export default function RoleSelect() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { family, setFamily, setCurrentChild, setChildren, theme } = useAppStore();
  const [children, setChildrenList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [familyData, childrenData] = await Promise.all([
        familyAPI.get(),
        childrenAPI.getAll(),
      ]);
      setFamily(familyData);
      setChildrenList(childrenData);
      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = (child: Child) => {
    setCurrentChild(child);
    router.replace('/(child)');
  };

  const handleParentSelect = () => {
    router.push('/parent-pin');
  };

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to DodotX!</Text>
          <Text style={styles.subtitle}>{family?.name || 'Your Family'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Profile</Text>
          
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.roleCard, { backgroundColor: colors.card }]}
              onPress={() => handleChildSelect(child)}
            >
              <Text style={styles.avatar}>{child.avatar}</Text>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>{child.name}</Text>
                <Text style={styles.roleDesc}>Tap to start your quest!</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: colors.card }]}
            onPress={handleParentSelect}
          >
            <Text style={styles.avatar}>👨‍👩‍👧</Text>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Parent Dashboard</Text>
              <Text style={styles.roleDesc}>Manage tasks and rewards</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  avatar: {
    fontSize: 48,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 14,
    color: '#ccc',
  },
  arrow: {
    fontSize: 24,
    color: '#fff',
  },
  logoutButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
  },
});
