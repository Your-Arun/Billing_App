import React, { useState, useEffect, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

import Dashboard from '../screens/Dashboard';
import ReadingsScreen from '../screens/adminPage/ReadingsScreen';
import ApprovalScreen from '../screens/adminPage/ApprovalScreen';
import BillScreen from '../screens/adminPage/BillScreen';
import TenantsScreen from '../screens/adminPage/TenantsScreen';

import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';
import { Platform } from 'react-native';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useContext(UserContext);
  const [pendingCount, setPendingCount] = useState(null);

  const adminId = user?._id || user?.id;
  const fetchPendingCount = async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/readings/pending/${adminId}`);
      const count = res.data?.length;
      setPendingCount(count > 0 ? count : null);
    } catch (e) {
      console.log("Badge Fetch Error:", e.message);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, [adminId]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#333399',
        tabBarInactiveTintColor: 'gray',
        tabBarHideOnKeyboard: true, 
        tabBarStyle: { 
          paddingBottom: Platform.OS === 'ios' ? 25 : 10, 
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70, 
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          backgroundColor: '#fff',
          elevation: 20,
          position: 'absolute', 
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          marginBottom: 5,
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
      
      <Tab.Screen 
        name="Approval" 
        component={ApprovalScreen} 
        options={{
          tabBarBadge: pendingCount, 
          tabBarBadgeStyle: { backgroundColor: '#FF5252', color: 'white' }
        }}
      />
      
      <Tab.Screen name="Bill" component={BillScreen} />
      <Tab.Screen name="Tenants" component={TenantsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;