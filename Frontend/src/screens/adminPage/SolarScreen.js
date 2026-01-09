import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import { Swipeable } from 'react-native-gesture-handler';


const SolarScreen = () => {
  const { user } = useContext(UserContext);
  const companyId =
    user?.role === 'Admin' ? user?.id || user?._id : user?.belongsToAdmin;

  const [units, setUnits] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(
        `${API_URL}/solar/history/${companyId}`
      );
      setHistory(res.data || []);
    } catch (err) {
      console.log('History error:', err.message);
    }
  }, [companyId]);

  const fetchSolarForDate = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/solar/by-date`, {
        params: { adminId: companyId, date: date.toISOString() }
      });

      setUnits(res.data ? String(res.data.unitsGenerated) : '');
    } catch (err) {
      console.log('Fetch Error:', err.message);
      setUnits('');
    }
  }, [companyId, date]);

  useEffect(() => {
    fetchSolarForDate();
    fetchHistory();
  }, [fetchSolarForDate, fetchHistory]);

  const handleSave = async () => {
    if (!units || isNaN(units) || Number(units) <= 0) {
      return Alert.alert('Error', 'Please enter valid units');
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/solar/add`, {
        adminId: companyId,
        unitsGenerated: Number(units),
        date: date.toISOString()
      });

      Alert.alert('Success', 'Solar log saved ☀️');
      setUnits('');
      fetchHistory();
    } catch {
      Alert.alert('Error', 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
  <View style={styles.container}>
    <Text style={styles.title}>☀️ Solar Generation</Text>

    {/* DATE CARD */}
    <View style={styles.card}>
      <Text style={styles.label}>Selected Date</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowDate(true)}
      >
        <Text style={styles.dateText}>
          {date.toDateString()}
        </Text>
      </TouchableOpacity>
    </View>

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

    {/* INPUT CARD */}
    <View style={styles.card}>
      <Text style={styles.label}>Units Generated (kWh)</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        keyboardType="numeric"
        value={units}
        onChangeText={setUnits}
      />

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save Entry</Text>
        )}
      </TouchableOpacity>
    </View>

    {/* HISTORY */}
    <Text style={styles.historyTitle}>Monthly History</Text>

    <FlatList
      data={history}
      keyExtractor={(item) => item._id}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <Text style={styles.empty}>No solar records yet</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.historyCard}>
          <View>
            <Text style={styles.historyDate}>
              {new Date(item.date).toDateString()}
            </Text>
            <Text style={styles.historySub}>
              Solar Generated
            </Text>
          </View>
          <Text style={styles.historyUnit}>
            {item.unitsGenerated} kWh
          </Text>
        </View>
      )}
    />
  </View>
);

};

export default SolarScreen;

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: '#f2f5ff'
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2e3a8c',
    textAlign: 'center',
    marginBottom: 20
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    elevation: 4
  },

  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },

  dateBtn: {
    backgroundColor: '#eef1ff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center'
  },

  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },

  input: {
    backgroundColor: '#f9faff',
    borderRadius: 14,
    padding: 18,
    fontSize: 26,
    textAlign: 'center',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#dfe3ff',
    marginBottom: 16
  },

  btn: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center'
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333'
  },

  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2
  },

  historyDate: {
    fontWeight: '600',
    color: '#333'
  },

  historySub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },

  historyUnit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50'
  },

  empty: {
    textAlign: 'center',
    marginTop: 30,
    color: '#777'
  }
});
