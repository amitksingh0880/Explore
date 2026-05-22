import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Radius, Space, Shadow } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'neutral';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  gradient?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  gradient = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    !gradient && styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${size}`],
    styles[`labelColor_${variant}`],
    isDisabled && styles.labelDisabled,
    textStyle,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? Colors.primary : Colors.white}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={labelStyle}>{label}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, styles[`size_${size}`], styles.gradientInner, Shadow.sm]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={containerStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full, 
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm, // Hard brutalist shadow
    overflow: 'hidden',
  },
  gradientInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  // Sizes
  size_sm: { paddingHorizontal: Space[4], paddingVertical: Space[2], gap: Space[1] },
  size_md: { paddingHorizontal: Space[6], paddingVertical: Space[3], gap: Space[2] },
  size_lg: { paddingHorizontal: Space[8], paddingVertical: Space[4], gap: Space[2] },

  // Variant backgrounds
  variant_primary:   { backgroundColor: Colors.primary }, 
  variant_secondary: { backgroundColor: Colors.secondary }, 
  variant_ghost:     { backgroundColor: Colors.transparent, elevation: 0, shadowOpacity: 0 }, 
  variant_danger:    { backgroundColor: Colors.danger }, 
  variant_accent:    { backgroundColor: Colors.accent }, 
  variant_neutral:   { backgroundColor: Colors.white }, 

  // Labels
  label: { fontFamily: FontFamily.medium },
  label_sm: { fontSize: FontSize.sm },
  label_md: { fontSize: FontSize.md },
  label_lg: { fontSize: FontSize.lg },

  labelColor_primary:   { color: Colors.neutral900 },
  labelColor_secondary: { color: Colors.neutral900 },
  labelColor_ghost:     { color: Colors.neutral900 },
  labelColor_danger:    { color: Colors.neutral900 },
  labelColor_accent:    { color: Colors.neutral900 },
  labelColor_neutral:   { color: Colors.neutral900 },
  labelDisabled:        { opacity: 0.8 },

  iconLeft:  { marginRight: 4 },
  iconRight: { marginLeft: 4 },
});
