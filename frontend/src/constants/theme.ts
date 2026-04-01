import { Theme } from '../types';

export const THEME_COLORS = {
  football: {
    primary: '#00c853',
    background: '#1b5e20',
    card: '#2e7d32',
    text: '#ffffff',
    accent: '#76ff03',
  },
  space: {
    primary: '#7c4dff',
    background: '#1a237e',
    card: '#283593',
    text: '#ffffff',
    accent: '#b388ff',
  },
  ocean: {
    primary: '#00bcd4',
    background: '#006064',
    card: '#0097a7',
    text: '#ffffff',
    accent: '#18ffff',
  },
  nature: {
    primary: '#8bc34a',
    background: '#33691e',
    card: '#558b2f',
    text: '#ffffff',
    accent: '#ccff90',
  },
  gaming: {
    primary: '#e040fb',
    background: '#4a148c',
    card: '#6a1b9a',
    text: '#ffffff',
    accent: '#ea80fc',
  },
  adventure: {
    primary: '#ff6f00',
    background: '#e65100',
    card: '#ef6c00',
    text: '#ffffff',
    accent: '#ffab40',
  },
};

export const getThemeColors = (theme: Theme) => {
  return THEME_COLORS[theme] || THEME_COLORS.football;
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
