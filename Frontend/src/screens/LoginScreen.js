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
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = send otp, 2 = verify otp
  const [loading, setLoading] = useState(false);

  const { login } = useContext(UserContext);

  // 🔹 SEND OTP
  const handleSendOtp = async () => {
    if (!phone) {
      return Toast.show({ type: 'error', text1: 'Phone required' });
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/login/send-otp`, { phone });

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'Check your WhatsApp'
      });

      setStep(2);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: err.response?.data?.msg || 'OTP not sent'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 VERIFY OTP
  const handleVerifyOtp = async () => {
    if (!otp) {
      return Toast.show({ type: 'error', text1: 'OTP required' });
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login/verify-otp`, {
        phone,
        otp
      });

      const userData = {
        id: res.data.user._id,
        name: res.data.user.name,
        role: res.data.user.role,
        companyName: res.data.user.companyName,
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
        text1: 'Invalid OTP',
        text2: err.response?.data?.msg || 'OTP verification failed'
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
          <Text style={styles.loginText}>
            {step === 1 ? 'Login with Phone' : 'Enter OTP'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={step === 1}
          />

          {step === 2 && (
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
            />
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 1 ? 'SEND OTP' : 'VERIFY OTP'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 2 && (
            <TouchableOpacity onPress={() => setStep(1)} style={styles.signupLink}>
              <Text style={styles.linkText}>Change Phone Number</Text>
            </TouchableOpacity>
          )}
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
