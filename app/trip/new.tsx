import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

import { useWanderPlanStore } from '../../db/store';

type Step = 'destination' | 'dates' | 'details';

const TRIP_TYPES = [
  { id: 'solo',   icon: 'account',        label: 'Solo' },
  { id: 'couple', icon: 'account-heart',  label: 'Couple' },
  { id: 'group',  icon: 'account-group',  label: 'Group' },
  { id: 'family', icon: 'home-heart',     label: 'Family' },
];

const COVER_GRADIENTS = [
  { id: 'g1', colors: Colors.gradientPrimary },
  { id: 'g2', colors: Colors.gradientOcean },
  { id: 'g3', colors: Colors.gradientSunset },
  { id: 'g4', colors: Colors.gradientDark },
];

export default function NewTripScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('destination');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [tripType, setTripType] = useState('solo');
  const [travelers, setTravelers] = useState(1);
  const [selectedGradient, setSelectedGradient] = useState('g1');

  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isFetchingDestinations, setIsFetchingDestinations] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const createTripAction = useWanderPlanStore((state) => state.createNewTrip);

  const STEPS: Step[] = ['destination', 'dates', 'details'];
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    if (!showSuggestions || destination.length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsFetchingDestinations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'WanderPlan-App/1.0',
            },
          }
        );
        const data = await response.json();
        setDestinationSuggestions(data);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      } finally {
        setIsFetchingDestinations(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [destination, showSuggestions]);

  const handleSelectDestination = (item: any) => {
    let name = item.display_name;
    if (item.address) {
      const city = item.address.city || item.address.town || item.address.village || item.address.county || '';
      const state = item.address.state || '';
      const country = item.address.country || '';
      const parts = [city, state, country].filter(Boolean);
      if (parts.length > 0) {
        name = parts.join(', ');
      }
    }
    setDestination(name);
    setShowSuggestions(false);
  };

  const handleNext = async () => {
    if (step === 'destination') {
      if (!title.trim() || !destination.trim()) {
        Alert.alert('Required', 'Please fill in the trip name and destination.');
        return;
      }
      setStep('dates');
    } else if (step === 'dates') {
      setStep('details');
    } else {
      try {
        let totalDays = 5;
        if (startDate && endDate) {
          try {
            const parseDate = (dStr: string) => {
              const [d, m, y] = dStr.split('/').map(Number);
              return new Date(y, m - 1, d);
            };
            const s = parseDate(startDate);
            const e = parseDate(endDate);
            const diffTime = Math.abs(e.getTime() - s.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (!isNaN(diffDays)) {
              totalDays = diffDays;
            }
          } catch {}
        }

        await createTripAction({
          title: title.trim(),
          destination: destination.trim(),
          start_date: startDate || '20/12/2026',
          end_date: endDate || '25/12/2026',
          total_days: totalDays,
          total_budget: parseFloat(budget) || 0,
          currency: currency,
          status: 'draft',
          cover_gradient: selectedGradient,
          trip_type: tripType,
          travelers: travelers,
        });

        Alert.alert('🎉 Trip Created!', `"${title}" has been added to your trips.`, [
          { text: 'View Trips', onPress: () => router.replace('/') },
        ]);
      } catch (error) {
        Alert.alert('Error', 'Failed to create trip. Please try again.');
      }
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleBack = () => {
    if (step === 'destination') { handleClose(); return; }
    if (step === 'dates') { setStep('destination'); return; }
    setStep('dates');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>New Trip</Text>
              <Text style={styles.headerSub}>Step {stepIndex + 1} of 3</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* STEP 1 — Destination */}
        {step === 'destination' && (
          <>
            <Text style={styles.stepTitle}>Where are you going?</Text>
            <Text style={styles.stepSub}>Name your trip and choose a destination.</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Trip Name *</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="tag-outline" size={18} color={Colors.neutral400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajasthan Summer 2027"
                  placeholderTextColor={Colors.neutral400}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={[styles.field, { zIndex: 10 }]}>
              <Text style={styles.fieldLabel}>Destination *</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.neutral400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City, Country or Region"
                  placeholderTextColor={Colors.neutral400}
                  value={destination}
                  onChangeText={(txt) => {
                    setDestination(txt);
                    setShowSuggestions(true);
                  }}
                />
                {isFetchingDestinations && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: Space[3] }} />
                )}
              </View>

              {showSuggestions && destinationSuggestions.length > 0 && (
                <View style={styles.suggestionsCard}>
                  {destinationSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.place_id || index}
                      style={[
                        styles.suggestionItem,
                        index === destinationSuggestions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => handleSelectDestination(item)}
                    >
                      <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primaryMid} style={{ marginTop: 2 }} />
                      <Text style={styles.suggestionText}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cover Style</Text>
              <View style={styles.gradientRow}>
                {COVER_GRADIENTS.map((g) => (
                  <TouchableOpacity key={g.id} onPress={() => setSelectedGradient(g.id)} activeOpacity={0.8}>
                    <LinearGradient
                      colors={g.colors as any}
                      style={[styles.gradientSwatch, selectedGradient === g.id && styles.gradientSwatchActive]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      {selectedGradient === g.id && (
                        <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* STEP 2 — Dates & Budget */}
        {step === 'dates' && (
          <>
            <Text style={styles.stepTitle}>When & how much?</Text>
            <Text style={styles.stepSub}>Set your travel dates and budget.</Text>

            <View style={styles.dateRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="calendar-start" size={18} color={Colors.neutral400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={Colors.neutral400}
                    value={startDate}
                    onChangeText={setStartDate}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="calendar-end" size={18} color={Colors.neutral400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={Colors.neutral400}
                    value={endDate}
                    onChangeText={setEndDate}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Total Budget</Text>
              <View style={styles.budgetRow}>
                <TouchableOpacity
                  onPress={() => setCurrency(currency === '₹' ? '$' : currency === '$' ? '€' : '₹')}
                  style={styles.currencyChip}
                >
                  <Text style={styles.currencyText}>{currency}</Text>
                </TouchableOpacity>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <MaterialCommunityIcons name="wallet-outline" size={18} color={Colors.neutral400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 50000"
                    placeholderTextColor={Colors.neutral400}
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <Card style={styles.budgetTip}>
              <View style={{ flexDirection: 'row', gap: Space[2], alignItems: 'flex-start' }}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.accent} />
                <Text style={styles.budgetTipText}>
                  Currency rates are fetched from frankfurter.app (ECB) and stored offline for use during your trip.
                </Text>
              </View>
            </Card>
          </>
        )}

        {/* STEP 3 — Details */}
        {step === 'details' && (
          <>
            <Text style={styles.stepTitle}>Who's coming?</Text>
            <Text style={styles.stepSub}>Trip type and number of travelers.</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Trip Type</Text>
              <View style={styles.typeRow}>
                {TRIP_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setTripType(t.id)}
                    style={[styles.typeChip, tripType === t.id && styles.typeChipActive]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={t.icon as any}
                      size={22}
                      color={tripType === t.id ? Colors.primary : Colors.neutral400}
                    />
                    <Text style={[styles.typeLabel, tripType === t.id && styles.typeLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Travelers</Text>
              <View style={styles.travelerRow}>
                <TouchableOpacity
                  onPress={() => setTravelers(Math.max(1, travelers - 1))}
                  style={styles.travelerBtn}
                >
                  <MaterialCommunityIcons name="minus" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.travelerCount}>{travelers}</Text>
                <TouchableOpacity
                  onPress={() => setTravelers(travelers + 1)}
                  style={styles.travelerBtn}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary card */}
            <Card style={styles.summaryCard} elevated>
              <Text style={styles.summaryTitle}>Trip Summary</Text>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
                <Text style={styles.summaryText}>{destination || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={Colors.primary} />
                <Text style={styles.summaryText}>{startDate || '—'} → {endDate || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="wallet" size={16} color={Colors.primary} />
                <Text style={styles.summaryText}>{currency}{budget || '0'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="account-group" size={16} color={Colors.primary} />
                <Text style={styles.summaryText}>{travelers} traveler{travelers > 1 ? 's' : ''} · {TRIP_TYPES.find((t) => t.id === tripType)?.label}</Text>
              </View>
            </Card>
          </>
        )}

        {/* Next / Create button */}
        <Button
          label={step === 'details' ? 'Create Trip 🎉' : 'Continue'}
          onPress={handleNext}
          gradient={step === 'details'}
          variant={step === 'details' ? 'primary' : 'primary'}
          size="lg"
          fullWidth
          style={styles.nextBtn}
          icon={
            step !== 'details'
              ? <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.white} />
              : undefined
          }
          iconPosition="right"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingBottom: Space[4] },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[4],
    paddingTop: Space[2],
    paddingBottom: Space[3],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.white },
  headerSub: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Space[2], paddingBottom: Space[1] },
  dot: { width: 24, height: 4, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: Colors.white, width: 36 },

  content: { padding: Space[5], gap: Space[4] },
  stepTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900 },
  stepSub: { fontFamily: FontFamily.regular, fontSize: FontSize.md, color: Colors.neutral400, marginTop: -Space[2] },

  field: { gap: Space[2] },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral700 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.neutral100,
    borderRadius: Radius.md, backgroundColor: Colors.white, ...Shadow.sm,
  },
  inputIcon: { marginLeft: Space[3] },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular, fontSize: FontSize.md, color: Colors.neutral900,
    paddingHorizontal: Space[3], paddingVertical: Space[3],
  },
  suggestionsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.neutral900,
    marginTop: Space[1],
    ...Shadow.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Space[3],
    gap: Space[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral100,
  },
  suggestionText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral700,
    lineHeight: FontSize.sm * 1.4,
  },

  gradientRow: { flexDirection: 'row', gap: Space[3] },
  gradientSwatch: {
    width: 56, height: 56, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  gradientSwatchActive: { borderWidth: 3, borderColor: Colors.white, ...Shadow.colored },

  dateRow: { flexDirection: 'row', gap: Space[3] },
  budgetRow: { flexDirection: 'row', gap: Space[2], alignItems: 'center' },
  currencyChip: {
    paddingHorizontal: Space[4], paddingVertical: Space[3] + 2,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  currencyText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.primaryDark },
  budgetTip: { backgroundColor: Colors.accentLight, borderColor: Colors.accentMid, borderWidth: 1 },
  budgetTipText: {
    flex: 1, fontFamily: FontFamily.regular,
    fontSize: FontSize.xs, color: Colors.accent, lineHeight: FontSize.xs * 1.6,
  },

  typeRow: { flexDirection: 'row', gap: Space[3] },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: Space[3],
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.neutral100, gap: Space[1],
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400 },
  typeLabelActive: { color: Colors.primaryDark },

  travelerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Space[4],
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.neutral100, padding: Space[3],
  },
  travelerBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  travelerCount: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900, flex: 1, textAlign: 'center' },

  summaryCard: {},
  summaryTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, marginBottom: Space[3] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2], paddingVertical: Space[1] },
  summaryText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral700 },

  nextBtn: { borderRadius: Radius.full, marginTop: Space[2] },
});
