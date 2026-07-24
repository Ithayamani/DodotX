import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/stores';
import { getClayShadow, FONTS } from '../src/constants';
import { ClayPressable } from '../src/utils/animations';

const { width } = Dimensions.get('window');

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_app-store-setup-2/artifacts/anbdobms_image.png';

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
        <ActivityIndicator size="large" color="#00E5A0" />
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
          <View style={styles.logoArea}>
            <Image source={{ uri: LOGO_URL }} style={styles.logoImage} resizeMode="contain" />
            <View style={styles.logoTextRow}>
              <Text style={styles.logoText}>Dodot</Text>
              <Text style={styles.logoX}>X</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            Make Everyday Things{'\n'}a Game
          </Text>
          <Text style={styles.heroSubtitle}>
            Turn small actions into big wins—every day, as a family.
          </Text>
          
          <View style={styles.heroButtons}>
            <ClayPressable
              style={[styles.primaryButton, getClayShadow('#D4845C')]}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.primaryButtonText}>Sign Up as a Parent</Text>
            </ClayPressable>

            <ClayPressable
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.secondaryButtonText}>Sign In as a Parent</Text>
            </ClayPressable>
          </View>

          <Text style={styles.aiLine}>Smart routines, powered by AI.</Text>
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
        <ClayPressable
          style={[styles.joinButton, getClayShadow('#4A9B6B')]}
          onPress={() => router.push('/join-family')}
        >
          <Text style={styles.joinButtonText}>Join Your Family</Text>
        </ClayPressable>
        <ClayPressable
          style={styles.visitorButton}
          onPress={() => router.push('/visitor')}
        >
          <Text style={styles.visitorButtonText}>View as Visitor</Text>
        </ClayPressable>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Parents Love DodotX</Text>
        
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
            <View style={[styles.stepNumber, { backgroundColor: '#D4845C' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Create Your Family</Text>
            <Text style={styles.stepDesc}>
              Sign up, add children, and set up daily tasks in 3 minutes
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#9B6DAE' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Kids Complete Tasks</Text>
            <Text style={styles.stepDesc}>
              They earn points, unlock trophies, and level up
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#5A9FCF' }]}>
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
        
        <ClayPressable
          style={styles.ctaButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaButtonText}>Create Free Account</Text>
        </ClayPressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for families
        </Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://dodotx.com/privacy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://dodotx.com/terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://dodotx.com/support')}>
            <Text style={styles.footerLink}>Support</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopy}>
          © 2026 DodotX • COPPA compliant
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
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,132,92,0.2)',
  },
  logoText: {
    fontSize: 38,
    fontFamily: FONTS.headingExtraBold,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  logoX: {
    fontSize: 42,
    fontFamily: FONTS.headingExtraBold,
    color: '#00E5A0',
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: '#00E5A0',
    fontWeight: '900',
  },
  aiLine: {
    fontSize: 14,
    color: '#00E5A0',
    fontFamily: FONTS.bodyBold,
    fontStyle: 'italic',
    marginTop: 12,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: width > 768 ? 56 : 40,
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: width > 768 ? 64 : 48,
  },
  heroSubtitle: {
    fontSize: 18,
    fontFamily: FONTS.body,
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
    backgroundColor: '#D4845C',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4845C',
  },
  secondaryButtonText: {
    color: '#D4845C',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  heroNote: {
    fontSize: 14,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.headingBold,
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
    borderRadius: 20,
    alignItems: 'center',
    ...getClayShadow('#000000'),
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontFamily: FONTS.headingSemiBold,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 14,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: FONTS.headingSemiBold,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 16,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.headingExtraBold,
    color: '#D4845C',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#b0b8c1',
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: '#D4845C',
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
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  joinDesc: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#b0b8c1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  joinButton: {
    backgroundColor: '#4A9B6B',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 18,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: FONTS.headingSemiBold,
  },
  visitorButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#5A8FA8',
    marginTop: 12,
  },
  visitorButtonText: {
    color: '#7EB8DA',
    fontSize: 15,
    fontFamily: FONTS.headingSemiBold,
  },
  ctaTitle: {
    fontSize: 40,
    fontFamily: FONTS.headingBold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 18,
    fontFamily: FONTS.body,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 18,
  },
  ctaButtonText: {
    color: '#D4845C',
    fontSize: 18,
    fontFamily: FONTS.headingSemiBold,
  },
  footer: {
    padding: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1c2128',
  },
  footerText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: '#b0b8c1',
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: '#D4845C',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerCopy: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: '#6b7280',
  },
});

