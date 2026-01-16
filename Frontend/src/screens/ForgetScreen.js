import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import API_URL from '../services/apiconfig';

export default function ForgetScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgetPassword = async () => {
    // 1. Basic Validation
    if (!email) {
      return Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter your email' });
    }

    // Email Regex Check
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (reg.test(email) === false) {
      return Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Enter a valid email address' });
    }

    setLoading(true);
    try {
      // Backend API Call
      const res = await axios.post(`${API_URL}/auth/forget-password`, { email });
      
      Toast.show({ 
        type: 'success', 
        text1: 'Email Sent 📧', 
        text2: 'Check your inbox for reset instructions' 
      });

      // Thodi der baad login par bhej dein
      setTimeout(() => navigation.navigate('Login'), 2000);

    } catch (error) {
      console.log(error.message);
      Toast.show({ 
        type: 'error', 
        text1: 'Failed', 
        text2: error.response?.data?.msg || 'Something went wrong' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="chevron-left" size={32} color="#333399" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="lock-reset" size={50} color="#333399" />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subTitle}>
          Enter your registered email below to receive password reset instructions.
        </Text>

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
        </View>

        <TouchableOpacity 
          style={[styles.resetBtn, loading && { opacity: 0.7 }]} 
          onPress={handleForgetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.resetBtnText}>SEND RESET LINK</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Remember password? <Text style={{fontWeight: 'bold', color: '#333399'}}>Login</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  backBtn: { padding: 15, marginTop: 10 },
  content: { paddingHorizontal: 30, alignItems: 'center', marginTop: 20 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1C3D', marginBottom: 10 },
  subTitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  
  inputWrapper: { width: '100%', marginBottom: 30 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 8, marginLeft: 5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFF', borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#EDF1FF' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333' },

  resetBtn: { backgroundColor: '#333399', width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#333399', shadowOpacity: 0.3, shadowRadius: 10 },
  resetBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  
  loginLink: { marginTop: 25 },
  loginLinkText: { color: '#666', fontSize: 14 }
});