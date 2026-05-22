import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Space } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
  outlined?: boolean;
  radius?: number;
}

export function Card({
  children,
  style,
  padding = Space[4],
  elevated = false,
  outlined = false,
  radius = Radius.xl, // MD3 standard large shape
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding, borderRadius: radius },
        elevated ? Shadow.md : Shadow.sm, // Hard shadows
        outlined && styles.outlined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.neutral900,
  },
  outlined: {
    backgroundColor: Colors.bgPrimary, 
  },
});
