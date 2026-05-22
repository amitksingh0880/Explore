import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space, StopTypeConfig } from '../../../theme';
import { useWanderPlanStore } from '../../../db/store';
import type { Stop, Day } from '../../../db/database';

// ─── Geocode a stop name via Nominatim if lat/lng is 0 ─────────────
async function geocodeLocation(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'WanderPlan-App/1.0' } }
    );
    const data = await res.json();
    if (data?.length) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Fetch OSRM driving route between ordered coords ───────────────
async function fetchOSRMRoute(coords: { lat: number; lng: number }[]): Promise<number[][] | null> {
  if (coords.length < 2) return null;
  try {
    const waypoints = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`
    );
    const data = await res.json();
    if (data?.routes?.length) {
      // GeoJSON coords are [lng, lat], Leaflet needs [lat, lng]
      return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Build the full Leaflet HTML string ────────────────────────────
function buildLeafletHTML(
  markers: { lat: number; lng: number; label: string; color: string; name: string; time: string; day: number }[],
  routeCoords: number[][] | null,
  centerLat: number,
  centerLng: number,
  zoom: number
): string {
  const markersJson = JSON.stringify(markers);
  const routeJson = JSON.stringify(routeCoords ?? []);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { height: 100%; width: 100%; font-family: -apple-system, sans-serif; }
  .custom-marker {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 3px solid #1a1a1a; font-weight: 900; font-size: 13px;
    color: #1a1a1a; box-shadow: 0 3px 8px rgba(0,0,0,0.35);
    cursor: pointer;
  }
  .popup-title { font-weight: 700; font-size: 14px; color: #111; margin-bottom: 3px; }
  .popup-meta { font-size: 12px; color: #666; }
  .popup-day { 
    display: inline-block; background: #f0f0f0; 
    padding: 2px 8px; border-radius: 12px; 
    font-size: 11px; font-weight: 600; margin-top: 4px; 
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${centerLat}, ${centerLng}], ${zoom});
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  var markers = ${markersJson};
  var route = ${routeJson};

  // Draw route polyline (OSRM road-following route)
  if (route && route.length > 1) {
    L.polyline(route, {
      color: '#4ADE80',
      weight: 5,
      opacity: 0.85,
      dashArray: null,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }

  // Draw straight fallback line if no route
  if ((!route || route.length < 2) && markers.length > 1) {
    var pts = markers.map(function(m) { return [m.lat, m.lng]; });
    L.polyline(pts, { color: '#A78BFA', weight: 3, opacity: 0.7, dashArray: '8,6' }).addTo(map);
  }

  // Add numbered markers
  var bounds = [];
  markers.forEach(function(m, i) {
    var div = L.divIcon({
      html: '<div class="custom-marker" style="background:' + m.color + '">' + (i + 1) + '</div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });
    
    var popupHtml = '<div class="popup-title">' + m.name + '</div>'
      + (m.time ? '<div class="popup-meta">⏰ ' + m.time + '</div>' : '')
      + '<div class="popup-day">Day ' + m.day + '</div>';
    
    L.marker([m.lat, m.lng], { icon: div })
      .addTo(map)
      .bindPopup(popupHtml, { maxWidth: 220 });
    
    bounds.push([m.lat, m.lng]);
  });

  // Fit map to all markers
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [48, 48] });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  }

  // Send tap events to React Native
  map.on('click', function(e) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick', lat: e.latlng.lat, lng: e.latlng.lng }));
  });
</script>
</body>
</html>`;
}

// ─── Stop type color ────────────────────────────────────────────────
function getStopColor(type: string): string {
  const cfg = StopTypeConfig[type as keyof typeof StopTypeConfig];
  return cfg?.color ?? '#A78BFA';
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function TripRouteMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const trip = useWanderPlanStore((s) => s.activeTrip);
  const days = useWanderPlanStore((s) => s.activeDays);
  const stopsByDay = useWanderPlanStore((s) => s.activeStopsByDay);
  const selectTrip = useWanderPlanStore((s) => s.selectTrip);

  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState('');
  const [html, setHtml] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // null = all
  const [orderedStops, setOrderedStops] = useState<Array<Stop & { dayNumber: number; dayTitle: string }>>([]);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) selectTrip(id);
  }, [id]);

  // Build ordered stop list from days + stopsByDay
  const allStops: Array<Stop & { dayNumber: number; dayTitle: string }> = React.useMemo(() => {
    const result: Array<Stop & { dayNumber: number; dayTitle: string }> = [];
    for (const day of days) {
      const stops = stopsByDay[day.id] ?? [];
      for (const stop of stops) {
        result.push({ ...stop, dayNumber: day.day_number, dayTitle: day.title ?? `Day ${day.day_number}` });
      }
    }
    return result;
  }, [days, stopsByDay]);

  const filteredStops = React.useMemo(() => {
    if (!selectedDay) return allStops;
    const day = days.find((d) => d.id === selectedDay);
    if (!day) return allStops;
    return allStops.filter((s) => s.dayNumber === day.day_number);
  }, [allStops, selectedDay, days]);

  const buildMap = useCallback(async () => {
    if (!trip || filteredStops.length === 0) {
      setLoading(false);
      setHtml(buildLeafletHTML([], null, 20.5937, 78.9629, 5)); // India center
      return;
    }
    setGeocoding(true);

    // Geocode stops that have lat=0, lng=0
    const geocoded: Array<{ lat: number; lng: number; label: string; color: string; name: string; time: string; day: number }> = [];
    for (let i = 0; i < filteredStops.length; i++) {
      const stop = filteredStops[i];
      let lat = stop.lat;
      let lng = stop.lng;

      if (!lat || !lng || (lat === 0 && lng === 0)) {
        setGeocodeProgress(`Locating ${stop.name}… (${i + 1}/${filteredStops.length})`);
        const geo = await geocodeLocation(stop.location || stop.name);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      if (lat && lng && !(lat === 0 && lng === 0)) {
        geocoded.push({
          lat,
          lng,
          label: String(geocoded.length + 1),
          color: getStopColor(stop.type),
          name: stop.name,
          time: stop.time ?? '',
          day: stop.dayNumber,
        });
      }
    }

    setGeocodeProgress('Fetching route…');

    // Fetch OSRM route
    let routeCoords: number[][] | null = null;
    if (geocoded.length >= 2) {
      routeCoords = await fetchOSRMRoute(geocoded);
    }

    const centerLat = geocoded.length > 0 ? geocoded[Math.floor(geocoded.length / 2)].lat : 20.5937;
    const centerLng = geocoded.length > 0 ? geocoded[Math.floor(geocoded.length / 2)].lng : 78.9629;

    setOrderedStops(filteredStops);
    setHtml(buildLeafletHTML(geocoded, routeCoords, centerLat, centerLng, geocoded.length === 1 ? 14 : 10));
    setGeocoding(false);
    setLoading(false);
  }, [trip, filteredStops]);

  useEffect(() => {
    if (trip) {
      setLoading(true);
      buildMap();
    }
  }, [trip, selectedDay]);

  const toggleBottomSheet = () => {
    const toValue = bottomSheetOpen ? 0 : 1;
    Animated.spring(slideAnim, { toValue, useNativeDriver: true, tension: 65, friction: 11 }).start();
    setBottomSheetOpen(!bottomSheetOpen);
  };

  const openInMaps = (stop: Stop & { dayNumber: number }) => {
    const query = stop.location || stop.name;
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${encodeURIComponent(query)}`
      : `geo:0,0?q=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
    });
  };

  const bottomTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.neutral900} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{trip?.title ?? 'Route Map'}</Text>
              <Text style={styles.headerSub}>
                {allStops.length} stops · {days.length} days · OpenStreetMap
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={toggleBottomSheet}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color={Colors.neutral900} />
            </TouchableOpacity>
          </View>

          {/* Day filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayChips}
          >
            <TouchableOpacity
              style={[styles.dayChip, !selectedDay && styles.dayChipActive]}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={[styles.dayChipText, !selectedDay && styles.dayChipTextActive]}>All Days</Text>
            </TouchableOpacity>
            {days.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[styles.dayChip, selectedDay === day.id && styles.dayChipActive]}
                onPress={() => setSelectedDay(selectedDay === day.id ? null : day.id)}
              >
                <Text style={[styles.dayChipText, selectedDay === day.id && styles.dayChipTextActive]}>
                  Day {day.day_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {(loading || geocoding) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingTitle}>Building your route…</Text>
              <Text style={styles.loadingText}>
                {geocodeProgress || 'Preparing map…'}
              </Text>
            </View>
          </View>
        )}

        {html ? (
          <WebView
            source={{ html }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            onMessage={(e) => {
              // Handle messages from Leaflet if needed
            }}
          />
        ) : !loading ? (
          <View style={styles.emptyMap}>
            <MaterialCommunityIcons name="map-marker-off" size={64} color={Colors.neutral200} />
            <Text style={styles.emptyTitle}>No stops with locations</Text>
            <Text style={styles.emptyText}>Add stops with location names to see them on the map.</Text>
          </View>
        ) : null}
      </View>

      {/* Map legend */}
      {!loading && html && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#4ADE80' }]} />
            <Text style={styles.legendText}>Road route (OSRM)</Text>
          </View>
          <View style={styles.legendDot} />
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#A78BFA', borderStyle: 'dashed' }]} />
            <Text style={styles.legendText}>Fallback path</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={buildMap} style={styles.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={16} color={Colors.neutral900} />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom sheet — stop list */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: bottomTranslateY }] }]}>
        <View style={styles.bottomSheetHandle} />
        <View style={styles.bottomSheetHeader}>
          <Text style={styles.bottomSheetTitle}>All Stops</Text>
          <TouchableOpacity onPress={toggleBottomSheet}>
            <MaterialCommunityIcons name="close" size={20} color={Colors.neutral900} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.stopList} showsVerticalScrollIndicator={false}>
          {orderedStops.map((stop, idx) => {
            const cfg = StopTypeConfig[stop.type as keyof typeof StopTypeConfig] ?? StopTypeConfig.activity;
            return (
              <TouchableOpacity
                key={stop.id}
                style={styles.stopItem}
                onPress={() => openInMaps(stop)}
                activeOpacity={0.8}
              >
                <View style={[styles.stopNum, { backgroundColor: cfg.color }]}>
                  <Text style={styles.stopNumText}>{idx + 1}</Text>
                </View>
                <View style={styles.stopItemInfo}>
                  <Text style={styles.stopItemName} numberOfLines={1}>{stop.name}</Text>
                  <Text style={styles.stopItemMeta}>Day {stop.dayNumber} · {stop.time || '—'}</Text>
                </View>
                <MaterialCommunityIcons name="navigation" size={16} color={Colors.neutral400} />
              </TouchableOpacity>
            );
          })}
          {orderedStops.length === 0 && (
            <Text style={styles.emptyText}>No stops for the selected day.</Text>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },

  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
    ...Shadow.sm,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[4],
    paddingTop: Space[2],
    paddingBottom: Space[2],
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  headerSub: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 1 },

  dayChips: { paddingHorizontal: Space[4], paddingVertical: Space[2], gap: Space[2] },
  dayChip: {
    paddingVertical: Space[1] + 2, paddingHorizontal: Space[3],
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 2, borderColor: Colors.neutral900, ...Shadow.sm,
  },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral600 },
  dayChipTextActive: { color: Colors.neutral900 },

  mapContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },

  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 2, borderColor: Colors.neutral900,
    padding: Space[6], alignItems: 'center', gap: Space[3],
    ...Shadow.md,
  },
  loadingTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  loadingText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, textAlign: 'center' },

  emptyMap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space[3], padding: Space[6] },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.neutral700 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, textAlign: 'center' },

  legend: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    paddingHorizontal: Space[4], paddingVertical: Space[2],
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.neutral100,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space[1] },
  legendLine: { width: 20, height: 3, borderRadius: 2 },
  legendDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.neutral200 },
  legendText: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.neutral400 },
  refreshBtn: {
    width: 28, height: 28, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    borderTopWidth: 2, borderColor: Colors.neutral900,
    maxHeight: 320,
    ...Shadow.md,
  },
  bottomSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral200, alignSelf: 'center', marginTop: Space[3],
  },
  bottomSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space[4], paddingVertical: Space[3],
    borderBottomWidth: 1, borderBottomColor: Colors.neutral100,
  },
  bottomSheetTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  stopList: { flex: 1 },

  stopItem: {
    flexDirection: 'row', alignItems: 'center', gap: Space[3],
    paddingHorizontal: Space[4], paddingVertical: Space[3],
    borderBottomWidth: 1, borderBottomColor: Colors.neutral50,
  },
  stopNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.neutral900,
  },
  stopNumText: { fontFamily: FontFamily.bold, fontSize: 12, color: Colors.neutral900 },
  stopItemInfo: { flex: 1 },
  stopItemName: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral900 },
  stopItemMeta: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 1 },
});
