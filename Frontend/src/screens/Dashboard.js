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
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Dashboard = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  
  const [data, setData] = useState({
    totalTenants: 0,
    pendingCount: 0,
    latestProfit: 0,
    totalCollection: 0,
    gridBill: 0,
    solarUnits: 0,
    dgUnits: 0,
    lossPercent: 0,
    chartLabels: ["-"],
    chartData: [0]
  });

  const adminId = user?._id || user?.id;

  const fetchDashboardData = useCallback(async () => {
    if (!adminId) return;
    try {
      const [tenants, pending, solar, dg, summary] = await Promise.allSettled([
        axios.get(`${API_URL}/tenants/${adminId}`),
        axios.get(`${API_URL}/readings/pending/${adminId}`),
        axios.get(`${API_URL}/solar/history/${adminId}`),
        axios.get(`${API_URL}/dg/dgsummary/${adminId}`),
        axios.get(`${API_URL}/statement/companysummary/${adminId}`)
      ]);

      const summaryList = summary.status === 'fulfilled' ? (summary.value.data || []) : [];
      const latestMonth = summaryList[0] || {};
      
      let labels = ["-"];
      let points = [0];
      if (summaryList.length > 0) {
        labels = summaryList.slice(0, 5).reverse().map(s => s.month ? String(s.month).split(' ')[0] : (s._id ? String(s._id).split(' ')[0] : "N/A"));
        points = summaryList.slice(0, 5).reverse().map(s => Number(s.totalTenantAmountSum) || 0);
      }

      const dgRaw = dg.status === 'fulfilled' ? dg.value.data : null;
      const totalDgUnits = dgRaw?.dgSummary?.reduce((acc, curr) => acc + (Number(curr.totalUnits) || 0), 0) || 0;

      const solarList = solar.status === 'fulfilled' ? (solar.value.data || []) : [];
      const latestSolar = solarList[0]?.unitsGenerated || 0;

      setData({
        totalTenants: tenants.status === 'fulfilled' ? (tenants.value.data?.length || 0) : 0,
        pendingCount: pending.status === 'fulfilled' ? (pending.value.data?.length || 0) : 0,
        latestProfit: latestMonth.profit || 0,
        totalCollection: latestMonth.totalTenantAmountSum || 0,
        gridBill: latestMonth.gridAmount || 0,
        solarUnits: latestSolar,
        dgUnits: totalDgUnits,
        lossPercent: latestMonth.lossPercent || 0,
        chartLabels: labels,
        chartData: points
      });

    } catch (e) {
      console.log("Dashboard Global Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminId]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const navIcons = [
    
    { name: 'Monthly', icon: 'file-document', route: 'MonthlyBilling', color: '#000' },
    { name: 'Concilliation', icon: 'scale-balance', route: 'Reconciliation', color: '#8B5CF6' },
    { name: 'AVVNL Bill', icon: 'lightning-bolt', route: 'Bill', color: '#F59E0B' },
    { name: 'Readings', icon: 'speedometer', route: 'Readings', color: '#6366F1' },
    { name: 'Approval', icon: 'check-decagram', route: 'Approval', color: '#10B981', badge: data.pendingCount },
    { name: 'Tenants', icon: 'account-group', route: 'Tenants', color: '#3B82F6' },
    
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchDashboardData();}} tintColor="#333399" />}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setProfileVisible(true)}>
              <MaterialCommunityIcons name="account-circle" size={50} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName} numberOfLines={1}>{user?.companyName || "Admin"}</Text>
            </View>
            <View style={styles.lossBadge}>
               <Text style={styles.lossText}>{data.lossPercent}% Loss</Text>
            </View>
          </View>

          <View style={styles.profitCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profitLabel}>MONTHLY ESTIMATED PROFIT</Text>
              <Text style={styles.profitValue}>₹ {Math.round(data.latestProfit).toLocaleString('en-IN')}</Text>
              <View style={styles.profitSubRow}>
                <Text style={styles.profitSub}>Coll: ₹{Math.round(data.totalCollection)}</Text>
                <Text style={[styles.profitSub, {marginLeft: 10}]}>Bill: ₹{Math.round(data.gridBill)}</Text>
              </View>
            </View>
            <View style={[styles.profitIconBox, { backgroundColor: data.latestProfit >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
               <MaterialCommunityIcons 
                 name={data.latestProfit >= 0 ? "trending-up" : "trending-down"} 
                 size={32} 
                 color={data.latestProfit >= 0 ? "#16A34A" : "#DC2626"} 
               />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <MiniStat label="Tenants" value={data.totalTenants} icon="office-building" color="#3B82F6" />
            <MiniStat label="Solar" value={`${data.solarUnits}u`} icon="solar-power" color="#F59E0B" />
            <MiniStat label="DG Units" value={`${data.dgUnits}u`} icon="engine" color="#EF4444" />
          </View>

          {/* 🟢 SINGLE ROW MANAGEMENT MENU */}
          <Text style={styles.sectionTitle}>Management Menu</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.horizontalMenu}
          >
            {navIcons.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuCard} onPress={() => navigation.navigate(item.route)}>
                <View style={[styles.iconCircle, { backgroundColor: item.color + '12' }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.cardText} numberOfLines={1}>{item.name}</Text>
                {item.badge > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* CHART */}
          <Text style={styles.sectionTitle}>Collection Trend (₹)</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: data.chartLabels,
                datasets: [{ data: data.chartData }]
              }}
              width={width-80}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 16 }}
            />
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
};

// --- Helper Component ---
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
  color: (opacity = 1) => `rgba(51, 51, 153, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#333399" }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#333399', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerInfo: { flex: 1, marginLeft: 15 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  userName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  lossBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  lossText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
  profitCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: -45 },
  profitLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 0.5 },
  profitValue: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginVertical: 2 },
  profitSubRow: { flexDirection: 'row', marginTop: 3 },
  profitSub: { fontSize: 10, color: '#16A34A', fontWeight: 'bold' },
  profitIconBox: { padding: 12, borderRadius: 15 },

  content: { paddingHorizontal: 20, marginTop: 55 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  miniStatCard: { backgroundColor: '#FFF', width: '31%', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 2 },
  miniStatValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 5 },
  miniStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginVertical: 5, marginLeft: 5, },
  chartCard: { backgroundColor: '#FFF', padding: 5, borderRadius: 24, elevation: 3 },
  
  // 🟢 Horizontal Menu Styles
  horizontalMenu: { paddingLeft: 5, paddingRight: 20, marginBottom:20 },
  menuCard: { 
    backgroundColor: '#FFF', 
    width: 100, 
    paddingVertical: 15, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginRight: 12, 
    elevation: 5, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  iconCircle: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cardText: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  badge: { position: 'absolute', top: 5, right: 10, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' }
});

export default Dashboard;