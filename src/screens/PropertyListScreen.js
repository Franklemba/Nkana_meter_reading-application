// src/screens/PropertyListScreen.js
// Shows the ordered list of water properties for today's schedule.
// Meter reader taps a property to open the reading capture form.

import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { SCREENS } from '../navigation/AppNavigator';
import { StatusBadge, Avatar, EmptyState, ProgressBar } from '../components';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'done',    label: 'Done' },
  { key: 'unread',  label: 'Unread' },
];

export default function PropertyListScreen({ navigation }) {
  const { state } = useApp();
  const { properties, schedule } = state;

  const [activeTab, setActiveTab] = useState('all');
  const [search,    setSearch]    = useState('');

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...properties];

    // Tab filter
    if (activeTab === 'pending') list = list.filter(p => !p.reading_status || p.reading_status === 'Pending');
    if (activeTab === 'done')    list = list.filter(p => p.reading_status === 'Read');
    if (activeTab === 'unread')  list = list.filter(p => p.reading_status === 'Unread');

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.property_address?.toLowerCase().includes(q) ||
        p.water_customer?.toLowerCase().includes(q)   ||
        p.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [properties, activeTab, search]);

  // ── Find the first pending property (for "You are here" indicator) ─────────
  const nextPendingIndex = properties.findIndex(
    p => !p.reading_status || p.reading_status === 'Pending'
  );

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:     properties.length,
    pending: properties.filter(p => !p.reading_status || p.reading_status === 'Pending').length,
    done:    properties.filter(p => p.reading_status === 'Read').length,
    unread:  properties.filter(p => p.reading_status === 'Unread').length,
  }), [properties]);

  // ── Navigate to capture ────────────────────────────────────────────────────
  function openCapture(property) {
    navigation.navigate(SCREENS.READING_CAPTURE, {
      propertyName:    property.name,
      propertyAddress: property.property_address,
    });
  }

  // ── Render a single property row ───────────────────────────────────────────
  function renderItem({ item, index }) {
    const globalIndex = properties.findIndex(p => p.name === item.name);
    const isNext = globalIndex === nextPendingIndex;
    const status = item.reading_status?.toLowerCase() || 'pending';

    return (
      <TouchableOpacity
        style={[styles.row, isNext && styles.rowNext]}
        onPress={() => openCapture(item)}
        activeOpacity={0.75}
      >
        {/* Position number */}
        <View style={[styles.posNum, isNext && styles.posNumNext]}>
          <Text style={[styles.posNumText, isNext && styles.posNumTextNext]}>
            {globalIndex + 1}
          </Text>
        </View>

        {/* Avatar */}
        <Avatar name={item.water_customer} size={42} />

        {/* Info */}
        <View style={styles.rowInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.water_customer || 'Unknown customer'}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {item.property_address}
          </Text>
          <Text style={styles.propertyRef} numberOfLines={1}>
            {item.name} · {item.meter_type}
          </Text>
        </View>

        {/* Status + chevron */}
        <View style={styles.rowRight}>
          <StatusBadge status={isNext ? 'next' : status} label={isNext ? 'Next' : undefined} />
          <Ionicons
            name="chevron-forward"
            size={14}
            color={Colors.textTertiary}
            style={{ marginTop: 6 }}
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>

      {/* Progress summary */}
      {schedule && (
        <View style={styles.progressBar}>
          <ProgressBar
            current={counts.done}
            total={counts.all}
          />
          <Text style={styles.progressText}>
            {counts.done} of {counts.all} completed
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search address or customer…"
          placeholderTextColor={Colors.textDisabled}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({counts[tab.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Property list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState message={search ? 'No properties match your search.' : 'No properties in this category.'} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bgTertiary },
  progressBar:  { backgroundColor: Colors.bgPrimary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  progressText: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },

  searchWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.bgPrimary,
    marginHorizontal: Spacing.lg,
    marginVertical:   Spacing.sm,
    borderRadius:    Radius.md,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon:  { marginRight: Spacing.sm },
  searchInput: {
    flex:      1,
    fontSize:  Typography.md,
    color:     Colors.textPrimary,
    paddingVertical: Spacing.md,
  },

  tabBar: {
    flexDirection:   'row',
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    gap: 4,
  },
  tab: {
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText:   { fontSize: Typography.sm, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.medium },

  listContent: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    gap:             Spacing.md,
  },
  rowNext: {
    borderColor: Colors.primaryMid,
    borderWidth: 1.5,
    backgroundColor: Colors.infoLight,
  },
  separator: { height: Spacing.sm },

  posNum: {
    width:           28,
    height:          28,
    borderRadius:    Radius.full,
    backgroundColor: Colors.bgSecondary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  posNumNext:     { backgroundColor: Colors.primaryMid },
  posNumText:     { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  posNumTextNext: { color: Colors.white },

  rowInfo: { flex: 1, minWidth: 0 },
  customerName: { fontSize: Typography.md, fontWeight: Typography.medium, color: Colors.textPrimary },
  addressText:  { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },
  propertyRef:  { fontSize: Typography.xs, color: Colors.textTertiary,  marginTop: 1 },

  rowRight: { alignItems: 'flex-end', flexShrink: 0 },
});
