import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Modal, TextInput, Image, ActivityIndicator, Alert, ScrollView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';
import UserProfile from '../screens/adminPage/UserProfile'; 

const ReadingTakerScreen = () => {
  const { user, logout } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Reading Entry Modal States
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [readingValue, setReadingValue] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const companyId = user?.belongsToAdmin;


  
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
    }
  }, [companyId]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

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
      base64: true, 
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmitReading = async () => {
    if (!readingValue || !image) {
      Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please take photo & enter reading' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenantId', selectedTenant._id);
      formData.append('adminId', companyId);
      formData.append('staffId', user.id);
      formData.append('closingReading', readingValue);
      
    
      formData.append('photo', {
        uri: image.uri,
        name: `meter_${selectedTenant._id}.jpg`,
        type: 'image/jpeg',
      });

      const res = await axios.post(`${API_URL}/readings/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, 
      });

      Toast.show({ type: 'success', text1: 'Success ✅', text2: 'Reading uploaded to Cloudinary' });
      setEntryModalVisible(false);
      setImage(null);
      setReadingValue('');
      fetchTenants();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Upload failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTenantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tenantCard} 
      onPress={() => { setSelectedTenant(item); setEntryModalVisible(true); }}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="storefront" size={24} color="#333399" />
        </View>
        <View>
          <Text style={styles.tenantName}>{item.name}</Text>
          <Text style={styles.meterId}>Meter ID: {item.meterId}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="camera-plus" size={28} color="#333399" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setProfileVisible(true)}>
          <MaterialCommunityIcons name="account-circle" size={45} color="white" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
          <Text style={styles.subHeaderText}>Tenant Reading Entry</Text>
        </View>
      </View>

      {/* --- TENANTS LIST --- */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Select Shop / Tenant</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#333399" style={{marginTop: 50}} />
        ) : (
          <FlatList
            data={tenants}
            keyExtractor={item => item._id}
            renderItem={renderTenantItem}
            contentContainerStyle={{paddingBottom: 50}}
            ListEmptyComponent={<Text style={styles.emptyText}>No tenants assigned to you.</Text>}
          />
        )}
      </View>

      {/* --- MODAL 1: PROFILE --- */}
      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />

      {/* --- MODAL 2: READING ENTRY --- */}
      <Modal visible={entryModalVisible} animationType="slide">
        <View style={styles.entryModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Capture Reading</Text>
            <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.targetTenant}>{selectedTenant?.name}</Text>
            <Text style={styles.openingInfo}>Prev. Opening: {selectedTenant?.openingMeter}</Text>
             <Text style={styles.openingInfo}>Prev. Closing: {selectedTenant?.currentClosing}</Text>

            {/* Photo Capture Section */}
            <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
              {image ? (
                <Image source={{uri: image.uri}} style={styles.capturedImage} />
              ) : (
                <View style={{alignItems: 'center'}}>
                  <MaterialCommunityIcons name="camera" size={50} color="#999" />
                  <Text style={styles.photoLabel}>Take Meter Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Manual Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Enter Closing Reading (kWh)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. 12450.5" 
                keyboardType="numeric"
                value={readingValue}
                onChangeText={setReadingValue}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && {opacity: 0.7}]} 
              onPress={handleSubmitReading}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>SUBMIT TO ADMIN</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fd' },
  header: { 
    backgroundColor: '#333399', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 60,
    flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  headerText: { marginLeft: 15 },
  welcomeText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subHeaderText: { color: '#ccc', fontSize: 13 },
  listContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  tenantCard: { 
    backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { backgroundColor: '#f0f0ff', padding: 10, borderRadius: 12, marginRight: 15 },
  tenantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  meterId: { fontSize: 12, color: '#888' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

  // Modal Styles
  entryModal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333399' },
  modalBody: { padding: 20, alignItems: 'center' },
  targetTenant: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  openingInfo: { fontSize: 14, color: '#666', marginBottom: 25 },
  photoBox: { 
    width: '100%', height: 250, backgroundColor: '#f5f5f5', borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, 
    borderColor: '#eee', borderStyle: 'dashed', marginBottom: 25, overflow: 'hidden'
  },
  capturedImage: { width: '100%', height: '100%' },
  inputWrapper: { width: '100%', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  input: { 
    backgroundColor: '#f9f9f9', padding: 18, borderRadius: 15, 
    fontSize: 20, fontWeight: 'bold', color: '#333399', borderWidth: 1, borderColor: '#ddd'
  },
  submitBtn: { 
    backgroundColor: '#333399', padding: 20, borderRadius: 15, 
    width: '100%', alignItems: 'center', elevation: 5 
  },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default ReadingTakerScreen;