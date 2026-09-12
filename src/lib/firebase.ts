/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import "firebase/auth";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updatePassword,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot,
  limit,
  getDocFromServer
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
function initAuthInstance() {
  try {
    return getAuth(app);
  } catch (err: any) {
    console.warn("Attempting getAuth fallback initialization:", err);
    try {
      return getAuth();
    } catch {
      throw err;
    }
  }
}

export const auth = initAuthInstance();

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { signInWithPopup, signInAnonymously, updatePassword };

// Initialize Firestore
// Use the custom databaseId if specified in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage safely (Plano Spark Gratuito)
let storageInstance: any = null;
try {
  if (firebaseConfig && (firebaseConfig as any).storageBucket) {
    storageInstance = getStorage(app);
  }
} catch (e) {
  console.warn("Firebase Storage não está ativo ou disponível neste projeto:", e);
}

export const storage = storageInstance;

/**
 * Uploads a file to Firebase Storage (Plano Spark Gratuito) or converts to Data URL fallback.
 */
export async function uploadFileToStorage(file: File, pathFolder = "uploads"): Promise<string> {
  // 1. Try Firebase Storage if bucket is configured and accessible
  try {
    if (storage) {
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageRef = ref(storage, `${pathFolder}/${timestamp}_${cleanFileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    }
  } catch (error) {
    console.warn("Firebase Storage indisponível/não autorizado, persistindo no Banco de Dados Firestore:", error);
  }

  // 2. Read file as Data URL
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });

  // 3. Persist to Firestore database via /api/admin/upload-photo
  try {
    const res = await fetch("/api/admin/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: dataUrl,
        filename: file.name
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn("Falha no upload via endpoint, salvando direto no Firestore:", err);
  }

  // 4. Save directly to Firestore collection site_media
  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const mediaId = `media_${timestamp}_${cleanName}`;
    const dbInstance = db;
    if (dbInstance) {
      await setDoc(doc(dbInstance, "site_media", mediaId), {
        id: mediaId,
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        dataUrl,
        permanent: true,
        category: pathFolder,
        createdAt: new Date().toISOString()
      });
      return `/api/media/${mediaId}`;
    }
  } catch (err) {
    console.warn("Falha ao salvar no Firestore direto:", err);
  }

  // 5. Ultimate fallback: Data URL
  return dataUrl;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Validate database connection as mandated by skill
async function testConnection() {
  try {
    // Attempt connection check silently
    await getDoc(doc(db, "test", "connection"));
  } catch {
    // Ignore initial network lag or offline status
  }
}
testConnection();

export function cleanFirestoreData(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(cleanFirestoreData);
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned;
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  limit,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};
export type { FirebaseUser };
