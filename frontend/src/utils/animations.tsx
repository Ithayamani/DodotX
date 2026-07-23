import React, { useEffect } from 'react';
import { ViewStyle, Pressable, PressableProps, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideInDown,
  ZoomIn,
  Layout,
} from 'react-native-reanimated';
import { hapticLight } from './haptics';

// Re-export preset entering/exiting animations for direct use
export {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideInDown,
  ZoomIn,
  Layout,
};

/**
 * Animated card that fades + slides up on mount
 * Usage: <AnimatedCard index={0}><YourContent /></AnimatedCard>
 */
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle | ViewStyle[];
}

export function AnimatedCard({ children, index = 0, style }: AnimatedCardProps) {
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index * 60, 400);
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 120 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Scale-bounce animation for interactive press feedback
 * Usage: wrap a pressable item
 */
interface ScalePressProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  pressed?: boolean;
}

export function ScalePress({ children, style, pressed }: ScalePressProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = pressed
      ? withSpring(0.95, { damping: 10, stiffness: 200 })
      : withSpring(1, { damping: 10, stiffness: 200 });
  }, [pressed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Animated counter for points display
 */
interface AnimatedNumberProps {
  value: number;
  style?: any;
}

export function useAnimatedNumber(targetValue: number) {
  const animValue = useSharedValue(0);
  
  useEffect(() => {
    animValue.value = withTiming(targetValue, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetValue]);

  return animValue;
}

/**
 * Progress bar that animates its fill width
 */
interface AnimatedProgressProps {
  progress: number; // 0-100
  color: string;
  backgroundColor?: string;
  height?: number;
}

export function AnimatedProgress({
  progress,
  color,
  backgroundColor = 'rgba(255,255,255,0.2)',
  height = 8,
}: AnimatedProgressProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(progress, 100), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    height: '100%',
    backgroundColor: color,
    borderRadius: height / 2,
  }));

  return (
    <Animated.View
      style={{
        height,
        backgroundColor,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={fillStyle} />
    </Animated.View>
  );
}

/**
 * Checkmark that pops in with scale+rotation
 */
export function AnimatedCheckmark({ visible, color = '#fff', size = 16 }: { visible: boolean; color?: string; size?: number }) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-45);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 8, stiffness: 180 });
      rotate.value = withSpring(0, { damping: 8, stiffness: 180 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      rotate.value = withTiming(-45, { duration: 150 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.Text style={[{ fontSize: size, color, fontWeight: 'bold' }, style]}>
      ✓
    </Animated.Text>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Claymorphism-style tactile press wrapper: springs down on press-in,
 * back up on press-out/release, with a light haptic tick. Drop-in
 * replacement for TouchableOpacity where a "squish" feel is wanted.
 */
export function ClayPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  ...pressableProps
}: PressableProps & { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withSpring(0.94, { damping: 12, stiffness: 220 });
    hapticLight();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...pressableProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
