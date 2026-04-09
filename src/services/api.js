// src/services/api.js
// All HTTP calls to the ERPNext / Frappe backend live here.
// Screens never call fetch/axios directly — they go through this service.

import axios from 'axios';

let _baseUrl = '';
let _token = ''; // "<api_key>:<api_secret>"

export function initApi({ baseUrl, token }) {
  _baseUrl = baseUrl.replace(/\/$/, '');
  _token = token;
}

export function isApiInitialized() {
  return !!_baseUrl && !!_token;
}

/**
 * Ensures API client is configured.
 * Primary source: current in-memory config (initApi).
 * Fallback source: Expo public env vars (.env) for development builds.
 */
export function ensureApiInitialized() {
  if (_baseUrl && _token) return;

  // In Expo, EXPO_PUBLIC_* variables are available at runtime.
  const envBaseUrl = (process?.env?.EXPO_PUBLIC_ERP_BASE_URL || '').trim();
  const envToken = (process?.env?.EXPO_PUBLIC_ERP_TOKEN || '').trim();

  if (envBaseUrl && envToken) {
    initApi({ baseUrl: envBaseUrl, token: envToken });
  }
}

function client() {
  return axios.create({
    baseURL: _baseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(_token ? { Authorization: `Token ${_token}` } : {}),
    },
  });
}

function assertConfigured() {
  if (!_baseUrl) throw new Error('API not initialized. Missing baseUrl.');
  if (!_token) throw new Error('API not initialized. Missing API token.');
}

function encodeDoctype(doctype) {
  return encodeURIComponent(doctype);
}

function encodeQueryParamJson(value) {
  return encodeURIComponent(JSON.stringify(value));
}

// ─── Auth / Employee validation ───────────────────────────────────────────────

export async function getEmployee(employeeId) {
  assertConfigured();
  const r = await client().get(`/api/resource/${encodeDoctype('Employee')}/${encodeURIComponent(employeeId)}`);
  return r.data?.data;
}

// ─── Reading Schedules ────────────────────────────────────────────────────────

export async function getMySchedules(assignedReaderEmployeeId) {
  assertConfigured();
  const filters = [['assigned_reader', '=', assignedReaderEmployeeId]];
  const fields = ['*'];
  const r = await client().get(
    `/api/resource/${encodeDoctype('Meter Reading Schedule')}?filters=${encodeQueryParamJson(filters)}&fields=${encodeQueryParamJson(fields)}`
  );
  return r.data?.data || [];
}

export async function getMeterReadingSchedule(scheduleName) {
  assertConfigured();
  const r = await client().get(
    `/api/resource/${encodeDoctype('Meter Reading Schedule')}/${encodeURIComponent(scheduleName)}`
  );
  return r.data?.data;
}

// ─── Water Properties ─────────────────────────────────────────────────────────

async function listWaterPropertiesWithFilter(filters) {
  const fields = [
    'name',
    'property_address',
    'latitude',
    'longitude',
    'owner_customer',
    'tenant_customer',
    'billing_party',
    'connection_status',
    'meter_type',
    'service_connection',
    'service_type',
    'previous_reading',
    'zone',
    'route_sequence',
    'reading_status',
    'water_meter',
  ];
  const r = await client().get(
    `/api/resource/${encodeDoctype('Water Property')}?filters=${encodeQueryParamJson(filters)}&fields=${encodeQueryParamJson(fields)}&limit_page_length=2000`
  );
  return r.data?.data || [];
}

export async function getWaterPropertiesByNames(propertyNames) {
  assertConfigured();
  const names = (propertyNames || []).filter(Boolean);
  if (names.length === 0) return [];

  // Frappe supports `in` operator.
  // If the list is too large, we chunk to keep URLs safe.
  const CHUNK = 200;
  const out = [];
  for (let i = 0; i < names.length; i += CHUNK) {
    const chunk = names.slice(i, i + CHUNK);
    const rows = await listWaterPropertiesWithFilter([['name', 'in', chunk]]);
    out.push(...rows);
  }
  return out;
}

export async function getPropertiesForSchedule(scheduleCodeOrName) {
  assertConfigured();

  // Different deployments model the link field differently. Try the common ones.
  const candidates = [
    [['reading_schedule', '=', scheduleCodeOrName]],
    [['reading_schedule_code', '=', scheduleCodeOrName]],
    [['schedule_code', '=', scheduleCodeOrName]],
  ];

  let lastErr = null;
  for (const filters of candidates) {
    try {
      const props = await listWaterPropertiesWithFilter(filters);
      if (props.length > 0) return props;
    } catch (e) {
      lastErr = e;
    }
  }

  if (lastErr) throw lastErr;
  return [];
}

export async function getPropertyDetail(propertyName) {
  assertConfigured();
  const r = await client().get(`/api/resource/${encodeDoctype('Water Property')}/${encodeURIComponent(propertyName)}`);
  return r.data?.data;
}

// ─── Meter Reading Entry (Draft → Submit) ─────────────────────────────────────

export async function createMeterReadingEntryDraft(doc) {
  assertConfigured();
  const body = { ...doc, docstatus: 0 };
  const r = await client().post(`/api/resource/${encodeDoctype('Meter Reading Entry')}`, body);
  return r.data?.data; // contains { name, ... }
}

export async function submitDoc({ doctype, name }) {
  assertConfigured();
  const r = await client().post(`/api/method/frappe.client.submit`, { doctype, name });
  return r.data?.message || r.data;
}

export async function getMeterReadingEntry(name) {
  assertConfigured();
  const r = await client().get(`/api/resource/${encodeDoctype('Meter Reading Entry')}/${encodeURIComponent(name)}`);
  return r.data?.data;
}

export async function getWaterBillsForReadingEntry(meterReadingEntryName) {
  assertConfigured();
  const filters = [['meter_reading_entry', '=', meterReadingEntryName]];
  const fields = ['name', 'status', 'billing_period', 'total_amount', 'amount_payable', 'due_date'];
  const r = await client().get(
    `/api/resource/${encodeDoctype('Water Bill')}?filters=${encodeQueryParamJson(filters)}&fields=${encodeQueryParamJson(fields)}&limit_page_length=20`
  );
  return r.data?.data || [];
}

/**
 * Main entry used by screens + offline sync.
 * - Creates draft Meter Reading Entry
 * - Optionally uploads meter photo (if provided)
 * - Submits the document
 * - Returns the final saved doc + any linked bill (if created)
 */
export async function submitMeterReading(payload) {
  assertConfigured();

  const {
    meter_photo_base64,
    meter_photo_filename,
    ...docFields
  } = payload || {};

  const created = await createMeterReadingEntryDraft(docFields);
  const docName = created?.name;
  if (!docName) throw new Error('Failed to create Meter Reading Entry (missing name).');

  // Photo upload can be added later (server-side may require File upload permissions).
  // We keep the API surface ready but do not block submission if upload fails.
  if (meter_photo_base64) {
    try {
      await attachMeterPhoto({
        doctype: 'Meter Reading Entry',
        docName,
        base64Image: meter_photo_base64,
        fileName: meter_photo_filename || `meter_${docName}.jpg`,
      });
    } catch (_) {
      // ignore upload errors; reading should still submit
    }
  }

  await submitDoc({ doctype: 'Meter Reading Entry', name: docName });

  const finalDoc = await getMeterReadingEntry(docName);
  const bills = await getWaterBillsForReadingEntry(docName).catch(() => []);
  return { name: docName, doc: finalDoc, bills };
}

// ─── File upload (meter photo) ────────────────────────────────────────────────

export async function attachMeterPhoto({ doctype, docName, base64Image, fileName }) {
  assertConfigured();
  if (!base64Image) throw new Error('Missing base64Image');

  // Frappe expects multipart form data for file upload.
  // Using `data:` uri is a common pattern with base64 content.
  const form = new FormData();
  form.append('is_private', '0');
  form.append('doctype', doctype);
  form.append('docname', docName);
  form.append('fieldname', 'meter_photo');
  form.append('file_name', fileName);
  form.append('filedata', `data:image/jpeg;base64,${base64Image}`);

  const r = await client().post('/api/method/upload_file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data?.message?.file_url || r.data?.message;
}
