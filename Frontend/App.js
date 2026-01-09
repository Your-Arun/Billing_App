import 'react-native-gesture-handler'; 
import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { UserProvider } from './src/services/UserContext';

function App() {
  return (
    <> 
   
    <UserProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <Toast />
      </UserProvider>
   
    </>
  );
}

registerRootComponent(App);

//hora kaam