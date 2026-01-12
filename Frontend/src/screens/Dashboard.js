import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserProfile from './adminPage/UserProfile';

const Dashboard = ({ navigation }) => {
  const [profileVisible, setProfileVisible] = useState(false);

  const navIcons = [
    { name: 'Readings', icon: 'speedometer', route: 'Readings' },
    { name: 'Approval', icon: 'check-decagram-outline', route: 'Approval' },
    { name: 'AVVNL Bill', icon: 'lightning-bolt-outline', route: 'Bill' },
    { name: 'Tenants', icon: 'account-group-outline', route: 'Tenants' },
    { name: 'Statements', icon: 'file-document-outline', route: 'Home' },
     { name: 'Reconciliation', icon: 'file-document-outline', route: 'Reconciliation' },
      { name: 'MonthlyBilling', icon: 'file-document-outline', route: 'MonthlyBilling' },
  ];


  const getFormattedDate = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return {
      displayDate: `${day} ${month}`,
      cycleMonth: `${year}`
    };
  };
  const { displayDate, cycleMonth } = getFormattedDate();
  return (
    <View style={styles.container}>
     
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setProfileVisible(true)}>
          <MaterialCommunityIcons name="account-circle" size={45} color="white" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.dateText}>{displayDate}</Text>
          <Text style={styles.monthText}>{cycleMonth}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
    
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.iconGrid}>
          {navIcons.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.iconCard}
              onPress={() => navigation.navigate(item.route)}
            >
              <MaterialCommunityIcons name={item.icon} size={30} color="#333399" />
              <Text style={styles.iconLabel}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>


        <View style={{ height: 100 }} />
      </ScrollView>

      <UserProfile 
        visible={profileVisible} 
        onClose={() => setProfileVisible(false)} 
      />


    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#333399', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  headerRight: { alignItems: 'flex-end' },
  dateText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  monthText: { color: '#ccc', fontSize: 12 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconCard: { backgroundColor: 'white', width: '31%', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 15, elevation: 3 },
  iconLabel: { fontSize: 10, fontWeight: 'bold', marginTop: 8, color: '#555' },
  addTenantBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addTenantBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  statusList: { backgroundColor: 'white', borderRadius: 15, padding: 15 },
  statusItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#eee' },
  statusLabel: { color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  profileModal: { backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333399' },
  profileDetail: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  label: { fontWeight: 'bold', color: '#666' },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 20 },
  input: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginBottom: 15, color: '#000' },
  saveBtn: { backgroundColor: '#4caf50', padding: 15, borderRadius: 10, alignItems: 'center' }
});

export default Dashboard;