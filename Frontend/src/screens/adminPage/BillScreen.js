import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, FlatList, Alert, Linking 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Directory } from 'expo-file-system/legacy';
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
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      setHistory(res.data || []);
    } catch (e) {
      console.log("Fetch Error");
    } finally {
      setLoadingHistory(false);
    }
  }, [adminId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const handleSaveBill = async () => {
    if (!form.units || !form.energy) {
      Toast.show({ type: 'error', text1: 'Required Fields' });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('adminId', adminId);
      formData.append('month', new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      formData.append('totalUnits', form.units);
      formData.append('energyCharges', form.energy);
      formData.append('fixedCharges', form.fixed || '0');
      formData.append('taxes', form.taxes || '0');
      if (file) {
        formData.append('billFile', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' });
      }

      await axios.post(`${API_URL}/bill/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Toast.show({ type: 'success', text1: 'Saved Successfully ✅' });
      setForm({ units: '', energy: '', fixed: '', taxes: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save Failed' });
    } finally {
      setSaving(false);
    }
  };

const handleDownload = async (url, month) => {
  if (!url) {
    Toast.show({ type: 'error', text1: 'URL not found' });
    return;
  }
  try {
    const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
    const fileUri = FileSystem.documentDirectory + fileName;
    Toast.show({ type: 'info', text1: 'Downloading bill...' });
    const result = await FileSystem.downloadAsync(url, fileUri);
    console.log("Download Result URI:", result.uri); 
    if (result.uri) {
      await Sharing.shareAsync(result.uri);
    } else {
      Alert.alert("Error", "Download failed: URI is undefined");
    }
  } catch (e) {
    console.error("Download Error:", e);
    Alert.alert("Error", "Could not download file.");
  }
};

  const handlePreview = async (url) => {
    if (!url) return;
    await Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Main Bill</Text>
            <View style={styles.formCard}>
              <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
                <MaterialCommunityIcons name={file ? "file-check" : "file-upload"} size={40} color={file ? "#4caf50" : "#333399"} />
                <Text style={styles.uploadText}>{file ? file.name : "Tap to Upload PDF/Image"}</Text>
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="Total Units (kWh)" keyboardType="numeric" value={form.units} onChangeText={(t)=>setForm({...form, units:t})} />
              <TextInput style={styles.input} placeholder="Energy Charges (₹)" keyboardType="numeric" value={form.energy} onChangeText={(t)=>setForm({...form, energy:t})} />
              <TextInput style={styles.input} placeholder="Fixed Charges (₹)" keyboardType="numeric" value={form.fixed} onChangeText={(t)=>setForm({...form, fixed:t})} />
              <TextInput style={styles.input} placeholder="Taxes (₹)" keyboardType="numeric" value={form.taxes} onChangeText={(t)=>setForm({...form, taxes:t})} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBill} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>SUBMIT OFFICIAL BILL</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>History & Downloads</Text>
          </View>
        }
        data={history}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyMonth}>{item.month}</Text>
              <Text style={styles.historySub}>₹{item.totalAmount} | {item.totalUnits} Units</Text>
            </View>
           
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<View style={{alignItems:'center'}}><Text style={styles.empty}>No records available.</Text></View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333399', marginTop: 40, marginBottom: 20 },
  formCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 4 },
  uploadBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#eee', padding: 20, alignItems: 'center', marginBottom: 20, borderRadius: 15 },
  uploadText: { color: '#666', marginTop: 10, fontSize: 12, textAlign: 'center' },
  input: { backgroundColor: '#f8f9fd', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee', color: '#000' },
  saveBtn: { backgroundColor: '#333399', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 15, color: '#333' },
  historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyMonth: { fontWeight: 'bold', color: '#333', fontSize: 16 },
  historySub: { color: '#666', fontSize: 12, marginTop: 4 },
  historyActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { marginLeft: 15, padding: 5 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 }
});

export default BillScreen;