import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { TripCard, TripCardData } from '../../components/trip/TripCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

import { useWanderPlanStore } from '../../db/store';

type FilterTab = 'all' | 'active' | 'upcoming' | 'completed';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Done' },
];

function parseCustomDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function daysUntil(dateStr: string): number {
  const target = parseCustomDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export default function DashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const trips = useWanderPlanStore((state) => state.trips);
  const refreshTrips = useWanderPlanStore((state) => state.refreshTrips);

  React.useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshTrips();
    setRefreshing(false);
  }, [refreshTrips]);

  // Map db Trip model to TripCardData
  const cardTrips = React.useMemo(() => {
    return trips.map((t) => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      startDate: t.start_date,
      endDate: t.end_date,
      totalDays: t.total_days,
      totalStops: t.total_days * 2, // approximate or count
      totalBudget: t.total_budget,
      currency: t.currency,
      status: t.status as any,
      progressPercent: t.progress_percent,
      coverGradient: t.cover_gradient,
    }));
  }, [trips]);

  const filtered = cardTrips.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return t.status === 'active';
    if (activeFilter === 'upcoming') return t.status === 'draft';
    if (activeFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const totalStopsCount = cardTrips.reduce((a, t) => a + t.totalStops, 0);
  const avgReadyPercent = cardTrips.length > 0 
    ? Math.round(cardTrips.reduce((a, t) => a + (t.progressPercent ?? 0), 0) / cardTrips.length) 
    : 0;

  // Find the soonest upcoming trip for the countdown widget
  const countdownTrip = React.useMemo(() => {
    const upcoming = trips
      .filter(t => t.start_date && daysUntil(t.start_date) >= 0)
      .sort((a, b) => daysUntil(a.start_date) - daysUntil(b.start_date));
    if (!upcoming.length) return null;
    const t = upcoming[0];
    return { title: t.title, destination: t.destination, days: daysUntil(t.start_date) };
  }, [trips]);

  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning \u2600\uFE0F';
    if (h < 17) return 'Good afternoon \u26C5';
    return 'Good evening \uD83D\uDC4B';
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.headerBox}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <MaterialCommunityIcons name="menu" size={24} color={Colors.neutral900} />
            </TouchableOpacity>

            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>DASHBOARD</Text>
            </View>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/youtube')}
            >
              <MaterialCommunityIcons name="youtube" size={24} color={Colors.neutral900} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.headerTitle}>YOUR TRIPS</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>

          <View style={styles.inlineStats}>
            <View style={styles.inlineStatItem}>
              <Text style={styles.inlineStatValue}>{cardTrips.length}</Text>
              <Text style={styles.inlineStatLabel}>Trips</Text>
            </View>
            <View style={styles.inlineStatDivider} />
            <View style={styles.inlineStatItem}>
              <Text style={styles.inlineStatValue}>{cardTrips.filter((t) => t.status === 'active').length}</Text>
              <Text style={styles.inlineStatLabel}>Active</Text>
            </View>
            <View style={styles.inlineStatDivider} />
            <View style={styles.inlineStatItem}>
              <Text style={styles.inlineStatValue}>{avgReadyPercent}%</Text>
              <Text style={styles.inlineStatLabel}>Ready</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[styles.filterChip, activeFilter === tab.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, activeFilter === tab.key && styles.filterLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Trip Cards ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="map-plus"
          title="No trips yet"
          subtitle="Start planning your next adventure. Create a trip or import from a YouTube travel vlog."
          action={
            <Button
              label="Create Trip"
              onPress={() => router.push('/trip/new')}
              gradient
              icon={<MaterialCommunityIcons name="plus" size={16} color={Colors.white} />}
            />
          }
          style={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Space[4] }} />}
          renderItem={({ item }) => <TripCard trip={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={
            countdownTrip ? (
              <View style={styles.countdown}>
                <View style={styles.countdownLeft}>
                  <View style={styles.countdownIconBox}>
                    <MaterialCommunityIcons
                      name={
                        countdownTrip.days === 0
                          ? 'rocket-launch'
                          : countdownTrip.days <= 3
                          ? 'fire'
                          : 'airplane'
                      }
                      size={22}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countdownTitle} numberOfLines={1}>{countdownTrip.title}</Text>
                    <Text style={styles.countdownSub} numberOfLines={1}>{countdownTrip.destination}</Text>
                  </View>
                </View>
                <View style={styles.countdownRight}>
                  <Text style={styles.countdownDays} numberOfLines={1}>
                    {countdownTrip.days === 0 ? 'TODAY!' : countdownTrip.days.toString()}
                  </Text>
                  {countdownTrip.days > 0 && <Text style={styles.countdownDaysLabel}>days to go</Text>}
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: Space[10] }} />}
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <TouchableOpacity            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => router.push('/trip/new')}
          >
            <View style={styles.fabInner}>
              <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
            </View>
          </TouchableOpacity>
    </View>
  );
}



const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },

// Header
  headerBox: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: Colors.neutral900,
    paddingBottom: Space[6],
    marginBottom: Space[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[5],
    paddingTop: Space[2],
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  hamburgerBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  badgeWrap: {
    backgroundColor: Colors.white,
    paddingHorizontal: Space[4],
    paddingVertical: Space[1] + 2,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral900,
    letterSpacing: 1,
  },
  titleArea: {
    paddingHorizontal: Space[5],
    paddingTop: Space[8],
    paddingBottom: Space[6],
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 52,
    lineHeight: 52,
    textTransform: 'uppercase',
    color: Colors.neutral900,
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
    marginTop: Space[2],
  },
  inlineStats: {
    flexDirection: 'row',
    marginHorizontal: Space[5],
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    borderRadius: Radius.xl,
    paddingVertical: Space[4],
    ...Shadow.sm,
  },
  inlineStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  inlineStatValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.neutral900,
  },
  inlineStatLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  inlineStatDivider: {
    width: 2,
    backgroundColor: Colors.neutral900,
  },

  // Filter tabs
  filterWrap: { backgroundColor: Colors.bgPrimary, paddingBottom: Space[2] },
  filters: { paddingHorizontal: Space[5], paddingVertical: Space[3], gap: Space[2] },
  filterChip: {
    paddingVertical: Space[2],
    paddingHorizontal: Space[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral600,
  },
  filterLabelActive: { color: Colors.neutral900 },

  // List
  list: { paddingHorizontal: Space[4], paddingTop: Space[2] },

  // Countdown widget
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral900,
    borderRadius: Radius.xl,
    padding: Space[5],
    marginBottom: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.md,
  },
  countdownLeft: { flexDirection: 'row', alignItems: 'center', gap: Space[3], flex: 1, overflow: 'hidden', marginRight: Space[3] },
  countdownIconBox: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  countdownTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.white },
  countdownSub: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 },
  countdownRight: { alignItems: 'center', flexShrink: 0, minWidth: 64 },
  countdownDays: { fontFamily: FontFamily.bold, fontSize: 32, color: Colors.primary, lineHeight: 36 },
  countdownDaysLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 84,
    right: Space[5],
    borderRadius: Radius.full, 
    borderWidth: 2,
    borderColor: Colors.neutral900,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
