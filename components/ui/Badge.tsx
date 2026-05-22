import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Space } from '../../theme';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'neutral' | 'warning';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'primary', size = 'md', dot = false, style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], styles[`size_${size}`], style]}>
      {dot && <View style={[styles.dot, styles[`dot_${variant}`]]} />}
      <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.neutral900,
  },

  // Sizes
  size_sm: { paddingHorizontal: Space[2], paddingVertical: 2 },
  size_md: { paddingHorizontal: Space[3], paddingVertical: Space[1] },

  // Variants
  badge_primary:   { backgroundColor: Colors.primaryLight },
  badge_secondary: { backgroundColor: Colors.secondaryLight },
  badge_accent:    { backgroundColor: Colors.accentLight },
  badge_danger:    { backgroundColor: Colors.dangerLight },
  badge_success:   { backgroundColor: Colors.successLight }, // Fixed from primaryLight
  badge_neutral:   { backgroundColor: Colors.neutral100 },
  badge_warning:   { backgroundColor: Colors.warningLight },

  // Label colors
  label: { fontFamily: FontFamily.medium }, // MD3 label medium
  labelSize_sm: { fontSize: FontSize.xs },
  labelSize_md: { fontSize: FontSize.sm },

  label_primary:   { color: Colors.neutral900 },
  label_secondary: { color: Colors.neutral900 },
  label_accent:    { color: Colors.neutral900 },
  label_danger:    { color: Colors.neutral900 },
  label_success:   { color: Colors.neutral900 },
  label_neutral:   { color: Colors.neutral900 },
  label_warning:   { color: Colors.neutral900 },

  // Dot
  dot: { width: 6, height: 6, borderRadius: 3 },
  dot_primary:   { backgroundColor: Colors.primary },
  dot_secondary: { backgroundColor: Colors.secondary },
  dot_accent:    { backgroundColor: Colors.accent },
  dot_danger:    { backgroundColor: Colors.danger },
  dot_success:   { backgroundColor: Colors.primary },
  dot_neutral:   { backgroundColor: Colors.neutral400 },
  dot_warning:   { backgroundColor: Colors.warning },
});
