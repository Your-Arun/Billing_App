import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar, TextInput, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StatementScreen = ({ route, navigation }) => {
    const { user } = useContext(UserContext);
    const { tenantBreakdown = [], startDate, endDate, summary = {} } = route.params || {};

    const [searchText, setSearchText] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [isSavingAll, setIsSavingAll] = useState(false);

    const adminId = user?._id || user?.id;
    const today = new Date().toLocaleDateString('en-IN');

    // 📅 Date String safety handling
    const currentFromDate = useMemo(() => startDate ? new Date(startDate).toLocaleDateString('en-IN') : "", [startDate]);
    const currentToDate = useMemo(() => endDate ? new Date(endDate).toLocaleDateString('en-IN') : "", [endDate]);
    
    const monthKeyDisplay = useMemo(() => {
        return endDate ? new Date(endDate).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : "";
    }, [endDate]);

    // 📄 EXACT HTML TEMPLATE (Updated with Fallbacks)
    const createHTML = (item) => {
        const fDate = item.periodFrom ? new Date(item.periodFrom).toLocaleDateString('en-IN') : currentFromDate;
        const tDate = item.periodTo ? new Date(item.periodTo).toLocaleDateString('en-IN') : currentToDate;
        const total = item.totalBill || item.totalAmount || 0;
        const energyAmt = item.amount || (Number(item.units) * (item.ratePerUnit || 10.2));

        return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Helvetica'; padding: 40px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #333399; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { color: #333399; font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
          .info-table { width: 100%; margin-bottom: 30px; }
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
          <div><h1 class="company-name">${user.companyName}</h1><p>Electricity Statement</p></div>
          <div style="text-align: right;"><div>Date:</div><b>${today}</b></div>
        </div>
        <table class="info-table">
          <tr>
            <td><div>Bill To:</div><div class="info-val">${item.tenantName}</div><div>Meter: ${item.meterId}</div></td>
            <td style="text-align: right;"><div>Billing Period</div><div class="info-val">${fDate} - ${tDate}</div></td>
          </tr>
        </table>
        <div class="reading-card">
          <div class="reading-item"><span>Opening</span><b>${Number(item.opening || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Closing</span><b>${Number(item.closing || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Units</span><b>${Number(item.units).toFixed(2)}</b></div>
        </div>
        <table class="items-table">
          <thead><tr><th>Description</th><th style="text-align: center;">Rate Info</th><th style="text-align: right;">Amt (₹)</th></tr></thead>
          <tbody>
            <tr><td>Energy Consumption</td><td style="text-align: center;">₹${Number(item.ratePerUnit || 10.20).toFixed(2)}</td><td style="text-align: right;">${Number(energyAmt).toFixed(2)}</td></tr>
            <tr><td>Fixed Charges</td><td style="text-align: center;">Standard</td><td style="text-align: right;">${Number(item.fixed || 0).toFixed(2)}</td></tr>
            <tr><td>Loss (${item.transformerLoss || 0}%)</td><td style="text-align: center;">Shared</td><td style="text-align: right;">${Number(item.transLoss || 0).toFixed(2)}</td></tr>
            <tr><td>Generator (DG)</td><td style="text-align: center;">${item.isDgDisabled ? 'OFF' : '₹1.00'}</td><td style="text-align: right;">${Number(item.dgCharge || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td colspan="2" style="text-align: right;">Grand Total (Rounded)</td><td style="text-align: right; color: #333399;">₹ ${Math.round(total).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>`;
    };

    // 🔄 Fetch Logic
    const fetchHistory = useCallback(async () => {
        if (!adminId) return;
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API_URL}/statement/history/${adminId}`);
            setHistory(res.data || []);
            await AsyncStorage.setItem(`statement_history_cache_${adminId}`, JSON.stringify(res.data));
        } catch (e) { console.log("History error", e); }
        finally { setLoadingHistory(false); }
    }, [adminId]);

    const loadCache = useCallback(async () => {
        if (!adminId) return;
        try {
            const cached = await AsyncStorage.getItem(`statement_history_cache_${adminId}`);
            if (cached) { setHistory(JSON.parse(cached)); setLoadingHistory(false); }
        } catch (e) { console.log("Cache Error", e); }
    }, [adminId]);

    useEffect(() => { loadCache(); fetchHistory(); }, [loadCache, fetchHistory]);

    // 🔍 Search Filters
    const filteredCurrent = useMemo(() => tenantBreakdown.filter(t => t.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, tenantBreakdown]);
    const filteredHistory = useMemo(() => history.filter(h => h.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, history]);

    // 👁️ VIEW & PRINT (Works for both lists)
    const handleViewPrint = async (item) => {
        try {
            const html = createHTML(item);
            await Print.printAsync({ html });
        } catch (e) { Alert.alert("Error", "Could not preview PDF"); }
    };

    // 💾 SEQUENTIAL BULK SAVE
    const handleSaveAll = async () => {
        if (tenantBreakdown.length === 0) return;
        Alert.alert("Save All", `Generate ${tenantBreakdown.length} invoices?`, [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Yes, Save All", 
                onPress: async () => {
                    setIsSavingAll(true);
                    try {
                        const totalColl = tenantBreakdown.reduce((acc, curr) => acc + curr.totalBill, 0);
                        const profit = Math.round(totalColl - (summary?.gridAmount || 0));

                        await axios.post(`${API_URL}/statement/save-summary`, {
                            adminId, month: monthKeyDisplay, dateRange: `${currentFromDate} - ${currentToDate}`,
                            gridUnits: summary?.gridUnits, gridAmount: summary?.gridAmount, profit
                        });

                        for (const item of tenantBreakdown) {
                            const html = createHTML(item);
                            await axios.post(`${API_URL}/statement/save`, {
                                adminId, tenantId: item.tenantId, tenantName: item.tenantName,
                                meterId: item.meterId, periodFrom: startDate, periodTo: endDate,
                                units: item.units, totalAmount: Math.round(item.totalBill), htmlContent: html,
                                opening: item.opening, closing: item.closing, multiplierCT: item.multiplierCT,
                                ratePerUnit: item.ratePerUnit, transformerLoss: item.transformerLoss,
                                fixed: item.fixed, transLoss: item.transLoss, dgCharge: item.dgCharge
                            });
                        }
                        Toast.show({ type: 'success', text1: 'All Invoices Saved! 📚' });
                        fetchHistory();
                    } catch (e) { Alert.alert("Error", "Bulk save failed."); }
                    finally { setIsSavingAll(false); }
                }
            }
        ]);
    };

    const handleShareHistory = async (item) => {
        if (!item.pdfUrl) return Alert.alert("Error", "No PDF found");
        setActionLoading(item._id);
        try {
            const fileName = `Bill_${item.tenantName.replace(/\s+/g, '_')}.pdf`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            const download = await FileSystem.downloadAsync(item.pdfUrl, fileUri);
            await Sharing.shareAsync(download.uri);
        } catch (e) { Alert.alert("Error", "Share failed"); }
        finally { setActionLoading(null); }
    };

    const handleDelete = (item) => {
        Alert.alert("Delete", "Permanently remove?", [
            { text: "Cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                setActionLoading(item._id);
                try {
                    await axios.delete(`${API_URL}/statement/delete/${item._id}`);
                    fetchHistory();
                } finally { setActionLoading(null); }
            }}
        ]);
    };

    const renderHeader = () => (
        <View style={{ marginBottom: 10 }}>
            {filteredCurrent.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ready for Billing</Text>
                        <TouchableOpacity style={styles.saveAllBtn} onPress={handleSaveAll} disabled={isSavingAll}>
                            {isSavingAll ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveAllText}>SAVE ALL</Text>}
                        </TouchableOpacity>
                    </View>
                    {filteredCurrent.map(item => (
                        <View key={item.tenantId} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tName}>{item.tenantName}</Text>
                                <Text style={styles.tSub}>₹{Math.round(item.totalBill)} • {Number(item.units).toFixed(1)} kWh</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleViewPrint(item)} style={styles.iconBtn}>
                                <MaterialCommunityIcons name="printer-eye" size={24} color="#333399" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </>
            )}
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
                <Text style={styles.sectionTitle}>Saved History</Text>
                <MaterialCommunityIcons name="history" size={22} color="#666" />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><MaterialCommunityIcons name="chevron-left" size={30} color="#333" /></TouchableOpacity>
                <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={22} color="#999" />
                    <TextInput placeholder="Search tenant..." style={styles.searchInput} value={searchText} onChangeText={setSearchText} />
                </View>
            </View>

            <FlatList
                data={filteredHistory}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={fetchHistory} tintColor="#333399" />}
                renderItem={({ item }) => (
                    <View style={styles.historyCard}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <Text style={styles.hName}>{item.tenantName}</Text>
                                <View style={styles.dateTag}><Text style={styles.dateTagText}>{new Date(item.periodTo).toLocaleDateString('en-IN', {month:'short', day:'2-digit'})}</Text></View>
                            </View>
                            <Text style={styles.tSub}>₹{item.totalAmount} • {item.units} kWh</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={() => handleViewPrint(item)} style={styles.pdfBtn}>
                                <MaterialCommunityIcons name="eye-outline" size={26} color="#333399" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleShareHistory(item)} style={styles.pdfBtn}>
                                {actionLoading === item._id ? <ActivityIndicator size="small" color="#4CAF50" /> : <MaterialCommunityIcons name="share-variant" size={26} color="#4CAF50" />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.pdfBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={26} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loadingHistory && <Text style={styles.empty}>No history found.</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFF', elevation: 2 },
    backCircle: { backgroundColor: '#F5F5F5', borderRadius: 25, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#F1F3F6', borderRadius: 12, paddingHorizontal: 12, height: 45, alignItems: 'center', marginLeft: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#4B5563' },
    saveAllBtn: { backgroundColor: '#333399', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    saveAllText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', elevation: 2 },
    historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#DC2626', elevation: 1 },
    tName: { fontSize: 15, fontWeight: 'bold', color: '#1A1C3D' },
    hName: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    tSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    dateTag: { backgroundColor: '#bbbecdff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 8, marginRight:100 },
    dateTagText: { fontSize: 9, fontWeight: 'bold', color: '#333399' },
    actionRow: { flexDirection: 'row', gap: 5 },
    iconBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F0F2FF' },
    pdfBtn: { padding: 8 },
    empty: { textAlign: 'center', marginTop: 50, color: '#9CA3AF', fontWeight: 'bold' }
});

export default StatementScreen;