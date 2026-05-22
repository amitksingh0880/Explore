import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Button } from '../../components/ui/Button';

import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

const STATS = [
  { icon: 'map-legend',   label: 'Trips',    value: '3' },
  { icon: 'flag-variant', label: 'Done',     value: '1' },
  { icon: 'map-marker',   label: 'Stops',    value: '65' },
  { icon: 'earth',        label: 'Countries', value: '4' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <MaterialCommunityIcons name="menu" size={24} color={Colors.neutral900} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <View style={{ width: 44 }} /> {/* Balance the header */}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>W</Text>
          </View>
          <Text style={styles.userName}>WanderPlanner</Text>
          <Text style={styles.userSub}>Local account · Offline mode</Text>
          
          <Button 
            label="Edit Profile" 
            variant="secondary" 
            style={styles.editBtn} 
            onPress={() => {}} 
          />
        </View>

        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={s.label} style={styles.statBox}>
              <MaterialCommunityIcons name={s.icon as any} size={28} color={Colors.primary} style={styles.statIcon} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingBottom: Space[2], backgroundColor: Colors.bgPrimary },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[5],
    paddingTop: Space[3],
    paddingBottom: Space[4],
    gap: Space[4],
  },
  hamburgerBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900 },

  content: { padding: Space[5] },
  
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Space[6],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
    marginBottom: Space[6],
  },
  avatar: {
    width: 80, height: 80, borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Space[4],
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900 },
  userName: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900, marginBottom: Space[1] },
  userSub: { fontFamily: FontFamily.regular, fontSize: FontSize.md, color: Colors.neutral600, marginBottom: Space[5] },
  editBtn: { width: '100%', borderRadius: Radius.full },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space[4],
  },
  statBox: {
    width: '47%',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xl,
    padding: Space[5],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  statIcon: { marginBottom: Space[2] },
  statValue: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, color: Colors.neutral900 },
  statLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral600 },
});
