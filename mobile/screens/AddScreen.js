import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { API_BASE } from '../config';

export default function AddScreen({ navigation }) {
  const [tiktokUrl, setTiktokUrl]     = useState('');
  const [ttData, setTtData]           = useState(null);
  const [fetchingTt, setFetchingTt]   = useState(false);

  const [locationText, setLocationText] = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [searching, setSearching]       = useState(false);
  const [selectedLoc, setSelectedLoc]   = useState(null); // { lat, lng, label }

  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef(null);

  // ── Load TikTok ────────────────────────────────────────────────────────────
  const loadTikTok = async () => {
    if (!tiktokUrl.trim()) { Alert.alert('Paste a TikTok link first'); return; }
    setFetchingTt(true);
    setTtData(null);
    try {
      const res  = await fetch(`${API_BASE}/api/tiktok-oembed?url=${encodeURIComponent(tiktokUrl.trim())}`);
      const data = await res.json();
      if (data.error) {
        setTtData({ title: '', thumbnail_url: '', author: '', location: null });
        Alert.alert('Could not load TikTok', 'You can still fill in the location manually.');
      } else {
        setTtData(data);
        if (data.location) {
          setLocationText(data.location);
          searchLocation(data.location, true);
        }
      }
    } catch {
      Alert.alert('Network error', 'Check your connection and try again.');
    } finally {
      setFetchingTt(false);
    }
  };

  // ── Location search ────────────────────────────────────────────────────────
  const searchLocation = async (query, autoSelect = false) => {
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const url  = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`;
      const res  = await fetch(url);
      const data = await res.json();
      const features = data.features || [];
      setSuggestions(features);
      if (autoSelect && features.length) pickSuggestion(features[0]);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const onLocationChange = (text) => {
    setLocationText(text);
    setSelectedLoc(null);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(text), 350);
  };

  const pickSuggestion = (feature) => {
    const p    = feature.properties;
    const main = [p.name, p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : ''].filter(Boolean).join(', ') || '';
    const sub  = [p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(', ');
    const label = sub ? `${main}, ${sub}` : main;
    const [lng, lat] = feature.geometry.coordinates;
    setLocationText(label);
    setSelectedLoc({ lat, lng, label });
    setSuggestions([]);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!tiktokUrl.trim()) { Alert.alert('Paste a TikTok link first'); return; }
    if (!locationText.trim()) { Alert.alert('Enter a location'); return; }
    if (!selectedLoc) { Alert.alert('Select a location from the dropdown'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktok_url:    tiktokUrl.trim(),
          title:         ttData?.title || '',
          thumbnail_url: ttData?.thumbnail_url || '',
          author:        ttData?.author || '',
          location_name: selectedLoc.label,
          lat:           selectedLoc.lat,
          lng:           selectedLoc.lng,
          notes,
        }),
      });
      if (!res.ok) throw new Error();

      // Reset form
      setTiktokUrl('');
      setTtData(null);
      setLocationText('');
      setSelectedLoc(null);
      setSuggestions([]);
      setNotes('');

      Alert.alert('📍 Saved!', 'Your TikTok place has been pinned to the map.', [
        { text: 'View Map', onPress: () => navigation.navigate('Map') },
        { text: 'Add Another', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── TikTok URL ── */}
        <Text style={styles.sectionLabel}>TIKTOK LINK</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Paste TikTok URL here…"
            placeholderTextColor="#444"
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <TouchableOpacity
          style={[styles.btn, styles.btnRed, fetchingTt && styles.btnDisabled]}
          onPress={loadTikTok}
          disabled={fetchingTt}
        >
          {fetchingTt
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>🎵  Load TikTok</Text>}
        </TouchableOpacity>

        {/* ── TikTok Preview ── */}
        {ttData && (
          <View style={styles.preview}>
            {ttData.thumbnail_url ? (
              <Image source={{ uri: ttData.thumbnail_url }} style={styles.previewThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.previewThumb, styles.previewPlaceholder]}>
                <Text style={{ fontSize: 24 }}>🎵</Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={3}>
                {ttData.title || '(no title)'}
              </Text>
              {ttData.author ? (
                <Text style={styles.previewAuthor}>@{ttData.author}</Text>
              ) : null}
              {ttData.location ? (
                <Text style={styles.previewLoc}>📍 Location detected</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Location ── */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>LOCATION</Text>
        <View style={{ position: 'relative' }}>
          <View style={[styles.row, { marginBottom: suggestions.length ? 0 : 0 }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Search restaurant, beach, place…"
              placeholderTextColor="#444"
              value={locationText}
              onChangeText={onLocationChange}
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator color="#fe2c55" size="small" style={{ marginLeft: 8 }} />
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((feat, i) => {
                const p    = feat.properties;
                const main = [p.name, p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : ''].filter(Boolean).join(', ') || '';
                const sub  = [p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(', ');
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dropdownItem, i < suggestions.length - 1 && styles.dropdownDivider]}
                    onPress={() => pickSuggestion(feat)}
                  >
                    <Text style={styles.dropdownMain} numberOfLines={1}>{main}</Text>
                    {sub ? <Text style={styles.dropdownSub} numberOfLines={1}>{sub}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedLoc && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>✓ Location pinned</Text>
          </View>
        )}

        {/* ── Notes ── */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Looks amazing, must try in summer…"
          placeholderTextColor="#444"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* ── Save ── */}
        <TouchableOpacity
          style={[styles.btn, styles.btnWhite, (saving || !selectedLoc) && styles.btnDisabled]}
          onPress={save}
          disabled={saving || !selectedLoc}
        >
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={[styles.btnText, { color: '#000' }]}>📍  Save to Map</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#000' },
  container: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    color: '#fe2c55',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    padding: 12,
  },

  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnRed:      { backgroundColor: '#fe2c55' },
  btnWhite:    { backgroundColor: '#fff' },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontWeight: '800', fontSize: 15 },

  preview: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 4,
    marginTop: 4,
  },
  previewThumb:       { width: 60, height: 80 },
  previewPlaceholder: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  previewInfo:        { flex: 1, padding: 10, justifyContent: 'center' },
  previewTitle:       { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  previewAuthor:      { color: '#fe2c55', fontSize: 11, marginTop: 4 },
  previewLoc:         { color: '#25f4ee', fontSize: 11, marginTop: 4 },

  dropdown: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#fe2c55',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    zIndex: 100,
  },
  dropdownItem:    { paddingHorizontal: 14, paddingVertical: 11 },
  dropdownDivider: { borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  dropdownMain:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  dropdownSub:     { color: '#666', fontSize: 11, marginTop: 2 },

  selectedBadge: {
    backgroundColor: '#0a2a0a',
    borderWidth: 1,
    borderColor: '#25f4ee',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  selectedBadgeText: { color: '#25f4ee', fontSize: 12, fontWeight: '600' },
});
