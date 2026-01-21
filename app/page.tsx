"use client";

import { useEffect, useState, useRef } from "react";
import { useLicense } from './hooks/useLicense';
import { PaywallGuard, UnlockModal } from './components/PaywallGuard';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- HELPER: Merge Tailwind Classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- COMPONENT: The "Living" Aura Background (No Squares Fix) ---
const AuroraBackground = ({ darkmode }: { darkmode: boolean }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
      
      {/* 1. Base Layer */}
      <div 
        className={cn("absolute inset-0 transition-all duration-1000", !darkmode && "bg-[#f8fafc]")}
        style={darkmode ? { background: "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 50%, #020617 100%)" } : {}}
      />
      
      {/* 2. Floating Blobs (Switched to Radial Gradients to remove square edges) */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [0, 50, -50, 0], y: [0, -50, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full transition-opacity duration-1000"
        style={{
          background: darkmode 
            ? "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(0,0,0,0) 70%)" // Cyan Glow
            : "radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, rgba(255,255,255,0) 70%)" // Blue Watercolor
        }}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], rotate: [0, -60, 0], x: [0, -30, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
        className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full transition-opacity duration-1000"
        style={{
          background: darkmode 
            ? "radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(0,0,0,0) 70%)" // Purple Glow
            : "radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, rgba(255,255,255,0) 70%)" // Purple Watercolor
        }}
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 0], y: [0, 100, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
        className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full transition-opacity duration-1000"
        style={{
          background: darkmode 
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%)" // Blue Glow
            : "radial-gradient(circle, rgba(94, 234, 212, 0.4) 0%, rgba(255,255,255,0) 70%)" // Teal Watercolor
        }}
      />
    </div>
  );
};

// --- COMPONENT: The "Squishy" Vibe Bubble (Shadow Fix) ---
const VibeBubble = ({ label, icon, onClick, active, darkmode }: any) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={cn(
      "relative group flex flex-col items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full backdrop-blur-md border transition-all duration-300",
      // ACTIVE STATE
      active 
        ? (darkmode 
            ? "bg-white/20 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.3)]" // Dark Mode Active
            : "bg-blue-50 border-blue-500 text-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]" // Light Mode Active
          )
        : (darkmode
            ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20" // Dark Mode Inactive
            : "bg-white border-slate-200 text-slate-600 shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:border-slate-300" // Light Mode Inactive (ADDED SHADOW HERE)
          )
    )}
  >
    <span className="text-3xl mb-1">{icon}</span>
    <span className={cn(
      "text-xs font-black uppercase tracking-widest transition-colors", 
      darkmode ? "text-white/90" : "text-slate-900" 
    )}>{label}</span>
    
    {/* Inner "Liquid" Shine */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.button>
);

/* =====================================================
   TYPES & DATA TEMPLATES
===================================================== */
type EnergyLevel = "low" | "medium" | "high";

type Choice = { 
  label: string; 
  details?: string; 
  vid?: string; 
  energy: EnergyLevel; 
};

type Category = {
  name: string; 
  choices: Choice[];
  timerEnabled?: boolean; // Executive Control
  videoEnabled?: boolean; // Executive Control
};

type HistoryItem = {
  label: string;
  category: string;
  date: string;
  energy: EnergyLevel;
};

type AppSettings = { 
  videoMode: boolean; 
  quickStart: boolean; 
  soundEnabled: boolean; 
  darkmodeEnabled: boolean;
  textOnlyMode: boolean;
};

type YouTubeVideo = {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { medium: { url: string } };
    channelTitle: string;
  };
};

const TEMPLATES: Record<string, Choice[]> = {
  Meals: [
    { label: "PB&J / Toast", details: "Zero effort fuel.", energy: "low" },
    { label: "Cereal / Yogurt", details: "Grab and eat.", energy: "low" },
    { label: "Grilled Cheese", details: "Comfort food.", energy: "medium" }, 
    { label: "Avocado Toast", details: "Sourdough, lemon, chili.", energy: "medium" },
    { label: "Stir Fry", details: "Chop veggies, high heat.", energy: "high" },
    { label: "Homemade Pasta", details: "From scratch. You got this.", energy: "high" },
    { label: "Fancy Salad", details: "Chopping lots of ingredients.", energy: "high" }
  ],
  Tasks: [
    { label: "5-Min Tidy", details: "Clear one surface.", energy: "low" },
    { label: "Delete 5 Photos", details: "Digital declutter.", energy: "low" },
    { label: "Reply 3 Emails", details: "Clear the inbox backlog.", energy: "medium" },
    { label: "Pay 1 Bill", details: "Get it off your mind.", energy: "medium" },
    { label: "Deep Work Session", details: "90 mins. Phone away.", energy: "high" },
    { label: "Deep Clean Bathroom", details: "Scrub everything.", energy: "high" },
    { label: "Plan Entire Week", details: "Calendar blocking.", energy: "high" }
  ],
  Workouts: [
    { label: "5-Min Stretch", details: "Neck and shoulders.", energy: "low" },
    { label: "Walk Outside", details: "Just fresh air.", energy: "low" },
    { label: "Yoga Flow", details: "Sun salutations.", energy: "medium" },
    { label: "Core Blast", details: "10 mins abs.", energy: "medium" },
    { label: "HIIT Cardio", details: "Sweat session.", energy: "high" },
    { label: "Heavy Lifting", details: "Leg day.", energy: "high" },
    { label: "Run 5K", details: "Pace yourself.", energy: "high" }
  ],
  "Self-Care": [
    { label: "Drink Water", details: "Hydrate now.", energy: "low" },
    { label: "Box Breathing", details: "4-4-4-4 count.", energy: "low" },
    { label: "Read 1 Chapter", details: "Escape reality.", energy: "medium" },
    { label: "Journaling", details: "Brain dump.", energy: "medium" },
    { label: "Cold Shower", details: "Shock the system.", energy: "high" },
    { label: "Cook Fancy Meal", details: "For yourself.", energy: "high" }
  ],
};

const PROMPTS = ["What is the focus?", "Let's get it done.", "Time to lock in.", "Clear the noise.", "Momentum > Motivation."];

// Define default categories
const defaultCategories = ["Meals", "Tasks", "Workouts", "Self-Care"];
const AFFIRMATIONS = ["Nice.", "One less thing.", "You're doing great.", "Easy win.", "Crushed it.", "Level up."];

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Styles Generator
const getStyles = (isDark: boolean) => ({
  primaryBtn: `w-full ${isDark ? 'bg-white text-black' : 'bg-slate-900 text-white'} font-black py-4 px-6 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl text-sm uppercase tracking-widest`,
  secondaryBtn: `w-full ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200 shadow-md'} font-bold py-4 px-6 rounded-2xl hover:opacity-90 active:scale-95 transition-all border text-sm`,
  menuBtn: `w-full ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200 shadow-sm'} text-left font-bold py-4 px-6 rounded-2xl hover:opacity-90 active:scale-95 transition-all border flex justify-between items-center`,
  energyBtn: `flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 transition-all active:scale-95 gap-2`,
  smartBtn: `flex-1 py-3 px-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wide border transition-all active:scale-95`,
  toggleBtn: "w-12 h-6 bg-slate-400/30 rounded-full relative transition-colors duration-300",
  toggleKnob: "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm",
  randomizeBtn: "w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-500 active:scale-95 transition-all shadow-lg uppercase tracking-widest text-xs",
  addBtn: "w-full bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-500 active:scale-95 transition-all shadow-lg uppercase tracking-widest text-xs",
});


export default function DecisionApp() {
  const { status, trialHoursLeft, activateLicense } = useLicense();
  const [isUnlockModalOpen, setUnlockModalOpen] = useState(false);

  // --- CORE STATE ---
  const [appStage, setAppStage] = useState<'splash' | 'vibe' | 'main'>('splash');
  const [vibe, setVibe] = useState<'chill' | 'mid' | 'all-out'>('mid');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null);
  const [decision, setDecision] = useState<Choice | null>(null);
  
  const [isCommitted, setIsCommitted] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [streak, setStreak] = useState(0);
  const [favorites, setFavorites] = useState<YouTubeVideo[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    videoMode: true,
    quickStart: false,
    soundEnabled: true,
    darkmodeEnabled: true,
    textOnlyMode: false,
  });

  const styles = getStyles(settings.darkmodeEnabled);

  // --- STATE: Add Category ---
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // --- CONTACT FORM STATE ---
  const [contactForm, setContactForm] = useState({ email: "", type: "Suggestion", message: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  // --- UI STATES ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "edit" | "favorites" | "history" | "about">("main");
  const [showBanner, setShowBanner] = useState(false);
  const [greeting, setGreeting] = useState("HELLO.");
  const [subtext, setSubtext] = useState(PROMPTS[0]);

  // --- PLAYER STATES ---
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"shorts" | "videos">("shorts");
  const [videoList, setVideoList] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null); // New Pagination Token

  // --- TIMER STATES ---
  const [timerActive, setTimerActive] = useState(false);
  const [userMinutes, setUserMinutes] = useState(15); 
  const [timeLeft, setTimeLeft] = useState(900);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- SOUNDS ---
  const playSound = (type: 'tick' | 'bell' | 'success') => {
    if (!settings.soundEnabled) return;
    const urls = {
        tick: "https://www.soundjay.com/buttons/sounds/button-50.mp3",
        bell: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
        success: "https://www.soundjay.com/misc/sounds/magic-chime-01.mp3"
    }
    const audio = new Audio(urls[type]); 
    audio.volume = type === 'tick' ? 0.1 : 0.4;
    audio.play().catch(() => {});
  };
  
  // --- HAPTICS (Upgraded) ---
  const triggerHaptic = (type: "light" | "medium" | "success" | "error" = "light") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      switch (type) {
        case "light": 
          navigator.vibrate(10); 
          break;
        case "medium": 
          navigator.vibrate([30, 50, 30]); 
          break;
        case "success": 
          navigator.vibrate([10, 30, 10, 30]); // Double tap for success
          break;
        case "error": 
          navigator.vibrate([50, 100, 50, 100]); // Heavy double buzz for error
          break;
      }
    }
  };

  // --- EFFECTS ---
  
  // 1. Splash -> Vibe
  useEffect(() => {
    if (appStage === 'splash') {
      const timer = setTimeout(() => setAppStage('vibe'), 2500);
      return () => clearTimeout(timer);
    }
  }, [appStage]);

  // 2. Load Data
  useEffect(() => {
    const savedData = localStorage.getItem("decision-app-data");
    const savedSettings = localStorage.getItem("decision-app-settings");
    const savedStreak = localStorage.getItem("decision-app-streak");
    const lastActive = localStorage.getItem("decision-app-last-active");
    const savedFavs = localStorage.getItem("decision-app-favorites");
    const savedHistory = localStorage.getItem("decision-app-history");

    if (savedData) setCategories(JSON.parse(savedData));
    else randomizeAll(false);

    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    if (savedStreak && lastActive) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastActive === today || lastActive === yesterday) setStreak(Number(savedStreak));
        else setStreak(0);
    }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("GOOD MORNING");
    else if (hour < 17) setGreeting("HEY THERE");
    else setGreeting("GOOD EVENING");

    const interval = setInterval(() => {
      setSubtext(prev => PROMPTS[(PROMPTS.indexOf(prev) + 1) % PROMPTS.length]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 3. Save Data
  useEffect(() => {
    if (categories.length > 0) localStorage.setItem("decision-app-data", JSON.stringify(categories));
    localStorage.setItem("decision-app-settings", JSON.stringify(settings));
    localStorage.setItem("decision-app-favorites", JSON.stringify(favorites));
    localStorage.setItem("decision-app-history", JSON.stringify(history));
  }, [categories, settings, favorites, history]);


 /* =====================================================
     API FETCHING LOGIC (With #shorts text fix)
  ===================================================== */
  const fetchYouTubeVideos = async (queryTerm: string, type: "shorts" | "videos", pageToken: string | null = null, append = false) => {
    if (!queryTerm || settings.textOnlyMode) return;
    setLoadingVideos(true);
    
    // Determine context based on category name
    const context = selectedCategory?.name === "Workouts" ? "workout" : "tutorial";
    
    // 1. DURATION FILTER: Force "Medium" for Videos, "Short" for Shorts
    const durationParam = type === "shorts" ? "short" : "medium"; 

    // 2. TEXT FILTER: Add "#shorts" to the text query for better accuracy
    const textQuery = type === "shorts" 
      ? `${queryTerm} ${context} #shorts` 
      : `${queryTerm} ${context}`;
    
    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(textQuery)}&duration=${durationParam}&pageToken=${pageToken || ""}`
      );
      const data = await res.json();
      
      if (data.items) {
        // Filter out any results that don't have a valid ID (sometimes happens)
        const validItems = data.items.filter((item: any) => item.id?.videoId);
        setVideoList(prev => append ? [...prev, ...validItems] : validItems);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Initial Fetch on Player Open
  useEffect(() => {
    if (playerOpen && decision) {
      fetchYouTubeVideos(decision.label, activeTab);
    }
  }, [playerOpen, activeTab, decision]);

  const handleLoadMore = () => {
    if (decision && nextPageToken) {
        triggerHaptic();
        fetchYouTubeVideos(decision.label, activeTab, nextPageToken, true);
    }
  };

  const handleReloadVideos = () => {
    if (decision) {
        triggerHaptic("medium");
        fetchYouTubeVideos(decision.label, activeTab, null, false);
    }
  };


  /* =====================================================
     CORE APP LOGIC
  ===================================================== */
  const toggleFavorite = (video: YouTubeVideo) => {
    triggerHaptic();
    const exists = favorites.find(f => f.id.videoId === video.id.videoId);
    if (exists) {
        setFavorites(favorites.filter(f => f.id.videoId !== video.id.videoId));
    } else {
        setFavorites([...favorites, video]);
    }
  };

  const startTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerActive(false);
    } else {
      triggerHaptic("light");
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev % 1 === 0) playSound('tick'); 
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerActive(false);
            playSound('bell');
            triggerHaptic("medium");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const markTaskAsDone = () => {
    if (!decision || !selectedCategory) return;
    
    triggerHaptic("medium");
    playSound('success');
  
    // 1. Streak Logic
    const today = new Date().toDateString();
    const lastActive = localStorage.getItem("decision-app-last-active");
    
    let currentStreak = streak;
    if (lastActive !== today) {
        currentStreak = streak + 1;
        setStreak(currentStreak);
        localStorage.setItem("decision-app-streak", currentStreak.toString());
        localStorage.setItem("decision-app-last-active", today);
    }
  
    // 2. Confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff'],
      ticks: 300,
      gravity: 1.2,
      scalar: 0.9,
    });
  
    // 3. Set States
    setDoneMessage(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
    setIsDone(true);
    setIsCommitted(false);
  
    // 4. Save History
    const newHistoryItem: HistoryItem = {
      label: decision.label,
      category: selectedCategory.name,
      energy: selectedEnergy || 'medium',
      date: new Date().toLocaleString()
    };
    
    const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem("decision-app-history", JSON.stringify(updatedHistory));
  };

  const handleSmartReRoll = (type: "easier" | "harder" | "surprise") => {
    triggerHaptic();
    if (!selectedCategory) return;

    let pool = selectedCategory.choices;
    
    // Map new Vibe logic to old Energy tags
    if (type === "easier") {
      pool = selectedCategory.choices.filter(c => c.energy === "low");
      if (pool.length === 0) pool = selectedCategory.choices;
      setSelectedEnergy("low");
    } else if (type === "harder") {
      pool = selectedCategory.choices.filter(c => c.energy === "high");
      if (pool.length === 0) pool = selectedCategory.choices;
      setSelectedEnergy("high");
    } else {
      pool = selectedCategory.choices; 
    }

    const result = pool[Math.floor(Math.random() * pool.length)];
    setDecision(result);
  };

  const resetFlow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setDecision(null);
    setIsCommitted(false);
    setIsDone(false);
    setSelectedCategory(null);
    setPlayerOpen(false);
    setTimeLeft(900);
    setUserMinutes(15);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const randomizeAll = (withBanner = true) => {
    if (withBanner) triggerHaptic("medium");
    let freshData = Object.keys(TEMPLATES).map(key => {
      const shuffledChoices = shuffleArray(TEMPLATES[key]);
      return { 
          name: key, 
          choices: shuffledChoices,
          timerEnabled: true, // Default ON
          videoEnabled: true  // Default ON
      }; 
    });
    setCategories(freshData);
    if (withBanner) { setShowBanner(true); setTimeout(() => setShowBanner(false), 3000); }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus("sending");
    // Simulate API call
    setTimeout(() => {
        setContactStatus("success");
        setContactForm({ email: "", type: "Suggestion", message: "" });
    }, 1500);
  };

     // --- HELPER: Toggle TV Mode ---
  const toggleVideoMode = (catName: string) => {
    setCategories(categories.map(c => 
      c.name === catName ? { ...c, videoEnabled: !c.videoEnabled } : c
    ));
    triggerHaptic("light");
 };
  // --- MISSING FUNCTION 1: Start Adding ---
  const startAddCategory = () => {
    // Check Paywall (optional, remove check if you want it free)
    if (status !== 'full' && status !== 'trial') { 
      triggerHaptic("error"); 
      setUnlockModalOpen(true); 
      return; 
    }
    triggerHaptic("light");
    setIsAddingCat(true);
  };

  // --- MISSING FUNCTION 2: Save the Category ---
  const saveNewCategory = () => {
    if (!newCatName.trim()) {
      setIsAddingCat(false);
      return;
    }

    const newCat: Category = {
      name: newCatName,
      choices: [],
      timerEnabled: true,
      videoEnabled: true
    };

    setCategories([...categories, newCat]);
    setNewCatName("");
    setIsAddingCat(false);
    triggerHaptic("success");
  };

  // --- MISSING FUNCTION 3: Delete Category ---
  const handleDeleteCategory = (catName: string) => {
    // Protect default categories
    const protectedCats = ["Meals", "Tasks", "Workouts", "Self-Care"];
    if (protectedCats.includes(catName)) {
      triggerHaptic("error");
      return; 
    }
    
    if (confirm(`Delete "${catName}" and all its tasks?`)) {
       setCategories(categories.filter(c => c.name !== catName));
       triggerHaptic("medium");
    }
  };

  // --- HELPER: Edit Tasks Inside a Category ---
  // --- HELPER: Toggle Timer Mode ---
  const toggleTimerMode = (catName: string) => {
    setCategories(categories.map(c => 
      c.name === catName ? { ...c, timerEnabled: !c.timerEnabled } : c
    ));
    triggerHaptic("light");
 };

  const updateTaskLabel = (catName: string, taskIndex: number, newLabel: string) => {
    setCategories(categories.map(c => {
      if (c.name !== catName) return c;
      const newChoices = [...c.choices];
      newChoices[taskIndex] = { ...newChoices[taskIndex], label: newLabel };
      return { ...c, choices: newChoices };
    }));
  };

  const addTaskOption = (catName: string) => {
    setCategories(categories.map(c => {
      if (c.name !== catName) return c;
      return { ...c, choices: [...c.choices, { label: "", energy: "medium" }] };
    }));
  };

  const removeTaskOption = (catName: string, taskIndex: number) => {
    setCategories(categories.map(c => {
      if (c.name !== catName) return c;
      return { ...c, choices: c.choices.filter((_, i) => i !== taskIndex) };
    }));
  };
  /* =====================================================
     RENDER UI
  ===================================================== */
  return (
    <main className={cn(
      "min-h-screen w-full relative overflow-hidden font-sans selection:bg-cyan-500/30 transition-colors duration-1000",
      settings.darkmodeEnabled ? "text-white" : "text-slate-900"
    )}>
      
      {/* 1. THE LIVING BACKGROUND */}
      <AuroraBackground darkmode={settings.darkmodeEnabled} />

      {/* --- FOCUS DIMMER --- */}
      <div className={cn(
        "fixed inset-0 z-[5] bg-black transition-opacity duration-1000 pointer-events-none",
        timerActive ? "opacity-80" : "opacity-0"
      )} />

      {/* 2. INTRO SPLASH */}
      <AnimatePresence>
        {appStage === 'splash' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black text-white"
          >
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl md:text-7xl font-black tracking-tighter italic">DECIDE.</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="text-[10px] font-bold uppercase tracking-[0.5em] mt-4">Choices made simple</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. VIBE SELECTOR */}
      <AnimatePresence>
        {appStage === 'vibe' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -50, filter: 'blur(20px)' }}
            className="fixed inset-0 z-[190] flex flex-col items-center justify-center px-6"
          >
            <h2 className="text-3xl font-black mb-10 tracking-tight">What's the vibe?</h2>
            <div className="flex gap-4 md:gap-8">
              <VibeBubble darkmode={settings.darkmodeEnabled} icon="🧊" label="Chill" active={vibe === 'chill'} onClick={() => { setVibe('chill'); setSelectedEnergy('low'); setAppStage('main'); }} />
              <VibeBubble darkmode={settings.darkmodeEnabled} icon="⚡" label="Mid" active={vibe === 'mid'} onClick={() => { setVibe('mid'); setSelectedEnergy('medium'); setAppStage('main'); }} />
              <VibeBubble darkmode={settings.darkmodeEnabled} icon="🚀" label="All Out" active={vibe === 'all-out'} onClick={() => { setVibe('all-out'); setSelectedEnergy('high'); setAppStage('main'); }} />
            </div>
            <p className="mt-12 text-[10px] uppercase tracking-widest opacity-40 italic font-bold text-center leading-relaxed">This adjusts your energy levels & tutorials.<br/>Change anytime in Menu.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. THE MAIN APP ENGINE */}
      <AnimatePresence mode="wait">
        {appStage === 'main' && (
          <motion.div 
            key="main-engine"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen w-full flex flex-col items-center p-4"
          >
            
            {/* TRIAL BANNER */}
            {status === 'trial' && trialHoursLeft > 0 && (
              <div className="fixed top-0 left-0 w-full bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest text-center py-2 z-[150]">
                ⏳ Trial Ends in {trialHoursLeft} Hours
              </div>
            )}

            {/* HEADER */}
            <div className={cn(
              "fixed top-0 w-full max-w-xl flex justify-between items-center p-6 z-[120] transition-all duration-500",
              timerActive ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              <button onClick={() => { triggerHaptic("light"); resetFlow(); }} className="font-black text-xl md:text-2xl tracking-tighter opacity-80 hover:opacity-100">DECIDE.</button>
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                      <span className="text-orange-500">🔥</span>
                      <span className="font-bold text-xs">{streak}</span>
                  </div>
                  <button onClick={() => { triggerHaptic(); setMenuOpen(true); }} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black shadow-lg hover:scale-105 transition">MENU</button>
              </div>
            </div>

            {/* --- MENU DRAWER --- */}
            <div className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] transition-opacity duration-500", menuOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setMenuOpen(false)} />
            <div className={cn("fixed inset-y-0 right-0 w-80 shadow-2xl z-[140] transform transition-transform duration-500 ease-in-out flex flex-col backdrop-blur-3xl border-l border-white/10", menuOpen ? "translate-x-0" : "translate-x-full", settings.darkmodeEnabled ? "bg-black/60 text-white" : "bg-white/80 text-slate-900")}>
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-2xl font-black italic">{menuView === 'main' ? 'MENU' : menuView.toUpperCase()}</h2>
                  <button onClick={() => {setMenuOpen(false); setMenuView('main');}} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* MAIN MENU */}
                  {menuView === 'main' && (
                      <>
                          <button onClick={() => setMenuView('edit')} className={styles.menuBtn}><span>Edit System</span> <span className="opacity-50">→</span></button>
                          <button onClick={() => setMenuView('favorites')} className={styles.menuBtn}><span>Favorites</span> <span className="opacity-50">♥</span></button>
                          <PaywallGuard isLocked={status !== 'full' && status !== 'trial' && status !== 'dev'} triggerUnlock={() => setUnlockModalOpen(true)}>
                              <button onClick={() => setMenuView('history')} className={styles.menuBtn}><span>History</span> <span className="opacity-50">🕘</span></button>
                          </PaywallGuard>

                          <div className="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-4 mt-4">
                              {[
                                { label: "Video Mode", key: "videoMode" },
                                { label: "Sound Effects", key: "soundEnabled" },
                                { label: "Dark Mode", key: "darkmodeEnabled" }
                              ].map((item) => (
                                <div key={item.key} className="flex justify-between items-center">
                                  <span className="font-bold text-[10px] uppercase tracking-widest opacity-60">{item.label}</span>
                                  <button onClick={() => setSettings((s: any) => ({...s, [item.key]: !s[item.key]}))} className={cn(styles.toggleBtn, settings[item.key as keyof AppSettings] ? 'bg-emerald-500' : 'bg-slate-700')}>
                                      <div className={cn(styles.toggleKnob, settings[item.key as keyof AppSettings] ? 'right-1' : 'left-1')}></div>
                                  </button>
                                </div>
                              ))}
                          </div>
                          <button onClick={() => { randomizeAll(true); setMenuOpen(false); }} className="w-full py-4 mt-8 bg-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-500 transition-all">SHUFFLE EVERYTHING</button>
                          <button onClick={() => setMenuView('about')} className="text-[10px] font-bold text-slate-500 mt-6 block text-center uppercase tracking-widest">About Us</button>
                      </>
                  )}

                  {/* EDIT SYSTEM (Accordion Style + Paywall) */}
                  {menuView === 'edit' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <button onClick={() => setMenuView('main')} className="mb-4 text-xs font-bold opacity-50 hover:opacity-100 transition">← BACK</button>
                      <div className="space-y-3 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                          
                          {categories.map((cat) => (
                            <div key={cat.name} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md transition-all">
                              
                              {/* HEADER: Click to Expand */}
                              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5" onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}>
                                <span className="font-bold text-sm flex items-center gap-2">
                                  {expandedCat === cat.name ? '▼' : '▶'} {cat.name}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {/* 1. TIMER TOGGLE */}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleTimerMode(cat.name); }}
                                    className={cn("text-[10px] font-black uppercase px-2 py-1 rounded border transition-colors", cat.timerEnabled !== false ? "bg-blue-500/20 border-blue-500 text-blue-400" : "opacity-30 border-white/30")}
                                  >
                                    {cat.timerEnabled !== false ? "⏱️ ON" : "⏱️ OFF"}
                                  </button>

                                  {/* 2. TV TOGGLE */}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleVideoMode(cat.name); }}
                                    className={cn("text-[10px] font-black uppercase px-2 py-1 rounded border transition-colors", cat.videoEnabled ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "opacity-30 border-white/30")}
                                  >
                                    {cat.videoEnabled ? "📺 ON" : "📺 OFF"}
                                  </button>

                                  {/* 3. DELETE CATEGORY (Protected) */}
                                  {!defaultCategories.includes(cat.name) && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.name); }}
                                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* BODY: The Task List (Paywalled) */}
                              <AnimatePresence>
                                {expandedCat === cat.name && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: "auto", opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/10 bg-black/20"
                                  >
                                    {/* --- PAYWALL GUARD START --- */}
                                    <PaywallGuard 
                                      isLocked={!['Meals', 'Self Care', 'Self-Care'].includes(cat.name) && status !== 'full' && status !== 'trial'} 
                                      triggerUnlock={() => setUnlockModalOpen(true)}
                                    >
                                        <div className="p-4 space-y-2">
                                          {cat.choices.map((choice, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                              <span className="text-xs opacity-30 select-none">•</span>
                                              <input 
                                                className="bg-transparent text-xs font-medium w-full outline-none border-b border-transparent focus:border-blue-500/50 transition-colors pb-1"
                                                value={choice.label} 
                                                placeholder="Task name..."
                                                onChange={(e) => updateTaskLabel(cat.name, idx, e.target.value)} 
                                              />
                                              <button 
                                                className="text-[10px] text-red-400/50 hover:text-red-400 font-bold px-2"
                                                onClick={() => removeTaskOption(cat.name, idx)}
                                              >
                                                DEL
                                              </button>
                                            </div>
                                          ))}
                                          
                                          <button 
                                            onClick={() => addTaskOption(cat.name)}
                                            className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors text-emerald-400"
                                          >
                                            + Add Option
                                          </button>
                                        </div>
                                    </PaywallGuard>
                                    {/* --- PAYWALL GUARD END --- */}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}

                          {/* NEW CATEGORY INPUT (Already Protected by startAddCategory function) */}
                          {isAddingCat ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl p-2 backdrop-blur-md shadow-xl">
                              <input autoFocus type="text" placeholder="New Category Name..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 px-2 font-bold text-sm" onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()} />
                              <button onClick={saveNewCategory} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase">SAVE</button>
                              <button onClick={() => setIsAddingCat(false)} className="px-3 py-2 text-white/50 text-[10px] font-black uppercase hover:text-white">X</button>
                            </motion.div>
                          ) : (
                            <button onClick={startAddCategory} className="w-full py-4 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest">+ Add New System</button>
                          )}
                      </div>
                    </div>
                  )}
                  
                  {/* FAVORITES */}
                  {menuView === 'favorites' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <button onClick={() => setMenuView('main')} className="mb-4 text-xs font-bold text-slate-400">← BACK</button>
                      <div className="space-y-4">
                        {favorites.length === 0 ? <p className="text-xs opacity-40 italic">No favorites yet.</p> : favorites.map(vid => (
                          <div key={vid.id.videoId} className="bg-white/5 rounded-2xl overflow-hidden cursor-pointer group relative">
                            {/* The Clickable Area to Play */}
                            <div onClick={() => { setPlayingVideoId(vid.id.videoId); setPlayerOpen(true); setMenuOpen(false); }}>
                                <img src={vid.snippet.thumbnails.medium.url} className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Thumbnail" />
                                <div className="p-3 pr-12">
                                    <p className="text-[10px] font-bold line-clamp-1">{vid.snippet.title}</p>
                                </div>
                            </div>

                            {/* The Remove Button (Heart) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(vid); }}
                                className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-white hover:scale-110 transition-all z-10"
                            >
                                ♥
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HISTORY */}
                  {menuView === 'history' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setMenuView('main')} className="mb-4 text-xs font-bold opacity-50">← BACK</button>
                        {history.length === 0 ? <p className="text-xs opacity-40 italic">History is empty.</p> : history.map((item, idx) => (
                          <div key={idx} className="p-3 mb-2 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                            <div><p className="font-bold text-xs">{item.label}</p><p className="text-[8px] opacity-40 uppercase tracking-widest">{item.date}</p></div>
                            <span>{item.energy === 'low' ? '🧊' : item.energy === 'high' ? '🚀' : '⚡'}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* ABOUT US */}
                  {menuView === 'about' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setMenuView('main')} className="mb-4 text-xs font-bold opacity-50 hover:opacity-100 transition">← BACK</button>
                        <h3 className="font-black text-xl italic mb-4">About DECIDE</h3>
                        <div className="space-y-4 text-xs leading-relaxed opacity-70 font-medium">
                          <p>Tired of staring at endless options? DECIDE is your minimalist decision-making sidekick.</p>
                          <p>Whether it’s picking a quick meal, tackling a task, or squeezing in some self-care, DECIDE makes choosing simple.</p>
                        </div>
                        <div className="mt-8 mb-4 text-center">
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-wide">Have suggestions or found a bug?</p>
                          <p className="text-xs font-bold mt-1 animate-bounce">Send us a message below :) ↓</p>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                          <input className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs mb-2 outline-none focus:border-blue-500 transition-colors" placeholder="Your Email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                          <textarea className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs outline-none focus:border-blue-500 transition-colors" rows={4} placeholder="How can we help?" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} />
                          <button onClick={handleContactSubmit} className="w-full py-3 bg-white text-black font-black text-[10px] rounded-xl mt-2 uppercase hover:bg-slate-200 transition-all shadow-lg">
                            {contactStatus === 'sending' ? 'Sending...' : contactStatus === 'success' ? 'Sent!' : 'Send Message'}
                          </button>
                        </div>
                        <p className="text-[10px] opacity-30 text-center mt-6 font-bold">Version 2.0 • Made with ♥</p>
                    </div>
                  )}
              </div>
            </div>

            {/* --- MINI PLAYER (WITH LOAD MORE & RELOAD) --- */}
            <AnimatePresence>
              {playerOpen && decision && (
                <div className="fixed inset-0 top-20 z-[100] flex items-end justify-center px-4 pb-4 pointer-events-none">
                  <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }}
                    className="w-full max-w-2xl bg-[#0a0a0a] rounded-[40px] h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-white/10 pointer-events-auto"
                  >
                    <div className="p-6 flex justify-between items-center border-b border-white/5">
                      <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                          <button onClick={() => setActiveTab("shorts")} className={cn("text-[10px] font-black uppercase px-5 py-2 rounded-full transition-all", activeTab === 'shorts' ? 'bg-red-600 text-white' : 'text-slate-500')}>Shorts</button>
                          <button onClick={() => setActiveTab("videos")} className={cn("text-[10px] font-black uppercase px-5 py-2 rounded-full transition-all", activeTab === 'videos' ? 'bg-white text-black' : 'text-slate-500')}>Videos</button>
                      </div>
                      <div className="flex items-center gap-4">
                          <button onClick={handleReloadVideos} className="text-xl hover:scale-110 transition-transform">🔄</button>
                          <button onClick={() => setPlayerOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold">✕</button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {playingVideoId ? (
                        <div className="h-full flex flex-col">
                            <iframe className={cn("w-full rounded-3xl mb-4 shadow-2xl transition-all duration-500", activeTab === 'shorts' ? 'aspect-[9/16]' : 'aspect-video')} src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&playsinline=1`} allowFullScreen />
                            <button onClick={() => setPlayingVideoId(null)} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition">← Back to List</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 pb-20">
                            {videoList.map(video => (
                              <div key={video.id.videoId} className="group relative" onClick={() => setPlayingVideoId(video.id.videoId)}>
                                <img src={video.snippet.thumbnails.medium.url} className={cn("rounded-2xl object-cover w-full cursor-pointer transition-transform group-hover:scale-[1.02]", activeTab === 'shorts' ? 'aspect-[9/16]' : 'aspect-video')} alt="vid" />
                                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(video); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                                    {favorites.some(f => f.id.videoId === video.id.videoId) ? '♥' : '♡'}
                                </button>
                                <p className="text-[10px] font-bold mt-2 line-clamp-2 opacity-70 group-hover:opacity-100 transition">{video.snippet.title}</p>
                              </div>
                            ))}
                            {nextPageToken && (
                                <button 
                                  onClick={handleLoadMore} 
                                  className="col-span-2 py-4 text-[10px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition"
                                >
                                  Load More
                                </button>
                            )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* --- PHASE 1: CATEGORY SELECTION --- */}
            {!selectedCategory && !isDone && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-32 w-full max-w-sm flex flex-col items-center">
                <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-center">{greeting}</h1>
                <p className="mb-12 opacity-50 italic text-sm text-center animate-pulse">{subtext}</p>
                <div className="w-full space-y-4">
                  {categories.map((cat, i) => (
                    <PaywallGuard key={i} isLocked={!['Meals', 'Self Care', 'Self-Care'].includes(cat.name) && status !== 'full' && status !== 'trial'} triggerUnlock={() => setUnlockModalOpen(true)}>
                      <button 
                          className={cn(
                            "w-full py-6 px-8 rounded-[30px] backdrop-blur-md text-left font-bold transition-all flex justify-between items-center group active:scale-[0.98] border",
                            // LIGHT MODE vs DARK MODE STYLING
                            settings.darkmodeEnabled 
                              ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" 
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                          )}
                          onClick={() => { 
                            triggerHaptic(); 
                            setSelectedCategory(cat);
    
                            // Pick a task immediately based on the Vibe
                            let pool = cat.choices.filter(c => c.energy === selectedEnergy);
                            if (pool.length === 0) pool = cat.choices;
                            if (pool.length > 0) {
                              setDecision(pool[Math.floor(Math.random() * pool.length)]);
                            }
                          }}
                      >
                          <span className="text-lg">{cat.name}</span>
                          <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                      </button>
                    </PaywallGuard>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- PHASE 3: THE DECISION (GLASS STYLE) --- */}
            {decision && !isCommitted && !isDone && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-32 w-full max-w-sm">
                <div className="p-8 rounded-[45px] backdrop-blur-3xl bg-white/10 border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">{vibe} mode</span>
                    <span className="text-xl">{vibe === 'chill' ? '🧊' : vibe === 'all-out' ? '🚀' : '⚡'}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter">{decision.label}</h2>
                  {decision.details && <p className="mt-6 text-sm opacity-50 border-t border-white/5 pt-6 leading-relaxed">{decision.details}</p>}
                  
                  {settings.videoMode && selectedCategory?.videoEnabled !== false && (
                    <button onClick={() => setPlayerOpen(true)} className="mt-10 flex items-center gap-4 group">
                      <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:scale-110 transition-transform">▶</div>
                      <span className="text-[10px] font-black uppercase tracking-widest italic group-hover:translate-x-1 transition-transform">Watch Tutorial</span>
                    </button>
                  )}
                </div>

                <button onClick={() => { triggerHaptic("medium"); setIsCommitted(true); }} className="w-full py-6 bg-white text-black font-black rounded-full mt-8 shadow-2xl active:scale-95 transition text-xs uppercase tracking-[0.2em]">LET'S DO THIS</button>
                
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleSmartReRoll("easier")} className="flex-1 py-4 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">🧊 Chill</button>
                  <button onClick={() => handleSmartReRoll("surprise")} className="flex-1 py-4 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">🎲 Swap</button>
                  <button onClick={() => handleSmartReRoll("harder")} className="flex-1 py-4 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">🚀 All Out</button>
                </div>
                <button className="w-full mt-12 opacity-30 font-bold text-[10px] uppercase tracking-widest hover:opacity-100 transition-all" onClick={resetFlow}>Start Over</button>
              </motion.div>
            )}

            {/* PHASE 4: ACTION MODE (TIMER) */}
            {isCommitted && !isDone && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-24 flex flex-col items-center w-full max-w-sm px-4 relative z-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">{decision?.label}</h2>
                {selectedCategory?.timerEnabled !== false ? (
                  <div className="relative mb-12 w-full flex flex-col items-center">
                      
                      {/* HUGE TIMER DIGITS */}
                      <motion.div 
                        onClick={startTimer} 
                        animate={timerActive ? { scale: 1.1 } : { scale: 1 }} 
                        className={cn(
                          "cursor-pointer flex flex-col items-center justify-center transition-all duration-700", 
                          timerActive ? "text-blue-400" : "text-white"
                        )}
                      >
                          <span className="text-9xl font-black tabular-nums tracking-tighter drop-shadow-2xl leading-none">
                            {formatTime(timeLeft)}
                          </span>
                      </motion.div>

                      {/* CONTROLS (Moved Below to prevent overlap) */}
                      {!timerActive && (
                        <div className="flex items-center gap-8 mt-6 animate-in slide-in-from-top-4 fade-in">
                            <button 
                              className="w-16 h-16 rounded-full bg-white/10 border border-white/10 backdrop-blur-xl text-3xl font-light hover:bg-white/20 transition-all shadow-xl active:scale-95 flex items-center justify-center pb-2" 
                              onClick={() => { triggerHaptic(); const val = Math.max(1, userMinutes - 1); setUserMinutes(val); setTimeLeft(val * 60); }}
                            >–</button>
                            
                            <div className="text-center">
                              <span className="block text-xl font-bold">{userMinutes}</span>
                              <span className="text-[8px] uppercase tracking-widest opacity-50">Minutes</span>
                            </div>

                            <button 
                              className="w-16 h-16 rounded-full bg-white/10 border border-white/10 backdrop-blur-xl text-3xl font-light hover:bg-white/20 transition-all shadow-xl active:scale-95 flex items-center justify-center pb-2" 
                              onClick={() => { triggerHaptic(); const val = userMinutes + 1; setUserMinutes(val); setTimeLeft(val * 60); }}
                            >+</button>
                        </div>
                      )}

                      {/* STATUS TEXT */}
                      <div className="flex items-center gap-3 mt-8">
                          <div className={cn("w-2 h-2 rounded-full transition-colors", timerActive ? "bg-blue-400 animate-ping" : "bg-white/20")}></div>
                          <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">
                            {timerActive ? "Focus Mode Active" : "Tap Time to Start"}
                          </p>
                      </div>
                  </div>
                ) : (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="py-20 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center justify-center text-6xl shadow-inner mb-6">✨</div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 italic text-center">No timer needed.<br/>Enjoy the moment.</p>
                  </motion.div>
                )}
                
                {/* HIDE ACTIONS WHEN TIMER IS RUNNING FOR IMMERSION */}
                <div className={cn("w-full transition-all duration-1000", timerActive ? "opacity-0 pointer-events-none translate-y-10" : "opacity-100 translate-y-0")}>
                    <button onClick={markTaskAsDone} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[30px] shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all mb-6 text-sm uppercase tracking-widest">MARK AS DONE</button>
                    <button className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all w-full" onClick={resetFlow}>Cancel Task</button>
                </div>
                
                {/* EARLY EXIT BUTTON (Visible only when timer is running) */}
                {timerActive && (
                   <button 
                     onClick={startTimer} // <--- CHANGED from setTimerActive(false) to startTimer
                     className="mt-8 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all"
                   >
                     Pause Timer
                   </button>
                )}

              </motion.div>
            )}

            {/* PHASE 5: SUCCESS & DOPAMINE */}
            {isDone && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[160] flex flex-col items-center justify-center p-6">
                  <div className="absolute w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full" />
                  <div className="text-8xl mb-6 drop-shadow-2xl animate-bounce">🎉</div>
                  <h1 className="text-5xl font-black mb-2 tracking-tighter text-center">{doneMessage}</h1>
                  <div className="flex items-center gap-2 mb-10">
                    <span className="text-orange-500 font-bold tracking-tighter italic uppercase">Streak: {streak} days</span>
                    {streak % 7 === 0 && streak > 0 && <span className="bg-orange-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full">LEVEL UP</span>}
                  </div>
                  <button className="w-full max-w-xs py-5 bg-white text-black font-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest" onClick={resetFlow}>Do Something Else</button>
              </motion.div>
            )}

            <UnlockModal 
              isOpen={isUnlockModalOpen} 
              onClose={() => setUnlockModalOpen(false)} 
              onUnlock={activateLicense}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}