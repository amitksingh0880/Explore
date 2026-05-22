import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space, StopTypeConfig } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// Mock stop data — replace with WatermelonDB query
const MOCK_STOPS: Record<string, any> = {
  s1: {
    id: 's1',
    name: 'Jaipur Airport',
    type: 'transport',
    time: '11:00',
    duration: 60,
    location: 'Sanganer, Jaipur',
    lat: 26.8242, lng: 75.8122,
    cost: 0,
    currency: '₹',
    isBooked: true,
    bookingRef: 'AIR-2026-JKL',
    notes: 'Arrive at Terminal 2. Auto-rickshaw to hotel is ~₹350.',
    photos: [],
    contact: { name: 'IndiGo Airlines', phone: '+91-99999-00000', type: 'transport' },
  },
  s3: {
    id: 's3',
    name: 'Hawa Mahal',
    type: 'activity',
    time: '16:00',
    duration: 90,
    location: 'Badi Choupad, Jaipur',
    lat: 26.9239, lng: 75.8267,
    cost: 200,
    currency: '₹',
    isBooked: false,
    notes: 'Best photographed from the street opposite. Climb to the top for city views.',
    photos: [],
    contact: null,
  },
};

// ─── Wikipedia helper ──────────────────────────────────────────────
async function fetchWikiExtract(name: string): Promise<{ extract: string; url: string } | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WanderPlan-App/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === 'disambiguation' || !data.extract) return null;
    return {
      extract: data.extract.slice(0, 300) + (data.extract.length > 300 ? '…' : ''),
      url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,
    };
  } catch {
    return null;
  }
}

function useWiki(name: string) {
  const [data, setData] = useState<{ extract: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchWikiExtract(name).then((d) => { setData(d); setLoading(false); });
  }, [name]);
  return { data, loading };
}

export default function StopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const stop = MOCK_STOPS[id as string] ?? MOCK_STOPS['s3'];
  const cfg = StopTypeConfig[stop.type as keyof typeof StopTypeConfig] ?? StopTypeConfig.activity;
  const wiki = useWiki(stop.name);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <LinearGradient colors={[cfg.color, cfg.color + 'BB']} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.heroNavRight}>
              <TouchableOpacity style={styles.navBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.stopTypeRow}>
              <View style={styles.typeIconWrap}>
                <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
              </View>
              <Text style={styles.stopType}>{stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}</Text>
            </View>
            <Text style={styles.heroTitle}>{stop.name}</Text>
            <View style={styles.heroMeta}>
              <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{stop.location}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Time & Duration */}
        <Card elevated>
          <Text style={styles.sectionLabel}>Time & Duration</Text>
          <View style={styles.infoRow}>
            <InfoChip icon="clock-outline" label="Arrival" value={stop.time} />
            <View style={styles.infoDivider} />
            <InfoChip icon="timer-outline" label="Duration" value={`${stop.duration} min`} />
            {stop.cost > 0 && (
              <>
                <View style={styles.infoDivider} />
                <InfoChip icon="wallet-outline" label="Cost" value={`${stop.currency}${stop.cost}`} />
              </>
            )}
          </View>
        </Card>

        {/* Booking */}
        <Card elevated>
          <View style={styles.bookingRow}>
            <View style={styles.bookingLeft}>
              <Text style={styles.sectionLabel}>Booking Status</Text>
              <Badge
                label={stop.isBooked ? 'Confirmed' : 'Not Booked'}
                variant={stop.isBooked ? 'primary' : 'neutral'}
                dot
              />
            </View>
            {stop.bookingRef && (
              <View>
                <Text style={styles.refLabel}>Ref</Text>
                <Text style={styles.refValue}>{stop.bookingRef}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Notes */}
        {stop.notes && (
          <Card elevated>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notes}>{stop.notes}</Text>
          </Card>
        )}

        {/* Wikipedia Card */}
        <Card elevated>
          <View style={styles.wikiHeader}>
            <MaterialCommunityIcons name="wikipedia" size={22} color={Colors.neutral900} />
            <Text style={styles.sectionLabel} numberOfLines={1}>About this place</Text>
            {wiki.data && (
              <TouchableOpacity onPress={() => Linking.openURL(wiki.data!.url)} style={styles.wikiLink}>
                <MaterialCommunityIcons name="open-in-new" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {wiki.loading && (
            <View style={styles.wikiLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.wikiLoadText}>Fetching from Wikipedia…</Text>
            </View>
          )}
          {!wiki.loading && wiki.data && (
            <Text style={styles.wikiExtract}>{wiki.data.extract}</Text>
          )}
          {!wiki.loading && !wiki.data && (
            <Text style={styles.wikiEmpty}>No Wikipedia article found for “{stop.name}”.</Text>
          )}
        </Card>

        {/* Contact */}
        {stop.contact && (
          <Card elevated>
            <Text style={styles.sectionLabel}>Contact</Text>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="account-circle" size={36} color={Colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{stop.contact.name}</Text>
                <Text style={styles.contactPhone}>{stop.contact.phone}</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.contactBtn}>
                  <MaterialCommunityIcons name="phone" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactBtn}>
                  <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}

        {/* Photos placeholder */}
        <Card elevated>
          <Text style={styles.sectionLabel}>Photos</Text>
          <TouchableOpacity style={styles.addPhotoBtn}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={Colors.neutral400} />
            <Text style={styles.addPhotoText}>Add photos from camera or gallery</Text>
          </TouchableOpacity>
        </Card>

        {/* Map placeholder */}
        <Card elevated style={styles.mapCard}>
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map" size={36} color={Colors.neutral400} />
            <Text style={styles.mapText}>
              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
            </Text>
            <Text style={styles.mapSubText}>MapLibre + OpenStreetMap (coming next)</Text>
          </View>
        </Card>

        <Button
          label="Mark as Visited ✓"
          onPress={() => {}}
          gradient
          size="lg"
          fullWidth
          style={styles.visitBtn}
          icon={<MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.white} />}
        />

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

function InfoChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={icStyles.wrap}>
      <MaterialCommunityIcons name={icon as any} size={16} color={Colors.primary} />
      <Text style={icStyles.label}>{label}</Text>
      <Text style={icStyles.value}>{value}</Text>
    </View>
  );
}
const icStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },
  value: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  hero: { paddingBottom: Space[5] },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space[4], paddingTop: Space[2], paddingBottom: Space[3],
  },
  heroNavRight: { flexDirection: 'row', gap: Space[2] },
  navBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroContent: { paddingHorizontal: Space[5], gap: Space[2] },
  stopTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  typeIconWrap: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  stopType: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.white },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },

  content: { padding: Space[4], gap: Space[3] },
  sectionLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Space[3] },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  infoDivider: { width: 1, height: 40, backgroundColor: Colors.neutral100 },

  bookingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bookingLeft: { gap: Space[2] },
  refLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },
  refValue: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.secondary },

  notes: { fontFamily: FontFamily.regular, fontSize: FontSize.md, color: Colors.neutral700, lineHeight: FontSize.md * 1.6 },

  // Wikipedia card
  wikiHeader: { flexDirection: 'row', alignItems: 'center', gap: Space[2], marginBottom: Space[3] },
  wikiLink: { marginLeft: 'auto' as any, padding: Space[1] },
  wikiLoading: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  wikiLoadText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400 },
  wikiExtract: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral700, lineHeight: FontSize.sm * 1.65 },
  wikiEmpty: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  contactIcon: {},
  contactInfo: { flex: 1 },
  contactName: { fontFamily: FontFamily.semibold, fontSize: FontSize.md, color: Colors.neutral900 },
  contactPhone: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: Space[2] },
  contactBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  addPhotoBtn: {
    height: 100, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.neutral100, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: Space[2],
  },
  addPhotoText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400 },

  mapCard: {},
  mapPlaceholder: {
    height: 140, borderRadius: Radius.md,
    backgroundColor: Colors.neutral50,
    alignItems: 'center', justifyContent: 'center', gap: Space[2],
  },
  mapText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral700 },
  mapSubText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400 },

  visitBtn: { borderRadius: Radius.full },
});
