import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const SolarScreen = () => {
  const { user } = useContext(UserContext);
  const [units, setUnits] = useState('');
  const companyId = user?.role === 'Admin' ? user?.id : user?.belongsToAdmin;

  const handleSave = async () => {
    if (!units) return Alert.alert("Error", "Enter units");
    try {
      await axios.post(`${API_URL}/tenants/solar/add`, {
        adminId: companyId,
        unitsGenerated: Number(units),
        month: new Date().toLocaleString('default', { month: 'long' })
      });
      Alert.alert("Success", "Solar units recorded! ☀️");
      setUnits('');
    } catch (e) { Alert.alert("Error", "Failed to save"); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solar Generation (kWh)</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Enter Total Units" 
        keyboardType="numeric" 
        value={units}
        onChangeText={setUnits}
      />
      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>SAVE SOLAR DATA</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333399' },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, fontSize: 20, marginBottom: 20 },
  btn: { backgroundColor: '#333399', padding: 18, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});

export default SolarScreen;