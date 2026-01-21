import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
    Modal, TextInput, Alert, FlatList, StatusBar,refreshing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const TenantRow = React.memo(({ t, onEdit }) => (
    <View style={styles.tableRow}>
        <View style={{ flex: 2 }}>
            <Text style={styles.tName} numberOfLines={1}>{t.tenantName}</Text>
            <Text style={styles.tMeter}>{t.meterId}</Text>
            <Text style={[styles.tMeter, {color: '#666'}]}>{t.connectedDG || 'No DG'}</Text>
        </View>
        <View style={styles.cellCenter}>
            <Text style={styles.tLabel}>OPENING</Text>
            <Text style={styles.tValue}>{t.opening}</Text>
        </View>
        <View style={styles.cellCenter}>
            <Text style={styles.tLabel}>CLOSING</Text>
            <Text style={styles.tValue}>{t.closing}</Text>
        </View>
        <View style={styles.cellCenter}>
            <Text style={styles.tLabel}>USED</Text>
            <Text style={styles.spike}>{t.spike}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(t)} style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-box-outline" size={26} color="#4F46E5" />
        </TouchableOpacity>
    </View>
));

const ReadingsReviewScreen = ({ navigation }) => {
    const { user } = useContext(UserContext);

    const [billData, setBillData] = useState({ totalUnits: 0, totalAmount: 0 });
    const [solar, setSolar] = useState({ unitsGenerated: 0 });
    const [dg, setDg] = useState({ totalUnits: 0, totalCost: 0 });
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);

    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(null);

    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [newReading, setNewReading] = useState('');
    const [updating, setUpdating] = useState(false);

    const formatDateForAPI = (date) => date.toISOString().split('T')[0];

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const params = { from: formatDateForAPI(startDate), to: formatDateForAPI(endDate) };

            const [billRes, solarRes, dgRes, rangeRes] = await Promise.all([
                axios.get(`${API_URL}/bill/history/${user.id}`),
                axios.get(`${API_URL}/solar/history/${user.id}`),
                axios.get(`${API_URL}/dg/dgsummary/${user.id}`, { params }),
                axios.get(`${API_URL}/reconcile/range-summary/${user.id}`, { params })
            ]);

            setBillData(billRes.data?.[0] || { totalUnits: 0, totalAmount: 0 });
            setSolar(solarRes.data?.[0] || { unitsGenerated: 0 });
            setDg({
                totalUnits: dgRes.data?.dgSummary?.reduce((sum, d) => sum + d.totalUnits, 0) || 0,
                totalCost: dgRes.data?.dgSummary?.reduce((sum, d) => sum + d.totalCost, 0) || 0
            });
            setTenants(rangeRes.data || []);
        } catch (err) {
            console.log('Fetch Error:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleEdit = useCallback((t) => {
        setSelectedTenant(t);
        setNewReading(t.closing.toString());
        setEditModalVisible(true);
    }, []);

    const handleSaveUpdate = async () => {
        if (!newReading || isNaN(newReading)) return Alert.alert("Error", "Enter valid number");
        setUpdating(true);
        try {
            await axios.put(`${API_URL}/readings/update-reading/${selectedTenant.readingId}`, {
                newReading: Number(newReading)
            });
            setEditModalVisible(false);
            fetchData();
        } catch (err) { 
            Alert.alert("Failed", "Update failed"); 
        } finally { 
            setUpdating(false); 
        }
    };

    // Header component to be used inside FlatList
    const ListHeader = useMemo(() => (
        <View>
            <View style={styles.grid}>
                <SummaryCard label="GRID" value={billData.totalUnits} unit="kWh" icon="flash" color="#333399" />
                <SummaryCard label="SOLAR" value={solar.unitsGenerated} unit="kWh" icon="solar-power" color="#059669" />
                <SummaryCard label="DG UNIT" value={dg.totalUnits} unit="kWh" icon="engine" color="#DC2626" />
            </View>
            <Text style={styles.sectionTitle}>Tenant Verification</Text>
        </View>
    ), [billData, solar, dg]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" />
            
            {/* STATIC HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#333399" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review Readings</Text>
                <View style={{width: 32}} />
            </View>

            {/* DATE SELECTOR */}
            <View style={styles.dateSelector}>
                <TouchableOpacity onPress={() => setShowPicker('from')} style={styles.dateBtn}>
                    <Text style={styles.dateLabel}>FROM</Text>
                    <Text style={styles.dateVal}>{startDate.toLocaleDateString('en-IN')}</Text>
                </TouchableOpacity>
                <View style={styles.dateDivider} />
                <TouchableOpacity onPress={() => setShowPicker('to')} style={styles.dateBtn}>
                    <Text style={styles.dateLabel}>TO</Text>
                    <Text style={styles.dateVal}>{endDate.toLocaleDateString('en-IN')}</Text>
                </TouchableOpacity>
            </View>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'from' ? startDate : endDate}
                    mode="date"
                    onChange={(e, d) => { 
                        setShowPicker(null); 
                        if (d) { showPicker === 'from' ? setStartDate(d) : setEndDate(d); } 
                    }}
                />
            )}

            {loading && !refreshing ? (
                <View style={styles.loader}><ActivityIndicator size="large" color="#333399" /></View>
            ) : (
                <FlatList
                    data={tenants}
                    keyExtractor={(item, index) => item.tenantId || index.toString()}
                    renderItem={({ item }) => <TenantRow t={item} onEdit={handleEdit} />}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true} // Performance boost for large lists
                />
            )}

            {/* EDIT MODAL */}
            <Modal visible={isEditModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Closing Reading</Text>
                        <Text style={{color: '#666', marginBottom: 15}}>{selectedTenant?.tenantName}</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            value={newReading} 
                            onChangeText={setNewReading} 
                            keyboardType="numeric" 
                            autoFocus 
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={[styles.mBtn, { backgroundColor: '#EEE' }]} onPress={() => setEditModalVisible(false)}>
                                <Text style={{fontWeight: 'bold'}}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mBtn, { backgroundColor: '#333399' }]} onPress={handleSaveUpdate} disabled={updating}>
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Update</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* FOOTER */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={() => navigation.navigate('Reconciliation', { 
                        startDate: startDate.toISOString(), 
                        endDate: endDate.toISOString() 
                    })}
                >
                    <Text style={styles.submitText}>PROCEED TO RECONCILE</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// Sub-component for Cards
const SummaryCard = ({ label, value, unit, icon, color }) => (
    <View style={styles.sCard}>
        <View style={[styles.iconCircle, {backgroundColor: color + '15'}]}>
            <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.sLabel}>{label}</Text>
        <Text style={[styles.sValue, { color }]}>{value} <Text style={{ fontSize: 10 }}>{unit}</Text></Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', elevation: 2 },
    headerTitle: { flex:1, fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
    backBtn: { padding: 4 },
    dateSelector: { flexDirection: 'row', backgroundColor: '#FFF', margin: 16, borderRadius: 15, padding: 12, elevation: 3 },
    dateBtn: { flex: 1, alignItems: 'center' },
    dateLabel: { fontSize: 10, color: '#999', fontWeight: 'bold', marginBottom: 2 },
    dateVal: { fontSize: 14, fontWeight: 'bold', color: '#333399' },
    dateDivider: { width: 1, backgroundColor: '#EEE', height: '80%', alignSelf: 'center' },
    grid: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginTop: 5 },
    sCard: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 16, alignItems: 'center', elevation: 2 },
    iconCircle: { padding: 8, borderRadius: 10, marginBottom: 5 },
    sLabel: { fontSize: 10, color: '#666', fontWeight: 'bold' },
    sValue: { fontSize: 16, fontWeight: 'bold' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
    tableRow: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
    cellCenter: { flex: 1.2, alignItems: 'center' },
    tName: { fontWeight: 'bold', fontSize: 14, color: '#111827' },
    tMeter: { fontSize: 11, color: '#999' },
    tLabel: { fontSize: 8, color: '#999', fontWeight: 'bold' },
    tValue: { fontWeight: 'bold', color: '#333', fontSize: 12 },
    spike: { fontWeight: 'bold', color: '#DC2626', fontSize: 12 },
    editBtn: { padding: 5, marginLeft: 5 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
    submitBtn: { backgroundColor: '#333399', height: 55, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    submitText: { color: '#FFF', fontWeight: 'bold', marginRight: 10 },
    loader: { flex: 1, justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalInput: { width: '100%', height: 60, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: '#333399', marginBottom: 20 },
    mBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', padding: 40, color: '#999' }
});

export default ReadingsReviewScreen;