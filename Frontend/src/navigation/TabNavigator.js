import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Dashboard from '../screens/Dashboard';
import ReadingsScreen from '../screens/adminPage/ReadingsScreen';
import ApprovalScreen from '../screens/adminPage/ApprovalScreen';
import BillScreen from '../screens/adminPage/BillScreen';
import TenantsScreen from '../screens/adminPage/TenantsScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#333399',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          height: 60, 
          paddingBottom: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: '#fff',
          elevation: 10
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Readings') iconName = 'speedometer';
          else if (route.name === 'Approval') iconName = 'check-decagram';
          else if (route.name === 'Bill') iconName = 'lightning-bolt';
          else if (route.name === 'Tenants') iconName = 'account-group';

          return <MaterialCommunityIcons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Dashboard} />
      <Tab.Screen name="Readings" component={ReadingsScreen} />
      <Tab.Screen name="Approval" component={ApprovalScreen} />
      <Tab.Screen name="Bill" component={BillScreen} />
      <Tab.Screen name="Tenants" component={TenantsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;