import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space, StopTypeConfig } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useWanderPlanStore } from '../../db/store';

// ─── Weather helpers ───────────────────────────────────────────────
const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Clear sky',       icon: 'weather-sunny' },
  1:  { label: 'Mainly clear',    icon: 'weather-sunny' },
  2:  { label: 'Partly cloudy',   icon: 'weather-partly-cloudy' },
  3:  { label: 'Overcast',        icon: 'weather-cloudy' },
  45: { label: 'Foggy',           icon: 'weather-fog' },
  48: { label: 'Icy fog',         icon: 'weather-fog' },
  51: { label: 'Light drizzle',   icon: 'weather-rainy' },
  61: { label: 'Slight rain',     icon: 'weather-rainy' },
  63: { label: 'Moderate rain',   icon: 'weather-pouring' },
  65: { label: 'Heavy rain',      icon: 'weather-pouring' },
  71: { label: 'Light snow',      icon: 'weather-snowy' },
  80: { label: 'Rain showers',    icon: 'weather-rainy' },
  95: { label: 'Thunderstorm',    icon: 'weather-lightning' },
};

interface WeatherData {
  temp: number;
  code: number;
  label: string;
  icon: string;
  humidity: number;
  wind: number;
}

async function fetchWeather(destination: string): Promise<WeatherData | null> {
  try {
    // Step 1: Geocode destination
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'WanderPlan-App/1.0' } }
    );
    const geoData = await geoRes.json();
    if (!geoData?.length) return null;
    const { lat, lon } = geoData[0];

    // Step 2: Fetch weather
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`
    );
    const wxData = await wxRes.json();
    const cur = wxData.current;
    const code = cur.weather_code as number;
    const meta = WMO_CODES[code] ?? { label: 'Unknown', icon: 'weather-cloudy' };
    return {
      temp: Math.round(cur.temperature_2m),
      code,
      label: meta.label,
      icon: meta.icon,
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
    };
  } catch {
    return null;
  }
}

const NAV_TABS = [
  { key: 'itinerary', icon: 'calendar-multiselect', label: 'Itinerary' },
  { key: 'budget',    icon: 'wallet-outline',         label: 'Budget' },
  { key: 'contacts',  icon: 'contacts-outline',       label: 'Contacts' },
  { key: 'packing',   icon: 'bag-checked',            label: 'Packing' },
];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const selectTrip = useWanderPlanStore((state) => state.selectTrip);
  const trip = useWanderPlanStore((state) => state.activeTrip);
  const days = useWanderPlanStore((state) => state.activeDays);
  const stopsByDay = useWanderPlanStore((state) => state.activeStopsByDay);
  const packingItems = useWanderPlanStore((state) => state.activePackingItems);
  const contacts = useWanderPlanStore((state) => state.activeContacts);
  const togglePackItem = useWanderPlanStore((state) => state.togglePackItem);
  const isLoading = useWanderPlanStore((state) => state.isLoading);

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const weatherFetched = useRef(false);

  React.useEffect(() => {
    if (id) {
      selectTrip(id);
    }
  }, [id, selectTrip]);

  // Fetch live weather once the trip destination is known
  useEffect(() => {
    if (trip?.destination && !weatherFetched.current) {
      weatherFetched.current = true;
      setWeatherLoading(true);
      fetchWeather(trip.destination).then((data) => {
        setWeather(data);
        setWeatherLoading(false);
      });
    }
  }, [trip?.destination]);

  // Expand the first day automatically once loaded
  React.useEffect(() => {
    if (days.length > 0 && expandedDay === null) {
      setExpandedDay(days[0].id);
    }
  }, [days, expandedDay]);

  const formattedDates = React.useMemo(() => {
    if (!trip) return '';
    const parseCustomDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    try {
      const start = parseCustomDate(trip.start_date);
      const end = parseCustomDate(trip.end_date);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })}`;
    } catch {
      return `${trip.start_date} – ${trip.end_date}`;
    }
  }, [trip]);

  if (isLoading || !trip) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const totalStops = Object.values(stopsByDay).flat().length;
  const bookedStops = Object.values(stopsByDay).flat().filter(s => s.is_booked).length;
  const budgetPct = trip.total_budget > 0 ? Math.round((trip.spent_budget / trip.total_budget) * 100) : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Hero Header */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.neutral900} />
            </TouchableOpacity>
            <View style={styles.heroNavRight}>
              <TouchableOpacity style={styles.navBtn}>
                <MaterialCommunityIcons name="share-variant" size={24} color={Colors.neutral900} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.neutral900} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Badge label={trip.status.toUpperCase()} variant={trip.status === 'active' ? 'primary' : 'neutral'} />
            <Text style={styles.heroTitle}>{trip.title}</Text>
            <View style={styles.heroMeta}>
              <MaterialCommunityIcons name="map-marker" size={16} color={Colors.neutral600} />
              <Text style={styles.heroMetaText}>{trip.destination}</Text>
              <Text style={styles.heroDot}>·</Text>
              <MaterialCommunityIcons name="calendar" size={16} color={Colors.neutral600} />
              <Text style={styles.heroMetaText}>{formattedDates}</Text>
            </View>

            {/* Live Weather Pill */}
            {weatherLoading && (
              <View style={styles.weatherPill}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.weatherText}>Fetching weather…</Text>
              </View>
            )}
            {!weatherLoading && weather && (
              <View style={styles.weatherPill}>
                <MaterialCommunityIcons name={weather.icon as any} size={22} color={Colors.primary} />
                <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                <Text style={styles.weatherLabel}>{weather.label}</Text>
                <View style={styles.weatherDivider} />
                <MaterialCommunityIcons name="water-percent" size={14} color={Colors.neutral600} />
                <Text style={styles.weatherMeta}>{weather.humidity}%</Text>
                <MaterialCommunityIcons name="weather-windy" size={14} color={Colors.neutral600} />
                <Text style={styles.weatherMeta}>{weather.wind} km/h</Text>
              </View>
            )}
          </View>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <QuickStat icon="flag-checkered"       value={`${trip.total_days}d`}              label="Duration" />
            <QuickStat icon="map-marker-multiple"  value={`${totalStops}`}              label="Stops" />
            <QuickStat icon="ticket-confirmation"  value={`${bookedStops}/${totalStops}`} label="Booked" />
            <QuickStat icon="progress-check"       value={`${trip.progress_percent ?? 0}%`}        label="Packed" />
          </View>
        </SafeAreaView>
      </View>

      {/* Budget progress */}
      <View style={styles.budgetBar}>
        <View style={styles.budgetBarInner}>
          <View style={[styles.budgetFill, { width: `${Math.min(100, budgetPct)}%` as any,
            backgroundColor: budgetPct > 80 ? Colors.danger : Colors.primary }]} />
        </View>
        <Text style={styles.budgetText}>
          {trip.currency}{trip.spent_budget.toLocaleString()} / {trip.currency}{trip.total_budget.toLocaleString()} ({budgetPct}% spent)
        </Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {NAV_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? Colors.primary : Colors.neutral400}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'itinerary' && (
          <>
            {days.map((day) => {
              const dayStops = stopsByDay[day.id] || [];
              return (
                <View key={day.id} style={styles.dayBlock}>
                  {/* Day header */}
                  <TouchableOpacity
                    onPress={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                    style={styles.dayHeader}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{day.day_number}</Text>
                    </View>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayDate}>{day.date || `Day ${day.day_number}`} · {day.weather}</Text>
                      <Text style={styles.dayTitle}>{day.title || `Explore day ${day.day_number}`}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={expandedDay === day.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.neutral400}
                    />
                  </TouchableOpacity>

                  {/* Stops */}
                  {expandedDay === day.id && (
                    <View style={styles.stopsWrap}>
                      {dayStops.length === 0 ? (
                        <Text style={[styles.emptyText, { marginLeft: Space[8], marginVertical: Space[2] }]}>
                          No stops planned for this day yet.
                        </Text>
                      ) : (
                        dayStops.map((stop, i) => {
                          const cfg = StopTypeConfig[stop.type as keyof typeof StopTypeConfig] ?? StopTypeConfig.activity;
                          return (
                            <View key={stop.id} style={styles.stopRow}>
                              {/* Timeline line */}
                              <View style={styles.timeline}>
                                <View style={[styles.timelineDot, { backgroundColor: cfg.color }]} />
                                {i < dayStops.length - 1 && <View style={styles.timelineLine} />}
                              </View>

                              <TouchableOpacity
                                style={styles.stopCard}
                                activeOpacity={0.85}
                                onPress={() => router.push(`/stop/${stop.id}`)}
                              >
                                <View style={[styles.stopTypeIcon, { backgroundColor: cfg.bg }]}>
                                  <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
                                </View>
                                <View style={styles.stopInfo}>
                                  <Text style={styles.stopName}>{stop.name}</Text>
                                  <Text style={styles.stopTime}>{stop.time}</Text>
                                </View>
                                <View style={styles.stopRight}>
                                  {stop.cost > 0 && (
                                    <Text style={styles.stopCost}>{trip.currency}{stop.cost}</Text>
                                  )}
                                  {stop.is_booked && (
                                    <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                                  )}
                                </View>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}

                      {/* Add stop */}
                      <TouchableOpacity 
                        style={styles.addStopBtn}
                        onPress={() => Alert.alert('Add Stop', 'Create custom stops to build your offline itinerary! Coming soon.')}
                      >
                        <MaterialCommunityIcons name="plus-circle-outline" size={18} color={Colors.primary} />
                        <Text style={styles.addStopText}>Add Stop</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'budget' && (
          <Card elevated style={styles.budgetCard}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
            <View style={styles.budgetSummaryRow}>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetValue}>{trip.currency}{trip.spent_budget.toLocaleString()}</Text>
                <Text style={styles.budgetItemLabel}>Spent</Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetItem}>
                <Text style={[styles.budgetValue, { color: Colors.primary }]}>
                  {trip.currency}{(trip.total_budget - trip.spent_budget).toLocaleString()}
                </Text>
                <Text style={styles.budgetItemLabel}>Remaining</Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetItem}>
                <Text style={styles.budgetValue}>{trip.currency}{trip.total_budget.toLocaleString()}</Text>
                <Text style={styles.budgetItemLabel}>Total</Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { marginTop: Space[5] }]}>Cost Attributions</Text>
            <Text style={styles.emptyText}>All accommodation bookings and activity admission costs contribute directly to your remaining budget calculations.</Text>
          </Card>
        )}

        {activeTab === 'contacts' && (
          <Card elevated>
            <Text style={styles.sectionTitle}>Trip Contacts</Text>
            {contacts.length === 0 ? (
              <Text style={styles.emptyText}>No contacts added yet. Add your hotel, guide, or emergency contacts.</Text>
            ) : (
              <View style={{ gap: Space[3], marginTop: Space[2] }}>
                {contacts.map((contact) => (
                  <View key={contact.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Space[2], borderBottomWidth: 1, borderBottomColor: Colors.neutral50 }}>
                    <View>
                      <Text style={{ fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.neutral900 }}>{contact.name}</Text>
                      <Text style={{ fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 }}>{contact.category} · {contact.phone || 'No phone'}</Text>
                    </View>
                    {contact.phone && (
                      <TouchableOpacity style={{ padding: Space[2], backgroundColor: Colors.primaryLight, borderRadius: Radius.full }}>
                        <MaterialCommunityIcons name="phone" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {activeTab === 'packing' && (
          <Card elevated>
            <Text style={styles.sectionTitle}>Packing List</Text>
            <View style={styles.packingProgress}>
              <View style={styles.packingBg}>
                <View style={[styles.packingFill, { width: `${trip.progress_percent ?? 0}%` as any }]} />
              </View>
              <Text style={styles.packingLabel}>{trip.progress_percent ?? 0}% packed</Text>
            </View>
            {packingItems.length === 0 ? (
              <Text style={styles.emptyText}>No packing items yet. Create your custom list or use Wikipedia auto-suggested essentials!</Text>
            ) : (
              <View style={{ gap: Space[3], marginTop: Space[2] }}>
                {packingItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => togglePackItem(item.id, item.is_packed)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Space[3], paddingVertical: Space[1] }}
                  >
                    <MaterialCommunityIcons
                      name={item.is_packed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={item.is_packed ? Colors.primary : Colors.neutral400}
                    />
                    <Text style={{
                      fontFamily: FontFamily.medium,
                      fontSize: FontSize.sm,
                      color: item.is_packed ? Colors.neutral400 : Colors.neutral900,
                      textDecorationLine: item.is_packed ? 'line-through' : 'none',
                    }}>
                      {item.name}
                    </Text>
                    <Badge label={item.category} variant="neutral" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        )}

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

function QuickStat({ icon, value, label }: { icon: any, value: string, label: string }) {
  return (
    <View style={styles.quickStat}>
      <MaterialCommunityIcons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.quickStatVal}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  hero: { paddingBottom: Space[4], backgroundColor: Colors.bgPrimary },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space[3], paddingTop: Space[2] },
  heroNavRight: { flexDirection: 'row', gap: Space[2] },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.neutral900, backgroundColor: Colors.white, ...Shadow.sm },
  heroContent: { paddingHorizontal: Space[5], paddingTop: Space[3], paddingBottom: Space[4], alignItems: 'flex-start' },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.neutral900, marginTop: Space[3], marginBottom: Space[2] },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  heroMetaText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral600 },
  heroDot: { color: Colors.neutral400, fontFamily: FontFamily.bold },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    marginTop: Space[3],
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: Space[2],
    paddingHorizontal: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  weatherTemp: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  weatherLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral600 },
  weatherDivider: { width: 2, height: 14, backgroundColor: Colors.neutral200, marginHorizontal: Space[1] },
  weatherText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral600 },
  weatherMeta: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral600 },
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: Space[5],
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xl,
    paddingVertical: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  quickStat: { flex: 1, alignItems: 'center', gap: 2 },
  quickStatVal: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  quickStatLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral600 },

  // Budget bar
  budgetBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Space[5],
    paddingVertical: Space[3],
    gap: Space[2],
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
  },
  budgetBarInner: {
    height: 8, borderRadius: Radius.full,
    backgroundColor: Colors.neutral200, overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: Radius.full },
  budgetText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral600 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral200,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: Space[4], gap: Space[1],
    borderBottomWidth: 2, borderBottomColor: Colors.transparent,
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.neutral400 },
  tabLabelActive: { color: Colors.primary },

  // Content
  content: { padding: Space[4], gap: Space[4] },

  // Day blocks
  dayBlock: { 
    backgroundColor: Colors.bgCard, 
    borderRadius: Radius.xl, 
    overflow: 'hidden', 
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm 
  },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Space[3],
    padding: Space[4],
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  dayInfo: { flex: 1 },
  dayDate: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },
  dayTitle: { fontFamily: FontFamily.semibold, fontSize: FontSize.md, color: Colors.neutral900, marginTop: 2 },

  // Stops
  stopsWrap: { paddingHorizontal: Space[4], paddingBottom: Space[3] },
  stopRow: { flexDirection: 'row', gap: Space[3] },
  timeline: { alignItems: 'center', width: 20, paddingTop: Space[1] + 2 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.neutral100, marginTop: 2, minHeight: 24 },
  stopCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: Space[2] + 2, gap: Space[3],
    marginBottom: Space[2],
  },
  stopTypeIcon: {
    width: 32, height: 32, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  stopInfo: { flex: 1 },
  stopName: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral900 },
  stopTime: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 1 },
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  stopCost: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.neutral700 },

  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    paddingVertical: Space[2], marginLeft: Space[8],
  },
  addStopText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.primary },

  // Budget tab
  budgetCard: {},
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, marginBottom: Space[3] },
  budgetSummaryRow: { flexDirection: 'row', gap: Space[3] },
  budgetItem: { flex: 1, alignItems: 'center' },
  budgetValue: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.neutral900 },
  budgetItemLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },
  budgetDivider: { width: 1, backgroundColor: Colors.neutral100 },

  // Packing tab
  packingProgress: { gap: Space[1], marginBottom: Space[3] },
  packingBg: { height: 8, borderRadius: Radius.full, backgroundColor: Colors.neutral100, overflow: 'hidden' },
  packingFill: { height: '100%', borderRadius: Radius.full, backgroundColor: Colors.primary },
  packingLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, lineHeight: FontSize.sm * 1.6 },
});
