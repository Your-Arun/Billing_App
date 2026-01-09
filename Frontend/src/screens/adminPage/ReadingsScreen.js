import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { UserContext } from '../../services/UserContext';
import API_URL from '../../services/apiconfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const ReadingsScreen = () => {
  const { user } = useContext(UserContext);
  const adminId = user?._id || user?.id;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Export modal
  const [showModal, setShowModal] = useState(false);

  // Date states
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);


  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
  if (adminId) {
    fetchLogs();
  }
}, [adminId]);

const fetchLogs = async () => {
  if (!adminId) return;

  setLoading(true);
  try {
    const res = await axios.get(
      `${API_URL}/readings/all/${adminId}`
    );
    setLogs(res.data);
  } catch (e) {
    console.log('Fetch error:', e.response?.data || e.message);
  } finally {
    setLoading(false);
  }
};

 const exportExcel = async () => {
  setShowModal(false);

  const url =
    `${API_URL}/readings/export/${adminId}` +
    `?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;

  try {
    // 🌐 WEB → direct download
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    // 📱 MOBILE → file download + share
    const fileUri =
      FileSystem.documentDirectory +
      `Meter_Readings_${Date.now()}.xlsx`;

    const result = await FileSystem.downloadAsync(url, fileUri);

    if (result.status === 200) {
      await Sharing.shareAsync(result.uri);
    } else {
      console.log('Download failed');
    }
  } catch (e) {
    console.log('Export error:', e);
  }
};


  const renderRow = ({ item }) => {
    const d = new Date(item.createdAt);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.tenant}>{item.tenantId?.name}</Text>
          <Text style={styles.date}>
            {d.toLocaleDateString()} ·{' '}
            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.reading}>{item.closingReading} kWh</Text>
            <Text style={styles.staff}>
              Entered by {item.staffId?.name || item.staffId}
            </Text>
          </View>

          <MaterialCommunityIcons name="flash" size={26} color="#4F46E5" />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meter Readings</Text>
          <Text style={styles.subtitle}>{logs.length} Records</Text>
        </View>

        <TouchableOpacity
          style={styles.excelBtn}
          onPress={() => setShowModal(true)}
        >
          <MaterialCommunityIcons name="microsoft-excel" size={22} color="#1D6F42" />
          <Text style={styles.excelText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          renderItem={renderRow}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLogs} />}
        />
      )}

      {/* EXPORT MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.sheetBg}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Export Excel</Text>

            {/* FROM */}
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowFromPicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} />
              <Text>From: {fromDate.toDateString()}</Text>
            </TouchableOpacity>

            {/* TO */}
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowToPicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} />
              <Text>To: {toDate.toDateString()}</Text>
            </TouchableOpacity>

            {showFromPicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowFromPicker(false);
                  if (d) setFromDate(d);
                }}
              />
            )}

            {showToPicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowToPicker(false);
                  if (d) setToDate(d);
                }}
              />
            )}

            <TouchableOpacity style={styles.downloadBtn} onPress={exportExcel}>
              <MaterialCommunityIcons name="download" size={20} color="white" />
              <Text style={styles.downloadText}>Download Excel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FF',
  },

  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },

  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },

  excelBtn: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },

  excelText: {
    color: '#1D6F42',
    fontWeight: '600',
  },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 16,
    borderRadius: 18,
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  tenant: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  date: {
    fontSize: 11,
    color: '#6B7280',
  },

  cardBottom: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  reading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
  },

  staff: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    color: '#999',
  },

  sheetBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },

  dateBtn: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 10,
  },

  downloadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
  },

  downloadText: {
    color: 'white',
    fontWeight: '700',
  },
});

export default ReadingsScreen;
