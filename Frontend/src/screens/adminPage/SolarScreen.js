import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, FlatList, StatusBar, SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import Toast from 'react-native-toast-message'; // 🟢 Toast logic
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const SolarScreen = () => {
  const { user } = useContext(UserContext);
  const companyId = user?.role === 'Admin' ? user?.id || user?._id : user?.belongsToAdmin;

  const [units, setUnits] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/solar/history/${companyId}`);
      setHistory(res.data || []);
    } catch (err) { console.log('History error:', err.message); }
  }, [companyId]);

  const fetchSolarForDate = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/solar/by-date`, {
        params: { adminId: companyId, date: date.toISOString() }
      });
      setUnits(res.data ? String(res.data.unitsGenerated) : '');
    } catch (err) { setUnits(''); }
  }, [companyId, date]);

  useEffect(() => {
    fetchSolarForDate();
    fetchHistory();
  }, [fetchSolarForDate, fetchHistory]);

  // 🟢 SAVE ENTRY - ALERT REPLACED WITH TOAST
  const handleSave = async () => {
    if (!units || isNaN(units) || Number(units) <= 0) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid Input ❌',
        text2: 'Please enter a valid generation unit.',
        position: 'top'
      });
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/solar/add`, {
        adminId: companyId,
        unitsGenerated: Number(units),
        date: date.toISOString()
      });
      
      Toast.show({
        type: 'success',
        text1: 'Log Saved ☀️',
        text2: `Successfully recorded for ${date.toDateString()}`,
      });
      
      setUnits('');
      fetchHistory();
    } catch (err) { 
      Toast.show({
        type: 'error',
        text1: 'Server Error',
        text2: 'Could not save the data. Try again.'
      });
    } 
    finally { setLoading(false); }
  };

  // 🗑️ DELETE ENTRY - ALERT REPLACED WITH DIRECT DELETE + TOAST
  const handleDelete = async (id) => {
    try {
      const res = await axios.delete(`${API_URL}/solar/delete/${id}`);
      if(res.data.success) {
        Toast.show({
          type: 'info',
          text1: 'Entry Removed 🗑️',
          text2: 'The solar record has been deleted.',
        });
        fetchHistory();
      }
    } catch (err) { 
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Something went wrong while deleting.'
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solar Generation</Text>
        <Text style={styles.headerSub}>Efficient Renewable Tracking</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 18 }}>
            {/* DATE CARD */}
            <View style={styles.card}>
              <Text style={styles.label}>SELECT LOG DATE</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
                <MaterialCommunityIcons name="calendar-search" size={22} color="#050507ff" />
                <Text style={styles.dateText}>{date.toDateString()}</Text>
              </TouchableOpacity>
            </View>

            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={(e, d) => { setShowDate(false); if (d) setDate(d); }}
              />
            )}

            {/* INPUT CARD */}
            <View style={styles.card}>
              <Text style={styles.label}>UNITS GENERATED (kWh)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={units}
                onChangeText={setUnits}
              />
              <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>CONFIRM & SAVE</Text>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>Recent History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="weather-sunny" size={24} color="#FBC02D" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
              </Text>
              <Text style={styles.historyUnit}>{item.unitsGenerated} kWh</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No logs found for this period.</Text>}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FF' },
  header: { backgroundColor: '#333399', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center', elevation: 10, shadowColor: '#333399', shadowOpacity: 0.4, shadowRadius: 10 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginTop:20 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  
  dateBtn: { backgroundColor: '#F0F3FF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E7FF' },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#333399', marginLeft: 10 },
  
  input: { backgroundColor: '#F9FAFF', padding: 18, borderRadius: 18, fontSize: 28, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#EDF1FF', marginBottom: 18, color: '#1F2937' },
  
  btn: { backgroundColor: '#333399', padding: 20, borderRadius: 18, alignItems: 'center', elevation: 4, shadowColor: '#333399', shadowOpacity: 0.3, shadowRadius: 5 },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '900', fontSize: 16, marginRight: 8 },

  historyTitle: { fontSize: 19, fontWeight: '900', color: '#1A1C3D', marginVertical: 15, paddingLeft: 5 },
  historyCard: { backgroundColor: 'white', marginHorizontal: 18, marginBottom: 12, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  iconCircle: { backgroundColor: '#FFF9C4', padding: 10, borderRadius: 14 },
  historyDate: { fontWeight: 'bold', color: '#6B7280', fontSize: 13 },
  historyUnit: { fontSize: 18, fontWeight: '900', color: '#111827', marginTop: 3 },
  
  deleteBtn: { backgroundColor: '#FFEBEE', padding: 10, borderRadius: 14 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontWeight: 'bold', fontSize: 15 }
});

export default SolarScreen;