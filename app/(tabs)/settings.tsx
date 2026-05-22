import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

const SETTINGS = [
  {
    section: 'App',
    items: [
      { icon: 'theme-light-dark', label: 'Appearance',     sub: 'Follow system',         hasChevron: true },
      { icon: 'translate',         label: 'Language',        sub: 'English',               hasChevron: true },
      { icon: 'currency-inr',      label: 'Default Currency', sub: 'INR (₹)',              hasChevron: true },
    ],
  },
  {
    section: 'Data & Sync',
    items: [
      { icon: 'cloud-sync',        label: 'Cloud Sync',     sub: 'Self-hosted PocketBase', hasToggle: true, toggleValue: false },
      { icon: 'shield-lock',       label: 'Encrypted DB',   sub: 'AES-256 on-device',      hasBadge: 'On' },
      { icon: 'wifi-off',          label: 'Offline Mode',   sub: 'All data stored locally', hasBadge: 'Active' },
    ],
  },
  {
    section: 'Features',
    items: [
      { icon: 'youtube',          label: 'YouTube Import',  sub: 'Auto-gen itinerary from vlog', hasChevron: true },
      { icon: 'weather-partly-cloudy', label: 'Weather Forecast', sub: 'Open-Meteo (no key)', hasToggle: true, toggleValue: true },
      { icon: 'bell-outline',     label: 'Reminders',       sub: 'Local push notifications', hasToggle: true, toggleValue: true },
    ],
  },
  {
    section: 'Developer sandbox',
    items: [
      { icon: 'database-cog',     label: 'SQLite Console', sub: 'Execute SQL queries or paste database base64 dumps', hasChevron: true, route: '/developer/console' },
    ],
  },
  {
    section: 'About',
    items: [
      { icon: 'information',      label: 'Version',         sub: '1.0.0 (Beta)',            hasBadge: 'Free' },
      { icon: 'open-source-initiative', label: 'Open Source', sub: '100% free, no paid APIs', hasChevron: true },
      { icon: 'github',           label: 'Contribute',      sub: 'github.com/wanderplan', hasChevron: true },
    ],
  },
] as any[];

export default function SettingsScreen() {
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
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={{ width: 44 }} /> {/* Balance the header */}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {SETTINGS.map((group: any) => (
          <View key={group.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.section}</Text>
            <Card style={styles.sectionCard} outlined>
              {group.items.map((item: any, i: number) => (
                <View key={item.label}>
                  <TouchableOpacity
                    activeOpacity={(item as any).route ? 0.7 : 1}
                    onPress={() => (item as any).route && router.push((item as any).route)}
                    disabled={!(item as any).route}
                    style={styles.settingRow}
                  >
                    <View style={styles.settingIcon}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingSub}>{item.sub}</Text>
                    </View>
                    {item.hasChevron && (
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.neutral400} />
                    )}
                    {item.hasToggle && (
                      <Switch
                        value={(item as any).toggleValue}
                        trackColor={{ false: Colors.neutral100, true: Colors.primaryLight }}
                        thumbColor={(item as any).toggleValue ? Colors.primary : Colors.neutral400}
                        onValueChange={() => {}}
                      />
                    )}
                    {item.hasBadge && (
                      <Badge
                        label={item.hasBadge}
                        variant={item.hasBadge === 'Free' ? 'success' : item.hasBadge === 'Active' ? 'primary' : 'secondary'}
                        size="sm"
                      />
                    )}
                  </TouchableOpacity>
                  {i < group.items.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Open source credit */}
        <View style={styles.credits}>
          <MaterialCommunityIcons name="heart" size={14} color={Colors.danger} />
          <Text style={styles.creditsText}>
            WanderPlan uses Wikipedia, OpenStreetMap, Open-Meteo & frankfurter.app — all free & open source.
          </Text>
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
  section: { marginBottom: Space[5] },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Space[2] },
  sectionCard: { backgroundColor: Colors.white, padding: 0, overflow: 'hidden', borderRadius: Radius.xl, borderWidth: 2, borderColor: Colors.neutral900, ...Shadow.sm },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3], padding: Space[4] },
  settingIcon: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.neutral900,
    alignItems: 'center', justifyContent: 'center',
  },
  settingText: { flex: 1 },
  settingLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.md, color: Colors.neutral900 },
  settingSub: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral400, marginTop: 2 },

  rowDivider: { height: 2, backgroundColor: Colors.neutral900, marginLeft: Space[5] + 40 + Space[3] },

  credits: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[3],
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xl,
    padding: Space[4],
    marginBottom: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  creditsText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral400,
    lineHeight: FontSize.xs * 1.6,
  },
});
