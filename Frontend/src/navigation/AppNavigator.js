import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import SignupScreen from '../screens/SignupScreen';
import ReadingTakerScreen from '../screens/ReadingTakerScreen';
import { UserContext } from '../services/UserContext';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#333399" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{
        animationEnabled: false, 
        headerStyle: { backgroundColor: '#333399' },
        headerTintColor: '#fff', 
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {user == null ? (
        <>
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
        </>
      ) : (
       
        <>
          {user.role === 'Admin' ? (
            <Stack.Screen 
              name="Dashboard" 
              component={Dashboard} 
              options={{ 
                title: 'Admin Control Center',
                headerLeft: () => null, 
                gestureEnabled: false,
              }} 
            />
          ) : (
            <Stack.Screen 
              name="ReadingTakerScreen" 
              component={ReadingTakerScreen} 
              options={{ 
                title: 'Staff Portal',
                headerLeft: () => null,
                gestureEnabled: false,
              }} 
            />
          )}
         </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;