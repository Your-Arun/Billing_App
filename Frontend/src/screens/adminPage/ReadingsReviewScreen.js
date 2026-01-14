import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';

const ReadingsReviewScreen = ({ navigation }) => {
    const { user } = useContext(UserContext);

    const [data, setData] = useState(null);
    const [billl, setBill] = useState(null);
    const [solar, setSolar] = useState(null);
    const [dg, setDg] = useState({
        totalDGs: 0,
        dgSummary: []
    });
    const [loading, setLoading] = useState(false);
    const [tenants, setTenants] = useState(false);

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [endDate, setEndDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(null);

    const fetchbill = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${API_URL}/bill/history/${user.id}`
            );
            const latestBill = res.data?.[0] || 0;
            setBill({ bill: latestBill });
        } catch (err) {
            console.log('Fetch error frontend:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    const fetchSolar = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${API_URL}/solar/history/${user.id}`
            );
            const latestBill = res.data?.[0] || 0;
            setSolar({ solar: latestBill });
        } catch (err) {
            console.log('Fetch error frontend:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id]);


    const fetchDg = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${API_URL}/dg/dgsummary/${user.id}`
            );

            setDg({
                totalDGs: res.data?.totalDGs || 0,
                dgSummary: res.data?.dgSummary || []
            });

        } catch (err) {
            console.log('Fetch error frontend:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id]);


    const fetchTenants = useCallback(async () => {
        try {
            setLoading(true);

            const res = await axios.get(
                `${API_URL}/readings/all/${user.id}`
            );

            const cleanedData = res.data
                .filter(item => item.tenantId) // ❌ null tenants remove
                .map(item => ({
                    tenantName: item.tenantId.name,
                    meterId: item.tenantId.meterId,
                    opening: item.openingReading ?? 0,
                    closing: item.closingReading ?? 0,
                    status: item.status
                }));

            setTenants(cleanedData);

            console.log('TENANT DATA:', cleanedData);

        } catch (err) {
            console.log('Fetch error tenants:', err.message);
        } finally {
            setLoading(false);
        }
    }, [user.id]);


    useEffect(() => {
        fetchbill();
        fetchSolar();
        fetchDg();
        fetchTenants();
    }, [fetchSolar, fetchbill, fetchDg, fetchTenants]);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#333399" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={32} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Readings Review</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* SUMMARY CARDS */}
                <View style={styles.summaryGrid}>
                    <SummaryCard label="TOTAL READINGS" value={billl?.bill?.totalUnits || 0} unit="" />
                    <SummaryCard label="BILL AMOUNT" value={billl?.bill?.totalAmount || 0} unit="rs" />
                    <SummaryCard label="SOLAR GEN" value={solar?.solar?.unitsGenerated || 0} unit="kWh" color="#00C853" />

                </View>
                {/* ===== DG SECTION ===== */}
                <View style={styles.summaryGrid}>
                    <SummaryCard
                        label="DG TOTAL"
                        value={dg.dgSummary.reduce((sum, d) => sum + d.totalUnits, 0)}
                        unit="kWh"
                        color="#D84315"
                    />
                    <SummaryCard
                        label="DG TOTAL"
                        value={dg.dgSummary.reduce((sum, d) => sum + d.totalCost, 0)}
                        unit="kWh"
                        color="#D84315"
                    />

                    {/* <View style={styles.dgList}>
    {dg.dgSummary.map((item, index) => (
      <View key={index} style={styles.dgCard}>
        <View>
          <Text style={styles.dgName}>{item._id}</Text>
          <Text style={styles.dgUnits}>{item.totalUnits} kWh</Text>
        </View>

        <Text style={styles.dgCost}>₹ {item.totalCost}</Text>
      </View>
    ))}
  </View> */}
                </View>

                <Text style={styles.sectionTitle}>Tenant Data Verification</Text>
                <View style={styles.table}>
                    {/* ===== TABLE HEADER ===== */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.hText, { flex: 2 }]}>TENANT</Text>
                        <Text style={[styles.hText, { flex: 2 }]}>METER</Text>
                        <Text style={[styles.hText, { flex: 1.5 }]}>OPENING</Text>
                        <Text style={[styles.hText, { flex: 1.5, textAlign: 'right' }]}>CLOSING</Text>
                        <Text style={[styles.hText, { flex: 1.5, textAlign: 'right' }]}>SPIKE</Text>
                    </View>

                    {/* ===== TABLE ROWS ===== */}
                    {tenants.length > 0 ? (
                        tenants.map((t, index) => {
                            const spike = (t.closing ?? 0) - (t.opening ?? 0);
                            return (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.cell, { flex: 2 }]}>{t.tenantName}</Text>
                                    <Text style={[styles.cell, { flex: 2 }]}>{t.meterId}</Text>
                                    <Text style={[styles.cell, { flex: 1.5 }]}>{t.opening}</Text>
                                    <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>{t.closing}</Text>
                                    <Text
                                        style={[
                                            styles.cell,
                                            {
                                                flex: 1.5,
                                                textAlign: 'right',
                                                color: spike > 0 ? '#0A8F08' : '#999'
                                            }
                                        ]}
                                    >
                                        {spike}
                                    </Text>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.noDataText}>No tenant data available</Text>
                    )}
                </View>


            </ScrollView>

            {/* FOOTER */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() =>
                        navigation.navigate('Reconciliation', { startDate, endDate })
                    }
                >
                    <Text style={styles.submitText}>SUBMIT FOR RECONCILIATION</Text>
                    <MaterialCommunityIcons name="send" size={22} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SummaryCard = ({ label, value, unit, color = '#000' }) => (
    <View style={styles.sCard}>
        <Text style={styles.sLabel}>{label}</Text>
        <Text style={[styles.sValue, { color }]}>
            {value} <Text style={styles.sUnit}>{unit}</Text>
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 45,
        paddingHorizontal: 15,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        marginBottom: 30,
        fontWeight: 'bold',
        color: '#333399'
    },

    dateRangeBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#F8F9FE',
        margin: 15,
        padding: 12,
        borderRadius: 15
    },

    dateTab: { alignItems: 'center', marginHorizontal: 20 },
    dateLabel: { fontSize: 9, color: '#AAA', fontWeight: 'bold' },
    dateVal: { fontSize: 14, color: '#333399', fontWeight: 'bold' },

    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 20,
        gap: 10
    },

    sCard: {
        width: '31%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE'
    },

    sLabel: { fontSize: 9, fontWeight: 'bold', color: '#00C853' },
    sValue: { fontSize: 18, fontWeight: 'bold' },
    sUnit: { fontSize: 10, color: '#999' },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 10
    },



    tenantName: { flex: 2, fontWeight: 'bold' },
    meterSn: { flex: 2, color: '#00C853' },
    readVal: { flex: 1.5, color: '#666' },
    closing: { textAlign: 'right', fontWeight: 'bold', color: '#000' },

    noData: { textAlign: 'center', padding: 20, color: '#999' },

    footer: {
        padding: 15,
        borderTopWidth: 1,
        borderColor: '#EEE'
    },

    submitBtn: {
        backgroundColor: '#00E676',
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },

    submitText: { fontSize: 16, fontWeight: 'bold', marginRight: 8 }, dgContainer: {
        paddingHorizontal: 15,
        marginBottom: 20
    },

    dgCard: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 12,
        marginBottom: 10
    },

    dgName: {
        fontWeight: 'bold',
        color: '#333399',
        marginBottom: 4
    },
    table: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
     tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
    hText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },

   tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#F1F1F1',
  },
  cell: {
    fontSize: 12,
    color: '#111827',
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
  },


});

export default ReadingsReviewScreen;
