// src/screens/ConfirmationScreen.js
// Shows a summary after a reading is submitted.
// "Next property" loops back to the route list.
// "View sync queue" navigates to the SyncQueue screen.

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SCREENS } from '../navigation/screens';
import { PrimaryButton, SecondaryButton, Card, InfoBanner } from '../components';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export default function ConfirmationScreen({ navigation, route }) {
  const {
    propertyAddress,
    customerName,
    consumption,
    currentReading,
    readingOutcome,
    savedOnline,
    queuedOffline,
  } = route.params;

  const isCleanRead = readingOutcome === 'Clean Read';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* Icon */}
      <View style={[styles.iconWrap, isCleanRead ? styles.iconWrapOk : styles.iconWrapWarn]}>
        <Ionicons
          name={isCleanRead ? 'checkmark-circle' : 'alert-circle'}
          size={52}
          color={isCleanRead ? Colors.success : Colors.warning}
        />
      </View>

      <Text style={styles.title}>Reading saved</Text>
      <Text style={styles.subtitle}>{customerName}</Text>
      <Text style={styles.address}>{propertyAddress}</Text>

      {/* Reading summary card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <SummaryItem label="Current reading"  value={currentReading?.toLocaleString() + ' m³'} />
          <SummaryItem label="Consumption"       value={consumption?.toLocaleString() + ' m³'} accent={isCleanRead} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryItem label="Reading outcome"   value={readingOutcome} />
          <SummaryItem label="Status"            value={savedOnline ? 'Submitted' : 'Queued'} />
        </View>
      </Card>

      {/* Sync status banner */}
      {savedOnline && (
        <InfoBanner
          message="Reading submitted to ERPNext successfully."
          type="success"
        />
      )}
      {queuedOffline && (
        <InfoBanner
          message="No internet connection — reading saved offline and will sync automatically when you're back online."
          type="warning"
        />
      )}

      {/* Actions */}
      <PrimaryButton
        title="Next property"
        onPress={() => navigation.navigate(SCREENS.PROPERTY_LIST)}
        style={{ marginBottom: Spacing.md }}
      />
      <SecondaryButton
        title="View sync queue"
        onPress={() => navigation.navigate(SCREENS.SYNC_QUEUE)}
      />

    </ScrollView>
  );
}

function SummaryItem({ label, value, accent }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: Colors.bgTertiary },
  content:  { padding: Spacing.xl, paddingTop: Spacing.xxxl, alignItems: 'center' },

  iconWrap: {
    width:          90, height: 90, borderRadius: 45,
    alignItems:     'center', justifyContent: 'center',
    marginBottom:   Spacing.xl,
  },
  iconWrapOk:   { backgroundColor: Colors.successLight },
  iconWrapWarn: { backgroundColor: Colors.warningLight },

  title:    { fontSize: Typography.xxl, fontWeight: Typography.medium, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Typography.md,  color: Colors.textPrimary },
  address:  { fontSize: Typography.sm,  color: Colors.textSecondary, marginBottom: Spacing.xl },

  summaryCard: { width: '100%', marginBottom: Spacing.lg },
  summaryRow:  { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryItem: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md },
  summaryLabel: { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  summaryValue: { fontSize: Typography.lg, fontWeight: Typography.medium, color: Colors.textPrimary },
  summaryValueAccent: { color: Colors.success },
});
