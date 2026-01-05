import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const DGScreen = () => {
  const { user } = useContext(UserContext);
  const [dgData, setDgData] = useState({ dg1: '', dg2: '', dg3: '', fuel: '' });

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/api/dg/add`, { adminId: user.id, ...dgData });
      Alert.alert("Success", "DG Data Recorded ⛽");
    } catch (e) { Alert.alert("Error", "Save failed"); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>DG Sets (3 Units)</Text>
      
      {['dg1', 'dg2', 'dg3'].map((id, index) => (
        <View key={id} style={styles.dgCard}>
          <Text style={styles.dgLabel}>DG Set - 0{index + 1} Units</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Units Produced" 
            keyboardType="numeric"
            onChangeText={(t) => setDgData({...dgData, [id]: t})}
          />
        </View>
      ))}

      <View style={[styles.dgCard, { borderColor: '#d32f2f', borderWidth: 1 }]}>
        <Text style={[styles.dgLabel, {color: '#d32f2f'}]}>Total Fuel Cost (₹)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter Amount" 
          keyboardType="numeric"
          onChangeText={(t) => setDgData({...dgData, fuel: t})}
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>RECORD DG EXPENSES</Text>
      </TouchableOpacity>
      <View style={{height: 50}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333399', marginTop: 40 },
  dgCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 2 },
  dgLabel: { fontWeight: 'bold', color: '#666', marginBottom: 10 },
  input: { borderBottomWidth: 1, borderColor: '#eee', padding: 10, fontSize: 18 },
  btn: { backgroundColor: '#333399', padding: 20, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});

export default DGScreen;