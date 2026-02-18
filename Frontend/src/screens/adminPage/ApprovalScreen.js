import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Alert, RefreshControl, StatusBar, Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ApprovalScreen = () => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const adminId = user?._id || user?.id;

  // 🟢 Unique Cache Key
  const cacheKey = `approval_${activeTab}_cache_${adminId}`;

  const loadCache = useCallback(async () => {
    if (!adminId) return;
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        setData(JSON.parse(cachedData));
        setLoading(false); 
      }
    } catch (e) {
      console.log("Cache Load Error:", e);
    }
  }, [adminId, cacheKey]);

  const fetchData = useCallback(async () => {
    if (!adminId) return;
    
    // Sirf tabhi loading dikhao jab pehle se data na ho
    if (data.length === 0) setLoading(true);

    try {
      const endpoint = activeTab === 'pending' ? 'pending' : 'history-all';
      const res = await axios.get(`${API_URL}/readings/${endpoint}/${adminId}`);
      const freshData = res.data || [];
      
      setData(freshData);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
    } catch (e) {
      console.log("Fetch Error Approval:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId, activeTab, cacheKey, data.length]);

  useEffect(() => {
    loadCache(); 
    fetchData();
  }, [activeTab, adminId]);

  const handleAction = async (id, action) => {
    try {
      const reason = action === 'reject' ? "Photo is not clear / Wrong reading" : "";
      await axios.put(`${API_URL}/readings/${action}/${id}`, { reason });
      Toast.show({ type: 'success', text1: action === 'approve' ? 'Approved ✅' : 'Rejected ❌' });
      fetchData(); 
    } catch (e) {
      Alert.alert("Error", "Action failed.");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Record", "Sure you want to remove this record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/readings/${id}`);
            Toast.show({ type: 'success', text1: 'Deleted 🗑️' });
            fetchData();
          } catch (err) { Alert.alert("Error", "Could not delete"); }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tName}>{item.tenantId?.name || 'N/A'}</Text>
          <Text style={styles.staffName}>By Staff: {item.staffId || 'Admin'}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
        </View>
        <View style={styles.valBadge}>
           <Text style={styles.rValue}>{item.closingReading} kWh</Text>
        </View>
      </View>
      
      <Image source={{ uri: item.photo }} style={styles.img} resizeMode="cover" />

      {activeTab === 'pending' ? (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.rejBtn} onPress={() => handleAction(item._id, 'reject')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="white" />
            <Text style={styles.btnText}>REJECT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appBtn} onPress={() => handleAction(item._id, 'approve')}>
            <MaterialCommunityIcons name="check-decagram" size={20} color="white" />
            <Text style={styles.btnText}>APPROVE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.historyActionRow}>
          <View style={[styles.statusBanner, { backgroundColor: item.status === 'Approved' ? '#E8F5E9' : '#FFEBEE' }]}>
              <MaterialCommunityIcons name={item.status === 'Approved' ? 'check-circle' : 'alert-circle'} size={18} color={item.status === 'Approved' ? '#4CAF50' : '#F44336'} />
              <Text style={[styles.statusText, { color: item.status === 'Approved' ? '#2E7D32' : '#C62828' }]}>{item.status.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
             <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF5252" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && data.length === 0 && !refreshing) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#333399" />
        <Text style={{marginTop: 10, color: '#666'}}>Syncing data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔴 STATUS BAR FIX FOR APK */}
      <StatusBar barStyle="light-content" backgroundColor="#333399" translucent={true} />
      
      {/* 🟦 HEADER WITH MANUAL PADDING */}
      <View style={styles.blueHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Review Center</Text>
            <Text style={styles.headerSub}>{activeTab === 'pending' ? `${data.length} Pendings` : 'History Logs'}</Text>
          </View>
          <MaterialCommunityIcons name="shield-check" size={35} color="rgba(255,255,255,0.4)" />
        </View>
      </View>

      {/* 🟢 TABS (Under Blue Header) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={data} 
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#333399" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="folder-open-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No records found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // 🟢 Header Fix
  blueHeader: { 
    backgroundColor: '#333399', 
    paddingHorizontal: 25, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 50 : 60,
    paddingBottom: 20 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#333399', paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#FFF' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#FFF' },

  card: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 20, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tName: { fontSize: 17, fontWeight: 'bold', color: '#1A1C3D' },
  staffName: { fontSize: 11, color: '#666' },
  dateText: { fontSize: 10, color: '#999', marginTop: 2 },
  valBadge: { backgroundColor: '#F0F2FF', padding: 8, borderRadius: 10 },
  rValue: { fontSize: 15, fontWeight: '900', color: '#333399' },
  img: { width: '100%', height: 200, borderRadius: 15, backgroundColor: '#f0f0f0' },
  
  btnRow: { flexDirection: 'row', marginTop: 15 },
  rejBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  appBtn: { flex: 1.5, backgroundColor: '#4CAF50', flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },

  historyActionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, justifyContent: 'space-between' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, flex: 1, marginRight: 10 },
  statusText: { marginLeft: 8, fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#FFF0F0', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E0' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', fontWeight: 'bold', marginTop: 10 }
});

export default ApprovalScreen;