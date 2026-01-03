import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import API_URL from '../services/apiconfig'
import Toast from 'react-native-toast-message';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Reading Taker'); 
  const [adminCodeInput, setAdminCodeInput] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill all required fields ✍️'
      });
      return;
    }
  
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        name, email, password, role,companyName,
        adminCodeInput: role === 'Reading Taker' ? adminCodeInput : null
      });
  
      if (response.status === 201) {
      
        Toast.show({
          type: 'success',
          text1: 'Success! ✅',
          text2: role === 'Admin' 
                  ? `Account created! Code: ${response.data.adminCode}` 
                  : 'Account created successfully!',
          visibilityTime: 5000, 
        });
  
       
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed ❌',
        text2: error.response?.data?.msg || 'Something went wrong'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Tenant Billing System</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="Enter email" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Create password" secureTextEntry value={password} onChangeText={setPassword} />

       <Text style={styles.label}>Company Name</Text>
        <TextInput style={styles.input} placeholder="Company Name"  value={companyName} onChangeText={setCompanyName} />


        <Text style={styles.label}>Who are you?</Text>
        <View style={styles.roleContainer}>
          {['Reading Taker', 'Admin'].map((r) => (
            <TouchableOpacity 
              key={r} 
              style={[styles.roleButton, role === r && styles.roleActive]} 
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {role === 'Reading Taker' && (
          <View>
            <Text style={[styles.label, {color: '#333399'}]}>Admin/Company Code *</Text>
            <TextInput 
              style={[styles.input, {borderColor: '#333399'}]} 
              placeholder="Enter Code from Admin" 
              value={adminCodeInput} 
              onChangeText={setAdminCodeInput}
              autoCapitalize="characters"
            />
          </View>
        )}

        <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>REGISTER</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#333399', paddingVertical: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 13, marginTop: 5 },
  form: { padding: 25 },
  label: { fontSize: 13, color: '#333', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleButton: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#333399', borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  roleActive: { backgroundColor: '#333399' },
  roleText: { color: '#333399', fontWeight: 'bold' },
  roleTextActive: { color: 'white' },
  signupButton: { backgroundColor: '#333399', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  linkText: { textAlign: 'center', marginTop: 20, color: '#666' },
  linkBold: { color: '#333399', fontWeight: 'bold' }
});

export default SignupScreen;