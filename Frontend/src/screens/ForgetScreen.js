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

  const handleAction = async () => {
    if (step === 1) {
      if (!email) return Toast.show({ type: 'error', text1: 'Email required' });
      setLoading(true);
      try {
        await axios.post(`${API_URL}/forgot-password`, { identifier: email });
        Toast.show({ type: 'success', text1: 'OTP Sent 📧', text2: 'Check your email' });
        setStep(2);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.msg || 'Failed' });
      } finally {
        setLoading(false);
      }
    } else {
      if (!otp || !newPassword) return Toast.show({ type: 'error', text1: 'Fill all fields' });
      setLoading(true);
      try {
        await axios.post(`${API_URL}/forgot-password`, { 
          identifier: email, 
          otp, 
          newPassword 
        });
        Toast.show({ type: 'success', text1: 'Success ✅', text2: 'Password Updated' });
        navigation.navigate('Login');
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Failed', text2: error.response?.data?.msg || 'Invalid OTP' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
        <MaterialCommunityIcons name="chevron-left" size={32} color="#333399" />
      </TouchableOpacity>

      <View style={styles.content}>
        <MaterialCommunityIcons name={step === 1 ? "lock-reset" : "shield-check"} size={60} color="#333399" />
        <Text style={styles.title}>{step === 1 ? "Forgot Password?" : "Verify OTP"}</Text>
        
        <View style={styles.inputWrapper}>
          {step === 1 ? (
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#666" style={{marginRight: 10}} />
              <TextInput style={styles.textInput} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          ) : (
            <>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="numeric" size={20} color="#666" style={{marginRight: 10}} />
                <TextInput style={styles.textInput} placeholder="6-Digit OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
              </View>
              <View style={[styles.inputBox, {marginTop: 15}]}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#666" style={{marginRight: 10}} />
                <TextInput style={styles.textInput} placeholder="Enter new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.mainBtn} onPress={handleAction} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{step === 1 ? "SEND CODE" : "RESET PASSWORD"}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF' },
  backBtn: { padding: 15, marginTop: 10 },
  content: { paddingHorizontal: 30, alignItems: 'center', marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1C3D', marginVertical: 20 },
  inputWrapper: { width: '100%' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFF', borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#EDF1FF' },
  textInput: { flex: 1, fontSize: 16 },
  mainBtn: { backgroundColor: '#333399', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});