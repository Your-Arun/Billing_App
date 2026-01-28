import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, RefreshControl, Platform,
  StatusBar, KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BillScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

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
    } catch (e) {
      console.log("Fetch Error");
    }
  }, [adminId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);


  
  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        setFile(result.assets[0]);
        Toast.show({ type: 'success', text1: 'Document Attached', text2: result.assets[0].name });
      }
    } catch (err) { console.log("Picker Error"); }
  };

  const handleSaveBill = async () => {
    if (!form.units || !form.energy || !form.fixed || !form.total || !file) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all fields and upload PDF' });
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

      Toast.show({ type: 'success', text1: 'Bill Saved', text2: 'Monthly record synced successfully' });
      setForm({ units: '', energy: '', fixed: '', total: '' });
      setFile(null);
      fetchHistory();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: 'Could not connect to server' });
    } finally { setSaving(false); }
  };

  const handleDownload = async (url, month, id) => {
    if (!url) return Toast.show({ type: 'error', text1: 'No File found' });
    setDownloadingId(id);
    try {
      const fileName = `Bill_${month.replace(/\s+/g, '_')}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Grid Bill - ${month}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e) {
      Alert.alert("Error", "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Record", "This action cannot be undone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/bill/delete/${id}`);
            fetchHistory();
            Toast.show({ type: 'info', text1: 'Deleted', text2: 'Record removed successfully' });
          } catch (e) { Alert.alert("Error", "Delete failed"); }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 🟦 HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Grid Billing</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshCircle}>
            <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Manage & verify monthly electricity input</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333399" />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={styles.mainContent}>

              {/* 🟢 NEW ENTRY CARD */}
              <View style={styles.formCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#333399" />
                  <Text style={styles.cardTitle}>Add Record - {monthName}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.uploadBox, file && styles.uploadBoxActive]}
                  onPress={pickDocument}
                >
                  <View style={[styles.iconCircle, { backgroundColor: file ? '#DCFCE7' : '#F0F2FF' }]}>
                    <MaterialCommunityIcons
                      name={file ? "file-check" : "file-pdf-box"}
                      size={30}
                      color={file ? "#16A34A" : "#333399"}
                    />
                  </View>
                  <Text style={[styles.uploadText, file && { color: '#16A34A' }]}>
                    {file ? file.name : "Select Official Bill PDF"}
                  </Text>
                  {!file && <Text style={styles.uploadSubText}>Max size 10MB • PDF only</Text>}
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputBlock}>
                      <Text style={styles.inputLabel}>Units Consumed</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={form.units}
                        onChangeText={(t) => setForm({ ...form, units: t })}
                        placeholder="0.00"
                        placeholderTextColor="#9E9E9E"
                      />
                    </View>
                    <View style={styles.inputBlock}>
                      <Text style={styles.inputLabel}>Energy Charges (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={form.energy}
                        onChangeText={(t) => setForm({ ...form, energy: t })}
                        placeholder="₹ 0.00"
                        placeholderTextColor="#9E9E9E"
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputBlock}>
                      <Text style={styles.inputLabel}>Fixed Charges (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={form.fixed}
                        onChangeText={(t) => setForm({ ...form, fixed: t })}
                        placeholder="₹ 0.00"
                        placeholderTextColor="#9E9E9E"
                      />
                    </View>
                    <View style={styles.inputBlock}>
                      <Text style={styles.inputLabel}>Grand Total (₹)</Text>
                      <TextInput
                        style={[styles.textInput, styles.totalInput]}
                        keyboardType="numeric"
                        value={form.total}
                        onChangeText={(t) => setForm({ ...form, total: t })}
                        placeholder="₹ 0.00"
                        placeholderTextColor="#9E9E9E"
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, saving && { opacity: 0.8 }]}
                  onPress={handleSaveBill}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Save & Sync Record</Text>
                      <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeading}>Recent Billing History</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <View style={styles.monthBadge}>
                  <Text style={styles.monthText}>{item.month.split(' ')[0].substring(0, 3)}</Text>
                  <Text style={styles.yearText}>{item.month.split(' ')[1]}</Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.hTotalAmt}>₹{item.totalAmount.toLocaleString()}</Text>
                  <Text style={styles.hUnits}>{item.totalUnits} Units Consumed</Text>
                </View>
              </View>

              <View style={styles.actionGroup}>
                {/* <TouchableOpacity 
                  onPress={() => handleDownload(item.billUrl, item.month, item._id)} 
                  style={styles.actionBtn}
                >
                  {downloadingId === item._id ? (
                    <ActivityIndicator size="small" color="#333399" />
                  ) : (
                    <MaterialCommunityIcons name="download" size={22} color="#333399" />
                  )}
                </TouchableOpacity> */}
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-search-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No billing data found.</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#333399',
    paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8, margin: 'auto' },
  refreshCircle: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12 },
  backBtn: { padding: 4 },

  mainContent: { padding: 20 },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginTop: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  uploadBox: {
    backgroundColor: '#F8FAFF',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#333399',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  uploadBoxActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  uploadText: { color: '#333399', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  uploadSubText: { color: '#94A3B8', fontSize: 11, marginTop: 4 },

  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  inputBlock: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6, marginLeft: 4 },
  textInput: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  totalInput: { color: '#333399', borderColor: '#CBD5E1' },

  submitBtn: {
    backgroundColor: '#333399',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: 30, marginBottom: 15 },

  historyCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  monthBadge: {
    backgroundColor: '#333399',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    width: 55
  },
  monthText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  yearText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 'bold' },
  historyInfo: { marginLeft: 15 },
  hTotalAmt: { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  hUnits: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },

  actionGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 10, fontWeight: '700' }
});

export default BillScreen;