import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Modal, RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ApprovalScreen = () => {
  const { user } = useContext(UserContext);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const adminId = user?._id || user?.id;

  // 🔄 1. डेटा फेच करने का फंक्शन
  const fetchPending = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/readings/pending/${adminId}`);
      setPending(res.data || []);
    } catch (e) {
      console.log("Fetch Error Approval:", e.message);
      Toast.show({ type: 'error', text1: 'Fetch Error', text2: 'Could not load pending requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // ✅ 2. Approve/Reject एक्शन
  const handleAction = async (id, action) => {
    try {
      const reason = action === 'reject' ? "Please take a clearer photo" : "";
      // ⚠️ पक्का करें बैकएंड रूट: /tenants/approve/:id
      await axios.put(`${API_URL}/readings/${action}/${id}`, { reason });
      
      Toast.show({ 
        type: 'success', 
        text1: action === 'approve' ? 'Approved ✅' : 'Rejected ❌' 
      });
      fetchPending();
    } catch (e) {
      Alert.alert("Error", "Action failed. Check connection.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tName}>{item.tenantId?.name || 'N/A'}</Text>
          <Text style={styles.staffName}>By Staff: {item.staffId || 'Unknown'}</Text> 
        </View>
        <View style={styles.valBadge}>
           <Text style={styles.rValue}>+{item.closingReading} kWh</Text>
        </View>
      </View>
      
      <Image source={{ uri: item.photo }} style={styles.img} resizeMode="cover" />

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
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.blueHeader}>
        <View>
          <Text style={styles.headerTitle}>Review Center</Text>
          <Text style={styles.headerSub}>{pending.length} Pendings Awaiting</Text>
        </View>
        <MaterialCommunityIcons name="shield-check" size={35} color="rgba(255,255,255,0.4)" />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#333399" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={pending} 
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPending(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="check-all" size={60} color="#CCC" />
              <Text style={styles.emptyText}>All caught up! No pending reviews.</Text>
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
    backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 35, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30 
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  
  card: { backgroundColor: 'white', borderRadius: 25, padding: 15, marginBottom: 20, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  staffName: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  valBadge: { backgroundColor: '#F0F2FF', padding: 8, borderRadius: 10, alignItems: 'center' },
  rValue: { fontSize: 16, fontWeight: '900', color: '#333399' },
  img: { width: '100%', height: 220, borderRadius: 20, backgroundColor: '#f0f0f0' },
  
  btnRow: { flexDirection: 'row', marginTop: 15 },
  rejBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  appBtn: { flex: 1.5, backgroundColor: '#4CAF50', flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: '#999', fontWeight: 'bold', marginTop: 10 }
});

export default ApprovalScreen;