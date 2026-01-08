import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { UserContext } from '../services/UserContext';
import API_URL from '../services/apiconfig';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(UserContext);

  const handleLogin = async () => {
  if (!phone || !password) {
    return Toast.show({ type: 'error', text1: 'Phone & Password required' });
  }

  setLoading(true);
  try {
    const res = await axios.post(`${API_URL}/login`, { phone, password });

    const userData = {
      id: res.data.user._id,
      name: res.data.user.name,
      role: res.data.user.role,
      token: res.data.token,
      adminCode: res.data.user.adminCode || null,
      belongsToAdmin: res.data.user.belongsToAdmin || null
    };

    await login(userData);

    Toast.show({
      type: 'success',
      text1: 'Login Successful',
      text2: `Welcome ${userData.name}`
    });

    if (userData.role === 'Admin') navigation.replace('Dashboard');
    else navigation.replace('ReadingTakerScreen');

  } catch (err) {
    Toast.show({
      type: 'error',
      text1: 'Login Failed',
      text2: err.response?.data?.msg || 'Invalid phone or password'
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Electricity Billing</Text>
          <Text style={styles.subtitle}>Tenant Management System</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.loginText}>Login to Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>LOGIN</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.signupLink}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scrollContainer: { flexGrow: 1 },
  header: {
    backgroundColor: '#333399',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 5
  },
  appTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 14, marginTop: 5 },
  formCard: {
    backgroundColor: 'white',
    marginHorizontal: 25,
    marginTop: -40,
    borderRadius: 20,
    padding: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  loginText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 25, textAlign: 'center' },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16,
    marginBottom: 15
  },
  loginButton: {
    backgroundColor: '#333399',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2
  },
  disabledButton: { backgroundColor: '#7777aa' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  signupLink: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  linkBold: { color: '#333399', fontWeight: 'bold' }
});

export default LoginScreen;
