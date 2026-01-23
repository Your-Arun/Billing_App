import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform,
  StatusBar, Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const BillScreen = () => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  // 4 Manual Fields
  const [form, setForm] = useState({ units: '', energy: '', fixed: '', total: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const fetchHistory = useCallback(async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API_URL}/bill/history/${adminId}`);
      setHistory(res.data || []);
    } catch (e) { console.log("Fetch Error"); }
  }, [adminId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        setFile(result.assets[0]);
        Toast.show({ type: 'success', text1: 'PDF Attached ✅' });
      }
    } catch (err) { console.log("Picker Error"); }
  };

  const handleSaveBill = async () => {
    if (!form.units || !form.energy || !form.fixed || !form.total || !file) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Fill all 4 fields & attach PDF' });
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('adminId', adminId);
      formData.append('month', monthName);
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

      Toast.show({ type: 'success', text1: 'Bill Saved ✅' });
      setForm({ units: '', energy: '', fixed: '', total: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save Failed' });
    } finally { setSaving(false); }
  };

  const handleDownload = async (url, month, id) => {
    if (!url) return Toast.show({ type: 'error', text1: 'No File found' });

    setDownloadingId(id);
    try {
      const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download Bill - ${month}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Remove this record permanently?", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await axios.delete(`${API_URL}/bill/delete/${id}`);
          fetchHistory();
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>Main Grid Bill</Text><Text style={styles.headerSub}>Manual Verification</Text></View>
        <MaterialCommunityIcons name="file-document-outline" size={30} color="rgba(255,255,255,0.4)" />
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <TouchableOpacity style={[styles.uploadBox, file && styles.uploadBoxActive]} onPress={pickDocument}>
              <MaterialCommunityIcons name={file ? "file-check" : "file-upload-outline"} size={35} color={file ? "#4caf50" : "#333399"} />
              <Text style={[styles.uploadText, file && { color: '#4caf50' }]}>{file ? file.name : "Upload Monthly Bill (PDF)"}</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Units Consumed</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.units} onChangeText={(t) => setForm({ ...form, units: t })} placeholder="e.g. 26865" />

              <Text style={styles.label}>Energy Charges Amount (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.energy} onChangeText={(t) => setForm({ ...form, energy: t })} placeholder="₹" />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Fixed Charges</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.fixed} onChangeText={(t) => setForm({ ...form, fixed: t })} placeholder="₹" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Grand Total</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.total} onChangeText={(t) => setForm({ ...form, total: t })} placeholder="₹" />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBill} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>SAVE</Text>}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hMonth}>{item.month}</Text>
              <Text style={styles.hSub}>Units: {item.totalUnits} • Energy: {item.energyCharges}</Text>
              <Text style={styles.hSub}>Fixed: {item.fixedCharges} • Bill Amount: {item.totalAmount}</Text>
            </View>
            <View style={styles.actionRow}>
              {/* 🗑️ Delete Button */}
              <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={28} color="#FF5252" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 50 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No billing data found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 50, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  formCard: { backgroundColor: 'white', margin: 20, borderRadius: 25, padding: 20, elevation: 5 },
  uploadBox: { backgroundColor: '#F0F2FF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#333399', borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 20 },
  uploadBoxActive: { borderColor: '#4caf50', backgroundColor: '#E8F5E9' },
  uploadText: { color: '#333399', marginTop: 8, fontSize: 12, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#888', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#F5F7FB', padding: 12, borderRadius: 12, marginBottom: 15, fontSize: 15, fontWeight: 'bold', color: '#333', borderWidth: 1, borderColor: '#EDF1FF' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  historyCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 12, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  hMonth: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
  hSub: { color: '#666', fontSize: 12, marginTop: 4, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 15 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#AAA', fontWeight: 'bold' }
});

export default BillScreen;