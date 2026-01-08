// import React, { useState, useContext } from 'react';
// import { 
//   View, Text, StyleSheet, TouchableOpacity, ScrollView, 
//   Modal, TextInput, Alert 
// } from 'react-native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { UserContext } from '../services/UserContext';

// const HomeTab = ({ navigation }) => {
//   const { user, logout } = useContext(UserContext);
//   const [profileVisible, setProfileVisible] = useState(false);
//   const [tenantModalVisible, setTenantModalVisible] = useState(false);



//   // स्केच के आइकॉन बार के लिए डेटा
//   const navIcons = [
//     { name: 'Home', icon: 'home-outline', route: 'Dashboard' },
//     { name: 'Reconciliation', icon: 'calculator-variant', route: 'Reconciliation' },
//     { name: 'Statements', icon: 'file-document-outline', route: 'Statements' },
//     { name: 'Approval', icon: 'check-decagram-outline', route: 'Approval' },
//     { name: 'AVVNL Bill', icon: 'lightning-bolt-outline', route: 'BillEntry' },
//     { name: 'Entry', icon: 'plus-box-outline', route: 'ReadingEntry' },
//   ];

//   return (
//     <View style={styles.container}>
//       {/* 1. Header (As per Sketch) */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => setProfileVisible(true)}>
//           <MaterialCommunityIcons name="account-circle" size={45} color="white" />
//         </TouchableOpacity>
        
//       </View>

//       <ScrollView style={styles.content}>
//         {/* 2. Navigation Icon Bar (Middle of Sketch) */}
//         <Text style={styles.sectionTitle}>Quick Actions</Text>
//         <View style={styles.iconGrid}>
//           {navIcons.map((item, index) => (
//             <TouchableOpacity key={index} style={styles.iconCard}>
//               <MaterialCommunityIcons name={item.icon} size={30} color="#333399" />
//               <Text style={styles.iconLabel}>{item.name}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//       </ScrollView>

//       {/* --- (A) User Profile Modal --- */}
//       <Modal visible={profileVisible} animationType="slide" transparent={true}>
//         <View style={styles.modalOverlay}>
//           <View style={styles.profileModal}>
//             <Text style={styles.modalTitle}>User Profile</Text>
//             <View style={styles.profileDetail}>
//               <Text style={styles.detailLabel}>Name:</Text>
//               <Text style={styles.detailValue}>{user?.name || ''}</Text>
//             </View>
//             <View style={styles.profileDetail}>
//               <Text style={styles.detailLabel}>Company Name:</Text>
//               <Text style={styles.detailValue}>Sanghi Enterprises</Text>
//             </View>
//             <View style={styles.profileDetail}>
//               <Text style={styles.detailLabel}>Mail:</Text>
//               <Text style={styles.detailValue}>{user?.email}</Text>
//             </View>
//             <View style={styles.profileDetail}>
//               <Text style={styles.detailLabel}>Reading Taker Code:</Text>
//               <Text style={styles.detailValue}>{user?.adminCode || 'STAFF-01'}</Text>
//             </View>

//             <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
//               <Text style={styles.logoutBtnText}>Logout</Text>
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.closeBtn}>
//               <Text>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

   
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f7fa' },
//   header: { 
//     backgroundColor: '#333399', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 50,
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     borderBottomLeftRadius: 30, borderBottomRightRadius: 30
//   },
//   headerRight: { alignItems: 'flex-end' },
//   dateText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
//   monthText: { color: '#ccc', fontSize: 12 },
  
//   content: { padding: 20 },
//   sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  
//   // Icon Grid Styles
//   iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
//   iconCard: { 
//     backgroundColor: 'white', width: '31%', padding: 15, borderRadius: 15, 
//     alignItems: 'center', marginBottom: 15, elevation: 3
//   },
//   iconLabel: { fontSize: 10, fontWeight: 'bold', marginTop: 8, color: '#555' },

//   // Tenant Button
//   addTenantBtn: { 
//     backgroundColor: '#333399', flexDirection: 'row', padding: 15, 
//     borderRadius: 15, alignItems: 'center', justifyContent: 'center' 
//   },
//   addTenantBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },

//   // Status List
//   statusList: { backgroundColor: 'white', borderRadius: 15, padding: 15 },
//   statusItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#eee' },

//   // Modal Styles
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
//   profileModal: { backgroundColor: 'white', borderRadius: 25, padding: 25 },
//   modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333399', textAlign: 'center' },
//   profileDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 0.5, borderColor: '#f0f0f0', paddingBottom: 5 },
//   detailLabel: { fontWeight: 'bold', color: '#666' },
//   detailValue: { color: '#333' },
//   logoutBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
//   logoutBtnText: { color: 'white', fontWeight: 'bold' },
//   closeBtn: { marginTop: 15, alignSelf: 'center' },

//   // Form Styles
//   inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 15 },
//   input: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginTop: 5 },
//   saveBtn: { backgroundColor: '#4caf50', padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center' },
//   saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
// });

// export default HomeTab;