import { Drawer } from 'expo-router/drawer';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Badge } from '../../components/ui/Badge';

function CustomDrawerContent(props: any) {
  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: Space[10] }}>
        <View style={styles.drawerHeader}>
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons name="lightning-bolt" size={32} color={Colors.white} />
          </View>
          <Text style={styles.drawerTitle}>WanderPlan</Text>
          <Badge label="PRO" variant="success" size="sm" style={{ marginTop: Space[1] }} />
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={styles.drawerFooter}>
        <Text style={styles.footerText}>v1.0.0 (Retro-Pop)</Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: Colors.primaryLight,
        drawerActiveTintColor: Colors.neutral900,
        drawerInactiveTintColor: Colors.neutral600,
        drawerLabelStyle: styles.drawerLabel,
        drawerItemStyle: styles.drawerItem,
        drawerStyle: styles.drawerStyle,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'My Trips',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="map-legend" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="explore"
        options={{
          title: 'Explore',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="compass-rose" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="youtube"
        options={{
          title: 'AI Import',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="youtube" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profile',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog-outline" size={24} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  drawerHeader: {
    paddingHorizontal: Space[5],
    paddingBottom: Space[6],
    borderBottomWidth: 2,
    borderBottomColor: Colors.neutral900,
    marginBottom: Space[4],
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.neutral900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space[4],
    borderWidth: 2,
    borderColor: Colors.neutral900,
    ...Shadow.sm,
  },
  drawerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xxl,
    color: Colors.neutral900,
  },
  drawerLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    marginLeft: -Space[3], // tighten space between icon and text
  },
  drawerItem: {
    borderRadius: Radius.lg,
    paddingVertical: Space[1],
    marginHorizontal: Space[4],
    marginBottom: Space[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  drawerStyle: {
    backgroundColor: Colors.bgPrimary,
    width: 300,
    borderRightWidth: 4,
    borderRightColor: Colors.neutral900,
  },
  drawerFooter: {
    padding: Space[5],
    borderTopWidth: 2,
    borderTopColor: Colors.neutral900,
  },
  footerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral400,
  },
});
