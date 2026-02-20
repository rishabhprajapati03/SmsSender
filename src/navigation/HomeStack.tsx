import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import SmsDetailScreen from '../screens/SmsDetailScreen';

export type HomeStackParamList = {
  Home: undefined;
  SmsDetail: {
    sms: any;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Inbox' }}
      />

      <Stack.Screen
        name="SmsDetail"
        component={SmsDetailScreen}
        options={{ title: 'Message' }}
      />
    </Stack.Navigator>
  );
}
