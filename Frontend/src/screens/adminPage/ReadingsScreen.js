import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, RefreshControl, Platform, StatusBar, TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReadingsScreen = () => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const loadCache = useCallback(async () => {
    if (!adminId) return;
    try {
      const cachedData = await AsyncStorage.getItem(`readings_cache_${adminId}`);
      if (cachedData) {
        setLogs(JSON.parse(cachedData));
        setLoading(false); 
      }
    } catch (e) { console.log("Cache Load Error", e); }
  }, [adminId]);

  const fetchLogs = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/readings/all/${adminId}`);
      const freshData = res.data || [];
      setLogs(freshData);
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
      const fileUri = `${FileSystem.cacheDirectory}Readings_${Date.now()}.xlsx`;
      const result = await FileSystem.downloadAsync(url, fileUri);
      if (result.status === 200) await Sharing.shareAsync(result.uri);
    } catch (e) { console.log('Export error:', e); }
  };

  const renderRow = ({ item }) => {
    const d = new Date(item.createdAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.tenantInfo}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color="#333399" />
              <Text style={styles.tenantName}>{item.tenantId?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
            </View>
          </View>
          <View style={styles.readingContainer}>
            <View>
              <Text style={styles.readingValue}>{item.closingReading}</Text>
              <Text style={styles.unitText}>kWh Total Reading</Text>
            </View>
            <View style={styles.staffPill}>
              <MaterialCommunityIcons name="account-hard-hat" size={12} color="#64748B" />
              <Text style={styles.staffText}>{item.staffId || 'Admin'}</Text>
            </View>
          </View>
          <View style={styles.timeRow}>
             <MaterialCommunityIcons name="clock-outline" size={12} color="#94A3B8" />
             <Text style={styles.timeText}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
             <View style={styles.dot} />
             <Text style={styles.meterText}>Meter: {item.tenantId?.meterId || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && logs.length === 0 && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#333399" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔴 STATUS BAR FIX */}
      <StatusBar barStyle="light-content" backgroundColor="#333399" translucent={false} />
      
      {/* 🟦 HEADER WITH MANUAL PADDING */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History Log</Text>
          <Text style={styles.subtitle}>{logs.length} Records collected</Text>
        </View>

        <TouchableOpacity style={styles.excelBtn} onPress={() => setShowModal(true)}>
          <MaterialCommunityIcons name="file-excel-outline" size={20} color="#FFF" />
          <Text style={styles.excelText}>Export</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333399" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialCommunityIcons name="database-off-outline" size={50} color="#CBD5E1" />
            <Text style={styles.emptyText}>No readings found.</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Export Excel Report</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerGroup}>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowFromPicker(true)}>
                <Text style={styles.dateLabel}>FROM DATE</Text>
                <Text style={styles.dateVal}>{fromDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#CBD5E1" />
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowToPicker(true)}>
                <Text style={styles.dateLabel}>TO DATE</Text>
                <Text style={styles.dateVal}>{toDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
            {showFromPicker && (
              <DateTimePicker value={fromDate} mode="date" onChange={(e, d) => { setShowFromPicker(false); if (d) setFromDate(d); }} />
            )}
            {showToPicker && (
              <DateTimePicker value={toDate} mode="date" onChange={(e, d) => { setShowToPicker(false); if (d) setToDate(d); }} />
            )}
            <TouchableOpacity style={styles.downloadBtn} onPress={exportExcel}>
              <MaterialCommunityIcons name="microsoft-excel" size={22} color="white" />
              <Text style={styles.downloadText}>DOWNLOAD REPORT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 50, 
    paddingHorizontal: 20, 
    paddingBottom: 25, 
    backgroundColor: '#333399',
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 10
  },
  title: { color: 'white', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  excelBtn: { flexDirection: 'row', backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 15, alignItems: 'center', gap: 8 },
  excelText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: 'white', borderRadius: 20, marginBottom: 15, flexDirection: 'row', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardAccent: { width: 5, backgroundColor: '#333399' },
  cardMain: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tenantInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tenantName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  dateBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dateText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  readingContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginVertical: 8 },
  readingValue: { fontSize: 26, fontWeight: '900', color: '#333399' },
  unitText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  staffPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  staffText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timeText: { fontSize: 11, color: '#94A3B8', marginLeft: 5 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  meterText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  datePickerGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  dateInput: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 15, alignItems: 'center' },
  dateLabel: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold', marginBottom: 4 },
  dateVal: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  downloadBtn: { backgroundColor: '#333399', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  downloadText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600' },
  emptyText: { marginTop: 15, color: '#94A3B8', fontWeight: '600' }
});

export default ReadingsScreen;