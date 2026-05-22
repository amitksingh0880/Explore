import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Badge } from '../ui/Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Space[8];

export interface TripCardData {
  id: string;
  title: string;
  destination: string;
  coverImageUri?: string;
  coverGradient?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalStops: number;
  totalBudget?: number;
  currency?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  progressPercent?: number; // 0-100 readiness score
}

interface TripCardProps {
  trip: TripCardData;
  style?: object;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',    variant: 'neutral'   as const },
  active:    { label: 'Active',   variant: 'primary'   as const },
  completed: { label: 'Done',     variant: 'secondary' as const },
  archived:  { label: 'Archived', variant: 'neutral'   as const },
};

function parseCustomDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

const SOLID_COLORS = {
  g1: Colors.primaryLight,
  g2: Colors.secondaryLight,
  g3: Colors.accentLight,
  g4: Colors.dangerLight,
};

export function TripCard({ trip, style }: TripCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;

  const formattedDates = React.useMemo(() => {
    try {
      const start = parseCustomDate(trip.startDate);
      const end = parseCustomDate(trip.endDate);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })}`;
    } catch {
      return `${trip.startDate} – ${trip.endDate}`;
    }
  }, [trip.startDate, trip.endDate]);

  const solidColor = (SOLID_COLORS[trip.coverGradient as keyof typeof SOLID_COLORS] || Colors.primaryLight) as string;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/trip/${trip.id}`)}
      activeOpacity={0.9}
      style={[styles.wrapper, style]}
    >
      <View style={[styles.card, Shadow.md]}>
        {/* Cover Image / Hero */}
        {trip.coverImageUri ? (
          <ImageBackground
            source={{ uri: trip.coverImageUri }}
            style={[styles.hero, styles.heroBorder]}
            imageStyle={styles.heroImage}
          >
            <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <View style={styles.heroContent}>
                <Badge label={status.label} variant={status.variant} style={{ alignSelf: 'flex-start' }} />
                <Text style={[styles.heroTitle, { color: Colors.white }]} numberOfLines={2}>{trip.title}</Text>
                <View style={styles.heroMeta}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={Colors.white} />
                  <Text style={[styles.heroMetaText, { color: Colors.white }]}>{trip.destination}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.hero, styles.heroBorder, { backgroundColor: solidColor }]}>
            <View style={[styles.heroContent, { padding: Space[4] }]}>
              <Badge label={status.label} variant={status.variant} style={{ alignSelf: 'flex-start' }} />
              <Text style={[styles.heroTitle, { color: Colors.neutral900 }]} numberOfLines={2}>
                {trip.title}
              </Text>
              <View style={styles.heroMeta}>
                <MaterialCommunityIcons name="map-marker" size={14} color={Colors.neutral900} />
                <Text style={[styles.heroMetaText, { color: Colors.neutral900 }]}>
                  {trip.destination}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.stats}>
          <StatChip icon="calendar-month" label={formattedDates} />
          <View style={styles.statsDivider} />
          <StatChip icon="flag-checkered" label={`${trip.totalDays}d`} />
          <View style={styles.statsDivider} />
          <StatChip icon="map-marker-multiple" label={`${trip.totalStops} stops`} />
          {trip.totalBudget != null && (
            <>
              <View style={styles.statsDivider} />
              <StatChip
                icon="wallet-outline"
                label={`${trip.currency ?? '₹'}${trip.totalBudget.toLocaleString()}`}
              />
            </>
          )}
        </View>

        {/* Readiness Bar */}
        {trip.progressPercent != null && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${trip.progressPercent}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{trip.progressPercent}% ready</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function StatChip({ icon, label }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }) {
  return (
    <View style={statStyles.wrap}>
      <MaterialCommunityIcons name={icon} size={14} color={Colors.neutral900} />
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral900 },
});

const styles = StyleSheet.create({
  wrapper: { width: CARD_WIDTH },
  card: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    overflow: 'hidden',
  },
  hero: {
    height: 180,
    justifyContent: 'flex-end',
  },
  heroBorder: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
  },
  heroImage: { },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Space[4],
  },
  heroContent: { gap: Space[2] },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    marginTop: Space[1],
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroMetaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral100,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[4],
    paddingTop: Space[4],
    paddingBottom: Space[3],
    flexWrap: 'wrap',
    gap: Space[3],
  },
  statsDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.neutral900 },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[4],
    paddingBottom: Space[4],
    gap: Space[3],
  },
  progressBg: {
    flex: 1,
    height: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRightWidth: 2,
    borderRightColor: Colors.neutral900,
  },
  progressLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral900,
  },
});
