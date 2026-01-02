import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserContext } from '../services/UserContext';

const ReadingTakerScreen = ({ navigation }) => {
  const { user, logout } = useContext(UserContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff: {user?.name}</Text>
      <Text style={styles.subtitle}>Daily Reading Entry</Text>

      {/* स्लाइड 6 वाला बटन */}
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('ReadingEntry')}
      >
        <Text style={styles.buttonText}>+ Enter New Reading</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={{color: 'red'}}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  actionButton: { backgroundColor: '#333399', padding: 20, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  logoutBtn: { marginTop: 50, alignSelf: 'center' }
});

export default ReadingTakerScreen;