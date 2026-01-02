import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import SignupScreen from '../screens/SignupScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login" 
      screenOptions={{
        animationEnabled: false, 
        headerStyle: {
          backgroundColor: '#333399', 
        },
        headerTintColor: '#fff', 
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
     
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />

      <Stack.Screen 
        name="Signup" 
        component={SignupScreen} 
        options={{ headerShown: false }} 
      />

      <Stack.Screen 
        name="Dashboard" 
        component={Dashboard} 
        options={{ 
          headerShown: true, 
          title: 'Control Center',
          headerLeft: () => null, 
          gestureEnabled: false,   
        }} 
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;