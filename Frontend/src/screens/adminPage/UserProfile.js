import React, { useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UserContext } from '../../services/UserContext';
const UserProfile = ({ visible, onClose }) => {
  const { user, logout } = useContext(UserContext);


  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.profileModal}>

          <View style={styles.avatarSection}>
            <MaterialCommunityIcons name="account-circle" size={80} color="#333399" />
            <Text style={styles.modalTitle}>User Profile</Text>
          </View>


          <View style={styles.infoBox}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{user?.name || "N/A"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Company Name:</Text>
              <Text style={styles.value}>{user?.companyName || "N/A"}</Text>
            </View>


            <View style={styles.detailRow}>
              <Text style={styles.label}>Role:</Text>
              <Text style={styles.value}>{user?.role || "N/A"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{user?.email || "N/A"}</Text>
            </View>


            {user?.role === 'Admin' && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Reading Taker Code:</Text>
                <Text style={[styles.value, { color: '#333399', fontWeight: 'bold' }]}>
                  {user?.adminCode}
                </Text>
              </View>
            )}


          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              onClose();
              logout();
            }}
          >
            <MaterialCommunityIcons name="logout" size={20} color="white" />
            <Text style={styles.logoutBtnText}>Logout Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Back</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  profileModal: { backgroundColor: 'white', borderRadius: 30, padding: 25, width: '85%', elevation: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333399', marginTop: 5 },
  infoBox: { width: '100%', marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontWeight: 'bold', color: '#666', fontSize: 14 },
  value: { color: '#333', fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#d32f2f', flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  logoutBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  closeBtn: { marginTop: 20, alignSelf: 'center' },
  closeText: { color: '#666', fontWeight: 'bold' }
});

export default UserProfile;