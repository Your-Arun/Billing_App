import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import API_URL from '../services/apiconfig';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Reading Taker');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || !password) {
      return Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Name, Phone & Password required'
      });
    }

    if (role === 'Admin' && !companyName) {
      return Toast.show({
        type: 'error',
        text1: 'Company name required'
      });
    }

    if (role === 'Reading Taker' && !adminCodeInput) {
      return Toast.show({
        type: 'error',
        text1: 'Admin code required'
      });
    }

    const payload = {
      name,
      phone,
      password,
      role
    };

    if (role === 'Admin') payload.companyName = companyName;
    if (role === 'Reading Taker') payload.adminCodeInput = adminCodeInput;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/signup`, payload);

      Toast.show({
        type: 'success',
        text1: 'Account Created',
        text2: role === 'Admin'
          ? `Company Code: ${res.data.adminCode}`
          : 'You can now login'
      });

      setTimeout(() => navigation.navigate('Login'), 2000);

    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: err.response?.data?.msg || 'Server error'
      });
    } finally {
      setLoading(false);
    }
  };

 return (
  <ScrollView contentContainerStyle={styles.container}>
    {/* HEADER */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Create Account</Text>
      <Text style={styles.headerSub}>Tenant Billing System</Text>
    </View>

    {/* FORM CARD */}
    <View style={styles.formCard}>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Who are you?</Text>

      <View style={styles.roleRow}>
        {['Admin', 'Reading Taker'].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, role === r && styles.roleActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'Admin' && (
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          value={companyName}
          onChangeText={setCompanyName}
        />
      )}

      {role === 'Reading Taker' && (
        <TextInput
          style={styles.input}
          placeholder="Admin / Company Code"
          value={adminCodeInput}
          onChangeText={setAdminCodeInput}
          autoCapitalize="characters"
        />
      )}

      <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>
  {loading
    ? <ActivityIndicator color="#fff" />
    : <Text style={styles.btnText}>REGISTER</Text>
  }
</TouchableOpacity>

{/* Login switch link */}
<TouchableOpacity
  onPress={() => navigation.navigate('Login')}
  style={{ marginTop: 20, alignItems: 'center' }}
>
  <Text style={{ color: '#333399' }}>
    Already have an account? <Text style={{ fontWeight: 'bold' }}>Login</Text>
  </Text>
</TouchableOpacity>

    </View>
  </ScrollView>
);

};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6fc'
  },

  header: {
    backgroundColor: '#333399',
    paddingVertical: 45,
    alignItems: 'center',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35
  },

  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },

  headerSub: {
    color: '#ddd',
    marginTop: 5,
    fontSize: 13
  },

  formCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -30,
    borderRadius: 20,
    padding: 25,
    elevation: 5
  },

  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 12,
    marginBottom: 15
  },

  roleRow: {
    flexDirection: 'row',
    marginBottom: 15
  },

  roleBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333399',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5
  },

  roleActive: {
    backgroundColor: '#333399'
  },

  roleText: {
    color: '#333399',
    fontWeight: 'bold'
  },

  roleTextActive: {
    color: '#fff'
  },

  btn: {
    backgroundColor: '#333399',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },

  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});


export default SignupScreen;
