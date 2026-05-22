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
  Image,
  Linking,
  TextInput,
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
  0: { label: 'Clear sky', icon: 'weather-sunny' },
  1: { label: 'Mainly clear', icon: 'weather-sunny' },
  2: { label: 'Partly cloudy', icon: 'weather-partly-cloudy' },
  3: { label: 'Overcast', icon: 'weather-cloudy' },
  45: { label: 'Foggy', icon: 'weather-fog' },
  48: { label: 'Icy fog', icon: 'weather-fog' },
  51: { label: 'Light drizzle', icon: 'weather-rainy' },
  61: { label: 'Slight rain', icon: 'weather-rainy' },
  63: { label: 'Moderate rain', icon: 'weather-pouring' },
  65: { label: 'Heavy rain', icon: 'weather-pouring' },
  71: { label: 'Light snow', icon: 'weather-snowy' },
  80: { label: 'Rain showers', icon: 'weather-rainy' },
  95: { label: 'Thunderstorm', icon: 'weather-lightning' },
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
  { key: 'budget', icon: 'wallet-outline', label: 'Budget' },
  { key: 'journey', icon: 'routes', label: 'Journey' },
  { key: 'contacts', icon: 'contacts-outline', label: 'Contacts' },
  { key: 'packing', icon: 'bag-checked', label: 'Packing' },
];

// ─── Packing suggestions engine ────────────────────────────────────────────
const BASE_ESSENTIALS = [
  { name: 'Passport / ID', category: 'Documents' },
  { name: 'Travel Insurance', category: 'Documents' },
  { name: 'Phone + Charger', category: 'Electronics' },
  { name: 'Power Bank', category: 'Electronics' },
  { name: 'Medicines', category: 'Health' },
  { name: 'Sunscreen SPF 50', category: 'Health' },
];

const TYPE_EXTRAS: Record<string, { name: string; category: string }[]> = {
  beach: [
    { name: 'Swimsuit', category: 'Clothing' },
    { name: 'Beach Towel', category: 'Accessories' },
    { name: 'Snorkel Gear', category: 'Accessories' },
    { name: 'Waterproof Bag', category: 'Accessories' },
    { name: 'Reef-safe Sunscreen', category: 'Health' },
    { name: 'Flip Flops', category: 'Clothing' },
  ],
  mountain: [
    { name: 'Trekking Boots', category: 'Clothing' },
    { name: 'Thermal Layer', category: 'Clothing' },
    { name: 'Rain Jacket', category: 'Clothing' },
    { name: 'Trekking Poles', category: 'Gear' },
    { name: 'First-Aid Kit', category: 'Health' },
    { name: 'Torch / Headlamp', category: 'Gear' },
  ],
  group: [
    { name: 'Group Snacks', category: 'Food' },
    { name: 'Bluetooth Speaker', category: 'Electronics' },
    { name: 'Card Games', category: 'Entertainment' },
    { name: 'Group Itinerary Printout', category: 'Documents' },
  ],
  couple: [
    { name: 'Camera', category: 'Electronics' },
    { name: 'Couples Outfit Sets', category: 'Clothing' },
    { name: 'Perfume / Cologne', category: 'Personal' },
  ],
  solo: [
    { name: 'Padlock', category: 'Security' },
    { name: 'Money Belt', category: 'Security' },
    { name: 'Travel Pillow', category: 'Accessories' },
    { name: 'Offline Maps (downloaded)', category: 'Electronics' },
  ],
};

const LONG_TRIP_EXTRAS = [
  { name: 'Laundry Bag', category: 'Accessories' },
  { name: 'Travel Clothesline', category: 'Accessories' },
  { name: 'Extra Clothes (x5)', category: 'Clothing' },
  { name: 'Shampoo / Conditioner', category: 'Personal' },
];

function getSuggestions(tripType: string, days: number, destination: string): { name: string; category: string }[] {
  const dest = destination.toLowerCase();
  let type = tripType;
  if (dest.includes('beach') || dest.includes('goa') || dest.includes('bali') || dest.includes('maldives')) type = 'beach';
  if (dest.includes('mountain') || dest.includes('himachal') || dest.includes('manali') || dest.includes('ladakh')) type = 'mountain';
  const extras = TYPE_EXTRAS[type] ?? TYPE_EXTRAS.solo;
  const longTrip = days >= 7 ? LONG_TRIP_EXTRAS : [];
  // Deduplicate by name
  const seen = new Set<string>();
  return [...BASE_ESSENTIALS, ...extras, ...longTrip].filter((i) => {
    if (seen.has(i.name)) return false;
    seen.add(i.name); return true;
  });
}

// ─── Packing templates ──────────────────────────────────────────────────────
interface TemplatePreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  items: { name: string; category: string }[];
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'adventure',
    name: 'Adventure Trek',
    icon: 'compass-outline',
    color: '#E0F2FE', // light blue
    description: 'For hiking, camping, and outdoor exploration.',
    items: [
      { name: 'Waterproof Jacket', category: 'Clothing' },
      { name: 'Hiking Shoes', category: 'Clothing' },
      { name: 'Insect Repellent', category: 'Health' },
      { name: 'Multi-tool Pocket Knife', category: 'Gear' },
      { name: 'First Aid Bandages', category: 'Health' },
      { name: 'Hydration Bladder / Flask', category: 'Gear' },
      { name: 'Granola / Energy Bars', category: 'Food' },
    ],
  },
  {
    id: 'minimalist',
    name: 'Minimalist Weekend',
    icon: 'bag-personal-outline',
    color: '#FEF3C7', // amber/yellow
    description: 'Bare essentials for a quick 2-3 day getaway.',
    items: [
      { name: 'Toothbrush & Paste', category: 'Personal' },
      { name: '2x Spare T-shirts', category: 'Clothing' },
      { name: '1x Spare Underwear & Socks', category: 'Clothing' },
      { name: 'Credit Cards & Cash', category: 'Documents' },
      { name: 'Phone Charger', category: 'Electronics' },
      { name: 'Deodorant', category: 'Personal' },
    ],
  },
  {
    id: 'business',
    name: 'Business Travel',
    icon: 'briefcase-outline',
    color: '#F3E8FF', // purple
    description: 'For conferences, client meets, and professional work.',
    items: [
      { name: 'Ironed Formal Shirts', category: 'Clothing' },
      { name: 'Laptop & Charger', category: 'Electronics' },
      { name: 'Notebook & Pen', category: 'Gear' },
      { name: 'Business Cards', category: 'Documents' },
      { name: 'Formal Blazer / Coat', category: 'Clothing' },
      { name: 'Travel Steamer', category: 'Personal' },
      { name: 'HDMI Adapter', category: 'Electronics' },
    ],
  },
  {
    id: 'beach',
    name: 'Coastal Beach',
    icon: 'umbrella-outline',
    color: '#DCFCE7', // green
    description: 'Sun, sand, ocean breeze, and tropical vibes.',
    items: [
      { name: 'Swim Shorts / Swimsuit', category: 'Clothing' },
      { name: 'Sunglasses', category: 'Accessories' },
      { name: 'Flip Flops / Sandals', category: 'Clothing' },
      { name: 'Beach Towel', category: 'Accessories' },
      { name: 'Reef-safe Sunscreen SPF 50', category: 'Health' },
      { name: 'Waterproof Phone Pouch', category: 'Electronics' },
      { name: 'Dry Bag', category: 'Gear' },
    ],
  },
];

// ─── Wikipedia Destination Hook ───────────────────────────────────
type WikiData = {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: string;
  url: string;
};

function useDestinationWiki(destination: string) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<WikiData | null>(null);

  React.useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    const query = encodeURIComponent(destination.split(',')[0].trim());
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        setData({
          title: json.title ?? destination,
          description: json.description,
          extract: json.extract ?? '',
          thumbnail: json.thumbnail?.source,
          url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${query}`,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destination]);

  return { loading, data };
}
// ──────────────────────────────────────────────────────────────────

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
  const bulkAddPackingItems = useWanderPlanStore((state) => state.bulkAddPackingItems);
  const isLoading = useWanderPlanStore((state) => state.isLoading);
  const journeyNodes = useWanderPlanStore((state) => state.activeJourneyNodes);
  const addJourneyNode = useWanderPlanStore((state) => state.addJourneyNode);
  const removeJourneyNode = useWanderPlanStore((state) => state.removeJourneyNode);
  const confirmJourneyNode = useWanderPlanStore((state) => state.confirmJourneyNode);

  // Journey modal state
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'stay' | 'transit' | 'waypoint'>('stay');
  const [newNodeLocation, setNewNodeLocation] = useState('');
  const [newNodeStayName, setNewNodeStayName] = useState('');
  const [newNodeRoomNo, setNewNodeRoomNo] = useState('');
  const [newNodeBookingRef, setNewNodeBookingRef] = useState('');
  const [newNodeCheckIn, setNewNodeCheckIn] = useState('');
  const [newNodeCheckOut, setNewNodeCheckOut] = useState('');
  const [newNodeNights, setNewNodeNights] = useState('1');
  const [newNodeTransitMode, setNewNodeTransitMode] = useState('flight');
  const [newNodeDeparture, setNewNodeDeparture] = useState('');
  const [newNodeArrival, setNewNodeArrival] = useState('');
  const [newNodeNotes, setNewNodeNotes] = useState('');
  const [savingNode, setSavingNode] = useState(false);

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const weatherFetched = useRef(false);
  const destWiki = useDestinationWiki(trip?.destination ?? '');

  // Currency Converter states
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('EUR');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convLoading, setConvLoading] = useState(false);

  // Map typical currency characters to codes
  const SYMBOL_TO_CODE: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '₹': 'INR',
    '¥': 'JPY',
    'aed': 'AED',
    'dh': 'AED',
    'rs': 'INR',
  };

  // Initialize To currency based on trip's currency sign
  useEffect(() => {
    if (trip?.currency) {
      const code = SYMBOL_TO_CODE[trip.currency.toLowerCase().trim()] || 'USD';
      setConvTo(code);
      if (code === 'USD') {
        setConvFrom('EUR'); // avoid same currency Conversion error
      }
    }
  }, [trip?.currency]);

  // Fetch rates
  useEffect(() => {
    if (convFrom) {
      setConvLoading(true);
      fetch(`https://open.er-api.com/v6/latest/${convFrom}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.rates) {
            setExchangeRates(data.rates);
          }
          setConvLoading(false);
        })
        .catch(() => setConvLoading(false));
    }
  }, [convFrom]);

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
            <QuickStat icon="flag-checkered" value={`${trip.total_days}d`} label="Duration" />
            <QuickStat icon="map-marker-multiple" value={`${totalStops}`} label="Stops" />
            <QuickStat icon="ticket-confirmation" value={`${bookedStops}/${totalStops}`} label="Booked" />
            <QuickStat icon="progress-check" value={`${trip.progress_percent ?? 0}%`} label="Packed" />
          </View>
        </SafeAreaView>
      </View>

      {/* Budget progress */}
      <View style={styles.budgetBar}>
        <View style={styles.budgetBarInner}>
          <View style={[styles.budgetFill, {
            width: `${Math.min(100, budgetPct)}%` as any,
            backgroundColor: budgetPct > 80 ? Colors.danger : Colors.primary
          }]} />
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
            {/* Wikipedia Destination Spotlight Card */}
            {destWiki.loading && (
              <Card elevated style={styles.guideCard}>
                <View style={styles.guideLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.guideLoadText}>Loading spotlight guide for {trip.destination}…</Text>
                </View>
              </Card>
            )}
            {!destWiki.loading && destWiki.data && (
              <Card elevated style={styles.guideCard} padding={0}>
                {destWiki.data.thumbnail && (
                  <View style={styles.guideCoverWrap}>
                    <View style={[styles.guideCoverPlaceholder, { backgroundColor: Colors.primaryLight }]}>
                      <MaterialCommunityIcons name="image" size={32} color={Colors.primary} />
                    </View>
                    <Image
                      source={{ uri: destWiki.data.thumbnail }}
                      style={styles.guideCover}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View style={styles.guideContent}>
                  <View style={styles.guideHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideTitle}>{trip.destination} Spotlight</Text>
                      {destWiki.data.description && (
                        <Text style={styles.guideDesc} numberOfLines={1}>{destWiki.data.description}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(destWiki.data!.url)}
                      style={styles.guideWikiBtn}
                    >
                      <MaterialCommunityIcons name="wikipedia" size={20} color={Colors.neutral900} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.guideExtract}>{destWiki.data.extract}</Text>
                </View>
              </Card>
            )}

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
          <>
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

            {/* Currency Converter Card */}
            <Card elevated style={styles.convCard}>
              <View style={styles.convHeader}>
                <MaterialCommunityIcons name="currency-usd" size={20} color={Colors.neutral900} />
                <Text style={styles.convTitle}>Live Currency Converter</Text>
              </View>

              <View style={styles.convRow}>
                <View style={styles.convInputWrap}>
                  <Text style={styles.convLabel}>From</Text>
                  <View style={styles.convSelectRow}>
                    <TextInput
                      style={styles.convInput}
                      keyboardType="numeric"
                      value={convAmount}
                      onChangeText={setConvAmount}
                      placeholder="Amount"
                    />
                    <View style={styles.convCodeBox}>
                      <Text style={styles.convCodeText}>{convFrom}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.convSwapBtn}
                  onPress={() => {
                    const temp = convFrom;
                    setConvFrom(convTo);
                    setConvTo(temp);
                  }}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color={Colors.neutral900} />
                </TouchableOpacity>

                <View style={styles.convInputWrap}>
                  <Text style={styles.convLabel}>To</Text>
                  <View style={styles.convSelectRow}>
                    <View style={styles.convResultBox}>
                      {convLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Text style={styles.convResultText}>
                          {exchangeRates[convTo]
                            ? (parseFloat(convAmount || '0') * exchangeRates[convTo]).toFixed(2)
                            : '0.00'
                          }
                        </Text>
                      )}
                    </View>
                    <View style={styles.convCodeBox}>
                      <Text style={styles.convCodeText}>{convTo}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.convRateRow}>
                <Text style={styles.convRateText}>
                  {exchangeRates[convTo] && !convLoading
                    ? `1 ${convFrom} = ${exchangeRates[convTo].toFixed(4)} ${convTo}`
                    : 'Fetching latest exchange rates…'
                  }
                </Text>
                <View style={styles.convChipsRow}>
                  {['USD', 'EUR', 'GBP', 'INR', 'JPY'].map((cur) => (
                    <TouchableOpacity
                      key={cur}
                      style={[styles.convChip, convFrom === cur && styles.convChipActive]}
                      onPress={() => {
                        if (cur === convTo) {
                          setConvTo(convFrom);
                        }
                        setConvFrom(cur);
                      }}
                    >
                      <Text style={[styles.convChipText, convFrom === cur && styles.convChipTextActive]}>{cur}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ─── JOURNEY WORKFLOW TAB ─────────────────────────────────────────── */}
        {activeTab === 'journey' && (
          <>
            {/* Header row */}
            <Card elevated style={styles.journeyHeaderCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space[3] }}>
                <View style={styles.journeyHeaderIcon}>
                  <MaterialCommunityIcons name="routes" size={22} color={Colors.neutral900} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.journeyHeaderTitle}>Travel Pathway</Text>
                  <Text style={styles.journeyHeaderSub}>
                    {journeyNodes.length} stops · {journeyNodes.filter(n => n.is_confirmed).length} confirmed
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.journeyAddBtn}
                  onPress={() => {
                    setNewNodeType('stay');
                    setNewNodeLocation('');
                    setNewNodeStayName('');
                    setNewNodeRoomNo('');
                    setNewNodeBookingRef('');
                    setNewNodeCheckIn('');
                    setNewNodeCheckOut('');
                    setNewNodeNights('1');
                    setNewNodeTransitMode('flight');
                    setNewNodeDeparture('');
                    setNewNodeArrival('');
                    setNewNodeNotes('');
                    setShowNodeModal(true);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={Colors.neutral900} />
                  <Text style={styles.journeyAddBtnText}>Add Stop</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Empty state */}
            {journeyNodes.length === 0 && (
              <Card elevated>
                <View style={{ alignItems: 'center', gap: Space[3], paddingVertical: Space[6] }}>
                  <MaterialCommunityIcons name="map-marker-path" size={48} color={Colors.neutral200} />
                  <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>No pathway defined yet</Text>
                  <Text style={[styles.emptyText, { textAlign: 'center' }]}>
                    Add stays, transit legs, and waypoints to build your complete travel route.
                  </Text>
                </View>
              </Card>
            )}

            {/* Vertical timeline nodes */}
            {journeyNodes.map((node, idx) => {
              const isStay = node.node_type === 'stay';
              const isTransit = node.node_type === 'transit';
              const isWaypoint = node.node_type === 'waypoint';

              const nodeColor = isStay
                ? Colors.primary
                : isTransit
                  ? '#F59E0B'
                  : '#8B5CF6';

              const nodeBg = isStay
                ? Colors.primaryLight
                : isTransit
                  ? '#FEF3C7'
                  : '#F3E8FF';

              const nodeIcon = isStay
                ? 'bed-outline'
                : isTransit
                  ? (node.transit_mode === 'flight' ? 'airplane'
                    : node.transit_mode === 'train' ? 'train'
                      : node.transit_mode === 'bus' ? 'bus'
                        : node.transit_mode === 'ferry' ? 'ferry'
                          : node.transit_mode === 'walk' ? 'walk'
                            : 'car')
                  : 'map-marker-outline';

              const TRANSIT_ICONS: Record<string, string> = {
                flight: 'airplane',
                train: 'train',
                bus: 'bus',
                car: 'car',
                ferry: 'ferry',
                walk: 'walk',
              };

              return (
                <View key={node.id}>
                  {/* Connector line above (skip for first item) */}
                  {idx > 0 && (
                    <View style={styles.journeyConnector}>
                      <View style={styles.journeyConnectorLine} />
                    </View>
                  )}

                  <Card elevated style={[
                    styles.journeyNodeCard,
                    node.is_confirmed && styles.journeyNodeCardConfirmed,
                  ]}>
                    {/* Node header */}
                    <View style={styles.journeyNodeHeader}>
                      <View style={[styles.journeyNodeIconBox, { backgroundColor: nodeBg, borderColor: nodeColor }]}>
                        <MaterialCommunityIcons name={nodeIcon as any} size={20} color={nodeColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.journeyNodeType}>
                          {isStay ? '🏨 Stay' : isTransit ? `✈️ ${(node.transit_mode || 'transit').charAt(0).toUpperCase() + (node.transit_mode || '').slice(1)}` : '📍 Waypoint'}
                        </Text>
                        <Text style={styles.journeyNodeLocation}>{node.location_name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Space[2] }}>
                        <TouchableOpacity
                          style={[styles.journeyConfirmBtn, node.is_confirmed && styles.journeyConfirmBtnActive]}
                          onPress={() => confirmJourneyNode(node.id, !node.is_confirmed)}
                        >
                          <MaterialCommunityIcons
                            name={node.is_confirmed ? 'check-circle' : 'circle-outline'}
                            size={16}
                            color={node.is_confirmed ? Colors.primary : Colors.neutral400}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.journeyDeleteBtn}
                          onPress={() =>
                            Alert.alert('Remove Stop', `Remove "${node.location_name}" from your journey?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => removeJourneyNode(node.id) },
                            ])
                          }
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.neutral400} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Stay details */}
                    {isStay && (
                      <View style={styles.journeyNodeDetails}>
                        {node.stay_name && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name="office-building" size={14} color={Colors.neutral600} />
                            <Text style={styles.journeyDetailText}>{node.stay_name}</Text>
                            {node.room_number && (
                              <Badge label={`Room ${node.room_number}`} variant="neutral" />
                            )}
                          </View>
                        )}
                        {(node.check_in || node.check_out) && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name="calendar-range" size={14} color={Colors.neutral600} />
                            <Text style={styles.journeyDetailText}>
                              {node.check_in} → {node.check_out}
                            </Text>
                            {node.nights > 0 && (
                              <Badge label={`${node.nights}N`} variant="primary" />
                            )}
                          </View>
                        )}
                        {node.booking_ref && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color={Colors.neutral600} />
                            <Text style={[styles.journeyDetailText, { fontFamily: FontFamily.mono ?? FontFamily.medium }]}>
                              Ref: {node.booking_ref}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Transit details */}
                    {isTransit && (
                      <View style={styles.journeyNodeDetails}>
                        {(node.transit_from || node.transit_to) && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name={TRANSIT_ICONS[node.transit_mode ?? 'car'] as any ?? 'car'} size={14} color={Colors.neutral600} />
                            <Text style={styles.journeyDetailText}>
                              {node.transit_from} → {node.transit_to}
                            </Text>
                          </View>
                        )}
                        {(node.departure_time || node.arrival_time) && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.neutral600} />
                            <Text style={styles.journeyDetailText}>
                              {node.departure_time} → {node.arrival_time}
                            </Text>
                          </View>
                        )}
                        {node.booking_ref && (
                          <View style={styles.journeyDetailRow}>
                            <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color={Colors.neutral600} />
                            <Text style={styles.journeyDetailText}>Ref: {node.booking_ref}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Notes */}
                    {node.notes && (
                      <View style={[styles.journeyDetailRow, { marginTop: Space[2] }]}>
                        <MaterialCommunityIcons name="note-text-outline" size={14} color={Colors.neutral600} />
                        <Text style={[styles.journeyDetailText, { fontStyle: 'italic' }]}>{node.notes}</Text>
                      </View>
                    )}

                    {/* Confirmed badge */}
                    {node.is_confirmed && (
                      <View style={styles.journeyConfirmedBadge}>
                        <MaterialCommunityIcons name="check-circle" size={12} color={Colors.primary} />
                        <Text style={styles.journeyConfirmedText}>Confirmed</Text>
                      </View>
                    )}
                  </Card>
                </View>
              );
            })}

            {/* Add Node Modal */}
            {showNodeModal && (
              <View style={styles.journeyModal}>
                <View style={styles.journeyModalContent}>
                  <View style={styles.journeyModalHeader}>
                    <Text style={styles.journeyModalTitle}>Add Journey Stop</Text>
                    <TouchableOpacity onPress={() => setShowNodeModal(false)}>
                      <MaterialCommunityIcons name="close" size={22} color={Colors.neutral900} />
                    </TouchableOpacity>
                  </View>

                  {/* Type selector */}
                  <View style={styles.journeyTypeRow}>
                    {(['stay', 'transit', 'waypoint'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.journeyTypeChip, newNodeType === t && styles.journeyTypeChipActive]}
                        onPress={() => setNewNodeType(t)}
                      >
                        <MaterialCommunityIcons
                          name={t === 'stay' ? 'bed-outline' : t === 'transit' ? 'airplane' : 'map-marker-outline'}
                          size={14}
                          color={newNodeType === t ? Colors.neutral900 : Colors.neutral600}
                        />
                        <Text style={[styles.journeyTypeChipText, newNodeType === t && styles.journeyTypeChipTextActive]}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Location (always) */}
                  <Text style={styles.journeyFieldLabel}>Location / City *</Text>
                  <TextInput
                    style={styles.journeyFieldInput}
                    placeholder="e.g. Jaipur, Rajasthan"
                    value={newNodeLocation}
                    onChangeText={setNewNodeLocation}
                  />

                  {/* Stay fields */}
                  {newNodeType === 'stay' && (
                    <>
                      <Text style={styles.journeyFieldLabel}>Hotel / Accommodation Name</Text>
                      <TextInput style={styles.journeyFieldInput} placeholder="e.g. Hotel Samode Haveli" value={newNodeStayName} onChangeText={setNewNodeStayName} />
                      <View style={{ flexDirection: 'row', gap: Space[3] }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Room No.</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="204" value={newNodeRoomNo} onChangeText={setNewNodeRoomNo} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Nights</Text>
                          <TextInput style={styles.journeyFieldInput} keyboardType="number-pad" placeholder="2" value={newNodeNights} onChangeText={setNewNodeNights} />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Space[3] }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Check-in</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="20 Dec" value={newNodeCheckIn} onChangeText={setNewNodeCheckIn} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Check-out</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="22 Dec" value={newNodeCheckOut} onChangeText={setNewNodeCheckOut} />
                        </View>
                      </View>
                      <Text style={styles.journeyFieldLabel}>Booking Ref / Confirmation No.</Text>
                      <TextInput style={styles.journeyFieldInput} placeholder="BKG-XXXXX" value={newNodeBookingRef} onChangeText={setNewNodeBookingRef} />
                    </>
                  )}

                  {/* Transit fields */}
                  {newNodeType === 'transit' && (
                    <>
                      <Text style={styles.journeyFieldLabel}>Mode of Transport</Text>
                      <View style={styles.journeyTypeRow}>
                        {['flight', 'train', 'bus', 'car', 'ferry', 'walk'].map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.journeyTypeChip, newNodeTransitMode === m && styles.journeyTypeChipActive]}
                            onPress={() => setNewNodeTransitMode(m)}
                          >
                            <Text style={[styles.journeyTypeChipText, newNodeTransitMode === m && styles.journeyTypeChipTextActive]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', gap: Space[3] }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>From</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="Delhi" value={newNodeLocation} onChangeText={setNewNodeLocation} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>To</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="Jaipur" onChangeText={() => { }} />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Space[3] }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Departure</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="09:30" value={newNodeDeparture} onChangeText={setNewNodeDeparture} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.journeyFieldLabel}>Arrival</Text>
                          <TextInput style={styles.journeyFieldInput} placeholder="11:15" value={newNodeArrival} onChangeText={setNewNodeArrival} />
                        </View>
                      </View>
                      <Text style={styles.journeyFieldLabel}>Booking Ref / PNR</Text>
                      <TextInput style={styles.journeyFieldInput} placeholder="PNR-XXXXX" value={newNodeBookingRef} onChangeText={setNewNodeBookingRef} />
                    </>
                  )}

                  {/* Notes (always) */}
                  <Text style={styles.journeyFieldLabel}>Notes</Text>
                  <TextInput
                    style={[styles.journeyFieldInput, { height: 64, textAlignVertical: 'top' }]}
                    placeholder="Any extra details…"
                    multiline
                    value={newNodeNotes}
                    onChangeText={setNewNodeNotes}
                  />

                  {/* Save button */}
                  <TouchableOpacity
                    style={[styles.journeySaveBtn, savingNode && { opacity: 0.5 }]}
                    disabled={savingNode || !newNodeLocation.trim()}
                    onPress={async () => {
                      if (!trip || !newNodeLocation.trim()) return;
                      setSavingNode(true);
                      await addJourneyNode({
                        trip_id: trip.id,
                        order_index: journeyNodes.length,
                        node_type: newNodeType,
                        location_name: newNodeLocation.trim(),
                        nights: parseInt(newNodeNights, 10) || 0,
                        stay_name: newNodeStayName.trim() || null,
                        room_number: newNodeRoomNo.trim() || null,
                        booking_ref: newNodeBookingRef.trim() || null,
                        check_in: newNodeCheckIn.trim() || null,
                        check_out: newNodeCheckOut.trim() || null,
                        transit_mode: newNodeType === 'transit' ? newNodeTransitMode : null,
                        transit_from: newNodeType === 'transit' ? newNodeLocation.trim() : null,
                        transit_to: null,
                        departure_time: newNodeDeparture.trim() || null,
                        arrival_time: newNodeArrival.trim() || null,
                        notes: newNodeNotes.trim() || null,
                        is_confirmed: false,
                      });
                      setSavingNode(false);
                      setShowNodeModal(false);
                    }}
                  >
                    {savingNode
                      ? <ActivityIndicator size="small" color={Colors.neutral900} />
                      : <Text style={styles.journeySaveBtnText}>Save Stop</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
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
          <>
            {/* Smart Suggestion Banner */}
            {trip && (
              <View style={{ gap: Space[3] }}>
                <TouchableOpacity
                  style={styles.suggBanner}
                  onPress={() => {
                    setShowSuggestions((v) => !v);
                    setShowTemplates(false);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={Colors.neutral900} />
                  <Text style={styles.suggBannerText}>Smart Packing Suggestions</Text>
                  <MaterialCommunityIcons
                    name={showSuggestions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.neutral600}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.suggBanner, { backgroundColor: '#F3F4F6' }]}
                  onPress={() => {
                    setShowTemplates((v) => !v);
                    setShowSuggestions(false);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={Colors.neutral900} />
                  <Text style={styles.suggBannerText}>Load Packing Presets</Text>
                  <MaterialCommunityIcons
                    name={showTemplates ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.neutral600}
                  />
                </TouchableOpacity>
              </View>
            )}

            {showSuggestions && trip && (() => {
              const suggestions = getSuggestions(trip.trip_type, trip.total_days, trip.destination);
              const existingNames = new Set(packingItems.map(i => i.name));
              const newSuggs = suggestions.filter(s => !existingNames.has(s.name));
              return (
                <Card elevated style={styles.suggCard}>
                  <View style={styles.suggHeader}>
                    <Text style={styles.sectionTitle}>Based on your {trip.trip_type} trip ({trip.total_days}d)</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        setAddingAll(true);
                        await bulkAddPackingItems(trip.id, newSuggs);
                        setShowSuggestions(false);
                        setAddingAll(false);
                      }}
                      disabled={addingAll || newSuggs.length === 0}
                      style={[styles.suggAddAllBtn, newSuggs.length === 0 && { opacity: 0.4 }]}
                    >
                      {addingAll
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Text style={styles.suggAddAllText}>Add All ({newSuggs.length})</Text>
                      }
                    </TouchableOpacity>
                  </View>

                  {newSuggs.length === 0 ? (
                    <Text style={styles.emptyText}>All suggestions already added! ✅</Text>
                  ) : (
                    <View style={styles.suggChips}>
                      {newSuggs.map((s) => (
                        <TouchableOpacity
                          key={s.name}
                          style={styles.suggChip}
                          onPress={() => bulkAddPackingItems(trip.id, [s])}
                        >
                          <MaterialCommunityIcons name="plus" size={14} color={Colors.neutral900} />
                          <Text style={styles.suggChipText}>{s.name}</Text>
                          <Text style={styles.suggChipCat}>{s.category}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })()}

            {showTemplates && trip && (
              <Card elevated style={styles.templateCard}>
                <Text style={styles.sectionTitle}>Select a preset checklist to import</Text>
                <View style={{ gap: Space[3] }}>
                  {TEMPLATE_PRESETS.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.templateItem, { backgroundColor: tpl.color }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        Alert.alert(
                          'Import Preset',
                          `Do you want to add all ${tpl.items.length} items from "${tpl.name}" into your packing list?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Import',
                              onPress: async () => {
                                await bulkAddPackingItems(trip.id, tpl.items);
                                setShowTemplates(false);
                                Alert.alert('Success', `Imported ${tpl.name} checklist items! 🎉`);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={styles.templateIconBox}>
                        <MaterialCommunityIcons name={tpl.icon as any} size={24} color={Colors.neutral900} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.templateItemName}>{tpl.name}</Text>
                        <Text style={styles.templateItemDesc}>{tpl.description}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.neutral600} />
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}

            <Card elevated>
              <Text style={styles.sectionTitle}>Packing List</Text>
              <View style={styles.packingProgress}>
                <View style={styles.packingBg}>
                  <View style={[styles.packingFill, { width: `${trip.progress_percent ?? 0}%` as any }]} />
                </View>
                <Text style={styles.packingLabel}>{trip.progress_percent ?? 0}% packed</Text>
              </View>
              {packingItems.length === 0 ? (
                <Text style={styles.emptyText}>No items yet. Tap “Smart Packing Suggestions” above to get started!</Text>
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
                        flex: 1,
                      }}>
                        {item.name}
                      </Text>
                      <Badge label={item.category} variant="neutral" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          </>
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

  // Smart Packing Suggestions
  suggBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    padding: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  suggBannerText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, flex: 1 },
  suggCard: { borderWidth: 2, borderColor: Colors.neutral900 },
  suggHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space[4] },
  suggAddAllBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    minWidth: 80,
    alignItems: 'center',
  },
  suggAddAllText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral900 },
  suggChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  suggChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1] + 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: Space[1] + 2,
    paddingHorizontal: Space[3],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  suggChipText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral900 },
  suggChipCat: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.neutral400, marginLeft: 2 },

  // Packing Templates
  templateCard: { borderWidth: 2, borderColor: Colors.neutral900 },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    padding: Space[3],
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  templateIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateItemName: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral900 },
  templateItemDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral600, marginTop: 2 },

  // Wikipedia Destination Guide Card
  guideCard: {
    borderWidth: 2,
    borderColor: Colors.neutral900,
    overflow: 'hidden',
  },
  guideLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    padding: Space[4],
  },
  guideLoadText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral600,
  },
  guideCoverWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
  },
  guideCoverPlaceholder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCover: {
    width: '100%',
    height: '100%',
  },
  guideContent: {
    padding: Space[4],
    gap: Space[2],
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Space[3],
  },
  guideTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
  },
  guideDesc: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral400,
    marginTop: 2,
  },
  guideWikiBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  guideExtract: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral700,
    lineHeight: FontSize.sm * 1.65,
    marginTop: Space[1],
  },

  // Currency Converter Styles
  convCard: {
    borderWidth: 2,
    borderColor: Colors.neutral900,
    marginTop: Space[4],
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    marginBottom: Space[4],
  },
  convTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space[2],
  },
  convInputWrap: {
    flex: 1,
    gap: Space[1],
  },
  convLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
  },
  convSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral900,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    height: 40,
  },
  convInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral900,
    paddingHorizontal: Space[2],
  },
  convCodeBox: {
    backgroundColor: Colors.bgSecondary,
    borderLeftWidth: 2,
    borderLeftColor: Colors.neutral900,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: Space[2],
    minWidth: 46,
    alignItems: 'center',
  },
  convCodeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral900,
  },
  convSwapBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space[4],
    ...Shadow.sm,
  },
  convResultBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Space[2],
  },
  convResultText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral900,
  },
  convRateRow: {
    marginTop: Space[4],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral100,
    paddingTop: Space[3],
    gap: Space[2],
  },
  convRateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
  },
  convChipsRow: {
    flexDirection: 'row',
    gap: Space[2],
    marginTop: Space[1],
  },
  convChip: {
    paddingVertical: Space[1],
    paddingHorizontal: Space[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  convChipActive: {
    backgroundColor: Colors.primary,
  },
  convChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.neutral900,
  },
  convChipTextActive: {
    color: Colors.neutral900,
  },

  // ─── Journey Workflow Styles ────────────────────────────────────────────────
  journeyHeaderCard: {
    borderWidth: 2,
    borderColor: Colors.neutral900,
  },
  journeyHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  journeyHeaderTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
  },
  journeyHeaderSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
    marginTop: 2,
  },
  journeyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1],
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Space[2],
    paddingHorizontal: Space[3],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  journeyAddBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral900,
  },

  journeyConnector: {
    alignItems: 'center',
    height: 20,
  },
  journeyConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.neutral300,
    borderStyle: 'dashed',
  },

  journeyNodeCard: {
    borderWidth: 2,
    borderColor: Colors.neutral900,
  },
  journeyNodeCardConfirmed: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  journeyNodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
  },
  journeyNodeIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNodeType: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
  },
  journeyNodeLocation: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
    marginTop: 2,
  },
  journeyConfirmBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  journeyConfirmBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  journeyDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },

  journeyNodeDetails: {
    marginTop: Space[3],
    gap: Space[2],
    paddingTop: Space[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral100,
  },
  journeyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    flexWrap: 'wrap',
  },
  journeyDetailText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral700,
    flex: 1,
  },

  journeyConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1],
    marginTop: Space[3],
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: Space[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  journeyConfirmedText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    color: Colors.primary,
  },

  // Modal overlay
  journeyModal: {
    position: 'absolute',
    top: 0, left: -Space[4], right: -Space[4], bottom: -Space[10],
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  journeyModalContent: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 2,
    borderColor: Colors.neutral900,
    padding: Space[5],
    gap: Space[3],
    maxHeight: '92%',
    ...Shadow.sm,
  },
  journeyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space[2],
  },
  journeyModalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral900,
  },

  journeyTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space[2],
  },
  journeyTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1],
    paddingVertical: Space[2],
    paddingHorizontal: Space[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  journeyTypeChipActive: {
    backgroundColor: Colors.primary,
  },
  journeyTypeChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral700,
  },
  journeyTypeChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral900,
  },

  journeyFieldLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.neutral600,
    marginBottom: 2,
  },
  journeyFieldInput: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    borderRadius: Radius.md,
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral900,
  },

  journeySaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    paddingVertical: Space[3],
    alignItems: 'center',
    marginTop: Space[2],
    ...Shadow.sm,
  },
  journeySaveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral900,
  },
});
