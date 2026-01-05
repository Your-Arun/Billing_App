import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Modal, TextInput, FlatList, ActivityIndicator, Alert, RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import SolarScreen from './SolarScreen';
import DGScreen from './DGScreen';

const TenantsScreen = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('Tenants'); 
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setTenantModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: '', meterId: '', openingMeter: '', multiplierCT: '1',
    ratePerUnit: '', transformerLoss: '0', fixedCharge: '0'
  });

  const companyId = user?.role === 'Admin' ? user?.id : user?.belongsToAdmin;

  const fetchTenants = useCallback(async () => {
    if (!companyId || activeTab !== 'Tenants') return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tenants/${companyId}`);
      setTenants(res.data);
    } catch (e) { console.log("Fetch Error:", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [companyId, activeTab]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchTenants(); }, [fetchTenants]);

  const handleEditInitiate = (tenant) => {
    setForm({
      name: tenant.name, meterId: tenant.meterId,
      openingMeter: tenant.openingMeter.toString(),
      multiplierCT: tenant.multiplierCT.toString(),
      ratePerUnit: tenant.ratePerUnit.toString(),
      transformerLoss: tenant.transformerLoss.toString(),
      fixedCharge: tenant.fixedCharge.toString()
    });
    setEditId(tenant._id);
    setIsEditing(true);
    setDetailModalVisible(false);
    setTenantModalVisible(true); 
  };

 const handleSaveOrUpdate = async () => {
    if (!form.name || !form.meterId || !form.openingMeter || !form.ratePerUnit) {
      return Alert.alert("Error", "Please fill required fields!");
    }

    try {
      const tenantData = { 
        name: form.name,
        meterId: form.meterId,
        adminId: companyId,
        openingMeter: Number(form.openingMeter),
        ratePerUnit: Number(form.ratePerUnit),
        multiplierCT: Number(form.multiplierCT) || 1,
        transformerLoss: Number(form.transformerLoss) || 0,
        fixedCharge: Number(form.fixedCharge) || 0
      };

      if (isEditing) {
        console.log("Updating Tenant ID:", editId);
        await axios.put(`${API_URL}/tenants/${editId}`, tenantData);
        Alert.alert("Success", "Tenant Updated ✅");
      } else {
        await axios.post(`${API_URL}/tenants/add`, tenantData);
        Alert.alert("Success", "Tenant Registered ✅");
      }
      
      closeFormModal();
      fetchTenants();
    } catch (e) { 
      console.log("Error Detail:", e.response?.data || e.message);
      Alert.alert("Error", "Action failed. Please try again."); 
    }
  };

  const closeFormModal = () => {
    setTenantModalVisible(false);
    setIsEditing(false);
    setEditId(null);
    setForm({ name: '', meterId: '', openingMeter: '', multiplierCT: '', ratePerUnit: '', transformerLoss: '0', fixedCharge: '0' });
  };

  const handleDelete = (id, name) => {
    Alert.alert("Confirm Delete", `Remove ${name}?`, [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/tenants/${id}`);
            setDetailModalVisible(false);
            fetchTenants();
          } catch (e) { Alert.alert("Error", "Delete failed"); }
      }}
    ]);
  };

  const renderTenantItem = ({ item }) => (
    <TouchableOpacity style={styles.modernCard} onPress={() => { setSelectedTenant(item); setDetailModalVisible(true); }}>
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="storefront" size={24} color="#333399" />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubTitle}>Meter ID: {item.meterId}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.readingPill}>
          <Text style={styles.pillLabel}>Current</Text>
          <Text style={styles.pillValue}>{item.currentClosing || item.openingMeter}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#DDD" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* --- PREMIUM TOP NAV --- */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Asset Management</Text>
        <View style={styles.tabBar}>
          {['Tenants', 'Solar', 'DG'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} 
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* --- CONTENT AREA --- */}
      {activeTab === 'Tenants' && (
        <View style={{ flex: 1 }}>
          {user?.role === 'Admin' && (
            <TouchableOpacity style={styles.fab} onPress={() => { setIsEditing(false); setTenantModalVisible(true); }}>
              <MaterialCommunityIcons name="plus" size={30} color="white" />
            </TouchableOpacity>
          )}

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#333399" style={{ marginTop: 100 }} />
          ) : (
            <FlatList
              data={tenants}
              keyExtractor={(item) => item._id}
              renderItem={renderTenantItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No tenants found.</Text>}
            />
          )}
        </View>
      )}

      {activeTab === 'Solar' && <SolarScreen />}
      {activeTab === 'DG' && <DGScreen />}

      {/* --- VIEW DETAIL MODAL --- */}
      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View style={styles.sheetOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Tenant Profile</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#CCC" />
              </TouchableOpacity>
            </View>

            {selectedTenant && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHero}>
                  <View style={styles.heroAvatar}>
                    <MaterialCommunityIcons name="store" size={40} color="white" />
                  </View>
                  <Text style={styles.heroName}>{selectedTenant.name}</Text>
                  <Text style={styles.heroId}>Meter: {selectedTenant.meterId}</Text>
                </View>

                <View style={styles.actionGrid}>
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#4CAF50'}]} onPress={() => handleEditInitiate(selectedTenant)}>
                    <MaterialCommunityIcons name="pencil" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#EF5350'}]} onPress={() => handleDelete(selectedTenant._id, selectedTenant.name)}>
                    <MaterialCommunityIcons name="trash-can" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                  <StatBox label="Opening" value={selectedTenant.openingMeter} icon="arrow-up-circle" color="#333399" />
                  <StatBox label="Multiplier" value={`${selectedTenant.multiplierCT}x`} icon="layers" color="#ff9800" />
                  <StatBox label="Rate" value={`₹${selectedTenant.ratePerUnit}`} icon="tag" color="#4caf50" />
                  <StatBox label="Loss" value={`${selectedTenant.transformerLoss}%`} icon="percent" color="#d32f2f" />
                </View>

                <View style={styles.detailList}>
                   <DetailRowItem label="Fixed Monthly Charge" value={`₹ ${selectedTenant.fixedCharge}`} icon="cash-lock" />
                   <View style={styles.currentReadingCard}>
                      <Text style={styles.currentReadingLabel}>CURRENT CLOSING VALUE</Text>
                      <Text style={styles.currentReadingValue}>{selectedTenant.currentClosing || "Pending Input..."}</Text>
                   </View>
                </View>
                <View style={{height: 50}} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* --- ADD / EDIT FORM MODAL --- */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formOverline}>CONFIGURATION</Text>
              <Text style={styles.formTitle}>{isEditing ? "Modify Tenant" : "New Tenant"}</Text>
            </View>
            <TouchableOpacity onPress={closeFormModal} style={styles.formClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333399" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <FormSection title="Core Information" icon="information-outline">
              <PremiumInput label="Shop Name / Tenant Name *" value={form.name} onChange={(t)=>setForm({...form, name:t})} icon="storefront-outline" />
              <PremiumInput label="Meter Serial Number *" value={form.meterId} onChange={(t)=>setForm({...form, meterId:t})} icon="barcode-scan" />
            </FormSection>

            <FormSection title="Technical Specifications" icon="flash-outline">
              <View style={styles.flexRow}>
                <View style={{flex: 1, marginRight: 12}}>
                  <PremiumInput label="Opening (kWh) *" value={form.openingMeter} onChange={(t)=>setForm({...form, openingMeter:t})} keyboardType="numeric" />
                </View>
                <View style={{flex: 1}}>
                  <PremiumInput label="Multiplier (CT)" value={form.multiplierCT} onChange={(t)=>setForm({...form, multiplierCT:t})} keyboardType="numeric" />
                </View>
              </View>
              <PremiumInput label="Rate Per Unit (₹) *" value={form.ratePerUnit} onChange={(t)=>setForm({...form, ratePerUnit:t})} keyboardType="numeric" icon="currency-inr" />
            </FormSection>

            <FormSection title="Financial Adjustments" icon="tune-vertical">
              <View style={styles.flexRow}>
                <View style={{flex: 1, marginRight: 12}}>
                  <PremiumInput label="Trans. Loss (%)" value={form.transformerLoss} onChange={(t)=>setForm({...form, transformerLoss:t})} keyboardType="numeric" />
                </View>
                <View style={{flex: 1}}>
                  <PremiumInput label="Fixed Charge (₹)" value={form.fixedCharge} onChange={(t)=>setForm({...form, fixedCharge:t})} keyboardType="numeric" />
                </View>
              </View>
            </FormSection>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveOrUpdate}>
               <MaterialCommunityIcons name="check-decagram" size={24} color="white" />
              <Text style={styles.submitBtnText}>{isEditing ? "UPDATE PROPERTY" : "CREATE PROPERTY"}</Text>
            </TouchableOpacity>
            <View style={{height: 100}} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// --- PREMIUM COMPONENTS ---
const StatBox = ({ label, value, icon, color }) => (
  <View style={styles.statBox}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={styles.statBoxValue}>{value}</Text>
    <Text style={styles.statBoxLabel}>{label}</Text>
  </View>
);

const DetailRowItem = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailRowLeft}>
      <MaterialCommunityIcons name={icon} size={20} color="#666" />
      <Text style={styles.detailRowLabel}>{label}</Text>
    </View>
    <Text style={styles.detailRowValue}>{value}</Text>
  </View>
);

const FormSection = ({ title, icon, children }) => (
  <View style={styles.formCard}>
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={18} color="#333399" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const PremiumInput = ({ label, value, onChange, icon, keyboardType = 'default', placeholder }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputBox}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color="#AAA" style={{marginRight: 10}} />}
      <TextInput 
        style={styles.textInput} 
        value={value} 
        onChangeText={onChange} 
        keyboardType={keyboardType} 
        placeholder={placeholder}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  headerContainer: { backgroundColor: '#333399', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 18 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 5 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabItemActive: { backgroundColor: 'white' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#333399' },
  modernCard: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4, shadowColor: '#333399', shadowOpacity: 0.1, shadowRadius: 10 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { backgroundColor: '#F0F2FF', padding: 12, borderRadius: 16 },
  cardTextContainer: { marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
  cardSubTitle: { fontSize: 11, color: '#888', marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
  readingPill: { backgroundColor: '#F8F9FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 10, alignItems: 'flex-end' },
  pillLabel: { fontSize: 8, fontWeight: 'bold', color: '#BBB', textTransform: 'uppercase' },
  pillValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#333399', width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 8, zIndex: 100 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: 'white', height: '85%', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25 },
  sheetHandle: { width: 50, height: 5, backgroundColor: '#EEE', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#333399' },
  profileHero: { alignItems: 'center', marginBottom: 30 },
  heroAvatar: { backgroundColor: '#333399', padding: 22, borderRadius: 28, marginBottom: 12 },
  heroName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  heroId: { fontSize: 13, color: '#999' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 15, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  actionBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { width: '48%', backgroundColor: '#F9FAFF', padding: 18, borderRadius: 24, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEF0FF' },
  statBoxValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 6 },
  statBoxLabel: { fontSize: 10, color: '#AAA', fontWeight: 'bold', textTransform: 'uppercase' },
  detailList: { paddingHorizontal: 5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  detailRowLabel: { marginLeft: 12, color: '#666', fontSize: 14 },
  detailRowValue: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  currentReadingCard: { backgroundColor: '#F0F2FF', padding: 22, borderRadius: 22, marginTop: 15 },
  currentReadingLabel: { fontSize: 9, fontWeight: 'bold', color: '#333399', letterSpacing: 1.5 },
  currentReadingValue: { fontSize: 24, fontWeight: 'bold', color: '#333399', marginTop: 5 },
  formContainer: { flex: 1, backgroundColor: '#F8F9FD' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25, backgroundColor: 'white', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 3 },
  formOverline: { fontSize: 10, fontWeight: 'bold', color: '#BBB', letterSpacing: 2 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#333399', marginTop: 2 },
  formClose: { backgroundColor: '#F0F2FF', padding: 10, borderRadius: 14 },
  formScroll: { padding: 20 },
  formCard: { backgroundColor: 'white', borderRadius: 28, padding: 22, marginBottom: 20, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, borderBottomWidth: 1, borderBottomColor: '#F9F9F9', paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333399', marginLeft: 10 },
  inputWrapper: { marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 8, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFF', borderRadius: 16, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#EDF1FF' },
  textInput: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  flexRow: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 5, shadowColor: '#333399', shadowOpacity: 0.3, shadowRadius: 10 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 12, letterSpacing: 1 },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#AAA', fontSize: 16 },
});

export default TenantsScreen;

// kaam kr diya