import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReconciliationScreen = () => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reconcile/${user.id}`);
      setData(res.data);
    } catch (e) { console.log("Reconcile Error"); }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (loading) return <ActivityIndicator size="large" color="#333399" style={{flex:1}} />;

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSummary} />}
    >
      <View style={styles.blueHeader}>
        <Text style={styles.headerTitle}>Monthly Reconciliation</Text>
        <Text style={styles.headerSub}>Building Units Balancing</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardHeading}>UNITS SUMMARY</Text>
        
        <SummaryRow label="Main Bill Units" value={data?.mainBill?.totalUnits || 0} icon="lightning-bolt" color="#333" />
        <SummaryRow label="Solar Credited" value={`- ${data?.solarCredit}`} icon="solar-power" color="#4caf50" />
        <SummaryRow label="DG Units Added" value={`+ ${data?.dgUnits}`} icon="engine" color="#FF9800" />
        
        <View style={styles.divider} />
        
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net Units to Allocate</Text>
          <Text style={styles.netValue}>{data?.netToAllocate.toFixed(2)}</Text>
        </View>

        <SummaryRow label="Sum of Sub-meters" value={data?.totalTenantUnits} icon="speedometer" color="#333399" />

        <View style={[styles.lossBox, data?.lossPercent > 10 ? styles.lossHigh : styles.lossNormal]}>
          <View>
            <Text style={styles.lossLabel}>Common Area / Loss</Text>
            <Text style={styles.lossValue}>{data?.commonLoss.toFixed(2)} kWh ({data?.lossPercent}%)</Text>
          </View>
          <MaterialCommunityIcons 
            name={data?.lossPercent > 10 ? "alert-circle" : "check-circle"} 
            size={30} color={data?.lossPercent > 10 ? "#d32f2f" : "#4caf50"} 
          />
        </View>
      </View>

      {/* Warnings (Slide 14) */}
      <View style={styles.warningCard}>
         <Text style={styles.warningTitle}>⚠️ Flags & Warnings</Text>
         {data?.lossPercent > 10 && <Text style={styles.warningText}>• Common Loss is above 10% tolerance. Check for theft or leakage.</Text>}
         {data?.totalTenantUnits === 0 && <Text style={styles.warningText}>• No tenant readings found for this month.</Text>}
      </View>

      <TouchableOpacity style={styles.finalizeBtn} onPress={() => Alert.alert("Confirm", "Finalize and Generate PDF Bills?")}>
        <Text style={styles.finalizeBtnText}>FINALIZE & GENERATE STATEMENTS</Text>
      </TouchableOpacity>
      
      <View style={{height: 100}} />
    </ScrollView>
  );
};

const SummaryRow = ({ label, value, icon, color }) => (
  <View style={styles.row}>
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <Text style={[styles.rowValue, {color}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fd' },
  blueHeader: { backgroundColor: '#333399', padding: 25, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#ccc', fontSize: 13 },
  summaryCard: { backgroundColor: 'white', margin: 20, borderRadius: 25, padding: 20, elevation: 5 },
  cardHeading: { fontSize: 12, fontWeight: 'bold', color: '#AAA', marginBottom: 20, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  rowLabel: { marginLeft: 10, color: '#666', fontWeight: '600' },
  rowValue: { fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  netRow: { backgroundColor: '#f0f2ff', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  netLabel: { fontWeight: 'bold', color: '#333399' },
  netValue: { fontWeight: 'bold', fontSize: 18, color: '#333399' },
  lossBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, marginTop: 10 },
  lossNormal: { backgroundColor: '#e8f5e9' },
  lossHigh: { backgroundColor: '#ffebee' },
  lossLabel: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  lossValue: { fontSize: 16, fontWeight: 'bold', marginTop: 3 },
  warningCard: { marginHorizontal: 20, padding: 15, backgroundColor: '#FFF9C4', borderRadius: 15, borderWidth: 1, borderColor: '#FBC02D' },
  warningTitle: { fontWeight: 'bold', marginBottom: 5 },
  warningText: { fontSize: 12, color: '#555', marginBottom: 5 },
  finalizeBtn: { backgroundColor: '#333399', margin: 20, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 4 },
  finalizeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default ReconciliationScreen;