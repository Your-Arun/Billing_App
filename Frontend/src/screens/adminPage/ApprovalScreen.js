import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ApprovalScreen = () => {
  const { user } = useContext(UserContext);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/readings/pending/${user.id}`);
      setPending(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (id, action) => {
    try {
      await axios.put(`${API_URL}/readings/${action}/${id}`, { reason: "Check reading again" });
      Toast.show({ type: 'success', text1: `Reading ${action}ed` });
      fetchPending();
    } catch (e) { Alert.alert("Error", "Failed"); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Readings</Text>
      {loading ? <ActivityIndicator size="large" /> : (
        <FlatList 
          data={pending} 
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.tenantId?.name}</Text>
                <Text style={styles.val}>{item.closingReading} kWh</Text>
              </View>
              <Image source={{uri: item.photo}} style={styles.img} />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.rejBtn} onPress={() => handleAction(item._id, 'reject')}><Text style={styles.btnText}>REJECT</Text></TouchableOpacity>
                <TouchableOpacity style={styles.appBtn} onPress={() => handleAction(item._id, 'approve')}><Text style={styles.btnText}>APPROVE</Text></TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fd', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 20, marginBottom: 15, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  name: { fontSize: 18, fontWeight: 'bold' },
  val: { fontSize: 18, fontWeight: 'bold', color: '#333399' },
  img: { width: '100%', height: 200, borderRadius: 15 },
  btnRow: { flexDirection: 'row', marginTop: 15 },
  rejBtn: { flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 10, marginRight: 10, alignItems: 'center' },
  appBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});

export default ApprovalScreen;