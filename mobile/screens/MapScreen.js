import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, View, Text, Image, TouchableOpacity,
  Linking, ActivityIndicator, Platform,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE } from '../config';

export default function MapScreen({ navigation }) {
  const [pins, setPins]       = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef                = useRef(null);

  const loadPins = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/pins`);
      const data = await res.json();
      setPins(data);
    } catch (e) {
      console.warn('Failed to load pins', e);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever this tab is focused (e.g. after adding a new pin)
  useFocusEffect(React.useCallback(() => { loadPins(); }, []));

  const openTikTok = (url) => Linking.openURL(url);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fe2c55" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 80, longitudeDelta: 80 }}
        userInterfaceStyle="dark"
        showsUserLocation
      >
        {pins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            tracksViewChanges={false}
          >
            {/* Custom thumbnail marker */}
            <View style={styles.markerWrap}>
              {pin.thumbnail_url ? (
                <Image
                  source={{ uri: pin.thumbnail_url }}
                  style={styles.markerThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.markerThumb, styles.markerPlaceholder]}>
                  <Text style={{ fontSize: 16 }}>🎵</Text>
                </View>
              )}
              <View style={styles.markerTail} />
            </View>

            <Callout
              tooltip
              onPress={() => openTikTok(pin.tiktok_url)}
              style={styles.callout}
            >
              <View style={styles.calloutBox}>
                {pin.thumbnail_url ? (
                  <Image
                    source={{ uri: pin.thumbnail_url }}
                    style={styles.calloutThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.calloutThumb, styles.calloutPlaceholder]}>
                    <Text style={{ fontSize: 28 }}>🎵</Text>
                  </View>
                )}
                <View style={styles.calloutBody}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {pin.title || pin.location_name}
                  </Text>
                  <Text style={styles.calloutLocation} numberOfLines={1}>
                    📍 {pin.location_name}
                  </Text>
                  {pin.notes ? (
                    <Text style={styles.calloutNotes} numberOfLines={1}>{pin.notes}</Text>
                  ) : null}
                  <View style={styles.calloutBtn}>
                    <Text style={styles.calloutBtnText}>▶ Watch on TikTok</Text>
                  </View>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {pins.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>Tap ➕ to save your first TikTok place</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  map:        { flex: 1 },
  center:     { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

  markerWrap: { alignItems: 'center' },
  markerThumb: {
    width: 44,
    height: 58,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fe2c55',
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  markerPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#fe2c55',
    marginTop: -1,
  },

  callout:    { width: 220 },
  calloutBox: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  calloutThumb:       { width: '100%', height: 120, backgroundColor: '#222' },
  calloutPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  calloutBody:        { padding: 10 },
  calloutTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  calloutLocation: {
    color: '#25f4ee',
    fontSize: 11,
    marginTop: 4,
  },
  calloutNotes: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
  calloutBtn: {
    backgroundColor: '#fe2c55',
    borderRadius: 7,
    paddingVertical: 7,
    marginTop: 10,
    alignItems: 'center',
  },
  calloutBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  emptyOverlay: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  emptyText: { color: '#aaa', fontSize: 13 },
});
