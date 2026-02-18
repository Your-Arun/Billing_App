import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  StatusBar,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SolarScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const companyId = user?.role === 'Admin' ? user?.id || user?._id : user?.belongsToAdmin;

  const [units, setUnits] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [history, setHistory] = useState([]);

  // 🔄 1. Load Cache
  const loadCache = useCallback(async () => {
    if (!companyId) return;
    try {
      const cachedData = await AsyncStorage.getItem(`solar_cache_${companyId}`);
      if (cachedData) {
        setHistory(JSON.parse(cachedData));
        setLoading(false);
      }
    } catch (e) {
      console.log("Cache Load Error", e);
    }
  }, [companyId]);

  // 🌐 2. Fetch API
  const fetchHistory = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/solar/history/${companyId}`);
      const freshData = res.data || [];
      setHistory(freshData);
      await AsyncStorage.setItem(`solar_cache_${companyId}`, JSON.stringify(freshData));
    } catch (err) {
      console.log('History error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCache();
    fetchHistory();
  }, [loadCache, fetchHistory]);

  const fetchSolarForDate = useCallback(async () => {
    if (!companyId) return;
    try {
      const dateKey = date.toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/solar/by-date`, {
        params: { adminId: companyId, date: dateKey }
      });
      setUnits(res.data ? String(res.data.unitsGenerated) : '');
    } catch (err) {
      setUnits('');
    }
  }, [companyId, date]);

  useEffect(() => {
    fetchSolarForDate();
  }, [fetchSolarForDate]);

  const handleSave = async () => {
    if (!units || isNaN(units) || Number(units) <= 0) {
      return Toast.show({ type: 'error', text1: 'Invalid Input ❌', text2: 'Enter valid units' });
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/solar/add`, {
        adminId: companyId,
        unitsGenerated: Number(units),
        date: date.toISOString()
      });
      Toast.show({ type: 'success', text1: 'Log Saved ☀️' });
      setUnits('');
      fetchHistory();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Server Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await axios.delete(`${API_URL}/solar/delete/${id}`);
      if (res.data.success) {
        Toast.show({ type: 'info', text1: 'Entry Removed 🗑️' });
        fetchHistory();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Delete Failed' });
    }
  };

  if (loading && history.length === 0) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#333399" />
        <Text style={{ marginTop: 10, color: '#666' }}>Syncing Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔴 Fixed Status Bar for APK visibility */}
      <StatusBar barStyle="light-content" backgroundColor="#333399" translucent={true} />

      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 18 }}>
            <View style={styles.card}>
              <Text style={styles.label}>SELECT LOG DATE</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
                <MaterialCommunityIcons name="calendar-clock" size={22} color="#333399" />
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

            <View style={styles.card}>
              <Text style={styles.label}>UNITS GENERATED (kWh)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9E9E9E"
                keyboardType="numeric"
                value={units}
                onChangeText={setUnits}
              />
              <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>CONFIRM & SAVE</Text>
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>Recent Logs</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="weather-sunny" size={24} color="#FBC02D" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.historyUnit}>{item.unitsGenerated} kWh</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records found.</Text>}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FF' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F6FF' },
  header: { 
    backgroundColor: '#333399', 
    paddingHorizontal: 20, 
    // Android StatusBar.currentHeight fix
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 60, 
    paddingBottom: 30, 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35, 
    elevation: 10 
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8, textAlign: 'center' },
  
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginTop: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 12, letterSpacing: 1, textAlign: 'center' },
  
  dateBtn: { backgroundColor: '#F0F3FF', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E7FF' },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#333399', marginLeft: 10 },
  
  input: { backgroundColor: '#F9FAFF', padding: 16, borderRadius: 16, fontSize: 24, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#EDF1FF', marginBottom: 18, color: '#1F2937' },
  
  btn: { backgroundColor: '#333399', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 5 },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  historyTitle: { fontSize: 17, fontWeight: 'bold', color: '#1A1C3D', marginVertical: 15, marginLeft: 5 },
  historyCard: { backgroundColor: 'white', marginHorizontal: 18, marginBottom: 12, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  iconCircle: { backgroundColor: '#FFF9C4', padding: 10, borderRadius: 14 },
  historyDate: { fontWeight: 'bold', color: '#6B7280', fontSize: 13 },
  historyUnit: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  
  deleteBtn: { backgroundColor: '#FFEBEE', padding: 8, borderRadius: 12 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontWeight: 'bold' }
});

export default SolarScreen;