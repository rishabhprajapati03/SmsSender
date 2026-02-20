import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MessagesScreen from '../screens/MessageScreen';
import SmsDetailScreen from '../screens/SmsDetailScreen';

export type MessagesStackParamList = {
  Messages: undefined;
  SmsDetail: { sms: any };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />

      <Stack.Screen
        name="SmsDetail"
        component={SmsDetailScreen}
        options={{ title: 'Message' }}
      />
    </Stack.Navigator>
  );
}
