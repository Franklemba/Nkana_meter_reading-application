// src/context/AppContext.js
// Central state store for the entire app.
// Wraps the whole app tree so any screen can read/write shared state
// without prop drilling.

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Shape of global state ────────────────────────────────────────────────────
const initialState = {
  // Auth
  user:           null,       // { name, full_name, api_key, api_secret, user_image }
  sessionToken:   null,       // Frappe session cookie / token

  // ERPNext base URL (set on login)
  baseUrl:        '',

  // Schedule loaded at login
  schedule:       null,       // { name, code, zone, reading_date }
  properties:     [],         // Array of water property objects from ERPNext

  // Active reading being captured
  activeProperty: null,

  // Offline queue — readings saved locally before sync
  syncQueue:      [],         // Array of { id, payload, status, created_at, error }

  // UI helpers
  isOnline:       true,
  isSyncing:      false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    case 'SET_USER':
      return { ...state, user: action.payload.user, sessionToken: action.payload.token, baseUrl: action.payload.baseUrl };

    case 'LOGOUT':
      return { ...initialState };

    case 'SET_SCHEDULE':
      return { ...state, schedule: action.payload };

    case 'SET_PROPERTIES':
      return { ...state, properties: action.payload };

    case 'UPDATE_PROPERTY_STATUS': {
      // After a reading is captured, update that property's status in the list
      const updated = state.properties.map(p =>
        p.name === action.payload.propertyName
          ? { ...p, reading_status: action.payload.status, current_reading: action.payload.currentReading }
          : p
      );
      return { ...state, properties: updated };
    }

    case 'SET_ACTIVE_PROPERTY':
      return { ...state, activeProperty: action.payload };

    case 'ADD_TO_QUEUE': {
      const queue = [...state.syncQueue, action.payload];
      return { ...state, syncQueue: queue };
    }

    case 'UPDATE_QUEUE_ITEM': {
      const queue = state.syncQueue.map(item =>
        item.id === action.payload.id ? { ...item, ...action.payload } : item
      );
      return { ...state, syncQueue: queue };
    }

    case 'REMOVE_FROM_QUEUE': {
      const queue = state.syncQueue.filter(item => item.id !== action.payload);
      return { ...state, syncQueue: queue };
    }

    case 'SET_QUEUE':
      return { ...state, syncQueue: action.payload };

    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };

    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist sync queue to AsyncStorage whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('@wmr_sync_queue', JSON.stringify(state.syncQueue)).catch(() => {});
  }, [state.syncQueue]);

  // Restore queue from AsyncStorage on cold start
  useEffect(() => {
    AsyncStorage.getItem('@wmr_sync_queue').then(raw => {
      if (raw) {
        try {
          const queue = JSON.parse(raw);
          dispatch({ type: 'SET_QUEUE', payload: queue });
        } catch (_) {}
      }
    });
  }, []);

  // Restore saved session on cold start
  useEffect(() => {
    AsyncStorage.getItem('@wmr_session').then(raw => {
      if (raw) {
        try {
          const session = JSON.parse(raw);
          dispatch({ type: 'SET_USER', payload: session });
        } catch (_) {}
      }
    });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Custom hook ─────────────────────────────────────────────────────────────
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
