import React from 'react';
import { View, Text } from 'react-native';

const BillScreen = ({ route }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{route.name} Screen</Text>
    <Text>Coding is in progress...</Text>
  </View>
);
export default BillScreen;