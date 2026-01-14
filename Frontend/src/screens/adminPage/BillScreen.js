import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform, 
  StatusBar, SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const BillScreen = () => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [form, setForm] = useState({ units: '', energy: '', fixed: '', taxes: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      setHistory(res.data || []);
    } catch (e) {
      console.log("Fetch Error");
    }
  }, [adminId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setForm({ units: '', energy: '', fixed: '', taxes: '' });
    setFile(null);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ 
        type: 'application/pdf', 
        copyToCacheDirectory: true 
      });

      if (!result.canceled) {
        const pickedFile = result.assets[0];
        setFile(pickedFile);
        Toast.show({ type: 'success', text1: 'PDF Selected ✅', text2: pickedFile.name });
      }
    } catch (err) { console.log("Picker Error"); }
  };

  const handleSaveBill = async () => {
    if (!form.units || !form.energy || !file) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'PDF and basic info required' });
      return;
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('adminId', adminId);
      formData.append('month', monthName);
      formData.append('totalUnits', form.units);
      formData.append('energyCharges', form.energy);
      formData.append('fixedCharges', form.fixed || '0');
      formData.append('taxes', form.taxes || '0');

      formData.append('billFile', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`,
        type: 'application/pdf',
      });

      await axios.post(`${API_URL}/bill/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Toast.show({ type: 'success', text1: 'Record Saved ✨' });
      setForm({ units: '', energy: '', fixed: '', taxes: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Check file size or server' });
    } finally { setSaving(false); }
  };

  // 🗑️ DELETE FUNCTION
  const handleDelete = (id) => {
  Alert.alert(
    "Delete Record",
    "Are you sure?",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            const response = await axios.delete(`${API_URL}/bill/delete/${id}`);
            
            if (response.data.success) {
               Toast.show({ type: 'success', text1: 'Bill Deleted 🗑️' });
               fetchHistory(); // List refresh karein
            }
          } catch (err) {
            console.log("Frontend Delete Error:", err.response?.data || err.message);
            Alert.alert("Error", "Delete request failed. Check console.");
          }
        } 
      }
    ]
  );
};

  const handleDownload = async (url, month) => {
    if (!url) return;
    try {
      Toast.show({ type: 'info', text1: 'Downloading...' });
      const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      await Sharing.shareAsync(downloadRes.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Official Bill - ${month}`,
      });
    } catch (e) {
      Alert.alert("Error", "Could not download PDF.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Grid Billing</Text>
          <Text style={styles.headerSub}>Manage your source records</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
           <MaterialCommunityIcons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.cardLabel}>NEW ENTRY - {monthName}</Text>
            
            <TouchableOpacity 
              style={[styles.uploadBox, file && styles.uploadBoxActive]} 
              onPress={pickDocument}
            >
              <MaterialCommunityIcons 
                name={file ? "file-check" : "cloud-upload-outline"} 
                size={40} 
                color={file ? "#00C853" : "#333399"} 
              />
              <Text style={[styles.uploadText, file && {color: '#00C853'}]}>
                {file ? file.name : "Upload Official PDF"}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
                <View style={styles.fullInput}>
                   <Text style={styles.inputLabel}>Total Units Consumed</Text>
                   <TextInput 
                     style={styles.input} 
                     placeholder="e.g. 1500" 
                     keyboardType="numeric" 
                     value={form.units} 
                     onChangeText={(t)=>setForm({...form, units:t})} 
                   />
                </View>
                
                <View style={styles.fullInput}>
                   <Text style={styles.inputLabel}>Energy Charges (₹)</Text>
                   <TextInput 
                     style={styles.input} 
                     placeholder="0.00" 
                     keyboardType="numeric" 
                     value={form.energy} 
                     onChangeText={(t)=>setForm({...form, energy:t})} 
                   />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                     <Text style={styles.inputLabel}>Fixed (₹)</Text>
                     <TextInput style={styles.input} keyboardType="numeric" value={form.fixed} onChangeText={(t)=>setForm({...form, fixed:t})} />
                  </View>
                  <View style={styles.halfInput}>
                     <Text style={styles.inputLabel}>Taxes (₹)</Text>
                     <TextInput style={styles.input} keyboardType="numeric" value={form.taxes} onChangeText={(t)=>setForm({...form, taxes:t})} />
                  </View>
                </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBill} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>SAVE RECORD</Text>
                  <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
        data={history}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.infoCol}>
               <Text style={styles.historyMonth}>{item.month}</Text>
               <View style={styles.statsRow}>
                  <View style={styles.tag}><Text style={styles.tagText}>{item.totalUnits} Units</Text></View>
                  <Text style={styles.historyAmt}>₹{item.totalAmount}</Text>
               </View>
            </View>
            
            <View style={styles.actionCol}>
               {/* <TouchableOpacity style={styles.actionBtnDownload} onPress={() => handleDownload(item.billUrl, item.month)}>
                  <MaterialCommunityIcons name="download-outline" size={20} color="#00C853" />
               </TouchableOpacity> */}
               <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDelete(item._id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF5252" />
               </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 50 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No billing records yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F3F8', },
  header: { backgroundColor: '#333399', paddingHorizontal: 20, paddingVertical: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  headerIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 },
  
  formCard: { backgroundColor: 'white', margin: 20, borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#BBB', marginBottom: 15, letterSpacing: 1 },
  uploadBox: { backgroundColor: '#F8F9FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#333399', borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 20 },
  uploadBoxActive: { borderColor: '#00C853', backgroundColor: '#F1FFF1' },
  uploadText: { color: '#333399', marginTop: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  
  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#777', marginBottom: 5, marginLeft: 2 },
  input: { backgroundColor: '#F5F7FB', padding: 12, borderRadius: 12, marginBottom: 15, fontSize: 15, color: '#333', fontWeight: 'bold', borderWidth: 1, borderColor: '#E0E5F0' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  fullInput: { width: '100%' },
  halfInput: { width: '48%' },
  
  submitBtn: { backgroundColor: '#333399', paddingVertical: 18, borderRadius: 15, marginTop: 10, elevation: 2 },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 15, marginRight: 8 },

  historyCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  infoCol: { flex: 1 },
  historyMonth: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tag: { backgroundColor: '#F0F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10 },
  tagText: { color: '#333399', fontSize: 11, fontWeight: 'bold' },
  historyAmt: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  
  actionCol: { flexDirection: 'row', gap: 10 },
  actionBtnDownload: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 12 },
  actionBtnDelete: { backgroundColor: '#FFEBEE', padding: 10, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#AAA', fontWeight: 'bold' }
});

export default BillScreen;