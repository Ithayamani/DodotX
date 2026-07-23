import { Theme } from '../types';

export const THEME_COLORS = {
  football: {
    primary: '#5E9E62',
    background: '#1e3a28',
    card: '#2d5a3f',
    text: '#ffffff',
    accent: '#8FC793',
  },
  space: {
    primary: '#9B6DAE',
    background: '#1a1a2e',
    card: '#2d2d44',
    text: '#ffffff',
    accent: '#BF94CF',
  },
  ocean: {
    primary: '#5A9FCF',
    background: '#0d1b2a',
    card: '#1b3a52',
    text: '#ffffff',
    accent: '#85BDE0',
  },
  nature: {
    primary: '#72AB76',
    background: '#1b2a1e',
    card: '#2d4a32',
    text: '#ffffff',
    accent: '#A5CCB0',
  },
  gaming: {
    primary: '#D4845C',
    background: '#0f1419',
    card: '#1c2128',
    text: '#ffffff',
    accent: '#E0A87E',
  },
  adventure: {
    primary: '#D4924A',
    background: '#1c1410',
    card: '#2e2318',
    text: '#ffffff',
    accent: '#E0B47E',
  },
};

export const getThemeColors = (theme: Theme) => {
  return THEME_COLORS[theme] || THEME_COLORS.gaming;
};

/**
 * Soft, colored "clay" shadow for the claymorphism restyle -- tints the
 * shadow with the theme's primary color instead of flat black, and pairs
 * with rounded-corner cards for a tactile, layered look.
 */
export const getClayShadow = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 8,
});

export const AVATARS = [
  '👦', '👧', '🧒', '👶', '👨', '👩',
  '🦸', '🦸‍♀️', '🧙', '🧙‍♀️', '🧚', '🧚‍♂️',
  '🐶', '🐱', '🦁', '🐼', '🐨', '🦊',
];

export const CHEER_MESSAGES = [
  'Great job! Keep it up! 🎉',
  'You\'re doing amazing! 🌟',
  'So proud of you! 💪',
  'Keep up the awesome work! 🚀',
  'You\'re a superstar! ⭐',
  'Way to go, champ! 🏆',
  'Love seeing your progress! ❤️',
  'You\'re crushing it! 🔥',
];
