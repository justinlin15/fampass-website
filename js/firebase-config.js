const firebaseConfig = {
  apiKey: "AIzaSyB7WTKmWkppW-yXYn5ScCf0rIoF4VHKvw4",
  authDomain: "fampass-3bb49.firebaseapp.com",
  projectId: "fampass-3bb49",
  storageBucket: "fampass-3bb49.firebasestorage.app",
  messagingSenderId: "219668843017",
  appId: "1:219668843017:web:23c0b193cec3c62e91c6d8",
  measurementId: "G-CV57P29T7D"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
