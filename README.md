# Water Meter Reading App
**Lusaka Water & Sewerage Company · Field Meter Reader Application**

A React Native / Expo mobile app for meter readers to capture water meter readings in the field and sync them to ERPNext (Frappe Framework).

---

## Tech stack

| Layer | Library |
|-------|---------|
| Framework | React Native + Expo (SDK 51) |
| Navigation | React Navigation v6 (Native Stack) |
| State | React Context + useReducer |
| Offline storage | AsyncStorage (queue) + loadScheduleCache |
| HTTP | Axios |
| GPS | expo-location |
| Camera | expo-image-picker |
| Icons | @expo/vector-icons (Ionicons) |
| Backend | ERPNext / Frappe REST API |

---

## Project structure

```
WaterMeterApp/
├── App.js                          # Root — wraps context + navigation
├── app.json                        # Expo config (permissions, bundle IDs)
├── package.json
└── src/
    ├── constants/
    │   └── theme.js                # Colours, typography, spacing tokens
    ├── context/
    │   └── AppContext.js           # Global state (auth, schedule, queue)
    ├── navigation/
    │   └── AppNavigator.js         # Auth stack + App stack
    ├── services/
    │   ├── api.js                  # All ERPNext HTTP calls
    │   └── storage.js              # AsyncStorage — offline queue management
    ├── components/
    │   └── index.js                # Shared UI components
    └── screens/
        ├── LoginScreen.js          # S1 — credentials + server URL
        ├── HomeScreen.js           # S2 — schedule overview + progress
        ├── PropertyListScreen.js   # S3 — ordered route, filter tabs, search
        ├── ReadingCaptureScreen.js # S4 — CORE — entry, photo, GPS, submit
        ├── ConfirmationScreen.js   # S5 — post-submit summary
        └── SyncQueueScreen.js      # S6 — offline queue, sync all, retry
```

---

## Getting started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your Android/iOS device **or** an Android emulator / iOS Simulator

### Install
```bash
cd WaterMeterApp
npm install
```

### Run
```bash
# Start the Expo dev server
npm start

# Or directly target a platform
npm run android
npm run ios
```

Scan the QR code in Expo Go to run on your phone.

---

## ERPNext configuration

1. Open `src/screens/LoginScreen.js` and set a sensible default for `baseUrl`
   (or leave it for the meter reader to enter).

2. The app uses **session cookie authentication** by default (username + password
   via `POST /api/method/login`). If you prefer API key / secret tokens, edit
   `src/services/api.js` — the `initApi` function accepts a `token` param.

3. Ensure the ERPNext user has permission to:
   - Read `Reading Schedule`
   - Read `Water Property`
   - Create `Meter Reading`
   - Upload Files (for meter photos)

4. CORS: add your Expo dev server's IP to ERPNext's `Allow Cross Origin` setting
   during development.

---

## Screen flow

```
Login
  └─► Home (My Schedule)
        └─► Property List (ordered route)
              └─► Reading Capture  ──offline──► Local Storage ──► Sync Queue ──► ERPNext
                    └─► Confirmation
                          ├─► Next property (loops back to Property List)
                          └─► Sync Queue
```

---

## Offline behaviour

- On every login the property list is cached to `AsyncStorage`.
- Every submitted reading is checked for connectivity via `NetInfo`.
  - **Online** → POST directly to ERPNext.
  - **Offline / API error** → saved to the local sync queue with status `pending`.
- On the Sync Queue screen, "Sync all" attempts each pending/failed item in order.
- Synced items persist as history until the reader taps "Clear synced".

---

## Next steps (Phase 2)

- [ ] QR/barcode scanner for meter identification
- [ ] Background sync when connectivity is restored
- [ ] Supervisor dashboard (admin portal)
- [ ] Push notifications for schedule assignment
- [ ] Offline map tile cache for GPS map preview
- [ ] Digital signature capture for disputed readings
