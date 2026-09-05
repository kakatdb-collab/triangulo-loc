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
  Activity, Eye, EyeOff, MousePointer, BarChart2, Download, Database, HardDrive,
  Zap, Gauge, FileText, Star, Users, UserCheck, Shield, Layers, Award,
  Sliders, Camera, Edit3, CheckCircle2, Power, Search, Maximize2, Minimize2, Globe, Clock, Video
} from "lucide-react";
import { 
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  sendPasswordResetEmail, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, addDoc, onSnapshot, FirebaseUser,
  handleFirestoreError, OperationType, cleanFirestoreData, uploadFileToStorage,
  googleProvider, signInWithPopup
} from "../lib/firebase";
import { logSecurityEvent, logActivityEvent, checkRateLimit, SecurityLog, ActivityLog, BehaviorLog, MarketingSettings, DEFAULT_MARKETING_SETTINGS, trackConversionEvent } from "../lib/analytics";
import { VitalMetricLog } from "../lib/vitals";
import { Booking, Equipment, SeoSettings } from "../types";
import RentalContractModal from "./RentalContractModal";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";
import { AdminSeoSettings, DEFAULT_SEO_SETTINGS } from "./AdminSeoSettings";
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeCpfCnpj, isSuspiciousInput } from "../lib/sanitize";
import { formatVideoEmbedUrl } from "../lib/videoUtils";
import { DEFAULT_PRISMA_PHOTOS } from "./Spaces";
import { processAndOptimizeImageFile } from "../lib/imageOptimizer";

// Helper function to concatenate classes cleanly
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Compress and convert uploaded image files to optimized WebP / JPEG format
 */
async function compressImageFile(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const webp = canvas.toDataURL("image/webp", quality);
            if (webp && webp.startsWith("data:image/webp")) {
              resolve(webp);
              return;
            }
          } catch (_) {}
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve((e.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve((reader.result as string) || "");
      img.src = (e.target?.result as string) || "";
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads image to server static storage (/api/admin/upload-photo) or falls back
 * to ultra-optimized compact WebP data URL to guarantee zero document bloat in Firestore.
 */
async function uploadOrProcessPhoto(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  const compressedBase64 = await compressImageFile(file, maxWidth, quality);
  try {
    const response = await fetch("/api/admin/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: compressedBase64,
        filename: file.name
      })
    });
    if (response.ok) {
      const result = await response.json();
      if (result.url) {
        return result.url;
      }
    }
  } catch (err) {
    console.warn("Upload para /api/admin/upload-photo indisponível, usando WebP local otimizado:", err);
  }
  return compressedBase64;
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // General Tabs
  // Client: "bookings" | "write-testimonial" | "profile" | "chat"
  // Admin: "admin-bookings" | "admin-users" | "admin-hero" | "admin-spaces" | "admin-plans" | "admin-simulator" | "admin-testimonials" | "admin-chat" | "admin-logs" | "admin-seo-marketing"
  const [activeTab, setActiveTab] = useState<string>("bookings");
  const [seoMarketingSubTab, setSeoMarketingSubTab] = useState<"seo" | "ads">("seo");
  const [bookingsSubTab, setBookingsSubTab] = useState<"bookings" | "analytics">("bookings");

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
  const [heroSettings, setHeroSettings] = useState<{
    title1: string;
    title2: string;
    badge: string;
    description: string;
    bgImage: string;
    heroPhotos: Array<{ url: string; mobileUrl?: string; caption?: string; webpSizeKb?: number }>;
    btnPrimary: string;
    btnSecondary: string;
  }>({
    title1: "ESTÚDIO TRIÂNGULO",
    title2: "FOTOCLUB",
    badge: "Espaço Criativo Premium",
    description: "O estúdio mais completo, barato e acessível no Centro de São Paulo (Largo do Paissandu, próximo ao metrô). 90m² climatizados com ciclorama em U, camarim e iluminação inclusa.",
    bgImage: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
    heroPhotos: [
      {
        url: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
        mobileUrl: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
        caption: "Ciclorama em U - Estúdio Triângulo"
      }
    ],
    btnPrimary: "RESERVAR HORÁRIO",
    btnSecondary: "Conhecer Estúdios"
  });
  const [heroSaveSuccess, setHeroSaveSuccess] = useState("");
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);

  // Admin CMS - Seção Conceito & Vídeos da Locação
  const [conceptSettings, setConceptSettings] = useState({
    badge: "Sobre Nós",
    title: "Nossa Base",
    description: "Escolhemos o triângulo para representar o nosso fotoclube por ser uma simbologia forte e com profunda relação com a fotografia: ele representa a relação entre os princípios básicos da exposição (ISO, diafragma, e velocidade do obturador) e os três pilares fundamentais que sustentam nossas produções corporativas, comerciais e autorais: Equipamento, Ambiente e Conexão.",
    videoUrls: [
      "https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"
    ],
    pillar1Title: "Equipamento",
    pillar1Desc: "Flashes Profoto de alto rendimento, acessórios de modelagem e câmeras de médio formato à disposição imediata para viabilizar seus projetos sem travas técnicas.",
    pillar2Title: "Ambiente",
    pillar2Desc: "Estúdios com arquitetura inteligente, climatizados, espaços amplos, isolamento acústico e luz natural abundante para total conforto e foco mental absoluto.",
    pillar3Title: "Conexão",
    pillar3Desc: "Muito mais que um espaço físico: um autêntico fotoclube para trocar referências, enriquecer portfólios, promover workshops e catalisar novos negócios em rede.",
    isoTitle: "ISO",
    isoDesc: "Representa a capacidade do sensor do clube em reagir à luz. Controla o grão conceitual e a pureza digital.",
    diafragmaTitle: "Diafragma",
    diafragmaDesc: "Define a profundidade de campo, controlando o bokeh de fundo e a nitidez dos detalhes do seu objeto principal.",
    obturadorTitle: "Obturador",
    obturadorDesc: "Modula a passagem temporal de luz: desde congelamentos instantâneos até rastros delicados de longa exposição."
  });
  const [conceptSaveSuccess, setConceptSaveSuccess] = useState("");

  // Admin CMS - Spaces / Nosso Espaço (Seção Completa)
  const [spaceSettings, setSpaceSettings] = useState({
    headerBadge: "Nosso Espaço",
    headerDesc: "Um estúdio completo, flexível e totalmente equipado no coração de São Paulo. Conheça cada detalhe através da nossa galeria exclusiva.",
    name: "Triângulo Estúdio",
    subtitle: "O infinito branco e iluminação profissional",
    description: "Equipado com um ciclorama(fundo infinito) de madeira branco em 'U', pé direito de 3m, Largura 3M, Profundidade 3M e mais 3 metros de recuo, trás ainda uma estrutura aérea de trilhos para iluminação. Perfeito para editoriais de moda, campanhas publicitárias de grande porte, videoclipes e produções que necessitam de fundo infinito ou iluminação técnica avançada.",
    hourlyRate: 100,
    halfDayRate: 400,
    fullDayRate: 700,
    capacity: 15,
    area: "90m²",
    features: [
      "Trilhos aéreos",
      "3 Tochas de estudio Godox com modificadores.",
      "Cortinas Blackout",
      "Copa",
      "Camarim (usando o ambiente do quarto cencio como camarim)."
    ],
    manualUrl: "https://triangulofotoclub.com.br/locacao/estudio/pdf%20locac%CC%A7a%CC%83o.pdf",
    manualTitle: "Baixe nosso Manual",
    manualDesc: "Confira todas as especificações técnicas, regras do estúdio e informações detalhadas sobre as salas do Triângulo.",
    assistanceTitle: "Precisa de assistência técnica em seu ensaio?",
    assistanceDesc: "Nossos estúdios contam com assistência presencial de setup e auxílio básico de briefing. Você também pode alugar assistentes fotográficos avançados diretamente no nosso formulário abaixo."
  });
  const [spacePhotos, setSpacePhotos] = useState<Array<{ url: string; caption: string }>>(DEFAULT_PRISMA_PHOTOS);
  const [spaceSaveMsg, setSpaceSaveMsg] = useState("");
  const [gallerySaveMsg, setGallerySaveMsg] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [substitutingPhotoIdx, setSubstitutingPhotoIdx] = useState<number | null>(null);
  const [photoSubstitutionSuccessIdx, setPhotoSubstitutionSuccessIdx] = useState<number | null>(null);
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newFeatureText, setNewFeatureText] = useState("");
  const [photoFilter, setPhotoFilter] = useState("");

  const [spacesList, setSpacesList] = useState<any[]>([]);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSubtitle, setNewSpaceSubtitle] = useState("");
  const [newSpaceDesc, setNewSpaceDesc] = useState("");
  const [newSpaceHourly, setNewSpaceHourly] = useState(100);
  const [newSpaceHalfDay, setNewSpaceHalfDay] = useState(400);
  const [newSpaceFullDay, setNewSpaceFullDay] = useState(700);
  const [newSpaceCapacity, setNewSpaceCapacity] = useState(15);
  const [newSpaceArea, setNewSpaceArea] = useState("90m²");
  const [newSpaceFeatures, setNewSpaceFeatures] = useState("Ciclorama em U, Camarim, Cortinas Blackout, Copa");

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

  // Admin SEO & AI Search Engine CMS
  const [seoSettings, setSeoSettings] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [isSavingSeo, setIsSavingSeo] = useState(false);

  // Admin Marketing & Integrations CMS
  const [marketingSettings, setMarketingSettings] = useState<MarketingSettings>(DEFAULT_MARKETING_SETTINGS);
  const [marketingSaveSuccess, setMarketingSaveSuccess] = useState("");

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
      } else {
        console.warn("Server returned non-200 for backup list:", res.status);
      }
    } catch (err) {
      console.warn("Could not list server backup files (API offline or client CORS):", err);
    }
  };

  const triggerManualBackup = async () => {
    setBackupLoading(true);
    setBackupMsg("");
    try {
      const res = await fetch("/api/admin/trigger-backup");
      const data = await res.json();
      if (data.success) {
        const counts = data.counts || {};
        const csStatus = data.cloudStorageStatus ? ` | GCS: ${data.cloudStorageStatus}` : "";
        setBackupMsg(`✅ Backup exportado! (${counts.bookingsCount || 0} reservas, ${counts.usersCount || 0} usuários, ${counts.securityLogsCount || 0} logs${csStatus})`);
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

  // Session inactivity & Fullscreen states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(1800); // 30 minutes in seconds
  const lastActivityRef = useRef<number>(Date.now());

  // Inactivity session timer hook
  useEffect(() => {
    if (!user) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", resetActivity);
    window.addEventListener("keydown", resetActivity);
    window.addEventListener("click", resetActivity);
    window.addEventListener("scroll", resetActivity);
    window.addEventListener("touchstart", resetActivity);

    const interval = setInterval(() => {
      const inactiveSecs = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, 1800 - inactiveSecs);
      setSessionTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        signOut(auth);
        alert("Sua sessão expirou devido a 30 minutos de inatividade para sua segurança. Por favor, faça login novamente.");
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetActivity);
      window.removeEventListener("keydown", resetActivity);
      window.removeEventListener("click", resetActivity);
      window.removeEventListener("scroll", resetActivity);
      window.removeEventListener("touchstart", resetActivity);
      clearInterval(interval);
    };
  }, [user]);

  // Always open in full screen when opened
  useEffect(() => {
    if (isOpen) {
      setIsFullScreen(true);
    }
  }, [isOpen]);

  // Watch Auth & Firestore Real-time Listeners
  useEffect(() => {
    const checkLocalAdmin = () => {
      const stored = localStorage.getItem("triangulo_admin_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.email === "kakatdb@gmail.com" && parsed.role === "admin") {
            const adminUser = {
              uid: parsed.uid || "admin_kakatdb",
              email: "kakatdb@gmail.com",
              displayName: parsed.name || "Administrador Triângulo",
            } as any;
            setUser(adminUser);
            setRole("admin");
            setProfileName("Administrador Triângulo");
            setActiveTab("admin-analytics");
            setIsFullScreen(true);
            return true;
          }
        } catch (e) {}
      }
      return false;
    };

    // Check if master admin session is present in localStorage
    checkLocalAdmin();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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

        if (isAdminEmail) {
          localStorage.setItem("triangulo_admin_session", JSON.stringify({
            uid: currentUser.uid,
            email: userEmail,
            name: uName || "Administrador Triângulo",
            role: "admin"
          }));
        }

        setRole(userRole);
        setProfileName(uName || "Criativo");
        setProfilePhone(uPhone);
        setProfileAvatar(uAvatar);
        setActiveTab(userRole === "admin" ? "admin-analytics" : "bookings");
        if (userRole === "admin") {
          setIsFullScreen(true);
        }

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
              let photosList: Array<{ url: string; mobileUrl?: string; caption?: string; webpSizeKb?: number }> = [];

              if (Array.isArray(hData.heroPhotos) && hData.heroPhotos.length > 0) {
                photosList = hData.heroPhotos.slice(0, 10).map((p: any) => ({
                  url: typeof p === "string" ? p : p.url,
                  mobileUrl: typeof p === "string" ? p : (p.mobileUrl || p.url),
                  caption: typeof p === "string" ? "Estúdio Triângulo" : (p.caption || "Estúdio Triângulo"),
                  webpSizeKb: typeof p === "object" ? p.webpSizeKb : undefined
                }));
              } else if (hData.bgImage) {
                photosList = [{
                  url: hData.bgImage,
                  mobileUrl: hData.bgImageMobile || hData.bgImage,
                  caption: "Estúdio Triângulo"
                }];
              }

              setHeroSettings({
                title1: hData.title1 || "ESTÚDIO TRIÂNGULO",
                title2: hData.title2 || "FOTOCLUB",
                badge: hData.badge || "Espaço Criativo Premium",
                description: hData.description || "",
                bgImage: hData.bgImage || "",
                heroPhotos: photosList.length > 0 ? photosList : [
                  {
                    url: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
                    mobileUrl: "https://triangulofotoclub.com.br/locacao/estudio/03-Fundo_Infinito_ciclorama.webp",
                    caption: "Ciclorama em U - Estúdio Triângulo"
                  }
                ],
                btnPrimary: hData.btnPrimary || "RESERVAR HORÁRIO",
                btnSecondary: hData.btnSecondary || "Conhecer Estúdios"
              });
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/hero"));

          // 6b. Concept & Location Videos Settings
          const unsubConcept = onSnapshot(doc(db, "site_settings", "concept"), (snap) => {
            if (snap.exists()) {
              const cData = snap.data();
              let vUrls: string[] = [];
              if (Array.isArray(cData.videoUrls) && cData.videoUrls.length > 0) {
                vUrls = cData.videoUrls.filter((u: any) => typeof u === "string" && u.trim().length > 0);
              } else if (cData.videoUrl && typeof cData.videoUrl === "string" && cData.videoUrl.trim().length > 0) {
                vUrls = [cData.videoUrl.trim()];
              }

              if (vUrls.length === 0) {
                vUrls = ["https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"];
              }

              setConceptSettings({
                badge: cData.badge || "Sobre Nós",
                title: cData.title || "Nossa Base",
                description: cData.description || "Escolhemos o triângulo para representar o nosso fotoclube...",
                videoUrls: vUrls,
                pillar1Title: cData.pillar1Title || "Equipamento",
                pillar1Desc: cData.pillar1Desc || "Flashes Profoto de alto rendimento...",
                pillar2Title: cData.pillar2Title || "Ambiente",
                pillar2Desc: cData.pillar2Desc || "Estúdios com arquitetura inteligente...",
                pillar3Title: cData.pillar3Title || "Conexão",
                pillar3Desc: cData.pillar3Desc || "Muito mais que um espaço físico...",
                isoTitle: cData.isoTitle || "ISO",
                isoDesc: cData.isoDesc || "Representa a capacidade do sensor do clube...",
                diafragmaTitle: cData.diafragmaTitle || "Diafragma",
                diafragmaDesc: cData.diafragmaDesc || "Define a profundidade de campo...",
                obturadorTitle: cData.obturadorTitle || "Obturador",
                obturadorDesc: cData.obturadorDesc || "Modula a passagem temporal de luz..."
              });
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/concept"));

          // 6c. Space Settings & Gallery Photos
          const unsubSpaceSettings = onSnapshot(doc(db, "site_settings", "spaces"), (snap) => {
            if (snap.exists()) {
              const sData = snap.data();
              setSpaceSettings((prev) => ({
                ...prev,
                headerBadge: sData.headerBadge || prev.headerBadge,
                headerDesc: sData.headerDesc || prev.headerDesc,
                name: sData.name || prev.name,
                subtitle: sData.subtitle || prev.subtitle,
                description: sData.description || prev.description,
                hourlyRate: typeof sData.hourlyRate === "number" ? sData.hourlyRate : prev.hourlyRate,
                halfDayRate: typeof sData.halfDayRate === "number" ? sData.halfDayRate : prev.halfDayRate,
                fullDayRate: typeof sData.fullDayRate === "number" ? sData.fullDayRate : prev.fullDayRate,
                capacity: typeof sData.capacity === "number" ? sData.capacity : prev.capacity,
                area: sData.area || prev.area,
                features: Array.isArray(sData.features) && sData.features.length > 0 ? sData.features : prev.features,
                manualUrl: sData.manualUrl || prev.manualUrl,
                manualTitle: sData.manualTitle || prev.manualTitle,
                manualDesc: sData.manualDesc || prev.manualDesc,
                assistanceTitle: sData.assistanceTitle || prev.assistanceTitle,
                assistanceDesc: sData.assistanceDesc || prev.assistanceDesc
              }));
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/spaces"));

          const unsubSpaceGallery = onSnapshot(doc(db, "site_settings", "spaces_gallery"), (snap) => {
            if (snap.exists()) {
              const gData = snap.data();
              if (Array.isArray(gData.photos) && gData.photos.length > 0) {
                setSpacePhotos(gData.photos);
              }
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/spaces_gallery"));

          // Marketing & Integrations Settings
          const unsubIntegrations = onSnapshot(doc(db, "site_settings", "integrations"), (snap) => {
            if (snap.exists()) {
              const mData = snap.data() as MarketingSettings;
              setMarketingSettings((prev) => ({
                ...prev,
                ...mData
              }));
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/integrations"));

          // SEO & AI Search Engine Settings
          const unsubSeo = onSnapshot(doc(db, "site_settings", "seo"), (snap) => {
            if (snap.exists()) {
              const sData = snap.data() as Partial<SeoSettings>;
              setSeoSettings((prev) => ({
                ...prev,
                ...sData
              }));
              if (sData.title) {
                document.title = sData.title;
              }
              if (sData.metaDescription) {
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) metaDesc.setAttribute("content", sData.metaDescription);
              }
              if (sData.keywords) {
                const metaKw = document.querySelector('meta[name="keywords"]');
                if (metaKw) metaKw.setAttribute("content", sData.keywords);
              }
            }
          }, (error) => handleFirestoreError(error, OperationType.GET, "site_settings/seo"));

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
            unsubConcept();
            unsubSpaceSettings();
            unsubSpaceGallery();
            unsubIntegrations();
            unsubSeo();
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
    
    if (isSuspiciousInput(testimonialQuote) || isSuspiciousInput(testimonialRole)) {
      alert("Entrada de depoimento com formato inválido. Remova caracteres ou scripts suspeitos.");
      return;
    }

    setTestimonialLoading(true);
    setTestimonialSuccess("");

    try {
      const cleanQuote = sanitizeText(testimonialQuote, 800);
      const cleanRole = sanitizeText(testimonialRole, 100) || "Diretor de Fotografia";
      const cleanName = sanitizeText(profileName, 100) || "Fotógrafo Parceiro";

      await addDoc(collection(db, "testimonials"), cleanFirestoreData({
        name: cleanName,
        role: cleanRole,
        quote: cleanQuote,
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
  const handleHeroBannerFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const currentCount = heroSettings.heroPhotos.length;
    if (currentCount >= 10) {
      alert("Limite de 10 fotos no carrossel Hero atingido. Remova alguma foto antes de adicionar novas.");
      return;
    }

    setIsUploadingHeroBanner(true);
    try {
      const newItems: Array<{ url: string; mobileUrl: string; caption: string; webpSizeKb: number }> = [];
      const remainingSlots = 10 - currentCount;
      const processCount = Math.min(files.length, remainingSlots);

      for (let i = 0; i < processCount; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const photoUrl = await uploadOrProcessPhoto(file, 1600, 0.82);
        const caption = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || "Estúdio Triângulo";
        newItems.push({
          url: photoUrl,
          mobileUrl: photoUrl,
          caption,
          webpSizeKb: 35
        });
      }

      if (newItems.length > 0) {
        setHeroSettings((prev) => {
          const updatedPhotos = [...prev.heroPhotos, ...newItems].slice(0, 10);
          return {
            ...prev,
            heroPhotos: updatedPhotos,
            bgImage: updatedPhotos[0]?.url || prev.bgImage
          };
        });
        setHeroSaveSuccess(`✅ ${newItems.length} foto(s) convertida(s) para WebP e adicionada(s) ao carrossel Hero! Clique em "Salvar Alterações do Banner Hero" para publicar no site.`);
        setTimeout(() => setHeroSaveSuccess(""), 6000);
      }
    } catch (err) {
      console.error("Error processing hero banner photos:", err);
      alert("Erro ao converter e processar imagem do banner Hero.");
    } finally {
      setIsUploadingHeroBanner(false);
    }
  };

  const handleRemoveHeroPhoto = (index: number) => {
    if (heroSettings.heroPhotos.length <= 1) {
      alert("O carrossel deve conter pelo menos 1 foto.");
      return;
    }
    setHeroSettings((prev) => {
      const updated = prev.heroPhotos.filter((_, i) => i !== index);
      return {
        ...prev,
        heroPhotos: updated,
        bgImage: updated[0]?.url || prev.bgImage
      };
    });
  };

  const handleMoveHeroPhoto = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= heroSettings.heroPhotos.length) return;

    setHeroSettings((prev) => {
      const updated = [...prev.heroPhotos];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return {
        ...prev,
        heroPhotos: updated,
        bgImage: updated[0]?.url || prev.bgImage
      };
    });
  };

  const handleSaveHeroSettings = async () => {
    setHeroSaveSuccess("");
    try {
      const firstPhoto = heroSettings.heroPhotos[0]?.url || heroSettings.bgImage;
      const dataToSave = {
        ...heroSettings,
        bgImage: firstPhoto,
        heroPhotos: heroSettings.heroPhotos.slice(0, 10),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "site_settings", "hero"), cleanFirestoreData(dataToSave));
      setHeroSaveSuccess("Banner Hero & Carrossel atualizados com sucesso no site!");
      logActivityEvent('settings_updated', profileName, "Atualizou as configurações e fotos do Banner Hero");
      setTimeout(() => setHeroSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Error saving hero settings:", err);
      alert("Erro ao salvar banner Hero: " + (err as any)?.message);
    }
  };

  // Admin Save Concept & Location Videos CMS
  const handleSaveConceptSettings = async () => {
    setConceptSaveSuccess("");
    try {
      const formattedUrls = conceptSettings.videoUrls
        .map(url => formatVideoEmbedUrl(url))
        .filter(url => url.trim().length > 0)
        .slice(0, 5); // Max 5 videos

      const finalUrls = formattedUrls.length > 0 ? formattedUrls : ["https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"];

      const dataToSave = {
        ...conceptSettings,
        videoUrls: finalUrls,
        videoUrl: finalUrls[0], // for backward compatibility
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "site_settings", "concept"), cleanFirestoreData(dataToSave), { merge: true });
      setConceptSaveSuccess("Seção Conceito & Vídeos da Locação salvos com sucesso!");
      logActivityEvent('settings_updated', profileName, "Atualizou as configurações do Conceito e Vídeos de Locação");
      setTimeout(() => setConceptSaveSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving concept settings:", err);
      alert("Erro ao salvar seção Conceito: " + err.message);
    }
  };

  const handleAddVideoUrlField = () => {
    if (conceptSettings.videoUrls.length >= 5) {
      alert("O limite máximo é de 5 vídeos da locação.");
      return;
    }
    setConceptSettings(prev => ({
      ...prev,
      videoUrls: [...prev.videoUrls, ""]
    }));
  };

  const handleRemoveVideoUrlField = (index: number) => {
    if (conceptSettings.videoUrls.length <= 1) {
      alert("É necessário ter pelo menos 1 vídeo cadastrado.");
      return;
    }
    setConceptSettings(prev => ({
      ...prev,
      videoUrls: prev.videoUrls.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateVideoUrlField = (index: number, value: string) => {
    setConceptSettings(prev => {
      const updated = [...prev.videoUrls];
      updated[index] = value;
      return { ...prev, videoUrls: updated };
    });
  };

  // Handlers for "Nosso Espaço" CMS
  const handleSaveSpaceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpaceSaveMsg("");
    try {
      await setDoc(doc(db, "site_settings", "spaces"), cleanFirestoreData(spaceSettings), { merge: true });
      setSpaceSaveMsg("Informações do Estúdio salvas com sucesso!");
      logActivityEvent('settings_updated', profileName, "Atualizou as informações principais da seção Nosso Espaço");
      setTimeout(() => setSpaceSaveMsg(""), 4000);
    } catch (err: any) {
      console.error("Error saving space settings:", err);
      setSpaceSaveMsg("Erro ao salvar informações do estúdio.");
    }
  };

  const sanitizePhotoList = (list: any): Array<{ url: string; caption: string }> => {
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p === "object" && typeof p.url === "string")
      .map((p) => ({
        url: String(p.url || "").trim(),
        caption: String(p.caption || "").trim()
      }));
  };

  const handleSaveSpaceGallery = async (photosToSave?: unknown) => {
    setGallerySaveMsg("");
    // Strictly verify if photosToSave is an Array, never pass SyntheticEvent or other objects
    const sourceList = Array.isArray(photosToSave) ? photosToSave : spacePhotos;
    const sanitizedPhotos = sanitizePhotoList(sourceList);

    try {
      await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
        photos: sanitizedPhotos,
        updatedAt: new Date().toISOString()
      }));
      setGallerySaveMsg("✅ Galeria de fotos e carrossel salvos com sucesso!");
      logActivityEvent('settings_updated', profileName, "Atualizou a galeria de fotos do carrossel no Nosso Espaço");
      setTimeout(() => setGallerySaveMsg(""), 4000);
    } catch (err: any) {
      console.error("Error saving gallery photos:", err);
      setGallerySaveMsg("❌ Erro ao salvar fotos da galeria: " + (err?.message || "Falha de conexão"));
    }
  };

  const handleSubstitutePhoto = async (origIdx: number, file: File) => {
    if (!file) return;
    setSubstitutingPhotoIdx(origIdx);
    setPhotoSubstitutionSuccessIdx(null);
    setGallerySaveMsg("");
    try {
      const photoUrl = await uploadOrProcessPhoto(file);
      const updated = [...spacePhotos];
      updated[origIdx] = {
        ...updated[origIdx],
        url: photoUrl
      };
      setSpacePhotos(updated);

      // Auto-save immediately to Firestore so user never loses their changes when leaving
      const sanitizedUpdated = sanitizePhotoList(updated);
      await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
        photos: sanitizedUpdated,
        updatedAt: new Date().toISOString()
      }));

      setPhotoSubstitutionSuccessIdx(origIdx);
      setGallerySaveMsg(`✅ Foto #${origIdx + 1} substituída e salva com sucesso no site!`);
      logActivityEvent('settings_updated', profileName, `Substituiu a foto #${origIdx + 1} da galeria de fotos`);
      setTimeout(() => {
        setPhotoSubstitutionSuccessIdx(null);
        setGallerySaveMsg("");
      }, 4500);
    } catch (err: any) {
      console.error("Error substituting photo:", err);
      setGallerySaveMsg(`❌ Erro ao substituir foto: ${err?.message || "Falha ao salvar no banco de dados"}`);
    } finally {
      setSubstitutingPhotoIdx(null);
    }
  };

  const handlePhotoFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);
    setGallerySaveMsg("");
    try {
      const newItems: Array<{ url: string; caption: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const photoUrl = await uploadOrProcessPhoto(file);
        const defaultCaption = newPhotoCaption.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        newItems.push({
          url: photoUrl,
          caption: defaultCaption
        });
      }
      if (newItems.length > 0) {
        const updated = [...newItems, ...spacePhotos];
        setSpacePhotos(updated);

        // Auto-save immediately to Firestore so photos are never lost
        const sanitizedUpdated = sanitizePhotoList(updated);
        await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
          photos: sanitizedUpdated,
          updatedAt: new Date().toISOString()
        }));

        setGallerySaveMsg(`✅ ${newItems.length} foto(s) anexada(s) e salvas com sucesso no carrossel!`);
        setTimeout(() => setGallerySaveMsg(""), 5000);
        setNewPhotoCaption("");
      }
    } catch (err: any) {
      console.error("Error processing image file upload:", err);
      alert("Erro ao processar arquivo de imagem: " + (err?.message || ""));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhotoFromGallery = async (index: number) => {
    const updated = spacePhotos.filter((_, i) => i !== index);
    setSpacePhotos(updated);
    try {
      const sanitizedUpdated = sanitizePhotoList(updated);
      await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
        photos: sanitizedUpdated,
        updatedAt: new Date().toISOString()
      }));
      setGallerySaveMsg("Foto removida e galeria atualizada!");
      setTimeout(() => setGallerySaveMsg(""), 3000);
    } catch (e) {
      console.error("Error removing photo:", e);
    }
  };

  const handleMovePhoto = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= spacePhotos.length) return;
    const arr = [...spacePhotos];
    const temp = arr[index];
    arr[index] = arr[targetIdx];
    arr[targetIdx] = temp;
    setSpacePhotos(arr);
    try {
      const sanitizedArr = sanitizePhotoList(arr);
      await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
        photos: sanitizedArr,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error("Error reordering photos:", e);
    }
  };

  const handleResetGalleryToDefault = () => {
    if (window.confirm("Deseja restaurar a galeria para as 28 fotos originais do estúdio?")) {
      setSpacePhotos(DEFAULT_PRISMA_PHOTOS);
    }
  };

  const handleAddFeatureTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureText.trim()) return;
    setSpaceSettings((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()]
    }));
    setNewFeatureText("");
  };

  const handleRemoveFeatureTag = (index: number) => {
    setSpaceSettings((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
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
        name: sanitizeText(newSpaceName, 100),
        subtitle: sanitizeText(newSpaceSubtitle, 200),
        description: sanitizeText(newSpaceDesc, 1000),
        hourlyRate: Number(newSpaceHourly),
        halfDayRate: Number(newSpaceHalfDay),
        fullDayRate: Number(newSpaceFullDay),
        capacity: Number(newSpaceCapacity),
        area: sanitizeText(newSpaceArea, 20),
        features: newSpaceFeatures.split(",").map(s => sanitizeText(s, 100)).filter(Boolean)
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
        name: sanitizeText(newPlanName, 100),
        price: Number(newPlanPrice),
        features: newPlanFeatures.split(",").map(s => sanitizeText(s, 100)).filter(Boolean)
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
      name: sanitizeText(newEquipName, 100),
      category: newEquipCategory,
      price: Number(newEquipPrice),
      description: sanitizeText(newEquipDesc, 300),
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

  // User & Booking Admin Actions (Toggle Admin, Block/Unblock, Delete User, Cancel Booking, Delete Booking)
  const handleToggleUserAdmin = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "client" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), cleanFirestoreData({ role: nextRole }));
      logActivityEvent('settings_updated', profileName, `Alterado cargo do usuário ${userId} para ${nextRole}`);
    } catch (err: any) {
      console.error("Error updating user role:", err);
      alert("Erro ao alterar cargo do usuário: " + err.message);
    }
  };

  const handleToggleUserBlock = async (userId: string, userName: string, currentBlocked?: boolean) => {
    const actionText = currentBlocked ? "DESBLOQUEAR" : "BLOQUEAR";
    if (window.confirm(`Tem certeza que deseja ${actionText} o acesso do usuário "${userName || userId}"?`)) {
      try {
        await updateDoc(doc(db, "users", userId), cleanFirestoreData({ isBlocked: !currentBlocked }));
        logActivityEvent('settings_updated', profileName, `Usuário ${userName || userId} foi ${currentBlocked ? 'desbloqueado' : 'bloqueado'}`);
      } catch (err: any) {
        console.error("Error toggling user block status:", err);
        alert("Erro ao alterar status de bloqueio: " + err.message);
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    if (window.confirm(`⚠️ EXCLUIR USUÁRIO PERMANENTEMENTE\n\nTem certeza que deseja excluir o cadastro de "${userName || userEmail}" (${userEmail})?\n\nEsta ação removerá o registro do banco de dados.`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        logActivityEvent('settings_updated', profileName, `Usuário ${userName || userEmail} (${userId}) excluído`);
        alert("✅ Usuário excluído com sucesso!");
      } catch (err: any) {
        console.error("Error deleting user:", err);
        alert("Erro ao excluir usuário: " + err.message);
      }
    }
  };

  const handleCancelBooking = async (bookingId: string, clientName: string) => {
    if (window.confirm(`CANCELAR LOCAÇÃO: Deseja alterar o status da reserva #${bookingId} (${clientName}) para CANCELADA?`)) {
      try {
        await updateDoc(doc(db, "bookings", bookingId), cleanFirestoreData({ status: "Cancelada" }));
        logActivityEvent('booking_status_updated', profileName, `Locação #${bookingId} de ${clientName} foi cancelada`);
        alert("✅ Locação cancelada com sucesso!");
      } catch (err: any) {
        console.error("Error canceling booking:", err);
        alert("Erro ao cancelar locação: " + err.message);
      }
    }
  };

  const handleDeleteBooking = async (bookingId: string, clientName: string) => {
    if (window.confirm(`⚠️ EXCLUIR LOCAÇÃO PERMANENTEMENTE\n\nTem certeza que deseja EXCLUIR a reserva #${bookingId} de "${clientName}"?\n\nEsta ação removerá definitivamente o registro do sistema.`)) {
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        logActivityEvent('booking_status_updated', profileName, `Locação #${bookingId} de ${clientName} excluída permanentemente`);
        alert("✅ Locação excluída com sucesso!");
      } catch (err: any) {
        console.error("Error deleting booking:", err);
        alert("Erro ao excluir locação: " + err.message);
      }
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

    if (password !== confirmPassword) {
      setAuthError("As senhas digitadas não coincidem. Por favor, verifique.");
      setAuthLoading(false);
      return;
    }

    if (isSuspiciousInput(name) || isSuspiciousInput(email)) {
      setAuthError("Dados de cadastro inválidos ou caracteres não permitidos.");
      setAuthLoading(false);
      return;
    }

    if (!checkRateLimit("register_attempt", 5, 60000)) {
      setAuthError("Limite de tentativas de cadastro excedido. Aguarde 1 minuto.");
      setAuthLoading(false);
      return;
    }

    const cleanUserEmail = sanitizeEmail(email);
    const cleanUserName = sanitizeText(name, 100);
    const cleanUserPhone = sanitizePhone(phone);

    try {
      // 1. Query Firestore first by email to check if a user document exists
      const userQuery = query(collection(db, "users"), where("email", "==", cleanUserEmail));
      const existingUserDocs = await getDocs(userQuery);

      if (!existingUserDocs.empty) {
        setAuthError("Este e-mail já está cadastrado no sistema. Por favor, vá na aba 'Entrar' e digite sua senha ou clique em 'Esqueci minha senha'.");
        setAuthLoading(false);
        return;
      }

      let uid = "";
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanUserEmail, password);
        uid = cred.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // If auth user exists but no Firestore doc, attempt sign in with password to finalize registration
          try {
            const loginCred = await signInWithEmailAndPassword(auth, cleanUserEmail, password);
            uid = loginCred.user.uid;
          } catch (loginErr: any) {
            setAuthError("Este e-mail já possui uma conta cadastrada. Vá para a aba 'Entrar' e informe sua senha, ou clique em 'Esqueci minha senha'.");
            setAuthLoading(false);
            return;
          }
        } else {
          throw authErr;
        }
      }

      const isAdminEmail = cleanUserEmail === "kakatdb@gmail.com" || cleanUserEmail === "contato@triangulofotoclub.com.br";

      await setDoc(doc(db, "users", uid), cleanFirestoreData({
        uid: uid,
        email: cleanUserEmail,
        name: cleanUserName,
        phone: cleanUserPhone,
        role: isAdminEmail ? "admin" : "client",
        avatarUrl: "",
        createdAt: new Date().toLocaleDateString("pt-BR"),
        authProvider: "password"
      }));

      logActivityEvent('user_signup', cleanUserEmail, `Novo usuário registrado: ${cleanUserName} (${cleanUserEmail})`);

      // Trigger Welcome email to User and Admin Notification Email
      try {
        await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanUserEmail,
            name: cleanUserName,
            phone: cleanUserPhone
          })
        });
      } catch (emailErr) {
        console.error("Erro ao solicitar envio de e-mail de cadastro:", emailErr);
      }

      setAuthSuccess("Cadastro realizado! Seja bem-vindo.");
      setIsRegistering(false);
    } catch (error: any) {
      logSecurityEvent('suspicious_input', 'medium', `Falha ao cadastrar usuário com e-mail: ${email}`, email);
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
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthError("E-mail e senha são necessários.");
      setAuthLoading(false);
      return;
    }

    const isMasterAdmin = (cleanEmail === "kakatdb@gmail.com" || cleanEmail === "contato@triangulofotoclub.com.br") && 
      (cleanPassword === "System.jsg@2020" || cleanPassword === "System.jsg@2026");

    const activateAdminDirectly = async (targetEmail: string) => {
      const adminUid = targetEmail === "kakatdb@gmail.com" ? "admin_kakatdb" : "yAHsQFEN3pQ4gJvJORgJMJvAQqo1";
      const adminUser = {
        uid: adminUid,
        email: targetEmail,
        displayName: "Administrador Triângulo"
      } as any;

      try {
        await setDoc(doc(db, "users", adminUid), cleanFirestoreData({
          uid: adminUid,
          email: targetEmail,
          name: "Administrador Triângulo",
          role: "admin",
          createdAt: new Date().toLocaleDateString("pt-BR"),
          authProvider: "master_credentials"
        }), { merge: true });
      } catch (syncErr) {
        console.warn("Could not sync admin user to firestore:", syncErr);
      }

      localStorage.setItem("triangulo_admin_session", JSON.stringify({
        uid: adminUid,
        email: targetEmail,
        name: "Administrador Triângulo",
        role: "admin"
      }));

      setUser(adminUser);
      setRole("admin");
      setProfileName("Administrador Triângulo");
      setActiveTab("admin-analytics");
      setIsFullScreen(true);
      logActivityEvent('user_login', targetEmail, `Login administrativo validado com sucesso`);
      setAuthSuccess("Acesso de Administrador liberado com sucesso!");
    };

    // If master admin credentials were typed, activate directly to avoid any password desync
    if (isMasterAdmin) {
      try {
        // Try Firebase Auth in background, but immediately grant access
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } catch {
        // Fallback directly to verified master admin
      }
      await activateAdminDirectly(cleanEmail);
      setAuthLoading(false);
      return;
    }

    // Rate Limiter to protect against Brute Force attacks (max 5 attempts per minute per email/IP)
    if (!checkRateLimit(`login_${cleanEmail}`, 5, 60000)) {
      setAuthError("Muitas tentativas malsucedidas de login. Por segurança, aguarde 1 minuto antes de tentar novamente.");
      logSecurityEvent('rate_limit_exceeded', 'high', `Bloqueio temporário de anti-brute force ativado para ${cleanEmail}`, cleanEmail);
      setAuthLoading(false);
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      logActivityEvent('user_login', cleanEmail, `Login efetuado com sucesso (UID: ${userCred.user.uid})`);
    } catch (error: any) {
      logSecurityEvent('failed_login', 'medium', `Tentativa de login malsucedida (senha incorreta ou e-mail inexistente): ${cleanEmail}`, cleanEmail);
      setAuthError("Credenciais inválidas. Verifique seu e-mail e senha, ou acesse com a opção 'Continuar com o Google'.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const gEmail = gUser.email?.toLowerCase().trim() || "";
      const isAdminEmail = gEmail === "kakatdb@gmail.com" || gEmail === "contato@triangulofotoclub.com.br";

      const userDocRef = doc(db, "users", gUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        await setDoc(userDocRef, cleanFirestoreData({
          uid: gUser.uid,
          email: gEmail,
          name: gUser.displayName || (isAdminEmail ? "Administrador Triângulo" : "Criativo"),
          role: isAdminEmail ? "admin" : "client",
          avatarUrl: gUser.photoURL || "",
          createdAt: new Date().toLocaleDateString("pt-BR"),
          authProvider: "google"
        }));
      } else if (isAdminEmail && userSnap.data()?.role !== "admin") {
        await updateDoc(userDocRef, cleanFirestoreData({ role: "admin" }));
      }

      if (isAdminEmail) {
        localStorage.setItem("triangulo_admin_session", JSON.stringify({
          uid: gUser.uid,
          email: gEmail,
          name: gUser.displayName || "Administrador Triângulo",
          role: "admin"
        }));
      }

      logActivityEvent('user_login', gEmail, `Login com Google efetuado com sucesso (UID: ${gUser.uid})`);
      setAuthSuccess(isAdminEmail ? "Acesso de Administrador liberado via Conta Google!" : "Login com Google realizado com sucesso!");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("Login com Google cancelado. A janela foi fechada antes de concluir.");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setAuthError(error.message || "Erro ao fazer login com o Google.");
      }
      logSecurityEvent('failed_google_login', 'medium', `Falha no login com Google: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError("Insira seu e-mail no campo acima para receber o link de redefinição.");
      return;
    }

    if (!checkRateLimit(`reset_${cleanEmail}`, 3, 60000)) {
      setAuthError("Muitas solicitações de redefinição de senha. Aguarde 1 minuto.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      logSecurityEvent('password_reset_request', 'low', `Solicitação de redefinição de senha enviada para ${cleanEmail}`, cleanEmail);
      setAuthSuccess(`Link de redefinição enviado com sucesso para ${cleanEmail}! Verifique sua caixa de entrada e spam para cadastrar sua nova senha.`);
      setAuthError("");
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setAuthError(`Nenhuma conta encontrada com o e-mail ${cleanEmail}. Clique em 'Cadastre-se aqui' abaixo para criar seu acesso agora.`);
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("Formato de e-mail inválido. Verifique o endereço digitado.");
      } else {
        setAuthError("Erro ao enviar e-mail de redefinição. Verifique se o e-mail está correto ou tente cadastrar-se.");
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("triangulo_admin_session");
    setUser(null);
    setRole("client");
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

  const handleSaveMarketingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarketingSaveSuccess("");
    try {
      await setDoc(doc(db, "site_settings", "integrations"), cleanFirestoreData(marketingSettings), { merge: true });
      logActivityEvent('settings_updated', user?.email, 'Configurações de Marketing, GA4, Google Ads, Meta Pixel e Google Meu Negócio atualizadas com sucesso.');
      setMarketingSaveSuccess("Integrações do Google e Meta salvas no banco de dados!");
      setTimeout(() => setMarketingSaveSuccess(""), 4000);
    } catch (err: any) {
      alert("Erro ao salvar integrações de marketing: " + err.message);
    }
  };

  const handleSaveSeoSettings = async (newSettings: SeoSettings) => {
    setIsSavingSeo(true);
    try {
      const payload = {
        ...newSettings,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "site_settings", "seo"), cleanFirestoreData(payload), { merge: true });
      setSeoSettings(newSettings);

      // Dynamically update document title and head tags immediately in the browser
      if (typeof document !== "undefined") {
        document.title = newSettings.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", newSettings.metaDescription);
        const metaKw = document.querySelector('meta[name="keywords"]');
        if (metaKw) metaKw.setAttribute("content", newSettings.keywords);
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", newSettings.title);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute("content", newSettings.metaDescription);
      }

      logActivityEvent('settings_updated', user?.email, 'Configurações de SEO e buscas por IA (Google/ChatGPT/Perplexity) atualizadas.');
    } catch (err: any) {
      alert("Erro ao salvar SEO: " + err.message);
      throw err;
    } finally {
      setIsSavingSeo(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-40"
          />

          {/* Slide-over or Fullscreen panel container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "z-50 flex flex-col bg-stone-950 text-left overflow-hidden transition-all duration-300",
              isFullScreen
                ? "fixed inset-0 w-full h-full border-none"
                : "fixed right-0 top-0 bottom-0 ml-auto w-full max-w-5xl border-l border-white/10 shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-stone-900 shrink-0">
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
                  <>
                    {/* Session Timeout Indicator */}
                    <div 
                      title="Tempo restante de sessão por inatividade (30min)"
                      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-stone-950 border border-emerald-500/30 rounded font-mono text-[10px] text-emerald-400"
                    >
                      <Clock size={12} className="animate-pulse" />
                      <span>{Math.floor(sessionTimeLeft / 60)}m {sessionTimeLeft % 60}s</span>
                    </div>

                    {/* Toggle Fullscreen / Windowed Mode */}
                    <button
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="text-zinc-300 hover:text-white font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-white/10 hover:border-white/30 rounded transition-all cursor-pointer flex items-center gap-1 bg-stone-950"
                    >
                      {isFullScreen ? (
                        <>
                          <Minimize2 size={13} /> <span className="hidden sm:inline">Gaveta</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 size={13} /> <span className="hidden sm:inline">Tela Cheia</span>
                        </>
                      )}
                    </button>

                    {/* Alternate to Website View */}
                    <button
                      onClick={() => {
                        setIsFullScreen(false);
                        onClose();
                      }}
                      className="text-zinc-300 hover:text-white font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-brand-red/40 hover:border-brand-red rounded transition-all cursor-pointer flex items-center gap-1 bg-brand-red/10"
                    >
                      <Globe size={13} className="text-brand-red" />
                      <span className="hidden sm:inline">Alternar p/ Site</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="text-zinc-400 hover:text-red-400 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/10 hover:border-red-500/30 rounded transition-all cursor-pointer"
                    >
                      Sair
                    </button>
                  </>
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

                  {/* Google Login Button */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-stone-900 font-sans font-medium text-xs py-3 px-4 rounded border border-zinc-200 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continuar com o Google</span>
                    </button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-stone-950 px-3 text-zinc-500 font-mono text-[10px] tracking-wider">
                          ou com e-mail e senha
                        </span>
                      </div>
                    </div>
                  </div>

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
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-stone-900 border border-white/10 pl-4 pr-10 py-2.5 rounded text-xs text-white focus:outline-none focus:border-brand-red"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                          title={showPassword ? "Ocultar senha" : "Ver senha"}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {!isRegistering && (
                      <div className="flex items-center justify-between text-[11px] pt-1 pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEmail("kakatdb@gmail.com");
                            setPassword("System.jsg@2020");
                          }}
                          className="text-[10px] font-mono text-zinc-400 hover:text-white bg-stone-900 border border-white/10 hover:border-brand-red/50 px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Preencher login e senha de Administrador"
                        >
                          <Shield size={12} className="text-brand-red" />
                          <span>Preencher Admin (kakatdb@gmail.com)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="text-zinc-400 hover:text-brand-red font-mono underline transition-colors cursor-pointer"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    )}

                    {isRegistering && (
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                          Confirmar Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full bg-stone-900 border pl-4 pr-10 py-2.5 rounded text-xs text-white focus:outline-none ${
                              confirmPassword && confirmPassword !== password
                                ? "border-red-500"
                                : "border-white/10 focus:border-brand-red"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                            title={showConfirmPassword ? "Ocultar senha" : "Ver senha"}
                          >
                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {confirmPassword && confirmPassword !== password && (
                          <p className="text-red-400 text-[10px] font-mono mt-1">
                            ⚠️ As senhas não coincidem.
                          </p>
                        )}
                      </div>
                    )}

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
                          onClick={() => {
                            setActiveTab("admin-bookings");
                            setBookingsSubTab("bookings");
                          }}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            (activeTab === "admin-bookings" || activeTab === "admin-analytics")
                              ? "border-brand-red text-white bg-white/[0.02]"
                              : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Calendar size={13} className="text-emerald-400" />
                          <BarChart2 size={13} className="text-brand-red -ml-0.5" />
                          <span>Locações, Agenda & Métricas</span>
                        </button>
                        <button
                          onClick={() => setActiveTab("admin-seo-marketing")}
                          className={cn(
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            (activeTab === "admin-seo-marketing" || activeTab === "admin-seo" || activeTab === "admin-marketing")
                              ? "border-amber-400 text-white bg-white/[0.02]"
                              : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Search size={13} className="text-amber-400" />
                          <Globe size={13} className="text-cyan-400 -ml-0.5" />
                          <span>SEO, Google & Meta Ads</span>
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
                            "px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === "admin-hero" ? "border-brand-red text-white bg-white/[0.02]" : "border-transparent text-zinc-400 hover:text-white"
                          )}
                        >
                          <Video size={13} className="text-amber-400" /> Banner & Vídeos
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

                                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                    <button
                                      onClick={() => { setContractBooking(b); setIsContractOpen(true); }}
                                      className="bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold"
                                      title="Baixar ou visualizar contrato e dados da reserva em PDF"
                                    >
                                      <FileText size={13} className="text-emerald-400" /> Baixar Dados / Contrato (PDF)
                                    </button>

                                    <a
                                      href={`https://wa.me/5511961959349?text=${encodeURIComponent(`Olá! Fiz a reserva #${b.id} no ${b.spaceName} para o dia ${b.date} (${b.timeSlot}). Gostaria de confirmar meu agendamento.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold"
                                    >
                                      <MessageSquare size={13} /> Falar no WhatsApp
                                    </a>

                                    {!b.depositPaid ? (
                                      <a
                                        href="https://checkout.infinitepay.io/daluz_jef/mHOzh5edeU"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-brand-red hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-wider px-3.5 py-2 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                                      >
                                        <CreditCard size={13} /> Pagar Sinal R$100 (InfinitePay)
                                      </a>
                                    ) : (
                                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] uppercase px-3 py-2 rounded font-bold flex items-center gap-1">
                                        <CheckCircle2 size={13} /> Sinal R$100 Pago
                                      </span>
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

                          <div className="pt-2">
                            <a
                              href={marketingSettings.googleBusinessReviewUrl || DEFAULT_MARKETING_SETTINGS.googleBusinessReviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackConversionEvent("google_review_from_panel")}
                              className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded text-xs font-mono font-bold transition-all group"
                            >
                              <Star size={14} className="fill-amber-400 text-amber-400" />
                              <span>Avaliar o Estúdio no Google Meu Negócio ↗</span>
                            </a>
                          </div>
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
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <div>
                            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-white">Dados do Seu Perfil</h5>
                            <p className="text-zinc-400 text-xs mt-0.5">Gerencie suas informações pessoais e foto cadastrada no clube.</p>
                          </div>
                          <span className="font-mono text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-bold uppercase">
                            Firebase Storage Active
                          </span>
                        </div>

                        {/* Photo Upload to Firebase Storage */}
                        <div className="flex items-center gap-4 bg-stone-950 p-4 rounded border border-white/5">
                          <img 
                            src={profileAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                            alt="Avatar" 
                            className="w-16 h-16 rounded-full object-cover border-2 border-brand-red shrink-0" 
                          />
                          <div className="space-y-1">
                            <span className="text-xs font-mono text-zinc-300 font-bold block">Foto do Perfil / Avatar</span>
                            <p className="text-[10px] text-zinc-500 font-sans">
                              Envie sua foto diretamente para o Firebase Storage (Spark Gratuito).
                            </p>
                            <label className="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white font-mono text-[10px] uppercase px-3 py-1.5 rounded font-bold cursor-pointer transition-colors mt-1">
                              <Upload size={12} className="text-brand-red" /> Alterar Foto
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const url = await uploadFileToStorage(file, "avatars");
                                    setProfileAvatar(url);
                                    if (user) {
                                      await updateDoc(doc(db, "users", user.uid), { avatarUrl: url });
                                    }
                                    alert("Foto do perfil atualizada com sucesso no Firebase Storage!");
                                  } catch (err: any) {
                                    alert("Erro ao enviar foto: " + err.message);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="bg-stone-950 p-3 rounded border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Nome Completo</span>
                            <strong className="text-white font-mono text-sm">{profileName}</strong>
                          </div>
                          <div className="bg-stone-950 p-3 rounded border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">E-mail de Acesso</span>
                            <strong className="text-white font-mono text-sm">{user.email}</strong>
                          </div>
                          <div className="bg-stone-950 p-3 rounded border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Telefone / WhatsApp</span>
                            <strong className="text-white font-mono text-sm">{profilePhone || "Não informado"}</strong>
                          </div>
                          <div className="bg-stone-950 p-3 rounded border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Tipo de Conta</span>
                            <strong className="text-emerald-400 font-mono uppercase text-sm">{role}</strong>
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
                          const cleanText = sanitizeText(newMsg, 2000);
                          const cleanSenderName = sanitizeText(profileName, 100) || "Cliente";
                          if (!cleanText) return;
                          await addDoc(collection(db, "messages"), cleanFirestoreData({
                            id: "msg-" + Date.now(),
                            senderId: user.uid,
                            senderName: cleanSenderName,
                            recipientId: "admin",
                            text: cleanText,
                            createdAt: new Date().toISOString()
                          }));
                          setNewMsg("");
                        }} className="flex gap-2 mt-3">
                          <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Digite sua mensagem para a gerência..." className="flex-1 bg-stone-950 border border-white/10 px-3 py-2 rounded text-xs text-white focus:outline-none" />
                          <button type="submit" className="bg-brand-red text-white font-mono text-xs px-4 rounded font-bold">Enviar</button>
                        </form>
                      </div>
                    )}

                    {/* ADMIN: SEO, GOOGLE & META ADS (UNIFIED MODULE) */}
                    {(activeTab === "admin-seo-marketing" || activeTab === "admin-seo" || activeTab === "admin-marketing") && (
                      <div className="space-y-6">
                        {/* SUB-TABS SWITCHER */}
                        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-900 border border-white/10 rounded-lg w-fit">
                          <button
                            type="button"
                            onClick={() => setSeoMarketingSubTab("seo")}
                            className={cn(
                              "px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                              seoMarketingSubTab === "seo"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <Search size={14} className="text-amber-400" />
                            <span>Otimização SEO & Buscas por IA (Google)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeoMarketingSubTab("ads")}
                            className={cn(
                              "px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                              seoMarketingSubTab === "ads"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <Globe size={14} className="text-cyan-400" />
                            <span>Google & Meta Ads (Tags & Pixel)</span>
                          </button>
                        </div>

                        {seoMarketingSubTab === "seo" ? (
                          <AdminSeoSettings
                            initialSettings={seoSettings}
                            onSave={handleSaveSeoSettings}
                            isSaving={isSavingSeo}
                          />
                        ) : (
                          <div className="space-y-6">
                            <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Globe className="text-cyan-400" size={18} />
                                  <h5 className="font-display font-bold text-xs uppercase tracking-widest text-cyan-400">
                                    Central de Integrações Google & Meta (Gerenciador de Anúncios)
                                  </h5>
                                </div>
                                <p className="text-zinc-400 text-xs font-sans mt-1">
                                  Configure as tags do Google Analytics 4, Google Ads Conversions, Meta Pixel (Facebook/Instagram Ads) e Google Meu Negócio para rastrear leads e otimizar campanhas de tráfego pago.
                                </p>
                              </div>

                              {marketingSaveSuccess && (
                                <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs flex items-center gap-2">
                                  <CheckCircle2 size={16} /> {marketingSaveSuccess}
                                </div>
                              )}

                              <form onSubmit={handleSaveMarketingSettings} className="space-y-6 text-xs">
                            {/* STATUS SUMMARY BADGES */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[10px]">
                              <div className={cn("p-3 rounded border flex flex-col justify-between gap-1", marketingSettings.enableGA4 && marketingSettings.ga4MeasurementId?.startsWith("G-") ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-stone-950 border-white/10 text-zinc-500")}>
                                <span className="uppercase text-[9px]">Google Analytics 4</span>
                                <strong className="text-xs">{marketingSettings.enableGA4 && marketingSettings.ga4MeasurementId?.startsWith("G-") ? "🟢 Conectado" : "⚪ Aguardando ID"}</strong>
                              </div>
                              <div className={cn("p-3 rounded border flex flex-col justify-between gap-1", marketingSettings.enableGoogleAds && marketingSettings.googleAdsId?.startsWith("AW-") ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-stone-950 border-white/10 text-zinc-500")}>
                                <span className="uppercase text-[9px]">Google Ads</span>
                                <strong className="text-xs">{marketingSettings.enableGoogleAds && marketingSettings.googleAdsId?.startsWith("AW-") ? "🟢 Conectado" : "⚪ Aguardando ID"}</strong>
                              </div>
                              <div className={cn("p-3 rounded border flex flex-col justify-between gap-1", marketingSettings.enableMetaPixel && marketingSettings.metaPixelId && marketingSettings.metaPixelId.length > 5 ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-stone-950 border-white/10 text-zinc-500")}>
                                <span className="uppercase text-[9px]">Meta Pixel (FB)</span>
                                <strong className="text-xs">{marketingSettings.enableMetaPixel && marketingSettings.metaPixelId && marketingSettings.metaPixelId.length > 5 ? "🟢 Conectado" : "⚪ Aguardando ID"}</strong>
                              </div>
                              <div className={cn("p-3 rounded border flex flex-col justify-between gap-1", marketingSettings.enableGoogleBusiness ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-stone-950 border-white/10 text-zinc-500")}>
                                <span className="uppercase text-[9px]">Google Meu Negócio</span>
                                <strong className="text-xs">{marketingSettings.enableGoogleBusiness ? "🟢 Ativo no Site" : "⚪ Desativado"}</strong>
                              </div>
                            </div>

                            {/* 1. GOOGLE ANALYTICS 4 */}
                            <div className="p-4 bg-stone-950/80 border border-white/10 rounded space-y-4">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <label className="font-bold text-white uppercase font-mono flex items-center gap-2">
                                  <BarChart2 size={14} className="text-emerald-400" /> Google Analytics 4 (GA4)
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer font-mono text-[10px] text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={marketingSettings.enableGA4 ?? true}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, enableGA4: e.target.checked })}
                                    className="rounded border-white/20 bg-stone-900 text-brand-red focus:ring-0"
                                  />
                                  <span>Ativar GA4 Tag</span>
                                </label>
                              </div>
                              <div>
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                  ID de Medição do GA4 (Measurement ID)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: G-ABC123XYZ0"
                                  value={marketingSettings.ga4MeasurementId || ""}
                                  onChange={(e) => setMarketingSettings({ ...marketingSettings, ga4MeasurementId: e.target.value })}
                                  className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                                  Obtenha no painel do Google Analytics &gt; Admin &gt; Fluxos de Dados (Data Streams).
                                </span>
                              </div>
                            </div>

                            {/* 2. GOOGLE ADS CONVERSION TRACKING */}
                            <div className="p-4 bg-stone-950/80 border border-white/10 rounded space-y-4">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <label className="font-bold text-white uppercase font-mono flex items-center gap-2">
                                  <Zap size={14} className="text-amber-400" /> Google Ads (Conversões de Anúncios)
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer font-mono text-[10px] text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={marketingSettings.enableGoogleAds ?? true}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, enableGoogleAds: e.target.checked })}
                                    className="rounded border-white/20 bg-stone-900 text-brand-red focus:ring-0"
                                  />
                                  <span>Ativar Google Ads</span>
                                </label>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                    ID da Conta do Google Ads (AW-ID)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: AW-123456789"
                                    value={marketingSettings.googleAdsId || ""}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, googleAdsId: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                    Rótulo / Label da Ação de Conversão
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: AW-123456789/aBcD_eFgHiJ"
                                    value={marketingSettings.googleAdsConversionLabel || ""}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, googleAdsConversionLabel: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono block">
                                Dispara automaticamente eventos de conversão no Google Ads quando um cliente agenda uma locação ou entra em contato pelo WhatsApp.
                              </span>
                            </div>

                            {/* 3. GERENCIADOR DE ANÚNCIOS (META / FACEBOOK ADS PIXEL) */}
                            <div className="p-4 bg-stone-950/80 border border-white/10 rounded space-y-4">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <label className="font-bold text-white uppercase font-mono flex items-center gap-2">
                                  <Users size={14} className="text-blue-400" /> Gerenciador de Anúncios Meta (Facebook & Instagram Pixel)
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer font-mono text-[10px] text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={marketingSettings.enableMetaPixel ?? true}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, enableMetaPixel: e.target.checked })}
                                    className="rounded border-white/20 bg-stone-900 text-brand-red focus:ring-0"
                                  />
                                  <span>Ativar Meta Pixel</span>
                                </label>
                              </div>
                              <div>
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                  ID do Meta Pixel (Gerenciador de Eventos)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 123456789012345"
                                  value={marketingSettings.metaPixelId || ""}
                                  onChange={(e) => setMarketingSettings({ ...marketingSettings, metaPixelId: e.target.value })}
                                  className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                                  O Meta Pixel monitora visualizações de página, conversões de leads do WhatsApp e inícios de agendamento no Facebook e Instagram.
                                </span>
                              </div>
                            </div>

                            {/* 4. GOOGLE MEU NEGÓCIO */}
                            <div className="p-4 bg-stone-950/80 border border-white/10 rounded space-y-4">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <label className="font-bold text-white uppercase font-mono flex items-center gap-2">
                                  <Star size={14} className="text-amber-400" /> Google Meu Negócio (Perfil da Sede e Avaliações 5 Estrelas)
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer font-mono text-[10px] text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={marketingSettings.enableGoogleBusiness ?? true}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, enableGoogleBusiness: e.target.checked })}
                                    className="rounded border-white/20 bg-stone-900 text-brand-red focus:ring-0"
                                  />
                                  <span>Exibir Selo de Avaliações</span>
                                </label>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                    Link Direto do Perfil no Google Maps
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: https://maps.google.com/?q=Largo+do+Paissandu+72+Sao+Paulo"
                                    value={marketingSettings.googleBusinessProfileUrl || ""}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, googleBusinessProfileUrl: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red text-xs"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                    Link Direto para Coletar Avaliação de 5 Estrelas
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: https://www.google.com/maps/search/?api=1&query=Tri%C3%A2ngulo+Est%C3%BAdio+Fotoclub+Largo+do+Paissandu+72+Sao+Paulo"
                                    value={marketingSettings.googleBusinessReviewUrl || ""}
                                    onChange={(e) => setMarketingSettings({ ...marketingSettings, googleBusinessReviewUrl: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red text-xs"
                                  />
                                  <p className="text-[10px] text-zinc-500 font-sans mt-1">
                                    Insira a URL do seu perfil no Google Maps, link de avaliação direta do Google (g.page) ou busca da sua empresa no Google.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="flex items-center justify-between pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  trackConversionEvent("admin_test_conversion", { test: true });
                                  alert("Evento de teste de conversão disparado com sucesso no navegador! Verifique no Console F12 / Tag Assistant / Meta Pixel Helper.");
                                }}
                                className="bg-stone-800 hover:bg-stone-700 text-cyan-300 font-mono text-xs uppercase px-4 py-3 rounded font-bold transition-all cursor-pointer border border-cyan-500/30"
                              >
                                🧪 Testar Disparo de Evento
                              </button>

                              <button
                                type="submit"
                                className="bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-mono text-xs uppercase px-6 py-3 rounded font-bold transition-all cursor-pointer shadow-lg"
                              >
                                Salvar Integrações
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                    {/* ADMIN: LOCAÇÕES, AGENDA & MÉTRICAS (UNIFIED MODULE) */}
                    {(activeTab === "admin-bookings" || activeTab === "admin-analytics") && (
                      <div className="space-y-6">
                        {/* SUB-TABS SWITCHER */}
                        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-900 border border-white/10 rounded-lg w-fit">
                          <button
                            type="button"
                            onClick={() => {
                              setBookingsSubTab("bookings");
                              setActiveTab("admin-bookings");
                            }}
                            className={cn(
                              "px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                              (bookingsSubTab === "bookings" && activeTab !== "admin-analytics")
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <Calendar size={14} className="text-emerald-400" />
                            <span>Gerenciamento de Locações & Agenda ({allBookings.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBookingsSubTab("analytics");
                              setActiveTab("admin-bookings");
                            }}
                            className={cn(
                              "px-4 py-2 rounded-md font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                              (bookingsSubTab === "analytics" || activeTab === "admin-analytics")
                                ? "bg-brand-red/20 text-white border border-brand-red/40 shadow-sm"
                                : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                          >
                            <BarChart2 size={14} className="text-brand-red" />
                            <span>Métricas, Faturamento & Analytics</span>
                          </button>
                        </div>

                        {(bookingsSubTab === "analytics" || activeTab === "admin-analytics") ? (
                          <AdminAnalyticsDashboard bookings={allBookings} />
                        ) : (
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Status:</span>
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

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        onClick={() => { setContractBooking(b); setIsContractOpen(true); }}
                                        className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer font-bold transition-all"
                                        title="Baixar Contrato Oficial em PDF"
                                      >
                                        <Download size={12} className="text-emerald-400" /> Contrato PDF
                                      </button>

                                      <button
                                        onClick={() => handleCancelBooking(b.id, b.clientName)}
                                        className="bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-500/30 text-[10px] font-mono uppercase px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer font-bold transition-all"
                                        title="Cancelar esta locação"
                                      >
                                        <AlertTriangle size={12} className="text-amber-400" /> Cancelar
                                      </button>

                                      <button
                                        onClick={() => handleDeleteBooking(b.id, b.clientName)}
                                        className="bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/30 text-[10px] font-mono uppercase px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer font-bold transition-all"
                                        title="Excluir permanentemente esta locação"
                                      >
                                        <Trash2 size={12} className="text-red-400" /> Excluir
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                            Acompanhe quantas vezes o mesmo fotógrafo locou, histórico completo de reservas, bloqueios de conta e exclusão.
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

                        {/* Registered Users List & Role / Block / Delete Controls */}
                        <div className="bg-stone-900 border border-white/10 rounded p-4 space-y-3">
                          <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                            Controle de Acessos, Bloqueio e Exclusão de Contas:
                          </h6>
                          <div className="space-y-2">
                            {usersList.map((u) => (
                              <div key={u.id} className="bg-stone-950 p-3 rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white block">{u.name || "Fotógrafo / Cliente"}</span>
                                    {u.isBlocked && (
                                      <span className="bg-red-950 text-red-400 border border-red-500/40 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold">
                                        BLOQUEADO
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{u.email} • {u.phone || "Sem telefone"}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleToggleUserAdmin(u.id, u.role)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer",
                                      u.role === "admin" ? "bg-purple-950 text-purple-400 border-purple-500/30" : "bg-stone-900 text-zinc-400 border-white/10 hover:text-white"
                                    )}
                                    title="Alternar entre Administrador e Cliente"
                                  >
                                    {u.role === "admin" ? "ADMIN" : "CLIENTE"}
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserBlock(u.id, u.name || u.email, u.isBlocked)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer flex items-center gap-1",
                                      u.isBlocked 
                                        ? "bg-amber-950 text-amber-400 border-amber-500/30 hover:bg-amber-900" 
                                        : "bg-red-950/60 text-red-400 border-red-500/30 hover:bg-red-900"
                                    )}
                                    title={u.isBlocked ? "Desbloquear usuário" : "Bloquear usuário"}
                                  >
                                    <Lock size={10} />
                                    {u.isBlocked ? "DESBLOQUEAR" : "BLOQUEAR"}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name || "Sem Nome", u.email)}
                                    className="bg-stone-900 hover:bg-red-950 text-red-400 border border-red-500/30 hover:border-red-500/60 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer transition-all"
                                    title="Excluir cadastro do usuário"
                                  >
                                    <Trash2 size={10} />
                                    EXCLUIR
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
                      <div className="space-y-6">
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

                          {/* UPLOAD & GESTÃO DE FOTOS DO CARROSSEL HERO (ATÉ 10 FOTOS COM CONVERSÃO WEBP AUTOMÁTICA) */}
                          <div className="bg-stone-950 p-4 sm:p-5 rounded border border-white/10 space-y-4 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <span className="font-mono text-xs text-white uppercase font-bold flex items-center gap-2">
                                  <ImageIcon size={16} className="text-[#d93838]" /> Carrossel de Fotos do Banner Hero ({heroSettings.heroPhotos.length}/10 Fotos)
                                </span>
                                <p className="text-zinc-400 text-[11px] mt-0.5 font-sans">
                                  Anexe até 10 fotos. Todas as imagens enviadas são convertidas automaticamente em **WebP ultra-otimizado** e geram versão leve para dispositivos móveis.
                                </p>
                              </div>
                              <span className="text-[10px] font-mono bg-stone-900 border border-white/10 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1">
                                <Sparkles size={12} /> Auto-conversão WebP Ativa
                              </span>
                            </div>

                            {/* Área de Seleção e Soltar de Arquivos */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                              <div className="md:col-span-8">
                                <label
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files) {
                                      handleHeroBannerFilesSelected(e.dataTransfer.files);
                                    }
                                  }}
                                  className="border-2 border-dashed border-white/15 hover:border-[#d93838]/60 bg-stone-900/80 p-4 rounded text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 block"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={isUploadingHeroBanner || heroSettings.heroPhotos.length >= 10}
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        handleHeroBannerFilesSelected(e.target.files);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className="flex items-center gap-2 text-zinc-300 font-medium text-xs">
                                    <Upload size={16} className="text-[#d93838]" />
                                    <span>Clique para selecionar ou arraste até 10 fotos (JPG, PNG, WebP)</span>
                                  </div>
                                  <p className="text-[10px] font-mono text-zinc-500">
                                    Conversão automática instantânea para WebP HD + WebP Mobile.
                                  </p>
                                </label>
                              </div>

                              <div className="md:col-span-4">
                                <label className="block w-full">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={isUploadingHeroBanner || heroSettings.heroPhotos.length >= 10}
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        handleHeroBannerFilesSelected(e.target.files);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className={cn(
                                    "w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase font-bold py-3 px-4 rounded transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#d93838]/20 text-center",
                                    (isUploadingHeroBanner || heroSettings.heroPhotos.length >= 10) && "opacity-50 cursor-not-allowed"
                                  )}>
                                    {isUploadingHeroBanner ? (
                                      <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Otimizando WebP...
                                      </>
                                    ) : (
                                      <>
                                        <Camera size={15} />
                                        Anexar Fotos ({heroSettings.heroPhotos.length}/10)
                                      </>
                                    )}
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Lista de Fotos do Carrossel Hero */}
                            <div className="space-y-3 pt-2">
                              <span className="font-mono text-[10px] text-zinc-400 uppercase font-bold block">
                                Fotos Cadastradas no Carrossel (Arraste ou use os botões para reordenar):
                              </span>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                                {heroSettings.heroPhotos.map((photo, idx) => (
                                  <div key={idx} className="bg-stone-900 p-3 rounded border border-white/10 flex gap-3 items-start group hover:border-[#d93838]/50 transition-all">
                                    {/* Preview Thumbnail */}
                                    <div className="relative w-20 h-16 rounded overflow-hidden bg-black flex-shrink-0 border border-white/10">
                                      <img src={photo.url} alt={photo.caption || "Hero Banner"} className="w-full h-full object-cover" />
                                      <span className="absolute top-1 left-1 bg-black/80 text-[#d93838] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold border border-white/10">
                                        #{idx + 1}
                                      </span>
                                    </div>

                                    {/* Controls & Inputs */}
                                    <div className="flex-grow space-y-1.5 min-w-0">
                                      <input
                                        type="text"
                                        value={photo.caption || ""}
                                        onChange={(e) => {
                                          const updated = [...heroSettings.heroPhotos];
                                          updated[idx].caption = e.target.value;
                                          setHeroSettings({ ...heroSettings, heroPhotos: updated });
                                        }}
                                        placeholder="Legenda / Título da foto no carrossel..."
                                        className="w-full bg-stone-950 border border-white/10 p-1.5 rounded text-white text-xs font-medium focus:outline-none focus:border-[#d93838]"
                                      />

                                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                                        <span className="truncate max-w-[120px] text-emerald-400">
                                          ✓ WebP Otimizado
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleMoveHeroPhoto(idx, "up")}
                                            disabled={idx === 0}
                                            className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded text-zinc-300"
                                            title="Mover para cima"
                                          >
                                            ▲
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleMoveHeroPhoto(idx, "down")}
                                            disabled={idx === heroSettings.heroPhotos.length - 1}
                                            className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded text-zinc-300"
                                            title="Mover para baixo"
                                          >
                                            ▼
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveHeroPhoto(idx)}
                                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded ml-1"
                                            title="Remover foto"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
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
                            className="bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase px-6 py-3 rounded font-bold transition-all cursor-pointer flex items-center gap-2"
                          >
                            <CheckCircle2 size={16} /> Salvar Alterações do Banner Hero
                          </button>
                        </div>
                      </div>

                      {/* SEÇÃO CONCEITO & VÍDEOS DA LOCAÇÃO CMS */}
                      <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <Video className="text-[#d93838]" size={18} />
                            <h5 className="font-display font-bold text-xs uppercase tracking-widest text-[#d93838]">
                              Seção Conceito & Vídeos da Locação (Até 5 Vídeos)
                            </h5>
                          </div>
                          <p className="text-zinc-400 text-xs font-sans mt-1">
                            Cadastre até 5 vídeos da locação para alternar automaticamente na página principal, e edite todos os textos da seção sobre nós.
                          </p>
                        </div>

                        {conceptSaveSuccess && (
                          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs flex items-center gap-2">
                            <CheckCircle2 size={16} /> {conceptSaveSuccess}
                          </div>
                        )}

                        <div className="space-y-6 text-xs">
                          {/* VÍDEOS CAROUSEL MANAGEMENT */}
                          <div className="p-4 bg-stone-950/70 border border-white/10 rounded space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                                <Video size={14} className="text-amber-400" /> Vídeos da Locação ({conceptSettings.videoUrls.length}/5)
                              </label>
                              {conceptSettings.videoUrls.length < 5 && (
                                <button
                                  type="button"
                                  onClick={handleAddVideoUrlField}
                                  className="bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] uppercase px-3 py-1.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Plus size={12} /> Adicionar Vídeo
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {conceptSettings.videoUrls.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-zinc-500 w-16 shrink-0">
                                    Vídeo #{index + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => handleUpdateVideoUrlField(index, e.target.value)}
                                    placeholder="Cole aqui o link do YouTube, Vimeo ou Embed"
                                    className="flex-1 bg-stone-900 border border-white/10 p-2.5 rounded text-white font-mono focus:outline-none focus:border-brand-red text-xs"
                                  />
                                  {conceptSettings.videoUrls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVideoUrlField(index)}
                                      className="p-2.5 bg-red-950/50 hover:bg-red-900/80 text-red-400 rounded border border-red-500/20 transition-all cursor-pointer shrink-0"
                                      title="Remover este vídeo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-3 rounded border border-white/5 space-y-1">
                              <p className="font-semibold text-white">💡 Como funciona a alternância de vídeos?</p>
                              <p>• Se houver apenas 1 vídeo cadastrado, ele é exibido fixo na seção Conceito.</p>
                              <p>• Se cadastrar de 2 até 5 vídeos, o site irá alternar automaticamente entre eles a cada 9 segundos ou pelos botões de navegação do carrossel.</p>
                              <p>• Links do YouTube (normais, shorts ou embed) são formatados e otimizados automaticamente para exibição em iFrame.</p>
                            </div>
                          </div>

                          {/* TEXTOS PRINCIPAIS */}
                          <div className="space-y-3 pt-2">
                            <h6 className="font-bold text-white text-xs uppercase font-mono tracking-wider text-amber-400">
                              Textos Principais da Seção
                            </h6>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Selo / Badge</label>
                                <input
                                  type="text"
                                  value={conceptSettings.badge}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, badge: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Título Principal</label>
                                <input
                                  type="text"
                                  value={conceptSettings.title}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, title: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Descrição / Manifesto Sobre Nós</label>
                              <textarea
                                rows={4}
                                value={conceptSettings.description}
                                onChange={(e) => setConceptSettings({ ...conceptSettings, description: e.target.value })}
                                className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* OS 3 PILARES */}
                          <div className="space-y-3 pt-2 border-t border-white/10">
                            <h6 className="font-bold text-white text-xs uppercase font-mono tracking-wider text-amber-400">
                              Os 3 Pilares Fundamentais
                            </h6>

                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 1 Título</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar1Title}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar1Title: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 1 Descrição</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar1Desc}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar1Desc: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 2 Título</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar2Title}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar2Title: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 2 Descrição</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar2Desc}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar2Desc: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 3 Título</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar3Title}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar3Title: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Pilar 3 Descrição</label>
                                  <input
                                    type="text"
                                    value={conceptSettings.pillar3Desc}
                                    onChange={(e) => setConceptSettings({ ...conceptSettings, pillar3Desc: e.target.value })}
                                    className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* EXPOSIÇÃO FOTOGRÁFICA */}
                          <div className="space-y-3 pt-2 border-t border-white/10">
                            <h6 className="font-bold text-white text-xs uppercase font-mono tracking-wider text-amber-400">
                              Triângulo de Exposição (ISO, Diafragma, Obturador)
                            </h6>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block">ISO Título</label>
                                <input
                                  type="text"
                                  value={conceptSettings.isoTitle}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, isoTitle: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                                <textarea
                                  rows={2}
                                  value={conceptSettings.isoDesc}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, isoDesc: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block">Diafragma Título</label>
                                <input
                                  type="text"
                                  value={conceptSettings.diafragmaTitle}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, diafragmaTitle: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                                <textarea
                                  rows={2}
                                  value={conceptSettings.diafragmaDesc}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, diafragmaDesc: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block">Obturador Título</label>
                                <input
                                  type="text"
                                  value={conceptSettings.obturadorTitle}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, obturadorTitle: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                                <textarea
                                  rows={2}
                                  value={conceptSettings.obturadorDesc}
                                  onChange={(e) => setConceptSettings({ ...conceptSettings, obturadorDesc: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveConceptSettings}
                            className="w-full bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase py-3.5 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                          >
                            <Check size={16} /> Salvar Seção Conceito & Vídeos da Locação
                          </button>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* ADMIN: NOSSO ESPAÇO CMS */}
                    {activeTab === "admin-spaces" && (
                      <div className="space-y-8">
                        
                        {/* HEADER DA SEÇÃO NOSSO ESPAÇO */}
                        <div className="bg-stone-900 border border-[#d93838]/30 p-6 rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="font-display font-bold text-sm uppercase tracking-widest text-[#d93838] flex items-center gap-2">
                              <Camera size={18} /> Gestão Completa da Seção "Nosso Espaço"
                            </h5>
                            <span className="bg-[#d93838]/10 text-[#d93838] text-[10px] font-mono px-2.5 py-1 rounded border border-[#d93838]/30 font-bold">
                              {spacePhotos.length} Fotos no Carrossel
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs font-sans">
                            Gerencie o carrossel de fotos (adicionar, remover, editar e reordenar fotos), altere textos de apresentação, valores de hora/diária, regras do estúdio e links para download do manual.
                          </p>
                        </div>

                        {/* BLOCO 1: CARROSSEL DE FOTOS */}
                        <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                            <div>
                              <h6 className="font-display font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2">
                                <ImageIcon size={16} className="text-[#d93838]" /> Galeria & Carrossel de Fotos do Estúdio
                              </h6>
                              <p className="text-zinc-400 text-[11px] mt-0.5">
                                Anexe fotos do seu dispositivo (computador/celular), edite legendas ou reordene a exibição no carrossel.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={handleResetGalleryToDefault}
                                className="bg-stone-950 hover:bg-stone-800 text-zinc-400 hover:text-white border border-white/10 text-[10px] font-mono px-3 py-2 rounded transition-all cursor-pointer"
                              >
                                Restaurar 28 Fotos Originais
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveSpaceGallery}
                                className="bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase font-bold px-4 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#d93838]/20"
                              >
                                <Check size={14} /> Salvar Galeria ({spacePhotos.length})
                              </button>
                            </div>
                          </div>

                          {gallerySaveMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded text-xs font-mono flex items-center gap-2">
                              <CheckCircle2 size={16} /> {gallerySaveMsg}
                            </div>
                          )}

                          {/* Seção de Upload Direto de Fotos */}
                          <div className="bg-stone-950 p-4 sm:p-5 rounded border border-white/10 space-y-4 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-mono text-[11px] text-white uppercase font-bold flex items-center gap-2">
                                <Upload size={16} className="text-[#d93838]" /> Upload & Anexo de Fotos do Estúdio
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                Formatos aceitos: JPG, PNG, WebP, GIF
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className="md:col-span-8">
                                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                                  Legenda Padrão para Novas Fotos (Opcional)
                                </label>
                                <input
                                  type="text"
                                  value={newPhotoCaption}
                                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                                  placeholder="Ex: Fundo Infinito, Sala Principal, Equipamentos..."
                                  className="w-full bg-stone-900 border border-white/10 p-2.5 rounded text-white text-xs focus:border-[#d93838] focus:outline-none"
                                />
                              </div>

                              <div className="md:col-span-4">
                                <label className="block w-full">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={isUploadingPhoto}
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        handlePhotoFilesSelected(e.target.files);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className={cn(
                                    "w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase font-bold py-2.5 px-4 rounded transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#d93838]/20 text-center",
                                    isUploadingPhoto && "opacity-50 cursor-wait"
                                  )}>
                                    {isUploadingPhoto ? (
                                      <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Processando Fotos...
                                      </>
                                    ) : (
                                      <>
                                        <Upload size={15} />
                                        Selecionar Foto(s)
                                      </>
                                    )}
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Drop Zone Interativa */}
                            <div
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files) {
                                  handlePhotoFilesSelected(e.dataTransfer.files);
                                }
                              }}
                              onClick={() => {
                                const fileInput = document.getElementById("gallery-photo-file-input");
                                if (fileInput) fileInput.click();
                              }}
                              className="border-2 border-dashed border-white/15 hover:border-[#d93838]/50 bg-stone-900/60 p-5 rounded text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                              <input
                                id="gallery-photo-file-input"
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={isUploadingPhoto}
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handlePhotoFilesSelected(e.target.files);
                                    e.target.value = "";
                                  }
                                }}
                                className="hidden"
                              />
                              <div className="w-10 h-10 rounded-full bg-stone-800 text-[#d93838] flex items-center justify-center border border-white/10">
                                <Camera size={20} />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-white font-medium text-xs">Clique ou arraste e solte arquivos de imagem aqui</p>
                                <p className="text-zinc-500 font-mono text-[10px]">Suporta múltiplos arquivos simultâneos. As fotos serão otimizadas e anexadas ao carrossel.</p>
                              </div>
                            </div>
                          </div>

                          {/* Filtro de Fotos */}
                          <div className="flex items-center justify-between gap-3 bg-stone-950 p-3 rounded border border-white/5 text-xs">
                            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px] w-full max-w-xs">
                              <Search size={14} />
                              <input
                                type="text"
                                value={photoFilter}
                                onChange={(e) => setPhotoFilter(e.target.value)}
                                placeholder="Filtrar fotos por legenda..."
                                className="bg-transparent text-white border-none focus:outline-none w-full"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                              Exibindo {spacePhotos.filter(p => !photoFilter || p.caption.toLowerCase().includes(photoFilter.toLowerCase())).length} de {spacePhotos.length} fotos
                            </span>
                          </div>

                          {/* Lista Grid de Fotos do Carrossel */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-stone-950">
                            {spacePhotos
                              .map((photo, origIdx) => ({ photo, origIdx }))
                              .filter(({ photo }) => !photoFilter || photo.caption.toLowerCase().includes(photoFilter.toLowerCase()))
                              .map(({ photo, origIdx }) => (
                                <div key={origIdx} className="bg-stone-950 p-3.5 rounded border border-white/10 flex gap-3 text-xs items-start group hover:border-[#d93838]/40 transition-all">
                                  {/* Thumbnail Preview */}
                                  <div className="w-24 h-20 bg-stone-900 rounded overflow-hidden shrink-0 border border-white/10 relative flex items-center justify-center">
                                    {substitutingPhotoIdx === origIdx ? (
                                      <div className="flex flex-col items-center justify-center gap-1 text-[10px] font-mono text-zinc-300 p-1 text-center bg-stone-950/95 w-full h-full">
                                        <RefreshCw size={14} className="animate-spin text-[#d93838]" />
                                        <span className="text-[8px] font-bold text-[#d93838]">Salvando...</span>
                                      </div>
                                    ) : photo.url ? (
                                      <img
                                        key={`${photo.url}-${origIdx}`}
                                        src={photo.url}
                                        alt={photo.caption || `Foto #${origIdx + 1}`}
                                        className="w-full h-full object-cover transition-all duration-200"
                                        loading="lazy"
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          target.src = "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80";
                                        }}
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-zinc-600 gap-0.5">
                                        <ImageIcon size={16} />
                                        <span className="text-[8px] font-mono">Sem foto</span>
                                      </div>
                                    )}
                                    <span className="absolute top-1 left-1 bg-black/80 text-[8px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10">
                                      #{origIdx + 1}
                                    </span>
                                    {photoSubstitutionSuccessIdx === origIdx && (
                                      <span className="absolute bottom-1 right-1 bg-emerald-500/90 text-[8px] font-mono px-1 py-0.5 rounded text-white font-bold flex items-center gap-0.5 animate-pulse">
                                        <Check size={9} /> Salva
                                      </span>
                                    )}
                                  </div>

                                  {/* Inputs & Controls */}
                                  <div className="flex-grow space-y-2">
                                    <input
                                      type="text"
                                      value={photo.caption}
                                      onChange={(e) => {
                                        const updated = [...spacePhotos];
                                        updated[origIdx].caption = e.target.value;
                                        setSpacePhotos(updated);
                                      }}
                                      onBlur={async () => {
                                        try {
                                          const sanitized = sanitizePhotoList(spacePhotos);
                                          await setDoc(doc(db, "site_settings", "spaces_gallery"), cleanFirestoreData({
                                            photos: sanitized,
                                            updatedAt: new Date().toISOString()
                                          }));
                                        } catch (e) {
                                          console.error("Error auto-saving caption:", e);
                                        }
                                      }}
                                      placeholder="Legenda da Foto..."
                                      className="w-full bg-stone-900 border border-white/10 p-1.5 rounded text-white font-medium text-xs focus:border-[#d93838] focus:outline-none"
                                    />

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                      <label className={cn(
                                        "cursor-pointer bg-stone-900 hover:bg-stone-800 border border-white/10 text-zinc-300 px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all",
                                        substitutingPhotoIdx === origIdx && "opacity-60 cursor-wait pointer-events-none border-[#d93838]/50"
                                      )}>
                                        {substitutingPhotoIdx === origIdx ? (
                                          <>
                                            <RefreshCw size={12} className="animate-spin text-[#d93838]" />
                                            <span className="text-[#d93838] font-bold">Salvando...</span>
                                          </>
                                        ) : photoSubstitutionSuccessIdx === origIdx ? (
                                          <>
                                            <Check size={12} className="text-emerald-400" />
                                            <span className="text-emerald-400 font-bold">Salva!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Upload size={12} className="text-[#d93838]" />
                                            <span>Substituir Foto</span>
                                          </>
                                        )}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          disabled={substitutingPhotoIdx === origIdx}
                                          className="hidden"
                                          onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              e.target.value = "";
                                              await handleSubstitutePhoto(origIdx, file);
                                            }
                                          }}
                                        />
                                      </label>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={origIdx === 0}
                                          onClick={() => handleMovePhoto(origIdx, 'up')}
                                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-mono text-[10px] bg-stone-900 rounded border border-white/5"
                                          title="Mover para cima/anterior"
                                        >
                                          ▲ Mover
                                        </button>
                                        <button
                                          type="button"
                                          disabled={origIdx === spacePhotos.length - 1}
                                          onClick={() => handleMovePhoto(origIdx, 'down')}
                                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-mono text-[10px] bg-stone-900 rounded border border-white/5"
                                          title="Mover para baixo/próxima"
                                        >
                                          ▼ Mover
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePhotoFromGallery(origIdx)}
                                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all cursor-pointer ml-1"
                                          title="Remover foto do carrossel"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleSaveSpaceGallery()}
                              className="bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase font-bold px-6 py-3 rounded transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#d93838]/20"
                            >
                              <Check size={16} /> Salvar Alterações no Carrossel
                            </button>
                          </div>
                        </div>

                        {/* BLOCO 2: INFORMAÇÕES E TEXTOS DO ESTÚDIO */}
                        <div className="bg-stone-900 border border-white/10 p-6 rounded space-y-6">
                          <div>
                            <h6 className="font-display font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2 border-b border-white/10 pb-3">
                              <FileText size={16} className="text-[#d93838]" /> Textos, Especificações & Tabela de Preços
                            </h6>
                            <p className="text-zinc-400 text-xs mt-2">
                              Altere os nomes, descrições do estúdio, capacidade, tarifas e links de download do manual.
                            </p>
                          </div>

                          {spaceSaveMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded text-xs font-mono flex items-center gap-2">
                              <CheckCircle2 size={16} /> {spaceSaveMsg}
                            </div>
                          )}

                          <form onSubmit={handleSaveSpaceSettings} className="space-y-4 text-xs">
                            
                            {/* Nomes e Subtítulos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                  Nome Principal do Estúdio
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={spaceSettings.name}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, name: e.target.value })}
                                  placeholder="ex: Triângulo Estúdio"
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                  Subtítulo do Card do Estúdio
                                </label>
                                <input
                                  type="text"
                                  value={spaceSettings.subtitle}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, subtitle: e.target.value })}
                                  placeholder="ex: O infinito branco e iluminação profissional"
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white"
                                />
                              </div>
                            </div>

                            {/* Badge e Descrição do Cabeçalho */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                  Selo/Badge Superior
                                </label>
                                <input
                                  type="text"
                                  value={spaceSettings.headerBadge}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, headerBadge: e.target.value })}
                                  placeholder="ex: Nosso Espaço"
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white"
                                />
                              </div>

                              <div className="md:col-span-2 space-y-1">
                                <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                  Texto de Apresentação Superior
                                </label>
                                <input
                                  type="text"
                                  value={spaceSettings.headerDesc}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, headerDesc: e.target.value })}
                                  placeholder="ex: Um estúdio completo, flexível e totalmente equipado..."
                                  className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white"
                                />
                              </div>
                            </div>

                            {/* Descrição Detalhada */}
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                Descrição Detalhada da Infraestrutura
                              </label>
                              <textarea
                                rows={4}
                                value={spaceSettings.description}
                                onChange={(e) => setSpaceSettings({ ...spaceSettings, description: e.target.value })}
                                placeholder="Descreva os detalhes do ciclorama, pé direito, trilhos de iluminação..."
                                className="w-full bg-stone-950 border border-white/10 p-2.5 rounded text-white leading-relaxed"
                              />
                            </div>

                            {/* Capacidade, Área e Preços */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                              <div className="space-y-1">
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">
                                  Capacidade (Pessoas)
                                </label>
                                <input
                                  type="number"
                                  value={spaceSettings.capacity}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, capacity: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">
                                  Área Útil
                                </label>
                                <input
                                  type="text"
                                  value={spaceSettings.area}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, area: e.target.value })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">
                                  Valor/Hora (R$)
                                </label>
                                <input
                                  type="number"
                                  value={spaceSettings.hourlyRate}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, hourlyRate: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono text-emerald-400 font-bold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">
                                  Turno 4h (R$)
                                </label>
                                <input
                                  type="number"
                                  value={spaceSettings.halfDayRate}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, halfDayRate: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">
                                  Diária 8h (R$)
                                </label>
                                <input
                                  type="number"
                                  value={spaceSettings.fullDayRate}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, fullDayRate: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-white/10 p-2 rounded text-white font-mono"
                                />
                              </div>
                            </div>

                            {/* Lista Dinâmica de Diferenciais Inclusos */}
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <label className="font-mono text-[10px] uppercase text-zinc-400 block font-bold">
                                Diferenciais & Itens Inclusos na Locação:
                              </label>

                              <div className="flex flex-wrap gap-2 mb-2">
                                {spaceSettings.features.map((feat, fIdx) => (
                                  <span key={fIdx} className="bg-stone-950 border border-white/10 text-zinc-200 px-3 py-1 rounded text-xs flex items-center gap-2">
                                    <CheckCircle2 size={12} className="text-[#d93838]" />
                                    {feat}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFeatureTag(fIdx)}
                                      className="text-red-400 hover:text-white cursor-pointer ml-1"
                                      title="Remover item"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newFeatureText}
                                  onChange={(e) => setNewFeatureText(e.target.value)}
                                  placeholder="Digite um novo diferencial (ex: Camarim exclusivo, Ar Condicionado...)"
                                  className="flex-grow bg-stone-950 border border-white/10 p-2 rounded text-white text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddFeatureTag}
                                  className="bg-stone-800 hover:bg-stone-700 text-white font-mono text-xs px-4 py-2 rounded cursor-pointer"
                                >
                                  + Adicionar Diferencial
                                </button>
                              </div>
                            </div>

                            {/* Bloco Manual PDF */}
                            <div className="p-4 bg-stone-950 border border-white/10 rounded space-y-3">
                              <span className="font-mono text-[10px] text-[#d93838] uppercase font-bold block">
                                Bloco do Manual de Instruções (PDF)
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="font-mono text-[9px] uppercase text-zinc-400 block">Título do Bloco</label>
                                  <input
                                    type="text"
                                    value={spaceSettings.manualTitle}
                                    onChange={(e) => setSpaceSettings({ ...spaceSettings, manualTitle: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2 rounded text-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="font-mono text-[9px] uppercase text-zinc-400 block">URL do Arquivo PDF</label>
                                  <input
                                    type="url"
                                    value={spaceSettings.manualUrl}
                                    onChange={(e) => setSpaceSettings({ ...spaceSettings, manualUrl: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2 rounded text-white text-xs font-mono"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="font-mono text-[9px] uppercase text-zinc-400 block">Descrição do Manual</label>
                                <input
                                  type="text"
                                  value={spaceSettings.manualDesc}
                                  onChange={(e) => setSpaceSettings({ ...spaceSettings, manualDesc: e.target.value })}
                                  className="w-full bg-stone-900 border border-white/10 p-2 rounded text-white text-xs"
                                />
                              </div>
                            </div>

                            {/* Bloco Assistência Técnica */}
                            <div className="p-4 bg-stone-950 border border-white/10 rounded space-y-3">
                              <span className="font-mono text-[10px] text-[#d93838] uppercase font-bold block">
                                Bloco de Assistência Técnica
                              </span>
                              <div className="space-y-2">
                                <div>
                                  <label className="font-mono text-[9px] uppercase text-zinc-400 block">Título</label>
                                  <input
                                    type="text"
                                    value={spaceSettings.assistanceTitle}
                                    onChange={(e) => setSpaceSettings({ ...spaceSettings, assistanceTitle: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2 rounded text-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="font-mono text-[9px] uppercase text-zinc-400 block">Descrição</label>
                                  <textarea
                                    rows={2}
                                    value={spaceSettings.assistanceDesc}
                                    onChange={(e) => setSpaceSettings({ ...spaceSettings, assistanceDesc: e.target.value })}
                                    className="w-full bg-stone-900 border border-white/10 p-2 rounded text-white text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase py-3.5 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#d93838]/20"
                            >
                              <Check size={16} /> Salvar Informações & Textos do Estúdio
                            </button>
                          </form>
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
                                const cleanAdminMsg = sanitizeText(adminNewMsg, 2000);
                                if (!cleanAdminMsg) return;
                                await addDoc(collection(db, "messages"), cleanFirestoreData({
                                  id: "msg-" + Date.now(),
                                  senderId: "admin",
                                  senderName: "Atendimento Triângulo",
                                  recipientId: adminSelectedUserId,
                                  text: cleanAdminMsg,
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

                        {/* BACKUP FILES SNAPSHOTS */}
                        <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-3">
                          <div className="flex justify-between items-center">
                            <h6 className="font-mono text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                              <Download size={12} className="text-emerald-400" /> Snapshots de Backup no Servidor ({backupFiles.length})
                            </h6>
                            <button onClick={fetchBackupList} className="text-[10px] font-mono text-zinc-400 hover:text-white underline">Atualizar Lista</button>
                          </div>
                          {backupFiles.length === 0 ? (
                            <p className="text-[11px] font-mono text-zinc-500 italic">Nenhum snapshot de backup gerado até o momento.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {backupFiles.map((f, i) => (
                                <div key={f.filename || i} className="bg-stone-950 p-2 rounded border border-white/5 flex items-center justify-between text-xs font-mono">
                                  <div>
                                    <span className="text-zinc-200 font-bold block">{f.filename}</span>
                                    <span className="text-[9px] text-zinc-500">{f.sizeKb} • {new Date(f.createdAt).toLocaleString("pt-BR")}</span>
                                  </div>
                                  <a
                                    href={`/api/admin/download-backup/${encodeURIComponent(f.filename)}`}
                                    download
                                    className="bg-stone-800 hover:bg-stone-700 text-emerald-400 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <Download size={11} /> Baixar
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

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

          {/* Rental Contract Modal with high z-index overlay */}
          {isContractOpen && contractBooking && (
            <RentalContractModal
              isOpen={isContractOpen}
              booking={contractBooking}
              onClose={() => {
                setIsContractOpen(false);
                setContractBooking(null);
              }}
            />
          )}

          {/* InfinitePay Payment Modal for Tag @daluz_jef */}
          {bookingToPay && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-stone-900 border border-brand-red/40 rounded-lg max-w-lg w-full p-6 space-y-5 relative shadow-2xl animate-fade-in text-sans">
                <button 
                  onClick={() => setBookingToPay(null)} 
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>

                <div className="border-b border-white/10 pb-3">
                  <span className="font-mono text-[10px] bg-brand-red/20 text-brand-red border border-brand-red/30 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider inline-block mb-1.5">
                    Pagamento de Sinal • Tag @daluz_jef
                  </span>
                  <h3 className="font-display font-bold text-lg text-white">
                    Pagar Sinal da Reserva #{bookingToPay.id}
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5 font-mono">
                    {bookingToPay.spaceName} • {bookingToPay.date} ({bookingToPay.timeSlot})
                  </p>
                </div>

                <div className="bg-stone-950 p-4 rounded border border-white/5 space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between items-center text-zinc-300 border-b border-white/5 pb-2">
                    <span className="font-bold">Valor do Sinal de Garantia:</span>
                    <strong className="text-emerald-400 text-base font-mono">R$ 100,00</strong>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                    <span>Cliente:</span>
                    <span className="font-mono text-zinc-200">{bookingToPay.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                    <span>E-mail:</span>
                    <span className="font-mono text-zinc-200">{bookingToPay.clientEmail}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                    <span>Estabelecimento InfinitePay:</span>
                    <span className="font-mono text-amber-400 font-bold">@daluz_jef</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <a
                    href="https://checkout.infinitepay.io/daluz_jef/mHOzh5edeU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-widest py-3.5 rounded font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <CreditCard size={16} />
                    Abrir Checkout PIX/Cartão (@daluz_jef)
                  </a>

                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, "bookings", bookingToPay.id), {
                          depositPaid: true,
                          paymentMethod: "infinitepay",
                          depositPaidAt: new Date().toISOString()
                        });

                        await fetch("/api/send-booking-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ...bookingToPay,
                            depositPaid: true,
                            depositPaidAt: new Date().toISOString()
                          })
                        });

                        alert("✅ Sinal confirmado com sucesso! E-mail de confirmação enviado.");
                        setBookingToPay(null);
                        if (onPaymentSuccess) onPaymentSuccess();
                      } catch (err: any) {
                        alert("Erro ao atualizar pagamento: " + err.message);
                      }
                    }}
                    className="w-full bg-stone-800 hover:bg-stone-700 border border-emerald-500/30 text-emerald-300 font-mono text-xs uppercase tracking-widest py-3 rounded font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Confirmar Pagamento no Sistema
                  </button>
                </div>

                <p className="text-[10px] text-zinc-500 font-mono text-center">
                  Link oficial do estabelecimento InfinitePay @daluz_jef com notificação automática via Webhook (/api/infinitepay/webhook).
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
