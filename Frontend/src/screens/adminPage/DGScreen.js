import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
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
    const [dgList, setDgList] = useState([]); // Database से आएगी
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDG, setSelectedDG] = useState('');
    const [units, setUnits] = useState('');
    const [cost, setCost] = useState('');
    const [isUpdateMode, setIsUpdateMode] = useState(false);

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newDgName, setNewDgName] = useState('');

    // 1. DG लिस्ट फेच करें
    const fetchDGList = async () => {
        try {
            const res = await axios.get(`${API_URL}/dg/list/${companyId}`);
            setDgList(res.data);
            if (res.data.length > 0) setSelectedDG(res.data[0].dgName);
        } catch (e) { console.log("List Fetch Error"); }
    };

    // 2. उस दिन का पुराना डेटा चेक करें
    const checkDayLog = useCallback(async () => {
        if (!selectedDG) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/dg/fetch-log`, {
                params: { adminId: companyId, dgName: selectedDG, date: date.toISOString() }
            });
            if (res.data) {
                setUnits(res.data.unitsProduced.toString());
                setCost(res.data.fuelCost.toString());
                setIsUpdateMode(true);
            } else {
                setUnits(''); setCost(''); setIsUpdateMode(false);
            }
        } catch (e) { console.log("Log Fetch Error"); }
        finally { setLoading(false); }
    }, [companyId, selectedDG, date]);

    useEffect(() => { fetchDGList(); }, []);
    useEffect(() => { checkDayLog(); }, [checkDayLog]);

    // 3. नया DG नाम रजिस्टर करना
    const handleAddNewDG = async () => {
        if (!newDgName) return;
        try {
            await axios.post(`${API_URL}/dg/create-set`, { adminId: companyId, dgName: newDgName });
            fetchDGList();
            setAddModalVisible(false);
            setNewDgName('');
            Toast.show({ type: 'success', text1: 'New DG Set Added' });
        } catch (e) { Alert.alert("Error", "Could not add DG"); }
    };

    // 4. डेटा सेव/अपडेट करना
    const handleSave = async () => {
        if (!units || !cost) return Toast.show({ type: 'error', text1: 'Empty fields' });
        setLoading(true);
        try {
            await axios.post(`${API_URL}/dg/add-log`, {
                adminId: companyId,
                dgName: selectedDG,
                date: date.toISOString(),
                month: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                unitsProduced: Number(units),
                fuelCost: Number(cost)
            });
            Toast.show({ type: 'success', text1: 'Saved Successfully ✅' });
            setIsUpdateMode(true);
        } catch (e) { Toast.show({ type: 'error', text1: 'Save Failed' }); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Date Picker */}
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color="white" />
                <Text style={styles.dateBtnText}>{date.toDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} />}

            {/* DG Selection & Add */}
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Select DG Set</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(true)}><Text style={styles.addBtn}>+ Add New</Text></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dgRow}>
                {dgList.map(item => (
                    <TouchableOpacity key={item._id} style={[styles.dgPill, selectedDG === item.dgName && styles.dgPillActive]} onPress={() => setSelectedDG(item.dgName)}>
                        <Text style={[styles.dgText, selectedDG === item.dgName && {color:'white'}]}>{item.dgName}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Input Card */}
            <View style={[styles.card, isUpdateMode && {borderLeftColor: '#4caf50', borderLeftWidth: 5}]}>
                <Text style={styles.cardHeader}>{isUpdateMode ? "Updating Entry" : "New Entry"} for {selectedDG}</Text>
                <TextInput style={styles.input} placeholder="Units Produced (kWh)" keyboardType="numeric" value={units} onChangeText={setUnits} />
                <TextInput style={styles.input} placeholder="Fuel Cost (₹)" keyboardType="numeric" value={cost} onChangeText={setCost} />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{isUpdateMode ? "UPDATE LOG" : "SAVE LOG"}</Text>}
            </TouchableOpacity>

            {/* Add DG Modal */}
            <Modal visible={addModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New DG Set</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g. DG 04" value={newDgName} onChangeText={setNewDgName} autoFocus />
                        <TouchableOpacity style={styles.saveBtn} onPress={handleAddNewDG}><Text style={{color:'white', fontWeight:'bold'}}>Add Set</Text></TouchableOpacity>
                        <TouchableOpacity onPress={()=>setAddModalVisible(false)} style={{marginTop:15}}><Text style={{color:'red'}}>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fd', padding: 20 },
    dateBtn: { backgroundColor: '#333399', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    dateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },
    addBtn: { color: '#333399', fontWeight: 'bold' },
    dgRow: { flexDirection: 'row', marginTop: 15 },
    dgPill: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginRight: 10, elevation: 2, minWidth: 80, alignItems: 'center' },
    dgPillActive: { backgroundColor: '#333399' },
    dgText: { fontWeight: 'bold', color: '#666' },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginTop: 20, elevation: 3 },
    cardHeader: { fontSize: 10, fontWeight: 'bold', color: '#AAA', marginBottom: 15, textAlign: 'center', textTransform: 'uppercase' },
    input: { backgroundColor: '#f5f7fa', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
    submitBtn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: 'white', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    modalInput: { backgroundColor: '#f0f0f0', width: '100%', padding: 15, borderRadius: 10, marginBottom: 20 },
    saveBtn: { backgroundColor: '#333399', padding: 15, width: '100%', borderRadius: 10, alignItems: 'center' }
});

export default DGScreen;