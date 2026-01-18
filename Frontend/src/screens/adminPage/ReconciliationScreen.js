import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, Alert, StatusBar, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReconciliationScreen = ({ route, navigation }) => {
    const { user } = useContext(UserContext);

    const startDate = useMemo(() =>
        route.params?.startDate ? new Date(route.params.startDate) : new Date(),
        [route.params?.startDate]);

    const endDate = useMemo(() =>
        route.params?.endDate ? new Date(route.params.endDate) : new Date(),
        [route.params?.endDate]);

    const [loading, setLoading] = useState(true);
    const [reconData, setReconData] = useState({
        gridUnits: 0, gridAmount: 0, solarUnits: 0, dgUnits: 0, dgCost: 0,
        totalTenantUnits: 0, netToAllocate: 0, commonLoss: 0, lossPercent: 0
    });
    const [tenantBreakdown, setTenantBreakdown] = useState([]);
    
    // 🟢 Toggle States
    const [disabledDgIds, setDisabledDgIds] = useState([]);
    const [disabledLossIds, setDisabledLossIds] = useState([]); // Transformer Loss के लिए

    const adminId = user?._id || user?.id;

    // 🔄 DG On/Off फंक्शन
    const toggleDgCharge = (tenantId) => {
        setDisabledDgIds(prev =>
            prev.includes(tenantId) ? prev.filter(id => id !== tenantId) : [...prev, tenantId]
        );
    };

    // 🔄 Loss On/Off फंक्शन
    const toggleLossCharge = (tenantId) => {
        setDisabledLossIds(prev =>
            prev.includes(tenantId) ? prev.filter(id => id !== tenantId) : [...prev, tenantId]
        );
    };

    const calculateReconciliation = useCallback(async () => {
        if (!adminId) return;
        setLoading(true);
        try {
            const dateParams = {
                from: startDate.toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0]
            };

            const [billRes, solarRes, dgRes, tenantRes] = await Promise.allSettled([
                axios.get(`${API_URL}/bill/history/${adminId}`),
                axios.get(`${API_URL}/solar/history/${adminId}`),
                axios.get(`${API_URL}/dg/dgsummary/${adminId}`, { params: dateParams }),
                axios.get(`${API_URL}/reconcile/range-summary/${adminId}`, { params: dateParams })
            ]);

            const grid = billRes.status === 'fulfilled' ? (billRes.value.data?.[0]?.totalUnits || 0) : 0;
            const gridAmt = billRes.status === 'fulfilled' ? (billRes.value.data?.[0]?.totalAmount || 0) : 0;
            const solar = solarRes.status === 'fulfilled' ? (solarRes.value.data?.[0]?.unitsGenerated || 0) : 0;
            const dgU = dgRes.status === 'fulfilled' && dgRes.value.data?.dgSummary ? dgRes.value.data.dgSummary.reduce((sum, d) => sum + (Number(d.totalUnits) || 0), 0) : 0;
            const dgC = dgRes.status === 'fulfilled' && dgRes.value.data?.dgSummary ? dgRes.value.data.dgSummary.reduce((sum, d) => sum + (Number(d.totalCost) || 0), 0) : 0;

            let totalTenantUnitsSum = 0;
            let calculatedTenants = [];

            if (tenantRes.status === 'fulfilled' && Array.isArray(tenantRes.value.data)) {
                calculatedTenants = tenantRes.value.data.map(t => {
                    const diff = Number(t.closing) - Number(t.opening);
                    const ct = Number(t.multiplierCT || 1);
                    const units = diff * ct;
                    const rate = Number(t.ratePerUnit || 10.2);
                    const amount = units * rate;
                    const fixed = Number(t.fixedCharge || 0);
                    
                    // 🔴 Transformer Loss Logic (Toggle check)
                    const isLossDisabled = disabledLossIds.includes(t.tenantId);
                    const transLoss = isLossDisabled 
                        ? 0 
                        : (amount + fixed) * (Number(t.transformerLoss || 0) / 100);

                    // 🔵 DG Charge Logic (Toggle check)
                    const isDgDisabled = disabledDgIds.includes(t.tenantId);
                    const dgCharge = (t.connectedDG && t.connectedDG !== "None" && !isDgDisabled)
                        ? (units * 1)
                        : 0;

                    const totalBill = amount + fixed + transLoss + dgCharge;
                    totalTenantUnitsSum += diff;

                    return {
                        ...t, units, amount, fixed, transLoss, dgCharge, totalBill,
                        isDgDisabled, isLossDisabled
                    };
                });
            }

            const totalInput = Number(grid) - Number(solar) + Number(dgU);
            const loss = totalInput - totalTenantUnitsSum;
            const lossP = totalInput > 0 ? ((loss / totalInput) * 100).toFixed(1) : 0;

            setReconData({
                gridUnits: grid, gridAmount: gridAmt, solarUnits: solar,
                dgUnits: dgU, dgCost: dgC, totalTenantUnits: totalTenantUnitsSum,
                netToAllocate: totalInput, commonLoss: loss, lossPercent: lossP,
            });
            setTenantBreakdown(calculatedTenants);

        } catch (e) {
            console.error("Calculation Error:", e);
        } finally {
            setLoading(false);
        }
    }, [adminId, startDate, endDate, disabledDgIds, disabledLossIds]); // 👈 Dependencies added here

    useEffect(() => {
        calculateReconciliation();
    }, [calculateReconciliation]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color="#FFF" />
                </TouchableOpacity>
                <View style={{ marginLeft: 15 }}>
                    <Text style={styles.headerTitle}>Final Reconciliation</Text>
                    <Text style={styles.headerSub}>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#333399" /></View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    <View style={styles.mainCard}>
                        <Row label="Grid Units" value={reconData.gridUnits} icon="flash" color="#333399" />

                         <Row label="Bill Amount" value={reconData.gridAmount} icon="flash" color="#333399" />
                         <Row label="Fixed Charged" value={reconData.gridAmount} icon="flash" color="#333399" />
                        <Row label="Tenant Total Units" value={reconData.totalTenantUnits.toFixed(1)} icon="account-group" color="#4F46E5" bold />
                         <Row label="Solar Sum" value={reconData.solarUnits} icon="account-group" color="#f7eb01ff" bold />
                        <View style={styles.darkDivider} />
                        <View style={styles.lossRow}>
                            <View><Text style={styles.lossLabel}>System Loss</Text><Text style={styles.lossValue}>{reconData.commonLoss.toFixed(1)} kWh</Text></View>
                            <Text style={[styles.lossPercent, { color: reconData.lossPercent > 12 ? '#DC2626' : '#059669' }]}>{reconData.lossPercent}%</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Tenant Invoices</Text>

                    {tenantBreakdown.map((item, index) => (
                        <View key={index} style={styles.tenantCard}>
                            <View style={styles.tenantHeader}>
                                <Text style={styles.tenantNameText}>{item.tenantName}</Text>
                                <Text style={styles.totalBadge}>₹ {item.totalBill.toFixed(0)}</Text>
                            </View>

                            <View style={styles.detailGrid}>
                                <DetailItem label="Opening" value={item.opening} />
                                <DetailItem label="Closing" value={item.closing} />
                                <DetailItem label="Net Units" value={item.units} bold />
                            </View>

                            <View style={styles.divider} />
                            
                            <View style={styles.priceRow}>
                                <PriceItem label="Energy Amount" val={item.amount} />
                                <PriceItem label="Fixed Charge" val={item.fixed} />
                                
                                {/* 🟠 Transformer Loss Toggle */}
                                <TouchableOpacity style={styles.actionBox} onPress={() => toggleLossCharge(item.tenantId)}>
                                    <Text style={[styles.priceLabel, { color: item.isLossDisabled ? '#AAA' : '#666' }]}>Loss (%)</Text>
                                    <Text style={[styles.priceValue, { color: item.isLossDisabled ? '#CCC' : '#D97706' }]}>₹{item.transLoss.toFixed(1)}</Text>
                                    <MaterialCommunityIcons name={item.isLossDisabled ? "toggle-switch-off" : "toggle-switch"} size={18} color={item.isLossDisabled ? "#CCC" : "#4CAF50"} />
                                </TouchableOpacity>
                                
                                {/* 🔴 DG Charge Toggle */}
                                <TouchableOpacity style={styles.actionBox} onPress={() => toggleDgCharge(item.tenantId)}>
                                    <Text style={[styles.priceLabel, { color: item.isDgDisabled ? '#AAA' : '#666' }]}>DG (₹1/u)</Text>
                                    <Text style={[styles.priceValue, { color: item.isDgDisabled ? '#CCC' : '#DC2626' }]}>₹{item.dgCharge.toFixed(1)}</Text>
                                    <MaterialCommunityIcons name={item.isDgDisabled ? "toggle-switch-off" : "toggle-switch"} size={18} color={item.isDgDisabled ? "#CCC" : "#4CAF50"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            <View style={styles.footer}>
                <TouchableOpacity style={styles.btn} onPress={() => Alert.alert("Success", "Final Bills Generated.")}>
                    <Text style={styles.btnText}>GENERATE FINAL INVOICES</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ... Helper Components (Row, DetailItem, PriceItem)
const Row = ({ label, value, color = '#111827', icon, bold }) => (
    <View style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name={icon} size={16} color={color} style={{ marginRight: 8 }} />
            <Text style={[styles.rowLabel, bold && { fontWeight: 'bold' }]}>{label}</Text>
        </View>
        <Text style={[styles.rowValue, { color }, bold && { fontSize: 18, fontWeight: 'bold' }]}>{value}</Text>
    </View>
);
const DetailItem = ({ label, value, bold }) => (
    <View style={{ alignItems: 'center' }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, bold && { fontWeight: 'bold', color: '#333399' }]}>{value}</Text>
    </View>
);
const PriceItem = ({ label, val, color = '#4B5563' }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.priceLabel}>{label}</Text>
        <Text style={[styles.priceValue, { color }]}>₹{val.toFixed(1)}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { backgroundColor: '#333399', padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 4, marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, alignItems: 'center' },
    rowLabel: { fontSize: 13, color: '#4B5563' },
    rowValue: { fontSize: 15, fontWeight: '700' },
    darkDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#111827', marginLeft: 5 },
    tenantCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
    tenantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tenantNameText: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
    totalBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontWeight: 'bold', color: '#4F46E5' },
    detailGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
    detailLabel: { fontSize: 9, color: '#999', marginBottom: 2 },
    detailValue: { fontSize: 13, color: '#333' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    priceLabel: { fontSize: 8, color: '#999', marginBottom: 3, textAlign: 'center' },
    priceValue: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
    actionBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
    btn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    lossRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lossLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
    lossValue: { fontSize: 18, fontWeight: '900', color: '#333' },
    lossPercent: { fontSize: 18, fontWeight: 'bold' },
});

export default ReconciliationScreen;