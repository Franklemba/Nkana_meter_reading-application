// src/services/api.js
// All HTTP calls to the ERPNext / Frappe backend live here.
// Screens never call fetch/axios directly — they go through this service.

import axios from 'axios';

// ─── Mock Mode Toggle ─────────────────────────────────────────────────────────
// Set to true to simulate API responses locally.
export const MOCK_MODE = true;

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
}

export async function getLoggedInUser() {
  if (MOCK_MODE) return { message: 'demo@example.com' };
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
}

export async function attachMeterPhoto({ docName, base64Image, fileName }) {
  if (MOCK_MODE) return Promise.resolve('mock_url');
}
