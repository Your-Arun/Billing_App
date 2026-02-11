import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, 
    ActivityIndicator, Modal, RefreshControl, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import { SafeAreaView } from 'react-native-safe-area-context';

const DGScreen = () => {
    const { user } = useContext(UserContext);
    const companyId = user?._id || user?.id;

    const [loading, setLoading] = useState(false);
    const [dgList, setDgList] = useState([]);
    const [selectedDG, setSelectedDG] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [units, setUnits] = useState('');
    const [cost, setCost] = useState('');
    const [totals, setTotals] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [isAddModal, setIsAddModal] = useState(false);
    const [newDgName, setNewDgName] = useState('');
    const adminId = user?._id || user?.id;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const loadCache = useCallback(async () => {
        if (!companyId) return;
        try {
            const cacheKey = `dg_cache_${companyId}_${monthKey}`;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                setDgList(parsed.dgList || []);
                setTotals(parsed.totals || []);
                setDailyLogs(parsed.dailyLogs || []);
                setLoading(false); // डेटा मिल गया तो लोडर हटा दो
            }
        } catch (e) { console.log("Cache Load Error", e); }
    }, [companyId, monthKey]);


    const loadAll = useCallback(async () => {
        if (!companyId) return;
        try {
            const [resNames, resSummary, resLogs] = await Promise.all([
                axios.get(`${API_URL}/dg/list-names/${companyId}`),
                axios.get(`${API_URL}/dg/monthly-summary/${companyId}?monthKey=${monthKey}`),
                axios.get(`${API_URL}/dg/logs/${companyId}?monthKey=${monthKey}`)
            ]);

            const freshData = {
                dgList: resNames.data,
                totals: resSummary.data,
                dailyLogs: resLogs.data
            };

            setDgList(freshData.dgList);
            setTotals(freshData.totals || []);
            setDailyLogs(freshData.dailyLogs || []);

            // ✅ 3. डेटा को लोकल स्टोरेज (Cache) में सेव करें
            const cacheKey = `dg_cache_${companyId}_${monthKey}`;
            await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));

            if (resNames.data.length > 0 && !selectedDG) setSelectedDG(resNames.data[0].dgName);
        } catch (e) { 
            console.log("Load Error:", e.message); 
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    }, [companyId, monthKey, selectedDG]);
    useEffect(() => {
        loadCache(); 
        loadAll(); 
    }, [loadCache, loadAll]);

    const handleSave = async () => {
        if (!selectedDG || !units || !cost) return Toast.show({ type: 'error', text1: 'Fill all fields' });
        setLoading(true);
        try {
            await axios.post(`${API_URL}/dg/add-log`, { 
                adminId: companyId, 
                dgName: selectedDG, 
                date: date.toISOString(), 
                unitsProduced: Number(units), 
                fuelCost: Number(cost) 
            });
            Toast.show({ type: 'success', text1: 'Log Saved ✅' });
            setUnits(''); setCost('');
            loadAll();
        } catch (e) { 
            Toast.show({ type: 'error', text1: 'Save Failed' }); 
        } finally { setLoading(false); }
    };

    // 🗑️ DELETE DAILY LOG entry logic
    const handleDeleteLog = (id) => {
        Alert.alert("Delete Entry", "Are you sure you want to delete this log?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try {
                    // API Call: Backend route se match hona chahiye
                    const res = await axios.delete(`${API_URL}/dg/delete-log/${id}`);
                    if (res.data.success) {
                        Toast.show({ type: 'success', text1: 'Deleted 🗑️' });
                        loadAll(); // List refresh karein
                    }
                } catch (err) { 
                    console.log("Delete Log Error:", err.response?.data || err.message);
                    Toast.show({ type: 'error', text1: 'Delete failed' }); 
                }
            }}
        ]);
    };

    // 🗑️ DELETE ENTIRE DG SET logic
    const handleDeleteDGSet = (id, name) => {
        Alert.alert("Delete DG Set", `This will delete ${name} and ALL its history. Proceed?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete Everything", style: "destructive", onPress: async () => {
                try {
                    const res = await axios.delete(`${API_URL}/dg/delete-set/${id}`);
                    if (res.data.success) {
                        Toast.show({ type: 'success', text1: `${name} removed` });
                        setSelectedDG(''); // Selection clear karein
                        loadAll();
                    }
                } catch (err) { 
                    console.log("Delete Set Error:", err.response?.data || err.message);
                    Toast.show({ type: 'error', text1: 'Could not remove set' }); 
                }
            }}
        ]);
    };
    if (loading && dailyLogs.length === 0 && !refreshing) {
        return <View style={styles.loader}><ActivityIndicator size="large" color="#333399" /></View>;
    }
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} />}>
                
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <MaterialCommunityIcons name="calendar" size={22} color="#fff" />
                    <Text style={styles.dateText}>{date.toDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (<DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />)}

                <View style={styles.headerRow}>
                    <Text style={styles.sectionLabel}>Select DG Unit (Long press to delete)</Text>
                    <TouchableOpacity onPress={() => setIsAddModal(true)} style={styles.addBtn}><Text style={styles.addBtnText}>+ Add New</Text></TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                    {dgList.map(item => (
                        <TouchableOpacity 
                            key={item._id} 
                            style={[styles.pill, selectedDG === item.dgName && styles.pillActive]} 
                            onPress={() => setSelectedDG(item.dgName)}
                            onLongPress={() => handleDeleteDGSet(item._id, item.dgName)}
                        >
                            <Text style={{color: selectedDG === item.dgName ? '#fff' : '#666', fontWeight: 'bold'}}>{item.dgName}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.card}>
                    <Text style={styles.cardHeader}>Entry for {selectedDG || '...'}</Text>
                    <TextInput style={styles.input} placeholder="Units Produced (kWh)" 
                    placeholderTextColor="#9E9E9E"
                    keyboardType="numeric" value={units} onChangeText={setUnits} />
                    <TextInput style={styles.input} placeholder="Fuel Cost (₹)" placeholderTextColor="#9E9E9E" keyboardType="numeric" value={cost} onChangeText={setCost} />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SAVE DAILY DATA</Text>}
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Daily Logs ({monthName})</Text>
                {dailyLogs.length === 0 ? (
                    <View style={styles.emptyBox}><Text style={styles.emptyText}>No logs found.</Text></View>
                ) : (
                    dailyLogs.map((log, index) => (
                        <View key={index} style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                                <View>
                                    <Text style={styles.historyDate}>{new Date(log.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</Text>
                                    <Text style={styles.historyDGName}>{log.dgName}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteLog(log._id)}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ff5252" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.historyBody}>
                                <View style={styles.historyStat}><Text style={styles.histLabel}>UNITS</Text><Text style={styles.histVal}>{log.unitsProduced} kWh</Text></View>
                                <View style={[styles.historyStat, {alignItems:'flex-end'}]}><Text style={styles.histLabel}>COST</Text><Text style={[styles.histVal, {color:'#4caf50'}]}>₹{log.fuelCost}</Text></View>
                            </View>
                        </View>
                    ))
                )}
                <View style={{height: 100}} />
            </ScrollView>

            {/* Register Modal */}
            <Modal visible={isAddModal} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Register New DG</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g. DG 01" placeholderTextColor="#9E9E9E" value={newDgName} onChangeText={setNewDgName} />
                        <TouchableOpacity style={styles.submitBtn} onPress={async () => {
                            if(!newDgName) return;
                            try {
                                await axios.post(`${API_URL}/dg/create-set`, { adminId: companyId, dgName: newDgName });
                                setIsAddModal(false); setNewDgName(''); loadAll();
                            } catch(err) { Alert.alert("Error", "Name might already exist"); }
                        }}><Text style={styles.submitBtnText}>Register</Text></TouchableOpacity>
                        <TouchableOpacity onPress={()=>setIsAddModal(false)} style={{marginTop:15}}><Text style={{color:'red'}}>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fd', paddingHorizontal: 20 },
    dateBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
    dateText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25 },
    sectionLabel: { fontSize: 10, fontWeight: 'bold', color: '#AAA' },
    addBtn: { backgroundColor: '#eef0ff', padding: 8, borderRadius: 10 },
    addBtnText: { color: '#333399', fontWeight: 'bold', fontSize: 12 },
    pillRow: { marginVertical: 15 },
    pill: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginRight: 10, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    pillActive: { backgroundColor: '#333399', borderColor: '#333399' },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3 },
    cardHeader: { fontSize: 12, fontWeight: 'bold', color: '#AAA', marginBottom: 15, textAlign: 'center' },
    input: { height: 50, backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 15, marginBottom: 12, borderBottomWidth: 1, borderColor: '#eee', color: '#000' },
    submitBtn: { backgroundColor: '#333399', padding: 18, borderRadius: 15, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333399', marginTop: 30, marginBottom: 15 },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#333399' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
    historyDate: { fontWeight: 'bold', color: '#333399', fontSize: 14 },
    historyDGName: { color: '#666', fontWeight: '600', fontSize: 12 },
    historyBody: { flexDirection: 'row', justifyContent: 'space-between' },
    historyStat: { flex: 1 },
    histLabel: { fontSize: 9, color: '#AAA', fontWeight: 'bold' },
    histVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    emptyBox: { padding: 20, alignItems: 'center' },
    emptyText: { color: '#999' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 25, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    modalInput: { width: '100%', backgroundColor: '#f5f7fa', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default DGScreen;