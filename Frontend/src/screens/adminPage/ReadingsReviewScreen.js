import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReadingsReviewScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // तारीख चुनने के लिए स्टेट्स
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // महीने की 1 तारीख
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reconcile/master-report/${user.id}`, {
        params: { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        }
      });
      setData(res.data);
      console.log("Review Data:", res.data);
    } catch (e) { console.log("Fetch Error....."); }
    finally { setLoading(false); }
  }, [user.id, startDate, endDate]);

  useEffect(() => { fetchReview(); }, [fetchReview]);

  if (!data && loading) return <ActivityIndicator size="large" color="#333399" style={{flex:1}} />;

  return (
    <View style={styles.container}>
      {/* --- Header with Calendar --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="chevron-left" size={32} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Readings Review</Text>
      </View>

      {/* --- Date Display Row --- */}
      <View style={styles.dateRangeBox}>
        <TouchableOpacity style={styles.dateTab} onPress={() => setShowPicker('start')}>
          <Text style={styles.dateLabel}>FROM</Text>
          <Text style={styles.dateVal}>{startDate.toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</Text>
        </TouchableOpacity>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#CCC" />
        <TouchableOpacity style={styles.dateTab} onPress={() => setShowPicker('end')}>
          <Text style={styles.dateLabel}>TO</Text>
          <Text style={styles.dateVal}>{endDate.toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- Top 3 Cards (Same as Image) --- */}
        <View style={styles.summaryGrid}>
          <SummaryCard label="MAIN METER" value={data?.summary.mainMeter} unit="kWh" />
          <SummaryCard label="SOLAR GEN" value={data?.summary.solarGen} unit="kWh" color="#00C853" />
          <SummaryCard label="DG TOTAL" value={data?.summary.dgTotal} unit="kWh" />
        </View>

        <Text style={styles.sectionTitle}>Tenant Data Verification</Text>

        {/* --- Table (Same as Image) --- */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.hText, {flex: 2}]}>TENANT ID</Text>
            <Text style={[styles.hText, {flex: 2}]}>METER S/N</Text>
            <Text style={[styles.hText, {flex: 1.5}]}>OPENING</Text>
            <Text style={[styles.hText, {flex: 1.5, textAlign: 'right'}]}>CLOSING</Text>
          </View>

          {data?.tableData.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tenantName}>{item.name}</Text>
              <Text style={styles.meterSn}>{item.meterSN}</Text>
              <Text style={styles.readVal}>{item.opening}</Text>
              <Text style={[styles.readVal, {textAlign: 'right', fontWeight: 'bold', color: '#000'}]}>{item.closing}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* --- Footer (Same as Image) --- */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <View>
            <Text style={styles.fLabel}>PROGRESS</Text>
            <Text style={styles.fVal}>Complete: {data?.tableData.filter(x=>x.isComplete).length}/{data?.tableData.length}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.fLabel}>AGGREGATE UNITS</Text>
            <Text style={styles.fValBig}>{data?.summary.aggregateUnits} <Text style={{fontSize:12}}>kWh</Text></Text>
          </View>
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('Reconciliation', { startDate, endDate })}>
          <Text style={styles.submitText}>SUBMIT FOR RECONCILIATION</Text>
          <MaterialCommunityIcons name="send" size={24} color="black" style={{marginLeft:10}} />
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={showPicker === 'start' ? startDate : endDate}
          mode="date"
          onChange={(e, d) => {
            setShowPicker(null);
            if (d) {
              if (showPicker === 'start') setStartDate(d);
              else setEndDate(d);
            }
          }}
        />
      )}
    </View>
  );
};

const SummaryCard = ({ label, value, unit, color = '#000' }) => (
  <View style={styles.sCard}>
    <Text style={styles.sLabel}>{label}</Text>
    <Text style={[styles.sValue, {color}]}>{value} <Text style={styles.sUnit}>{unit}</Text></Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  headerTitle: {flex:1, fontSize: 20, fontWeight: 'bold' , color: '#333399' ,alignItems: 'center', textAlign: 'center' },
  dateRangeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FE', margin: 15, padding: 12, borderRadius: 15 },
  dateTab: { alignItems: 'center', marginHorizontal: 20 },
  dateLabel: { fontSize: 9, fontWeight: 'bold', color: '#AAA' },
  dateVal: { fontSize: 14, fontWeight: 'bold', color: '#333399' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 20 },
  sCard: { width: '31%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  sLabel: { fontSize: 9, fontWeight: 'bold', color: '#00C853', marginBottom: 5 },
  sValue: { fontSize: 18, fontWeight: 'bold' },
  sUnit: { fontSize: 10, color: '#999' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#1A1C3D' },
  table: { borderTopWidth: 1, borderColor: '#EEE' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  hText: { fontSize: 10, fontWeight: 'bold', color: '#999' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tenantName: { flex: 2, fontSize: 14, fontWeight: 'bold' },
  meterSn: { flex: 2, fontSize: 13, color: '#00C853' },
  readVal: { flex: 1.5, fontSize: 14, color: '#666' },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
  footerStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  fLabel: { fontSize: 10, fontWeight: 'bold', color: '#BBB' },
  fVal: { fontSize: 16, fontWeight: 'bold', marginTop: 3 },
  fValBig: { fontSize: 22, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00E676', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: 'bold' }
});

export default ReadingsReviewScreen;