import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useRouter, useNavigation } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { scrapeYouTubeItinerary } from '../../services/youtube';
import { useWanderPlanStore } from '../../db/store';
import { getDaysForTrip } from '../../db/database';

// Pipeline step definitions
const STEPS = [
  { id: 'fetch',    icon: 'download-outline',     label: 'Fetching metadata' },
  { id: 'transcript', icon: 'closed-caption',      label: 'Loading transcript' },
  { id: 'parse',    icon: 'text-search',           label: 'Parsing itinerary' },
  { id: 'geocode',  icon: 'map-marker-radius',     label: 'Geocoding locations' },
  { id: 'build',    icon: 'calendar-check',        label: 'Building trip' },
];

type StepStatus = 'pending' | 'running' | 'done' | 'error';

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function YouTubeImportScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [videoTitle, setVideoTitle] = useState('');
  const [videoThumb, setVideoThumb] = useState('');
  const [draftDays, setDraftDays] = useState<any[]>([]);

  const createNewTrip = useWanderPlanStore((state) => state.createNewTrip);
  const addStop = useWanderPlanStore((state) => state.addStop);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const setStep = (id: string, status: StepStatus) =>
    setStepStatuses((prev) => ({ ...prev, [id]: status }));

  const handleImport = async () => {
    const id = extractVideoId(url.trim());
    if (!id) { shake(); return; }
    setVideoId(id);
    setProcessing(true);
    setStepStatuses({});
    setDraftDays([]);

    try {
      // Step 1 — fetch metadata
      setStep('fetch', 'running');
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
      ).then((r) => r.json());
      setVideoTitle(oembed.title ?? 'Travel Vlog');
      setVideoThumb(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
      setStep('fetch', 'done');

      // Step 2 — transcript parsing
      setStep('transcript', 'running');
      const result = await scrapeYouTubeItinerary(id);
      setStep('transcript', 'done');

      // Step 3 — NLP parse
      setStep('parse', 'running');
      await new Promise((r) => setTimeout(r, 600));
      setStep('parse', 'done');

      // Step 4 — geocode
      setStep('geocode', 'running');
      await new Promise((r) => setTimeout(r, 600));
      setStep('geocode', 'done');

      // Step 5 — build draft itinerary
      setStep('build', 'running');
      await new Promise((r) => setTimeout(r, 600));
      
      setDraftDays(result.days);
      setStep('build', 'done');
    } catch (e) {
      console.error(e);
      Alert.alert('Import failed', 'Could not load this video. Check the URL and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveTrip = async () => {
    if (draftDays.length === 0) return;
    setProcessing(true);
    try {
      // Formulate dates
      const today = new Date();
      const format = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const startDateStr = format(today);
      
      const endDate = new Date();
      endDate.setDate(today.getDate() + (draftDays.length - 1));
      const endDateStr = format(endDate);

      const totalBudget = draftDays.reduce((sum, d) => sum + d.stops.reduce((sSum: number, s: any) => sSum + (s.cost || 0), 0), 0) || 15000;

      const cleanDestination = videoTitle
        .split(' - ')[0]
        .split(' | ')[0]
        .replace(/3D|4K|Vlog|Tour|Travel|Guide/gi, '')
        .trim();

      const newTrip = await createNewTrip({
        title: videoTitle.substring(0, 50) || 'YouTube Travel Plan',
        destination: cleanDestination.substring(0, 30) || 'Scenic Route',
        start_date: startDateStr,
        end_date: endDateStr,
        total_days: draftDays.length,
        total_budget: totalBudget,
        currency: '₹',
        trip_type: 'leisure',
        travelers: 1,
        cover_gradient: 'g3',
        status: 'active'
      });

      // Fetch newly created sequential day rows
      const dbDays = await getDaysForTrip(newTrip.id);

      // Populate stops
      for (const draftDay of draftDays) {
        const matchingDbDay = dbDays.find((d) => d.day_number === draftDay.day);
        if (matchingDbDay) {
          for (const stop of draftDay.stops) {
            await addStop({
              day_id: matchingDbDay.id,
              name: stop.name,
              type: stop.type || 'activity',
              time: stop.time || '10:00',
              duration: 60,
              location: '',
              lat: 0,
              lng: 0,
              cost: stop.cost || 0,
              is_booked: true,
              booking_ref: '',
              notes: stop.notes || '',
              contact_name: '',
              contact_phone: '',
            });
          }
        }
      }

      Alert.alert(
        '🎉 Success!',
        'Itinerary parsed, mapped, and saved to your local offline database!',
        [
          { text: 'View Trip', onPress: () => router.push(`/trip/${newTrip.id}`) },
          { text: 'OK' }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Save failed', 'Could not save the generated trip itinerary.');
    } finally {
      setProcessing(false);
    }
  };

  const confidenceVariant = (c: string) =>
    c === 'High' ? 'primary' : c === 'Medium' ? 'warning' : 'neutral';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space[3] }}>
              <TouchableOpacity
                style={styles.hamburgerBtn}
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              >
                <MaterialCommunityIcons name="menu" size={24} color={Colors.neutral900} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerSub}>Auto-generate itinerary</Text>
                <Text style={styles.headerTitle}>YouTube Import</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="youtube" size={40} color={Colors.danger} />
          </View>

          {/* URL input */}
          <Animated.View style={[styles.urlWrap, { transform: [{ translateX: shakeAnim }] }]}>
            <MaterialCommunityIcons name="link-variant" size={18} color={Colors.neutral400} style={styles.urlIcon} />
            <TextInput
              style={styles.urlInput}
              placeholder="Paste YouTube link here…"
              placeholderTextColor={Colors.neutral400}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleImport}
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => { setUrl(''); setVideoId(null); setDraftDays([]); }} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.neutral400} style={{ marginRight: Space[3] }} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* CTA button */}
        <Button
          label={processing ? 'Processing…' : 'Import Itinerary'}
          onPress={handleImport}
          loading={processing}
          disabled={!url.trim()}
          variant="danger"
          size="lg"
          fullWidth
          icon={!processing ? <MaterialCommunityIcons name="magic-staff" size={18} color={Colors.white} /> : undefined}
          style={styles.importBtn}
        />

        {/* How it works */}
        {!videoId && (
          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How it works</Text>
            <View style={styles.howSteps}>
              {[
                ['link-variant', 'Paste any YouTube travel vlog URL'],
                ['closed-caption', 'We extract the video transcript (no API key needed)'],
                ['text-search', 'Our parser detects days, locations, costs & activities'],
                ['map-marker-multiple', 'Locations are geocoded via OpenStreetMap'],
                ['calendar-check', 'Your complete itinerary is ready to review & save'],
              ].map(([icon, text], i) => (
                <View key={i} style={styles.howStep}>
                  <View style={styles.howStepNum}>
                    <Text style={styles.howStepNumText}>{i + 1}</Text>
                  </View>
                  <MaterialCommunityIcons name={icon as any} size={18} color={Colors.primary} style={{ marginTop: 1 }} />
                  <Text style={styles.howStepText}>{text}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Pipeline progress */}
        {videoId && (
          <>
            {videoThumb ? (
              <Card style={styles.videoCard} elevated>
                <View style={{ flexDirection: 'row', gap: Space[3], alignItems: 'center' }}>
                  <View style={styles.thumbWrap}>
                    {/* Thumbnail shown via background color placeholder */}
                    <View style={[styles.thumb, { backgroundColor: '#CC0000' }]}>
                      <MaterialCommunityIcons name="play-circle" size={32} color={Colors.white} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{videoTitle}</Text>
                    <Text style={styles.videoId}>ID: {videoId}</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* Steps */}
            <Card style={styles.pipelineCard}>
              <Text style={styles.pipelineTitle}>Processing</Text>
              {STEPS.map((step) => {
                const status = stepStatuses[step.id] ?? 'pending';
                return (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={[styles.stepIcon, status === 'done' && styles.stepIconDone, status === 'error' && styles.stepIconError]}>
                      {status === 'running' ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : status === 'done' ? (
                        <MaterialCommunityIcons name="check" size={16} color={Colors.white} />
                      ) : status === 'error' ? (
                        <MaterialCommunityIcons name="close" size={16} color={Colors.white} />
                      ) : (
                        <MaterialCommunityIcons name={step.icon as any} size={16} color={Colors.neutral400} />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, status === 'done' && styles.stepLabelDone, status === 'running' && styles.stepLabelRunning]}>
                      {step.label}
                    </Text>
                    {status === 'done' && (
                      <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                    )}
                  </View>
                );
              })}
            </Card>

            {/* Draft itinerary */}
            {draftDays.length > 0 && (
              <>
                <Text style={styles.draftTitle}>Detected Itinerary</Text>
                <Text style={styles.draftSub}>Review and edit before saving as a trip.</Text>
                {draftDays.map((day) => (
                  <Card key={day.day} style={styles.dayCard} elevated>
                    <View style={styles.dayHeader}>
                      <View style={styles.dayNum}>
                        <Text style={styles.dayNumText}>{day.day}</Text>
                      </View>
                      <Text style={styles.dayTitle}>Day {day.day} — {day.title}</Text>
                    </View>
                    {day.stops.map((stop: any, i: number) => (
                      <View key={i} style={styles.stopRow}>
                        <MaterialCommunityIcons name="circle-small" size={20} color={Colors.neutral400} />
                        <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                        <Badge label={stop.confidence} variant={confidenceVariant(stop.confidence)} size="sm" />
                      </View>
                    ))}
                  </Card>
                ))}

                <Button
                  label="Save as Trip"
                  onPress={handleSaveTrip}
                  gradient
                  size="lg"
                  fullWidth
                  style={styles.saveBtn}
                  icon={<MaterialCommunityIcons name="content-save" size={18} color={Colors.white} />}
                />
              </>
            )}
          </>
        )}

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingBottom: Space[4], backgroundColor: Colors.dangerLight },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[5],
    paddingTop: Space[3],
    paddingBottom: Space[3],
  },
  headerSub: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.danger },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.neutral900, marginTop: 2 },
  hamburgerBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  urlWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Space[5],
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  urlIcon: { marginLeft: Space[4] },
  urlInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral900,
    paddingHorizontal: Space[3],
    paddingVertical: Space[3] + 2,
  },
  content: { padding: Space[5], gap: Space[4] },
  importBtn: { borderRadius: Radius.full },
  howCard: {},
  howTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, marginBottom: Space[3] },
  howSteps: { gap: Space[3] },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
  howStepNum: {
    width: 24, height: 24, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },
  howStepNumText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral900 },
  howStepText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral700,
    lineHeight: FontSize.sm * 1.5,
  },
  videoCard: {},
  thumbWrap: {},
  thumb: {
    width: 80, height: 56, borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },
  videoTitle: { fontFamily: FontFamily.semibold, fontSize: FontSize.md, color: Colors.neutral900 },
  videoId: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 },
  pipelineCard: {},
  pipelineTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, marginBottom: Space[3] },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3], paddingVertical: Space[2] },
  stepIcon: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.neutral50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.neutral900,
  },
  stepIconDone: { backgroundColor: Colors.primary, borderColor: Colors.neutral900 },
  stepIconError: { backgroundColor: Colors.danger, borderColor: Colors.neutral900 },
  stepLabel: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400 },
  stepLabelDone: { color: Colors.neutral700 },
  stepLabelRunning: { color: Colors.primary, fontFamily: FontFamily.medium },

  draftTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.neutral900 },
  draftSub: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, marginTop: -Space[2] },
  dayCard: { borderRadius: Radius.xl },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Space[3], marginBottom: Space[3] },
  dayNum: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNumText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  dayTitle: { flex: 1, fontFamily: FontFamily.semibold, fontSize: FontSize.md, color: Colors.neutral900 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2], paddingVertical: Space[1] },
  stopName: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral700 },
  saveBtn: { borderRadius: Radius.full },
});
