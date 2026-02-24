import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import MessagesScreen from '../screens/MessageScreen';
import SmsDetailScreen from '../screens/SmsDetailScreen';

/* TYPES */

export type MessagesStackParamList = {
  Messages: undefined;
  SmsDetail: { sms: any };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

/* HEADER COMPONENT */

type HeaderProps = {
  title: string;
  showBack?: boolean;
};

const Header = memo(({ title, showBack }: HeaderProps) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.sideContainer}
          hitSlop={10}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.sideContainer} />
      )}

      <Text style={styles.title}>{title}</Text>

      {/* Right spacer for perfect centering */}
      <View style={styles.sideContainer} />
    </View>
  );
});

/* STATIC OPTIONS */

const messagesHeaderOptions = {
  header: () => <Header title="Messages" />,
};

const detailHeaderOptions = {
  header: () => <Header title="Message" showBack />,
};

/* STACK */

export default function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={messagesHeaderOptions}
      />

      <Stack.Screen
        name="SmsDetail"
        component={SmsDetailScreen}
        options={detailHeaderOptions}
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
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 26,
    fontWeight: '600',
  },
});
