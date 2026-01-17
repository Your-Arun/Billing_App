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

    setLoading(true);
    try {
      // Backend logic ke hisab se 'identifier' key bhejni hai
      await axios.post(`${API_URL}/forgot-password`, { identifier: email });
      
      Toast.show({ type: 'success', text1: 'OTP Sent 📧', text2: 'Check your email inbox' });
      setStep(2); // OTP box dikhayein
    } catch (error) {
      console.log(error.message);
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: error.response?.data?.msg || 'User not found' 
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: OTP Verify aur Password Reset karne ka function ---
  const handleResetPassword = async () => {
    if (otp.length < 6) {
      return Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Enter 6-digit code' });
    }
    if (!newPassword) {
      return Toast.show({ type: 'error', text1: 'Required', text2: 'Enter new password' });
    }

    setLoading(true);
    try {
      // Backend logic: Same endpoint, but sending identifier + otp + newPassword
      const res = await axios.post(`${API_URL}/forgot-password`, {
        identifier: email,
        otp: otp,
        newPassword: newPassword
      });

      if (res.status === 200) {
        Toast.show({ type: 'success', text1: 'Success ✅', text2: 'Password changed successfully' });
        navigation.navigate('Login'); // Success ke baad login par bhejein
      }
    } catch (error) {
      Toast.show({ 
        type: 'error', 
        text1: 'Failed', 
        text2: error.response?.data?.msg || 'Invalid OTP or Expired' 
      });
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
            : `We have sent a 6-digit code to ${email}`}
        </Text>

        {/* --- STEP 1: Email Input --- */}
        {step === 1 && (
          <View style={styles.inputWrapper}>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#666" style={{marginRight: 10}} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter registered email"
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

        {/* --- STEP 2: OTP & New Password Input --- */}
        {step === 2 && (
          <View style={styles.inputWrapper}>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="numeric" size={22} color="#666" style={{marginRight: 10}} />
              <TextInput
                style={styles.textInput}
                placeholder="6-Digit OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <View style={[styles.inputBox, {marginTop: 15}]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#666" style={{marginRight: 10}} />
              <TextInput
                style={styles.textInput}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.mainBtn} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>RESET PASSWORD</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setStep(1)} style={{marginTop: 20, alignSelf: 'center'}}>
              <Text style={{color: '#333399', fontWeight: '600'}}>Edit Email / Resend</Text>
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
  content: { paddingHorizontal: 30, alignItems: 'center' },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1C3D', marginBottom: 10 },
  subTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  inputWrapper: { width: '100%' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFF', borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#EDF1FF' },
  textInput: { flex: 1, fontSize: 16, color: '#333' },
  mainBtn: { backgroundColor: '#333399', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});