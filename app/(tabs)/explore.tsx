import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

// ── Mock destination suggestions ────────────────────────────────

const FEATURED = [
  {
    id: '1',
    name: 'Manali',
    country: 'India',
    tag: 'Mountains',
    color: Colors.gradientOcean,
    emoji: '🏔️',
  },
  {
    id: '2',
    name: 'Goa',
    country: 'India',
    tag: 'Beach',
    color: Colors.gradientSunset,
    emoji: '🏖️',
  },
  {
    id: '3',
    name: 'Kerala',
    country: 'India',
    tag: 'Nature',
    color: Colors.gradientPrimary,
    emoji: '🌴',
  },
  {
    id: '4',
    name: 'Ladakh',
    country: 'India',
    tag: 'Adventure',
    color: Colors.gradientDark,
    emoji: '🏕️',
  },
];

const CATEGORIES = [
  { icon: 'beach', label: 'Beach', color: '#185FA5' },
  { icon: 'mountain', label: 'Mountains', color: '#1D9E75' },
  { icon: 'city-variant', label: 'Cities', color: '#854F0B' },
  { icon: 'forest', label: 'Nature', color: '#059669' },
  { icon: 'castle', label: 'Heritage', color: '#7C3AED' },
  { icon: 'food', label: 'Food Tours', color: '#D97706' },
];

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const navigation = useNavigation();

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    // TODO: fetch from Wikipedia + Nominatim
    setTimeout(() => setSearching(false), 1500);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.primaryLight }]}>
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
                <Text style={styles.headerSub}>Discover the world</Text>
                <Text style={styles.headerTitle}>Explore</Text>
              </View>
            </View>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="compass-rose" size={28} color="rgba(255,255,255,0.6)" />
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.neutral400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search destination (Wikipedia powered)…"
              placeholderTextColor={Colors.neutral400}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: Space[3] }} />}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Browse by Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.label} style={styles.categoryChip} activeOpacity={0.8}>
              <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured destinations */}
        <Text style={styles.sectionTitle}>Featured Destinations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {FEATURED.map((dest) => (
            <TouchableOpacity key={dest.id} style={styles.destCard} activeOpacity={0.85}>
              <View
                style={[styles.destGradient, { backgroundColor: Colors.primary }]}
              >
                <Text style={styles.destEmoji}>{dest.emoji}</Text>
                <View style={styles.destInfo}>
                  <Badge label={dest.tag} variant="neutral" size="sm" />
                  <Text style={styles.destName}>{dest.name}</Text>
                  <Text style={styles.destCountry}>{dest.country}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* YouTube Import CTA */}
        <Card style={styles.youtubeCta} elevated>
          <View style={styles.youtubeCtaRow}>
            <View style={styles.youtubeCtaIcon}>
              <MaterialCommunityIcons name="youtube" size={28} color="#FF0000" />
            </View>
            <View style={styles.youtubeCtaText}>
              <Text style={styles.youtubeCtaTitle}>Got a travel vlog?</Text>
              <Text style={styles.youtubeCtaSubtitle}>
                Paste any YouTube link and we'll auto-build your itinerary from the video.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.neutral400} />
          </View>
        </Card>

        {/* Data credits */}
        <View style={styles.credits}>
          <MaterialCommunityIcons name="information-outline" size={14} color={Colors.neutral400} />
          <Text style={styles.creditsText}>
            Powered by Wikipedia REST API & OpenStreetMap Nominatim — 100% free & open source.
          </Text>
        </View>

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingBottom: Space[5] },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Space[5],
    paddingTop: Space[2],
    paddingBottom: Space[3],
  },
  headerSub: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral600 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.neutral900, marginTop: 2 },
  headerIcon: { marginTop: Space[2] },
  hamburgerBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Space[5],
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  searchIcon: { marginLeft: Space[4] },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral900,
    paddingHorizontal: Space[3],
    paddingVertical: Space[3] + 2,
  },

  content: { paddingTop: Space[5] },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral900,
    marginHorizontal: Space[5],
    marginBottom: Space[3],
  },

  // Categories
  categories: { paddingHorizontal: Space[5], gap: Space[3], paddingBottom: Space[5] },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  categoryLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral900 },

  // Featured
  featuredRow: { paddingHorizontal: Space[5], gap: Space[3], paddingBottom: Space[5] },
  destCard: { width: 160, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  destGradient: {
    height: 200,
    padding: Space[4],
    justifyContent: 'space-between',
  },
  destEmoji: { fontSize: 36 },
  destInfo: { gap: 4 },
  destName: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.white },
  destCountry: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },

  // YouTube CTA
  youtubeCta: { marginHorizontal: Space[5], marginBottom: Space[4] },
  youtubeCtaRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  youtubeCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeCtaText: { flex: 1 },
  youtubeCtaTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  youtubeCtaSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral400,
    lineHeight: FontSize.sm * 1.5,
    marginTop: 2,
  },

  // Credits
  credits: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[2],
    marginHorizontal: Space[5],
    marginTop: Space[2],
  },
  creditsText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral400,
    lineHeight: FontSize.xs * 1.6,
  },
});
