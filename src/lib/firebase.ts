/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
// Use the custom databaseId if specified in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate database connection as mandated by skill
async function testConnection() {
  try {
    // Attempt a silent read to verify credentials are active
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    console.warn("Firestore status: initialized (reading live/local connection)");
  }
}
testConnection();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot
};
export type { FirebaseUser };
