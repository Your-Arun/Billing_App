import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
  ActivityIndicator, RefreshControl, StatusBar, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from "react-native-chart-kit";
import UserProfile from './adminPage/UserProfile';
import { UserContext } from '../services/UserContext';
import axios from 'axios';
import API_URL from '../services/apiconfig';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const chartConfig = {
  backgroundGradientFrom: "#FFF",
  backgroundGradientTo: "#FFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(51, 51, 153, ${opacity})`, 
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#333399" }
};

const Dashboard = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [profileVisible, setProfileVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState({
    totalTenants: 0, pendingCount: 0, latestProfit: 0, totalCollection: 0,
    gridBill: 0, solarUnits: 0, dgUnits: 0, lossPercent: 0,
    chartLabels: ["-"], chartData: [0]
  });

  const adminId = user?._id || user?.id;

  const loadCache = useCallback(async () => {
    if (!adminId) return;
    try {
      const cached = await AsyncStorage.getItem(`dashboard_cache_${adminId}`);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false); 
      }
    } catch (e) { console.log("Cache Load Error", e); }
  }, [adminId]);

  const fetchDashboardData = useCallback(async () => {
    if (!adminId) return;
    try {
      const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const [tenants, pending, solar, dg, summary] = await Promise.allSettled([
        axios.get(`${API_URL}/tenants/${adminId}`),
        axios.get(`${API_URL}/readings/pending/${adminId}`),
        axios.get(`${API_URL}/solar/history/${adminId}`),
        axios.get(`${API_URL}/dg/dgsummary/${adminId}`, { params: { monthKey } }), 
        axios.get(`${API_URL}/statement/companysummary/${adminId}`)
      ]);

      const summaryList = summary.status === 'fulfilled' ? (summary.value.data || []) : [];
      const latestMonth = summaryList[0] || {};

      let labels = ["-"], points = [0];
      if (summaryList.length > 0) {
        labels = summaryList.slice(0, 5).reverse().map(s => s.month ? String(s.month).split(' ')[0] : (s._id ? String(s._id).split(' ')[0] : "N/A"));
        points = summaryList.slice(0, 5).reverse().map(s => Number(s.totalTenantAmountSum) || 0);
      }

      const dgRaw = dg.status === 'fulfilled' ? dg.value.data : null;
      const totalDgUnits = dgRaw?.dgSummary?.reduce((acc, curr) => acc + (Number(curr.totalUnits) || 0), 0) || 0;
      const solarList = solar.status === 'fulfilled' ? (solar.value.data || []) : [];

      const updatedData = {
        totalTenants: tenants.status === 'fulfilled' ? (tenants.value.data?.length || 0) : 0,
        pendingCount: pending.status === 'fulfilled' ? (pending.value.data?.length || 0) : 0,
        latestProfit: latestMonth.profit || 0,
        totalCollection: latestMonth.totalTenantAmountSum || 0,
        gridBill: latestMonth.gridAmount || 0,
        solarUnits: solarList[0]?.unitsGenerated || 0,
        dgUnits: totalDgUnits,
        lossPercent: latestMonth.lossPercent || 0,
        chartLabels: labels,
        chartData: points
      };

      setData(updatedData);
      await AsyncStorage.setItem(`dashboard_cache_${adminId}`, JSON.stringify(updatedData));
    } catch (e) { console.log("Dashboard Global Error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [adminId]);

  useEffect(() => { loadCache(); }, [loadCache]);
  useFocusEffect(useCallback(() => { fetchDashboardData(); }, [fetchDashboardData]));

  const navIcons = [
    { name: 'Monthly', icon: 'calendar-month', route: 'MonthlyBilling', color: '#1E293B' },
    { name: 'Analyze', icon: 'chart-box', route: 'Reconciliation', color: '#8B5CF6' },
    { name: 'AVVNL Bill', icon: 'lightning-bolt', route: 'Bill', color: '#F59E0B' },
    { name: 'Readings', icon: 'moped', route: 'Readings', color: '#6366F1' },
    { name: 'Approval', icon: 'check-circle', route: 'Approval', color: '#10B981', badge: data.pendingCount },
    { name: 'Tenants', icon: 'office-building', route: 'Tenants', color: '#3B82F6' },
    { name: 'Invoices', icon: 'file-pdf-box', route: 'Statement', color: '#EC4899' },
  ];

  if (loading && data.totalTenants === 0 && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#333399" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#333399" translucent={false} />
      <View style={styles.fixedHeader}>
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
              <Text style={styles.profitLabel}>ESTIMATED PROFIT</Text>
              <Text style={styles.profitValue}>₹ {Math.round(data.latestProfit).toLocaleString('en-IN')}</Text>
              <View style={styles.profitSubRow}>
                <Text style={styles.profitSub}>Coll: ₹{Math.round(data.totalCollection)}</Text>
                <Text style={[styles.profitSub, { marginLeft: 10 }]}>Bill: ₹{Math.round(data.gridBill)}</Text>
              </View>
            </View>
            <View style={[styles.profitIconBox, { backgroundColor: data.latestProfit >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
              <MaterialCommunityIcons
                name={data.latestProfit >= 0 ? "arrow-up-bold" : "arrow-down-bold"}
                size={32}
                color={data.latestProfit >= 0 ? "#16A34A" : "#DC2626"}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.scrollContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor="#333399" />}
        >
          <View style={styles.scrollSpacer} />

          <View style={styles.content}>
            <View style={styles.statsGrid}>
              <MiniStat label="Tenants" value={data.totalTenants} icon="office-building" color="#3B82F6" />
              <MiniStat label="Solar" value={`${data.solarUnits}u`} icon="solar-power" color="#F59E0B" />
              <MiniStat label="DG Units" value={`${data.dgUnits}u`} icon="engine" color="#EF4444" />
            </View>

            <Text style={styles.sectionTitle}>Management Menu</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalMenu}
            >
              {navIcons.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.menuCard} 
                  onPress={() => navigation.navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                    <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>{item.name}</Text>
                  {item.badge > 0 && (
                    <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Collection Trend (₹)</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{ labels: data.chartLabels, datasets: [{ data: data.chartData }] }}
                width={width - 50} 
                height={180}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 16 }}
              />
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <UserProfile visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </SafeAreaView>
  );
};

const MiniStat = ({ label, value, icon, color }) => (
  <View style={styles.miniStatCard}>
    <MaterialCommunityIcons name={icon} size={20} color={color} />
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#333399' }, 
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  header: { 
    backgroundColor: '#333399', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 50 : 50, 
    paddingBottom: 60, 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35, 
    elevation: 10 
  },
  
  scrollContainer: { flex: 1, backgroundColor: '#F8FAFC' }, 
  scrollSpacer: { height: 230 },

  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerInfo: { flex: 1, marginLeft: 15 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  userName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  lossBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  lossText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
  profitCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 25, 
    padding: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 10, 
    marginBottom: -45,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  profitLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },
  profitValue: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  profitSubRow: { flexDirection: 'row', marginTop: 3 },
  profitSub: { fontSize: 10, color: '#16A34A', fontWeight: 'bold' },
  profitIconBox: { padding: 12, borderRadius: 15 },
  
  content: { paddingHorizontal: 20, marginTop: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  miniStatCard: { backgroundColor: '#FFF', width: '31%', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 2 },
  miniStatValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 5 },
  miniStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginVertical: 15, marginLeft: 5 },
  chartCard: { 
    backgroundColor: '#FFF', 
    padding: 10, 
    borderRadius: 24, 
    elevation: 4,
    alignItems: 'center',
    overflow: 'hidden'
  },
  
  horizontalMenu: { paddingLeft: 5, paddingRight: 20, paddingVertical: 10 },
  menuCard: {
    backgroundColor: '#FFF',
    width: 95,
    height: 110,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconCircle: { 
    width: 54, 
    height: 54, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  cardText: { fontSize: 11, fontWeight: '800', color: '#334155', textAlign: 'center' },
  badge: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    backgroundColor: '#EF4444', 
    paddingHorizontal: 7, 
    paddingVertical: 3, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF'
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});

export default Dashboard;