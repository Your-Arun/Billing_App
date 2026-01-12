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
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null); 

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_URL}/reconcile/summary/${user.id}`,
        {
          params: {
            from: startDate.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0],
          }
        }
      );

      setData(res.data);
    } catch (err) {
      console.log('Fetch error frontend:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id, startDate, endDate]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  if (loading && !data) {
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

      {/* DATE RANGE */}
      <View style={styles.dateRangeBox}>
        <TouchableOpacity onPress={() => setShowPicker('start')} style={styles.dateTab}>
          <Text style={styles.dateLabel}>FROM</Text>
          <Text style={styles.dateVal}>
            {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </Text>
        </TouchableOpacity>

        <MaterialCommunityIcons name="arrow-right" size={20} color="#CCC" />

        <TouchableOpacity onPress={() => setShowPicker('end')} style={styles.dateTab}>
          <Text style={styles.dateLabel}>TO</Text>
          <Text style={styles.dateVal}>
            {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* SUMMARY CARDS */}
        <View style={styles.summaryGrid}>
          <SummaryCard label="MAIN METER" value={data?.bill?.totalUnits || 0} unit="kWh" />
          <SummaryCard label="SOLAR GEN" value={data?.solar?.totalUnits || 0} unit="kWh" color="#00C853" />
          <SummaryCard label="DG TOTAL" value={data?.dg?.totalUnits || 0} unit="kWh" />
        </View>

        <Text style={styles.sectionTitle}>Tenant Data Verification</Text>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.hText, { flex: 2 }]}>TENANT</Text>
            <Text style={[styles.hText, { flex: 2 }]}>METER</Text>
            <Text style={[styles.hText, { flex: 1.5 }]}>OPENING</Text>
            <Text style={[styles.hText, { flex: 1.5, textAlign: 'right' }]}>CLOSING</Text>
          </View>

          {data?.tenants?.length > 0 ? (
            data.tenants.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tenantName}>{item.tenantName}</Text>
                <Text style={styles.meterSn}>{item.meterId}</Text>
                <Text style={styles.readVal}>{item.opening}</Text>
                <Text style={[styles.readVal, styles.closing]}>
                  {item.closing}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No tenant data</Text>
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

      {/* DATE PICKER */}
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'start' ? startDate : endDate}
          mode="date"
          maximumDate={new Date()}
          onChange={(e, selectedDate) => {
            setShowPicker(null);
            if (selectedDate) {
              showPicker === 'start'
                ? setStartDate(selectedDate)
                : setEndDate(selectedDate);
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
    marginBottom: 20
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

  tableHeader: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FAFAFA'
  },

  hText: { fontSize: 10, fontWeight: 'bold', color: '#999' },

  tableRow: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#F5F5F5'
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

  submitText: { fontSize: 16, fontWeight: 'bold', marginRight: 8 }
});

export default ReadingsReviewScreen;
