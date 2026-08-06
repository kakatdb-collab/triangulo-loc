/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, User, Lock, Mail, Phone, Calendar, MessageSquare, ShieldAlert,
  Upload, Check, CreditCard, ChevronRight, Settings, Plus, Trash2, 
  Sparkles, Bell, Send, Image as ImageIcon, Key, RefreshCw, AlertTriangle,
  Activity, Eye, MousePointer, BarChart2, Download, Database, HardDrive,
  Zap, Gauge, FileText, Star, Users, UserCheck, Shield, Layers, Award,
  Sliders, Camera, Edit3, CheckCircle2, Power, Search
} from "lucide-react";
import { 
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  sendPasswordResetEmail, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, addDoc, onSnapshot, FirebaseUser,
  handleFirestoreError, OperationType, cleanFirestoreData
} from "../lib/firebase";
import { logSecurityEvent, logActivityEvent, checkRateLimit, SecurityLog, ActivityLog, BehaviorLog } from "../lib/analytics";
import { VitalMetricLog } from "../lib/vitals";
import { Booking, Equipment } from "../types";
import RentalContractModal from "./RentalContractModal";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";

// Helper function to concatenate classes cleanly
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

interface CustomerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Allows pre-selecting a booking to pay signal
  initialBookingToPay?: Booking | null;
  onPaymentSuccess?: () => void;
}

export default function CustomerPanel({ isOpen, onClose, initialBookingToPay, onPaymentSuccess }: CustomerPanelProps) {
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<"client" | "admin">("client");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [loading, setLoading] = useState(true);

  // Forms
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // General Tabs
  // Client: "bookings" | "write-testimonial" | "profile" | "chat"
  // Admin: "admin-bookings" | "admin-users" | "admin-hero" | "admin-spaces" | "admin-plans" | "admin-simulator" | "admin-testimonials" | "admin-chat" | "admin-logs"
  const [activeTab, setActiveTab] = useState<string>("bookings");

  // Client Dashboard Bookings & Chat states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");

  // Contract Modal State
  const [contractBooking, setContractBooking] = useState<Booking | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);

  // Client Testimonial Form
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialQuote, setTestimonialQuote] = useState("");
  const [testimonialRole, setTestimonialRole] = useState("");
  const [testimonialSuccess, setTestimonialSuccess] = useState("");
  const [testimonialLoading, setTestimonialLoading] = useState(false);

  // Payment State (InfinitePay R$ 100 fixed deposit)
  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [payFullBooking, setPayFullBooking] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"method" | "pix" | "card" | "success">("method");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [pixQr, setPixQr] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  // Admin Panel States
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<string>("All");

  // Admin Users & Photographer Frequency State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Admin Chat States
  const [adminMessagesUsers, setAdminMessagesUsers] = useState<any[]>([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>("");
  const [adminSelectedUserName, setAdminSelectedUserName] = useState<string>("");
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminNewMsg, setAdminNewMsg] = useState("");

  // Admin CMS - Hero Banner
  const [heroSettings, setHeroSettings] = useState({
    title1: "ESTÚDIO TRIÂNGULO",
    title2: "FOTOCLUB",
    badge: "Espaço Criativo Premium",
    description: "O estúdio mais completo, barato e acessível no Centro de São Paulo (Largo do Paissandu, próximo ao metrô). 120m² climatizados com ciclorama em U, camarim e iluminação inclusa.",
    bgImage: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
    btnPrimary: "RESERVAR HORÁRIO",
    btnSecondary: "Conhecer Estúdios"
  });
  const [heroSaveSuccess, setHeroSaveSuccess] = useState("");

  // Admin CMS - Spaces / Nosso Espaço
  const [spacesList, setSpacesList] = useState<any[]>([]);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSubtitle, setNewSpaceSubtitle] = useState("");
  const [newSpaceDesc, setNewSpaceDesc] = useState("");
  const [newSpaceHourly, setNewSpaceHourly] = useState(100);
  const [newSpaceHalfDay, setNewSpaceHalfDay] = useState(400);
  const [newSpaceFullDay, setNewSpaceFullDay] = useState(700);
  const [newSpaceCapacity, setNewSpaceCapacity] = useState(15);
  const [newSpaceArea, setNewSpaceArea] = useState("120m²");
  const [newSpaceFeatures, setNewSpaceFeatures] = useState("Ciclorama em U, Camarim, Cortinas Blackout, Copa");
  const [spaceSaveMsg, setSpaceSaveMsg] = useState("");

  // Admin CMS - Coworking Plans
  const [plansList, setPlansList] = useState<any[]>([]);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState(400);
  const [newPlanFeatures, setNewPlanFeatures] = useState("12hrs locação, Desconto em Workshops, Fundo colorido");
  const [planSaveMsg, setPlanSaveMsg] = useState("");

  // Admin Testimonials List & Moderation
  const [testimonialsList, setTestimonialsList] = useState<any[]>([]);

  // Admin Simulator & Assets/Hardware Control
  const [simulatorHourly, setSimulatorHourly] = useState(100);
  const [simulatorHalfDay, setSimulatorHalfDay] = useState(400);
  const [simulatorFullDay, setSimulatorFullDay] = useState(700);
  const [infinitePayHandle, setInfinitePayHandle] = useState("triangulofotoclub");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipCategory, setNewEquipCategory] = useState<"lighting" | "camera" | "grip" | "scenery">("lighting");
  const [newEquipPrice, setNewEquipPrice] = useState(50);
  const [newEquipDesc, setNewEquipDesc] = useState("");
  const [assetSaveMsg, setAssetSaveMsg] = useState("");

  // Admin Logs & Telemetry
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>([]);
  const [vitalsLogs, setVitalsLogs] = useState<VitalMetricLog[]>([]);
  const [adminLogsSubTab, setAdminLogsSubTab] = useState<"security" | "activity" | "behavior" | "vitals">("security");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupFiles, setBackupFiles] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const adminChatEndRef = useRef<HTMLDivElement>(null);

  const fetchBackupList = async () => {
    try {
      const res = await fetch("/api/admin/list-backups");
      if (res.ok) {
        const data = await res.json();
        setBackupFiles(data.backups || []);
      }
    } catch (err) {
      console.error("Error listing backups:", err);
    }
  };

  const triggerManualBackup = async () => {
    setBackupLoading(true);
    setBackupMsg("");
    try {
      const res = await fetch("/api/admin/trigger-backup");
      const data = await res.json();
      if (data.success) {
        setBackupMsg(`✅ Backup exportado com sucesso! (${data.counts?.securityLogsCount || 0} logs)`);
        fetchBackupList();
      } else {
        setBackupMsg("❌ Erro ao exportar backup: " + (data.error || "Desconhecido"));
      }
    } catch (err: any) {
      setBackupMsg("❌ Erro de comunicação ao acionar backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Watch Auth & Firestore Real-time Listeners
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile in Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        let userRole: "client" | "admin" = "client";
        let uName = currentUser.displayName || "";
        let uPhone = "";
        let uAvatar = "";

        const ADMIN_EMAILS = [
          "contato@triangulofotoclub.com.br",
          "kakatdb@gmail.com"
        ];
        const userEmail = currentUser.email?.toLowerCase().trim() || "";
        const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

        if (userSnap.exists()) {
          const uData = userSnap.data();
          userRole = isAdminEmail || uData.role === "admin" ? "admin" : "client";
          uName = uData.name || uName;
          uPhone = uData.phone || "";
          uAvatar = uData.avatarUrl || "";
        } else {
          userRole = isAdminEmail ? "admin" : "client";
          await setDoc(userDocRef, cleanFirestoreData({
            uid: currentUser.uid,
            email: currentUser.email,
            name: uName || (isAdminEmail ? "Administrador Triângulo" : "Criativo"),
            phone: uPhone,
            role: userRole,
            avatarUrl: "",
            createdAt: new Date().toLocaleDateString("pt-BR"),
          }));
        }

        setRole(userRole);
        setProfileName(uName || "Criativo");
        setProfilePhone(uPhone);
        setProfileAvatar(uAvatar);
        setActiveTab(userRole === "admin" ? "admin-analytics" : "bookings");

        // Client Listeners
        if (userRole === "client") {
          const bQuery = query(
            collection(db, "bookings"),
            where("userId", "==", currentUser.uid)
          );
          const unsubBookings = onSnapshot(bQuery, (snap) => {
            const list: Booking[] = [];
            snap.forEach((doc) => {
              list.push({ id: doc.id, ...doc.data() } as Booking);
            });
            list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setMyBookings(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "bookings"));

          const chatQuery = query(
            collection(db, "messages"),
            where("senderId", "in", [currentUser.uid, "admin"]),
            where("recipientId", "in", [currentUser.uid, "admin"])
          );
          const unsubChat = onSnapshot(chatQuery, (snap) => {
            const msgs: any[] = [];
            snap.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
            msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setChatMessages(msgs);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
          }, (error) => handleFirestoreError(error, OperationType.GET, "messages"));

          return () => {
            unsubBookings();
            unsubChat();
          };
        } else {
          // Admin Listeners
          // 1. All Bookings
          const allBQuery = collection(db, "bookings");
          const unsubAllBookings = onSnapshot(allBQuery, (snap) => {
            const list: Booking[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Booking));
            list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setAllBookings(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "bookings"));

          // 2. All Users
          const allUsersQuery = collection(db, "users");
          const unsubUsers = onSnapshot(allUsersQuery, (snap) => {
            const usersArr: any[] = [];
            snap.forEach((doc) => usersArr.push({ id: doc.id, ...doc.data() }));
            setUsersList(usersArr);
            setAdminMessagesUsers(usersArr.filter(u => u.role !== "admin"));
          }, (error) => handleFirestoreError(error, OperationType.GET, "users"));

          // 3. Testimonials
          const unsubTestimonials = onSnapshot(collection(db, "testimonials"), (snap) => {
            const tList: any[] = [];
            snap.forEach((doc) => tList.push({ id: doc.id, ...doc.data() }));
            setTestimonialsList(tList);
          }, (error) => handleFirestoreError(error, OperationType.GET, "testimonials"));

          // 4. Spaces
          const unsubSpaces = onSnapshot(collection(db, "spaces"), (snap) => {
            const sList: any[] = [];
            snap.forEach((doc) => sList.push({ id: doc.id, ...doc.data() }));
            setSpacesList(sList);
          }, (error) => handleFirestoreError(error, OperationType.GET, "spaces"));

          // 5. Cowork Plans
          const unsubPlans = onSnapshot(collection(db, "cowork_plans"), (snap) => {
            const pList: any[] = [];
            snap.forEach((doc) => pList.push({ id: doc.id, ...doc.data() }));
            setPlansList(pList);
          }, (error) => handleFirestoreError(error, OperationType.GET, "cowork_plans"));

          // 6. Hero Settings
          const unsubHero = onSnapshot(doc(db, "site_settings", "hero"), (snap) => {
            if (snap.exists()) {
              const hData = snap.data();
              setHeroSettings({
                title1: hData.title1 || "ESTÚDIO TRIÂNGULO",
                title2: hData.title2 || "FOTOCLUB",
                badge: hData.badge || "Espaço Criativo Premium",
                description: hData.description || "",
                bgImage: hData.bgImage || "",
                btnPrimary: hData.btnPrimary || "RESERVAR HORÁRIO",
                btnSecondary: hData.btnSecondary || "Conhecer Estúdios"
              });
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/hero"));

          // 7. Security & Activity Logs
          const secQuery = query(collection(db, "security_logs"), orderBy("timestamp", "desc"));
          const unsubSec = onSnapshot(secQuery, (snap) => {
            const list: SecurityLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as SecurityLog));
            setSecurityLogs(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "security_logs"));

          const actQuery = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
          const unsubAct = onSnapshot(actQuery, (snap) => {
            const list: ActivityLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as ActivityLog));
            setActivityLogs(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "activity_logs"));

          const behQuery = query(collection(db, "behavior_logs"), orderBy("timestamp", "desc"));
          const unsubBeh = onSnapshot(behQuery, (snap) => {
            const list: BehaviorLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as BehaviorLog));
            setBehaviorLogs(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "behavior_logs"));

          const vitQuery = query(collection(db, "vitals_logs"), orderBy("timestamp", "desc"));
          const unsubVit = onSnapshot(vitQuery, (snap) => {
            const list: VitalMetricLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as VitalMetricLog));
            setVitalsLogs(list);
          }, (error) => handleFirestoreError(error, OperationType.GET, "vitals_logs"));

          fetchBackupList();

          return () => {
            unsubAllBookings();
            unsubUsers();
            unsubTestimonials();
            unsubSpaces();
            unsubPlans();
            unsubHero();
            unsubSec();
            unsubAct();
            unsubBeh();
            unsubVit();
          };
        }
      } else {
        setMyBookings([]);
        setAllBookings([]);
        setChatMessages([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Admin Selected Chat
  useEffect(() => {
    if (!adminSelectedUserId || role !== "admin") return;

    const adminChatQuery = query(
      collection(db, "messages"),
      where("senderId", "in", [adminSelectedUserId, "admin"]),
      where("recipientId", "in", [adminSelectedUserId, "admin"])
    );

    const unsubAdminChat = onSnapshot(adminChatQuery, (snap) => {
      const msgs: any[] = [];
      snap.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setAdminChatMessages(msgs);
      setTimeout(() => adminChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    });

    return () => unsubAdminChat();
  }, [adminSelectedUserId, role]);

  // Load simulator settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "settings", "simulator");
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data();
          setSimulatorHourly(data.hourlyRate || 100);
          setSimulatorHalfDay(data.halfDayRate || 400);
          setSimulatorFullDay(data.fullDayRate || 700);
          setInfinitePayHandle(data.infinitePayHandle || "triangulofotoclub");
          setEquipments(data.equipments || []);
        }
      } catch (e) {
        console.error("Error loading simulator settings:", e);
      }
    };
    if (isOpen) loadSettings();
  }, [isOpen]);

  // Pre-selected payment trigger
  useEffect(() => {
    if (initialBookingToPay) {
      setBookingToPay(initialBookingToPay);
      setPaymentStep("method");
      setActiveTab("bookings");
    }
  }, [initialBookingToPay]);

  // Submit Testimonial (Client)
  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialQuote.trim()) return;
    setTestimonialLoading(true);
    setTestimonialSuccess("");

    try {
      await addDoc(collection(db, "testimonials"), cleanFirestoreData({
        name: profileName || "Fotógrafo Parceiro",
        role: testimonialRole || "Diretor de Fotografia",
        quote: testimonialQuote,
        rating: testimonialRating,
        avatarUrl: profileAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        createdAt: new Date().toISOString(),
        userId: user?.uid || "anonymous"
      }));

      setTestimonialSuccess("Depoimento enviado com sucesso! Já está visível na página principal.");
      setTestimonialQuote("");
      setTestimonialRole("");
    } catch (err) {
      console.error("Error saving testimonial:", err);
    } finally {
      setTestimonialLoading(false);
    }
  };

  // Admin Save Hero Banner CMS
  const handleSaveHeroSettings = async () => {
    setHeroSaveSuccess("");
    try {
      await setDoc(doc(db, "site_settings", "hero"), cleanFirestoreData(heroSettings));
      setHeroSaveSuccess("Banner Hero atualizado com sucesso no site!");
      setTimeout(() => setHeroSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Error saving hero settings:", err);
    }
  };

  // Admin Save Space (Nosso Espaço)
  const handleAddSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName) return;
    setSpaceSaveMsg("");
    try {
      const spaceId = "space-" + Date.now();
      await setDoc(doc(db, "spaces", spaceId), cleanFirestoreData({
        id: spaceId,
        name: newSpaceName,
        subtitle: newSpaceSubtitle,
        description: newSpaceDesc,
        hourlyRate: Number(newSpaceHourly),
        halfDayRate: Number(newSpaceHalfDay),
        fullDayRate: Number(newSpaceFullDay),
        capacity: Number(newSpaceCapacity),
        area: newSpaceArea,
        features: newSpaceFeatures.split(",").map(s => s.trim()).filter(Boolean)
      }));
      setSpaceSaveMsg("Espaço cadastrado com sucesso!");
      setNewSpaceName("");
      setNewSpaceSubtitle("");
      setNewSpaceDesc("");
    } catch (err) {
      console.error("Error adding space:", err);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    try {
      await deleteDoc(doc(db, "spaces", spaceId));
    } catch (err) {
      console.error("Error deleting space:", err);
    }
  };

  // Admin Save Plan
  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName) return;
    setPlanSaveMsg("");
    try {
      const planId = "plan-" + Date.now();
      await setDoc(doc(db, "cowork_plans", planId), cleanFirestoreData({
        id: planId,
        name: newPlanName,
        price: Number(newPlanPrice),
        features: newPlanFeatures.split(",").map(s => s.trim()).filter(Boolean)
      }));
      setPlanSaveMsg("Plano de Coworking cadastrado com sucesso!");
      setNewPlanName("");
    } catch (err) {
      console.error("Error adding plan:", err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deleteDoc(doc(db, "cowork_plans", planId));
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  // Admin Asset/Equipment Registration
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName) return;
    setAssetSaveMsg("");

    const newEq: Equipment = {
      id: "eq-" + Date.now(),
      name: newEquipName,
      category: newEquipCategory,
      price: Number(newEquipPrice),
      description: newEquipDesc,
      isAvailable: true
    };

    const updated = [...equipments, newEq];
    setEquipments(updated);

    try {
      // Save to settings/simulator
      await updateDoc(doc(db, "settings", "simulator"), cleanFirestoreData({
        equipments: updated
      }));

      // Also write directly to equipment collection
      await setDoc(doc(db, "equipment", newEq.id), cleanFirestoreData(newEq));

      setAssetSaveMsg("Ativo / Equipamento cadastrado com sucesso!");
      setNewEquipName("");
      setNewEquipDesc("");
    } catch (err) {
      console.error("Error adding equipment asset:", err);
    }
  };

  const toggleEquipmentAvailability = async (eqId: string) => {
    const updated = equipments.map(e => e.id === eqId ? { ...e, isAvailable: !e.isAvailable } : e);
    setEquipments(updated);
    try {
      await updateDoc(doc(db, "settings", "simulator"), cleanFirestoreData({ equipments: updated }));
      const eqItem = updated.find(e => e.id === eqId);
      if (eqItem) {
        await updateDoc(doc(db, "equipment", eqId), cleanFirestoreData({ isAvailable: eqItem.isAvailable }));
      }
    } catch (err) {
      console.error("Error toggling equipment availability:", err);
    }
  };

  const handleDeleteEquipment = async (eqId: string) => {
    const updated = equipments.filter(e => e.id !== eqId);
    setEquipments(updated);
    try {
      await updateDoc(doc(db, "settings", "simulator"), cleanFirestoreData({ equipments: updated }));
      await deleteDoc(doc(db, "equipment", eqId));
    } catch (err) {
      console.error("Error deleting equipment:", err);
    }
  };

  // User Actions (Toggle Admin & Block/Unblock)
  const handleToggleUserAdmin = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "client" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), cleanFirestoreData({ role: nextRole }));
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const handleToggleUserBlock = async (userId: string, currentBlocked?: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), cleanFirestoreData({ isBlocked: !currentBlocked }));
    } catch (err) {
      console.error("Error toggling user block status:", err);
    }
  };

  // Auth Submit Handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    if (!email || !password || !name) {
      setAuthError("Por favor preencha todos os campos.");
      setAuthLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), cleanFirestoreData({
        uid: cred.user.uid,
        email: email,
        name: name,
        phone: phone,
        role: "client",
        avatarUrl: "",
        createdAt: new Date().toLocaleDateString("pt-BR"),
      }));

      setAuthSuccess("Cadastro realizado! Seja bem-vindo.");
      setIsRegistering(false);
    } catch (error: any) {
      setAuthError(error.message || "Erro ao realizar cadastro.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setAuthError("E-mail e senha são necessários.");
      setAuthLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (error: any) {
      setAuthError("Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError("Insira seu e-mail para receber o link de redefinição.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess("E-mail de redefinição enviado com sucesso!");
    } catch (err: any) {
      setAuthError("Erro ao enviar e-mail de redefinição.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  // Compute Photographer Frequency Stats
  const userFrequencyMap = React.useMemo(() => {
    const map: Record<string, { email: string; name: string; phone: string; count: number; totalSpent: number; lastDate: string }> = {};
    allBookings.forEach((b) => {
      const em = b.clientEmail?.toLowerCase().trim() || "desconhecido";
      if (!map[em]) {
        map[em] = {
          email: em,
          name: b.clientName || em.split("@")[0],
          phone: b.clientPhone || "-",
          count: 0,
          totalSpent: 0,
          lastDate: b.date || "-"
        };
      }
      map[em].count += 1;
      map[em].totalSpent += b.totalPrice || 0;
      if (b.date && b.date > map[em].lastDate) {
        map[em].lastDate = b.date;
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allBookings]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Signed Rental Contract Modal */}
          <RentalContractModal 
            booking={contractBooking}
            isOpen={isContractOpen}
            onClose={() => { setIsContractOpen(false); setContractBooking(null); }}
          />

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-40"
          />

          {/* Slide-over panel container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-stone-950 border-l border-white/10 z-50 flex flex-col shadow-2xl text-left overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-stone-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#d93838]/10 border border-[#d93838]/30 flex items-center justify-center text-[#d93838]">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-white">
                    {user ? (role === "admin" ? "Painel Administrativo Triângulo" : `Área do Locador • ${profileName}`) : "Acesso à Conta"}
                  </h4>
                  <p className="text-[10px] font-mono text-zinc-400">
                    {user ? user.email : "Gestão de Reservas, Contratos e Ativos"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {user && (
                  <button
                    onClick={handleLogout}
                    className="text-zinc-400 hover:text-red-400 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/10 hover:border-red-500/30 rounded transition-all cursor-pointer"
                  >
                    Sair
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white p-2 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {!user ? (
                /* AUTH FORM (LOGIN / REGISTER) */
                <div className="max-w-md mx-auto my-auto w-full p-8 space-y-6 text-center">
                  <div className="space-y-2">
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                      {isRegistering ? "Criar Conta de Fotógrafo" : "Entrar no Estúdio"}
                    </h3>
                    <p className="text-zinc-400 text-xs font-sans">
                      Acesse o histórico das suas locações, contratos e simulador.
                    </p>
                  </div>

                  {authError && (
                    <div className="bg-red-950/60 border border-red-500/30 text-red-300 p-3 rounded text-xs text-left flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs text-left flex items-start gap-2">
                      <Check size={16} className="shrink-0 mt-0.5" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4 text-left">
                    {isRegistering && (
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                          Nome Completo / Produtora *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Ana Souza Fotografia"
                          className="w-full bg-stone-900 border border-white/10 px-4 py-2.5 rounded text-xs text-white focus:outline-none focus:border-brand-red"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-stone-900 border border-white/10 px-4 py-2.5 rounded text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                        Senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-stone-900 border border-white/10 px-4 py-2.5 rounded text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-widest py-3 rounded font-bold transition-all cursor-pointer"
                    >
                      {authLoading ? "Aguarde..." : isRegistering ? "Concluir Cadastro" : "Acessar Painel"}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-white/5 text-xs text-zinc-400 space-y-2">
                    <p>
                      {isRegistering ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); setAuthSuccess(""); }}
                        className="text-white font-bold underline hover:text-brand-red transition-colors cursor-pointer"
                      >
                        {isRegistering ? "Faça login" : "Cadastre-se aqui"}
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED PANEL */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  
                  {/* TABS NAVIGATION BAR */}
                  <div className="flex bg-stone-900 border-b border-white/10 text-[11px] font-mono uppercase tracking-wider overflow-x-auto shrink-0 scrollbar-none">
                    {role === "client" ? (
                      <>
                        <button
                          onClick={() => setActiveTab("bookings")}
                          className={cn(
                            "px-5 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "bookings" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Minhas Locações
                        </button>
                        <button
                          onClick={() => setActiveTab("write-testimonial")}
                          className={cn(
                            "px-5 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "write-testimonial" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Star size={13} className="text-amber-400" /> Escrever Depoimento
                        </button>
                        <button
                          onClick={() => setActiveTab("profile")}
                          className={cn(
                            "px-5 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "profile" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => setActiveTab("chat")}
                          className={cn(
                            "px-5 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "chat" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Chat Suporte
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveTab("admin-analytics")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "admin-analytics" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <BarChart2 size={13} className="text-brand-red" /> Métricas & Analytics
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-bookings")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-bookings" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Locações & Agenda
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-users")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "admin-users" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Users size={13} className="text-emerald-400" /> Usuários & Fotógrafos
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-hero")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-hero" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Banner Hero
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-spaces")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-spaces" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Nosso Espaço
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-plans")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-plans" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Planos Coworking
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-simulator")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "admin-simulator" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Camera size={13} className="text-amber-400" /> Ativos & Simulador
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-testimonials")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-testimonials" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Depoimentos
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-chat")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap",
                            activeTab === "admin-chat" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Mensagens
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-logs")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "admin-logs" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <ShieldAlert size={13} className="text-red-400" /> Logs & Vitals
                        </button>
                      </>
                    )}
                  </div>

                  {/* TAB CONTENTS */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    
                    {/* CLIENT: MY BOOKINGS & SIGNED CONTRACT */}
                    {activeTab === "bookings" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Histórico das Suas Locações</h5>
                          <span className="font-mono text-[10px] text-zinc-500 uppercase">{myBookings.length} reservas registradas</span>
                        </div>

                        {myBookings.length === 0 ? (
                          <div className="text-center py-12 bg-stone-900 border border-white/5 rounded p-6 space-y-3">
                            <Calendar size={28} className="mx-auto text-zinc-600" />
                            <p className="text-zinc-400 text-xs">Você ainda não realizou agendamentos.</p>
                            <a href="#reservar" onClick={onClose} className="inline-block bg-brand-red text-white font-mono text-[10px] uppercase px-4 py-2 rounded font-bold">
                              Simular Reserva Agora
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {myBookings.map((b) => (
                              <div key={b.id} className="bg-stone-900 border border-white/10 p-5 rounded space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                  <div>
                                    <span className="font-mono text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">
                                      Reserva #{b.id}
                                    </span>
                                    <h6 className="font-sans font-bold text-sm text-white mt-1">{b.spaceName}</h6>
                                    <p className="text-zinc-400 text-xs font-mono">{b.date} • {b.timeSlot} ({b.durationHours}h)</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={cn(
                                      "inline-block font-mono text-[9px] uppercase px-2.5 py-1 rounded font-bold",
                                      b.status === "Reservada" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "bg-amber-950 text-amber-400 border border-amber-500/20"
                                    )}>
                                      {b.status}
                                    </span>
                                    <p className="text-brand-red font-bold text-base mt-1">R$ {b.totalPrice?.toFixed(2)}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                  <span className="text-zinc-400 text-xs font-mono">
                                    Sinal de Reserva: {b.depositPaid ? "✅ PAGO" : "🔴 PENDENTE"}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => { setContractBooking(b); setIsContractOpen(true); }}
                                      className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold"
                                    >
                                      <FileText size={12} /> Contrato de Locação (PDF)
                                    </button>

                                    {!b.depositPaid && (
                                      <button
                                        onClick={() => { setBookingToPay(b); setPaymentStep("method"); }}
                                        className="bg-brand-red hover:bg-red-700 text-white font-mono text-[10px] uppercase px-3.5 py-1.5 rounded font-bold transition-all cursor-pointer"
                                      >
                                        Pagar Sinal R$100
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CLIENT: WRITE TESTIMONIAL */}
                    {activeTab === "write-testimonial" && (
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                        <div>
                          <h5 className="font-display font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                            <Star size={16} /> Avaliar e Escrever Depoimento pro Site
                          </h5>
                          <p className="text-zinc-400 text-xs font-sans mt-1">
                            Seu depoimento aparecerá na seção "Quem Faz Acontecer Conosco" na página principal do Estúdio Triângulo.
                          </p>
                        </div>

                        {testimonialSuccess && (
                          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs flex items-center gap-2">
                            <CheckCircle2 size={16} /> {testimonialSuccess}
                          </div>
                        )}

                        <form onSubmit={handleSubmitTestimonial} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                              Sua Nota / Estrelas (1 a 5)
                            </label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setTestimonialRating(star)}
                                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                >
                                  <Star size={22} className={star <= testimonialRating ? "fill-amber-400 text-amber-400" : "text-zinc-600"} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                              Sua Especialidade / Cargo (ex: Fotógrafo de Moda, Diretor de Cena)
                            </label>
                            <input
                              type="text"
                              value={testimonialRole}
                              onChange={(e) => setTestimonialRole(e.target.value)}
                              placeholder="Ex: Fotógrafo Autoral & Publicitário"
                              className="w-full bg-stone-950 border border-white/10 px-4 py-2 rounded text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                              Seu Depoimento sobre a experiência no Estúdio *
                            </label>
                            <textarea
                              required
                              rows={4}
                              value={testimonialQuote}
                              onChange={(e) => setTestimonialQuote(e.target.value)}
                              placeholder="Conte como foi sua produção, atendimento, infraestrutura ou iluminação do Triângulo..."
                              className="w-full bg-stone-950 border border-white/10 p-3 rounded text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={testimonialLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs uppercase tracking-widest px-6 py-3 rounded font-bold transition-all cursor-pointer"
                          >
                            {testimonialLoading ? "Publicando..." : "Enviar Depoimento pro Site"}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* CLIENT: PROFILE */}
                    {activeTab === "profile" && (
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-4">
                        <h5 className="font-display font-bold text-xs uppercase tracking-wider text-white">Dados do Seu Perfil</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Nome</span>
                            <strong className="text-white font-mono">{profileName}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">E-mail</span>
                            <strong className="text-white font-mono">{user.email}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Tipo de Conta</span>
                            <strong className="text-emerald-400 font-mono uppercase">{role}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CLIENT: CHAT */}
                    {activeTab === "chat" && (
                      <div className="bg-stone-900 border border-white/10 rounded p-4 flex flex-col h-[450px]">
                        <h5 className="font-display font-bold text-xs uppercase tracking-wider text-white mb-3">Atendimento e Suporte Direto</h5>
                        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-stone-950 rounded border border-white/5">
                          {chatMessages.length === 0 ? (
                            <p className="text-center py-8 text-zinc-600 text-xs font-mono">Nenhuma mensagem ainda. Envie uma dúvida para a equipe!</p>
                          ) : (
                            chatMessages.map((m) => (
                              <div key={m.id} className={cn("max-w-[80%] p-3 rounded text-xs leading-relaxed", m.senderId === user.uid ? "bg-brand-red text-white ml-auto" : "bg-stone-800 text-zinc-200")}>
                                <p>{m.text}</p>
                                <span className="text-[8px] opacity-60 font-mono block text-right mt-1">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            ))
                          )}
                          <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newMsg.trim()) return;
                          await addDoc(collection(db, "messages"), cleanFirestoreData({
                            id: "msg-" + Date.now(),
                            senderId: user.uid,
                            senderName: profileName,
                            recipientId: "admin",
                            text: newMsg,
                            createdAt: new Date().toISOString()
                          }));
                          setNewMsg("");
                        }} className="flex gap-2 mt-3">
                          <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Digite sua mensagem para a gerência..." className="flex-1 bg-stone-950 border border-white/10 px-3 py-2 rounded text-xs text-white focus:outline-none" />
                          <button type="submit" className="bg-brand-red text-white font-mono text-xs px-4 rounded font-bold">Enviar</button>
                        </form>
                      </div>
                    )}

                    {/* ADMIN: ANALYTICS DASHBOARD */}
                    {activeTab === "admin-analytics" && (
                      <AdminAnalyticsDashboard bookings={allBookings} />
                    )}

                    {/* ADMIN: BOOKINGS AGENDA & CONTRACT VIEW */}
                    {activeTab === "admin-bookings" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-emerald-400">Gerenciamento Geral de Locações</h5>
                          <span className="font-mono text-[10px] text-zinc-500 uppercase">{allBookings.length} locações gravadas</span>
                        </div>

                        <div className="space-y-3">
                          {allBookings.map((b) => (
                            <div key={b.id} className="bg-stone-900 border border-white/10 p-4 rounded space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                  <span className="font-mono text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">Ref: #{b.id}</span>
                                  <h6 className="font-bold text-sm text-white mt-1">{b.clientName} ({b.clientEmail})</h6>
                                  <p className="text-zinc-400 text-xs font-mono">{b.spaceName} • {b.date} • {b.timeSlot} ({b.durationHours}h)</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-xs font-bold text-brand-red block">R$ {b.totalPrice?.toFixed(2)}</span>
                                  <span className="text-[10px] font-mono text-emerald-400 block">{b.depositPaid ? "✅ Sinal Pago" : "🔴 Sinal Pendente"}</span>
                                </div>
                              </div>

                              <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Alterar Status:</span>
                                  {["Simulada", "Pendente", "Reservada", "Concluída", "Cancelada"].map((st) => (
                                    <button
                                      key={st}
                                      onClick={async () => {
                                        await updateDoc(doc(db, "bookings", b.id), cleanFirestoreData({ status: st }));
                                      }}
                                      className={cn(
                                        "text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all",
                                        b.status === st ? "bg-brand-red text-white font-bold" : "bg-stone-950 text-zinc-400 hover:text-white"
                                      )}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onClick={() => { setContractBooking(b); setIsContractOpen(true); }}
                                  className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer font-bold"
                                >
                                  <Download size={12} className="text-brand-red" /> Baixar Contrato PDF
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ADMIN: USER MANAGEMENT & PHOTOGRAPHER FREQUENCY */}
                    {activeTab === "admin-users" && (
                      <div className="space-y-6">
                        <div>
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                            <Users size={16} /> Gestão de Usuários & Estatísticas por Fotógrafo
                          </h5>
                          <p className="text-zinc-400 text-xs font-sans mt-1">
                            Acompanhe quantas vezes o mesmo fotógrafo locou, histórico completo de reservas e permissões de acesso.
                          </p>
                        </div>

                        {/* Top Frequency Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-stone-900 border border-white/5 p-4 rounded text-left">
                            <span className="font-mono text-[9px] text-zinc-500 uppercase block">Total Usuários</span>
                            <span className="font-mono text-xl font-bold text-white block mt-1">{usersList.length}</span>
                          </div>
                          <div className="bg-stone-900 border border-white/5 p-4 rounded text-left">
                            <span className="font-mono text-[9px] text-zinc-500 uppercase block">Total Locações</span>
                            <span className="font-mono text-xl font-bold text-emerald-400 block mt-1">{allBookings.length}</span>
                          </div>
                          <div className="bg-stone-900 border border-white/5 p-4 rounded text-left">
                            <span className="font-mono text-[9px] text-zinc-500 uppercase block">Fotógrafos Recorrentes</span>
                            <span className="font-mono text-xl font-bold text-amber-400 block mt-1">
                              {userFrequencyMap.filter(u => u.count > 1).length}
                            </span>
                          </div>
                          <div className="bg-stone-900 border border-white/5 p-4 rounded text-left">
                            <span className="font-mono text-[9px] text-zinc-500 uppercase block">Faturamento Geral</span>
                            <span className="font-mono text-base font-bold text-brand-red block mt-1">
                              R$ {allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Search Filter Bar */}
                        <div className="relative">
                          <Search size={16} className="absolute left-3.5 top-3 text-zinc-500" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Buscar fotógrafo por nome, e-mail ou telefone..."
                            className="w-full bg-stone-900 border border-white/10 pl-10 pr-4 py-2.5 rounded text-xs text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        {/* Photographer Rental Frequency Ranking Table */}
                        <div className="bg-stone-900 border border-white/10 rounded overflow-hidden space-y-3 p-4">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                            Ranking de Frequência de Locação por Fotógrafo:
                          </h6>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs text-zinc-300">
                              <thead className="bg-stone-950 text-zinc-500 text-[9px] uppercase">
                                <tr>
                                  <th className="p-2.5">Fotógrafo / Cliente</th>
                                  <th className="p-2.5">Contato</th>
                                  <th className="p-2.5 text-center">Nº de Locações</th>
                                  <th className="p-2.5 text-right">Total Investido</th>
                                  <th className="p-2.5 text-right">Última Locação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {userFrequencyMap
                                  .filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                                  .map((f, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                      <td className="p-2.5 font-bold text-white">
                                        {f.name}
                                        <span className="block text-[9px] text-zinc-500 font-normal">{f.email}</span>
                                      </td>
                                      <td className="p-2.5 text-zinc-400">{f.phone}</td>
                                      <td className="p-2.5 text-center font-bold text-emerald-400 bg-emerald-950/20 rounded">
                                        {f.count}x
                                      </td>
                                      <td className="p-2.5 text-right font-bold text-brand-red">
                                        R$ {f.totalSpent.toFixed(2)}
                                      </td>
                                      <td className="p-2.5 text-right text-zinc-400">{f.lastDate}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Registered Users List & Role / Block Controls */}
                        <div className="bg-stone-900 border border-white/10 rounded p-4 space-y-3">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                            Controle de Acessos e Status da Conta:
                          </h6>
                          <div className="space-y-2">
                            {usersList.map((u) => (
                              <div key={u.id} className="bg-stone-950 p-3 rounded border border-white/5 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-white block">{u.name || "Fotógrafo"}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block">{u.email} • {u.phone || "Sem tel"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleUserAdmin(u.id, u.role)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer",
                                      u.role === "admin" ? "bg-purple-950 text-purple-400 border-purple-500/30" : "bg-stone-900 text-zinc-400 border-white/10"
                                    )}
                                  >
                                    {u.role === "admin" ? "ADMIN" : "CLIENTE"}
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserBlock(u.id, u.isBlocked)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer",
                                      u.isBlocked ? "bg-red-950 text-red-400 border-red-500/30" : "bg-emerald-950 text-emerald-400 border-emerald-500/30"
                                    )}
                                  >
                                    {u.isBlocked ? "BLOQUEADO" : "ATIVO"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADMIN: HERO BANNER CMS */}
                    {activeTab === "admin-hero" && (
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                        <div>
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Controle Total da Seção Banner Hero</h5>
                          <p className="text-zinc-400 text-xs font-sans mt-1">Altere o título principal, textos em destaque, imagem de fundo e botões da página inicial.</p>
                        </div>

                        {heroSaveSuccess && (
                          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs flex items-center gap-2">
                            <CheckCircle2 size={16} /> {heroSaveSuccess}
                          </div>
                        )}

                        <div className="space-y-4 text-xs">
                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Título Linha 1</label>
                            <input
                              type="text"
                              value={heroSettings.title1}
                              onChange={(e) => setHeroSettings({ ...heroSettings, title1: e.target.value })}
                              className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Título Linha 2 (Destaque Colorido)</label>
                            <input
                              type="text"
                              value={heroSettings.title2}
                              onChange={(e) => setHeroSettings({ ...heroSettings, title2: e.target.value })}
                              className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Selo / Badge de Topo</label>
                            <input
                              type="text"
                              value={heroSettings.badge}
                              onChange={(e) => setHeroSettings({ ...heroSettings, badge: e.target.value })}
                              className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Descrição / Subtítulo Hero</label>
                            <textarea
                              rows={3}
                              value={heroSettings.description}
                              onChange={(e) => setHeroSettings({ ...heroSettings, description: e.target.value })}
                              className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">URL da Imagem de Fundo</label>
                            <input
                              type="text"
                              value={heroSettings.bgImage}
                              onChange={(e) => setHeroSettings({ ...heroSettings, bgImage: e.target.value })}
                              className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Texto Botão Principal</label>
                              <input
                                type="text"
                                value={heroSettings.btnPrimary}
                                onChange={(e) => setHeroSettings({ ...heroSettings, btnPrimary: e.target.value })}
                                className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Texto Botão Secundário</label>
                              <input
                                type="text"
                                value={heroSettings.btnSecondary}
                                onChange={(e) => setHeroSettings({ ...heroSettings, btnSecondary: e.target.value })}
                                className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleSaveHeroSettings}
                            className="bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase px-6 py-3 rounded font-bold transition-all cursor-pointer"
                          >
                            Salvar Alterações do Banner Hero
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ADMIN: NOSSO ESPAÇO CMS */}
                    {activeTab === "admin-spaces" && (
                      <div className="space-y-6">
                        <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-4">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Cadastrar Novo Espaço ou Editar Existente</h5>
                          {spaceSaveMsg && <div className="text-emerald-400 font-mono text-xs">{spaceSaveMsg}</div>}
                          
                          <form onSubmit={handleAddSpace} className="space-y-3 text-xs">
                            <input type="text" required value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} placeholder="Nome do Espaço (ex: Triângulo Estúdio - Prisma)" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <input type="text" value={newSpaceSubtitle} onChange={(e) => setNewSpaceSubtitle(e.target.value)} placeholder="Subtítulo Curto" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <textarea rows={3} value={newSpaceDesc} onChange={(e) => setNewSpaceDesc(e.target.value)} placeholder="Descrição completa da infraestrutura..." className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <div className="grid grid-cols-3 gap-3">
                              <input type="number" value={newSpaceHourly} onChange={(e) => setNewSpaceHourly(Number(e.target.value))} placeholder="Valor/Hora (R$)" className="bg-stone-950 border border-white/10 p-2 rounded text-white" />
                              <input type="number" value={newSpaceHalfDay} onChange={(e) => setNewSpaceHalfDay(Number(e.target.value))} placeholder="Turno 4h (R$)" className="bg-stone-950 border border-white/10 p-2 rounded text-white" />
                              <input type="number" value={newSpaceFullDay} onChange={(e) => setNewSpaceFullDay(Number(e.target.value))} placeholder="Diária 8h (R$)" className="bg-stone-950 border border-white/10 p-2 rounded text-white" />
                            </div>
                            <input type="text" value={newSpaceFeatures} onChange={(e) => setNewSpaceFeatures(e.target.value)} placeholder="Diferenciais separados por vírgula" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <button type="submit" className="bg-brand-red text-white font-mono text-xs uppercase px-5 py-2.5 rounded font-bold">Salvar Espaço</button>
                          </form>
                        </div>

                        {/* List of Spaces */}
                        <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-3">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold">Espaços Cadastrados:</h6>
                          <div className="space-y-2">
                            {spacesList.map((s) => (
                              <div key={s.id} className="bg-stone-950 p-3 rounded border border-white/5 flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-white block">{s.name}</strong>
                                  <span className="text-[10px] text-zinc-500 font-mono block">R$ {s.hourlyRate}/h • Turno: R$ {s.halfDayRate}</span>
                                </div>
                                <button onClick={() => handleDeleteSpace(s.id)} className="text-red-400 hover:text-red-300 p-1">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADMIN: COWOKING PLANS CMS */}
                    {activeTab === "admin-plans" && (
                      <div className="space-y-6">
                        <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-4">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Gestão dos Planos de Coworking</h5>
                          {planSaveMsg && <div className="text-emerald-400 font-mono text-xs">{planSaveMsg}</div>}
                          
                          <form onSubmit={handleAddPlan} className="space-y-3 text-xs">
                            <input type="text" required value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="Nome do Plano (ex: Standard, Master)" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <input type="number" required value={newPlanPrice} onChange={(e) => setNewPlanPrice(Number(e.target.value))} placeholder="Valor Mensal (R$)" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <input type="text" value={newPlanFeatures} onChange={(e) => setNewPlanFeatures(e.target.value)} placeholder="Benefícios inclusos separados por vírgula" className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            <button type="submit" className="bg-brand-red text-white font-mono text-xs uppercase px-5 py-2.5 rounded font-bold">Salvar Plano</button>
                          </form>
                        </div>

                        <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-3">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold">Planos Cadastrados:</h6>
                          <div className="space-y-2">
                            {plansList.map((p) => (
                              <div key={p.id} className="bg-stone-950 p-3 rounded border border-white/5 flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-white block">{p.name}</strong>
                                  <span className="text-[10px] text-zinc-500 font-mono block">R$ {p.price}/mês</span>
                                </div>
                                <button onClick={() => handleDeletePlan(p.id)} className="text-red-400 hover:text-red-300 p-1">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADMIN: SIMULATOR & HARDWARE ASSETS MANAGEMENT */}
                    {activeTab === "admin-simulator" && (
                      <div className="space-y-6">
                        <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-4">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-amber-400 flex items-center gap-2">
                            <Camera size={16} /> Cadastro e Controle de Ativos (Adicionais de Hardware / Equipamentos)
                          </h5>
                          <p className="text-zinc-400 text-xs font-sans">
                            Cadastre tochas, câmeras, lentes e girafas que entram como adicionais no simulador de locação.
                          </p>

                          {assetSaveMsg && <div className="text-emerald-400 font-mono text-xs">{assetSaveMsg}</div>}

                          <form onSubmit={handleAddEquipment} className="space-y-3 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input type="text" required value={newEquipName} onChange={(e) => setNewEquipName(e.target.value)} placeholder="Nome do Ativo (ex: Kit Tocha Godox SK 400)" className="bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                              <select value={newEquipCategory} onChange={(e: any) => setNewEquipCategory(e.target.value)} className="bg-stone-950 border border-white/10 p-2.5 rounded text-white">
                                <option value="lighting">Iluminação & LEDs</option>
                                <option value="camera">Câmeras & Lentes</option>
                                <option value="grip">Maquinaria / Tripés</option>
                                <option value="scenery">Cenário & Mobília</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input type="number" required value={newEquipPrice} onChange={(e) => setNewEquipPrice(Number(e.target.value))} placeholder="Valor do Adicional (R$)" className="bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                              <input type="text" value={newEquipDesc} onChange={(e) => setNewEquipDesc(e.target.value)} placeholder="Descrição resumida do item" className="bg-stone-950 border border-white/10 p-2.5 rounded text-white" />
                            </div>

                            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs uppercase px-5 py-2.5 rounded font-bold cursor-pointer">
                              Cadastrar Novo Ativo no Simulador
                            </button>
                          </form>
                        </div>

                        {/* List of Assets with Availability Toggle */}
                        <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-3">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold">Ativos Disponíveis no Simulador:</h6>
                          <div className="space-y-2">
                            {equipments.map((eq) => (
                              <div key={eq.id} className="bg-stone-950 p-3 rounded border border-white/5 flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-white block">{eq.name}</strong>
                                  <span className="text-[10px] text-zinc-500 font-mono block">R$ {eq.price},00 • Categoria: {eq.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleEquipmentAvailability(eq.id)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer",
                                      eq.isAvailable ? "bg-emerald-950 text-emerald-400 border-emerald-500/30" : "bg-red-950 text-red-400 border-red-500/30"
                                    )}
                                  >
                                    {eq.isAvailable ? "DISPONÍVEL" : "MANUTENÇÃO"}
                                  </button>
                                  <button onClick={() => handleDeleteEquipment(eq.id)} className="text-red-400 p-1">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADMIN: TESTIMONIALS MODERATION */}
                    {activeTab === "admin-testimonials" && (
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-4">
                        <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Moderação dos Depoimentos do Site</h5>
                        <div className="space-y-3">
                          {testimonialsList.map((t) => (
                            <div key={t.id} className="bg-stone-950 p-4 rounded border border-white/5 flex justify-between items-start text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-amber-400">
                                  {[...Array(t.rating || 5)].map((_, i) => <Star key={i} size={12} className="fill-amber-400" />)}
                                </div>
                                <p className="text-zinc-200 italic">"{t.quote}"</p>
                                <span className="text-zinc-500 font-mono text-[10px] block">— {t.name} ({t.role})</span>
                              </div>
                              <button onClick={async () => await deleteDoc(doc(db, "testimonials", t.id))} className="text-red-400 p-1">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ADMIN: CHAT & MESSAGES */}
                    {activeTab === "admin-chat" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[480px]">
                        <div className="bg-stone-900 border border-white/10 p-3 rounded overflow-y-auto space-y-2">
                          <span className="font-mono text-[9px] text-zinc-500 uppercase block mb-2">Clientes e Fotógrafos:</span>
                          {adminMessagesUsers.map((u) => (
                            <button
                              key={u.uid}
                              onClick={() => { setAdminSelectedUserId(u.uid); setAdminSelectedUserName(u.name || u.email); }}
                              className={cn(
                                "w-full p-2.5 rounded text-left transition-all cursor-pointer block border",
                                adminSelectedUserId === u.uid ? "bg-brand-red text-white border-brand-red" : "bg-stone-950 text-zinc-300 border-white/5 hover:border-white/20"
                              )}
                            >
                              <span className="font-bold text-xs block">{u.name || "Fotógrafo"}</span>
                              <span className="text-[9px] opacity-70 font-mono block">{u.email}</span>
                            </button>
                          ))}
                        </div>

                        <div className="md:col-span-2 bg-stone-900 border border-white/10 p-4 rounded flex flex-col">
                          {adminSelectedUserId ? (
                            <>
                              <h6 className="font-bold text-xs text-white border-b border-white/5 pb-2 mb-3">Conversa com {adminSelectedUserName}</h6>
                              <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-stone-950 rounded border border-white/5">
                                {adminChatMessages.map((m) => (
                                  <div key={m.id} className={cn("max-w-[80%] p-3 rounded text-xs leading-relaxed", m.senderId === "admin" ? "bg-brand-red text-white ml-auto" : "bg-stone-800 text-zinc-200")}>
                                    <p>{m.text}</p>
                                    <span className="text-[8px] opacity-60 font-mono block text-right mt-1">{new Date(m.createdAt).toLocaleTimeString("pt-BR")}</span>
                                  </div>
                                ))}
                                <div ref={adminChatEndRef} />
                              </div>
                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!adminNewMsg.trim()) return;
                                await addDoc(collection(db, "messages"), cleanFirestoreData({
                                  id: "msg-" + Date.now(),
                                  senderId: "admin",
                                  senderName: "Atendimento Triângulo",
                                  recipientId: adminSelectedUserId,
                                  text: adminNewMsg,
                                  createdAt: new Date().toISOString()
                                }));
                                setAdminNewMsg("");
                              }} className="flex gap-2 mt-3">
                                <input type="text" value={adminNewMsg} onChange={(e) => setAdminNewMsg(e.target.value)} placeholder="Responder ao cliente..." className="flex-1 bg-stone-950 border border-white/10 px-3 py-2 rounded text-xs text-white" />
                                <button type="submit" className="bg-brand-red text-white font-mono text-xs px-4 rounded font-bold">Enviar</button>
                              </form>
                            </>
                          ) : (
                            <div className="my-auto text-center text-zinc-600 font-mono text-xs">Selecione um cliente ao lado para iniciar o atendimento.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ADMIN: AUDIT LOGS & WEB VITALS TELEMETRY */}
                    {activeTab === "admin-logs" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-red-400 flex items-center gap-2">
                            <ShieldAlert size={16} /> Logs de Segurança, Auditoria e Web Vitals
                          </h5>
                          <button
                            onClick={triggerManualBackup}
                            disabled={backupLoading}
                            className="bg-stone-900 border border-white/10 hover:border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Download size={13} /> {backupLoading ? "Exportando..." : "Exportar Backup JSON"}
                          </button>
                        </div>

                        {backupMsg && <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 p-2.5 rounded border border-emerald-500/20">{backupMsg}</div>}

                        <div className="flex bg-stone-900 p-1 rounded border border-white/5 text-[10px] font-mono uppercase">
                          {(["security", "activity", "behavior", "vitals"] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setAdminLogsSubTab(st)}
                              className={cn(
                                "flex-1 py-1.5 rounded text-center font-bold transition-all cursor-pointer",
                                adminLogsSubTab === st ? "bg-brand-red text-white" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              {st === "security" ? "Segurança" : st === "activity" ? "Atividades" : st === "behavior" ? "Cliques" : "Web Vitals"}
                            </button>
                          ))}
                        </div>

                        <div className="bg-stone-900 border border-white/10 p-4 rounded max-h-96 overflow-y-auto space-y-2">
                          {adminLogsSubTab === "security" && securityLogs.map((log, idx) => (
                            <div key={log.id || idx} className="bg-stone-950 p-2.5 rounded border border-white/5 text-xs font-mono flex justify-between items-start">
                              <div>
                                <strong className="text-red-400 uppercase font-bold block">{log.eventType} [{log.severity}]</strong>
                                <p className="text-zinc-300 mt-0.5">{log.details}</p>
                              </div>
                              <span className="text-[9px] text-zinc-500">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</span>
                            </div>
                          ))}

                          {adminLogsSubTab === "activity" && activityLogs.map((log, idx) => (
                            <div key={log.id || idx} className="bg-stone-950 p-2.5 rounded border border-white/5 text-xs font-mono flex justify-between items-start">
                              <div>
                                <strong className="text-emerald-400 uppercase font-bold block">{log.actionType}</strong>
                                <p className="text-zinc-300 mt-0.5">{log.details}</p>
                              </div>
                              <span className="text-[9px] text-zinc-500">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</span>
                            </div>
                          ))}

                          {adminLogsSubTab === "vitals" && vitalsLogs.map((log, idx) => (
                            <div key={log.id || idx} className="bg-stone-950 p-2.5 rounded border border-white/5 text-xs font-mono flex justify-between items-center">
                              <div>
                                <span className="text-white font-bold">{log.metricName}: </span>
                                <strong className="text-emerald-400">{log.value}{log.unit}</strong>
                              </div>
                              <span className="text-[9px] text-zinc-500">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
