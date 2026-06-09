import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, Image,
  TouchableOpacity, Alert, Linking, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE } from '../config';

export default function PlacesScreen({ navigation }) {
  const [pins, setPins]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getToken }            = useAuth();

  const loadPins = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const token = await getToken();
      const res  = await fetch(`${API_BASE}/api/pins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPins(data);
    } catch {
      Alert.alert('Error', 'Could not load places. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadPins(); }, []));

  const deletePin = (pin) => {
    Alert.alert(
      'Delete pin?',
      `Remove "${pin.location_name}" from your map?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await fetch(`${API_BASE}/api/pins/${pin.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setPins(prev => prev.filter(p => p.id !== pin.id));
            } catch {
              Alert.alert('Error', 'Could not delete. Try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fe2c55" size="large" />
      </View>
    );
  }

  if (!pins.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
        <Text style={styles.emptyTitle}>No places saved yet</Text>
        <Text style={styles.emptySubtitle}>Tap ➕ to save your first TikTok place</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={pins}
      keyExtractor={p => String(p.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadPins(true)}
          tintColor="#fe2c55"
        />
      }
      contentContainerStyle={{ paddingVertical: 10 }}
      renderItem={({ item: pin }) => (
        <View style={styles.card}>
          {/* Thumbnail */}
          <View style={styles.thumbWrap}>
            {pin.thumbnail_url ? (
              <Image
                source={{ uri: pin.thumbnail_url }}
                style={styles.thumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Text style={{ fontSize: 22 }}>🎵</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {pin.title || '(no title)'}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              📍 {pin.location_name}
            </Text>
            {pin.author ? (
              <Text style={styles.author}>@{pin.author}</Text>
            ) : null}
            {pin.notes ? (
              <Text style={styles.notes} numberOfLines={1}>{pin.notes}</Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnTikTok}
                onPress={() => Linking.openURL(pin.tiktok_url)}
              >
                <Text style={styles.btnTikTokText}>▶ TikTok</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => deletePin(pin)}
              >
                <Text style={styles.btnDeleteText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 30 },

  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: '#666', fontSize: 14, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#111',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  thumbWrap: { width: 72, backgroundColor: '#1a1a1a' },
  thumb:     { width: 72, height: 96 },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },

  info:     { flex: 1, padding: 10 },
  title:    { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  location: { color: '#25f4ee', fontSize: 11, marginTop: 4 },
  author:   { color: '#fe2c55', fontSize: 11, marginTop: 2 },
  notes:    { color: '#777', fontSize: 11, fontStyle: 'italic', marginTop: 2 },

  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  btnTikTok: {
    flex: 1,
    backgroundColor: '#fe2c55',
    borderRadius: 7,
    paddingVertical: 6,
    alignItems: 'center',
  },
  btnTikTokText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnDelete:     { padding: 6 },
  btnDeleteText: { fontSize: 16 },
});
