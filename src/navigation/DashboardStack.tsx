import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/dashboard/DashboardScreen';

/* TYPES */

type DashboardStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

/* HEADER */

type HeaderProps = {
  title: string;
};

const Header = memo(({ title }: HeaderProps) => {
  return (
    <View style={styles.header}>
      {/* Left spacer */}
      <View style={styles.sideContainer} />

      <Text style={styles.title}>{title}</Text>

      {/* Right spacer */}
      <View style={styles.sideContainer} />
    </View>
  );
});

/* OPTIONS */

const dashboardHeaderOptions = {
  header: () => <Header title="Dashboard" />,
};

/* STACK */

export default function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={dashboardHeaderOptions}
      />
    </Stack.Navigator>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  sideContainer: {
    width: 40,
  },
});
