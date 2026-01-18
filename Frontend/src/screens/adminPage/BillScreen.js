import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform, 
  StatusBar, SafeAreaView, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
  const [extracting, setExtracting] = useState(false);

  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // 1. हिस्ट्री लोड करना
  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      setHistory(res.data || []);
    } catch (e) {
      console.log("Fetch Error History");
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

  // 2. PDF सिलेक्ट करना
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

  // 🪄 3. AUTO EXTRACT (PDF से डेटा निकालना)
  const handleAutoExtract = async () => {
    if (!file) {
      return Toast.show({ type: 'error', text1: 'Wait!', text2: 'Please select a PDF first' });
    }

    setExtracting(true);
    try {
      const formData = new FormData();
      const fileUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;

      formData.append('billFile', {
        uri: fileUri,
        name: file.name,
        type: 'application/pdf',
      });

      // बैकएंड एंडपॉइंट पर भेजना
      const res = await axios.post(`${API_URL}/bill/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data) {
        // बैकएंड से आए डेटा को फॉर्म में भरना
        setForm({
          units: String(res.data.units || ''),
          energy: String(res.data.energy || ''),
          fixed: String(res.data.fixed || ''),
          taxes: String(res.data.taxes || '')
        });
        Toast.show({ 
          type: 'success', 
          text1: 'Magic Done! ✨', 
          text2: 'Values filled from PDF points' 
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Scanned PDF or different format";
      Toast.show({ type: 'error', text1: 'Extraction Failed', text2: errorMsg });
    } finally {
      setExtracting(false);
    }
  };

  // 4. डेटा सेव करना
  const handleSaveBill = async () => {
    if (!form.units || !form.energy || !file) {
      return Toast.show({ type: 'error', text1: 'Incomplete', text2: 'Check Units and Energy charges' });
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
        name: file.name,
        type: 'application/pdf',
      });

      await axios.post(`${API_URL}/bill/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Toast.show({ type: 'success', text1: 'Verified & Saved ✅' });
      setForm({ units: '', energy: '', fixed: '', taxes: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Server save failed' });
    } finally { setSaving(false); }
  };

  // 5. डिलीट करना
  const handleDelete = (id) => {
    Alert.alert("Delete Record", "क्या आप इस बिल रिकॉर्ड को मिटाना चाहते हैं?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const response = await axios.delete(`${API_URL}/bill/delete/${id}`);
            if (response.data.success) {
               Toast.show({ type: 'success', text1: 'Removed 🗑️' });
               fetchHistory();
            }
          } catch (err) { Toast.show({ type: 'error', text1: 'Delete failed' }); }
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Main Grid Bill</Text>
          <Text style={styles.headerSub}>Extract and Save Source Records</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
           <MaterialCommunityIcons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.cardLabel}>NEW BILL ENTRY - {monthName.toUpperCase()}</Text>
            
            {/* 📁 File Picker */}
            <TouchableOpacity 
              style={[styles.uploadBox, file && styles.uploadBoxActive]} 
              onPress={pickDocument}
            >
              <MaterialCommunityIcons 
                name={file ? "file-check" : "file-pdf-box"} 
                size={40} 
                color={file ? "#00C853" : "#333399"} 
              />
              <Text style={[styles.uploadText, file && {color: '#00C853'}]}>
                {file ? file.name : "Select AVVNL Bill PDF"}
              </Text>
            </TouchableOpacity>

            {/* 🪄 Magic Extraction Button */}
            <TouchableOpacity 
              style={[styles.extractBtn, !file && styles.disabledBtn]} 
              onPress={handleAutoExtract}
              disabled={!file || extracting}
            >
              {extracting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="auto-fix" size={20} color="white" />
                  <Text style={styles.extractText}>AUTO-FILL FROM PDF (1-18 POINTS)</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 📝 Inputs */}
            <View style={styles.inputGroup}>
                <View style={styles.fullInput}>
                   <Text style={styles.inputLabel}>Net Billed Units</Text>
                   <TextInput 
                     style={styles.input} 
                     placeholder="0.00" 
                     keyboardType="numeric" 
                     value={form.units} 
                     onChangeText={(t)=>setForm({...form, units:t})} 
                   />
                </View>
                
                <View style={styles.fullInput}>
                   <Text style={styles.inputLabel}>Energy Charges (Point 1)</Text>
                   <TextInput 
                     style={styles.input} 
                     placeholder="₹ 0.00" 
                     keyboardType="numeric" 
                     value={form.energy} 
                     onChangeText={(t)=>setForm({...form, energy:t})} 
                   />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                     <Text style={styles.inputLabel}>Fixed (Point 2)</Text>
                     <TextInput style={styles.input} keyboardType="numeric" value={form.fixed} onChangeText={(t)=>setForm({...form, fixed:t})} placeholder="₹ 0.00" />
                  </View>
                  <View style={styles.halfInput}>
                     <Text style={styles.inputLabel}>Total Taxes</Text>
                     <TextInput style={styles.input} keyboardType="numeric" value={form.taxes} onChangeText={(t)=>setForm({...form, taxes:t})} placeholder="₹ 0.00" />
                  </View>
                </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBill} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>VERIFY & SAVE RECORD</Text>
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
            <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDelete(item._id)}>
               <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 50 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No billing records yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { backgroundColor: '#333399', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  headerIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 },
  
  formCard: { backgroundColor: 'white', margin: 18, borderRadius: 28, padding: 20, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardLabel: { fontSize: 10, fontWeight: 'bold', color: '#BBB', marginBottom: 15, letterSpacing: 1.5, textAlign: 'center' },
  
  uploadBox: { backgroundColor: '#F8F9FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#333399', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 15 },
  uploadBoxActive: { borderColor: '#00C853', backgroundColor: '#F1FFF1' },
  uploadText: { color: '#333399', marginTop: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  
  extractBtn: { backgroundColor: '#FF9800', padding: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25, elevation: 4 },
  disabledBtn: { backgroundColor: '#E0E0E0', elevation: 0 },
  extractText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 12 },

  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#777', marginBottom: 6, marginLeft: 5 },
  input: { backgroundColor: '#F8FAFD', padding: 14, borderRadius: 15, marginBottom: 18, fontSize: 15, color: '#333', fontWeight: 'bold', borderWidth: 1, borderColor: '#EBF1F9' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  fullInput: { width: '100%' },
  halfInput: { width: '48%' },
  
  submitBtn: { backgroundColor: '#333399', paddingVertical: 18, borderRadius: 16, elevation: 4 },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 15, marginRight: 10 },

  historyCard: { backgroundColor: 'white', marginHorizontal: 18, marginBottom: 12, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  infoCol: { flex: 1 },
  historyMonth: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  tag: { backgroundColor: '#F0F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  tagText: { color: '#333399', fontSize: 11, fontWeight: 'bold' },
  historyAmt: { fontSize: 15, fontWeight: 'bold', color: '#444' },
  
  actionBtnDelete: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#AAA', fontWeight: 'bold', fontSize: 16 }
});

export default BillScreen;