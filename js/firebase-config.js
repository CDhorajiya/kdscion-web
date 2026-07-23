// ════════════════════════════════════════════════════
// FIREBASE SETUP — shared by queryforum.html and admin-dashboard.html
//
// Step 1: Create a free Firebase project at
//         https://console.firebase.google.com
//         Add a web app → copy the config object it gives you.
//
// Step 2: In Firebase console → Build → Realtime Database
//         Create a database (start in test mode).
//
// Step 3: Replace every value below with your real config.
// ════════════════════════════════════════════════════

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAIqkxhxQe9Hs9Rv2G_l1A4ZBAjeKbC0bc",
  authDomain:        "kdscion-92847.firebaseapp.com",
  databaseURL:       "https://kdscion-92847-default-rtdb.firebaseio.com",
  projectId:         "kdscion-92847",
  storageBucket:     "kdscion-92847.firebasestorage.app",
  messagingSenderId: "800760294707",
  appId:             "1:800760294707:web:6c5f3ebeb8b5e897172246"
};

export const IS_DEMO = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";
