"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, Send, RotateCcw, Loader2,
  ArrowRight, Database, ExternalLink,
  Mic, MicOff, Volume2, VolumeX, Radio, AudioWaveform,
  Compass, User, Package, ShoppingCart, FileText,
  Phone, PhoneOff, PhoneCall, MessageSquare, Waves, Globe
} from "lucide-react";

interface AssistantAction {
  type: "NAVIGATE";
  path: string;
  pageTitle: string;
  description?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  action?: AssistantAction;
  timestamp: string;
  isVoice?: boolean;
}

const SUGGESTED_QUESTIONS = [
  { label: "Go to Profile", query: "Go to my profile page", tag: "Nav", icon: <User size={12} /> },
  { label: "Revenue this month", query: "How much revenue did we generate this month?", tag: "Sales" },
  { label: "Open Inventory", query: "Open the inventory page", tag: "Nav", icon: <Package size={12} /> },
  { label: "Top 5 Products", query: "What were our top 5 products this month?", tag: "Stock" },
  { label: "Go to Invoices", query: "Show me invoices", tag: "Nav", icon: <FileText size={12} /> },
  { label: "ഈ മാസത്തെ Revenue", query: "ഈ മാസം എത്ര revenue ഉണ്ടാക്കി?", tag: "മലയാളം" },
  { label: "Profile എടുക്കുക", query: "പ്രൊഫൈൽ പേജ് ഓപ്പൺ ചെയ്യുക", tag: "മലയാളം", icon: <User size={12} /> },
  { label: "Low Stock Alert", query: "Which products are low in stock?", tag: "Stock" },
];

/** Clean text for speech synthesis (strip markdown formatting & handle Gemini-style Malayalam phonetics) */
function cleanTextForSpeech(text: string): { cleaned: string; isMalayalam: boolean } {
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);

  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, "$1") // strip bold
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^[\*\-]\s+/gm, "") // strip bullets
    .replace(/•/g, "")
    .replace(/`/g, "")
    .replace(/[\(\)\[\]\{\}]/g, " ") // remove brackets for speech
    .replace(/[:;]/g, ",") // soft pauses
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ");

  if (hasMalayalam) {
    // 🌴 Gemini-Style Malayalam Spoken Phonetics:
    cleaned = cleaned
      // Convert Rupee currency format (e.g. ₹4,50,999.90 -> 4,50,999.90 രൂപ)
      .replace(/₹\s*([0-9,]+(\.[0-9]+)?)\s*(രൂപ)?/g, "$1 രൂപ")
      .replace(/₹/g, "രൂപ ")
      .replace(/(\d+)\s*%/g, "$1 ശതമാനം")
      .replace(/(\d+)\s*(nos|units|items)/gi, "$1 എണ്ണം")
      // Clean duplicate phrases
      .replace(/ഈ മാസം\s*ഈ മാസം/g, "ഈ മാസം")
      .replace(/കഴിഞ്ഞ മാസം\s*കഴിഞ്ഞ മാസം/g, "കഴിഞ്ഞ മാസം")
      .trim();
  } else {
    // English spoken formatting
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, "Rupees $1")
      .replace(/₹/g, "Rupees ")
      .replace(/(\d+)\s*%/g, "$1 percent")
      .trim();
  }

  return { cleaned, isMalayalam: hasMalayalam };
}

/** Soft telecommunication sound effects */
function playCallSound(type: "connect" | "disconnect" | "beep") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "connect") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "disconnect") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch { }
}

export function AIAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false); // 📞 Full Phone Call Telephony Mode
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<"en-IN" | "ml-IN">("ml-IN");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoVoiceOver, setAutoVoiceOver] = useState(true); // 🔊 Auto Voice Over ON by default!

  // Subtitle / Live Transcript for Call Screen
  const [callLiveSubtitle, setCallLiveSubtitle] = useState<string>("");
  const [callStateText, setCallStateText] = useState<"listening" | "thinking" | "speaking" | "idle">("idle");

  // Reference trackers
  const isVoiceInputRef = useRef(false);
  const isCallModeRef = useRef(false);
  const isMutedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const voiceLangRef = useRef<"en-IN" | "ml-IN">("ml-IN");

  // Load language preference
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("erp_voice_lang");
      if (savedLang === "en-IN" || savedLang === "ml-IN") {
        setVoiceLang(savedLang);
        voiceLangRef.current = savedLang;
      }
    } catch {}
  }, []);

  const changeVoiceLang = (lang: "en-IN" | "ml-IN") => {
    setVoiceLang(lang);
    voiceLangRef.current = lang;
    try {
      localStorage.setItem("erp_voice_lang", lang);
    } catch {}
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);

  // Synchronize state to refs for callback access
  useEffect(() => {
    isCallModeRef.current = isCallMode;
  }, [isCallMode]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);

  // Call timer
  useEffect(() => {
    if (isCallMode) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isCallMode]);

  // Format call duration (e.g. 01:24)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load and cache voices when browser is ready
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Auto-scroll to bottom when messages update in drawer
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && !isCallMode) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isCallMode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopSpeaking]);

  // High-Definition Neural Malayalam & English Voice Engine
  const speakMessage = useCallback((text: string, messageId?: string, onFinish?: () => void) => {
    if (typeof window === "undefined") {
      if (onFinish) onFinish();
      return;
    }

    stopSpeaking();

    const { cleaned, isMalayalam } = cleanTextForSpeech(text);
    if (!cleaned) {
      if (onFinish) onFinish();
      return;
    }

    // 1. Try High-Definition Neural Malayalam / English Audio Stream from /api/ai/tts
    (async () => {
      try {
        const response = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsSpeaking(true);
            setCallStateText("speaking");
            if (messageId) setSpeakingMessageId(messageId);
          };

          audio.onended = () => {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;

            // 📞 CALL MODE CONTINUOUS DUPLEX:
            if (isCallModeRef.current && !isMutedRef.current) {
              setCallStateText("listening");
              setTimeout(() => {
                startListening(true);
              }, 350);
            } else {
              setCallStateText("idle");
            }

            if (onFinish) onFinish();
          };

          audio.onerror = () => {
            console.warn("Neural audio playback error, falling back to browser speech synth");
            fallbackBrowserSynth(cleaned, isMalayalam, messageId, onFinish);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn("TTS API fetch failed, falling back to browser speech synth:", err);
      }

      // 2. Fallback to Browser Speech Synthesis
      fallbackBrowserSynth(cleaned, isMalayalam, messageId, onFinish);
    })();
  }, [stopSpeaking, availableVoices]);

  // Fallback to Web Speech Synthesis API
  const fallbackBrowserSynth = (cleaned: string, isMalayalam: boolean, messageId?: string, onFinish?: () => void) => {
    if (!("speechSynthesis" in window)) {
      if (onFinish) onFinish();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleaned);
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

    if (isMalayalam) {
      utterance.lang = "ml-IN";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const mlVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("ml") ||
          v.name.toLowerCase().includes("malayalam") ||
          v.lang.toLowerCase().includes("ml-in")
      );
      if (mlVoice) utterance.voice = mlVoice;
      else {
        const indianVoice = voices.find((v) => v.lang.toLowerCase().includes("in"));
        if (indianVoice) utterance.voice = indianVoice;
      }
    } else {
      utterance.lang = "en-IN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const enVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("en-in") ||
          v.name.toLowerCase().includes("india") ||
          v.lang.toLowerCase().startsWith("en")
      );
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCallStateText("speaking");
      if (messageId) setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      if (isCallModeRef.current && !isMutedRef.current) {
        setCallStateText("listening");
        setTimeout(() => startListening(true), 350);
      } else {
        setCallStateText("idle");
      }
      if (onFinish) onFinish();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      if (isCallModeRef.current && !isMutedRef.current) {
        setTimeout(() => startListening(true), 400);
      }
      if (onFinish) onFinish();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-Text: Initialize speech recognition
  const startListening = (fromCallMode = false) => {
    if (typeof window === "undefined") return;

    // Check secure context for mobile devices
    if (window.isSecureContext === false && window.location.hostname !== "localhost") {
      alert(
        "Mobile browsers require HTTPS or localhost for microphone access. If accessing over Wi-Fi (e.g. 192.168.x.x), please open via HTTPS or configure a secure tunnel."
      );
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari on your mobile device.");
      return;
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      // On mobile browsers, continuous=true prevents premature cutoffs while speaking Malayalam
      recognition.continuous = !fromCallMode;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = voiceLang === "ml-IN" ? "ml-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setCallStateText("listening");
        isVoiceInputRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + " ";
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        const fullTranscript = (finalStr + interimStr).trim();
        if (fullTranscript) {
          setInput(fullTranscript);
          setCallLiveSubtitle(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          alert("Microphone permission was denied. Please allow microphone access in your mobile browser settings.");
        }
        setIsListening(false);
        if (fromCallMode && isCallModeRef.current && !isMutedRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (isCallModeRef.current && !isSpeaking && !isProcessingRef.current) {
              startListening(true);
            }
          }, 600);
        }
      };

      recognition.onend = () => {
        setIsListening(false);

        // 📞 TELEPHONY AUTO-SUBMIT:
        // In call mode, as soon as the user finishes speaking, automatically dispatch!
        if (fromCallMode && isCallModeRef.current && !isProcessingRef.current) {
          const currentText = inputRef.current?.value || "";
          if (currentText.trim()) {
            handleSendMessage(currentText.trim(), true);
          } else {
            setTimeout(() => {
              if (isCallModeRef.current && !isSpeaking && !isProcessingRef.current) {
                startListening(true);
              }
            }, 300);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  /**
   * Main Send Handler
   */
  const handleSendMessage = async (queryText?: string, fromVoice?: boolean) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const wasVoice = typeof fromVoice === "boolean" ? fromVoice : isVoiceInputRef.current;
    isVoiceInputRef.current = false;

    stopSpeaking();
    stopListening();

    const userMessage: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      isVoice: wasVoice,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setCallStateText("thinking");
    setCallLiveSubtitle(textToSend);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: textToSend, history }),
      });

      const data = await res.json();

      const responseText = data.success ? data.response : (data.message || "Failed to retrieve ERP response.");
      const msgId = "msg_ai_" + Date.now();

      const assistantMessage: Message = {
        id: msgId,
        role: "assistant",
        content: responseText,
        toolsUsed: data.toolsUsed || [],
        action: data.action,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCallLiveSubtitle(responseText);

      // 🧭 Direct Screen Navigation:
      if (data.action?.type === "NAVIGATE" && data.action?.path) {
        setTimeout(() => {
          router.push(data.action.path);
        }, 300);
      }

      // 📞 TELEPHONY / VOICE OUTPUT:
      // Voice Over is automatically ON by default for all responses (and in Call Mode / voice input)
      if ((autoVoiceOver || isCallModeRef.current || wasVoice) && data.success) {
        setTimeout(() => {
          speakMessage(responseText, msgId);
        }, 250);
      } else {
        setCallStateText("idle");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          content: "I'm unable to connect to the ERP service right now. Please verify your connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setCallStateText("idle");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  /** Start Mobile Telecommunication Call Mode */
  const startCallMode = () => {
    stopSpeaking();
    stopListening();
    playCallSound("connect");
    setIsCallMode(true);
    setIsOpen(false);
    setIsMuted(false);
    setCallLiveSubtitle("Connecting live voice session...");
    setCallStateText("listening");

    // Start continuous speech listening after short connect chime
    setTimeout(() => {
      setCallLiveSubtitle("Connected. Speak your query in Malayalam or English...");
      startListening(true);
    }, 400);
  };

  /** End Mobile Call Mode */
  const endCallMode = () => {
    playCallSound("disconnect");
    stopSpeaking();
    stopListening();
    setIsCallMode(false);
    setCallStateText("idle");
    setCallLiveSubtitle("");
  };

  const handleClearChat = () => {
    stopSpeaking();
    setMessages([]);
  };

  return (
    <>
      {/* ── 1. FLOATING ACTION BUTTONS (CALL + CHAT) ── */}
      {!isCallMode && !isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5">
          {/* Direct Phone Call Button */}


          {/* Chat Drawer Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            title="Open ERP AI Assistant Drawer"
          >
            <Sparkles size={18} className="text-amber-300 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">Ask ERP AI</span>
          </button>
        </div>
      )}

      {/* ── 2. FULL TELECOMMUNICATION CALL SCREEN (MOBILE CALL UI) ── */}
      {isCallMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-300 text-white">
          {/* Call Header */}
          <div className="flex items-center justify-between max-w-xl w-full mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
                HD Voice Call • Live
              </span>
            </div>

            <div className="text-center">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full text-slate-300 border border-white/10">
                {formatDuration(callDuration)}
              </span>
            </div>

            {/* Language Switch Pill */}
            <button
              onClick={() => {
                const next = voiceLang === "en-IN" ? "ml-IN" : "en-IN";
                changeVoiceLang(next);
                if (isListening) {
                  stopListening();
                  setTimeout(() => startListening(true), 200);
                }
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Globe size={12} className="text-indigo-400" />
              <span>{voiceLang === "en-IN" ? "EN" : "മലയാളം"}</span>
            </button>
          </div>

          {/* Center Visualizer (Animated Telephony Calling Orb) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg w-full mx-auto my-auto space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-slate-300 bg-clip-text text-transparent">
                LLO AI Voice
              </h2>
              <p className="text-xs sm:text-sm text-indigo-300/80 mt-1 font-medium">
                {callStateText === "listening" && "🎙️ Listening... Speak your query"}
                {callStateText === "thinking" && "⚡ Querying ERP Database..."}
                {callStateText === "speaking" && "🔊 AI is Speaking..."}
                {callStateText === "idle" && "Connected • Ready"}
              </p>
            </div>

            {/* Animated Call Orb */}
            <div className="relative flex items-center justify-center">
              {/* Outer Ripple Rings */}
              {isSpeaking && (
                <>
                  <div className="absolute w-56 h-56 rounded-full bg-indigo-500/20 animate-ping opacity-60"></div>
                  <div className="absolute w-44 h-44 rounded-full bg-violet-500/30 animate-pulse"></div>
                </>
              )}
              {isListening && (
                <>
                  <div className="absolute w-52 h-52 rounded-full bg-emerald-500/20 animate-ping opacity-50"></div>
                  <div className="absolute w-40 h-40 rounded-full bg-teal-500/30 animate-pulse"></div>
                </>
              )}

              {/* Central Glowing Sphere */}
              <div
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border ${isSpeaking
                  ? "bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-indigo-500/50 border-indigo-300 scale-105"
                  : isListening
                    ? "bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 shadow-emerald-500/50 border-emerald-300 scale-100"
                    : loading
                      ? "bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-600 animate-spin-slow border-amber-300"
                      : "bg-gradient-to-tr from-indigo-700 to-violet-800 border-indigo-400/40 shadow-indigo-900/50"
                  }`}
              >
                {isSpeaking ? (
                  <AudioWaveform size={48} className="text-white animate-pulse" />
                ) : isListening ? (
                  <Waves size={48} className="text-white animate-pulse" />
                ) : loading ? (
                  <Loader2 size={44} className="text-amber-200 animate-spin" />
                ) : (
                  <Sparkles size={44} className="text-indigo-200" />
                )}
              </div>
            </div>

            {/* Live Subtitle / Sub-Caption Box */}
            <div className="w-full min-h-[70px] max-h-[140px] overflow-y-auto px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                {callLiveSubtitle || "Speak in Malayalam or English (e.g. 'Revenue ethra aanu', 'Go to profile', 'Top 5 products')..."}
              </p>
            </div>
          </div>

          {/* Bottom Telecommunication Controls */}
          <div className="max-w-md w-full mx-auto flex items-center justify-center gap-6 sm:gap-8 pb-4">
            {/* Mute Button */}
            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  startListening(true);
                } else {
                  setIsMuted(true);
                  stopListening();
                }
              }}
              className={`p-4 rounded-full transition-all duration-200 flex items-center justify-center border shadow-lg ${isMuted
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* End Call Button (Big Red Phone Button) */}
            <button
              onClick={endCallMode}
              className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-xl shadow-rose-600/40 border-2 border-rose-400 transition-all duration-200 flex items-center justify-center"
              title="End Voice Call"
            >
              <PhoneOff size={26} />
            </button>

            {/* Switch to Chat Drawer Button */}
            <button
              onClick={() => {
                endCallMode();
                setIsOpen(true);
              }}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-200 flex items-center justify-center shadow-lg"
              title="Open Chat Text Mode"
            >
              <MessageSquare size={22} />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. STANDARD CHAT DRAWER WITH CALL SHORTCUT ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Assistant Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] md:w-[440px] max-w-full bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 flex-shrink-0">
              <Sparkles size={18} className="text-amber-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm truncate">ERP AI Assistant</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">Calling • Voice • Navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Auto Voice-Over Toggle Button */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoVoiceOver(!autoVoiceOver);
              }}
              title={autoVoiceOver ? "Auto Voice Over is ON (Click to mute)" : "Auto Voice Over is OFF (Click to unmute)"}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                autoVoiceOver
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              {autoVoiceOver ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="text-[10px] hidden sm:inline">{autoVoiceOver ? "Voice ON" : "Voice OFF"}</span>
            </button>

            {/* Quick Call Mode Trigger */}
            <button
              onClick={startCallMode}
              title="Switch to Full Phone Call Mode"
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <Phone size={15} />
              <span className="text-[11px] hidden sm:inline">Call</span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live Audio / Voice Activity Bar */}
        {(isListening || isSpeaking) && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-sm w-full flex-shrink-0">
            {isListening ? (
              <div className="flex items-center gap-2 font-medium truncate">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="truncate">Listening ({voiceLang === "ml-IN" ? "മലയാളം" : "English"})...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-medium truncate">
                <Radio size={14} className="text-amber-300 animate-spin flex-shrink-0" />
                <span className="truncate">Speaking answer aloud...</span>
              </div>
            )}

            <button
              onClick={() => {
                stopSpeaking();
                stopListening();
              }}
              className="text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded transition-colors flex-shrink-0"
            >
              Stop
            </button>
          </div>
        )}

        {/* Conversation Body - Fixed width, no horizontal scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-[#F8FAFC] w-full min-w-0 max-w-full">
          {messages.length === 0 ? (
            <div className="py-6 space-y-6 w-full">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-2.5 w-full">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <AudioWaveform size={16} /> Phone Calling & Voice AI
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-words">
                  • <strong>Phone Call Mode:</strong> Click the green <strong>Call</strong> button to start a continuous voice call like a phone call.
                  <br />
                  • <strong>Screen Navigation:</strong> Say <em>&quot;Go to profile&quot;</em> or <em>&quot;Open inventory&quot;</em> to navigate screens hands-free.
                </p>
              </div>

              <div className="w-full">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                  Quick Actions & Questions
                </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q.query, false)}
                      className="text-left p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 rounded-xl transition-all group flex items-center justify-between w-full min-w-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors flex items-center gap-1 flex-shrink-0">
                          {q.icon}
                          {q.tag}
                        </span>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-900 truncate">
                          {q.label}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col w-full min-w-0 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed group relative break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-sm shadow-indigo-200"
                      : "bg-white text-slate-800 border border-slate-200/70 rounded-bl-none shadow-sm"
                  }`}
                >
                  <FormatMessageContent content={m.content} isUser={m.role === "user"} />

                  {/* Direct Navigation Card */}
                  {m.action?.type === "NAVIGATE" && (
                    <div className="mt-3 p-2.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-2 w-full min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg flex-shrink-0">
                          <Compass size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{m.action.pageTitle}</p>
                          <p className="text-[10px] text-slate-500 truncate">{m.action.path}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(m.action!.path)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[10px] flex items-center gap-1 transition-colors shadow-sm flex-shrink-0"
                      >
                        <span>Open Page</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  )}

                  {/* Message Meta & Audio Control */}
                  {m.role === "assistant" && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 w-full min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1 truncate mr-2">
                        {m.toolsUsed && m.toolsUsed.length > 0 && (
                          <>
                            <Database size={11} className="text-indigo-500 flex-shrink-0" />
                            <span className="truncate">Queried: {m.toolsUsed.join(", ")}</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (speakingMessageId === m.id) {
                            stopSpeaking();
                          } else {
                            speakMessage(m.content, m.id);
                          }
                        }}
                        title={speakingMessageId === m.id ? "Stop voice over" : "Read response aloud"}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors flex-shrink-0 ${
                          speakingMessageId === m.id
                            ? "bg-rose-50 text-rose-600 font-semibold animate-pulse"
                            : "hover:bg-indigo-50 hover:text-indigo-600 text-slate-500"
                        }`}
                      >
                        {speakingMessageId === m.id ? (
                          <>
                            <VolumeX size={12} />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={12} />
                            <span>Voice Over</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 px-1">
                  {m.isVoice && <Mic size={10} className="text-indigo-500" />}
                  <span>{m.timestamp}</span>
                </div>
              </div>
            ))
          )}

          {/* Thinking indicator */}
          {loading && (
            <div className="flex items-start gap-2 w-full min-w-0">
              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Loader2 size={13} className="animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/70 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
                  Processing ERP request...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice Controls */}
        <div className="p-3.5 border-t border-slate-200/80 bg-white flex-shrink-0 w-full overflow-hidden">
          {/* Voice Language Selector & Auto-Voice Pill */}
          <div className="flex items-center justify-between mb-2 px-1 text-[11px] w-full min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 flex-shrink-0">Mic:</span>
              <button
                type="button"
                onClick={() => changeVoiceLang(voiceLang === "en-IN" ? "ml-IN" : "en-IN")}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-[11px] transition-colors border border-indigo-200/60 truncate flex items-center gap-1 shadow-sm"
              >
                <Globe size={11} className="text-indigo-600" />
                <span>{voiceLang === "en-IN" ? "EN (English)" : "മലയാളം (Malayalam)"}</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoVoiceOver(!autoVoiceOver);
              }}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors flex-shrink-0 ${
                autoVoiceOver ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60" : "text-slate-400 bg-slate-100"
              }`}
              title="Toggle Auto Voice Over"
            >
              <Volume2 size={11} className={autoVoiceOver ? "text-emerald-600" : "text-slate-400"} />
              <span>{autoVoiceOver ? "Voice: ON" : "Voice: OFF"}</span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(undefined, false);
            }}
            className="flex items-center gap-2 w-full min-w-0"
          >
            {/* Microphone Dictation Button */}
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopListening();
                  if (input.trim()) {
                    handleSendMessage(input, true);
                  }
                } else {
                  startListening(false);
                }
              }}
              title={isListening ? "Stop & Send Voice Query" : "Speak your query"}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200 ring-2 ring-rose-300"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                isVoiceInputRef.current = false;
              }}
              placeholder={isListening ? "Listening... speak now" : "Ask or say 'Go to profile'..."}
              disabled={loading}
              className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50 truncate"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 w-full min-w-0">
            <span className="truncate mr-1">Direct screen navigation</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <Link href="/settings/profile" className="hover:text-indigo-600 underline">Profile</Link>
              •
              <Link href="/inventory" className="hover:text-indigo-600 underline">Inventory</Link>
              •
              <Link href="/sales" className="hover:text-indigo-600 underline">Sales</Link>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/** Formatter helper for AI markdown responses */
function FormatMessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">{content}</p>;
  }

  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 break-words [overflow-wrap:anywhere] [word-break:break-word] w-full min-w-0">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        if (trimmed.startsWith("### ")) {
          return <h4 key={idx} className="font-bold text-slate-900 text-xs mt-2 break-words">{trimmed.replace("### ", "")}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={idx} className="font-bold text-slate-900 text-xs mt-2 break-words">{trimmed.replace("## ", "")}</h3>;
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 w-full min-w-0">
              <span className="text-indigo-500 font-bold leading-none mt-1 flex-shrink-0">•</span>
              <span className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{renderBoldText(trimmed.replace(/^(\*|-)\s+/, ""))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 w-full min-w-0">
              <span className="text-indigo-600 font-semibold text-[11px] min-w-[14px] flex-shrink-0">{numMatch[1]}.</span>
              <span className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx} className="break-words [overflow-wrap:anywhere] [word-break:break-word]">{renderBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 break-words">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
