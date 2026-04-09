// src/services/api.js
// All HTTP calls to the ERPNext / Frappe backend live here.
// Screens never call fetch/axios directly — they go through this service.

import axios from 'axios';

// ─── Mock Mode Toggle ─────────────────────────────────────────────────────────
// Set to true to simulate API responses locally.
export const MOCK_MODE = false;

let _baseUrl = '';
let _token = '';

export function initApi({ baseUrl, token }) {
  _baseUrl = baseUrl.replace(/\/$/, '');
  _token = token;
}

function client() {
  return axios.create({
    baseURL: _baseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(_token ? { Authorization: `token ${_token}` } : {}),
    },
    withCredentials: true,
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login({ baseUrl, username, password }) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => {
      resolve({ full_name: "Mock Reader", home_page: null });
    }, 1000));
  }
  // Initialize base URL before attempting to log in
  initApi({ baseUrl, token: null });
  
  // Using URLSearchParams helps properly format the form data for Frappe's login endpoint,
  // which sometimes prefers x-www-form-urlencoded over raw JSON.
  const params = new URLSearchParams();
  params.append('usr', username);
  params.append('pwd', password);

  const response = await client().post('/api/method/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
}

export async function getLoggedInUser() {
  if (MOCK_MODE) return { message: 'demo@example.com' };
  
  const response = await client().get('/api/method/frappe.auth.get_logged_user');
  return response.data;
}

// ─── Reading Schedules ────────────────────────────────────────────────────────

export async function getMySchedules() {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => {
      resolve([{
        name: 'SCHED-25-001', schedule_code: 'Z1-KAB-01', zone: 'Kabwata',
        reading_date: new Date().toISOString().split('T')[0], status: 'Active',
        assigned_to: 'demo@example.com', total_properties: 2
      }]);
    }, 1000));
  }

  // Live GET request for Reading Schedule
  // We'll fetch all active schedules for the user. We assume the frappe backend has 'Reading Schedule'
  const fields = JSON.stringify(['name', 'schedule_code', 'zone', 'reading_date', 'status', 'assigned_to']);
  const filters = JSON.stringify([['status', '=', 'Active']]); 
  
  const response = await client().get(`/api/resource/Reading Schedule`, {
    params: { fields, filters }
  });
  
  return response.data.data;
}

// ─── Water Properties ─────────────────────────────────────────────────────────

export async function getPropertiesForSchedule(scheduleCode) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => {
      resolve([
        {
          name: 'PROP-001', water_customer: 'John Banda', property_address: '101 Burma Rd, Lusaka',
          meter_type: 'Digital', service_connection: 'Domestic', service_type: 'Water',
          previous_reading: 340, zone: 'Kabwata', route_sequence: 1, reading_status: 'Pending'
        },
        {
          name: 'PROP-002', water_customer: 'Mary Phiri', property_address: '202 Cairo Rd, Lusaka',
          meter_type: 'Analog', service_connection: 'Commercial', service_type: 'Water & Sewerage',
          previous_reading: 1050, zone: 'Kabwata', route_sequence: 2, reading_status: 'Read'
        }
      ]);
    }, 1500));
  }
  
  // Live GET request for Water Property
  const fields = JSON.stringify(['name', 'water_customer', 'property_address', 'meter_type', 'service_connection', 'service_type', 'previous_reading', 'zone', 'route_sequence', 'reading_status']);
  // If scheduleCode is provided, you might filter by zone or schedule.
  // For now, we'll fetch all properties or filter properly based on your Frappe DocType setup.
  const params = { fields };
  
  // E.g., if you map properties by zone:
  // params.filters = JSON.stringify([['zone', '=', scheduleCode.zone]])
  
  const response = await client().get(`/api/resource/Water Property`, { params });
  return response.data.data;
}

export async function getPropertyDetail(propertyName) {
  if (MOCK_MODE) {
    return new Promise(resolve => setTimeout(() => {
      resolve({
        name: propertyName, water_customer: 'Mock Customer', property_address: 'Mock Address',
        meter_type: 'Mock', service_connection: 'Mock', service_type: 'Water',
        previous_reading: 100, zone: 'Zone A', route_sequence: 1, reading_status: 'Pending'
      });
    }, 500));
  }
  
  const response = await client().get(`/api/resource/Water Property/${propertyName}`);
  return response.data.data;
}

// ─── Meter Readings ───────────────────────────────────────────────────────────

export async function submitMeterReading(payload) {
  if (MOCK_MODE) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Toggle this to test failing offline sync queue
        const SIMULATE_OFFLINE = false;
        if (SIMULATE_OFFLINE) reject(new Error('Network error simulated.'));
        else resolve({ name: `MR-${Date.now()}` });
      }, 1000);
    });
  }
  
  // Live POST request to create a Meter Reading doctype
  const response = await client().post('/api/resource/Meter Reading', payload);
  return response.data.data;
}

export async function attachMeterPhoto({ docName, base64Image, fileName }) {
  if (MOCK_MODE) return Promise.resolve('mock_url');
  
  // Post file to Frappe using the /api/method/upload_file endpoint
  const formData = new URLSearchParams();
  formData.append('filename', fileName || `photo_${Date.now()}.jpg`);
  formData.append('filedata', `data:image/jpeg;base64,${base64Image}`);
  formData.append('doctype', 'Meter Reading');
  formData.append('docname', docName);
  formData.append('is_private', 0);

  const response = await client().post('/api/method/upload_file', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  return response.data.message.file_url;
}
