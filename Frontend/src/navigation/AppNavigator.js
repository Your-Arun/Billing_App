import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ReadingTakerScreen from '../screens/ReadingTakerScreen';
import { UserContext } from '../services/UserContext';
import TabNavigator from './TabNavigator';
import DGScreen from '../screens/adminPage/DGScreen';
import SolarScreen from '../screens/adminPage/SolarScreen';
import ReconciliationScreen from '../screens/adminPage/ReconciliationScreen';
import ReadingsReviewScreen from '../screens/adminPage/ReadingsReviewScreen';
import ForgetScreen from '../screens/ForgetScreen';
import StatementScreen from '../screens/adminPage/StatementScreen';

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
        headerMode: 'screen',
        headerStyle: { backgroundColor: '#333399' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {user == null ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Forget" component={ForgetScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          {user.role === 'Admin' ? (
            <>

              <Stack.Screen
                name="Dashboard"
                component={TabNavigator}
                options={{ headerShown: false }}
              />


              <Stack.Screen
                name="Solar"
                component={SolarScreen}
                options={{ title: 'Solar Entry', headerShown: true }}
              />
              <Stack.Screen
                name="DG"
                component={DGScreen}
                options={{ title: 'DG Log', headerShown: true }}
              />
              <Stack.Screen
                name="Reconciliation"
                component={ReconciliationScreen}
                options={{ title: '', headerShown: false }}
              />
              <Stack.Screen
                name="MonthlyBilling"
                component={ReadingsReviewScreen}
                options={{ title: '', headerShown: false }}
              />
               <Stack.Screen
                name="Statement"
                component={StatementScreen}
                options={{ title: '', headerShown: false }}
              />

            </>
          ) : (
            <Stack.Screen
              name="ReadingTakerScreen"
              component={ReadingTakerScreen}
              options={{ title: '', headerLeft: () => null, headerShown: false }}
            />
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;