import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const DGScreen = () => {
  const { user } = useContext(UserContext);
  const companyId = user?._id || user?.id;

  const [saving, setSaving] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [selectedDG, setSelectedDG] = useState('DG Set 1');
  const [units, setUnits] = useState('');
  const [cost, setCost] = useState('');

  const [totals, setTotals] = useState([]);
  const [reportStart, setReportStart] = useState(new Date());
  const [reportEnd, setReportEnd] = useState(new Date());
  const [reportData, setReportData] = useState([]);

  // ✅ monthKey for backend
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  /* ======================
     MONTHLY SUMMARY
  ====================== */
  const fetchMonthlySummary = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get(
        `${API_URL}/dg/monthly-summary/${companyId}?monthKey=${monthKey}`
      );
      setTotals(res.data || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Monthly fetch failed' });
    }
  }, [companyId, monthKey]);

  useEffect(() => {
    fetchMonthlySummary();
  }, [fetchMonthlySummary]);

  /* ======================
     SAVE DAILY LOG
  ====================== */
  const handleSave = async () => {
    if (!units || !cost) {
      Toast.show({ type: 'error', text1: 'Required fields missing' });
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/dg/add-log`, {
        adminId: companyId,
        dgName: selectedDG,
        date: date.toISOString(),
        unitsProduced: Number(units),
        fuelCost: Number(cost)
      });

      Toast.show({ type: 'success', text1: 'Saved successfully' });
      setUnits('');
      setCost('');
      fetchMonthlySummary();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  /* ======================
     DATE RANGE REPORT
  ====================== */
  const fetchRangeReport = async () => {
    setLoadingReport(true);
    try {
      const res = await axios.get(`${API_URL}/dg/report`, {
        params: {
          adminId: companyId,
          startDate: reportStart.toISOString(),
          endDate: reportEnd.toISOString()
        }
      });
      setReportData(res.data || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Report failed' });
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>

        {/* DATE PICKER */}
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color="#fff" />
          <Text style={styles.dateText}>{date.toDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setDate(d);
            }}
          />
        )}

        {/* DG SELECT */}
        <View style={styles.dgSelector}>
          {['DG Set 1', 'DG Set 2', 'DG Set 3'].map(dg => (
            <TouchableOpacity
              key={dg}
              style={[styles.dgButton, selectedDG === dg && styles.dgButtonActive]}
              onPress={() => setSelectedDG(dg)}
            >
              <Text style={[styles.dgButtonText, selectedDG === dg && { color: '#fff' }]}>{dg}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* INPUT CARD */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>{selectedDG} Daily Entry</Text>
          <TextInput style={styles.input} placeholder="Units (kWh)" keyboardType="numeric" value={units} onChangeText={setUnits} />
          <TextInput style={styles.input} placeholder="Fuel Cost ₹" keyboardType="numeric" value={cost} onChangeText={setCost} />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SAVE</Text>}
          </TouchableOpacity>
        </View>

        {/* DATE RANGE REPORT */}
        <Text style={styles.sectionTitle}>Date Range Report</Text>

        <View style={styles.row}>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowStartPicker(true)}>
            <Text>From: {reportStart.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowEndPicker(true)}>
            <Text>To: {reportEnd.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={reportStart}
            mode="date"
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) setReportStart(d);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={reportEnd}
            mode="date"
            onChange={(e, d) => {
              setShowEndPicker(false);
              if (d) setReportEnd(d);
            }}
          />
        )}

        <TouchableOpacity style={styles.calcBtn} onPress={fetchRangeReport}>
          {loadingReport ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>CALCULATE</Text>}
        </TouchableOpacity>

        {reportData.map((r, i) => (
          <View key={i} style={styles.resultCard}>
            <Text style={styles.resultName}>{r._id}</Text>
            <Text>Units: {r.totalUnits}</Text>
            <Text>Fuel: ₹{r.totalCost}</Text>
            <Text style={{ fontSize: 10 }}>Days: {r.daysRecorded}</Text>
          </View>
        ))}

       

      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
    datePickerBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    dateText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
    dgSelector: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
    dgButton: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#fff', marginHorizontal: 4, alignItems: 'center', elevation: 2 },
    dgButtonActive: { backgroundColor: '#333399' },
    dgButtonText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
    inputCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 15, textAlign: 'center' },
    input: { height: 50, backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
    submitBtn: { backgroundColor: '#333399', borderRadius: 10, alignItems: 'center', padding: 15 },
    submitBtnText: { color: '#fff', fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333399', marginTop: 30, marginBottom: 15 },
    summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginRight: 12, elevation: 2, alignItems: 'center', minWidth: 120 },
    summaryDGName: { fontWeight: 'bold', color: '#333', marginBottom: 5 },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#333399' },
    summaryValueCost: { fontSize: 13, color: '#4caf50', marginTop: 2 },
    noDataCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: 200, alignItems: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
rangeBtn: { flex: 1, padding: 12, backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 5, alignItems: 'center' },
calcBtn: { backgroundColor: '#333399', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
resultCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
resultName: { fontWeight: 'bold', color: '#333399' },

});

export default DGScreen;