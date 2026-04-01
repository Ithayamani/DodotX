import { Theme } from '../types';

export const THEME_COLORS = {
  football: {
    primary: '#4CAF50',
    background: '#1e3a28',
    card: '#2d5a3f',
    text: '#ffffff',
    accent: '#81C784',
  },
  space: {
    primary: '#9C27B0',
    background: '#1a1a2e',
    card: '#2d2d44',
    text: '#ffffff',
    accent: '#BA68C8',
  },
  ocean: {
    primary: '#2196F3',
    background: '#0d1b2a',
    card: '#1b3a52',
    text: '#ffffff',
    accent: '#64B5F6',
  },
  nature: {
    primary: '#66BB6A',
    background: '#1b2a1e',
    card: '#2d4a32',
    text: '#ffffff',
    accent: '#A5D6A7',
  },
  gaming: {
    primary: '#FF6B35',
    background: '#0f1419',
    card: '#1c2128',
    text: '#ffffff',
    accent: '#FFA726',
  },
  adventure: {
    primary: '#FF9800',
    background: '#1c1410',
    card: '#2e2318',
    text: '#ffffff',
    accent: '#FFB74D',
  },
};

export const getThemeColors = (theme: Theme) => {
  return THEME_COLORS[theme] || THEME_COLORS.gaming;
};

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
