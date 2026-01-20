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






import React, { useState, useContext, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar, Platform, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { UserContext } from '../../services/UserContext';
import axios from 'axios';
import API_URL from '../../services/apiconfig';
import { useEffect } from 'react';

const StatementScreen = ({ route, navigation }) => {
    const { user } = useContext(UserContext);
    const {
        tenantBreakdown = [],
        startDate = null,
        endDate = null,
    } = route.params || {};


    const [loadingId, setLoadingId] = useState({ id: null, type: null });

    // 🔍 Search State
    const [searchText, setSearchText] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const fromDate = new Date(startDate).toLocaleDateString('en-IN');
    const toDate = new Date(endDate).toLocaleDateString('en-IN');
    const today = new Date().toLocaleDateString('en-IN');
    const adminId = user?._id || user?.id;
    // ⚡ Filtering Logic (Performs instantly as you type)
    const filteredTenants = useMemo(() => {
        return tenantBreakdown.filter(item =>
            item.tenantName.toLowerCase().includes(searchText.toLowerCase()) ||
            item.meterId.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [searchText, tenantBreakdown]);

    // 📄 HTML Bill Template (Keeping your existing template)
    const createHTML = (item) => `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #333399; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { color: #333399; font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
          .bill-title { font-size: 18px; font-weight: bold; color: #666; margin: 5px 0 0 0; }
          .info-table { width: 100%; margin-bottom: 30px; }
          .info-table td { vertical-align: top; width: 50%; }
          .section-label { color: #888; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
          .info-val { font-size: 14px; font-weight: bold; }
          .reading-card { background: #f8f9ff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 20px; display: flex; justify-content: space-between; margin-bottom: 30px; }
          .reading-item { text-align: center; flex: 1; }
          .reading-item span { display: block; font-size: 10px; color: #666; margin-bottom: 5px; font-weight: bold; }
          .reading-item b { font-size: 18px; color: #333399; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .items-table th { background: #333399; color: white; padding: 12px; text-align: left; font-size: 12px; }
          .items-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .total-row { background: #f3f4f6; font-weight: bold; font-size: 16px; }
          .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <h1 class="company-name">${user.companyName}</h1>
            <p class="bill-title">Electricity Statement</p>
          </div>
          <div style="text-align: right;">
            <div class="section-label">Invoice Date</div>
            <div class="info-val">${today}</div>
          </div>
        </div>
        <table class="info-table">
          <tr>
            <td>
              <div class="section-label">Bill To:</div>
              <div class="info-val" style="font-size: 18px;">${item.tenantName}</div>
              <div style="color: #666; font-size: 12px; margin-top: 3px;">Meter ID: ${item.meterId}</div>
            </td>
            <td style="text-align: right;">
              <div class="section-label">Billing Period</div>
              <div class="info-val">${fromDate} - ${toDate}</div>
            </td>
          </tr>
        </table>
        <div class="reading-card">
          <div class="reading-item"><span>Opening</span><b>${item.opening}</b></div>
          <div style="color:#ccc; font-size: 20px;">-</div>
          <div class="reading-item"><span>Closing</span><b>${item.closing}</b></div>
          <div style="color:#ccc; font-size: 20px;">=</div>
          <div class="reading-item"><span>Difference</span><b>${(item.closing - item.opening).toFixed(2)}</b></div>
          <div style="color:#ccc; font-size: 20px;">x</div>
          <div class="reading-item"><span>CT Mult.</span><b>${item.multiplierCT}x</b></div>
          <div style="color:#ccc; font-size: 20px;">=</div>
          <div class="reading-item"><span>Total Units</span><b>${item.units}</b></div>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Rate/Loss Info</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Energy Consumption</td><td style="text-align: center;">₹${item.ratePerUnit || '10.20'} / u</td><td style="text-align: right;">${item.amount.toFixed(2)}</td></tr>
            <tr><td>Monthly Fixed Charges</td><td style="text-align: center;">Fixed</td><td style="text-align: right;">${item.fixed.toFixed(2)}</td></tr>
            <tr><td>Transformer Loss</td><td style="text-align: center;">${item.transformerLoss}%</td><td style="text-align: right;">${item.transLoss.toFixed(2)}</td></tr>
            <tr><td>Generator (DG)</td><td style="text-align: center;">${item.isDgDisabled ? '0.00' : '₹1.00 / u'}</td><td style="text-align: right;">${item.dgCharge.toFixed(2)}</td></tr>
            <tr class="total-row"><td colspan="2" style="text-align: right;">Grand Total</td><td style="text-align: right; color: #333399;">₹ ${item.totalBill.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
    `;

    const fetchHistory = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/statement/history/${user._id}`
            );
            setHistory(res.data);
        } catch (e) {
            console.log("History fetch failed");
        } finally {
            setLoadingHistory(false);
        }
    };
    useEffect(() => {
        fetchHistory();
    }, []);
    const generatePDFUri = async (item) => {
        const html = createHTML(item);
        const { uri } = await Print.printToFileAsync({ html });
        const safeName = item.tenantName.replace(/\s+/g, '_');
        const newName = `Invoice_${safeName}_${toDate.replace(/\//g, '-')}.pdf`;
        const newUri = `${FileSystem.cacheDirectory}${newName}`;
        await FileSystem.moveAsync({ from: uri, to: newUri });
        return newUri;
    };

    const handleView = async (item) => {
        setLoadingId({ id: item.tenantId, type: 'view' });
        try {
            const html = createHTML(item);
            await Print.printAsync({ html });
        } catch (e) { Alert.alert("Error", "Could not preview PDF"); }
        finally { setLoadingId({ id: null, type: null }); }
    };

    const handleShare = async (item) => {
        setLoadingId({ id: item.tenantId, type: 'share' });
        try {
            const uri = await generatePDFUri(item);
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        } catch (e) { Alert.alert("Error", "Could not share PDF"); }
        finally { setLoadingId({ id: null, type: null }); }
    };
    const handleSaveStatement = async (item) => {
        try {
            const html = createHTML(item);

            const res = await axios.post(
                `${API_URL}/statement/save`,
                {
                    adminId: adminId,
                    tenantId: item.tenantId,
                    tenantName: item.tenantName,
                    meterId: item.meterId,
                    periodFrom: startDate,
                    periodTo: endDate,
                    units: item.units,
                    totalAmount: item.totalBill,
                    htmlContent: html
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert("Saved", "Statement saved successfully");

        } catch (e) {
            console.log("SAVE ERROR:", e.response?.data || e.message);
            Alert.alert("Error", "Could not save statement");
        }
    };

    const HistoryCard = ({ item }) => (
        <View style={styles.tenantCard}>
            <Text style={styles.tName}>
                {item.tenantName}
            </Text>

            <Text style={styles.tSub}>
                ₹{item.totalAmount} • {item.units} units
            </Text>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.miniBtn}
                    onPress={() => Linking.openURL(item.pdfUrl)}
                >
                    <MaterialCommunityIcons
                        name="file-pdf-box"
                        size={22}
                        color="#E53935"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );



    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* --- HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Statements</Text>
                <View style={{ width: 45 }} />
            </View>

            {/* --- 🔍 SEARCH BAR --- */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tenant or meter ID..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* --- LIST --- */}
            <FlatList
                ListHeaderComponent={
                    <>
                        {/* 🔹 HISTORY SECTION */}
                        <Text style={styles.sectionTitle}>Saved Statements</Text>

                        {loadingHistory ? (
                            <ActivityIndicator />
                        ) : history.length === 0 ? (
                            <Text style={styles.empty}>No saved statements</Text>
                        ) : (
                            history.map(stmt => (
                                <HistoryCard key={stmt._id} item={stmt} />
                            ))
                        )}

                        {/* 🔹 DIVIDER */}
                        <Text style={styles.sectionTitle}>Current Period</Text>
                    </>
                }
                data={filteredTenants}
                keyExtractor={(item) => item.tenantId}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
                renderItem={({ item }) => (
                    <View style={styles.tenantCard}>
                        <View style={styles.tenantHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tName}>{item.tenantName}▫️ {today}</Text>
                                <Text style={styles.tSub}>₹{item.totalBill.toFixed(0)} • {item.units} kWh</Text>
                            </View>
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.miniBtn, { backgroundColor: '#F0F2FF' }]}
                                    onPress={() => handleView(item)}
                                >
                                    {loadingId.id === item.tenantId && loadingId.type === 'view' ? (
                                        <ActivityIndicator size="small" color="#333399" />
                                    ) : (
                                        <MaterialCommunityIcons name="eye" size={22} color="#333399" />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.miniBtn, { backgroundColor: '#E8F5E9' }]}
                                    onPress={() => handleShare(item)}
                                >
                                    {loadingId.id === item.tenantId && loadingId.type === 'share' ? (
                                        <ActivityIndicator size="small" color="#4CAF50" />
                                    ) : (
                                        <MaterialCommunityIcons name="share-variant" size={22} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.miniBtn, { backgroundColor: '#FFF7ED' }]}
                                    onPress={() => handleSaveStatement(item)}
                                >
                                    <MaterialCommunityIcons name="content-save" size={22} color="#FB923C" />
                                </TouchableOpacity>

                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="account-search-outline" size={60} color="#E5E7EB" />
                        <Text style={styles.emptyText}>No matching tenants found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF' },
    backCircle: { backgroundColor: '#F5F5F5', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1C3D' },
    saveBtn: { padding: 5 },

    searchContainer: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    searchBox: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 45, alignItems: 'center' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1F2937' },

    tenantCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    tName: { fontSize: 16, fontWeight: 'bold', color: '#1A1C3D' },
    dateBadge: { backgroundColor: '#333399', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    dateBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#FFF' },
    tSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

    actionRow: { flexDirection: 'row', gap: 10 },
    miniBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // Progress Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center' },
    progressText: { fontSize: 18, fontWeight: 'bold', marginTop: 15 },
    progressSub: { fontSize: 14, color: '#666', marginTop: 5 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9CA3AF', fontWeight: 'bold' }

});

export default StatementScreen;