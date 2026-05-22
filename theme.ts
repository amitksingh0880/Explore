// ─────────────────────────────────────────────────────────────────
//  WanderPlan Design Token System
//  All colors, typography, spacing, radii, shadows, and animations
//  are defined here. NEVER hardcode values — always reference theme.
// ─────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

export const Colors = {
  // Neo-brutalist Accents
  primary:       '#FDBA74', // Pastel Orange
  primaryLight:  '#FED7AA',
  primaryDark:   '#EA580C',
  primaryMid:    '#F97316',

  secondary:      '#FDE047', // Pastel Yellow
  secondaryLight: '#FEF08A',
  secondaryMid:   '#EAB308',

  accent:      '#A78BFA', // Pastel Purple
  accentLight: '#DDD6FE',
  accentMid:   '#8B5CF6',

  danger:      '#F87171', // Pastel Red
  dangerLight: '#FECACA',
  dangerMid:   '#EF4444',

  success:      '#34D399', // Mint
  successLight: '#A7F3D0',

  warning:      '#FDE047',
  warningLight: '#FEF08A',

  // Neo-brutalist Neutrals (pure black for borders)
  neutral50:  '#F3F4F6',
  neutral100: '#E5E7EB',
  neutral200: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral900: '#000000', // Pure black for brutalist text/borders

  // Base
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',

  // Neo-brutalist Backgrounds
  bgPrimary:   '#F3E8FF', // Lavender Background
  bgSecondary: '#D1F2EB', // Mint Green Header/Nav Background
  bgCard:      '#FFFFFF', // White cards
  bgOverlay:   'rgba(0, 0, 0, 0.4)',

  // Dark mode (Not standard for pure neo-brutalism, but provided for safety)
  darkBgPrimary:   '#111827',
  darkBgSecondary: '#1F2937',
  darkBgCard:      '#374151',

  // Gradients (Mostly unused in neo-brutalism, mapped to flat pairs)
  gradientPrimary: ['#FDBA74', '#FDBA74'] as const, // Orange
  gradientSunset:  ['#F87171', '#F87171'] as const, // Red
  gradientOcean:   ['#A78BFA', '#A78BFA'] as const, // Purple
  gradientDark:    ['#34D399', '#34D399'] as const, // Mint
} as const;

// ─── Typography ──────────────────────────────────────────────────

export const FontSize = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  18,
  xl:  22,
  xxl: 28,
  '3xl': 32,
  '4xl': 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
} as const;

export const FontFamily = {
  regular:  'JetBrainsMono_400Regular',
  medium:   'JetBrainsMono_500Medium',
  semibold: 'JetBrainsMono_600SemiBold',
  bold:     'JetBrainsMono_700Bold',
} as const;

export const LineHeight = {
  body:    1.5,
  heading: 1.2,
  tight:   1.1,
} as const;

// ─── Spacing (multiples of 4) ─────────────────────────────────────

export const Space = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 999,
} as const;

export const Shadow = {
  sm: Platform.select({
    web: {
      boxShadow: '2px 2px 0px 0px #000000',
    },
    default: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius:  0,
      elevation:     0,
    },
  }),
  md: Platform.select({
    web: {
      boxShadow: '4px 4px 0px 0px #000000',
    },
    default: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius:  0,
      elevation:     0,
    },
  }),
  lg: Platform.select({
    web: {
      boxShadow: '6px 6px 0px 0px #000000',
    },
    default: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 6, height: 6 },
      shadowOpacity: 1,
      shadowRadius:  0,
      elevation:     0,
    },
  }),
  colored: Platform.select({
    web: {
      boxShadow: '4px 4px 0px 0px #000000',
    },
    default: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius:  0,
      elevation:     0,
    },
  }),
};

// ─── Animation Durations ──────────────────────────────────────────

export const Duration = {
  fast:   150,
  medium: 300,
  slow:   500,
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────

export const ZIndex = {
  base:       0,
  card:       10,
  dropdown:   100,
  modal:      200,
  toast:      300,
  overlay:    400,
} as const;

// ─── Stop Type Colors & Icons ─────────────────────────────────────

export const StopTypeConfig = {
  activity:      { color: Colors.primary,   bg: Colors.primaryLight,  icon: 'map-marker-radius'  },
  transport:     { color: Colors.secondary, bg: Colors.secondaryLight, icon: 'bus'               },
  food:          { color: Colors.accent,    bg: Colors.accentLight,    icon: 'food-fork-drink'   },
  accommodation: { color: Colors.accent,    bg: Colors.accentLight,    icon: 'bed'               },
  viewpoint:     { color: '#7C3AED',        bg: '#EDE9FE',             icon: 'camera'            },
  emergency:     { color: Colors.danger,    bg: Colors.dangerLight,    icon: 'alert-circle'      },
  shopping:      { color: Colors.secondary, bg: Colors.secondaryLight, icon: 'shopping'          },
  nature:        { color: '#059669',        bg: '#D1FAE5',             icon: 'tree'              },
} as const;

export type StopType = keyof typeof StopTypeConfig;

// ─── Trip Status ──────────────────────────────────────────────────

export const TripStatusConfig = {
  draft:     { color: Colors.neutral400, label: 'Draft'    },
  active:    { color: Colors.primary,    label: 'Active'   },
  completed: { color: Colors.secondary,  label: 'Done'     },
  archived:  { color: Colors.neutral600, label: 'Archived' },
} as const;

export type TripStatus = keyof typeof TripStatusConfig;
