import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';

import Ionicons from '@react-native-vector-icons/ionicons';

import MessagesStack from './MessagesStack';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

/* TYPES */

type TabParamList = {
  DashboardTab: undefined;
  MessagesTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

/* LINKING */

const linking: LinkingOptions<TabParamList> = {
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
      SettingsTab: 'settings',
    },
  },
};

/* ICON MAPPER */

const getTabIcon = (
  routeName: keyof TabParamList,
  focused: boolean,
  color: string,
  size: number,
) => {
  switch (routeName) {
    case 'DashboardTab':
      return (
        <Ionicons
          name={focused ? 'home' : 'home-outline'}
          size={size}
          color={color}
        />
      );

    case 'MessagesTab':
      return (
        <Ionicons
          name={focused ? 'chatbubble' : 'chatbubble-outline'}
          size={size}
          color={color}
        />
      );

    case 'SettingsTab':
      return (
        <Ionicons
          name={focused ? 'settings' : 'settings-outline'}
          size={size}
          color={color}
        />
      );

    default:
      return <Ionicons name="ellipse" size={size} color={color} />;
  }
};

/* OPTIONS BUILDER */

const buildScreenOptions = (
  routeName: keyof TabParamList,
): BottomTabNavigationOptions => ({
  headerShown: false,
  animation: 'fade',
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: '#111827',
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarIcon: ({ focused, color, size }) =>
    getTabIcon(routeName, focused, color, size),
});

/* COMPONENT */

export default function TabNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator>
        <Tab.Screen
          name="DashboardTab"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Home',
            ...buildScreenOptions('DashboardTab'),
          }}
        />

        <Tab.Screen
          name="MessagesTab"
          component={MessagesStack}
          options={{
            tabBarLabel: 'Messages',
            ...buildScreenOptions('MessagesTab'),
          }}
        />

        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            ...buildScreenOptions('SettingsTab'),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
