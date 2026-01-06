import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, 
    TouchableOpacity, ActivityIndicator, Modal, Alert 
} from 'react-native';
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
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    const [dgList, setDgList] = useState(['DG Set 1', 'DG Set 2', 'DG Set 3']);
    const [selectedDG, setSelectedDG] = useState('DG Set 1');
    const [units, setUnits] = useState('');
    const [cost, setCost] = useState('');
    const [isUpdateMode, setIsUpdateMode] = useState(false); // क्या पुराना डेटा मिल गया है?

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newDgName, setNewDgName] = useState('');

    // --- 🟢 लॉजिक: तारीख या DG बदलते ही पुराना डेटा फेच करें ---
    const checkExistingData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/tenants/dg/fetch-data`, {
                params: {
                    adminId: companyId,
                    dgName: selectedDG,
                    date: date.toISOString()
                }
            });

            if (res.data) {
                setUnits(res.data.unitsProduced.toString());
                setCost(res.data.fuelCost.toString());
                setIsUpdateMode(true);
                Toast.show({ type: 'info', text1: 'Existing Data Loaded', text2: 'You can now update this entry' });
            } else {
                setUnits('');
                setCost('');
                setIsUpdateMode(false);
            }
        } catch (e) {
            console.log("Fetch Error");
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedDG, date]);

    useEffect(() => {
        checkExistingData();
    }, [checkExistingData]);

    const handleAddDG = () => {
        if (!newDgName) return Alert.alert("Error", "Enter Name");
        setDgList([...dgList, newDgName]);
        setSelectedDG(newDgName);
        setNewDgName('');
        setAddModalVisible(false);
    };

    const deleteDGSet = (name) => {
        Alert.alert("Delete DG Set", `Do you want to remove ${name} from the list?`, [
            { text: "Cancel" },
            { text: "Remove", style: "destructive", onPress: () => {
                const newList = dgList.filter(i => i !== name);
                setDgList(newList);
                if (selectedDG === name) setSelectedDG(newList[0]);
            }}
        ]);
    };

    const handleSaveDGEntry = async () => {
        if (!units || !cost) return Toast.show({ type: 'error', text1: 'Fill all fields' });

        setLoading(true);
        try {
            const payload = {
                adminId: companyId,
                dgName: selectedDG,
                date: date.toISOString(),
                month: date.toLocaleString('en-US', { month: 'long' }),
                unitsProduced: Number(units),
                fuelCost: Number(cost),
                connectedTenants: [] 
            };

            await axios.post(`${API_URL}/tenants/dg/add`, payload);
            Toast.show({ type: 'success', text1: isUpdateMode ? 'Updated ✅' : 'Saved ✅' });
            setIsUpdateMode(true);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Failed to save' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{flex: 1, backgroundColor: '#f8f9fd'}}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* Date Selection */}
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <MaterialCommunityIcons name="calendar-search" size={22} color="white" />
                    <Text style={styles.dateBtnText}>{date.toDateString()}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} />
                )}

                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>DG Sets Inventory</Text>
                    <TouchableOpacity style={styles.addSmallBtn} onPress={() => setAddModalVisible(true)}>
                        <Text style={styles.addSmallText}>+ New Set</Text>
                    </TouchableOpacity>
                </View>

                {/* Horizontal DG Selector with Delete Icon */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dgPickerRow}>
                    {dgList.map(item => (
                        <View key={item} style={styles.pillContainer}>
                            <TouchableOpacity 
                                style={[styles.dgOption, selectedDG === item && styles.dgActive]} 
                                onPress={() => setSelectedDG(item)}
                            >
                                <Text style={[styles.dgOptionText, selectedDG === item && { color: 'white' }]}>{item}</Text>
                            </TouchableOpacity>
                            {/* Delete Button on each DG Set */}
                            <TouchableOpacity 
                                style={styles.miniDelete} 
                                onPress={() => deleteDGSet(item)}
                            >
                                <MaterialCommunityIcons name="close-circle" size={18} color="#f44336" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>

                {/* Input Card */}
                <View style={[styles.card, isUpdateMode && styles.updateCard]}>
                    <View style={styles.modeBadge}>
                        <Text style={styles.modeText}>{isUpdateMode ? "EDITING EXISTING ENTRY" : "NEW ENTRY"}</Text>
                    </View>
                    
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="flash" size={20} color="#333399" />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Units Produced" 
                            keyboardType="numeric" 
                            value={units} 
                            onChangeText={setUnits} 
                        />
                    </View>
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="currency-inr" size={20} color="#4caf50" />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Diesel Cost" 
                            keyboardType="numeric" 
                            value={cost} 
                            onChangeText={setCost} 
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDGEntry} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : (
                        <Text style={styles.submitBtnText}>{isUpdateMode ? "UPDATE DATA" : "SAVE DATA"}</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={addModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.addModalContent}>
                        <Text style={styles.modalTitle}>New DG Set Name</Text>
                        <TextInput style={styles.modalInput} value={newDgName} onChangeText={setNewDgName} placeholder="e.g. DG 04" autoFocus />
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleAddDG}><Text style={{color:'white', fontWeight:'bold'}}>Add DG Set</Text></TouchableOpacity>
                        <TouchableOpacity style={{marginTop:15}} onPress={()=>setAddModalVisible(false)}><Text style={{color:'red'}}>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    dateBtn: { backgroundColor: '#333399', flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 30, elevation: 5 },
    dateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    addSmallBtn: { backgroundColor: '#333399', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addSmallText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    dgPickerRow: { flexDirection: 'row', marginBottom: 20 },
    pillContainer: { marginRight: 15, position: 'relative', paddingRight: 8 },
    dgOption: { minWidth: 100, backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee' },
    dgActive: { backgroundColor: '#333399', borderColor: '#333399' },
    dgOptionText: { fontWeight: 'bold', color: '#666', fontSize: 12 },
    miniDelete: { position: 'absolute', top: -8, right: 0 },
    card: { backgroundColor: 'white', padding: 25, borderRadius: 24, elevation: 3 },
    updateCard: { borderLeftWidth: 5, borderLeftColor: '#4caf50' },
    modeBadge: { alignSelf: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 20 },
    modeText: { fontSize: 9, fontWeight: 'bold', color: '#999', letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9faff', paddingHorizontal: 15, borderRadius: 15, marginBottom: 15, height: 55, borderWidth: 1, borderColor: '#edf1ff' },
    input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    submitBtn: { backgroundColor: '#333399', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 30, elevation: 5 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    addModalContent: { backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    modalInput: { backgroundColor: '#f5f7fa', width: '100%', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    confirmBtn: { backgroundColor: '#333399', width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' }
});

export default DGScreen;