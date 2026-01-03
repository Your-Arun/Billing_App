import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Modal, TextInput, FlatList, ActivityIndicator, Alert, RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const TenantsScreen = () => {
  const { user } = useContext(UserContext);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setTenantModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

 
  const [form, setForm] = useState({
    name: '',
    meterId: '',
    openingMeter: '',
    multiplierCT: '1',
    ratePerUnit: '',
    transformerLoss: '0',
    fixedCharge: '0'
  });

  const companyId = user?.role === 'Admin' ? user?.id : user?.belongsToAdmin;

  const fetchTenants = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tenants/add/${companyId}`);
      setTenants(res.data);
    } catch (e) {
      console.log("Fetch Error:", e.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [companyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTenants();
  }, [companyId]);

  const handleAddTenant = async () => {
    // वैलिडेशन
    if (!form.name || !form.meterId || !form.openingMeter || !form.ratePerUnit) {
      Alert.alert("Error", "Please fill Name, Meter ID, Opening and Rate!");
      return;
    }

    try {
      const tenantData = {
        ...form,
        adminId: companyId, // डेटा को कंपनी से लिंक किया
        openingMeter: Number(form.openingMeter),
        ratePerUnit: Number(form.ratePerUnit),
        multiplierCT: Number(form.multiplierCT),
        transformerLoss: Number(form.transformerLoss),
        fixedCharge: Number(form.fixedCharge)
      };

      const response = await axios.post(`${API_URL}/api/tenants/add`, tenantData);
      
      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Tenant Added Successfully ✅");
        setTenantModalVisible(false);
        fetchTenants(); // लिस्ट अपडेट करें
        // फॉर्म रीसेट करें
        setForm({ name: '', meterId: '', openingMeter: '', multiplierCT: '1', ratePerUnit: '', transformerLoss: '0', fixedCharge: '0' });
      }
    } catch (e) {
      console.log("Add Error:", e.response?.data);
      Alert.alert("Error", e.response?.data?.msg || "Could not save tenant");
    }
  };

  const renderTenant = ({ item }) => (
    <View style={styles.tenantCard}>
      <View style={styles.tenantInfo}>
        <MaterialCommunityIcons name="store-outline" size={24} color="#333399" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.tenantName}>{item.name}</Text>
          <Text style={styles.tenantSub}>Meter ID: {item.meterId}</Text>
        </View>
      </View>
      <View style={styles.readingBox}>
        <Text style={styles.readingLabel}>Open: {item.openingMeter}</Text>
        <Text style={[styles.readingLabel, { color: '#333399', marginTop: 4 }]}>
          Close: {item.currentClosing || '--'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* एडमिन को ही टेनेंट जोड़ने का बटन दिखेगा */}
      {user?.role === 'Admin' && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setTenantModalVisible(true)}>
          <MaterialCommunityIcons name="plus" size={24} color="white" />
          <Text style={styles.addBtnText}>Add New Tenant</Text>
        </TouchableOpacity>
      )}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#333399" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item._id}
          renderItem={renderTenant}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No Tenants found for this company.</Text>
          }
        />
      )}

      {/* --- Add Tenant Modal (Sketch B) --- */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Register New Tenant</Text>
            <TouchableOpacity onPress={() => setTenantModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Name / Shop ID *</Text>
            <TextInput 
              style={styles.input} 
              value={form.name} 
              onChangeText={(t) => setForm({ ...form, name: t })} 
              placeholder="e.g. Shop No. 10" 
            />

            <Text style={styles.label}>Meter ID *</Text>
            <TextInput 
              style={styles.input} 
              value={form.meterId} 
              onChangeText={(t) => setForm({ ...form, meterId: t })} 
              placeholder="MTR-XXXX" 
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Opening Meter *</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={form.openingMeter} 
                  onChangeText={(t) => setForm({ ...form, openingMeter: t })} 
                  placeholder="0.00" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Multiplier (CT)</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={form.multiplierCT} 
                  onChangeText={(t) => setForm({ ...form, multiplierCT: t })} 
                />
              </View>
            </View>

            <Text style={styles.label}>Rate (Rs / Unit) *</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={form.ratePerUnit} 
              onChangeText={(t) => setForm({ ...form, ratePerUnit: t })} 
              placeholder="10.50" 
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Transformer Loss (%)</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={form.transformerLoss} 
                  onChangeText={(t) => setForm({ ...form, transformerLoss: t })} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fixed Monthly Charge</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={form.fixedCharge} 
                  onChangeText={(t) => setForm({ ...form, fixedCharge: t })} 
                  placeholder="0" 
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddTenant}>
              <Text style={styles.saveText}>Save Tenant Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setTenantModalVisible(false)} 
              style={{ marginTop: 20, alignSelf: 'center', marginBottom: 50 }}
            >
              <Text style={{ color: 'red', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
  addBtn: { 
    backgroundColor: '#333399', flexDirection: 'row', padding: 15, 
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', 
    marginBottom: 20, marginTop: 40, elevation: 3 
  },
  addBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  tenantCard: { 
    backgroundColor: 'white', padding: 18, borderRadius: 15, 
    flexDirection: 'row', justifyContent: 'space-between', 
    marginBottom: 12, elevation: 2, alignItems: 'center' 
  },
  tenantInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  tenantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tenantSub: { fontSize: 12, color: '#666', marginTop: 2 },
  readingBox: { alignItems: 'flex-end', borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 15 },
  readingLabel: { fontSize: 11, fontWeight: '700', color: '#777' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 14 },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  modalScroll: { padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333399' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 5 },
  input: { 
    backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', 
    padding: 14, borderRadius: 10, marginBottom: 18, color: '#333' 
  },
  row: { flexDirection: 'row' },
  saveBtn: { 
    backgroundColor: '#4caf50', padding: 18, borderRadius: 12, 
    alignItems: 'center', marginTop: 15, elevation: 2 
  },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default TenantsScreen;


//paste krna hai fix krne ko de dia
//kaam kr rha naa