import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Alert, RefreshControl, StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ApprovalScreen = () => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState([]); // Dono pending aur history ke liye
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' ya 'history'

  const adminId = user?._id || user?.id;

  // 🔄 1. डेटा फेच करने का फंक्शन (Tab के हिसाब से)
  const fetchData = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' ? 'pending' : 'history-all';
      const res = await axios.get(`${API_URL}/readings/${endpoint}/${adminId}`);
      setData(res.data || []);
    } catch (e) {
      console.log("Fetch Error:", e.message);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ✅ 2. Approve/Reject एक्शन
  const handleAction = async (id, action) => {
    try {
      const reason = action === 'reject' ? "Photo is not clear / Wrong reading" : "";
      await axios.put(`${API_URL}/readings/${action}/${id}`, { reason });
      
      Toast.show({ 
        type: 'success', 
        text1: action === 'approve' ? 'Approved ✅' : 'Rejected ❌' 
      });
      fetchData(); // List refresh karein
    } catch (e) {
      Alert.alert("Error", "Action failed.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tName}>{item.tenantId?.name || 'N/A'}</Text>
          <Text style={styles.staffName}>Staff: {item.staffId || 'Unknown'}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</Text>
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
        <View style={[styles.statusBanner, { backgroundColor: item.status === 'Approved' ? '#E8F5E9' : '#FFEBEE' }]}>
            <MaterialCommunityIcons 
                name={item.status === 'Approved' ? 'check-circle' : 'alert-circle'} 
                size={18} 
                color={item.status === 'Approved' ? '#4CAF50' : '#F44336'} 
            />
            <Text style={[styles.statusText, { color: item.status === 'Approved' ? '#2E7D32' : '#C62828' }]}>
                {item.status.toUpperCase()} 
                {item.rejectionReason ? `: ${item.rejectionReason}` : ''}
            </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.blueHeader}>
        <View>
          <Text style={styles.headerTitle}>Approvals</Text>
          <Text style={styles.headerSub}>{activeTab === 'pending' ? `${data.length} Pending Requests` : 'Recent History'}</Text>
        </View>
        <MaterialCommunityIcons name="shield-check" size={35} color="rgba(255,255,255,0.4)" />
      </View>

      {/* --- Tabs Section --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
            onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
            onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#333399" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={data} 
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="folder-open-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No records found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  blueHeader: { 
    backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 50, paddingBottom: 25, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#333399', paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#FFF' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#FFF' },
  
  card: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 20, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  staffName: { fontSize: 11, color: '#666', marginTop: 2 },
  dateText: { fontSize: 10, color: '#999' },
  valBadge: { backgroundColor: '#F0F2FF', padding: 8, borderRadius: 10 },
  rValue: { fontSize: 15, fontWeight: '900', color: '#333399' },
  img: { width: '100%', height: 200, borderRadius: 15, backgroundColor: '#f0f0f0' },
  
  btnRow: { flexDirection: 'row', marginTop: 15 },
  rejBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  appBtn: { flex: 1.5, backgroundColor: '#4CAF50', flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 15 },
  statusText: { marginLeft: 8, fontWeight: 'bold', fontSize: 12, flex: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', fontWeight: 'bold', marginTop: 10 }
});

export default ApprovalScreen;