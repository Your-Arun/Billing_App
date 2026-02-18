import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { UserProvider } from './src/services/UserContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar   } from 'react-native'; 

function App() {
  return (
    <>
      <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#333399"
        translucent={false}    
      />
        <UserProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <Toast />
        </UserProvider>
      </SafeAreaProvider>
    </>
  );
}

registerRootComponent(App);
