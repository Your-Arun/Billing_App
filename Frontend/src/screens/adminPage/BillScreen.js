import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform,
  StatusBar, KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const BillScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [form, setForm] = useState({ units: '', energy: '', fixed: '', total: '', taxes: '0' });
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // 🔄 1. Load Cache
  const loadCache = useCallback(async () => {
    if (!adminId) return;
    try {
      const cachedData = await AsyncStorage.getItem(`bill_cache_${adminId}`);
      if (cachedData) {
        setHistory(JSON.parse(cachedData));
        setLoading(false);
      }
    } catch (e) { console.log("Cache Error", e); }
  }, [adminId]);

  // 🌐 2. Fetch History
  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      const data = res.data || [];
      setHistory(data);
      await AsyncStorage.setItem(`bill_cache_${adminId}`, JSON.stringify(data));
    } catch (e) { console.log("Fetch Error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [adminId]);

  useEffect(() => { loadCache(); fetchHistory(); }, [loadCache, fetchHistory]);

  // 🪄 3. Auto Extract
  const handleAutoExtract = async (selectedFile) => {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('billFile', {
        uri: Platform.OS === 'android' ? selectedFile.uri : selectedFile.uri.replace('file://', ''),
        name: selectedFile.name,
        type: 'application/pdf',
      });
      const res = await axios.post(`${API_URL}/bill/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data) {
        setForm({
          units: String(res.data.units || ''),
          energy: String(res.data.energy || ''),
          fixed: String(res.data.fixed || ''),
          total: String(res.data.total || ''),
          taxes: String(res.data.taxes || '0')
        });
        Toast.show({ type: 'success', text1: 'Magic! Data Filled ✨' });
      }
    } catch (error) { Toast.show({ type: 'error', text1: 'Scan Failed' }); }
    finally { setExtracting(false); }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        setFile(result.assets[0]);
        handleAutoExtract(result.assets[0]);
      }
    } catch (err) { console.log("Picker Error"); }
  };

  // 💾 4. Save Logic
  const handleSaveBill = async () => {
    if (!form.units || !form.total || !file) {
      return Toast.show({ type: 'error', text1: 'Missing Fields' });
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('adminId', adminId);
      formData.append('month', monthName);
      formData.append('totalUnits', form.units);
      formData.append('energyCharges', form.energy);
      formData.append('fixedCharges', form.fixed);
      formData.append('taxes', form.taxes);
      formData.append('totalAmount', form.total);
      formData.append('billFile', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name,
        type: 'application/pdf',
      });

      await axios.post(`${API_URL}/bill/add`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Toast.show({ type: 'success', text1: 'Saved ✅' });
      setForm({ units: '', energy: '', fixed: '', total: '', taxes: '0' });
      setFile(null);
      fetchHistory();
    } catch (e) { Toast.show({ type: 'error', text1: 'Save Failed' }); }
    finally { setSaving(false); }
  };

  // 📥 5. Download Logic
  const handleDownload = async (url, month, id) => {
    if (!url) return;
    setDownloadingId(id);
    try {
      const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      await Sharing.shareAsync(downloadRes.uri);
    } finally { setDownloadingId(null); }
  };

  // 🗑️ 6. DELETE Logic
  const handleDelete = (id) => {
    Alert.alert("Delete Record", "Permanently remove this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/bill/delete/${id}`);
            fetchHistory();
            Toast.show({ type: 'info', text1: 'Removed 🗑️' });
          } catch (e) { Alert.alert("Error", "Delete failed"); }
        }
      }
    ]);
  };

  if (loading && history.length === 0) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#333399" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Main Grid Bill</Text>
          <TouchableOpacity onPress={() => { setRefreshing(true); fetchHistory(); }}><MaterialCommunityIcons name="refresh" size={24} color="#FFF" /></TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Verify & sync monthly source records</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor="#333399" />}
          ListHeaderComponent={
            <View style={styles.mainContent}>
              <View style={styles.formCard}>
                <TouchableOpacity style={[styles.uploadBox, file && styles.uploadBoxActive]} onPress={pickDocument} disabled={extracting}>
                  {extracting ? <ActivityIndicator size="large" color="#333399" /> :
                    <><MaterialCommunityIcons name={file ? "file-check" : "file-pdf-box"} size={35} color={file ? "#16A34A" : "#333399"} />
                      <Text style={[styles.uploadText, file && { color: '#16A34A' }]}>{file ? file.name : "Select Official Bill PDF"}</Text></>}
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                  <View style={styles.row}>
                    <View style={styles.inputBlock}><Text style={styles.label}>Units</Text><TextInput style={styles.input} keyboardType="numeric" value={form.units} onChangeText={(t) => setForm({ ...form, units: t })} placeholder="0.00" /></View>
                    <View style={styles.inputBlock}><Text style={styles.label}>Energy (₹)</Text><TextInput style={styles.input} keyboardType="numeric" value={form.energy} onChangeText={(t) => setForm({ ...form, energy: t })} placeholder="₹" /></View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.inputBlock}><Text style={styles.label}>Fixed (₹)</Text><TextInput style={styles.input} keyboardType="numeric" value={form.fixed} onChangeText={(t) => setForm({ ...form, fixed: t })} placeholder="₹" /></View>
                    <View style={styles.inputBlock}><Text style={styles.label}>Total (₹)</Text><TextInput style={[styles.input, styles.boldInput]} keyboardType="numeric" value={form.total} onChangeText={(t) => setForm({ ...form, total: t })} placeholder="₹" /></View>
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBill} disabled={saving || extracting}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>VERIFY & SAVE RECORD</Text>}
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionHeading}>History</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.monthBadge}>
                <Text style={styles.mText}>{item.month.split(' ')[0].substring(0, 3)}</Text>
                <Text style={styles.yText}>{item.month.split(' ')[1]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.hAmt}>₹{item.totalAmount}</Text>
                <Text style={styles.hUnits}>{item.totalUnits} Units</Text>
              </View>
              <View style={styles.actionRow}>
                {/* <TouchableOpacity onPress={() => handleDownload(item.billUrl, item.month, item._id)} style={styles.iconBtn}>
                  {downloadingId === item._id ? <ActivityIndicator size="small" color="#16A34A" /> : <MaterialCommunityIcons name="download-outline" size={24} color="#16A34A" />}
                </TouchableOpacity> */}
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#333399', padding: 20, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 5, alignItems: 'center', alignContent: 'center', textAlign: 'center' },
  mainContent: { padding: 20 },
  formCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginTop: -30, elevation: 5 },
  uploadBox: { backgroundColor: '#F0F2FF', borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#333399', borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 15 },
  uploadBoxActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  uploadText: { color: '#333399', fontWeight: 'bold', fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputBlock: { flex: 1 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', marginBottom: 4 },
  input: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 10, fontWeight: 'bold', color: '#333' },
  boldInput: { color: '#333399', borderBottomWidth: 1, borderBottomColor: '#333399' },
  submitBtn: { backgroundColor: '#333399', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: 'white', fontWeight: 'bold' },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginTop: 25, color: '#1E293B' },
  historyCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 10, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  monthBadge: { backgroundColor: '#333399', padding: 8, borderRadius: 12, width: 50, alignItems: 'center' },
  mText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  yText: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 'bold' },
  hAmt: { fontSize: 15, fontWeight: 'bold' },
  hUnits: { fontSize: 11, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 5 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default BillScreen;