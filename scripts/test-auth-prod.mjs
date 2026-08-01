import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDwuII2T4lbyP6ecTiO7rr_19fXLpASkIs",
  authDomain: "mes-taller-maquinados.firebaseapp.com",
  projectId: "mes-taller-maquinados",
  storageBucket: "mes-taller-maquinados.firebasestorage.app",
  messagingSenderId: "851385190679",
  appId: "1:851385190679:web:ab3c0b23308f91e3274f52"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("Probando clave corregida con Firebase Cloud...");

try {
  const res = await signInWithEmailAndPassword(auth, "admin@mestaller.com", "Admin123!");
  console.log("🎉 SUCCESS! LOGIN EXITOSO EN FIREBASE CLOUD PROD:", res.user.uid, res.user.email);
} catch (err) {
  console.error("❌ ERROR:", err.code, err.message);
}
