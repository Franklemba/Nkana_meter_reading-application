// src/screens/ReadingCaptureScreen.js
// The heart of the app. Meter reader enters the current reading,
// captures a photo of the dial, and records GPS coordinates.
// On submit: saves offline or sends directly to ERPNext.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';

import { useApp } from '../context/AppContext';
import { getPropertyDetail, submitMeterReading } from '../services/api';
import { enqueue } from '../services/storage';
import { SCREENS } from '../navigation/screens';
import {
  Card, SectionHeader, ReadonlyField, InfoBanner,
  PrimaryButton, SecondaryButton, Divider, StatusBadge, Avatar,
} from '../components';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

// ── Dropdown options matching the doctype ─────────────────────────────────────
const READING_TYPES    = ['Actual', 'Estimated', 'Visual'];
const READING_OUTCOMES = ['Clean Read', 'Tampered', 'Blocked/Inaccessible', 'Leaking', 'Damaged Meter'];
const UNREAD_REASONS   = [
  'Meter not found',
  'Access denied',
  'Gate locked',
  'Dog / unsafe access',
  'Meter submerged',
  'Meter damaged beyond reading',
  'Building demolished',
];

export default function ReadingCaptureScreen({ navigation, route }) {
  const { state, dispatch } = useApp();
  const { propertyName } = route.params;

  // ── Property data ──────────────────────────────────────────────────────────
  const [property, setProperty] = useState(
    state.properties.find(p => p.name === propertyName) || null
  );
  const [loadingProp, setLoadingProp] = useState(!property);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [currentReading,      setCurrentReading]      = useState('');
  const [readingType,         setReadingType]         = useState('Actual');
  const [readingOutcome,      setReadingOutcome]      = useState('Clean Read');
  const [unreadReason,        setUnreadReason]        = useState('');
  const [estimatedConsumption,setEstimatedConsumption]= useState('');
  const [notes,               setNotes]               = useState('');

  // ── GPS ────────────────────────────────────────────────────────────────────
  const [gps,         setGps]         = useState(null);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [gpsError,    setGpsError]    = useState('');

  // ── Photo ──────────────────────────────────────────────────────────────────
  const [photoUri,    setPhotoUri]    = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);

  // ── Submission ─────────────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');

  // ── Load full property detail ──────────────────────────────────────────────
  useEffect(() => {
    if (!property) {
      getPropertyDetail(propertyName)
        .then(p => setProperty(p))
        .catch(() => setFormError('Could not load property details.'))
        .finally(() => setLoadingProp(false));
    }
  }, []);

  // ── Derived: consumption ───────────────────────────────────────────────────
  const prev = property?.previous_reading || 0;
  const curr = parseFloat(currentReading) || 0;
  const consumption = curr - prev;
  const consumptionValid = currentReading === '' || curr >= prev;

  // ── GPS capture ───────────────────────────────────────────────────────────
  async function captureGPS() {
    setGpsError('');
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission denied. Please enable it in settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setGps({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy:  Math.round(loc.coords.accuracy),
      });
    } catch (e) {
      setGpsError('Could not get location. Try again.');
    } finally {
      setGpsLoading(false);
    }
  }

  // ── Camera / photo ─────────────────────────────────────────────────────────
  async function capturePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to photograph the meter.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality:           0.6,
      base64:            true,
      allowsEditing:     false,
      exif:              false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    if (!currentReading.trim())              return 'Current reading is required.';
    if (curr < prev)                         return `Current reading (${curr}) cannot be less than previous reading (${prev.toLocaleString()}).`;
    if (!gps)                                return 'GPS location must be captured before submitting.';
    if (!photoUri)                           return 'A photo of the meter is required.';
    if (readingOutcome !== 'Clean Read' && !unreadReason)
                                             return 'Please select an unread reason for this outcome.';
    return null;
  }

  // ── Build payload matching Meter Reading doctype ───────────────────────────
  function buildPayload() {
    const today = new Date().toISOString().split('T')[0];
    const serviceConn = property?.service_connections?.[0] || null;
    const waterCustomer =
      property?.water_customer ||
      property?.owner_customer ||
      property?.tenant_customer ||
      '';
    const waterMeter =
      property?.water_meter ||
      serviceConn?.water_meter ||
      property?.water_meter_number ||
      property?.meter_number ||
      property?.meter_no ||
      property?.meter_serial ||
      '';
    return {
      zone:                  property.zone             || state.schedule?.zone,
      reading_schedule:      state.schedule?.name      || '',
      reading_schedule_code: state.schedule?.schedule_code || '',
      water_property:        property.name,
      water_customer:        waterCustomer,
      property_address:      property.property_address,
      water_meter:           waterMeter,
      meter_type:            serviceConn?.meter_type || property.meter_type,
      service_connection:    property.service_connection || serviceConn?.service_connection_id || serviceConn?.name || '',
      service_type:          property.service_type || serviceConn?.service_type || 'Water',
      reading_date:          today,
      previous_reading:      prev,
      current_reading:       curr,
      consumption,
      reading_type:          readingType,
      reading_outcome:       readingOutcome,
      unread_reason:         unreadReason,
      estimated_consumption: readingType === 'Estimated' ? parseFloat(estimatedConsumption) || 0 : 0,
      reading_latitude:      gps?.latitude,
      reading_longitude:     gps?.longitude,
      meter_photo_base64:    photoBase64 || '',
      meter_photo_filename:  `meter_${property.name}_${Date.now()}.jpg`,
      notes,
    };
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const err = validate();
    if (err) { setFormError(err); return; }

    setFormError('');
    setSubmitting(true);

    const payload = buildPayload();

    // Update property status in global state immediately
    dispatch({
      type: 'UPDATE_PROPERTY_STATUS',
      payload: {
        propertyName:   property.name,
        status:         readingOutcome === 'Clean Read' ? 'Read' : 'Unread',
        currentReading: curr,
      },
    });

    try {
      // Check connectivity
      const netState = await NetInfo.fetch();
      let savedOnline = false;
      let queueItem   = null;

      if (netState.isConnected) {
        try {
          await submitMeterReading(payload);
          savedOnline = true;
        } catch (apiErr) {
          // API failed — fall back to queue
          queueItem = await enqueue(payload);
          dispatch({ type: 'ADD_TO_QUEUE', payload: queueItem });
        }
      } else {
        // Offline — queue it
        queueItem = await enqueue(payload);
        dispatch({ type: 'ADD_TO_QUEUE', payload: queueItem });
      }

      navigation.replace(SCREENS.CONFIRMATION, {
        propertyName:    property.name,
        propertyAddress: property.property_address,
        customerName:    property.water_customer || property.owner_customer || property.tenant_customer,
        consumption,
        currentReading:  curr,
        readingOutcome,
        savedOnline,
        queuedOffline:   !savedOnline,
      });

    } finally {
      setSubmitting(false);
    }
  }

  // ── Save draft (local only, no validation) ─────────────────────────────────
  async function handleSaveDraft() {
    if (!currentReading && !gps && !photoUri) {
      Alert.alert('Nothing to save', 'Enter at least a reading before saving a draft.');
      return;
    }
    const payload = buildPayload();
    const item    = await enqueue({ ...payload, status: 'draft' });
    dispatch({ type: 'ADD_TO_QUEUE', payload: item });
    navigation.goBack();
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingProp) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const showUnreadReason      = readingOutcome !== 'Clean Read';
  const showEstimatedConsField = readingType === 'Estimated';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Property info card ───────────────────────────────────────────── */}
        <SectionHeader title="Property info" />
        <Card>
          <View style={styles.customerRow}>
            <Avatar name={property?.water_customer} size={46} />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{property?.water_customer || '—'}</Text>
              <Text style={styles.customerRef}>{property?.name}</Text>
            </View>
          </View>
          <Divider />
          <View style={styles.fieldGrid}>
            <ReadonlyField label="Address"    value={property?.property_address} />
            <ReadonlyField label="Meter type" value={property?.meter_type} />
            <ReadonlyField label="Connection" value={property?.service_connection} />
            <ReadonlyField label="Service"    value={property?.service_type} />
          </View>
          <ReadonlyField
            label="Previous reading"
            value={prev.toLocaleString()}
            highlight
          />
        </Card>

        {/* ── Reading entry ─────────────────────────────────────────────────── */}
        <SectionHeader title="Meter reading" />
        <Card>
          <Text style={styles.fieldLabel}>
            Current reading <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.readingInput,
              !consumptionValid && styles.readingInputError,
            ]}
            value={currentReading}
            onChangeText={setCurrentReading}
            keyboardType="numeric"
            placeholder={`e.g. ${(prev + 1000).toLocaleString()}`}
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="done"
          />

          {/* Consumption display */}
          {currentReading !== '' && (
            <View style={[
              styles.consumptionBox,
              consumptionValid ? styles.consumptionOk : styles.consumptionErr,
            ]}>
              <Text style={[
                styles.consumptionLabel,
                !consumptionValid && { color: Colors.danger },
              ]}>
                {consumptionValid ? 'Consumption' : 'Invalid reading'}
              </Text>
              <Text style={[
                styles.consumptionValue,
                !consumptionValid && { color: Colors.danger },
              ]}>
                {consumptionValid
                  ? `${consumption.toLocaleString()} m³`
                  : `Cannot be less than ${prev.toLocaleString()}`
                }
              </Text>
            </View>
          )}

          <Divider />

          {/* Reading type + outcome row */}
          <View style={styles.dropdownRow}>
            <View style={styles.dropdownHalf}>
              <Text style={styles.fieldLabel}>Reading type <Text style={styles.required}>*</Text></Text>
              <OptionPicker
                options={READING_TYPES}
                selected={readingType}
                onSelect={setReadingType}
              />
            </View>
            <View style={styles.dropdownHalf}>
              <Text style={styles.fieldLabel}>Outcome <Text style={styles.required}>*</Text></Text>
              <OptionPicker
                options={READING_OUTCOMES}
                selected={readingOutcome}
                onSelect={setReadingOutcome}
              />
            </View>
          </View>

          {/* Conditional: Unread reason */}
          {showUnreadReason && (
            <View style={[styles.conditionalField, { borderColor: Colors.warningBorder, backgroundColor: Colors.warningLight }]}>
              <Text style={styles.fieldLabel}>
                Unread reason <Text style={styles.required}>*</Text>
              </Text>
              <OptionPicker
                options={UNREAD_REASONS}
                selected={unreadReason}
                onSelect={setUnreadReason}
                placeholder="Select reason…"
              />
            </View>
          )}

          {/* Conditional: Estimated consumption */}
          {showEstimatedConsField && (
            <View style={styles.conditionalField}>
              <Text style={styles.fieldLabel}>Estimated consumption</Text>
              <TextInput
                style={styles.textInput}
                value={estimatedConsumption}
                onChangeText={setEstimatedConsumption}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
          )}

          {/* Notes */}
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations…"
            placeholderTextColor={Colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        {/* ── Meter photo ───────────────────────────────────────────────────── */}
        <SectionHeader title="Meter photo" />
        <Card>
          {photoUri ? (
            <View>
              <View style={styles.photoPreview}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                <Text style={styles.photoOkText}>Photo captured</Text>
              </View>
              <TouchableOpacity style={styles.retakeBtn} onPress={capturePhoto}>
                <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                <Text style={styles.retakeBtnText}>Retake photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cameraBtn} onPress={capturePhoto} activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={28} color={Colors.textSecondary} />
              <Text style={styles.cameraBtnText}>Tap to open camera</Text>
              <Text style={styles.cameraBtnSub}>Required — photograph the meter dial</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── GPS location ──────────────────────────────────────────────────── */}
        <SectionHeader title="GPS location" />
        <Card>
          {gps ? (
            <View>
              <View style={styles.gpsOkRow}>
                <View style={styles.gpsDot} />
                <View style={styles.gpsInfo}>
                  <Text style={styles.gpsCoordsText}>
                    {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.gpsAccText}>Accuracy: ±{gps.accuracy}m</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.retakeBtn} onPress={captureGPS} disabled={gpsLoading}>
                <Ionicons name="locate-outline" size={16} color={Colors.primary} />
                <Text style={styles.retakeBtnText}>Re-capture GPS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.cameraBtn, { borderColor: gpsError ? Colors.dangerBorder : Colors.border }]}
              onPress={captureGPS}
              disabled={gpsLoading}
              activeOpacity={0.75}
            >
              {gpsLoading
                ? <ActivityIndicator color={Colors.primary} />
                : <Ionicons name="locate-outline" size={28} color={Colors.textSecondary} />
              }
              <Text style={styles.cameraBtnText}>
                {gpsLoading ? 'Getting location…' : 'Tap to capture GPS location'}
              </Text>
              {gpsError
                ? <Text style={[styles.cameraBtnSub, { color: Colors.danger }]}>{gpsError}</Text>
                : <Text style={styles.cameraBtnSub}>Required — verifies reading location</Text>
              }
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Form error ─────────────────────────────────────────────────────── */}
        {!!formError && <InfoBanner message={formError} type="error" />}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <PrimaryButton
          title="Submit reading"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={{ marginBottom: Spacing.md }}
        />
        <SecondaryButton
          title="Save draft"
          onPress={handleSaveDraft}
        />
        <View style={{ height: Spacing.xxxl }} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Inline option picker (segmented-style for short lists) ────────────────────
function OptionPicker({ options, selected, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pickerText, !selected && styles.pickerPlaceholder]} numberOfLines={1}>
          {selected || placeholder || 'Select…'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, opt === selected && styles.pickerOptionActive]}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[styles.pickerOptionText, opt === selected && styles.pickerOptionTextActive]}>
                {opt}
              </Text>
              {opt === selected && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: Colors.bgTertiary },
  content:      { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  customerRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  customerInfo: { flex: 1 },
  customerName: { fontSize: Typography.md, fontWeight: Typography.medium, color: Colors.textPrimary },
  customerRef:  { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  fieldGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
  },

  fieldLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
  },
  required: { color: Colors.danger },

  readingInput: {
    backgroundColor:   Colors.bgSecondary,
    borderRadius:      Radius.md,
    borderWidth:       1.5,
    borderColor:       Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.lg,
    fontSize:          Typography.xxxl,
    fontWeight:        Typography.medium,
    color:             Colors.textPrimary,
    textAlign:         'center',
    marginBottom:      Spacing.md,
  },
  readingInputError: { borderColor: Colors.danger },

  consumptionBox: {
    borderRadius: Radius.md,
    padding:      Spacing.md,
    alignItems:   'center',
    marginBottom: Spacing.md,
  },
  consumptionOk:    { backgroundColor: Colors.successLight, borderWidth: 0.5, borderColor: Colors.successBorder },
  consumptionErr:   { backgroundColor: Colors.dangerLight,  borderWidth: 0.5, borderColor: Colors.dangerBorder  },
  consumptionLabel: { fontSize: Typography.xs, color: Colors.success, textTransform: 'uppercase', letterSpacing: 0.4 },
  consumptionValue: { fontSize: Typography.xxxl, fontWeight: Typography.medium, color: Colors.success, marginTop: 2 },

  dropdownRow: { flexDirection: 'row', gap: Spacing.md },
  dropdownHalf: { flex: 1 },

  textInput: {
    backgroundColor:   Colors.bgSecondary,
    borderRadius:      Radius.md,
    borderWidth:       0.5,
    borderColor:       Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    fontSize:          Typography.md,
    color:             Colors.textPrimary,
  },
  notesInput: { minHeight: 80 },

  conditionalField: {
    marginTop:        Spacing.md,
    padding:          Spacing.md,
    borderRadius:     Radius.md,
    borderWidth:      0.5,
    borderColor:      Colors.border,
    backgroundColor:  Colors.bgSecondary,
  },

  pickerBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   Colors.bgSecondary,
    borderRadius:      Radius.md,
    borderWidth:       0.5,
    borderColor:       Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
  },
  pickerText:        { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
  pickerPlaceholder: { color: Colors.textDisabled },
  pickerDropdown: {
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.md,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    marginTop:       4,
    overflow:        'hidden',
  },
  pickerOption: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionActive:     { backgroundColor: Colors.primaryLight },
  pickerOptionText:       { fontSize: Typography.sm, color: Colors.textPrimary },
  pickerOptionTextActive: { color: Colors.primary, fontWeight: Typography.medium },

  cameraBtn: {
    borderWidth:   1.5,
    borderStyle:   'dashed',
    borderColor:   Colors.border,
    borderRadius:  Radius.md,
    padding:       Spacing.xl,
    alignItems:    'center',
    gap:           Spacing.sm,
    backgroundColor: Colors.bgSecondary,
  },
  cameraBtnText: { fontSize: Typography.md, color: Colors.textSecondary },
  cameraBtnSub:  { fontSize: Typography.xs, color: Colors.textTertiary },

  photoPreview: {
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    padding:         Spacing.xl,
    backgroundColor: Colors.successLight,
    borderRadius:    Radius.md,
    marginBottom:    Spacing.md,
  },
  photoOkText: { fontSize: Typography.sm, color: Colors.success, fontWeight: Typography.medium },

  retakeBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  retakeBtnText: { fontSize: Typography.sm, color: Colors.primary },

  gpsOkRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.md,
    backgroundColor: Colors.infoLight,
    borderRadius:   Radius.md,
    padding:        Spacing.md,
    marginBottom:   Spacing.md,
  },
  gpsDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  gpsInfo:      { flex: 1 },
  gpsCoordsText:{ fontSize: Typography.sm, color: Colors.primaryDark, fontWeight: Typography.medium },
  gpsAccText:   { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
});
