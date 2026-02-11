import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform,
  StatusBar, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import { SafeAreaView } from 'react-native-safe-area-context';

const BillScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [form, setForm] = useState({ units: '', energy: '', fixed: '', total: '' });
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false); // 🪄 PDF extraction loading
  const [saving, setSaving] = useState(false); // 💾 Final save loading
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch History Logic
  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      setHistory(res.data || []);
    } catch (e) {
      console.log("Fetch Error", e.message);
    } finally {
      setRefreshing(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // 🪄 2. AUTO-FILL LOGIC (Triggered after picking file)
  const autoFillData = async (selectedFile) => {
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
        // ✅ Inputs automatically updated from Backend response
        setForm({
          units: String(res.data.units || ''),
          energy: String(res.data.energy || ''),
          fixed: String(res.data.fixed || ''),
          total: String(res.data.total || ''),
        });
        Toast.show({ type: 'success', text1: 'Magic! Bill Auto-filled ✨' });
      }
    } catch (e) {
      console.log("Extraction Error:", e.message);
      Toast.show({ type: 'error', text1: 'Scan Failed', text2: 'Please enter values manually' });
    } finally {
      setExtracting(false);
    }
  };

  // 📁 3. Pick Document
  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        const picked = result.assets[0];
        setFile(picked);
        autoFillData(picked); // 🟢 Picking ke turant baad extraction start
      }
    } catch (err) {
      console.log("Picker Error");
    }
  };

  // 💾 4. Save Record to Database
  const handleSaveFinal = async () => {
    if (!form.units || !form.total || !file) {
      return Toast.show({ type: 'error', text1: 'Missing Data', text2: 'Units and Total are required' });
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('adminId', adminId);
      formData.append('month', new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      formData.append('totalUnits', form.units);
      formData.append('energyCharges', form.energy);
      formData.append('fixedCharges', form.fixed);
      formData.append('totalAmount', form.total);
      formData.append('billFile', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name,
        type: 'application/pdf',
      });

      await axios.post(`${API_URL}/bill/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Toast.show({ type: 'success', text1: 'Record Saved ✅' });
      setForm({ units: '', energy: '', fixed: '', total: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      console.log("Save Error:", e.message);
      Toast.show({ type: 'error', text1: 'Save Failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Main Grid Bill</Text>
        <Text style={styles.headerSub}>Upload PDF to auto-fill monthly values</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333399" />}
        ListHeaderComponent={
          <View style={styles.formCard}>
            {/* UPLOAD BOX WITH LOADING */}
            <TouchableOpacity 
              style={[styles.uploadBox, file && styles.uploadBoxActive]} 
              onPress={pickDocument}
              disabled={extracting}
            >
              {extracting ? (
                <View style={{alignItems: 'center'}}>
                  <ActivityIndicator color="#333399" size="large" />
                  <Text style={styles.uploadText}>Reading PDF Data...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name={file ? "file-check" : "file-pdf-box"} size={40} color={file ? "#16A34A" : "#333399"} />
                  <Text style={[styles.uploadText, file && {color: '#16A34A'}]}>
                    {file ? file.name : "Select Official Bill PDF"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* FORM INPUTS */}
            <View style={styles.row}>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Net Units</Text>
                  <TextInput style={styles.input} value={form.units} onChangeText={(t)=>setForm({...form, units:t})} keyboardType="numeric" placeholder="0.00" />
                </View>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Energy Amt (₹)</Text>
                  <TextInput style={styles.input} value={form.energy} onChangeText={(t)=>setForm({...form, energy:t})} keyboardType="numeric" placeholder="0.00" />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Fixed (₹)</Text>
                  <TextInput style={styles.input} value={form.fixed} onChangeText={(t)=>setForm({...form, fixed:t})} keyboardType="numeric" placeholder="0.00" />
                </View>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Grand Total (₹)</Text>
                  <TextInput style={[styles.input, {color: '#333399'}]} value={form.total} onChangeText={(t)=>setForm({...form, total:t})} keyboardType="numeric" placeholder="0.00" />
                </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFinal} disabled={saving || extracting}>
               {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>CONFIRM & SAVE RECORD</Text>}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={{flex: 1}}>
                <Text style={styles.hMonth}>{item.month}</Text>
                <Text style={styles.hDetails}>₹{item.totalAmount.toLocaleString()} | {item.totalUnits} Units</Text>
            </View>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
        contentContainerStyle={{paddingBottom: 50}}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#333399', padding: 25, paddingTop: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 5 },
  formCard: { backgroundColor: '#FFF', margin: 15, padding: 20, borderRadius: 25, elevation: 5 },
  uploadBox: { backgroundColor: '#F0F2FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#333399', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 20 },
  uploadBoxActive: { borderColor: '#16A34A', backgroundColor: '#F9FFF9' },
  uploadText: { color: '#333399', marginTop: 10, fontWeight: 'bold', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  inputBox: { width: '48%' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 5 },
  input: { backgroundColor: '#F9FAFF', borderBottomWidth: 2, borderBottomColor: '#EEE', padding: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  saveBtn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  historyCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 15, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  hMonth: { fontWeight: 'bold', fontSize: 15, color: '#1A1C3D' },
  hDetails: { color: '#666', fontSize: 12, marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontWeight: 'bold' }
});

export default BillScreen;