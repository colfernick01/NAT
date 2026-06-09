import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';

export default function AuthScreen() {
  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [code, setCode]         = useState('');
  const [step, setStep]         = useState('form'); // 'form' | 'verify'
  const [loading, setLoading]   = useState(false);

  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();

  const handleSignIn = async () => {
    if (!email || !password) { Alert.alert('Fill in all fields'); return; }
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      await setSignInActive({ session: result.createdSessionId });
    } catch (e) {
      Alert.alert('Sign in failed', e.errors?.[0]?.message || 'Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) { Alert.alert('Fill in all fields'); return; }
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password, firstName: name });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (e) {
      Alert.alert('Sign up failed', e.errors?.[0]?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) { Alert.alert('Enter the code from your email'); return; }
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      await setSignUpActive({ session: result.createdSessionId });
    } catch (e) {
      Alert.alert('Wrong code', e.errors?.[0]?.message || 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <Text style={styles.logo}>🎵</Text>
        <Text style={styles.appName}>TikTok Map</Text>
        <Text style={styles.tagline}>Save places you find on TikTok</Text>

        {step === 'verify' ? (
          <>
            <Text style={styles.label}>CHECK YOUR EMAIL</Text>
            <Text style={styles.verifyHint}>We sent a 6-digit code to {email}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor="#444"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              textAlign="center"
              style={[styles.input, { fontSize: 24, letterSpacing: 8, textAlign: 'center' }]}
            />
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerify} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify Email</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('form')}>
              <Text style={styles.link}>← Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Mode toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signin' && styles.toggleActive]}
                onPress={() => setMode('signin')}
              >
                <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signup' && styles.toggleActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="#444"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#444"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#444"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    paddingBottom: 50,
  },

  logo:    { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  tagline: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 36 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive:     { backgroundColor: '#fe2c55' },
  toggleText:       { color: '#555', fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: '#fff' },

  label: {
    color: '#fe2c55',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    padding: 14,
    marginBottom: 4,
  },

  btn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#000', fontWeight: '800', fontSize: 16 },

  verifyHint: { color: '#666', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  link:       { color: '#fe2c55', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
