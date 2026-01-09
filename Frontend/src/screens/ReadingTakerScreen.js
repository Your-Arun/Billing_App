import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, Image, ActivityIndicator, Alert, ScrollView, RefreshControl, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';
import UserProfile from '../screens/adminPage/UserProfile';
import { useMemo } from 'react';

const { width } = Dimensions.get('window');

const ReadingTakerScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
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
      const res = await axios.get(`${API_URL}/tenants/${companyId}`);
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
    const unsubscribe = navigation.addListener('focus', () => { fetchTenants(); });
    return unsubscribe;
  }, [navigation, fetchTenants]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required!');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmitReading = async () => {
    if (!readingValue || !image) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Take photo & enter reading' });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenantId', selectedTenant._id);
      formData.append('adminId', companyId);
      formData.append('staffId', user.name);
      formData.append('closingReading', readingValue);
      formData.append('photo', {
        uri: image.uri,
        name: `meter_${selectedTenant._id}.jpg`,
        type: 'image/jpeg',
      });

      await axios.post(`${API_URL}/readings/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({ type: 'success', text1: 'Reading Added ✅' });
      setEntryModalVisible(false);
      setImage(null);
      setReadingValue('');
      fetchTenants();
    } catch (e) {
      Alert.alert("Error", "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTenantItem = ({ item }) => {
    const status = item.todayStatus; // 'Approved', 'Pending', 'Rejected', 'Ready'
    
    // स्टेटस के हिसाब से रंग और आइकॉन तय करना
    const getUIConfig = () => {
        switch(status) {
            case 'Pending': 
                return { color: '#FF9800', icon: 'clock-outline', label: 'PENDING APPROVAL', isLocked: true };
            case 'Approved': 
                return { color: '#4CAF50', icon: 'check-decagram', label: 'APPROVED', isLocked: true };
            case 'Rejected': 
                return { color: '#F44336', icon: 'alert-circle', label: 'REJECTED (RE-ENTER)', isLocked: false };
            default: 
                return { color: '#333399', icon: 'camera-plus', label: 'READY FOR ENTRY', isLocked: false };
        }
    };

    const config = getUIConfig();

    return (
      <TouchableOpacity 
        style={[
            styles.tenantCard, 
            status === 'Approved' && styles.doneCard,
            status === 'Pending' && { borderColor: '#FF9800', borderWidth: 1 },
            status === 'Rejected' && { borderColor: '#F44336', borderWidth: 1 }
        ]} 
        onPress={() => {
          if (config.isLocked) {
             return Alert.alert("Wait!", `This reading is ${status}. You cannot edit it now.`);
          }
          setSelectedTenant(item); 
          setEntryModalVisible(true); 
        }}
        activeOpacity={config.isLocked ? 1 : 0.7}
      >
        <View style={styles.cardMainInfo}>
          <View style={[styles.iconBox, {backgroundColor: config.color + '15'}]}>
            <MaterialCommunityIcons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.tenantName}>{item.name}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.statusTag, {backgroundColor: config.color}]}>
                <Text style={styles.tagText}>{config.label}</Text>
              </View>
              <Text style={styles.accumulatedText}>{item.currentClosing || 0} kWh</Text>
            </View>
            {/* रिजेक्शन की वजह दिखाएं */}
            {status === 'Rejected' && (
               <Text style={styles.rejectText}>Reason: {item.rejectionReason || "Check again"}</Text>
            )}
          </View>
        </View>
        {!config.isLocked && <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />}
      </TouchableOpacity>
    );
};


  return (
    <View style={styles.container}>
      {/* --- NEW MODERN HEADER --- */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => setProfileVisible(true)}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.welcomeBox}>
            <Text style={styles.helloText}>Techcian</Text>
            <Text style={styles.staffName}>{user?.name}</Text>
          </View>
        </View>

      </View>

      {/* --- LIST SECTION --- */}
      <View style={styles.body}>
        <View style={styles.bodyHeader}>
          <Text style={styles.bodyTitle}>TENANTS (KIRAYEDAAR)</Text>
          <MaterialCommunityIcons name="filter-variant" size={20} color="#666" />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#333399" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={tenants}
            keyExtractor={item => item._id}
            renderItem={renderTenantItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTenants(); }} />}
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No tenants found.</Text>}
          />
        )}
      </View>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />

      {/* --- PREMIUM INPUT MODAL --- */}
      <Modal visible={entryModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <View style={styles.modalNav}>
            <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
              <MaterialCommunityIcons name="chevron-down" size={30} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reading</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.tenantHeaderBox}>
              <Text style={styles.tenantLabel}>TENANT NAME</Text>
              <Text style={styles.tenantMainName}>{selectedTenant?.name}</Text>
              <View style={styles.divider} />
              <View style={styles.readingInfoRow}>
                <View style={styles.infoSmallLabel}>
                  <Text style={styles.infoSmallLabel}>Last Recorded</Text>
                  <Text style={styles.infoSmallVal}>{selectedTenant?.currentClosing} kWh</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>1. TAKE METER PHOTO</Text>
            <TouchableOpacity style={styles.cameraBox} onPress={takePhoto}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.fullImg} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={50} color="#333399" />
                  <Text style={styles.cameraHint}>Tap to capture meter screen</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>2. ENTER CURRENT READING</Text>
            <View style={styles.inputCard}>
              <MaterialCommunityIcons name="numeric" size={24} color="#333399" />
              <TextInput
                style={styles.mainInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={readingValue}
                onChangeText={setReadingValue}
                autoFocus
              />
              <Text style={styles.unitText}>kWh</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitActionBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitReading}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitActionText}>SUBMIT TO MANAGER</Text>}
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' ,marginTop:-50},
  // Header Styles
  header: {
    backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 20,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 15
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0ff' },
  welcomeBox: { marginLeft: 15, flex: 1 },
  helloText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  staffName: { color: 'white', fontSize: 15, fontWeight: 'bold', paddingTop: 2 },
  logoutIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12 },

  progressCard: { backgroundColor: 'rgba(236, 189, 189, 0.1)', padding: 20, borderRadius: 20, },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { color: 'white', fontSize: 10, fontWeight: '600' },
  progressPercent: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 10 },

  // Body Styles
  body: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
  bodyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  bodyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1C3D' },

  tenantCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#333399', shadowOpacity: 0.08, shadowRadius: 10
  },
  doneCard: { backgroundColor: '#F0FFF4', borderLeftWidth: 5, borderLeftColor: '#4CAF50' },
  cardMainInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { backgroundColor: '#F0F2FF', padding: 12, borderRadius: 18 },
  textContainer: { marginLeft: 15 },
  tenantName: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
  meterId: { fontSize: 11, color: '#888', marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10 },
  tagPending: { backgroundColor: '#E1F5FE' },
  tagSuccess: { backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 8, fontWeight: 'bold' },
  textPending: { color: '#0288D1' },
  textSuccess: { color: '#4CAF50' },
  accumulatedText: { fontSize: 11, fontWeight: 'bold', color: '#333399' },

  arrowBox: { backgroundColor: '#F8F9FD', padding: 8, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 80, color: '#AAA' },

  // Modal Styles
  modalContent: { flex: 1, backgroundColor: '#F8F9FE' },
  modalNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, paddingTop: 50, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalBody: { paddingHorizontal: 25 },
  tenantHeaderBox: { backgroundColor: 'white', borderRadius: 25, padding: 25, marginBottom: 25, elevation: 2 },
  tenantLabel: { fontSize: 10, fontWeight: 'bold', color: '#AAA', letterSpacing: 1 },
  tenantMainName: { fontSize: 24, fontWeight: 'bold', color: '#333399', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 15 },
  readingInfoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoSmallLabel: { fontSize: 10, color: '#AAA', fontWeight: '600' , alignContent: 'center', display: 'flex'},
  infoSmallVal: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 3 },

  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 15, marginLeft: 5 },
  cameraBox: {
    width: '100%', height: 240, backgroundColor: 'white', borderRadius: 30,
    borderWidth: 2, borderColor: '#333399', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden'
  },
  fullImg: { width: '100%', height: '100%' },
  cameraHint: { color: '#AAA', fontSize: 12, marginTop: 10, fontWeight: '600' },

  inputCard: {
    backgroundColor: 'white', borderRadius: 25, paddingHorizontal: 20,
    height: 75, flexDirection: 'row', alignItems: 'center', elevation: 3, marginBottom: 30
  },
  mainInput: { flex: 1, marginLeft: 15, fontSize: 26, fontWeight: 'bold', color: '#333399' },
  unitText: { fontSize: 14, fontWeight: 'bold', color: '#AAA' },

  submitActionBtn: {
    backgroundColor: '#333399', padding: 22, borderRadius: 25,
    alignItems: 'center', elevation: 8, shadowColor: '#333399', shadowOpacity: 0.3
  },
  submitActionText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  errorCard: { borderColor: '#F44336', borderWidth: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rejectedHint: { color: '#F44336', fontSize: 10, fontWeight: 'bold', marginLeft: 10 },
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  infoSmallLabel: { fontSize: 10, color: '#AAA', fontWeight: '600' },
  infoSmallVal: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusTag: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    marginRight: 10 
  },
  tagText: { 
    fontSize: 8, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  rejectText: { 
    color: '#F44336', 
    fontSize: 10, 
    fontWeight: 'bold', 
    marginTop: 5 
  }
});

export default ReadingTakerScreen;