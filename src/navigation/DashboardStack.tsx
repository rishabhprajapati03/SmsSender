import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';

export type DashboardStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: 'silver' },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
}
