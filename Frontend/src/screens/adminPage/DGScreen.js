import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const DGScreen = () => {
    const { user } = useContext(UserContext);
    const companyId = user?.role === 'Admin' ? user?.id : user?.belongsToAdmin;

    const [loading, setLoading] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDG, setSelectedDG] = useState('DG Set 1');
    const [units, setUnits] = useState('');
    const [cost, setCost] = useState('');
    const [mappedTenants, setMappedTenants] = useState([]);

    useEffect(() => { fetchTenants(); }, [companyId]);

    const fetchTenants = async () => {
        try {
            const res = await axios.get(`${API_URL}/tenants/${companyId}`);
            setTenants(res.data);
        } catch (e) { console.log("Fetch Error"); }
    };

    const toggleMapping = (id) => {
        setMappedTenants(prev => prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]);
    };

    const handleSaveDGEntry = async () => {
        if (!units || !cost || mappedTenants.length === 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Fill all fields & map tenants' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                adminId: companyId,
                dgName: selectedDG,
                date: date.toISOString(),
                month: date.toLocaleString('default', { month: 'long' }),
                unitsProduced: Number(units),
                fuelCost: Number(cost),
                connectedTenants: mappedTenants
            };

            await axios.post(`${API_URL}/tenants/dg/add`, payload);
            Toast.show({ type: 'success', text1: 'Saved ✅' });
            setUnits(''); setCost(''); setMappedTenants([]);
        } catch (e) {
            console.log(e.response?.data);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Validation Failed' });
        } finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={22} color="white" />
                <Text style={styles.dateBtnText}>{date.toDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
            )}

            <View style={styles.dgPickerRow}>
                {['DG Set 1', 'DG Set 2', 'DG Set 3'].map(item => (
                    <TouchableOpacity key={item} style={[styles.dgOption, selectedDG === item && styles.dgActive]} onPress={() => setSelectedDG(item)}>
                        <Text style={[styles.dgOptionText, selectedDG === item && { color: 'white' }]}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.card}>
                <TextInput style={styles.input} placeholder="Units Produced (kWh)" keyboardType="numeric" value={units} onChangeText={setUnits} />
                <TextInput style={styles.input} placeholder="Fuel Cost (₹)" keyboardType="numeric" value={cost} onChangeText={setCost} />
            </View>

            <Text style={styles.sectionTitle}>Map Connected Tenants</Text>

            <View style={styles.mappingList}>
                {tenants.map(item => (
                    <TouchableOpacity
                        key={item._id}
                        style={[styles.mappingItem, mappedTenants.includes(item._id) && styles.mappingActive]}
                        onPress={() => toggleMapping(item._id)}
                    >
                        <MaterialCommunityIcons
                            name={mappedTenants.includes(item._id) ? "check-circle" : "circle-outline"}
                            size={22}
                            color={mappedTenants.includes(item._id) ? "white" : "#333399"}
                        />
                        <Text style={[styles.mappingText, mappedTenants.includes(item._id) && { color: 'white' }]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDGEntry} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>SAVE ENTRY</Text>}
            </TouchableOpacity>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fd', padding: 20 },
    dateBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
    dateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
    dgPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    dgOption: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, elevation: 2 },
    dgActive: { backgroundColor: '#333399' },
    dgOptionText: { fontWeight: 'bold', color: '#666', fontSize: 11 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginTop: 20, elevation: 2 },
    input: { backgroundColor: '#f5f7fa', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 10 },
    mappingList: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 2 },
    mappingItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    mappingActive: { backgroundColor: '#333399', borderRadius: 10 },
    mappingText: { marginLeft: 10, fontWeight: '600' },
    submitBtn: { backgroundColor: '#4caf50', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default DGScreen;