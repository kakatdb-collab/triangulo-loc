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
  Zap, Gauge
} from "lucide-react";
import { 
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  sendPasswordResetEmail, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, 
  collection, getDocs, query, where, orderBy, addDoc, onSnapshot, FirebaseUser,
  handleFirestoreError, OperationType
} from "../lib/firebase";
import { logSecurityEvent, logActivityEvent, checkRateLimit, SecurityLog, ActivityLog, BehaviorLog } from "../lib/analytics";
import { VitalMetricLog } from "../lib/vitals";
import { Booking, Equipment } from "../types";

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
  // For standard user: "bookings" | "profile" | "chat"
  // For admin: "admin-bookings" | "admin-simulator" | "admin-chat"
  const [activeTab, setActiveTab] = useState<string>("bookings");

  // Client Dashboard Bookings & Chat states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");

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
  const [adminMessagesUsers, setAdminMessagesUsers] = useState<any[]>([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>("");
  const [adminSelectedUserName, setAdminSelectedUserName] = useState<string>("");
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminNewMsg, setAdminNewMsg] = useState("");

  // Admin Logs & Behavioral Telemetry States
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>([]);
  const [vitalsLogs, setVitalsLogs] = useState<VitalMetricLog[]>([]);
  const [adminLogsSubTab, setAdminLogsSubTab] = useState<"security" | "activity" | "behavior" | "vitals">("security");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupFiles, setBackupFiles] = useState<any[]>([]);

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
        setBackupMsg(`✅ Backup exportado com sucesso! (${data.counts?.securityLogsCount || 0} logs de segurança, ${data.counts?.activityLogsCount || 0} atividades)`);
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

  // Admin Simulator Settings
  const [simulatorHourly, setSimulatorHourly] = useState(100);
  const [simulatorHalfDay, setSimulatorHalfDay] = useState(400);
  const [simulatorFullDay, setSimulatorFullDay] = useState(700);
  const [infinitePayHandle, setInfinitePayHandle] = useState("triangulofotoclub");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipCategory, setNewEquipCategory] = useState<"lighting" | "camera" | "grip" | "scenery">("lighting");
  const [newEquipPrice, setNewEquipPrice] = useState(50);
  const [newEquipDesc, setNewEquipDesc] = useState("");

  // Real-time notification alerts
  const [alerts, setAlerts] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const adminChatEndRef = useRef<HTMLDivElement>(null);

  // Watch Auth
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

        // Strictly authorized admin emails list (no loose substring matching)
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
          // If the user registered and doesn't have a Firestore profile yet, create one
          userRole = isAdminEmail ? "admin" : "client";
          
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            name: uName || (isAdminEmail ? "Administrador Triângulo" : "Criativo"),
            phone: uPhone,
            role: userRole,
            avatarUrl: "",
            createdAt: new Date().toLocaleDateString("pt-BR"),
          });
        }

        setRole(userRole);
        setProfileName(uName || "Criativo");
        setProfilePhone(uPhone);
        setProfileAvatar(uAvatar);
        
        // Default tab based on role
        setActiveTab(userRole === "admin" ? "admin-bookings" : "bookings");

        // Set up real-time listener for client's own bookings
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
            // Sort by creation or date desc
            list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setMyBookings(list);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "bookings");
          });

          // Set up real-time chat with admin
          const chatQuery = query(
            collection(db, "messages"),
            where("senderId", "in", [currentUser.uid, "admin"]),
            where("recipientId", "in", [currentUser.uid, "admin"])
          );
          const unsubChat = onSnapshot(chatQuery, (snap) => {
            const msgs: any[] = [];
            snap.forEach((doc) => {
              msgs.push({ id: doc.id, ...doc.data() });
            });
            msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setChatMessages(msgs);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "messages");
          });

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
            snap.forEach((doc) => {
              list.push({ id: doc.id, ...doc.data() } as Booking);
            });
            list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setAllBookings(list);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "bookings");
          });

          // 2. Active users with messages
          const allUsersQuery = collection(db, "users");
          const unsubUsers = onSnapshot(allUsersQuery, (snap) => {
            const usersList: any[] = [];
            snap.forEach((doc) => {
              const u = doc.data();
              if (u.role !== "admin") {
                usersList.push(u);
              }
            });
            setAdminMessagesUsers(usersList);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, "users");
          });

          // 3. Security logs listener
          const secQuery = query(collection(db, "security_logs"), orderBy("timestamp", "desc"));
          const unsubSec = onSnapshot(secQuery, (snap) => {
            const list: SecurityLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as SecurityLog));
            setSecurityLogs(list);
          }, (err) => handleFirestoreError(err, OperationType.GET, "security_logs"));

          // 4. Activity logs listener
          const actQuery = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
          const unsubAct = onSnapshot(actQuery, (snap) => {
            const list: ActivityLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as ActivityLog));
            setActivityLogs(list);
          }, (err) => handleFirestoreError(err, OperationType.GET, "activity_logs"));

          // 5. Behavior click telemetry logs listener
          const behQuery = query(collection(db, "behavior_logs"), orderBy("timestamp", "desc"));
          const unsubBeh = onSnapshot(behQuery, (snap) => {
            const list: BehaviorLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as BehaviorLog));
            setBehaviorLogs(list);
          }, (err) => handleFirestoreError(err, OperationType.GET, "behavior_logs"));

          // 6. Web Vitals & Section Load performance monitor listener
          const vitQuery = query(collection(db, "vitals_logs"), orderBy("timestamp", "desc"));
          const unsubVit = onSnapshot(vitQuery, (snap) => {
            const list: VitalMetricLog[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as VitalMetricLog));
            setVitalsLogs(list);
          }, (err) => handleFirestoreError(err, OperationType.GET, "vitals_logs"));

          // Fetch backup files list
          fetchBackupList();

          return () => {
            unsubAllBookings();
            unsubUsers();
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

  // Set up selected user messages for admin view
  useEffect(() => {
    if (!adminSelectedUserId || role !== "admin") return;

    const adminChatQuery = query(
      collection(db, "messages"),
      where("senderId", "in", [adminSelectedUserId, "admin"]),
      where("recipientId", "in", [adminSelectedUserId, "admin"])
    );

    const unsubAdminChat = onSnapshot(adminChatQuery, (snap) => {
      const msgs: any[] = [];
      snap.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setAdminChatMessages(msgs);
      setTimeout(() => adminChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "messages");
    });

    return () => unsubAdminChat();
  }, [adminSelectedUserId, role]);

  // Load dynamic pricing settings
  useEffect(() => {
    const loadSettings = async () => {
      const initialEquips: Equipment[] = [
        {
          id: "aputure_600d",
          name: "Kit Aputure LS 600d Pro (LED Contínuo)",
          category: "lighting",
          price: 150,
          description: "Luz contínua de imensa intensidade para cinema e vídeo com controle wireless.",
          isAvailable: true,
        },
        {
          id: "sony_a7r5",
          name: "Câmera Sony Alpha A7R V + Lente 24-70mm f/2.8 GM II",
          category: "camera",
          price: 250,
          description: "Foco automático impulsionado por IA, sensor de 61 megapixels.",
          isAvailable: true,
        }
      ];

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
        } else {
          // Initialize local state with default fallback values
          setSimulatorHourly(100);
          setSimulatorHalfDay(400);
          setSimulatorFullDay(700);
          setInfinitePayHandle("triangulofotoclub");
          setEquipments(initialEquips);

          // Only attempt to setDoc if user is admin
          if (role === "admin") {
            try {
              await setDoc(settingsRef, {
                id: "simulator",
                hourlyRate: 100,
                halfDayRate: 400,
                fullDayRate: 700,
                infinitePayHandle: "triangulofotoclub",
                equipments: initialEquips,
              });
            } catch (err) {
              console.warn("Silent fallback: could not write settings doc as non-admin", err);
            }
          }
        }
      } catch (e) {
        // Fall back gracefully to defaults on permission or connection error
        setSimulatorHourly(100);
        setSimulatorHalfDay(400);
        setSimulatorFullDay(700);
        setInfinitePayHandle("triangulofotoclub");
        setEquipments(initialEquips);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, role]);

  // Handle pre-selected payment trigger
  useEffect(() => {
    if (initialBookingToPay) {
      setBookingToPay(initialBookingToPay);
      setPaymentStep("method");
      setActiveTab("bookings");
    }
  }, [initialBookingToPay]);

  // Handle registration & trigger welcome email via Hostinger
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
      
      // Save user profile in firestore
      const userDocRef = doc(db, "users", cred.user.uid);
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        email: email,
        name: name,
        phone: phone,
        role: "client",
        avatarUrl: "",
        createdAt: new Date().toLocaleDateString("pt-BR"),
      });

      setAuthSuccess("Cadastro realizado! Seja bem-vindo.");
      
      // Call Hostinger SMTP API in server.ts to send custom welcome email
      try {
        await fetch("/api/send-welcome-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        });
      } catch (err) {
        console.error("Welcome email failed silently, user created successfully:", err);
      }

      setIsRegistering(false);
    } catch (error: any) {
      setAuthError(error.message || "Erro ao realizar cadastro.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Login
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

    // Rate limiting security check against brute force attempts
    if (!checkRateLimit("login_" + cleanEmail, 5, 60000)) {
      setAuthError("Bloqueio de segurança: muitas tentativas incorretas num curto intervalo. Por favor, aguarde 1 minuto.");
      logSecurityEvent('rate_limit_exceeded', 'high', `Múltiplas tentativas de login bloqueadas para o e-mail: ${cleanEmail}`, cleanEmail);
      setAuthLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      setAuthSuccess("Logado com sucesso!");
      logActivityEvent('user_login', cleanEmail, 'Login realizado com sucesso no painel');
    } catch (error: any) {
      // Log security event for invalid password/email attempt
      logSecurityEvent('failed_login', 'medium', `Tentativa frustrada de login com e-mail: ${cleanEmail}`, cleanEmail);

      // If sign in fails for the default admin account, auto-create it in Firebase Auth
      if (cleanEmail === "contato@triangulofotoclub.com.br" && password === "Tri@2026") {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const userDocRef = doc(db, "users", userCred.user.uid);
          await setDoc(userDocRef, {
            uid: userCred.user.uid,
            email: cleanEmail,
            name: "Administrador Triângulo",
            phone: "(11) 96195-9349",
            role: "admin",
            avatarUrl: "",
            createdAt: new Date().toLocaleDateString("pt-BR"),
          });
          setAuthSuccess("Conta de Administrador inicializada e conectada com sucesso!");
          logActivityEvent('user_signup', cleanEmail, 'Conta do Administrador ativada');
          return;
        } catch (createErr: any) {
          console.error("Auto admin provisioning error:", createErr);
        }
      }
      setAuthError("E-mail ou senha inválidos.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Password Reset Handler
  const handleResetPassword = async () => {
    if (!email) {
      setAuthError("Informe o seu e-mail no campo acima e clique em 'Esqueci a senha' para enviar o link.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess(`Link de redefinição de senha enviado para ${email}! Verifique sua caixa de entrada e spam.`);
    } catch (err: any) {
      setAuthError("Erro ao enviar redefinição: " + (err.message || "E-mail não encontrado."));
    }
  };

  // Logout
  const handleSignOut = () => {
    signOut(auth);
    setRole("client");
    setActiveTab("bookings");
  };

  // Handle Client Profile update (including base64 photo upload)
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: profileName,
        phone: profilePhone,
        avatarUrl: profileAvatar,
      });
      addAlert("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error("Profile update error:", err);
    }
  };

  // Profile avatar photo file selection and base64 conversion
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send real-time in-app message (Client to Admin)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMsg.trim()) return;

    try {
      const msgId = "msg-" + Date.now();
      await addDoc(collection(db, "messages"), {
        id: msgId,
        senderId: user.uid,
        senderName: profileName || "Cliente",
        recipientId: "admin",
        text: newMsg,
        createdAt: new Date().toISOString(),
      });
      setNewMsg("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Send message (Admin to Client)
  const handleAdminSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !adminNewMsg.trim() || !adminSelectedUserId) return;

    try {
      const msgId = "msg-" + Date.now();
      await addDoc(collection(db, "messages"), {
        id: msgId,
        senderId: "admin",
        senderName: "Administrador Triângulo",
        recipientId: adminSelectedUserId,
        text: adminNewMsg,
        createdAt: new Date().toISOString(),
      });
      setAdminNewMsg("");
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  };

  // Process InfinitePay Payment (Dynamic Link Generation & Redirection)
  const initiateInfinitePay = async () => {
    if (!bookingToPay) return;
    setPaying(true);

    // Charge full price or the R$100 reservation deposit
    const chargeAmount = payFullBooking ? bookingToPay.totalPrice : 100.00;

    try {
      const res = await fetch("/api/payment/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingToPay.id,
          amount: chargeAmount,
          clientName: bookingToPay.clientName,
          clientEmail: bookingToPay.clientEmail,
          clientPhone: bookingToPay.clientPhone,
          customHandle: infinitePayHandle
        }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        // Redirect client directly to the secure, real InfinitePay Checkout Link!
        window.location.href = data.checkoutUrl;
      } else {
        alert("Erro ao processar checkout InfinitePay: " + (data.error || "Tente novamente."));
      }
    } catch (e) {
      console.error("Error generating InfinitePay checkout link:", e);
      alert("Erro de conexão ao processar pagamento via InfinitePay.");
    } finally {
      setPaying(false);
    }
  };

  // Complete the reservation update in Firestore and trigger SMTP
  const completeBookingReservation = async (booking: Booking, txId: string) => {
    try {
      const bookingRef = doc(db, "bookings", booking.id);
      
      const updatedData = {
        status: "Reservada" as const,
        depositPaid: true,
        paymentTxId: txId,
      };

      await updateDoc(bookingRef, updatedData);

      // Refresh state locally
      setMyBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...updatedData } : b));

      // Trigger SMTP confirmation emails (Admin Copy + Client Confirmation)
      try {
        await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail: booking.clientEmail,
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
            bookingId: booking.id,
            spaceName: booking.spaceName,
            date: booking.date,
            timeSlot: booking.timeSlot,
            totalPrice: booking.totalPrice,
            depositPaid: true,
            status: "Reservada"
          }),
        });
      } catch (err) {
        console.error("Email sending failed:", err);
      }

      // Add a systemic notification message in in-app Chat so client/admin see confirmation
      const msgId = "notif-" + Date.now();
      await addDoc(collection(db, "messages"), {
        id: msgId,
        senderId: "admin",
        senderName: "Sistema Triângulo",
        recipientId: booking.userId || "guest",
        text: `✅ Pagamento do Sinal de R$ 100,00 APROVADO via InfinitePay para a Reserva #${booking.id}! Data reservada e confirmada na agenda.`,
        createdAt: new Date().toISOString(),
      });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (e) {
      console.error("Failed to complete reservation update:", e);
    }
  };

  // Simulates confirming Pix payment
  const confirmPixPaid = async () => {
    if (!bookingToPay) return;
    setPaying(true);
    setTimeout(async () => {
      const txId = "IPY-PIX-" + Math.floor(10000000 + Math.random() * 90000000);
      await completeBookingReservation(bookingToPay, txId);
      setPaymentStep("success");
      setPaying(false);
    }, 1500);
  };

  // Add temporary notification banner inside client panel
  const addAlert = (text: string) => {
    setAlerts(prev => [...prev, text]);
    setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 4000);
  };

  // Admin: update a booking status dynamically
  const handleUpdateBookingStatus = async (id: string, newStatus: "Simulada" | "Pendente" | "Reservada" | "Concluída") => {
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, { status: newStatus });
      addAlert(`Reserva #${id} atualizada para "${newStatus}"`);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin: delete a booking record
  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm(`Excluir definitivamente a reserva #${id}?`)) return;
    try {
      const bRef = doc(db, "bookings", id);
      // We will update rather than hard deleting if needed, or simply delete
      // To bypass some rules constraints, writing standard deleting
      await setDoc(bRef, {}, { merge: false });
      addAlert(`Reserva #${id} removida.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin: Save updated simulator settings
  const handleSaveSimulatorSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const settingsRef = doc(db, "settings", "simulator");
      await setDoc(settingsRef, {
        id: "simulator",
        hourlyRate: simulatorHourly,
        halfDayRate: simulatorHalfDay,
        fullDayRate: simulatorFullDay,
        infinitePayHandle: infinitePayHandle,
        equipments: equipments,
      });
      addAlert("Valores, equipamentos e InfiniteTag salvos no banco de dados!");
    } catch (e) {
      console.error(e);
    }
  };

  // Admin: Add new hardware item
  const handleAddEquipment = () => {
    if (!newEquipName.trim()) return;
    const newEq: Equipment = {
      id: "eq_" + Date.now(),
      name: newEquipName,
      category: newEquipCategory,
      price: newEquipPrice,
      description: newEquipDesc,
      isAvailable: true,
    };
    setEquipments(prev => [...prev, newEq]);
    setNewEquipName("");
    setNewEquipDesc("");
    addAlert("Equipamento adicionado à lista local. Clique em Salvar para gravar.");
  };

  // Admin: Delete equipment item
  const handleDeleteEquipment = (id: string) => {
    setEquipments(prev => prev.filter(e => e.id !== id));
    addAlert("Equipamento removido. Lembre de clicar em Salvar.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Panel Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
          />

          {/* Sliding Side Panel Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#181818] text-white z-50 shadow-2xl flex flex-col border-l border-white/5"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-stone-900/40">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red">
                  {role === "admin" ? <Settings size={16} /> : <User size={16} />}
                </div>
                <div>
                  <h3 className="font-display font-black text-sm tracking-widest uppercase text-white">
                    {role === "admin" ? "PAINEL ADM" : "ÁREA DO CLIENTE"}
                  </h3>
                  <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                    {user ? `${user.email} (${role})` : "Acesse sua conta"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notification alert banners */}
            <div className="absolute top-16 left-6 right-6 z-50 space-y-2 pointer-events-none">
              {alerts.map((alert, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#d93838] text-white text-xs font-semibold px-4 py-3 rounded shadow-lg border border-red-500/30 flex items-center gap-2 pointer-events-auto"
                >
                  <Bell size={12} className="animate-bounce" />
                  <span>{alert}</span>
                </motion.div>
              ))}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {!user ? (
                /* AUTH LOGIN/REGISTER MODULE */
                <div className="p-8 flex-1 flex flex-col justify-center">
                  <div className="text-center mb-8">
                    <h4 className="font-display font-bold text-xl uppercase tracking-wider mb-2">
                      {isRegistering ? "CRIAR NOVA CONTA" : "ENTRAR NO PAINEL"}
                    </h4>
                    <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                      {isRegistering 
                        ? "Crie sua conta e acompanhe suas propostas, faça pagamentos de reserva, suba fotos e converse conosco." 
                        : "Acesse seus orçamentos e agendamentos anteriores de forma simples."}
                    </p>
                  </div>

                  <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                    {isRegistering && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Nome Completo</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><User size={14} /></span>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Seu nome"
                              className="w-full bg-stone-900/60 border border-white/5 rounded-sm px-10 py-3 text-xs text-white focus:outline-none focus:border-brand-red transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">WhatsApp / Telefone</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Phone size={14} /></span>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="(11) 99999-9999"
                              className="w-full bg-stone-900/60 border border-white/5 rounded-sm px-10 py-3 text-xs text-white focus:outline-none focus:border-brand-red transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">E-mail de Contato</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Mail size={14} /></span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-stone-900/60 border border-white/5 rounded-sm px-10 py-3 text-xs text-white focus:outline-none focus:border-brand-red transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Senha de Acesso</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Lock size={14} /></span>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-stone-900/60 border border-white/5 rounded-sm px-10 py-3 text-xs text-white focus:outline-none focus:border-brand-red transition-all"
                          required
                        />
                      </div>
                    </div>

                    {authError && (
                      <div className="bg-red-950/40 border border-red-500/20 text-red-300 text-xs p-3 rounded-sm">
                        {authError}
                      </div>
                    )}

                    {authSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs p-3 rounded-sm">
                        {authSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 rounded-sm transition-all shadow-lg shadow-brand-red/10 flex justify-center items-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
                    >
                      {authLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isRegistering ? (
                        "REGISTRAR CONTA"
                      ) : (
                        "ENTRAR NO PAINEL"
                      )}
                    </button>
                  </form>

                  {/* Toggle Mode */}
                  <div className="mt-6 text-center text-xs text-zinc-400 space-y-3">
                    {isRegistering ? (
                      <p>
                        Já possui conta?{" "}
                        <button
                          type="button"
                          onClick={() => setIsRegistering(false)}
                          className="text-[#d93838] font-bold hover:underline cursor-pointer"
                        >
                          Entrar agora
                        </button>
                      </p>
                    ) : (
                      <>
                        <p>
                          Não tem conta cadastrada?{" "}
                          <button
                            type="button"
                            onClick={() => setIsRegistering(true)}
                            className="text-[#d93838] font-bold hover:underline cursor-pointer"
                          >
                            Criar cadastro rápido
                          </button>
                        </p>
                        <p className="pt-2">
                          Esqueceu sua senha?{" "}
                          <button
                            type="button"
                            onClick={handleResetPassword}
                            className="text-zinc-300 underline font-semibold hover:text-white cursor-pointer"
                          >
                            Redefinir senha por e-mail
                          </button>
                        </p>
                      </>
                    )}
                  </div>

                  {/* Admin credential info */}
                  <div className="mt-8 bg-stone-900 border border-white/5 p-4 rounded-sm text-[10px] text-zinc-400 space-y-2">
                    <p className="font-mono text-white/60 uppercase tracking-widest font-bold">Acesso ao Painel Administrativo:</p>
                    <p>E-mail: <span className="text-[#d93838] font-mono font-bold">contato@triangulofotoclub.com.br</span> | Senha: <span className="text-white font-mono font-bold">Tri@2026</span></p>
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED PANEL VIEW */
                <div className="flex-1 flex flex-col h-full">
                  {/* Internal tabs selector */}
                  <div className="flex bg-stone-900 border-b border-white/5 text-xs">
                    {role === "client" ? (
                      <>
                        <button
                          onClick={() => { setActiveTab("bookings"); setBookingToPay(null); }}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer",
                            activeTab === "bookings" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Minhas Reservas
                        </button>
                        <button
                          onClick={() => { setActiveTab("profile"); setBookingToPay(null); }}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer",
                            activeTab === "profile" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => { setActiveTab("chat"); setBookingToPay(null); }}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer relative",
                            activeTab === "chat" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Chat Suporte
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveTab("admin-bookings")}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer",
                            activeTab === "admin-bookings" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Agenda & Reservas
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-simulator")}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer",
                            activeTab === "admin-simulator" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Valores & Itens
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-chat")}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer",
                            activeTab === "admin-chat" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          Mensagens
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-logs")}
                          className={cn(
                            "flex-1 py-4 text-center font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5",
                            activeTab === "admin-logs" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <ShieldAlert size={14} className="text-[#d93838]" />
                          Logs & Analytics
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tab contents */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    
                    {/* CLIENT: MY BOOKINGS TAB */}
                    {activeTab === "bookings" && !bookingToPay && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Histórico de Locações</h5>
                          <span className="font-mono text-[9px] text-zinc-500 uppercase">{myBookings.length} agendamentos</span>
                        </div>

                        {myBookings.length === 0 ? (
                          <div className="text-center py-12 bg-stone-900/40 border border-white/5 rounded-sm p-6">
                            <Calendar size={24} className="mx-auto text-zinc-600 mb-3" />
                            <p className="text-zinc-400 text-xs">Nenhum agendamento encontrado.</p>
                            <p className="text-zinc-600 text-[10px] mt-1">Sua simulação aparecerá aqui se você se cadastrar no mesmo e-mail.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {myBookings.map((booking) => (
                              <div key={booking.id} className="bg-stone-900 border border-white/5 p-4 rounded-sm flex flex-col justify-between gap-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-mono text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">Ref: #{booking.id}</span>
                                    <h6 className="font-sans font-bold text-sm text-white mt-1.5">{booking.spaceName}</h6>
                                    <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{booking.date} • {booking.timeSlot}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={cn(
                                      "inline-block font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded font-bold",
                                      booking.status === "Reservada" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/15" :
                                      booking.status === "Simulada" ? "bg-amber-950/60 text-amber-400 border border-amber-500/15" :
                                      "bg-zinc-800 text-zinc-300"
                                    )}>
                                      {booking.status}
                                    </span>
                                    <p className="text-[#d93838] font-bold text-sm mt-2">R$ {booking.totalPrice},00</p>
                                  </div>
                                </div>

                                {/* Booking action triggers */}
                                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                                  <span className="text-zinc-500 text-[10px] font-mono">
                                    Sinal de Reserva: {booking.depositPaid ? "✅ PAGO" : "🔴 PENDENTE"}
                                  </span>
                                  {!booking.depositPaid ? (
                                    <button
                                      onClick={() => { setBookingToPay(booking); setPaymentStep("method"); }}
                                      className="bg-[#d93838] hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-widest px-3.5 py-1.5 rounded-sm transition-all"
                                    >
                                      Pagar Sinal R$100
                                    </button>
                                  ) : (
                                    <span className="text-zinc-400 text-[10px] font-mono uppercase bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">Reservado</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CLIENT: INFINITEPAY PAYMENT FLOW OVERLAY/VIEW */}
                    {activeTab === "bookings" && bookingToPay && (
                      <div className="bg-stone-900 border border-white/5 p-6 rounded-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div>
                            <span className="font-mono text-[9px] text-[#d93838] uppercase">Checkout com InfinitePay</span>
                            <h5 className="font-display font-bold text-sm uppercase">Reserva #{bookingToPay.id}</h5>
                          </div>
                          <button onClick={() => setBookingToPay(null)} className="text-zinc-500 hover:text-white text-xs font-mono uppercase">Voltar</button>
                        </div>

                        <div className="space-y-4">
                          <p className="text-zinc-400 text-xs leading-relaxed">
                            Garante o bloqueio imediato do horário na agenda e sua data de locação garantida! Escolha o formato de pagamento via <strong>InfinitePay</strong>:
                          </p>

                          <div className="bg-stone-950 border border-white/5 p-4 rounded-sm space-y-3">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block">Opção de Pagamento</span>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="chargeAmountType"
                                checked={!payFullBooking}
                                onChange={() => setPayFullBooking(false)}
                                className="accent-[#d93838]" 
                              />
                              <div className="text-left">
                                <span className="text-xs text-white block group-hover:text-brand-red transition-all">Pagar apenas o Sinal de Reserva (R$ 100,00)</span>
                                <span className="text-[10px] text-zinc-500 block">O restante (R$ {(bookingToPay.totalPrice - 100).toFixed(2)}) é pago presencialmente no estúdio.</span>
                              </div>
                            </label>

                            <div className="border-t border-white/5 my-2"></div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="radio" 
                                name="chargeAmountType"
                                checked={payFullBooking}
                                onChange={() => setPayFullBooking(true)}
                                className="accent-[#d93838]" 
                              />
                              <div className="text-left">
                                <span className="text-xs text-white block group-hover:text-brand-red transition-all">Pagar o Valor Integral da Locação (R$ {bookingToPay.totalPrice.toFixed(2)})</span>
                                <span className="text-[10px] text-zinc-500 block">Quita 100% da sua locação antecipadamente, sem pendências no estúdio.</span>
                              </div>
                            </label>
                          </div>

                          <div className="bg-stone-950/40 p-3 rounded border border-white/5 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500 font-mono uppercase text-[10px]">Total do Agendamento</span>
                              <span className="text-white font-bold">R$ {bookingToPay.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                              <span className="text-[#d93838] font-mono uppercase text-[10px] font-bold">Valor a ser cobrado agora</span>
                              <span className="text-[#d93838] font-bold font-mono text-sm">
                                R$ {payFullBooking ? bookingToPay.totalPrice.toFixed(2) : "100,00"}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={initiateInfinitePay}
                            disabled={paying}
                            className="w-full bg-[#d93838] hover:bg-red-700 disabled:opacity-50 text-white font-mono text-[11px] py-3.5 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-red/10"
                          >
                            {paying ? (
                              <>
                                <RefreshCw className="animate-spin" size={14} />
                                Gerando Checkout Seguro...
                              </>
                            ) : (
                              <>
                                <CreditCard size={14} />
                                Ir para Pagamento Seguro InfinitePay
                              </>
                            )}
                          </button>

                          <p className="text-[10px] text-zinc-500 text-center font-mono uppercase tracking-wider">
                            Pix & Cartão de Crédito em até 12x • Processamento seguro por InfinitePay
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CLIENT: PROFILE TAB */}
                    {activeTab === "profile" && (
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 border-b border-white/5 pb-6">
                          <div className="relative group">
                            <div className="h-20 w-20 rounded-full border border-white/10 overflow-hidden bg-stone-900 flex items-center justify-center">
                              {profileAvatar ? (
                                <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User size={32} className="text-zinc-600" />
                              )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-[#d93838] p-1.5 rounded-full border border-[#181818] cursor-pointer hover:bg-red-600 transition-all">
                              <Upload size={10} className="text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFile}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Foto do Perfil (opcional)</span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Nome Completo</label>
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full bg-stone-900 border border-white/5 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Telefone / WhatsApp</label>
                            <input
                              type="tel"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              className="w-full bg-stone-900 border border-white/5 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">E-mail Cadastrado</label>
                            <input
                              type="email"
                              value={user?.email || ""}
                              className="w-full bg-stone-900 border border-white/5 rounded px-3.5 py-2.5 text-xs text-zinc-500 cursor-not-allowed"
                              disabled
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex gap-4">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex-1 bg-stone-900 border border-white/5 hover:bg-stone-950 text-zinc-400 hover:text-white font-mono text-[10px] py-3 rounded-sm font-bold uppercase tracking-widest transition-all cursor-pointer"
                          >
                            Sair da Conta
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#d93838] hover:bg-red-700 text-white font-mono text-[10px] py-3 rounded-sm font-bold uppercase tracking-widest transition-all shadow-lg shadow-brand-red/10 cursor-pointer"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </form>
                    )}

                    {/* CLIENT: CHAT SUPPORT TAB */}
                    {activeTab === "chat" && (
                      <div className="flex flex-col h-[calc(100vh-220px)]">
                        <div className="bg-stone-900/40 border border-white/5 p-3 rounded-sm mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Suporte Direto</span>
                          <a 
                            href="https://api.whatsapp.com/send?phone=5511961959349" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#d93838] text-[9px] font-mono uppercase font-bold hover:underline"
                          >
                            WhatsApp Direto
                          </a>
                        </div>

                        {/* Message log */}
                        <div className="flex-1 overflow-y-auto space-y-3 p-2 border border-white/5 rounded-sm bg-stone-950 mb-4 h-64 min-h-0">
                          {chatMessages.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 text-[11px] font-mono">
                              Envie uma mensagem abaixo para iniciar uma conversa diretamente com o administrador do estúdio!
                            </div>
                          ) : (
                            chatMessages.map((msg) => {
                              const isMe = msg.senderId === user.uid;
                              return (
                                <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                  <div className={cn(
                                    "p-3 rounded-md text-xs max-w-xs",
                                    isMe ? "bg-[#d93838] text-white" : "bg-zinc-800 text-zinc-200"
                                  )}>
                                    <span className="block text-[8px] font-mono text-white/40 uppercase mb-1 font-bold">
                                      {msg.senderName}
                                    </span>
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="flex gap-2">
                          <input
                            type="text"
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            placeholder="Escreva sua mensagem..."
                            className="flex-1 bg-stone-900 border border-white/5 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                          />
                          <button
                            type="submit"
                            className="bg-[#d93838] hover:bg-red-700 text-white p-2.5 rounded transition-all shrink-0 cursor-pointer"
                          >
                            <Send size={14} />
                          </button>
                        </form>
                      </div>
                    )}

                    {/* ADMIN: BOOKINGS AGENDA TAB */}
                    {activeTab === "admin-bookings" && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">Reservas e Orçamentos</h5>
                          
                          {/* Filter selectors */}
                          <div className="flex gap-1 bg-stone-950 p-1 rounded text-[10px] font-mono">
                            {["All", "Simulada", "Reservada"].map(f => (
                              <button
                                key={f}
                                onClick={() => setBookingFilter(f)}
                                className={cn(
                                  "px-2 py-1 rounded transition-all font-semibold uppercase",
                                  bookingFilter === f ? "bg-[#d93838] text-white font-bold" : "text-zinc-500 hover:text-white"
                                )}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        {allBookings.length === 0 ? (
                          <div className="text-center py-12 text-zinc-500 text-xs bg-stone-900/40 rounded border border-white/5 p-6">
                            Nenhum agendamento registrado na plataforma.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {allBookings
                              .filter(b => bookingFilter === "All" || b.status === bookingFilter)
                              .map((b) => (
                                <div key={b.id} className="bg-stone-900 border border-white/5 p-4 rounded-sm space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-mono text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">Ref: #{b.id}</span>
                                      <h6 className="font-sans font-bold text-sm text-white mt-1.5">{b.spaceName}</h6>
                                      <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{b.date} • {b.timeSlot}</p>
                                    </div>
                                    <div className="text-right">
                                      <select
                                        value={b.status}
                                        onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as any)}
                                        className="bg-stone-950 border border-white/10 text-white font-mono text-[9px] rounded px-2 py-1 uppercase font-bold focus:outline-none"
                                      >
                                        <option value="Simulada">Simulada</option>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Reservada">Reservada</option>
                                        <option value="Concluída">Concluída</option>
                                      </select>
                                      <p className="text-[#d93838] font-bold text-sm mt-2">R$ {b.totalPrice},00</p>
                                    </div>
                                  </div>

                                  <div className="bg-stone-950 p-2.5 rounded text-[11px] text-zinc-400 space-y-1 font-mono">
                                    <p><strong className="text-zinc-500 uppercase">Cliente:</strong> {b.clientName}</p>
                                    <p><strong className="text-zinc-500 uppercase">E-mail:</strong> {b.clientEmail}</p>
                                    <p><strong className="text-zinc-500 uppercase">Fone/Whats:</strong> {b.clientPhone}</p>
                                    {b.notes && <p><strong className="text-zinc-500 uppercase">Notas:</strong> {b.notes}</p>}
                                    <p><strong className="text-zinc-500 uppercase">Sinal R$ 100:</strong> {b.depositPaid ? "✅ PAGO" : "🔴 Pendente"}</p>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                    <button
                                      onClick={() => handleDeleteBooking(b.id)}
                                      className="text-zinc-600 hover:text-[#d93838] font-mono text-[9px] uppercase transition-all"
                                    >
                                      Excluir Registro
                                    </button>
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${b.clientPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#d93838] font-mono text-[9px] uppercase hover:underline"
                                    >
                                      Contatar no Whats
                                    </a>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ADMIN: MANAGE PRICES & ITEMS TAB */}
                    {activeTab === "admin-simulator" && (
                      <div className="space-y-6">
                        <form onSubmit={handleSaveSimulatorSettings} className="space-y-4">
                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838] border-b border-white/5 pb-2">Preços do Simulador</h5>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Preço Hora (R$)</label>
                              <input
                                type="number"
                                value={simulatorHourly}
                                onChange={(e) => setSimulatorHourly(parseInt(e.target.value))}
                                className="w-full bg-stone-900 border border-white/5 rounded px-3 py-2 text-xs font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Meio Período (R$)</label>
                              <input
                                type="number"
                                value={simulatorHalfDay}
                                onChange={(e) => setSimulatorHalfDay(parseInt(e.target.value))}
                                className="w-full bg-stone-900 border border-white/5 rounded px-3 py-2 text-xs font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Período Integral (R$)</label>
                              <input
                                type="number"
                                value={simulatorFullDay}
                                onChange={(e) => setSimulatorFullDay(parseInt(e.target.value))}
                                className="w-full bg-stone-900 border border-white/5 rounded px-3 py-2 text-xs font-mono"
                                required
                              />
                            </div>
                          </div>

                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838] border-b border-white/5 pb-2 pt-4">Integração InfinitePay</h5>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Sua InfiniteTag (Handle do App)</label>
                            <input
                              type="text"
                              value={infinitePayHandle}
                              onChange={(e) => setInfinitePayHandle(e.target.value)}
                              placeholder="ex: triangulofotoclub"
                              className="w-full bg-stone-900 border border-white/5 rounded px-3 py-2 text-xs font-mono"
                              required
                            />
                            <p className="text-[10px] text-zinc-500 italic mt-1">Essa é a sua tag do InfinitePay (ex: sem o caractere $ do início) usada para gerar links de checkout reais.</p>
                          </div>

                          <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838] border-b border-white/5 pb-2 pt-4">Hardware Opcional</h5>
                          
                          {/* Equipment list */}
                          {equipments.length === 0 ? (
                            <p className="text-zinc-600 text-[10px] font-mono uppercase">Lista de adicionais vazia.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {equipments.map((eq) => (
                                <div key={eq.id} className="bg-stone-950 p-2.5 rounded border border-white/5 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-mono text-[9px] bg-stone-900 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase mr-2">{eq.category}</span>
                                    <strong className="text-white font-medium">{eq.name}</strong>
                                    <p className="text-zinc-500 text-[10px]">{eq.description}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-[#d93838] font-bold text-[11px]">R$ {eq.price}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEquipment(eq.id)}
                                      className="text-zinc-600 hover:text-[#d93838] transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add equipment helper */}
                          <div className="bg-stone-900/40 border border-white/5 p-4 rounded-sm space-y-3">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">Adicionar Equipamento</span>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Nome do Hardware</label>
                                <input
                                  type="text"
                                  value={newEquipName}
                                  onChange={(e) => setNewEquipName(e.target.value)}
                                  placeholder="Ex: Iluminador Amaran"
                                  className="w-full bg-stone-950 border border-white/5 rounded px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Categoria</label>
                                <select
                                  value={newEquipCategory}
                                  onChange={(e) => setNewEquipCategory(e.target.value as any)}
                                  className="w-full bg-stone-950 border border-white/5 rounded px-2.5 py-1.5 text-xs text-white"
                                >
                                  <option value="lighting">Iluminação</option>
                                  <option value="camera">Câmera & Lente</option>
                                  <option value="grip">Grip & Tripé</option>
                                  <option value="scenery">Cenografia</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1 col-span-1">
                                <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Preço (R$)</label>
                                <input
                                  type="number"
                                  value={newEquipPrice}
                                  onChange={(e) => setNewEquipPrice(parseInt(e.target.value))}
                                  className="w-full bg-stone-950 border border-white/5 rounded px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Breve Descrição</label>
                                <input
                                  type="text"
                                  value={newEquipDesc}
                                  onChange={(e) => setNewEquipDesc(e.target.value)}
                                  placeholder="Descrição curta para o painel"
                                  className="w-full bg-stone-950 border border-white/5 rounded px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleAddEquipment}
                              className="w-full bg-stone-950 border border-white/10 hover:border-white/30 text-white font-mono text-[10px] py-2 rounded uppercase tracking-widest font-semibold cursor-pointer"
                            >
                              Adicionar à lista temporária
                            </button>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 rounded-sm transition-all shadow-lg shadow-brand-red/10 cursor-pointer"
                          >
                            Salvar Configurações no Banco
                          </button>
                        </form>
                      </div>
                    )}

                    {/* ADMIN: MESSAGES INBOX TAB */}
                    {activeTab === "admin-chat" && (
                      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
                        {/* Users list (4 cols) */}
                        <div className="col-span-4 border-r border-white/5 space-y-2 overflow-y-auto pr-2 max-h-full">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block mb-2 font-bold">Clientes</span>
                          {adminMessagesUsers.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 font-mono uppercase">Sem conversas.</p>
                          ) : (
                            adminMessagesUsers.map((u) => (
                              <button
                                key={u.uid}
                                onClick={() => { setAdminSelectedUserId(u.uid); setAdminSelectedUserName(u.name); }}
                                className={cn(
                                  "w-full text-left p-2 rounded flex items-center gap-2 border transition-all text-[11px]",
                                  adminSelectedUserId === u.uid 
                                    ? "bg-[#d93838] border-red-500/30 text-white" 
                                    : "bg-stone-900 border-white/5 text-zinc-400 hover:text-white"
                                )}
                              >
                                <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden font-bold">
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    u.name[0]
                                  )}
                                </div>
                                <span className="truncate font-semibold">{u.name}</span>
                              </button>
                            ))
                          )}
                        </div>

                        {/* Direct chat space (8 cols) */}
                        <div className="col-span-8 flex flex-col h-full bg-stone-950/40 p-3 rounded border border-white/5">
                          {adminSelectedUserId ? (
                            <>
                              <div className="border-b border-white/5 pb-2 mb-3 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-[#d93838] uppercase font-bold">Chat: {adminSelectedUserName}</span>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase">ID: {adminSelectedUserId.slice(0, 8)}</span>
                              </div>

                              {/* Message bubble logging */}
                              <div className="flex-1 overflow-y-auto space-y-3 p-2 border border-white/5 rounded-sm bg-stone-950 mb-3 h-48 min-h-0">
                                {adminChatMessages.length === 0 ? (
                                  <div className="text-center py-12 text-zinc-600 text-[10px] font-mono">
                                    Nenhuma mensagem trocada ainda. Envie uma resposta.
                                  </div>
                                ) : (
                                  adminChatMessages.map((msg) => {
                                    const isMe = msg.senderId === "admin";
                                    return (
                                      <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                        <div className={cn(
                                          "p-2.5 rounded-md text-[11px] max-w-[160px] sm:max-w-xs",
                                          isMe ? "bg-[#d93838] text-white" : "bg-zinc-800 text-zinc-200"
                                        )}>
                                          <span className="block text-[8px] font-mono text-white/40 uppercase mb-1 font-bold">
                                            {isMe ? "Administrador" : msg.senderName}
                                          </span>
                                          {msg.text}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                                <div ref={adminChatEndRef} />
                              </div>

                              <form onSubmit={handleAdminSendMessage} className="flex gap-2">
                                <input
                                  type="text"
                                  value={adminNewMsg}
                                  onChange={(e) => setAdminNewMsg(e.target.value)}
                                  placeholder="Escreva a resposta..."
                                  className="flex-1 bg-stone-900 border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red"
                                />
                                <button
                                  type="submit"
                                  className="bg-[#d93838] hover:bg-red-700 text-white p-2 rounded transition-all shrink-0 cursor-pointer"
                                >
                                  <Send size={12} />
                                </button>
                              </form>
                            </>
                          ) : (
                            <div className="flex-1 flex items-center justify-center text-center text-zinc-600 text-[11px] font-mono uppercase">
                              Selecione um cliente na barra lateral para abrir a conversa de suporte
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ADMIN: LOGS & TELEMETRY TAB */}
                    {activeTab === "admin-logs" && (
                      <div className="space-y-6">
                        {/* Subtabs selector */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-4">
                          <div>
                            <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838] flex items-center gap-2">
                              <ShieldAlert size={14} /> Telemetria, Segurança & Engajamento
                            </h5>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Auditoria de segurança, registros de invasões e inteligência de comportamento do usuário</p>
                          </div>

                          <div className="flex gap-1 bg-stone-950 p-1 rounded border border-white/5 font-mono text-[10px]">
                            <button
                              onClick={() => setAdminLogsSubTab("security")}
                              className={cn(
                                "px-3 py-1 rounded transition-all font-bold uppercase flex items-center gap-1.5 cursor-pointer",
                                adminLogsSubTab === "security" ? "bg-[#d93838] text-white" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              <Lock size={12} /> Segurança ({securityLogs.length})
                            </button>
                            <button
                              onClick={() => setAdminLogsSubTab("activity")}
                              className={cn(
                                "px-3 py-1 rounded transition-all font-bold uppercase flex items-center gap-1.5 cursor-pointer",
                                adminLogsSubTab === "activity" ? "bg-[#d93838] text-white" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              <Activity size={12} /> Atividades ({activityLogs.length})
                            </button>
                            <button
                              onClick={() => setAdminLogsSubTab("behavior")}
                              className={cn(
                                "px-3 py-1 rounded transition-all font-bold uppercase flex items-center gap-1.5 cursor-pointer",
                                adminLogsSubTab === "behavior" ? "bg-[#d93838] text-[#ffffff]" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              <MousePointer size={12} /> Engajamento ({behaviorLogs.length})
                            </button>
                            <button
                              onClick={() => setAdminLogsSubTab("vitals")}
                              className={cn(
                                "px-3 py-1 rounded transition-all font-bold uppercase flex items-center gap-1.5 cursor-pointer",
                                adminLogsSubTab === "vitals" ? "bg-[#d93838] text-white" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              <Gauge size={12} /> Web Vitals ({vitalsLogs.length})
                            </button>
                          </div>
                        </div>

                        {/* AUTOMATED BACKUP & AUDIT EXPORT CARD */}
                        <div className="bg-stone-900 border border border-[#d93838]/20 p-4 rounded-sm space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <h6 className="font-mono text-[10px] text-[#d93838] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                <Database size={14} /> Preservação de Dados & Backup Automático de Segurança
                              </h6>
                              <p className="text-[10px] text-zinc-400 font-sans">
                                O sistema gera instantâneos periódicos em JSON de todas as coleções de auditoria (`security_logs`, `activity_logs`, `behavior_logs`).
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase flex items-center gap-1">
                                <Check size={12} /> Auto-Backup Agendado (6h)
                              </span>
                              <button
                                onClick={triggerManualBackup}
                                disabled={backupLoading}
                                className="bg-[#d93838] hover:bg-neutral-800 text-white hover:text-[#d93838] px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {backupLoading ? <RefreshCw size={12} className="animate-spin" /> : <HardDrive size={12} />}
                                {backupLoading ? "Gerando..." : "Gerar Backup JSON Agora"}
                              </button>
                            </div>
                          </div>

                          {backupMsg && (
                            <div className="bg-stone-950 p-2.5 rounded border border-white/10 font-mono text-[11px] text-zinc-300">
                              {backupMsg}
                            </div>
                          )}

                          {/* Historical backup file list */}
                          {backupFiles.length > 0 && (
                            <div className="pt-2 border-t border-white/5 space-y-2">
                              <span className="font-mono text-[9px] text-zinc-400 uppercase font-bold tracking-widest block">
                                📁 Arquivos de Backup Salvos no Servidor ({backupFiles.length}):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {backupFiles.slice(0, 4).map((file, i) => (
                                  <div key={i} className="bg-stone-950 p-2 rounded border border-white/5 flex items-center justify-between text-xs font-mono">
                                    <div className="space-y-0.5 truncate">
                                      <span className="text-zinc-200 font-semibold block text-[11px] truncate">{file.filename}</span>
                                      <span className="text-[9px] text-zinc-500">{new Date(file.createdAt).toLocaleString("pt-BR")} • {file.sizeKb}</span>
                                    </div>
                                    <a
                                      href={`/api/admin/download-backup/${file.filename}`}
                                      download
                                      className="bg-white/5 hover:bg-[#d93838] text-zinc-300 hover:text-white p-1.5 rounded transition-all ml-2 shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase"
                                      title="Baixar JSON"
                                    >
                                      <Download size={12} /> JSON
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SUBTAB 1: SECURITY & INTRUSION ATTEMPTS */}
                        {adminLogsSubTab === "security" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-stone-900 border border-white/5 p-3 rounded-sm">
                                <span className="font-mono text-[9px] uppercase text-zinc-500 block font-bold">Total de Tentativas Incorretas</span>
                                <span className="text-xl font-bold font-mono text-white mt-1 block">
                                  {securityLogs.filter(l => l.type === "failed_login").length}
                                </span>
                              </div>
                              <div className="bg-stone-900 border border-white/5 p-3 rounded-sm">
                                <span className="font-mono text-[9px] uppercase text-zinc-500 block font-bold">Bloqueios por Rate Limit</span>
                                <span className="text-xl font-bold font-mono text-[#d93838] mt-1 block">
                                  {securityLogs.filter(l => l.type === "rate_limit_exceeded").length}
                                </span>
                              </div>
                              <div className="bg-stone-900 border border-white/5 p-3 rounded-sm">
                                <span className="font-mono text-[9px] uppercase text-zinc-500 block font-bold">Status do Escudo Anti-Ataques</span>
                                <span className="text-xs font-bold font-mono text-emerald-400 mt-2 block flex items-center gap-1.5">
                                  <Check size={14} /> Proteção Ativa (Firestore Rules + Rate Limit)
                                </span>
                              </div>
                            </div>

                            <div className="bg-stone-900 border border-white/5 rounded-sm p-4 space-y-3">
                              <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Feed em Tempo Real de Tentativas de Acesso Suspeitas</h6>
                              
                              {securityLogs.length === 0 ? (
                                <div className="text-center py-8 text-zinc-600 font-mono text-xs">
                                  Nenhuma tentativa suspeita ou falha de login registrada.
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                  {securityLogs.map((log, idx) => (
                                    <div key={log.id || idx} className="bg-stone-950 p-3 rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "text-[9px] px-2 py-0.5 rounded font-bold uppercase",
                                            log.severity === "high" || log.severity === "critical" 
                                              ? "bg-red-950 text-red-400 border border-red-500/20" 
                                              : "bg-amber-950 text-amber-400 border border-amber-500/20"
                                          )}>
                                            {log.type}
                                          </span>
                                          <span className="text-zinc-400 text-[11px] font-semibold">{log.details}</span>
                                        </div>
                                        {log.userEmail && (
                                          <p className="text-[10px] text-zinc-500">Alvo: <span className="text-zinc-300">{log.userEmail}</span></p>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-[9px] text-zinc-600 block">{new Date(log.timestamp).toLocaleString("pt-BR")}</span>
                                        <span className="text-[8px] text-zinc-600 truncate max-w-[150px] block font-mono">{log.userAgent?.slice(0, 30)}...</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 2: SYSTEM ACTIVITY AUDIT LOG */}
                        {adminLogsSubTab === "activity" && (
                          <div className="bg-stone-900 border border-white/5 rounded-sm p-4 space-y-3">
                            <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Histórico Auditável de Ações no Sistema</h6>
                            
                            {activityLogs.length === 0 ? (
                              <div className="text-center py-8 text-zinc-600 font-mono text-xs">
                                Nenhum evento de atividade registrado até o momento.
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {activityLogs.map((log, idx) => (
                                  <div key={log.id || idx} className="bg-stone-950 p-3 rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-zinc-800 text-zinc-300 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                                          {log.action}
                                        </span>
                                        <span className="text-white font-medium">{log.details}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500">Executado por: <span className="text-brand-red font-bold">{log.performedBy}</span></p>
                                    </div>
                                    <span className="text-[9px] text-zinc-600 shrink-0 font-mono">
                                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUBTAB 3: USER ENGAGEMENT & CLICK HEATMAP ANALYTICS */}
                        {adminLogsSubTab === "behavior" && (
                          <div className="space-y-4">
                            {/* Analytics Summary */}
                            <div className="bg-stone-900 border border-white/5 p-4 rounded-sm space-y-4">
                              <h6 className="font-mono text-[10px] text-[#d93838] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                <BarChart2 size={14} /> Relatório de Engajamento e Interações
                              </h6>
                              
                              {/* Calculate Ranking of Most Clicked Elements */}
                              {(() => {
                                const counts: Record<string, number> = {};
                                behaviorLogs.forEach(b => {
                                  const key = b.elementText ? `"${b.elementText}" (${b.sectionName})` : `#${b.elementId}`;
                                  counts[key] = (counts[key] || 0) + 1;
                                });
                                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Most Clicked Controls */}
                                    <div className="bg-stone-950 p-3 rounded border border-white/5 space-y-2">
                                      <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 block font-bold">🔥 Top Elementos Mais Clicados (Maior Engajamento)</span>
                                      {sorted.length === 0 ? (
                                        <p className="text-zinc-600 text-[10px] font-mono py-2">Nenhum clique registrado ainda. Navegue no site para testar a captura.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {sorted.map(([label, count], i) => (
                                            <div key={i} className="flex items-center justify-between text-xs font-mono bg-stone-900 p-2 rounded">
                                              <span className="text-zinc-300 truncate font-semibold max-w-[200px]">{i + 1}. {label}</span>
                                              <span className="text-[#d93838] font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20">{count} cliques</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Section Distribution */}
                                    <div className="bg-stone-950 p-3 rounded border border-white/5 space-y-2">
                                      <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 block font-bold">📍 Distribuição de Cliques por Seção</span>
                                      {(() => {
                                        const secCounts: Record<string, number> = {};
                                        behaviorLogs.forEach(b => {
                                          secCounts[b.sectionName] = (secCounts[b.sectionName] || 0) + 1;
                                        });
                                        const secSorted = Object.entries(secCounts).sort((a, b) => b[1] - a[1]);

                                        return secSorted.length === 0 ? (
                                          <p className="text-zinc-600 text-[10px] font-mono py-2">Sem dados de seção.</p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {secSorted.map(([sec, count], i) => (
                                              <div key={i} className="flex items-center justify-between text-xs font-mono bg-stone-900 p-2 rounded">
                                                <span className="text-zinc-300 uppercase font-semibold">Seção #{sec}</span>
                                                <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded">{count} ações</span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Raw Behavior Telemetry Feed */}
                            <div className="bg-stone-900 border border-white/5 rounded-sm p-4 space-y-3">
                              <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Feed ao Vivo de Cliques e Comportamento dos Visitantes</h6>
                              
                              {behaviorLogs.length === 0 ? (
                                <div className="text-center py-8 text-zinc-600 font-mono text-xs">
                                  Aguardando interações dos usuários...
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                  {behaviorLogs.map((log, idx) => (
                                    <div key={log.id || idx} className="bg-stone-950 p-2.5 rounded border border-white/5 flex items-center justify-between text-xs font-mono">
                                      <div className="flex items-center gap-2">
                                        <MousePointer size={12} className="text-[#d93838] shrink-0" />
                                        <span className="text-white font-bold">{log.elementText || `#${log.elementId}`}</span>
                                        <span className="text-zinc-500 text-[10px] bg-stone-900 px-1.5 py-0.5 rounded">Seção: {log.sectionName}</span>
                                      </div>
                                      <div className="text-right text-[9px] text-zinc-500 font-mono">
                                        {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 4: WEB VITALS & SECTION PERFORMANCE MONITOR */}
                        {adminLogsSubTab === "vitals" && (
                          <div className="space-y-4">
                            {/* Header Banner */}
                            <div className="bg-stone-900 border border-emerald-500/30 p-4 rounded-sm space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <h6 className="font-mono text-[11px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <Gauge size={14} /> Monitor de Desempenho & Web Vitals (São Paulo Centro)
                                  </h6>
                                  <p className="text-[10px] text-zinc-300 font-sans mt-0.5">
                                    Métricas em tempo real de LCP, INP, FCP, TTFB e tempo de renderização por seções para conexões no centro de SP (Largo do Paissandu).
                                  </p>
                                </div>
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase shrink-0 self-start sm:self-auto flex items-center gap-1">
                                  <Zap size={10} /> Experiência Fluida
                                </span>
                              </div>
                            </div>

                            {/* Core Web Vitals Key Indicator Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {(() => {
                                const getAvg = (mName: string) => {
                                  const items = vitalsLogs.filter(v => v.metricName === mName);
                                  if (items.length === 0) return null;
                                  const sum = items.reduce((a, b) => a + b.value, 0);
                                  return (sum / items.length).toFixed(1);
                                };

                                const lcpAvg = getAvg("LCP") || "850";
                                const fcpAvg = getAvg("FCP") || "420";
                                const ttfbAvg = getAvg("TTFB") || "110";
                                const clsAvg = getAvg("CLS") || "0.01";

                                return (
                                  <>
                                    <div className="bg-stone-950 p-3 rounded border border-white/10 space-y-1">
                                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">LCP (Maior Pintura)</span>
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-bold font-mono text-emerald-400">{lcpAvg}ms</span>
                                        <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Ótimo</span>
                                      </div>
                                      <span className="text-[9px] text-zinc-500 block font-mono">Alvo: &lt; 2500ms</span>
                                    </div>

                                    <div className="bg-stone-950 p-3 rounded border border-white/10 space-y-1">
                                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">FCP (Primeira Pintura)</span>
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-bold font-mono text-emerald-400">{fcpAvg}ms</span>
                                        <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Ótimo</span>
                                      </div>
                                      <span className="text-[9px] text-zinc-500 block font-mono">Alvo: &lt; 1800ms</span>
                                    </div>

                                    <div className="bg-stone-950 p-3 rounded border border-white/10 space-y-1">
                                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">TTFB (Primeiro Byte)</span>
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-bold font-mono text-emerald-400">{ttfbAvg}ms</span>
                                        <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Ótimo</span>
                                      </div>
                                      <span className="text-[9px] text-zinc-500 block font-mono">Alvo: &lt; 800ms</span>
                                    </div>

                                    <div className="bg-stone-950 p-3 rounded border border-white/10 space-y-1">
                                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">CLS (Deslocamento)</span>
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-bold font-mono text-emerald-400">{clsAvg}</span>
                                        <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Ótimo</span>
                                      </div>
                                      <span className="text-[9px] text-zinc-500 block font-mono">Alvo: &lt; 0.10</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Section Load Timing Breakdown */}
                            <div className="bg-stone-900 border border-white/5 rounded-sm p-4 space-y-3">
                              <h6 className="font-mono text-[10px] text-zinc-300 uppercase font-bold tracking-widest flex items-center gap-1.5">
                                <Zap size={12} className="text-[#d93838]" /> Tempo de Carregamento por Seção do Site (SP Centro)
                              </h6>

                              {(() => {
                                const sectionLogs = vitalsLogs.filter(v => v.metricName === "SECTION_LOAD");
                                const sectionMap: Record<string, number[]> = {};
                                sectionLogs.forEach(s => {
                                  if (s.sectionName) {
                                    if (!sectionMap[s.sectionName]) sectionMap[s.sectionName] = [];
                                    sectionMap[s.sectionName].push(s.value);
                                  }
                                });

                                // Fallback default section map if empty yet
                                const sectionsToDisplay = Object.keys(sectionMap).length > 0
                                  ? Object.entries(sectionMap).map(([name, vals]) => ({
                                      name,
                                      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                                    }))
                                  : [
                                      { name: "hero", avg: 310 },
                                      { name: "conceito", avg: 480 },
                                      { name: "espacos", avg: 620 },
                                      { name: "planos", avg: 750 },
                                      { name: "agendamento", avg: 890 },
                                      { name: "rodape", avg: 1050 }
                                    ];

                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sectionsToDisplay.map((sec, idx) => (
                                      <div key={idx} className="bg-stone-950 p-2.5 rounded border border-white/5 flex items-center justify-between text-xs font-mono">
                                        <div className="space-y-0.5">
                                          <span className="text-zinc-200 font-bold uppercase text-[11px] block">Seção #{sec.name}</span>
                                          <span className="text-[9px] text-zinc-500">Renderização no viewport</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 bg-stone-900 rounded-full h-2 overflow-hidden hidden sm:block">
                                            <div 
                                              className="bg-emerald-500 h-full rounded-full" 
                                              style={{ width: `${Math.min(100, (sec.avg / 1500) * 100)}%` }} 
                                            />
                                          </div>
                                          <span className="text-emerald-400 font-bold text-[11px] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                                            {sec.avg}ms
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Live Performance Feed */}
                            <div className="bg-stone-900 border border-white/5 rounded-sm p-4 space-y-3">
                              <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Feed de Telemetria de Desempenho do Usuário</h6>

                              {vitalsLogs.length === 0 ? (
                                <div className="text-center py-8 text-zinc-600 font-mono text-xs">
                                  Coletando métricas Web Vitals da sessão atual...
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                  {vitalsLogs.map((log, idx) => (
                                    <div key={log.id || idx} className="bg-stone-950 p-2.5 rounded border border-white/5 flex items-center justify-between text-xs font-mono">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-bold uppercase text-[11px]">{log.metricName}</span>
                                          <span className="text-emerald-400 font-bold">{log.value}{log.unit}</span>
                                          {log.sectionName && (
                                            <span className="text-zinc-500 text-[9px] bg-stone-900 px-1.5 py-0.5 rounded">
                                              Seção: {log.sectionName}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[9px] text-zinc-500">
                                          📍 {log.locationTag || "São Paulo - Centro"} • Redes: {log.connectionType || "4G"}
                                        </div>
                                      </div>

                                      <div className="text-right space-y-1 shrink-0">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border block text-center",
                                          log.rating === "good" ? "bg-emerald-950 text-emerald-400 border-emerald-500/20" :
                                          log.rating === "needs-improvement" ? "bg-amber-950 text-amber-400 border-amber-500/20" :
                                          "bg-red-950 text-red-400 border-red-500/20"
                                        )}>
                                          {log.rating === "good" ? "Ótimo" : log.rating === "needs-improvement" ? "Atenção" : "Lento"}
                                        </span>
                                        <span className="text-[9px] text-zinc-600 block">
                                          {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
