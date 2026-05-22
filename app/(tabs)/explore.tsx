import React, { useState, useRef, useCallback } from 'react';
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
  Animated,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

// ── Mock destination suggestions ────────────────────────────────

const FEATURED = [
  { id: '1', name: 'Manali', country: 'India', tag: 'Mountains', color: Colors.accent, emoji: '🏔️' },
  { id: '2', name: 'Goa', country: 'India', tag: 'Beach', color: Colors.danger, emoji: '🏖️' },
  { id: '3', name: 'Kerala', country: 'India', tag: 'Nature', color: Colors.primary, emoji: '🌴' },
  { id: '4', name: 'Ladakh', country: 'India', tag: 'Adventure', color: Colors.success, emoji: '🏕️' },
  { id: '5', name: 'Bali', country: 'Indonesia', tag: 'Beach', color: Colors.secondary, emoji: '🌊' },
  { id: '6', name: 'Rajasthan', country: 'India', tag: 'Heritage', color: Colors.accentMid, emoji: '🏰' },
];

const CATEGORIES = [
  { icon: 'beach', label: 'Beach', color: '#185FA5' },
  { icon: 'mountain', label: 'Mountains', color: '#1D9E75' },
  { icon: 'city-variant', label: 'Cities', color: '#854F0B' },
  { icon: 'forest', label: 'Nature', color: '#059669' },
  { icon: 'castle', label: 'Heritage', color: '#7C3AED' },
  { icon: 'food', label: 'Food Tours', color: '#D97706' },
];

// ── Wikipedia search result type ─────────────────────────────────
type WikiResult = {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: string;
  url: string;
};

async function searchWikipedia(query: string): Promise<WikiResult | null> {
  try {
    const q = encodeURIComponent(query.trim().split(',')[0]);
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`, {
      headers: { 'User-Agent': 'WanderPlan-App/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.type === 'disambiguation' || !json.extract) return null;
    return {
      title: json.title,
      description: json.description,
      extract: json.extract,
      thumbnail: json.thumbnail?.source,
      url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${q}`,
    };
  } catch {
    return null;
  }
}

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<WikiResult | null>(null);
  const [noResult, setNoResult] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();
  const cardAnim = useRef(new Animated.Value(0)).current;

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    setSearching(true);
    setResult(null);
    setNoResult(false);

    const found = await searchWikipedia(q);
    if (found) {
      setResult(found);
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
    } else {
      setNoResult(true);
    }
    setSearching(false);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResult(null);
    setNoResult(false);
    cardAnim.setValue(0);
  };

  const cardScale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

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
              placeholder="Search any destination…"
              placeholderTextColor={Colors.neutral400}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
            {query.length > 0 && !searching && (
              <TouchableOpacity onPress={clearSearch} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.neutral400} style={{ marginRight: Space[3] }} />
              </TouchableOpacity>
            )}
            {searching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: Space[3] }} />}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Wikipedia Search Result Card ───────────────────────────────── */}
        {result && (
          <Animated.View style={{ opacity: cardOpacity, transform: [{ scale: cardScale }] }}>
            <Card elevated style={styles.wikiCard} padding={0}>
              {result.thumbnail && (
                <View style={styles.wikiCoverWrap}>
                  <View style={[styles.wikiCoverPlaceholder, { backgroundColor: Colors.primaryLight }]}>
                    <MaterialCommunityIcons name="image" size={32} color={Colors.primary} />
                  </View>
                  <Image source={{ uri: result.thumbnail }} style={styles.wikiCover} resizeMode="cover" />
                </View>
              )}
              <View style={styles.wikiContent}>
                <View style={styles.wikiHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wikiTitle}>{result.title}</Text>
                    {result.description && (
                      <Text style={styles.wikiDesc} numberOfLines={1}>{result.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL(result.url)} style={styles.wikiBtn}>
                    <MaterialCommunityIcons name="wikipedia" size={20} color={Colors.neutral900} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.wikiExtract} numberOfLines={5}>{result.extract}</Text>

                <TouchableOpacity
                  style={styles.planBtn}
                  onPress={() => router.push({ pathname: '/trip/new', params: { destination: result.title } })}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="map-plus" size={16} color={Colors.neutral900} />
                  <Text style={styles.planBtnText}>Plan a Trip to {result.title}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* No result state */}
        {noResult && (
          <Card style={styles.noResultCard}>
            <MaterialCommunityIcons name="map-search-outline" size={32} color={Colors.neutral200} />
            <Text style={styles.noResultText}>No Wikipedia article found for "{query}".</Text>
            <Text style={styles.noResultSub}>Try a different spelling or broader location name.</Text>
          </Card>
        )}

        {/* Categories */}
        {!result && !noResult && (
          <>
            <Text style={styles.sectionTitle}>Browse by Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={styles.categoryChip}
                  activeOpacity={0.8}
                  onPress={() => { setQuery(cat.label); handleSearch(cat.label); }}
                >
                  <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Featured destinations */}
            <Text style={styles.sectionTitle}>Featured Destinations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {FEATURED.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={styles.destCard}
                  activeOpacity={0.85}
                  onPress={() => { setQuery(dest.name); handleSearch(dest.name); }}
                >
                  <View style={[styles.destGradient, { backgroundColor: Colors.primary }]}>
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
          </>
        )}

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
            Powered by Wikipedia REST API &amp; OpenStreetMap Nominatim — 100% free &amp; open source.
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
    borderWidth: 2,
    borderColor: Colors.neutral900,
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

  content: { paddingTop: Space[5], gap: Space[4], paddingHorizontal: Space[5] },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral900,
    marginBottom: Space[1],
  },

  // Wikipedia result card
  wikiCard: {
    borderWidth: 2,
    borderColor: Colors.neutral900,
    overflow: 'hidden',
  },
  wikiCoverWrap: {
    height: 160,
    width: '100%',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
  },
  wikiCoverPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  wikiCover: { width: '100%', height: '100%' },
  wikiContent: { padding: Space[4], gap: Space[3] },
  wikiHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: Space[3],
  },
  wikiTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.neutral900 },
  wikiDesc: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 },
  wikiBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.neutral900,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  wikiExtract: {
    fontFamily: FontFamily.regular, fontSize: FontSize.sm,
    color: Colors.neutral700, lineHeight: FontSize.sm * 1.65,
  },
  planBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: Space[3], paddingHorizontal: Space[5],
    borderWidth: 2, borderColor: Colors.neutral900, alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  planBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral900 },

  // No result
  noResultCard: {
    alignItems: 'center', gap: Space[2], paddingVertical: Space[6],
    borderWidth: 2, borderColor: Colors.neutral900,
  },
  noResultText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral700, textAlign: 'center' },
  noResultSub: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, textAlign: 'center' },

  // Categories
  categories: { gap: Space[3], paddingBottom: Space[2] },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    paddingHorizontal: Space[4], paddingVertical: Space[2],
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 2, borderColor: Colors.neutral900, ...Shadow.sm,
  },
  categoryLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral900 },

  // Featured
  featuredRow: { gap: Space[3], paddingBottom: Space[2] },
  destCard: { width: 160, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  destGradient: { height: 200, padding: Space[4], justifyContent: 'space-between' },
  destEmoji: { fontSize: 36 },
  destInfo: { gap: 4 },
  destName: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.white },
  destCountry: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },

  // YouTube CTA
  youtubeCta: {},
  youtubeCtaRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  youtubeCtaIcon: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
  },
  youtubeCtaText: { flex: 1 },
  youtubeCtaTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900 },
  youtubeCtaSubtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSize.sm,
    color: Colors.neutral400, lineHeight: FontSize.sm * 1.5, marginTop: 2,
  },

  // Credits
  credits: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Space[2],
    marginTop: Space[2],
  },
  creditsText: {
    flex: 1,
    fontFamily: FontFamily.regular, fontSize: FontSize.xs,
    color: Colors.neutral400, lineHeight: FontSize.xs * 1.6,
  },
});
