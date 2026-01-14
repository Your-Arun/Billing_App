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
    
    // Dates from Navigation (String to Date object conversion)
    const startDate = useMemo(() => 
        route.params?.startDate ? new Date(route.params.startDate) : new Date(), 
    [route.params?.startDate]);

    const endDate = useMemo(() => 
        route.params?.endDate ? new Date(route.params.endDate) : new Date(), 
    [route.params?.endDate]);

    const [loading, setLoading] = useState(true);
    const [reconData, setReconData] = useState({
        gridUnits: 0, 
        solarUnits: 0, 
        dgUnits: 0, 
        dgCost: 0,
        totalTenantUnits: 0, // Isme 'Spikes' ka sum aayega
        netToAllocate: 0, 
        commonLoss: 0, 
        lossPercent: 0
    });

    const adminId = user?._id || user?.id;

    const calculateReconciliation = useCallback(async () => {
        if (!adminId) return;

        setLoading(true);
        try {
            const dateParams = { 
                from: startDate.toISOString().split('T')[0], 
                to: endDate.toISOString().split('T')[0] 
            };

            // Calling APIs
            const [billRes, solarRes, dgRes, tenantRes] = await Promise.allSettled([
                axios.get(`${API_URL}/bill/history/${adminId}`),
                axios.get(`${API_URL}/solar/history/${adminId}`),
                axios.get(`${API_URL}/dg/dgsummary/${adminId}`, { params: dateParams }),
                axios.get(`${API_URL}/reconcile/range-summary/${adminId}`, { params: dateParams })
            ]);

            // Data Extraction
            const grid = billRes.status === 'fulfilled' ? (billRes.value.data?.[0]?.totalUnits || 0) : 0;
            const gridAmt = billRes.status === 'fulfilled' ? (billRes.value.data?.[0]?.totalAmount || 0) : 0;
            const solar = solarRes.status === 'fulfilled' ? (solarRes.value.data?.[0]?.unitsGenerated || 0) : 0;
            
            let dgU = 0, dgC = 0;
            if (dgRes.status === 'fulfilled' && dgRes.value.data?.dgSummary) {
                dgU = dgRes.value.data.dgSummary.reduce((sum, d) => sum + (Number(d.totalUnits) || 0), 0);
                dgC = dgRes.value.data.dgSummary.reduce((sum, d) => sum + (Number(d.totalCost) || 0), 0);
            }

            // ✅ LOGIC: Backend se aane wale 'spike' ka sum
            let tenantTotalSpike = 0;
            if (tenantRes.status === 'fulfilled' && Array.isArray(tenantRes.value.data)) {
                tenantTotalSpike = tenantRes.value.data.reduce((sum, t) => {
                    // Backend se 'spike' key aa rahi hai (closing - opening)
                    return sum + (Number(t.spike) || 0);
                }, 0);
            }

            // Calculations: Input = Grid + Solar + DG
            const totalInput = Number(grid) + Number(solar) + Number(dgU);
            const loss = totalInput - tenantTotalSpike;
            const lossP = totalInput > 0 ? ((loss / totalInput) * 100).toFixed(1) : 0;

            setReconData({
                gridUnits: grid, 
                gridAmount: gridAmt, 
                solarUnits: solar, 
                dgUnits: dgU, 
                dgCost: dgC,
                totalTenantUnits: tenantTotalSpike,
                netToAllocate: totalInput,
                commonLoss: loss, 
                lossPercent: lossP
            });

        } catch (e) { 
            console.error("DEBUG Error:", e);
        } finally { 
            setLoading(false); 
        }
    }, [adminId, startDate, endDate]);

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
                <View style={{marginLeft: 15}}>
                    <Text style={styles.headerTitle}>Final Reconciliation</Text>
                    <Text style={styles.headerSub}>
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#333399" />
                    <Text style={{marginTop: 10, color: '#666', fontWeight: 'bold'}}>Calculating Tenant Spikes...</Text>
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={calculateReconciliation} />}
                >
                    <View style={styles.mainCard}>
                        {/* SOURCES */}
                        <Row label="Grid Units" value={reconData.gridUnits} icon="flash" color="#333399" />
                        <Row label="Grid Amount" value={reconData.gridAmount} icon="flash" color="#333399" />
                        <Row label="Solar Gen" value={reconData.solarUnits} icon="solar-power" color="#059669" />
                        <Row label="DG Backup" value={reconData.dgUnits} icon="engine" color="#DC2626" />
                        <Row label="DG Backup Cost" value={reconData.dgCost} icon="currency-inr" color="#DC2626" unit="Rs" />

                        <View style={styles.darkDivider} />
                        
                        {/* TOTALS */}
                        <Row label="TOTAL ENERGY IN" value={reconData.netToAllocate.toFixed(1)} bold />
                        
                        
                        {/* ✅ TENANT SUM (Saare spikes ka total) */}
                        <Row 
                            label="TENANT SUM (TOTAL SPIKES)" 
                            value={reconData.totalTenantUnits.toFixed(1)} 
                            bold 
                            color="#4F46E5" 
                        />
                        
                        <View style={styles.darkDivider} />
                        
                        {/* LOSS ANALYSIS */}
                        <View style={styles.lossRow}>
                            <View>
                                <Text style={styles.lossLabel}>Common Area / Maintenance</Text>
                                <Text style={styles.lossValue}>{reconData.commonLoss.toFixed(1)} kWh</Text>
                            </View>
                            <View style={[styles.lossBadge, {backgroundColor: reconData.lossPercent > 12 ? '#FEE2E2' : '#D1FAE5'}]}>
                                <Text style={[styles.lossPercentText, {color: reconData.lossPercent > 12 ? '#DC2626' : '#059669'}]}>
                                    {reconData.lossPercent}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.noteBox}>
                        <MaterialCommunityIcons name="shield-check-outline" size={18} color="#059669" />
                        <Text style={styles.noteText}>
                            Tenant sum is calculated based on individual meter spikes verified earlier.
                        </Text>
                    </View>
                </ScrollView>
            )}

            <View style={styles.footer}>
                <TouchableOpacity style={styles.btn} onPress={() => Alert.alert("Success", "Ready for Final Billing")}>
                    <Text style={styles.btnText}>GENERATE FINAL BILLS</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const Row = ({ label, value, color = '#111827', icon, bold, unit = "kWh" }) => (
    <View style={styles.row}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {icon && <MaterialCommunityIcons name={icon} size={16} color={color} style={{marginRight: 8}} />}
            <Text style={[styles.rowLabel, bold && { fontWeight: 'bold', color: '#000' }]}>{label}</Text>
        </View>
        <Text style={[styles.rowValue, { color }, bold && { fontSize: 18, fontWeight: 'bold' }]}>
            {value} <Text style={{fontSize: 10, fontWeight: 'normal'}}>{unit}</Text>
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#333399', padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, alignItems: 'center' },
    rowLabel: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
    rowValue: { fontSize: 15, fontWeight: '700' },
    darkDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
    lossRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 15 },
    lossLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold' },
    lossValue: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    lossBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    lossPercentText: { fontWeight: 'bold', fontSize: 14 },
    footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
    btn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    noteBox: { flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 15 },
    noteText: { fontSize: 12, color: '#6B7280', marginLeft: 8, fontStyle: 'italic' }
});

export default ReconciliationScreen;