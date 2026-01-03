import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Modal, TextInput, FlatList, ActivityIndicator, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const TenantsScreen = () => {
  const { user } = useContext(UserContext);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

 
  const [form, setForm] = useState({
    name: '', meterId: '', openingMeter: '', multiplierCT: '1',
    ratePerUnit: '', transformerLoss: '0', fixedCharge: ''
  });

  useEffect(() => { fetchTenants(); }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tenants/${user.id}`);
      setTenants(res.data);
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  const handleAddTenant = async () => {
    if (!form.name || !form.meterId || !form.openingMeter) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }
    try {
      await axios.post(`${API_URL}/api/tenants/add`, { ...form, adminId: user.id });
      setModalVisible(false);
      fetchTenants();
      setForm({ name: '', meterId: '', openingMeter: '', multiplierCT: '1', ratePerUnit: '', transformerLoss: '0', fixedCharge: '' });
    } catch (e) { Alert.alert("Error", "Could not save tenant"); }
  };

  const renderTenant = ({ item }) => (
    <View style={styles.tenantCard}>
      <View>
        <Text style={styles.tenantName}>{item.name}</Text>
        <Text style={styles.tenantSub}>Meter: {item.meterId}</Text>
      </View>
      <View style={styles.readingBox}>
        <Text style={styles.readingLabel}>Opening: {item.openingMeter}</Text>
        <Text style={[styles.readingLabel, {color: '#333399'}]}>Closing: {item.currentClosing || '--'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={24} color="white" />
        <Text style={styles.addBtnText}>Add Tenant</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator size="large" color="#333399" /> : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item._id}
          renderItem={renderTenant}
          ListEmptyComponent={<Text style={styles.emptyText}>No Tenants Added Yet</Text>}
        />
      )}

      {/* --- Add Tenant Modal (Sketch B) --- */}
      <Modal visible={modalVisible} animationType="slide">
        <ScrollView style={styles.modalScroll}>
          <Text style={styles.modalTitle}>New Tenant Details</Text>
          
          <Text style={styles.label}>Name / Shop ID *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(t)=>setForm({...form, name:t})} placeholder="e.g. Shop 101" />

          <Text style={styles.label}>Meter ID *</Text>
          <TextInput style={styles.input} value={form.meterId} onChangeText={(t)=>setForm({...form, meterId:t})} placeholder="MTR-001" />

          <View style={styles.row}>
            <View style={{flex:1, marginRight:10}}>
              <Text style={styles.label}>Opening Meter *</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.openingMeter} onChangeText={(t)=>setForm({...form, openingMeter:t})} placeholder="0.00" />
            </View>
            <View style={{flex:1}}>
              <Text style={styles.label}>Multiplier (CT)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.multiplierCT} onChangeText={(t)=>setForm({...form, multiplierCT:t})} />
            </View>
          </View>

          <Text style={styles.label}>Rate (Rs / Unit) *</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={form.ratePerUnit} onChangeText={(t)=>setForm({...form, ratePerUnit:t})} placeholder="10.50" />

          <View style={styles.row}>
            <View style={{flex:1, marginRight:10}}>
              <Text style={styles.label}>Loss (%)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.transformerLoss} onChangeText={(t)=>setForm({...form, transformerLoss:t})} />
            </View>
            <View style={{flex:1}}>
              <Text style={styles.label}>Fixed Charge</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.fixedCharge} onChangeText={(t)=>setForm({...form, fixedCharge:t})} placeholder="500" />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddTenant}>
            <Text style={styles.saveText}>Save Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 20, alignSelf: 'center'}}>
            <Text style={{color: 'red'}}>Cancel</Text>
          </TouchableOpacity>
          <View style={{height: 50}} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
  addBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 30, marginTop: 40 },
  addBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  tenantCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, elevation: 2 },
  tenantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tenantSub: { fontSize: 12, color: '#666' },
  readingBox: { alignItems: 'flex-end' },
  readingLabel: { fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalScroll: { padding: 20, paddingTop: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333399', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 10, marginBottom: 15 },
  row: { flexDirection: 'row' },
  saveBtn: { backgroundColor: '#4caf50', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default TenantsScreen;

//compnay wise data store hogaa 