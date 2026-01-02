import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Dashboard = ({ navigation }) => {
  // Mock Data (Slide 5 के हिसाब से)
  const dashboardItems = [
    { title: 'Sub-meter Readings', status: 'Submitted (9/9)', color: '#4caf50', icon: 'speedometer' },
    { title: 'Approval', status: 'Pending', color: '#ff9800', icon: 'check-circle-outline' },
    { title: 'AVVNL Bill', status: 'Not Uploaded', color: '#f44336', icon: 'file-upload-outline' },
    { title: 'Solar Data', status: 'Not Entered', color: '#f44336', icon: 'solar-power' },
    { title: 'DG Data (3 sets)', status: 'Not Entered', color: '#f44336', icon: 'engine' },
    { title: 'Reconciliation', status: 'Waiting', color: '#9e9e9e', icon: 'calculator' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Property & Period Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complex A | Jan 2026</Text>
        <Text style={styles.headerSub}>Control Center</Text>
      </View>

      <View style={styles.content}>
        {dashboardItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.card}>
            <View style={styles.cardInfo}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
              </View>
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={[styles.itemStatus, { color: item.color }]}>{item.status}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Slide 5 Bottom Button */}
      <TouchableOpacity style={styles.nextButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.nextText}>Logout / Go to Next Step</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#333399', padding: 25, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#ccc', fontSize: 14 },
  content: { padding: 15 },
  card: { 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 12,
    elevation: 2
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { padding: 10, borderRadius: 10 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  nextButton: { backgroundColor: '#333399', margin: 15, padding: 18, borderRadius: 12, alignItems: 'center' },
  nextText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default Dashboard;