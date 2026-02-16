import React, { useState, useEffect, useContext, useCallback ,useMemo} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, Image, ActivityIndicator, Alert, ScrollView, RefreshControl, StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';
import UserProfile from '../screens/adminPage/UserProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const TenantItem = React.memo(({ item, onSelect }) => {
  const status = item.todayStatus || 'Ready';
  let badgeText = 'READY', badgeColor = '#6366F1', icon = 'camera-plus', locked = false;

  if (status === 'Pending') { badgeText = 'WAITING'; badgeColor = '#F59E0B'; icon = 'clock-fast'; locked = true; }
  else if (status === 'Approved') { badgeText = 'DONE'; badgeColor = '#10B981'; icon = 'check-all'; locked = true; }
  else if (status === 'Rejected') { badgeText = 'RE-DO'; badgeColor = '#EF4444'; icon = 'alert-circle'; locked = false; }

  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.7}
      onPress={() => !locked && onSelect(item)}
      style={[styles.card, locked && styles.cardLocked]}
    >
      <View style={[styles.statusStrip, { backgroundColor: badgeColor }]} />
      <View style={styles.cardMain}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.tenantName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusPill, { backgroundColor: badgeColor + '15' }]}>
            <Text style={[styles.statusPillText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaInfo}>
            <MaterialCommunityIcons name="speedometer" size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.meterId}</Text>
          </View>
          <View style={styles.actionIcon}>
             <MaterialCommunityIcons name={icon} size={24} color={locked ? "#CBD5E1" : badgeColor} />
          </View>
        </View>
        
        {status === 'Rejected' && (
          <View style={styles.errorNote}>
            <MaterialCommunityIcons name="information" size={14} color="#EF4444" />
            <Text style={styles.errorText} numberOfLines={1}>Fix: {item.rejectionReason || 'Incorrect reading'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const ReadingTakerScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [readingValue, setReadingValue] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const companyId = user?.belongsToAdmin || user?.id;

  const stats = useMemo(() => {
    const done = tenants.filter(t => t.todayStatus === 'Approved' || t.todayStatus === 'Pending').length;
    return { done, total: tenants.length };
  }, [tenants]);

  const fetchTenants = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(`${API_URL}/readings/${companyId}`);
      const freshData = res.data || [];
      setTenants(freshData);
      await AsyncStorage.setItem(`taker_tenants_cache_${companyId}`, JSON.stringify(freshData));
    } catch (e) {
      console.log("Fetch Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    AsyncStorage.getItem(`taker_tenants_cache_${companyId}`).then(data => {
      if (data) { setTenants(JSON.parse(data)); setLoading(false); }
      fetchTenants();
    });
  }, [fetchTenants]);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImage(manipResult);
    }
  };

  const handleSubmitReading = async () => {
    if (!readingValue || !image) {
      Toast.show({ type: 'error', text1: 'Photo & Reading missing' });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenantId', selectedTenant._id);
      formData.append('adminId', companyId);
      formData.append('staffId', user.name);
      formData.append('closingReading', readingValue);
      formData.append('photo', { uri: image.uri, name: `meter_${Date.now()}.jpg`, type: 'image/jpeg' });

      await axios.post(`${API_URL}/readings/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({ type: 'success', text1: 'Job Done!', text2: 'Reading sent for approval' });
      setEntryModalVisible(false);
      setImage(null);
      setReadingValue('');
      fetchTenants();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Submission failed' });
    } finally { setSubmitting(false); }
  };

  if (loading && tenants.length === 0) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#333399" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 🟢 TOP PREMIUM HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.avatarWrap}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.staffNameText}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={fetchTenants}>
             <MaterialCommunityIcons name="sync" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* 📊 PROGRESS SUMMARY */}
        <View style={styles.summaryBox}>
            <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>TODAY'S PROGRESS</Text>
                <Text style={styles.summaryValue}>{stats.done} / {stats.total} Readings</Text>
            </View>
            <View style={styles.progressTrackBg}>
                <View style={[styles.progressTrackFill, { width: `${(stats.done/stats.total)*100}%` }]} />
            </View>
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
          data={tenants}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <TenantItem item={item} onSelect={(t) => { setSelectedTenant(t); setEntryModalVisible(true); }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTenants(); }} tintColor="#333399" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />

      {/* 🔵 DATA ENTRY MODAL */}
      <Modal visible={entryModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalNav}>
            <TouchableOpacity onPress={() => setEntryModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>Submit Log</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.targetCard}>
               <Text style={styles.targetLabel}>TENANT PROPERTY</Text>
               <Text style={styles.targetName}>{selectedTenant?.name}</Text>
               <View style={styles.divider} />
               <View style={styles.targetRow}>
                  <Text style={styles.targetLabel}>PREVIOUS RECORD</Text>
                  <Text style={styles.targetVal}>{selectedTenant?.currentClosing || "0.00"} kWh</Text>
               </View>
            </View>

            <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                    <Text style={styles.stepCircle}>1</Text>
                    <Text style={styles.stepText}>Capture Meter Photo</Text>
                </View>
                <TouchableOpacity style={styles.cameraBox} onPress={takePhoto}>
                {image ? (
                    <Image source={{ uri: image.uri }} style={styles.capturedImg} />
                ) : (
                    <View style={styles.cameraPlaceholder}>
                        <MaterialCommunityIcons name="camera-plus-outline" size={48} color="#6366F1" />
                        <Text style={styles.cameraTip}>Open Camera</Text>
                    </View>
                )}
                </TouchableOpacity>
            </View>

            <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                    <Text style={styles.stepCircle}>2</Text>
                    <Text style={styles.stepText}>Current kWh Value</Text>
                </View>
                <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="pencil-lock" size={24} color="#6366F1" />
                    <TextInput
                        style={styles.hugeInput}
                        placeholder="0000.0"
                        keyboardType="numeric"
                        value={readingValue}
                        onChangeText={setReadingValue}
                        placeholderTextColor="#CBD5E1"
                    />
                </View>
            </View>

            <TouchableOpacity 
              style={[styles.mainSubmitBtn, submitting && { backgroundColor: '#94A3B8' }]} 
              onPress={handleSubmitReading} 
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnFlex}>
                    <Text style={styles.mainSubmitText}>UPLOAD LOG</Text>
                    <MaterialCommunityIcons name="arrow-right-circle" size={24} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={{height: 40}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: { backgroundColor: '#333399', paddingHorizontal: 25, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 15 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FFF' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, backgroundColor: '#10B981', borderRadius: 6, borderWidth: 2, borderColor: '#333399' },
  headerTitleWrap: { flex: 1, marginLeft: 15 },
  greetingText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  staffNameText: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  notifBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  
  summaryBox: { marginTop: 25, backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 20 },
  summaryInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  summaryValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  progressTrackBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressTrackFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },

  body: { flex: 1 },
  bodyTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 15, paddingHorizontal: 25, marginTop: 20, letterSpacing: 1 },
  
  card: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 15, flexDirection: 'row', elevation: 4, shadowColor: '#333399', shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardLocked: { opacity: 0.8 },
  statusStrip: { width: 6 },
  cardMain: { flex: 1, padding: 18 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tenantName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  actionIcon: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 12 },
  errorNote: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  errorText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },

  modalFull: { flex: 1, backgroundColor: '#FFF' },
  modalNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  closeBtn: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 15 },
  modalNavTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  modalBody: { padding: 25 },
  targetCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0' },
  targetLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', letterSpacing: 1 },
  targetName: { fontSize: 24, fontWeight: 'bold', color: '#333399', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetVal: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },

  stepContainer: { marginBottom: 30 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#333399', color: '#FFF', textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: 'bold' },
  stepText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cameraBox: { width: '100%', height: 200, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#6366F1', backgroundColor: '#F5F3FF', overflow: 'hidden' },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraTip: { marginTop: 10, fontSize: 14, color: '#6366F1', fontWeight: '600' },
  capturedImg: { width: '100%', height: '100%' },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 20, height: 75 },
  hugeInput: { flex: 1, marginLeft: 15, fontSize: 32, fontWeight: 'bold', color: '#333399' },

  mainSubmitBtn: { backgroundColor: '#333399', borderRadius: 24, padding: 22, elevation: 8, shadowColor: '#333399', shadowOpacity: 0.3, shadowRadius: 10 },
  btnFlex: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  mainSubmitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default ReadingTakerScreen;