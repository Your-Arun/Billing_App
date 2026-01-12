import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReconciliationScreen = () => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const adminId = user?._id || user?.id;

  // 🟢 YYYY-MM फॉर्मेट में monthKey तैयार करें
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const fetchSummary = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      // 🟢 बैकएंड रूट: /api/reconcile/:adminId?monthKey=2026-01
      const res = await axios.get(`${API_URL}/reconcile/${adminId}`, {
        params: { monthKey }
      });
      setData(res.data);
    } catch (e) {
      console.log("Reconcile Fetch Error:", e.response?.data || e.message);
      Alert.alert("Error", "Could not fetch reconciliation data for this month.");
    } finally {
      setLoading(false);
    }
  }, [adminId, monthKey]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleFinalize = () => {
    Alert.alert(
      "Finalize Month",
      `Are you sure you want to finalize ${monthName}? This will lock all readings and prepare final bills.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Finalize", onPress: () => console.log("Finalizing...") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* --- SMART HEADER --- */}
      <View style={styles.blueHeader}>
        <View>
          <Text style={styles.headerTitle}>Reconciliation</Text>
          <TouchableOpacity 
            style={styles.monthSelector} 
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.headerSub}>{monthName}</Text>
            <MaterialCommunityIcons name="calendar-edit" size={16} color="rgba(255,255,255,0.7)" style={{marginLeft: 5}} />
          </TouchableOpacity>
        </View>
        <MaterialCommunityIcons name="calculator-variant" size={40} color="rgba(255,255,255,0.3)" />
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#333399" />
          <Text style={styles.loaderText}>Calculating Balance...</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSummary} />}
          contentContainerStyle={{paddingBottom: 100}}
        >
          {/* --- UNITS CARD --- */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>UNITS CONSUMPTION</Text>
            
            <SummaryRow label="Main AVVNL Bill" value={data?.mainBill?.totalUnits || 0} icon="lightning-bolt" color="#333" />
            <SummaryRow label="Solar Credit" value={`- ${data?.solarCredit || 0}`} icon="solar-power" color="#4caf50" />
            <SummaryRow label="DG Units Added" value={`+ ${data?.dgUnits || 0}`} icon="engine" color="#FF9800" />
            
            <View style={styles.divider} />
            
            <View style={styles.netBox}>
              <Text style={styles.netLabel}>Net Units to Distribute</Text>
              <Text style={styles.netValue}>{data?.netToAllocate || 0} <Text style={{fontSize:10}}>kWh</Text></Text>
            </View>

            <SummaryRow label="Approved Sub-meters" value={data?.totalTenantUnits || 0} icon="speedometer" color="#333399" />

            {/* --- LOSS CALCULATION --- */}
            <View style={[styles.lossBox, data?.lossPercent > 10 ? styles.lossHigh : styles.lossNormal]}>
              <View style={{flex: 1}}>
                <Text style={styles.lossLabel}>Common Area / Loss</Text>
                <Text style={styles.lossValue}>{data?.commonLoss || 0} kWh ({data?.lossPercent || 0}%)</Text>
              </View>
              <MaterialCommunityIcons 
                name={data?.lossPercent > 10 ? "alert-decagram" : "check-decagram"} 
                size={32} color={data?.lossPercent > 10 ? "#d32f2f" : "#4caf50"} 
              />
            </View>
          </View>

          {/* --- FINANCIAL IMPACT (New Section) --- */}
          <View style={styles.card}>
             <Text style={styles.cardHeading}>ESTIMATED EXTRA COSTS</Text>
             <SummaryRow label="DG Fuel Expenses" value={`₹ ${data?.dgCost || 0}`} icon="fuel" color="#d32f2f" />
             <Text style={styles.infoText}>*This cost will be divided among DG-linked tenants.</Text>
          </View>

          {/* --- WARNINGS --- */}
          {(data?.lossPercent > 10 || data?.totalTenantUnits === 0) && (
            <View style={styles.warningCard}>
              <View style={styles.rowInline}>
                <MaterialCommunityIcons name="alert-outline" size={20} color="#856404" />
                <Text style={styles.warningTitle}>Analysis Warnings</Text>
              </View>
              {data?.lossPercent > 10 && <Text style={styles.warningText}>• High common loss detected ({data?.lossPercent}%). Check for leakage.</Text>}
              {data?.totalTenantUnits === 0 && <Text style={styles.warningText}>• No approved tenant readings for this period.</Text>}
            </View>
          )}

          <TouchableOpacity style={styles.finalizeBtn} onPress={handleFinalize}>
            <MaterialCommunityIcons name="file-check" size={22} color="white" />
            <Text style={styles.finalizeBtnText}>FINALIZE & GENERATE BILLS</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

// Reusable Summary Component
const SummaryRow = ({ label, value, icon, color }) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <Text style={[styles.rowValue, {color}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  blueHeader: { backgroundColor: '#333399', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loaderText: { marginTop: 10, color: '#666', fontWeight: 'bold' },

  card: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 20, borderRadius: 25, padding: 20, elevation: 4, shadowColor: '#333399', shadowOpacity: 0.1, shadowRadius: 10 },
  cardHeading: { fontSize: 11, fontWeight: '900', color: '#BBB', marginBottom: 20, letterSpacing: 1 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 12, color: '#555', fontWeight: '700', fontSize: 14 },
  rowValue: { fontWeight: '900', fontSize: 16 },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  
  netBox: { backgroundColor: '#F0F2FF', padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  netLabel: { fontWeight: '900', color: '#333399', fontSize: 13 },
  netValue: { fontWeight: '900', fontSize: 20, color: '#333399' },
  
  lossBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 20, marginTop: 5 },
  lossNormal: { backgroundColor: '#E8F5E9' },
  lossHigh: { backgroundColor: '#FFEBEE' },
  lossLabel: { fontSize: 11, fontWeight: '900', color: '#666' },
  lossValue: { fontSize: 18, fontWeight: '900', marginTop: 3 },

  infoText: { fontSize: 10, color: '#999', fontStyle: 'italic', marginTop: 5 },

  warningCard: { marginHorizontal: 20, marginTop: 20, padding: 15, backgroundColor: '#FFF9C4', borderRadius: 20, borderWidth: 1, borderColor: '#FBC02D' },
  rowInline: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  warningTitle: { fontWeight: '900', marginLeft: 8, color: '#856404' },
  warningText: { fontSize: 12, color: '#856404', marginBottom: 4, fontWeight: '600' },

  finalizeBtn: { backgroundColor: '#333399', marginHorizontal: 20, marginTop: 30, padding: 22, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  finalizeBtnText: { color: 'white', fontWeight: '900', fontSize: 15, marginLeft: 10, letterSpacing: 1 },
  
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#AAA', fontWeight: 'bold' }
});

export default ReconciliationScreen;