import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, Image, ActivityIndicator, Alert, ScrollView, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';
import UserProfile from '../screens/adminPage/UserProfile';

const ReadingTakerScreen = ({ navigation }) => {
  const { user, logout } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [readingValue, setReadingValue] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const companyId = user?.belongsToAdmin || user?.id;

  const fetchTenants = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/readings/${companyId}`);
      setTenants(res.data);
    } catch (e) {
      console.log("Fetch Error Staff:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTenants();
    const unsubscribe = navigation.addListener('focus', fetchTenants);
    return unsubscribe;
  }, [navigation, fetchTenants]);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setImage(result.assets[0]);
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
      formData.append('photo', { uri: image.uri, name: `meter.jpg`, type: 'image/jpeg' });

      await axios.post(`${API_URL}/readings/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({ type: 'success', text1: 'Reading Added ✅' });
      setEntryModalVisible(false);
      setImage(null);
      setReadingValue('');
      fetchTenants();
    } catch (e)
        {if (e.response && e.response.status === 409) {
          Toast.show({ type: 'error', text1: 'Today reading already submitted' });  
        } else {
          console.log("Submit Error:", e.message);
          Toast.show({ type: 'error', text1: 'Submission Failed', text2: 'Try again later' });
        } }
    finally { setSubmitting(false); }
  };


  const renderTenantItem = ({ item }) => {
  const status = item.todayStatus || 'Ready';

  let badgeText = 'READY';
  let badgeColor = '#4F46E5';
  let leftStrip = '#4F46E5';
  let icon = 'camera-outline';
  let locked = false;

  if (status === 'Pending') {
    badgeText = 'PENDING';
    badgeColor = '#F59E0B';
    leftStrip = '#F59E0B';
    icon = 'clock-outline';
    locked = true;
  }

  if (status === 'Approved') {
    badgeText = 'APPROVED';
    badgeColor = '#16A34A';
    leftStrip = '#16A34A';
    icon = 'check-circle-outline';
    locked = true;
  }

  if (status === 'Rejected') {
    badgeText = 'REJECTED';
    badgeColor = '#DC2626';
    leftStrip = '#DC2626';
    icon = 'alert-circle-outline';
    locked = false;
  }

  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.8}
      onPress={() => {
        if (locked) return;
        setSelectedTenant(item);
        setEntryModalVisible(true);
      }}
      style={styles.card}
    >
      {/* LEFT COLOR STRIP */}
      <View style={[styles.leftStrip, { backgroundColor: leftStrip }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon} size={24} color={badgeColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName}>{item.name}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
              <Text style={styles.kwhText}>
                {}
              </Text>
            </View>

            {status === 'Rejected' && (
              <Text style={styles.rejectText}>
              </Text>
            )}
          </View>

          {!locked && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={30}
              color="#CBD5E1"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <View style={styles.container}>
      {/* 🟢 TOP HEADER (Exactly as per Image 1) */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => setProfileVisible(true)}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.avatar} />
          </TouchableOpacity>
          <View style={styles.welcomeBox}>
            <Text style={styles.technicianText}>TECHNICIAN</Text>
            <Text style={styles.staffName}>{user?.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.sectionHeader}>
          <Text style={styles.bodyTitle}>TENANTS ( KIRAYEDAAR )</Text>
        </View>

        <FlatList
          data={tenants}
          renderItem={renderTenantItem}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTenants(); }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />

      {/* 🔵 NEW READING MODAL (Exactly as per Image 2) */}
      <Modal visible={entryModalVisible} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalNav}>
            <TouchableOpacity onPress={() => setEntryModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>New Reading</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.tenantInfoCard}>
              <Text style={styles.labelSmall}>TENANT NAME</Text>
              <Text style={styles.tenantNameLarge}>{selectedTenant?.name}</Text>
              <View style={styles.line} />
              <Text style={styles.labelSmall}>LAST RECORDED</Text>
              <Text style={styles.readingValBig}>{selectedTenant?.currentClosing || "0.00"} kWh</Text>
            </View>

            <Text style={styles.stepLabel}>1. TAKE METER PHOTO</Text>
            <TouchableOpacity style={styles.cameraDashedBox} onPress={takePhoto}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.fullImg} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <MaterialCommunityIcons name="camera" size={50} color="#333399" />
                  <Text style={styles.dashText}>Tap to capture meter screen</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.stepLabel}>2. ENTER CURRENT READING</Text>
            <View style={styles.inputBoxRow}>
              <MaterialCommunityIcons name="pound" size={28} color="#333399" />
              <TextInput
                style={styles.mainTextInput}
                placeholder="1420.5"
                placeholderTextColor="#9E9E9E"
                keyboardType="numeric"
                value={readingValue}
                onChangeText={setReadingValue}
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.submitActionBtn} onPress={handleSubmitReading} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitActionText}>SEND FOR APPROVAL</Text>}
            </TouchableOpacity>
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE', paddingTop: 40 },
  // Header Style (Curve Blue)
  blueHeader: {
    backgroundColor: '#333399', height: 100, paddingHorizontal: 30, justifyContent: 'center',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10, elevation: 122
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 30, borderWidth: 3, borderColor: '#fff' },
  welcomeBox: { marginLeft: 15 },
  technicianText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' },
  staffName: { color: 'white', fontSize: 24, fontWeight: 'bold',paddingTop: 2,  fontFamily: 'Helvetica' },

  // Body Style
  body: { flex: 1, paddingHorizontal: 25, marginTop: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bodyTitle: { fontSize: 18, fontWeight: '900', color: '#1A1C3D' },

  // Tenant Cards
  tenantCard: {
    backgroundColor: 'white', borderRadius: 30, padding: 20, marginBottom: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  pendingBorder: { borderWidth: 2, borderColor: '#FF9800' },
  approvedBorder: { borderLeftWidth: 10, borderLeftColor: '#4CAF50', backgroundColor: '#F9FFF9' },

  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardTexts: { marginLeft: 15 },
  tenantName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  pillText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  accumulatedText: { fontSize: 12, fontWeight: 'bold', color: '#333399' },

  // Modal Styles (Image 2)
  modalFull: { flex: 1, backgroundColor: '#FFF' },
  modalNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, paddingTop: 60, alignItems: 'center' },
  closeBtn: { backgroundColor: '#F0F2FF', padding: 8, borderRadius: 20 },
  modalNavTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { paddingHorizontal: 25 },
  tenantInfoCard: { backgroundColor: '#F8F9FE', borderRadius: 20, padding: 25, marginBottom: 25, borderWidth: 1, borderColor: '#EEE' },
  labelSmall: { fontSize: 10, fontWeight: 'bold', color: '#AAA', letterSpacing: 1 },
  tenantNameLarge: { fontSize: 28, fontWeight: 'bold', color: '#333399', marginTop: 5 },
  line: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  readingValBig: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  stepLabel: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 15 },
  cameraDashedBox: {
    width: '100%', height: 220, borderRadius: 25, borderStyle: 'dashed',
    borderWidth: 2, borderColor: '#333399', justifyContent: 'center', alignItems: 'center', marginBottom: 30
  },
  dashText: { color: '#AAA', marginTop: 10, fontWeight: 'bold' },
  fullImg: { width: '100%', height: '100%', borderRadius: 23 },

  inputBoxRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FE',
    height: 75, borderRadius: 20, paddingHorizontal: 20, marginBottom: 30
  },
  mainTextInput: { flex: 1, marginLeft: 15, fontSize: 32, fontWeight: 'bold', color: '#333399' },

  submitActionBtn: {
    backgroundColor: '#333399', padding: 22, borderRadius: 25, alignItems: 'center', elevation: 10,
    shadowColor: '#333399', shadowOpacity: 0.3, shadowRadius: 15
  },
  submitActionText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  card: {
  backgroundColor: '#fff',
  borderRadius: 24,
  marginBottom: 18,
  flexDirection: 'row',
  elevation: 1,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
},

leftStrip: {
  width: 6,
  borderTopLeftRadius: 90,
  borderBottomLeftRadius: 90,
},

cardContent: {
  flex: 1,
  padding: 18,
},

cardTop: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
},

iconCircle: {
  width: 46,
  height: 46,
  borderRadius: 14,
  backgroundColor: '#EEF2FF',
  justifyContent: 'center',
  alignItems: 'center',
},

tenantName: {
  fontSize: 18,
  fontWeight: '700',
  color: '#0F172A',
},

badgeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
},

badge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  marginRight: 10,
},

badgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.6,
},

kwhText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#334155',
},

rejectText: {
  marginTop: 6,
  fontSize: 12,
  color: '#DC2626',
  fontWeight: '600',
},

});

export default ReadingTakerScreen;


// ye kaam kr rha hai