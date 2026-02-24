import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '../screens/SettingsScreen';

/* TYPES */

type SettingsStackParamList = {
  Settings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

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

const SettingsHeaderOptions = {
  header: () => <Header title="Settings" />,
};

/* STACK */

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={SettingsHeaderOptions}
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
