import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar, TextInput, Linking, RefreshControl, ScrollView
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
    const [companySummary, setCompanySummary] = useState([]);

    const adminId = user?._id || user?.id;
    const today = new Date().toLocaleDateString('en-IN');
    const currentFromDate = startDate ? new Date(startDate).toLocaleDateString('en-IN') : "";
    const currentToDate = endDate ? new Date(endDate).toLocaleDateString('en-IN') : "";
    const monthKeyDisplay = endDate ? new Date(endDate).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : "";

    // 📄 HTML Generator Logic
    const createHTML = (item) => {
        const fDate = item.periodFrom ? new Date(item.periodFrom).toLocaleDateString('en-IN') : currentFromDate;
        const tDate = item.periodTo ? new Date(item.periodTo).toLocaleDateString('en-IN') : currentToDate;
        const energyAmt = Number(item.amount || (item.units * (item.ratePerUnit || 10.2)));
        const total = item.totalBill || item.totalAmount || 0;

        return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Helvetica'; padding: 40px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #333399; padding-bottom: 20px; }
          .company-name { color: #333399; font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
          .reading-card { background: #f8f9ff; border-radius: 10px; padding: 20px; display: flex; justify-content: space-between; margin: 20px 0; border: 1px solid #e0e7ff; }
          .reading-item { text-align: center; flex: 1; }
          .reading-item b { font-size: 18px; color: #333399; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background: #333399; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .total-row { background: #f3f4f6; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div><h1 class="company-name">${user.companyName}</h1><p>Electricity Statement</p></div>
          <div style="text-align: right;"><div>Date:</div><b>${today}</b></div>
        </div>
        <table style="width: 100%; margin-top: 20px;">
          <tr>
            <td><b>Bill To:</b><br/>${item.tenantName}<br/>Meter: ${item.meterId}</td>
            <td style="text-align: right;"><b>Period:</b><br/>${fDate} - ${tDate}</td>
          </tr>
        </table>
        <div class="reading-card">
          <div class="reading-item"><span>Opening</span><br/><b>${Number(item.opening || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Closing</span><br/><b>${Number(item.closing || 0).toFixed(2)}</b></div>
          <div class="reading-item"><span>Units</span><br/><b>${Number(item.units).toFixed(2)}</b></div>
        </div>
        <table>
          <thead><tr><th>Description</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
          <tbody>
            <tr><td>Energy Consumption (₹${Number(item.ratePerUnit || 10.20).toFixed(2)}/u)</td><td style="text-align: right;">${energyAmt.toFixed(2)}</td></tr>
            <tr><td>Fixed Charges</td><td style="text-align: right;">${Number(item.fixed || 0).toFixed(2)}</td></tr>
            <tr><td>Transformer Loss</td><td style="text-align: right;">${Number(item.transLoss || 0).toFixed(2)}</td></tr>
            <tr><td>Generator (DG)</td><td style="text-align: right;">${Number(item.dgCharge || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Grand Total (Rounded)</td><td style="text-align: right; color: #333399;">₹ ${Math.round(total).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>`;
    };

    const fetchHistory = useCallback(async () => {
        if (!adminId) return;
        try {
            const res = await axios.get(`${API_URL}/statement/history/${adminId}`);
            setHistory(res.data || []);
        } catch (e) { console.log("History error"); }
        finally { setLoadingHistory(false); }
    }, [adminId]);

    const fetchCompanySummary = useCallback(async () => {
        if (!adminId) return;
        try {
            const res = await axios.get(`${API_URL}/statement/company-summary/${adminId}`);
            setCompanySummary(res.data || []);
        } catch (e) { console.log("Summary fetch failed"); }
    }, [adminId]);

    useEffect(() => {
        fetchHistory();
        fetchCompanySummary();
    }, [fetchHistory, fetchCompanySummary]);

    const filteredCurrent = useMemo(() => tenantBreakdown.filter(t => t.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, tenantBreakdown]);
    const filteredHistory = useMemo(() => history.filter(h => h.tenantName.toLowerCase().includes(searchText.toLowerCase())), [searchText, history]);

    const handleSaveAll = async () => {
        if (tenantBreakdown.length === 0) return;
        Alert.alert("Save All Invoices", `Generate and save ${tenantBreakdown.length} invoices?`, [
            { text: "Cancel" },
            {
                text: "Yes, Save All",
                onPress: async () => {
                    setIsSavingAll(true);
                    try {
                        const totalTenantAmountSum = tenantBreakdown.reduce((acc, curr) => acc + curr.totalBill, 0);
                        const profit = Math.round(totalTenantAmountSum - (summary?.gridAmount || 0));

                        const savePromises = tenantBreakdown.map(item => {
                            const html = createHTML(item);
                            return axios.post(`${API_URL}/statement/save`, {
                                adminId, tenantId: item.tenantId, tenantName: item.tenantName,
                                meterId: item.meterId, periodFrom: startDate, periodTo: endDate,
                                units: item.units, totalAmount: Math.round(item.totalBill), htmlContent: html,
                                opening: item.opening, closing: item.closing, multiplierCT: item.multiplierCT,
                                ratePerUnit: item.ratePerUnit, transformerLoss: item.transformerLoss,
                                fixed: item.fixed, transLoss: item.transLoss, dgCharge: item.dgCharge,
                                gridUnits: summary?.gridUnits, gridAmount: summary?.gridAmount,
                                gridFixedPrice: summary?.gridFixedPrice, solarUnits: summary?.solarUnits,
                                totalTenantUnitsSum: summary?.totalTenantUnitsSum,
                                totalTenantAmountSum: Math.round(totalTenantAmountSum),
                                commonLoss: summary?.commonLoss, lossPercent: summary?.lossPercent,
                                profit: profit, month: monthKeyDisplay,
                                dateRange: `${currentFromDate} - ${currentToDate}`
                            });
                        });
                        await Promise.all(savePromises);
                        Toast.show({ type: 'success', text1: 'All Saved! 📚' });
                        fetchHistory();
                        fetchCompanySummary();
                    } catch (e) { Alert.alert("Error", "Bulk save failed."); }
                    finally { setIsSavingAll(false); }
                }
            }
        ]);
    };

    const handleViewPrint = async (item) => {
        try {
            const html = item.htmlContent || createHTML(item);
            await Print.printAsync({ html });
        } catch (e) { Alert.alert("Error", "Could not preview PDF"); }
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
        Alert.alert("Delete", "Permanently Delete?", [
            { text: "Cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    setActionLoading(item._id);
                    try {
                        await axios.delete(`${API_URL}/statement/delete/${item._id}`);
                        fetchHistory();
                        fetchCompanySummary();
                    } finally { setActionLoading(null); }
                }
            }
        ]);
    };

    // Sub-Components for UI
    const BizItem = ({ label, val, icon, color }) => (
        <View style={styles.bizItem}>
            <MaterialCommunityIcons name={icon} size={16} color={color} />
            <Text style={styles.bizItemVal}>{val}</Text>
            <Text style={styles.bizItemLabel}>{label}</Text>
        </View>
    );

    const BusinessSummaryCard = ({ data }) => (
        <View style={styles.bizCard}>
            <View style={styles.bizHeader}>
                <Text style={styles.bizMonth}>{data._id}</Text>
                <View style={[styles.profitBadge, { backgroundColor: data.profit >= 0 ? '#10B981' : '#EF4444' }]}>
                    <Text style={styles.profitText}>Profit: ₹{data.profit?.toFixed(0)}</Text>
                </View>
            </View>
            <View style={styles.bizGrid}>
                <BizItem label="Grid Bill" val={`₹${data.gridAmount}`} icon="flash-outline" color="#EF4444" />
                <BizItem label="Collection" val={`₹${data.totalTenantAmountSum}`} icon="cash-multiple" color="#10B981" />
                <BizItem label="Solar" val={`${data.solarUnits} u`} icon="solar-power" color="#F59E0B" />
                <BizItem label="Loss" val={`${data.lossPercent}%`} icon="chart-bell-curve" color="#6366F1" />
            </View>
            <Text style={styles.bizRange}>Range: {data.dateRange}</Text>
        </View>
    );

    const renderHeader = () => (
        <View>
            {/* 📈 MONTHLY INSIGHTS CARDS */}
            {companySummary.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                    <Text style={styles.sectionTitle}>Monthly Insights</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 5 }}>
                        {companySummary.map((item, index) => (
                            <BusinessSummaryCard key={index} data={item} />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ⚡ READY FOR BILLING SECTION */}
            {filteredCurrent.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ready for Billing</Text>
                        <TouchableOpacity style={styles.saveAllBtn} onPress={handleSaveAll} disabled={isSavingAll}>
                            {isSavingAll ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="content-save-all" size={18} color="#FFF" /><Text style={styles.saveAllText}>SAVE ALL</Text></>}
                        </TouchableOpacity>
                    </View>
                    {filteredCurrent.map(item => (
                        <View key={item.tenantId} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tName}>{item.tenantName}</Text>
                                <Text style={styles.tSub}>₹{Math.round(item.totalBill).toFixed(2)} • {item.units.toFixed(2)} kWh</Text>
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
                refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={() => { fetchHistory(); fetchCompanySummary(); }} />}
                renderItem={({ item }) => (
                    <View style={styles.historyCard}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <Text style={styles.hName}>{item.tenantName}</Text>
                                <View style={styles.dateTag}><Text style={styles.dateTagText}>{new Date(item.periodTo).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}</Text></View>
                            </View>
                            <Text style={styles.tSub}>₹{Number(item.totalAmount).toFixed(2)} • {Number(item.units).toFixed(2)} kWh</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={() => handleViewPrint(item)} style={styles.pdfBtn}><MaterialCommunityIcons name="eye-outline" size={26} color="#333399" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleShareHistory(item)} style={styles.pdfBtn} disabled={actionLoading === item._id}>{actionLoading === item._id ? <ActivityIndicator size="small" color="#4CAF50" /> : <MaterialCommunityIcons name="share-variant" size={26} color="#4CAF50" />}</TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.pdfBtn}><MaterialCommunityIcons name="delete-outline" size={26} color="#DC2626" /></TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loadingHistory && filteredHistory.length === 0 && <Text style={styles.empty}>No statements found</Text>}
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
    saveAllBtn: { backgroundColor: '#333399', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    saveAllText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, marginLeft: 5 },
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', elevation: 2 },
    historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 10, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#DC2626', elevation: 1 },
    tName: { fontSize: 15, fontWeight: 'bold', color: '#1A1C3D' },
    hName: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    tSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    dateTag: { backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 8 },
    dateTagText: { fontSize: 9, fontWeight: 'bold', color: '#333399' },
    actionRow: { flexDirection: 'row', gap: 5 },
    iconBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F0F2FF' },
    pdfBtn: { padding: 8 },
    empty: { textAlign: 'center', marginTop: 50, color: '#9CA3AF', fontWeight: 'bold' },
    bizCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 24, width: 300, marginRight: 15, elevation: 8 },
    bizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    bizMonth: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    profitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    profitText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
    bizGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    bizItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 12, marginBottom: 8 },
    bizItemVal: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    bizItemLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '600' },
    bizRange: { color: '#64748B', fontSize: 9, marginTop: 5, fontStyle: 'italic' },
});

export default StatementScreen;