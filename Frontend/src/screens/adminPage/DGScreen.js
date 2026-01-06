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
    const companyId = user?.id;

    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDG, setSelectedDG] = useState('DG Set 1');
    const [units, setUnits] = useState('');
    const [cost, setCost] = useState('');
    const [totals, setTotals] = useState([]);

    // महीना हमेशा English फॉर्मेट में निकालें ताकि Backend समझ सके
    const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const fetchMonthlySummary = useCallback(async () => {
        if (!companyId) return; // 🟢 सुरक्षा: अगर ID नहीं है तो कॉल न करें
        try {
            // URL चेक करें: /dg/ या /api/dg/ (जो भी आपके server.js में है)
            const res = await axios.get(`${API_URL}/dg/monthly-summary/${companyId}?month=${monthName}`);
            setTotals(res.data || []);
        } catch (e) {
            console.log("Summary Fetch Error:", e.message);
        }
    }, [companyId, monthName]);

    useEffect(() => {
        fetchMonthlySummary();
    }, [fetchMonthlySummary]);

    const handleSave = async () => {
        if (!units || !cost) {
            Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill all fields' });
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_URL}/dg/add-log`, {
                adminId: companyId,
                dgName: selectedDG,
                date: date.toISOString(),
                unitsProduced: Number(units),
                fuelCost: Number(cost)
            });
            Toast.show({ type: 'success', text1: 'Saved Successfully ✅' });
            setUnits(''); setCost('');
            fetchMonthlySummary();
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Save failed' });
        } finally {
            setLoading(false);
        }
    };

    // 🔴 "Text strings" एरर हटाने के लिए JSX को बिल्कुल टाइट (Tight) रखा गया है
    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <MaterialCommunityIcons name="calendar" size={24} color="white" />
                    <Text style={styles.dateBtnText}>{date.toDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (<DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />)}
                <View style={styles.dgPickerRow}>
                    {['DG Set 1', 'DG Set 2', 'DG Set 3'].map((item) => (
                        <TouchableOpacity key={item} style={[styles.dgOption, selectedDG === item && styles.dgActive]} onPress={() => setSelectedDG(item)}>
                            <Text style={[styles.dgOptionText, selectedDG === item && { color: 'white' }]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.inputCard}>
                    <Text style={styles.cardInfo}>Entry for {selectedDG}</Text>
                    <TextInput style={styles.input} placeholder="Units Produced (kWh)" keyboardType="numeric" value={units} onChangeText={setUnits} />
                    <TextInput style={styles.input} placeholder="Fuel Cost (₹)" keyboardType="numeric" value={cost} onChangeText={setCost} />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>SUBMIT LOG</Text>}
                    </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>Monthly Totals ({monthName})</Text>
                {totals.length === 0 ? (
                    <Text style={styles.emptyText}>No data for this month</Text>
                ) : (
                    totals.map((item, index) => (
                        <View key={index} style={styles.summaryCard}>
                            <Text style={styles.summaryDGName}>{item._id}</Text>
                            <View style={styles.summaryRow}>
                                <View>
                                    <Text style={styles.summaryLabel}>Total Units</Text>
                                    <Text style={styles.summaryValue}>{item.totalUnits} kWh</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.summaryLabel}>Total Cost</Text>
                                    <Text style={[styles.summaryValue, { color: '#4caf50' }]}>₹{item.totalCost}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
    dateBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
    dateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
    dgPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    dgOption: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, elevation: 2 },
    dgActive: { backgroundColor: '#333399' },
    dgOptionText: { fontWeight: 'bold', color: '#666', fontSize: 11 },
    inputCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginTop: 20, elevation: 3 },
    cardInfo: { fontSize: 12, color: '#888', marginBottom: 15, fontWeight: 'bold', textAlign: 'center' },
    input: { backgroundColor: '#f8f9fd', padding: 15, borderRadius: 10, marginBottom: 12, fontSize: 16, borderBottomWidth: 1, borderColor: '#eee', color: '#000' },
    submitBtn: { backgroundColor: '#333399', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: 'white', fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333399', marginTop: 30, marginBottom: 15 },
    summaryCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
    summaryDGName: { fontWeight: 'bold', color: '#333399', fontSize: 16, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5, marginBottom: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 10, color: '#999', fontWeight: 'bold' },
    summaryValue: { fontSize: 17, fontWeight: 'bold', marginTop: 2 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});

export default DGScreen;