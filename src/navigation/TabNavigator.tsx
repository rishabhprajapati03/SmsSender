import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ImprovedSettingsScreen from '../screens/ImprovedSettingsScreen';

import DashboardStack from './DashboardStack';
import MessagesStack from './MessagesStack';
import { LinkingOptions } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

const linking: LinkingOptions<any> = {
  prefixes: ['myapp://'],

  config: {
    screens: {
      DashboardTab: {
        screens: {
          Dashboard: 'dashboard',
        },
      },

      MessagesTab: {
        screens: {
          Messages: 'messages',
          SmsDetail: 'sms/:id',
        },
      },

      Settings: 'settings',
    },
  },
};

export default function TabNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStack}
          options={{ title: 'Dashboard' }}
        />

        <Tab.Screen
          name="MessagesTab"
          component={MessagesStack}
          options={{ title: 'Messages' }}
        />

        <Tab.Screen name="Settings" component={ImprovedSettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
