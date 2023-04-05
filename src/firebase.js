import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAnsN7hPx8W6wptg-6r0oG4RI0zLQTITX4",
    authDomain: "tamurt-video.firebaseapp.com",
    projectId: "tamurt-video",
    storageBucket: "tamurt-video.appspot.com",
    messagingSenderId: "789658936483",
    appId: "1:789658936483:web:2b2618f388c7c7134e8b16"
  };

  const firebaseApp = firebase.initializeApp(firebaseConfig);
  const db = firebaseApp.firestore();
  const auth = firebase.auth();

  export { auth }
  export default db;