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
    const currentFromDate = startDate ? new Date(startDate).toLocaleDateString('en-IN') : "";
    const currentToDate = endDate ? new Date(endDate).toLocaleDateString('en-IN') : "";

    // 📄 HTML Generator Logic with RoundOff and 2 Decimals
    const createHTML = (item) => {
        const fDate = item.periodFrom ? new Date(item.periodFrom).toLocaleDateString('en-IN') : currentFromDate;
        const tDate = item.periodTo ? new Date(item.periodTo).toLocaleDateString('en-IN') : currentToDate;

        // 🧮 Calculations
        const energyAmt = Number(item.amount || (item.units * (item.ratePerUnit || 10.2)));
        const fixed = Number(item.fixed || 0);
        const transLoss = Number(item.transLoss || 0);
        const dgCharge = Number(item.dgCharge || 0);

        // Final Total before Round-off
        const rawTotal = energyAmt + fixed + transLoss + dgCharge;
        // 🎯 Round-off logic (e.g. 123.45 becomes 123, 123.55 becomes 124)
        const finalTotalRounded = Math.round(rawTotal);

        return `
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
          <div><h1 class="company-name">${user.companyName}</h1><p class="bill-title">Electricity Statement</p></div>
          <div style="text-align: right;"><div class="section-label">Invoice Date</div><div class="info-val">${today}</div></div>
        </div>
        <table class="info-table">
          <tr>
            <td><div class="section-label">Bill To:</div><div class="info-val">${item.tenantName}</div><div>Meter ID: ${item.meterId}</div></td>
            <td style="text-align: right;"><div class="section-label">Billing Period</div><div class="info-val">${fDate} - ${tDate}</div></td>
          </tr>
        </table>
        <div class="reading-card">
          <div class="reading-item"><span>Opening</span><b>${Number(item.opening || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Closing</span><b>${Number(item.closing || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Multiplier</span><b>${item.multiplierCT || item.multiplier || 1}x</b></div>
          <div class="reading-item"><span>Total Units</span><b>${Number(item.units).toFixed(2)}</b></div>
        </div>
        <table class="items-table">
          <thead><tr><th>Description</th><th style="text-align: center;">Rate/Loss</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
          <tbody>
            <tr><td>Energy Consumption</td><td style="text-align: center;">₹${Number(item.ratePerUnit || 10.20).toFixed(2)}</td><td style="text-align: right;">${energyAmt.toFixed(2)}</td></tr>
            <tr><td>Fixed Charges</td><td style="text-align: center;">Fixed</td><td style="text-align: right;">${fixed.toFixed(2)}</td></tr>
            <tr><td>Transformer Loss</td><td style="text-align: center;">${item.transformerLoss || 0}%</td><td style="text-align: right;">${transLoss.toFixed(2)}</td></tr>
            <tr><td>Generator (DG)</td><td style="text-align: center;">${item.isDgDisabled ? 'OFF' : '₹1.00'}</td><td style="text-align: right;">${dgCharge.toFixed(2)}</td></tr>
            <tr class="total-row"><td colspan="2" style="text-align: right;">Grand Total (Rounded)</td><td style="text-align: right; color: #333399;">₹ ${finalTotalRounded.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>`;
    };

    const fetchHistory = useCallback(async () => {
        if (!adminId) return;
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API_URL}/statement/history/${adminId}`);
            setHistory(res.data || []);
        } catch (e) { console.log("History error"); }
        finally { setLoadingHistory(false); }
    }, [adminId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const filteredCurrent = useMemo(() => tenantBreakdown.filter(t => t.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, tenantBreakdown]);
    const filteredHistory = useMemo(() => history.filter(h => h.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, history]);

    const handleViewPrint = async (item) => {
        try {
            const html = createHTML(item);
            await Print.printAsync({ html });
        } catch (e) { Alert.alert("Error", "Could not preview PDF"); }
    };

    const handleSaveAll = async () => {
        if (tenantBreakdown.length === 0) return;
        Alert.alert(
            "Save All Invoices",
            `Generate ${tenantBreakdown.length} invoices with Round-Off?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Save All",
                    onPress: async () => {
                        setIsSavingAll(true);
                        try {
                            const savePromises = tenantBreakdown.map(item => {
                                const html = createHTML(item);

                                const roundedTotal = Math.round(item.totalBill);
                                return axios.post(`${API_URL}/statement/save`, {
                                    adminId, tenantId: item.tenantId, tenantName: item.tenantName,
                                    meterId: item.meterId, periodFrom: startDate, periodTo: endDate,
                                    units: item.units, totalAmount: roundedTotal, htmlContent: html,
                                    opening: item.opening, closing: item.closing, multiplierCT: item.multiplierCT,
                                    ratePerUnit: item.ratePerUnit, transformerLoss: item.transformerLoss,
                                    fixed: item.fixed, transLoss: item.transLoss, dgCharge: item.dgCharge,
                                    gridUnits: summary?.gridUnits || 0,
                                    gridAmount: summary?.gridAmount || 0,
                                    gridFixedPrice: summary?.gridFixedPrice || 0,
                                    solarUnits: summary?.solarUnits || 0,
                                    totalTenantUnitsSum: summary?.totalTenantUnitsSum || 0,
                                    totalTenantAmountSum: summary?.totalTenantAmountSum || 0,
                                    commonLoss: summary?.commonLoss || 0,
                                    lossPercent: summary?.lossPercent || 0,
                                    profit: summary?.profit || 0,
                                });
                            });
                            await Promise.all(savePromises);
                            Toast.show({ type: 'success', text1: 'All Invoices Saved! 📚' });
                            fetchHistory();
                        } catch (e) {
                            Alert.alert("Error", "Bulk save failed.");
                            console.log(e)
                        } finally {
                            setIsSavingAll(false);
                        }
                    }
                }
            ]
        );
    };

    const handleShareHistory = async (item) => {
        if (!item.pdfUrl) return Alert.alert("Error", "PDF link not available");
        setActionLoading(item._id);
        try {
            const fileName = `Invoice_${item.tenantName.replace(/\s+/g, '_')}.pdf`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            const download = await FileSystem.downloadAsync(item.pdfUrl, fileUri);
            await Sharing.shareAsync(download.uri);
        } catch (e) { Alert.alert("Error", "Share failed"); }
        finally { setActionLoading(null); }
    };

    const handleDelete = (item) => {
        Alert.alert("Delete", "Permanently Deleted?", [
            { text: "Cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    setActionLoading(item._id);
                    try {
                        await axios.delete(`${API_URL}/statement/delete/${item._id}`);
                        fetchHistory();
                    } finally { setActionLoading(null); }
                }
            }
        ]);
    };

    const renderHeader = () => (
        <View style={{ marginBottom: 10 }}>
            {filteredCurrent.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ready for Billing</Text>
                        <TouchableOpacity style={styles.saveAllBtn} onPress={handleSaveAll} disabled={isSavingAll}>
                            {isSavingAll ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="content-save-all" size={20} color="#FFF" /><Text style={styles.saveAllText}>SAVE ALL</Text></>}
                        </TouchableOpacity>
                    </View>
                    {filteredCurrent.map(item => (
                        <View key={item.tenantId} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tName}>{item.tenantName}</Text>
                                {/* 🎯 Display Rounded Total with 2 decimals in List */}
                                <Text style={styles.tSub}>₹{Math.round(item.totalBill).toFixed(2)} • {item.units.toFixed(2)} kWh</Text>
                            </View>
                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={() => handleViewPrint(item)} style={styles.iconBtn}>
                                    <MaterialCommunityIcons name="printer-eye" size={24} color="#333399" />
                                </TouchableOpacity>
                            </View>
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
                refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={fetchHistory} />}
                renderItem={({ item }) => (
                    <View style={styles.historyCard}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <Text style={styles.hName}>{item.tenantName}</Text>
                                <View style={styles.dateTag}><Text style={styles.dateTagText}>{new Date(item.periodTo).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}</Text></View>
                            </View>
                            {/* 🎯 History display also with 2 decimals */}
                            <Text style={styles.tSub}>₹{Number(item.totalAmount).toFixed(2)} • {Number(item.units).toFixed(2)} kWh</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={() => handleShareHistory(item)} style={styles.pdfBtn}>{actionLoading === item._id ? <ActivityIndicator size="small" color="#4CAF50" /> : <MaterialCommunityIcons name="share-variant" size={26} color="#4CAF50" />}</TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.pdfBtn}><MaterialCommunityIcons name="delete-outline" size={26} color="#DC2626" /></TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

// ... Styles remains the same ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFF', elevation: 2 },
    backCircle: { backgroundColor: '#F5F5F5', borderRadius: 25, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#F1F3F6', borderRadius: 12, paddingHorizontal: 12, height: 45, alignItems: 'center', marginLeft: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#4B5563' },
    saveAllBtn: { backgroundColor: '#333399', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    saveAllText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, marginLeft: 5 },
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', elevation: 2, marginHorizontal: 0 },
    historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#DC2626', elevation: 1 },
    tName: { fontSize: 15, fontWeight: 'bold', color: '#1A1C3D' },
    hName: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    tSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    dateTag: { backgroundColor: '#bbbecdff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginRight: 160 },
    dateTagText: { fontSize: 9, fontWeight: 'bold', color: '#333399' },
    actionRow: { flexDirection: 'row', gap: 5 },
    iconBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F0F2FF' },
    pdfBtn: { padding: 8 },
    empty: { textAlign: 'center', marginTop: 50, color: '#9CA3AF', fontWeight: 'bold' },
    badge: { backgroundColor: '#333399', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});

export default StatementScreen;