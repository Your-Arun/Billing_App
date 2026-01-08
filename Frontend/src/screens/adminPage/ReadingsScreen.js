import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReadingsScreen = () => {
  const { user } = useContext(UserContext);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const adminId = user?.id || user?._id;

  const fetchReadings = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tenants/${adminId}`);
      setReadings(res.data);
    } catch (e) {
      console.log("Fetch Error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const exportExcel = async () => {
    if (readings.length === 0) return Toast.show({ type: 'error', text1: 'No data to export' });
    setExporting(true);
    try {
      const fileUri = FileSystem.documentDirectory + "Electricity_Report.xlsx";
      const downloadRes = await FileSystem.downloadAsync(`${API_URL}/readings/export/${adminId}`, fileUri);

      if (downloadRes.status === 200) {
        await Sharing.shareAsync(downloadRes.uri);
        Toast.show({ type: 'success', text1: 'Excel Generated ✅' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Export Failed ❌' });
    } finally {
      setExporting(false);
    }
  };

  const renderReadingItem = ({ item }) => {
    const opening = item.tenantId?.openingMeter || 0;
    const closing = item.closingReading || 0;
    const consumed = closing - opening;

    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.staffInfo}>
            <MaterialCommunityIcons name="account-hard-hat" size={16} color="#333399" />
            <Text style={styles.staffName}>{item.staffId?.name || "Staff"}</Text>
          </View>
          <Text style={styles.logDate}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={styles.logBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName}>{item.tenantId?.name || "N/A"}</Text>
            <Text style={styles.meterId}>Meter: {item.tenantId?.meterId || "N/A"}</Text>
            <Text style={styles.diffText}>Opening: {opening} → Closing: {closing}</Text>
          </View>
          <View style={styles.unitsBadge}>
            <Text style={styles.unitsValue}>{consumed >= 0 ? `+${consumed}` : consumed}</Text>
            <Text style={styles.unitsLabel}>UNITS</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Daily Logs</Text>
          <Text style={styles.subtitle}>{readings.length} entries recorded</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportExcel} disabled={exporting}>
          {exporting ? <ActivityIndicator color="white" size="small" /> : (
            <>
              <MaterialCommunityIcons name="file-excel" size={20} color="white" />
              <Text style={styles.exportBtnText}>EXPORT</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={readings}
        keyExtractor={(item) => item._id}
        renderItem={renderReadingItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReadings(); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No logs found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, elevation: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333399' },
  subtitle: { fontSize: 12, color: '#999' },
  exportBtn: { backgroundColor: '#2e7d32', flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  exportBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  logCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingBottom: 8, marginBottom: 10 },
  staffInfo: { flexDirection: 'row', alignItems: 'center' },
  staffName: { fontSize: 12, fontWeight: 'bold', color: '#666', marginLeft: 5 },
  logDate: { fontSize: 11, color: '#AAA' },
  logBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tenantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  meterId: { fontSize: 12, color: '#888' },
  diffText: { fontSize: 11, color: '#333399', marginTop: 5, fontWeight: '600' },
  unitsBadge: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 12, alignItems: 'center', minWidth: 65 },
  unitsValue: { color: '#4CAF50', fontWeight: 'bold', fontSize: 15 },
  unitsLabel: { color: '#4CAF50', fontSize: 8, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#999' }
});

export default ReadingsScreen;