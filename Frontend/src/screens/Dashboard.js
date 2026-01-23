import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, 
  ActivityIndicator, RefreshControl, StatusBar, SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import UserProfile from './adminPage/UserProfile';
import { UserContext } from '../services/UserContext';
import axios from 'axios';
import API_URL from '../services/apiconfig';

const { width } = Dimensions.get('window');

const Dashboard = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States for all API Data
  const [data, setData] = useState({
    tenants: 0,
    pending: 0,
    latestBill: 0,
    latestSolar: 0,
    latestDGUnits: 0,
    profit: 0,
    chartLabels: ["Jan", "Feb", "Mar"],
    chartData: [0, 0, 0]
  });

  const adminId = user?._id || user?.id;

  const fetchEverything = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      // 1️⃣ Parallel API Calls
      const [tenantsRes, pendingRes, billRes, solarRes, dgRes, summaryRes] = await Promise.allSettled([
        axios.get(`${API_URL}/tenants/${adminId}`),
        axios.get(`${API_URL}/readings/pending/${adminId}`),
        axios.get(`${API_URL}/bill/history/${adminId}`),
        axios.get(`${API_URL}/solar/history/${adminId}`),
        axios.get(`${API_URL}/dg/dgsummary/${adminId}`),
        axios.get(`${API_URL}/statement/company-summary/${adminId}`)
      ]);

      // 2️⃣ Extract Values
      const tCount = tenantsRes.status === 'fulfilled' ? tenantsRes.value.data?.length : 0;
      const pCount = pendingRes.status === 'fulfilled' ? pendingRes.value.data?.length : 0;
      const latestBillAmt = billRes.status === 'fulfilled' ? (billRes.value.data?.[0]?.totalAmount || 0) : 0;
      const latestSolarGen = solarRes.status === 'fulfilled' ? (solarRes.value.data?.[0]?.unitsGenerated || 0) : 0;
      
      const dgData = dgRes.status === 'fulfilled' ? dgRes.value.data?.dgSummary : [];
      const totalDGUnits = dgData?.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0) || 0;

      // 3️⃣ Company Performance (Summary)
      const historySummary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : [];
      const currentMonthStats = historySummary[0] || {};
      
      // Chart Data Prep (Last 5 Months)
      const labels = historySummary.slice(0, 5).reverse().map(s => s._id.split(' ')[0]);
      const consumptionPoints = historySummary.slice(0, 5).reverse().map(s => s.totalTenantUnitsSum || 0);

      setData({
        tenants: tCount,
        pending: pCount,
        latestBill: latestBillAmt,
        latestSolar: latestSolarGen,
        latestDGUnits: totalDGUnits,
        profit: currentMonthStats.profit || 0,
        chartLabels: labels.length > 0 ? labels : ["No Data"],
        chartData: consumptionPoints.length > 0 ? consumptionPoints : [0]
      });

    } catch (e) {
      console.log("Dashboard Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchEverything();
  }, [fetchEverything]);

  const navIcons = [
    { name: 'Readings', icon: 'speedometer', route: 'Readings', color: '#6366F1' },
    { name: 'Approval', icon: 'check-decagram', route: 'Approval', color: '#10B981', badge: data.pending },
    { name: 'Grid Bill', icon: 'lightning-bolt', route: 'Bill', color: '#F59E0B' },
    { name: 'Tenants', icon: 'account-group', route: 'Tenants', color: '#3B82F6' },
    { name: 'Analyze', icon: 'scale-balance', route: 'Reconciliation', color: '#8B5CF6' },
    { name: 'Statements', icon: 'file-document-multiple', route: 'Statement', color: '#EC4899' },
  ];

  if (loading && !refreshing) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#333399" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchEverything} tintColor="#333399" />}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setProfileVisible(true)}>
              <MaterialCommunityIcons name="account-circle" size={50} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{user?.name || "Admin"}</Text>
            </View>
            <View style={styles.headerDateBox}>
               <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</Text>
            </View>
          </View>

          {/* MAIN BUSINESS CARD */}
          <View style={styles.profitCard}>
            <View>
              <Text style={styles.profitLabel}>ESTIMATED PROFIT (MONTHLY)</Text>
              <Text style={styles.profitValue}>₹ {data.profit.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.profitIconBox}>
               <MaterialCommunityIcons name="trending-up" size={30} color="#10B981" />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* QUICK STATS GRID */}
          <View style={styles.statsGrid}>
            <MiniStat label="Tenants" value={data.tenants} icon="office-building" color="#3B82F6" />
            <MiniStat label="Solar Gen" value={`${data.latestSolar}u`} icon="solar-power" color="#F59E0B" />
            <MiniStat label="DG Load" value={`${data.latestDGUnits}u`} icon="engine" color="#EF4444" />
          </View>

          {/* ANALYTICS CHART */}
          <Text style={styles.sectionTitle}>Consumption Trends (kWh)</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: data.chartLabels,
                datasets: [{ data: data.chartData }]
              }}
              width={width - 40}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
            />
          </View>

          {/* NAVIGATION GRID */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.navGrid}>
            {navIcons.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.navCard} 
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
                </View>
                <Text style={styles.navText}>{item.name}</Text>
                {item.badge > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
};

// --- Helper Components ---
const MiniStat = ({ label, value, icon, color }) => (
  <View style={styles.miniStatCard}>
    <MaterialCommunityIcons name={icon} size={20} color={color} />
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const chartConfig = {
  backgroundGradientFrom: "#FFF",
  backgroundGradientTo: "#FFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#6366F1" },
  style: { borderRadius: 16 }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    backgroundColor: '#333399', 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 60, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40 
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  headerInfo: { flex: 1, marginLeft: 15 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  userName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerDateBox: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  headerDate: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  profitCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 25, 
    padding: 22, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: -40
  },
  profitLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },
  profitValue: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginTop: 5 },
  profitIconBox: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 15 },

  content: { paddingHorizontal: 20, marginTop: 50 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  miniStatCard: { backgroundColor: '#FFF', width: '31%', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05 },
  miniStatValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 5 },
  miniStatLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 15, marginLeft: 5 },
  chartCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 25 },
  chartStyle: { borderRadius: 16 },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  navCard: { 
    backgroundColor: '#FFF', 
    width: '48%', 
    paddingVertical: 20, 
    borderRadius: 22, 
    alignItems: 'center', 
    marginBottom: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  navText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  
  badgeContainer: { position: 'absolute', top: 12, right: 15, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});

export default Dashboard;