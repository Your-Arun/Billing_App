import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView
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
    { name: 'Reconciliation', icon: 'scale-balance', route: 'Reconciliation' },
    { name: 'Monthly Billing', icon: 'calendar-month-outline', route: 'MonthlyBilling' },
     { name: 'Statements', icon: 'calendar-month-outline', route: 'Statement' },
  ];

  const today = new Date();
  const displayDate = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const year = today.getFullYear();

  return (
    <View style={styles.container}>
      
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setProfileVisible(true)}>
          <MaterialCommunityIcons name="account-circle" size={48} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.date}>{displayDate}</Text>
          <Text style={styles.year}>{year}</Text>
        </View>
      </View>

      {/* ===== BODY ===== */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Dashboard</Text>

        <View style={styles.grid}>
          {navIcons.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.85}
            >
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name={item.icon} size={26} color="#333399" />
              </View>
              <Text style={styles.cardText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== PROFILE MODAL ===== */}
      <UserProfile
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },

  header: {
    backgroundColor: '#333399',
    paddingTop: 55,
    paddingBottom: 35,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerText: {
    alignItems: 'flex-end',
  },

  date: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  year: {
    color: '#D1D5FF',
    fontSize: 12,
    marginTop: 2,
  },

  content: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },

  iconBox: {
    backgroundColor: '#EEF0FF',
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  cardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});


export default Dashboard;
