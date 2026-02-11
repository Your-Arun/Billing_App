import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, RefreshControl, Platform, StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system'; 
import * as Sharing from 'expo-sharing'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const ReadingsScreen = () => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // 🟢 Start with true
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Date states for Export
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // 🔄 1. Load Cache (Instant Data)
  const loadCache = useCallback(async () => {
    if (!adminId) return;
    try {
      const cachedData = await AsyncStorage.getItem(`readings_cache_${adminId}`);
      if (cachedData) {
        setLogs(JSON.parse(cachedData));
        setLoading(false); 
      }
    } catch (e) {
      console.log("Cache Load Error", e);
    }
  }, [adminId]);

  // 🌐 2. Fetch from Server
  const fetchLogs = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/readings/all/${adminId}`);
      const freshData = res.data || [];
      setLogs(freshData);
      // Cache update karein
      await AsyncStorage.setItem(`readings_cache_${adminId}`, JSON.stringify(freshData));
    } catch (e) {
      console.log('Fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadCache();
    fetchLogs();
  }, [loadCache, fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const exportExcel = async () => {
    setShowModal(false);
    const url = `${API_URL}/readings/export/${adminId}?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;

    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}Meter_Readings_${Date.now()}.xlsx`;
      const result = await FileSystem.downloadAsync(url, fileUri);

      if (result.status === 200) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (e) {
      console.log('Export error:', e);
    }
  };

  const renderRow = ({ item }) => {
    const d = new Date(item.createdAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.tenant}>{item.tenantId?.name || 'Deleted Tenant'}</Text>
          <Text style={styles.date}>
            {d.toLocaleDateString('en-GB')} · {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.reading}>{item.closingReading} kWh</Text>
            <Text style={styles.staff}>Entered by {item.staffId || 'Admin'}</Text>
          </View>
          <MaterialCommunityIcons name="flash" size={26} color="#4F46E5" />
        </View>
      </View>
    );
  };

  // 🟢 FIXED: Loading indicator moved here (Main return se pehle)
  if (loading && logs.length === 0 && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#333399" />
        <Text style={{ marginTop: 10, color: '#666' }}>Fetching Readings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meter Readings</Text>
          <Text style={styles.subtitle}>{logs.length} Records found</Text>
        </View>

        <TouchableOpacity style={styles.excelBtn} onPress={() => setShowModal(true)}>
          <MaterialCommunityIcons name="microsoft-excel" size={22} color="#1D6F42" />
          <Text style={styles.excelText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No readings found.</Text>}
      />

      {/* EXPORT MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.sheetBg}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Export Excel Report</Text>

            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
              <MaterialCommunityIcons name="calendar" size={20} color="#666" />
              <Text style={{flex: 1}}>From: {fromDate.toDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
              <MaterialCommunityIcons name="calendar" size={20} color="#666" />
              <Text style={{flex: 1}}>To: {toDate.toDateString()}</Text>
            </TouchableOpacity>

            {showFromPicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                onChange={(e, d) => { setShowFromPicker(false); if (d) setFromDate(d); }}
              />
            )}

            {showToPicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                onChange={(e, d) => { setShowToPicker(false); if (d) setToDate(d); }}
              />
            )}

            <TouchableOpacity style={styles.downloadBtn} onPress={exportExcel}>
              <MaterialCommunityIcons name="download" size={20} color="white" />
              <Text style={styles.downloadText}>GENERATE EXCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowModal(false)} style={{padding: 15}}>
              <Text style={{ textAlign: 'center', color: '#EF4444', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6FF' },
  header: {
    paddingTop: 20, paddingBottom: 25, paddingHorizontal: 20, backgroundColor: '#333399',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', elevation: 5
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  excelBtn: { flexDirection: 'row', backgroundColor: '#ECFDF5', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', gap: 6 },
  excelText: { color: '#1D6F42', fontWeight: '600' },
  card: { backgroundColor: 'white', marginHorizontal: 15, marginVertical: 8, padding: 16, borderRadius: 18, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  tenant: { fontSize: 15, fontWeight: '700', color: '#111827' },
  date: { fontSize: 11, color: '#6B7280' },
  cardBottom: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reading: { fontSize: 20, fontWeight: '800', color: '#4F46E5' },
  staff: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#1E293B' },
  dateBtn: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: '#F1F5F9', borderRadius: 15, marginBottom: 12 },
  downloadBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#333399', padding: 18, borderRadius: 15, marginTop: 10 },
  downloadText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8', fontWeight: 'bold' }
});

export default ReadingsScreen;