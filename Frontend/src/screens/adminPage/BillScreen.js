import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'; // 🟢 Standard import
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
        type: 'application/pdf', // 🟢 Only PDF
        copyToCacheDirectory: true 
      });

      if (!result.canceled) {
        const pickedFile = result.assets[0];
        setFile(pickedFile);
        Toast.show({ type: 'success', text1: 'PDF Selected', text2: pickedFile.name });
      }
    } catch (err) { console.log("Picker Error"); }
  };

  const handleSaveBill = async () => {
    if (!form.units || !form.energy || !file) {
      Toast.show({ type: 'error', text1: 'Missing Data', text2: 'Please fill units and upload PDF' });
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

      // 🟢 FormData structure to ensure file is treated as a document
      formData.append('billFile', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`,
        type: 'application/pdf',
      });

      await axios.post(`${API_URL}/bill/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Toast.show({ type: 'success', text1: 'Bill Saved ✅' });
      setForm({ units: '', energy: '', fixed: '', taxes: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      console.log("Upload Error:", e.response?.data || e.message);
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: 'PDF could not be saved' });
    } finally { setSaving(false); }
  };

  // 📥 🟢 पक्का वर्किंग डाउनलोड लॉजिक (0 Bytes Fix)
  const handleDownload = async (url, month) => {
    if (!url) return;
    try {
      Toast.show({ type: 'info', text1: 'Downloading PDF...' });

      // 1. फोन के Cache डायरेक्टरी में फाइल का रास्ता बनाएँ
      const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // 2. फाइल डाउनलोड करें
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

      const fileInfo = await FileSystem.getInfoAsync(downloadRes.uri);

      if (fileInfo.exists && fileInfo.size > 0) {
        
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Official Bill - ${month}`,
          UTI: 'com.adobe.pdf', // iOS के लिए ज़रूरी
        });
      } else {
        Alert.alert("Error", "The file appears to be empty. Please check your internet.");
      }
    } catch (e) {
      console.log("Download Error:", e);
      Alert.alert("Download Failed", "Could not retrieve the PDF from server.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.blueHeader}>
        <View>
          <Text style={styles.headerTitle}>Main Bill</Text>
          <Text style={styles.headerSub}>{monthName}</Text>
        </View>
        <MaterialCommunityIcons name="" size={40} color="rgba(255,255,255,0.4)" />
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333399" />}
        ListHeaderComponent={
          <View style={styles.formSection}>
            <View style={styles.mainCard}>
              <TouchableOpacity style={[styles.uploadBox, file && styles.uploadBoxActive]} onPress={pickDocument}>
                <MaterialCommunityIcons name={file ? "file-check" : "file-pdf-box"} size={35} color={file ? "#4caf50" : "#333399"} />
                <Text style={[styles.uploadText, file && {color:'#4caf50'}]}>{file ? file.name : "Select Official Bill (PDF Only)"}</Text>
              </TouchableOpacity>
              <Text style={styles.fieldLabel}>Units Consumed *</Text>
              <TextInput style={styles.input} placeholder="e.g. 1500" keyboardType="numeric" value={form.units} onChangeText={(t)=>setForm({...form, units:t})} />
              <Text style={styles.fieldLabel}>Energy Charges (₹) *</Text>
              <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={form.energy} onChangeText={(t)=>setForm({...form, energy:t})} />
              <View style={styles.row}>
                <View style={{flex:1, marginRight:10}}><Text style={styles.fieldLabel}>Fixed ₹</Text><TextInput style={styles.input} keyboardType="numeric" value={form.fixed} onChangeText={(t)=>setForm({...form, fixed:t})} /></View>
                <View style={{flex:1}}><Text style={styles.fieldLabel}>Taxes ₹</Text><TextInput style={styles.input} keyboardType="numeric" value={form.taxes} onChangeText={(t)=>setForm({...form, taxes:t})} /></View>
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBill} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>SAVE PDF RECORD</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.historyTitle}>Billing History</Text>
          </View>
        }
        data={history}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyAccent} />
            <View style={styles.historyContent}>
              <View style={{flex: 1}}>
                <Text style={styles.historyMonth}>{item.month}</Text>
                <Text style={styles.historySub}>₹{item.totalAmount} | {item.totalUnits} Units</Text>
              </View>
              {/* <TouchableOpacity style={styles.downloadCircle} onPress={() => handleDownload(item.billUrl, item.month)}>
                <MaterialCommunityIcons name="download" size={24} color="#FFF" />
              </TouchableOpacity> */}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<View style={{alignItems:'center'}}><Text style={styles.empty}>No records found.</Text></View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FE' },
  blueHeader: { backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '900', marginTop: 4},
  formSection: { padding: 20 },
  mainCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginTop: -30, elevation: 5 },
  uploadBox: { backgroundColor: '#F0F2FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#333399', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20 },
  uploadBoxActive: { borderColor: '#4caf50', backgroundColor: '#E8F5E9' },
  uploadText: { color: '#333399', marginTop: 10, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '900', color: '#666', marginBottom: 6, marginLeft: 5 },
  input: { backgroundColor: '#F9FAFF', padding: 15, borderRadius: 15, marginBottom: 15, fontSize: 16, color: '#333', fontWeight: '900', borderWidth: 1, borderColor: '#EDF1FF' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#333399', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 5, elevation: 4 },
  submitText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  historyTitle: { fontSize: 19, fontWeight: '900', color: '#1A1C3D', marginTop: 30, marginBottom: 15, marginLeft: 5 },
  historyCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 15, borderRadius: 20, flexDirection: 'row', elevation: 3, overflow: 'hidden' },
  historyAccent: { width: 6, backgroundColor: '#333399' },
  historyContent: { flex: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyMonth: { fontSize: 17, fontWeight: '900', color: '#333' },
  historySub: { color: '#666', fontSize: 12, fontWeight: '900', marginTop: 5 },
  downloadCircle: { backgroundColor: '#4caf50', padding: 10, borderRadius: 25, elevation: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20, fontWeight: '900' }
});

export default BillScreen;