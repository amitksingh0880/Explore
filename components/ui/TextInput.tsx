import React from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Space } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function TextInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  required,
  ...props
}: InputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={18}
            color={focused ? Colors.primary : Colors.neutral400}
            style={styles.leftIcon}
          />
        )}
        <RNTextInput
          style={[styles.input, leftIcon && styles.inputWithLeft]}
          placeholderTextColor={Colors.neutral400}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon} hitSlop={8}>
            <MaterialCommunityIcons
              name={rightIcon}
              size={18}
              color={Colors.neutral400}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Space[1] + 2 },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral700,
  },
  required: { color: Colors.danger },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.neutral100,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral900,
    paddingHorizontal: Space[3],
    paddingVertical: Space[3],
  },
  inputWithLeft: { paddingLeft: Space[1] },
  leftIcon:  { marginLeft: Space[3] },
  rightIcon: { marginRight: Space[3] },
  errorText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.danger },
  hintText:  { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },
});
