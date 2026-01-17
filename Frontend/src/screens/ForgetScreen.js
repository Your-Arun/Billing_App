import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, StatusBar, ScrollView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import API_URL from '../services/apiconfig';

export default function ForgetScreen({ navigation }) {
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Step 1: OTP Bhejne ka function ---
  const handleSendOTP = async () => {
    if (!email) {
      return Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter your email' });
    }
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!reg.test(email)) {
      return Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Check email format' });
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/forget-password`, { email });
      Toast.show({ type: 'success', text1: 'OTP Sent 📧', text2: 'Check your email inbox' });
      setStep(2); // Agle step par bhej dein
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.msg || 'User not found' });
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Password Reset karne ka function ---
  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      return Toast.show({ type: 'error', text1: 'Required', text2: 'Enter OTP and New Password' });
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/reset-password-otp`, {
        email,
        otp,
        newPassword
      });
      Toast.show({ type: 'success', text1: 'Success ✅', text2: 'Password changed successfully' });
      navigation.navigate('Login'); // Seedha Login par bhej dein
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed', text2: error.response?.data?.msg || 'Invalid OTP' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Back Button logic */}
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
      >
        <MaterialCommunityIcons name="chevron-left" size={32} color="#333399" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons 
            name={step === 1 ? "lock-reset" : "shield-check"} 
            size={50} color="#333399" 
          />
        </View>

        <Text style={styles.title}>{step === 1 ? "Forgot Password?" : "Verify OTP"}</Text>
        <Text style={styles.subTitle}>
          {step === 1 
            ? "Enter your email to receive a 6-digit verification code." 
            : `We have sent a code to ${email}`}
        </Text>

        {/* --- STEP 1 UI --- */}
        {step === 1 && (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="example@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity style={styles.mainBtn} onPress={handleSendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>SEND OTP</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* --- STEP 2 UI --- */}
        {step === 2 && (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>4-Digit OTP</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="numeric" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter Code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>New Password</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="********"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.mainBtn} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>RESET PASSWORD</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setStep(1)} style={{marginTop: 15, alignSelf: 'center'}}>
              <Text style={{color: '#666'}}>Resend to different email?</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF' },
  backBtn: { padding: 15, marginTop: 10 },
  content: { paddingHorizontal: 30, alignItems: 'center', marginTop: 20 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1C3D', marginBottom: 10 },
  subTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 20 },
  inputWrapper: { width: '100%' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 8, marginLeft: 5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFF', borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#EDF1FF' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333' },
  mainBtn: { backgroundColor: '#333399', width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30, elevation: 5 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});