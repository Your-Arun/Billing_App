import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const SolarScreen = () => {
  const { user } = useContext(UserContext);
  const companyId = user?.role === 'Admin' ? (user?._id || user?.id) : user?.belongsToAdmin;

  const [units, setUnits] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSolarForDate = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/solar/by-date`, {
        params: { adminId: companyId, date: date.toISOString() }
      });
      if (res.data) {
        setUnits(String(res.data.unitsGenerated));
      } else {
        setUnits('');
      }
    } catch (err) {
      console.log("Fetch Error:", err.message);
      setUnits('');
    }
  }, [companyId, date]);

  useEffect(() => {
    fetchSolarForDate();
  }, [fetchSolarForDate]);

  const handleSave = async () => {
    if (!units || isNaN(units) || Number(units) <= 0) {
      return Alert.alert("Error", "Please enter valid units generated");
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/solar/add`, {
        adminId: companyId,
        unitsGenerated: Number(units),
        date: date.toISOString()
      });
      Alert.alert("Success", "Daily Solar Log Updated ☀️");
    } catch (err) {
      Alert.alert("Error", "Could not save data. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solar Generation Input</Text>

      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{date.toDateString()}</Text>
      </TouchableOpacity>

      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(e, d) => {
            setShowDate(false);
            if (d) setDate(d);
          }}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Total Units (kWh)"
        keyboardType="numeric"
        value={units}
        onChangeText={setUnits}
      />

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>SAVE RECORD</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#f8f9fd', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333399', marginBottom: 30, textAlign: 'center' },
  dateBtn: { backgroundColor: '#333399', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 20, borderRadius: 15, fontSize: 24, textAlign: 'center', fontWeight: 'bold', marginBottom: 25, borderWidth: 1, borderColor: '#eee', color: '#333' },
  btn: { backgroundColor: '#4caf50', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default SolarScreen;