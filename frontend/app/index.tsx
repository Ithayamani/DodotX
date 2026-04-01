import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/stores';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (!user.family_id) {
          router.replace('/onboarding');
        } else {
          router.replace('/role-select');
        }
      }
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#0f1419', '#1c2128', '#0f1419']}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.logo}>⭐ KidQuest</Text>
          <Text style={styles.heroTitle}>
            Turn Daily Tasks{'\n'}Into Epic Adventures
          </Text>
          <Text style={styles.heroSubtitle}>
            Motivate kids with gamification.{'\n'}Build positive habits. Track progress.
          </Text>
          
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.primaryButtonText}>Sign Up as a Parent</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.secondaryButtonText}>Sign In as a Parent</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroNote}>No credit card required • COPPA compliant • Privacy-first</Text>
        </View>
      </LinearGradient>

      {/* Join Family Section */}
      <View style={[styles.section, styles.joinSection]}>
        <Text style={styles.joinIcon}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.joinTitle}>Already have a family code?</Text>
        <Text style={styles.joinDesc}>
          Your parent will share a 6-digit code with you.{'\n'}Use it to join your family and start your quest!
        </Text>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.joinButtonText}>Join Your Family</Text>
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Parents Love KidQuest</Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎮</Text>
            <Text style={styles.featureTitle}>Gamification</Text>
            <Text style={styles.featureDesc}>
              Points, levels, trophies & rewards keep kids motivated
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureTitle}>AI-Powered</Text>
            <Text style={styles.featureDesc}>
              Get personalized task suggestions based on child's age
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureDesc}>
              Streaks, stats, and insights on your child's habits
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>👨‍👩‍👧</Text>
            <Text style={styles.featureTitle}>Family-Friendly</Text>
            <Text style={styles.featureDesc}>
              Grandparents can view progress & send encouragement
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🏝️</Text>
            <Text style={styles.featureTitle}>Vacation Mode</Text>
            <Text style={styles.featureDesc}>
              Different tasks for school days vs. holidays
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎨</Text>
            <Text style={styles.featureTitle}>Beautiful Themes</Text>
            <Text style={styles.featureDesc}>
              6 gorgeous themes to match your family's style
            </Text>
          </View>
        </View>
      </View>

      {/* How It Works */}
      <View style={[styles.section, styles.darkSection]}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        
        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#FF6B35' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Create Your Family</Text>
            <Text style={styles.stepDesc}>
              Sign up, add children, and set up daily tasks in 3 minutes
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#9C27B0' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Kids Complete Tasks</Text>
            <Text style={styles.stepDesc}>
              They earn points, unlock trophies, and level up
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Redeem Rewards</Text>
            <Text style={styles.stepDesc}>
              Kids spend points on custom rewards you define
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Trophies to Unlock</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>Level Tiers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>∞</Text>
            <Text style={styles.statLabel}>Custom Tasks</Text>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={[styles.section, styles.ctaSection]}>
        <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
        <Text style={styles.ctaSubtitle}>
          Join families building better habits through gamification
        </Text>
        
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaButtonText}>Create Free Account</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for families
        </Text>
        <Text style={styles.footerCopy}>
          © 2026 KidQuest • Privacy-first • COPPA compliant
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    minHeight: 600,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  heroContent: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: width > 768 ? 64 : 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#b0b8c1',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  heroButtons: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: '600',
  },
  heroNote: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  darkSection: {
    backgroundColor: '#1c2128',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 48,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  feature: {
    flex: 1,
    minWidth: width > 768 ? 300 : '100%',
    backgroundColor: '#1c2128',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 14,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 22,
  },
  steps: {
    gap: 32,
    maxWidth: 800,
    marginHorizontal: 'auto',
  },
  step: {
    alignItems: 'center',
  },
  stepNumber: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 16,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 24,
  },
  stats: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 32,
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    padding: 24,
  },
  statNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#b0b8c1',
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  // Join Family Section
  joinSection: {
    backgroundColor: '#1c2128',
    alignItems: 'center',
    paddingVertical: 48,
    borderTopWidth: 1,
    borderTopColor: '#2d333b',
    borderBottomWidth: 1,
    borderBottomColor: '#2d333b',
  },
  joinIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  joinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  joinDesc: {
    fontSize: 16,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  joinButton: {
    backgroundColor: '#2ea043',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1c2128',
  },
  footerText: {
    fontSize: 16,
    color: '#b0b8c1',
    marginBottom: 8,
  },
  footerCopy: {
    fontSize: 14,
    color: '#6b7280',
  },
});

