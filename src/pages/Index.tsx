import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

// Bilingual strings — direct port from tilprep_landing_final.html
const T = {
  en: {
    nav_login: "Log in",
    nav_signup: "Start Free",
    hero_badge: "Prepare before the next TIL session",
    hero_built: "Built by Engineering Students from Politecnico di Torino",
    hero_h1_a: "Pass the TIL.",
    hero_h1_b: "Not by luck —",
    hero_h1_c: "by design.",
    hero_p:
      "TILPrep is the only bilingual platform built specifically for the TIL-I at Politecnico di Torino. Train until the real exam feels familiar — with exact format, timing, penalty system, and admission probability based on real PoliTo historical data.",
    hero_cta: "Start Free Mock Exam",
    hero_cta_sub_a: "Free · No card required",
    hero_cta_sub_b: "Join 157+ students preparing right now",
    slide_math: "Mathematics",
    slide_remaining: "remaining",
    slide_math_q: "Evaluate the limit:",
    slide_physics: "Physics",
    slide_physics_q:
      "A block of mass m slides down a frictionless incline of angle θ. What is its acceleration?",
    slide_logic: "Logic",
    slide_logic_q: "\"If all engineers are methodical, and some students are engineers, then...\"",
    logic_a: "A) All students are methodical.",
    logic_b: "B) No students are methodical.",
    logic_c: "C) All engineers are students.",
    logic_d: "D) Some students are methodical.",
    logic_e: "E) Some methodical people are not students.",
    stats_1: "Calibrated Exams",
    stats_2: "Unique Questions",
    stats_3: "Penalty Active",
    stats_4: "Historical Data Models",
    stats_4_v: "3 Yrs",
    stats_5: "Students Preparing",
    core_label: "Core Mechanics",
    core_h2_a: "Harder than the real exam.",
    core_h2_b: "So the real one feels easy.",
    feat1_t: "Extreme Question Sets",
    feat1_d:
      "Brutally randomized sets calibrated beyond the real exam difficulty. So when you sit the actual TIL-I, you've already survived something harder.",
    feat2_t: "Know Exactly Why You Lose Marks",
    feat2_d:
      "Our penalty optimizer tracks your guessing behavior and shows the exact −0.25 decisions that are costing you points — then tells you how to fix them.",
    feat3_t: "Admission Probability",
    feat3_d:
      "Your mock score mapped against 3 years of real PoliTo admission data. Know your percentile against historical candidates — not against other TILPrep users.",
    after_label: "After Your Free Exam",
    after_h2: "See exactly where you stand.",
    after_p:
      "Your score, section breakdown, and percentile rank against 3 years of real PoliTo TIL-I admission data. Know what admission probability candidates in your score band achieved historically.",
    af1_t: "Full score + section breakdown",
    af1_d:
      "See exactly how you performed across Mathematics, Physics, Logic, and Technical Knowledge.",
    af2_t: "Historical percentile rank",
    af2_d: "Where you'd have placed among real PoliTo TIL-I candidates from the last 3 years.",
    af3_t: "Admission probability estimate",
    af3_d:
      "How candidates in your score band historically fared in the actual PoliTo admission process.",
    af4_t: "Topic-level weak area detection",
    af4_d:
      "Derivatives 62%, Integrals 44%, Kinematics 88% — see exactly which topics to prioritize.",
    your_score: "YOUR SCORE",
    section_breakdown: "SECTION BREAKDOWN",
    math: "Mathematics",
    physics: "Physics",
    tech: "Technical Know.",
    logic: "Logic & Reading",
    topic_mastery: "TOPIC MASTERY",
    unlock_pro: "Unlock with Pro",
    adm_prob_label: "ADMISSION PROBABILITY · 2021–2024 DATA",
    adm_prob_text: "Candidates scoring 65–70 had a 74% admission rate",
    pricing_active: "Launch pricing active",
    pricing_h2: "Start free. Upgrade when ready.",
    pricing_p:
      "One-time payments. No subscriptions. No renewals. Your access runs until your exam — not until your credit card does.",
    pricing_anchor:
      "Less than the cost of retaking the exam once. One prep investment — one shot, done right.",
    cd_expires: "Launch price expires in",
    cd_d: "Days",
    cd_h: "Hours",
    cd_m: "Min",
    cd_s: "Sec",
    cd_after: "Price increases to full rate on May 15",
    upgrade_promise_a: "Bought the wrong plan?",
    upgrade_promise_b:
      " Upgrade any time — we credit your original purchase in full. You only ever pay the difference.",
    free: "Free",
    free_sub: "Try before you commit",
    free_cta: "Try One Exam Free",
    forever: "Forever",
    months3: "3 months",
    months6: "6 months",
    core_sub: "Everything you need to start",
    core_cta: "Start with Core",
    pro3_sub: "Full arsenal, short window",
    pro3_cta: "Start Pro 3mo",
    pro6_sub: "Covers your entire preparation period",
    pro6_cta: "Start Pro 6mo",
    most_popular: "Most Popular",
    instant_access: "Instant access · No hidden fees",
    instant_access_pro6: "Instant access · No hidden fees · No renewals",
    after_may15: (price: string) => `${price} after May 15`,
    one_time_3mo: "One-time · 3 months access",
    one_time_6mo: "One-time · 6 months · No renewals",
    li_free_1: "1 full mock exam",
    li_free_2: "Score + section totals",
    li_free_3: "Historical percentile rank",
    li_free_4: "Admission probability estimate",
    li_free_5: "Topic-level breakdown",
    li_core_1: "6 full mock exams + 1 bonus set",
    li_core_2: "Step-by-step solution for every question",
    li_core_3: "Historical percentile + admission probability",
    li_core_4: "Exam readiness score",
    li_core_5: "Advanced analytics + weak area detection",
    testimonials_label: "Early Access Feedback",
    testimonials_h: "What beta testers are saying.",
    test_t1:
      "\"The sets are brutally hard. My time management was a disaster at first. It was exactly the wake-up call I needed.\"",
    test_t2:
      "\"The penalty analytics showed me I was losing almost 4 points per exam just from random guessing. I adjusted my strategy immediately.\"",
    test_t3:
      "\"Arriving at the exam knowing exactly what interface and difficulty to expect changes everything. I feel completely in control.\"",
    test_t4:
      "\"Seeing my admission probability calculated against actual historical PoliTo data finally gave me the peace of mind to focus.\"",
    test_role: "Engineering applicant, PoliTo",
    faq_h: "Frequently Asked Questions",
    faq: [
      {
        q: "What is the TIL-I exam?",
        a: "The TIL-I (Test di Ingegneria e Logica) is the official engineering admission test for Politecnico di Torino. It consists of 42 questions across Mathematics (16), Logic and Reading Comprehension (10), Physics (10), and Technical Knowledge (6), with a 90-minute time limit. Correct answers score +1, incorrect answers −0.25, and blank answers 0.",
      },
      {
        q: "Is TILPrep available in English?",
        a: "Yes — fully. Every simulation, explanation, analytics dashboard, and piece of feedback is available in both English and Italian. Switch languages at any time using the toggle in the navigation bar. TILPrep is the only TIL-I preparation platform designed for international applicants sitting the exam in English.",
      },
      {
        q: "Is the TIL-I the same as the TOLC-I?",
        a: "No. The TOLC-I is a generic test managed by CISIA for multiple universities. The TIL-I is exclusive to Politecnico di Torino, featuring a different difficulty scale, structure, and penalty system. Generic TOLC preparation will not prepare you adequately for the TIL-I.",
      },
      {
        q: "How is admission probability calculated?",
        a: "We map your mock exam score against publicly available historical Politecnico di Torino admission ranking lists from the last 3 years, specific to the engineering programme you select. You see exactly where you would have placed among real historical candidates — not against other TILPrep users.",
      },
      {
        q: "Can I retake the TIL-I?",
        a: "Yes. According to official rules you can retake the exam in subsequent sessions. On TILPrep your exam history and analytics are saved permanently — retakers start with full analytical context from their previous attempt, so you never lose your preparation data.",
      },
      {
        q: "Can I switch between English and Italian any time?",
        a: "Yes — every question, explanation, and interface element is available in both languages. Switch at any time from any page using the EN/IT toggle. There is no tier restriction on language choice.",
      },
    ],
    final_h: "The exam is fixed. Your preparation isn't.",
    final_p:
      "One free exam. Full score breakdown. Percentile rank against real PoliTo candidates. No card required. Start in 60 seconds.",
    final_cta: "Start Your Free Mock Exam",
    final_sub: "Free · No commitment · Launch pricing ends May 15",
    foot_indep: "Independent Platform",
    foot_disc:
      "TILPrep is an independent educational tool and is not affiliated with, endorsed by, or connected to Politecnico di Torino. \"TIL-I\" is a registered trademark of Politecnico di Torino. Built for launch 2026.",
    foot_pricing: "Pricing",
    foot_terms: "Terms",
  },
  it: {
    nav_login: "Accedi",
    nav_signup: "Inizia Gratis",
    hero_badge: "Preparati prima della prossima sessione TIL",
    hero_built: "Creato da studenti di ingegneria del Politecnico di Torino",
    hero_h1_a: "Supera il TIL.",
    hero_h1_b: "Non per fortuna —",
    hero_h1_c: "con metodo.",
    hero_p:
      "TILPrep è l'unica piattaforma bilingue costruita per il TIL-I del Politecnico di Torino. Allenati finché l'esame reale non ti sembra familiare — con il formato esatto, i tempi, il sistema di penalità e la probabilità di ammissione basata sui dati storici reali del PoliTo.",
    hero_cta: "Inizia Simulazione Gratuita",
    hero_cta_sub_a: "Gratis · Nessuna carta richiesta",
    hero_cta_sub_b: "Unisciti a 157+ studenti che si preparano ora",
    slide_math: "Matematica",
    slide_remaining: "rimanente",
    slide_math_q: "Calcolare il seguente limite:",
    slide_physics: "Fisica",
    slide_physics_q:
      "Un corpo di massa m scivola lungo un piano inclinato privo di attrito di angolo θ. Qual è la sua accelerazione?",
    slide_logic: "Logica",
    slide_logic_q: "\"Tutti gli ingegneri sono metodici. Alcuni studenti sono ingegneri. Si deduce che:\"",
    logic_a: "A) Tutti gli studenti sono metodici.",
    logic_b: "B) Nessuno studente è metodico.",
    logic_c: "C) Tutti gli ingegneri sono studenti.",
    logic_d: "D) Alcuni studenti sono metodici.",
    logic_e: "E) Alcune persone metodiche non sono studenti.",
    stats_1: "Esami Calibrati",
    stats_2: "Domande Uniche",
    stats_3: "Penalità Attiva",
    stats_4: "Di Dati Storici",
    stats_4_v: "3 Anni",
    stats_5: "Studenti Attivi",
    core_label: "Meccaniche Principali",
    core_h2_a: "Più duro dell'esame reale.",
    core_h2_b: "Così quello vero sembra semplice.",
    feat1_t: "Set di Domande Estremi",
    feat1_d:
      "Set altamente randomizzati calibrati oltre la difficoltà reale. Così quando sostieni il TIL-I, hai già superato qualcosa di più difficile.",
    feat2_t: "Capisci Esattamente Dove Perdi Punti",
    feat2_d:
      "Il nostro ottimizzatore di penalità traccia il tuo comportamento e mostra le esatte decisioni −0.25 che ti costano punti — poi ti dice come correggere.",
    feat3_t: "Probabilità di Ammissione",
    feat3_d:
      "Il tuo punteggio mappato su 3 anni di dati storici reali del PoliTo. Conosci il tuo percentile rispetto ai candidati storici, non agli altri utenti TILPrep.",
    after_label: "Dopo la Tua Prima Simulazione",
    after_h2: "Scopri esattamente dove ti trovi.",
    after_p:
      "Il tuo punteggio, il dettaglio per sezione e il tuo percentile su 3 anni di dati storici reali del PoliTo. Scopri la probabilità di ammissione dei candidati nella tua fascia di punteggio.",
    af1_t: "Punteggio totale + dettaglio per sezione",
    af1_d:
      "Vedi come hai performato in Matematica, Fisica, Logica e Conoscenze Tecniche.",
    af2_t: "Percentile storico",
    af2_d: "Dove ti saresti classificato tra i candidati reali del TIL-I degli ultimi 3 anni.",
    af3_t: "Stima della probabilità di ammissione",
    af3_d:
      "Come si sono comportati storicamente i candidati nella tua fascia di punteggio nell'ammissione reale al PoliTo.",
    af4_t: "Rilevamento aree deboli per argomento",
    af4_d:
      "Derivate 62%, Integrali 44%, Cinematica 88% — scopri esattamente quali argomenti prioritizzare.",
    your_score: "IL TUO PUNTEGGIO",
    section_breakdown: "DETTAGLIO SEZIONI",
    math: "Matematica",
    physics: "Fisica",
    tech: "Conoscenze Tecniche",
    logic: "Logica",
    topic_mastery: "PADRONANZA ARGOMENTI",
    unlock_pro: "Sblocca con Pro",
    adm_prob_label: "PROBABILITÀ AMMISSIONE · DATI 2021–2024",
    adm_prob_text: "I candidati con punteggio 65–70 avevano un 74% di tasso di ammissione",
    pricing_active: "Prezzi di lancio attivi",
    pricing_h2: "Inizia gratis. Aggiorna quando sei pronto.",
    pricing_p:
      "Pagamenti unici. Nessun abbonamento. Nessun rinnovo. Il tuo accesso dura fino all'esame, non fino alla scadenza della carta.",
    pricing_anchor:
      "Meno del costo di ripetere l'esame una volta. Un investimento nella preparazione — un tentativo, fatto bene.",
    cd_expires: "Il prezzo di lancio scade tra",
    cd_d: "Giorni",
    cd_h: "Ore",
    cd_m: "Min",
    cd_s: "Sec",
    cd_after: "Il prezzo aumenta al valore pieno il 15 maggio",
    upgrade_promise_a: "Hai scelto il piano sbagliato?",
    upgrade_promise_b:
      " Aggiorna in qualsiasi momento — accreditiamo il tuo acquisto originale per intero. Paghi solo la differenza.",
    free: "Gratis",
    free_sub: "Prova prima di impegnarti",
    free_cta: "Prova un Esame Gratis",
    forever: "Per sempre",
    months3: "3 mesi",
    months6: "6 mesi",
    core_sub: "Tutto il necessario per iniziare",
    core_cta: "Inizia con Core",
    pro3_sub: "Arsenale completo, finestra breve",
    pro3_cta: "Inizia Pro 3 mesi",
    pro6_sub: "Copre l'intero periodo di preparazione",
    pro6_cta: "Inizia Pro 6 mesi",
    most_popular: "Più Popolare",
    instant_access: "Accesso immediato · Nessun costo nascosto",
    instant_access_pro6: "Accesso immediato · Nessun rinnovo",
    after_may15: (price: string) => `${price} dopo il 15 maggio`,
    one_time_3mo: "Una tantum · 3 mesi accesso",
    one_time_6mo: "Una tantum · 6 mesi · Nessun rinnovo",
    li_free_1: "1 simulazione completa",
    li_free_2: "Punteggio + totali per sezione",
    li_free_3: "Percentile storico",
    li_free_4: "Stima probabilità ammissione",
    li_free_5: "Dettaglio per argomento",
    li_core_1: "6 simulazioni complete + 1 set bonus",
    li_core_2: "Soluzione passo-passo per ogni domanda",
    li_core_3: "Percentile storico + probabilità ammissione",
    li_core_4: "Punteggio di prontezza",
    li_core_5: "Analisi avanzate + rilevamento aree deboli",
    testimonials_label: "Feedback Accesso Anticipato",
    testimonials_h: "Cosa dicono i beta tester.",
    test_t1:
      "\"I test sono brutali. Il mio time management era disastroso all'inizio. Esattamente la sveglia di cui avevo bisogno.\"",
    test_t2:
      "\"L'analisi delle penalità mi ha mostrato che perdevo 4 punti per risposte casuali. Ho cambiato strategia immediatamente.\"",
    test_t3:
      "\"Arrivare all'esame sapendo esattamente quale interfaccia e difficoltà aspettarsi cambia tutto. Mi sento in totale controllo.\"",
    test_t4:
      "\"Vedere la probabilità di ammissione calcolata sui dati storici reali del PoliTo mi ha dato la tranquillità per concentrarmi.\"",
    test_role: "Candidato ingegneria, PoliTo",
    faq_h: "Domande Frequenti",
    faq: [
      {
        q: "Cos'è l'esame TIL-I?",
        a: "Il TIL-I (Test di Ingegneria e Logica) è il test di ammissione ufficiale per ingegneria al Politecnico di Torino. Comprende 42 domande in Matematica (16), Logica e Comprensione del testo (10), Fisica (10) e Conoscenze tecnico-scientifiche (6), con 90 minuti di tempo. Risposte corrette +1, errate −0.25, non date 0.",
      },
      {
        q: "TILPrep è disponibile in inglese?",
        a: "Sì — completamente. Ogni simulazione, spiegazione, dashboard e feedback è disponibile sia in inglese che in italiano. Puoi cambiare lingua in qualsiasi momento tramite il selettore nella barra di navigazione. TILPrep è la prima e unica piattaforma di preparazione al TIL-I pensata per i candidati internazionali.",
      },
      {
        q: "Il TIL-I è uguale al TOLC-I?",
        a: "No. Il TOLC-I è un test generico gestito dal CISIA per diverse università. Il TIL-I è esclusivo del Politecnico di Torino, con una scala di difficoltà, struttura e sistema di penalità differenti. La preparazione generica per il TOLC non è sufficiente per il TIL-I.",
      },
      {
        q: "Come viene calcolata la probabilità di ammissione?",
        a: "Confrontiamo il punteggio della tua simulazione con le graduatorie storiche pubbliche di ammissione del PoliTo degli ultimi 3 anni, specifiche per il tuo programma. Vedi esattamente dove ti saresti classificato tra i candidati storici reali — non tra gli altri utenti TILPrep.",
      },
      {
        q: "Posso ripetere il TIL-I?",
        a: "Sì. Secondo le regole ufficiali puoi ripetere l'esame nelle sessioni successive. Su TILPrep lo storico degli esami e le analisi vengono salvati permanentemente — chi ripete parte con il contesto analitico completo del tentativo precedente, senza mai perdere i dati di preparazione.",
      },
      {
        q: "Posso passare tra inglese e italiano in qualsiasi momento?",
        a: "Sì — ogni domanda, spiegazione ed elemento dell'interfaccia è disponibile in entrambe le lingue. Cambia in qualsiasi momento da qualsiasi pagina tramite il selettore EN/IT. Non ci sono restrizioni di piano sulla scelta della lingua.",
      },
    ],
    final_h: "L'esame è fisso. La tua preparazione no.",
    final_p:
      "Un esame gratuito. Dettaglio completo del punteggio. Percentile storico rispetto ai candidati reali del PoliTo. Nessuna carta richiesta. Inizia in 60 secondi.",
    final_cta: "Inizia la Tua Simulazione Gratuita",
    final_sub: "Gratis · Nessun impegno · Prezzi di lancio terminano il 15 maggio",
    foot_indep: "Piattaforma Indipendente",
    foot_disc:
      "TILPrep è uno strumento educativo indipendente e non è affiliato, approvato o collegato al Politecnico di Torino. \"TIL-I\" è un marchio registrato del Politecnico di Torino. Sviluppato per il lancio nel 2026.",
    foot_pricing: "Prezzi",
    foot_terms: "Termini",
  },
} as const;

const Check = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const Cross = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const Dash = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
  </svg>
);
const Lock = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 9 11" fill="none">
    <rect x="0.5" y="4.5" width="8" height="6" rx="1.5" stroke="#C8961E" strokeWidth="1.1" />
    <path d="M2.5 4.5V3a2 2 0 014 0v1.5" stroke="#C8961E" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const Index = () => {
  const { user } = useAuth();
  const { lang, setLang } = useTheme();
  const t = T[lang];
  const startHref = user ? "/exams" : "/exam/guest";

  // Force dark theme tokens for this landing — apply class on body
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Slideshow
  const [slide, setSlide] = useState(0);
  const hover = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!hover.current) setSlide((s) => (s + 1) % 3);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Countdown
  const [cd, setCd] = useState({ d: "11", h: "00", m: "00", s: "00" });
  useEffect(() => {
    const END = Date.now() + 11 * 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, END - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (v: number) => String(v).padStart(2, "0");
      setCd({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const slides = [
    {
      tag: t.slide_math,
      timer: true,
      body: (
        <p className="text-white font-medium text-sm leading-snug mb-4 flex-grow">
          {t.slide_math_q}
          <br />
          <span className="block mt-2 font-dm-mono text-center text-base bg-darkbg py-2 rounded border border-white/5">
            lim<sub>x→0</sub> (sin x) / x
          </span>
        </p>
      ),
      options: [
        { text: lang === "en" ? "A) Undefined" : "A) Non esiste", state: "" },
        { text: "B) 1", state: "correct" },
        { text: "C) 0", state: "wrong" },
        { text: "D) ∞", state: "" },
        { text: "E) −1", state: "" },
      ],
    },
    {
      tag: t.slide_physics,
      timer: false,
      body: (
        <p className="text-white font-medium text-sm leading-snug mb-3 flex-grow">
          {t.slide_physics_q}
        </p>
      ),
      options: [
        { text: "A) m·g·cos(θ)", state: "wrong" },
        { text: "B) g·cos(θ)", state: "" },
        { text: "C) g·sin(θ)", state: "correct" },
        { text: "D) g·tan(θ)", state: "" },
        { text: "E) m·g·sin(θ)", state: "" },
      ],
    },
    {
      tag: t.slide_logic,
      timer: false,
      body: (
        <p className="text-white font-medium text-sm leading-snug mb-3 flex-grow">
          {t.slide_logic_q}
        </p>
      ),
      options: [
        { text: t.logic_a, state: "" },
        { text: t.logic_b, state: "wrong" },
        { text: t.logic_c, state: "" },
        { text: t.logic_d, state: "correct" },
        { text: t.logic_e, state: "" },
      ],
    },
  ];

  return (
    <div className="font-dm-sans bg-darkbg text-slate-300 antialiased overflow-x-hidden relative min-h-screen">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(43,95,166,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(43,95,166,0.05) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse,rgba(43,95,166,0.1) 0%,transparent 70%)" }}
      />

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 py-3 border-b border-white/5 bg-darkbg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
              <span className="text-gold font-playfair font-bold text-sm">T</span>
            </div>
            <span className="font-playfair text-lg font-bold text-white">
              til<span className="text-gold">prep</span>
              <span className="font-dm-mono text-[9px] text-slate-500 ml-0.5 font-normal">.com</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex rounded-md border border-white/10 overflow-hidden bg-white/5 text-[11px] font-bold font-dm-mono">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-2 min-h-[44px] transition ${lang === "en" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("it")}
                className={`px-3 py-2 min-h-[44px] transition ${lang === "it" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
              >
                IT
              </button>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <Link
              to="/login"
              className="text-xs font-semibold text-white/70 hover:text-white transition hidden sm:flex items-center min-h-[44px]"
            >
              {t.nav_login}
            </Link>
            <Link
              to="/register"
              className="text-xs font-bold bg-gold text-darkbg px-4 py-2 min-h-[44px] flex items-center rounded-md hover:bg-gold-hover transition"
            >
              {t.nav_signup}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 border border-gold/30 bg-gold/10 text-gold rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span>{t.hero_badge}</span>
            </div>

            <div className="text-[11px] font-dm-mono text-slate-400 mb-3 font-bold uppercase tracking-wider">
              {t.hero_built}
            </div>

            <h1 className="font-playfair text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] font-bold text-white mb-6">
              {t.hero_h1_a}
              <br />
              <span className="text-gold italic font-normal">{t.hero_h1_b}</span>
              <br />
              {t.hero_h1_c}
            </h1>

            <p className="text-base sm:text-[1.15rem] text-slate-300 mb-8 max-w-lg leading-relaxed font-medium">
              {t.hero_p}
            </p>

            <div className="flex flex-col sm:items-start gap-3">
              <Link
                to={startHref}
                className="min-h-[52px] w-full sm:w-auto inline-flex items-center justify-center bg-gold text-darkbg px-10 py-3.5 rounded-lg font-bold text-sm tracking-wide hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-gold/20"
              >
                {t.hero_cta}
              </Link>
              <div className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  {t.hero_cta_sub_a}
                </span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span>{t.hero_cta_sub_b}</span>
              </div>
            </div>
          </div>

          {/* Slideshow */}
          <div
            className="lg:col-span-5 relative h-[460px] flex justify-center items-center"
            onMouseEnter={() => (hover.current = true)}
            onMouseLeave={() => (hover.current = false)}
          >
            <div className="absolute w-[300px] h-[300px] bg-gold/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative w-full max-w-sm h-[430px] group cursor-pointer">
              {slides.map((s, i) => (
                <div
                  key={i}
                  className={`absolute top-0 left-0 w-full bg-darkcard rounded-xl shadow-2xl border border-white/5 p-5 flex flex-col h-full group-hover:scale-[1.02] transition-all duration-500 ${
                    slide === i ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 translate-y-2 pointer-events-none z-0"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                    <span className="bg-white/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded font-dm-mono uppercase tracking-wider">
                      {s.tag}
                    </span>
                    {s.timer && (
                      <span className="text-red-400 text-xs font-dm-mono font-medium flex items-center gap-1">
                        <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[9px] text-red-500 mr-0.5">{t.slide_remaining}</span>
                        12:45
                      </span>
                    )}
                  </div>
                  {s.body}
                  <div className="space-y-1.5">
                    {s.options.map((opt, j) => {
                      const base = "p-2 border rounded-lg text-[11px] font-medium flex justify-between items-center";
                      if (opt.state === "correct")
                        return (
                          <div key={j} className={`${base} border-green-500/50 bg-green-500/10 text-green-400 font-bold`}>
                            <span>{opt.text}</span>
                            <Check />
                          </div>
                        );
                      if (opt.state === "wrong")
                        return (
                          <div key={j} className={`${base} border-red-500/50 bg-red-500/10 text-red-400 font-bold`}>
                            <span>{opt.text}</span>
                            <Cross />
                          </div>
                        );
                      return (
                        <div key={j} className={`${base} border-white/10 text-slate-300 bg-darkbg/50`}>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* STATS BAR */}
      <section className="border-y border-white/5 bg-white/[0.02] relative z-10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center sm:justify-between items-center gap-8 text-center sm:text-left">
          {[
            { v: "14", l: t.stats_1 },
            { v: "588", l: t.stats_2 },
            { v: "−0.25", l: t.stats_3 },
            { v: t.stats_4_v, l: t.stats_4 },
            { v: "157+", l: t.stats_5, gold: true },
          ].map((s, i) => (
            <div key={i}>
              <div className={`font-dm-mono text-3xl font-bold ${s.gold ? "text-gold" : "text-white"}`}>{s.v}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CORE MECHANICS */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <span className="text-gold text-[10px] font-bold tracking-widest uppercase mb-3 block font-dm-mono">
              {t.core_label}
            </span>
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white">
              {t.core_h2_a}
              <br />
              <span className="text-slate-400 font-normal italic">{t.core_h2_b}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                t: t.feat1_t,
                d: t.feat1_d,
                gold: false,
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                ),
              },
              {
                t: t.feat2_t,
                d: t.feat2_d,
                gold: true,
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                ),
              },
              {
                t: t.feat3_t,
                d: t.feat3_d,
                gold: false,
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                ),
              },
            ].map((f, i) => (
              <div
                key={i}
                className={`bg-gradient-to-b from-darkcard to-[#0A1120] p-8 rounded-xl border ${f.gold ? "border-gold/20" : "border-white/5"} shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300`}
              >
                <div className={`w-12 h-12 rounded-lg ${f.gold ? "bg-gold/10 text-gold" : "bg-white/5 text-slate-300"} flex items-center justify-center mb-6`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="font-playfair text-xl font-bold text-white mb-4">{f.t}</h3>
                <p className="text-slate-400 text-[15px] leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS PREVIEW */}
      <section className="py-24 border-y border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <span className="text-gold text-[10px] font-bold tracking-widest uppercase mb-3 block font-dm-mono">
              {t.after_label}
            </span>
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white">{t.after_h2}</h2>
            <p className="text-slate-400 mt-3 max-w-xl leading-relaxed">{t.after_p}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              {[
                { t: t.af1_t, d: t.af1_d, locked: false },
                { t: t.af2_t, d: t.af2_d, locked: false },
                { t: t.af3_t, d: t.af3_d, locked: false },
                { t: t.af4_t, d: t.af4_d, locked: true },
              ].map((f, i) => (
                <div
                  key={i}
                  className={`flex gap-4 items-start p-5 rounded-xl border border-white/5 ${f.locked ? "bg-darkcard/50 opacity-60" : "bg-darkcard"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${f.locked ? "bg-gold/10 border-gold/20" : "bg-green-500/10 border-green-500/20"} border flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    {f.locked ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-400" />}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm mb-1 flex items-center gap-2 ${f.locked ? "text-slate-300" : "text-white"}`}>
                      {f.t}
                      {f.locked && (
                        <span className="text-[9px] font-bold text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </div>
                    <div className={`text-xs leading-relaxed ${f.locked ? "text-slate-500" : "text-slate-400"}`}>
                      {f.d}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mock results dashboard */}
            <div className="bg-[#040A14] border border-white/10 rounded-2xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[9px] text-slate-600 font-dm-mono tracking-wider mb-1">{t.your_score}</div>
                  <div className="text-4xl font-bold font-dm-mono text-white leading-none">
                    68<span className="text-base text-slate-500">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-600 font-dm-mono tracking-wider mb-1">PERCENTILE</div>
                  <div className="text-4xl font-bold font-dm-mono text-gold leading-none">
                    71<span className="text-base text-yellow-600">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="text-[9px] text-slate-600 font-dm-mono tracking-wider mb-2">
                  {t.section_breakdown}
                </div>
                {[
                  { label: t.math, val: 72, color: "green" },
                  { label: t.physics, val: 58, color: "amber" },
                  { label: t.tech, val: 81, color: "green" },
                  { label: t.logic, val: 64, color: "amber" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-slate-400">{row.label}</span>
                      <span
                        className={`text-[11px] font-bold font-dm-mono ${row.color === "green" ? "text-green-400" : "text-amber-500"}`}
                      >
                        {row.val}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full">
                      <div
                        className={`h-full rounded-full ${row.color === "green" ? "bg-green-500/50" : "bg-amber-500/50"}`}
                        style={{ width: `${row.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Blurred topic mastery */}
              <div className="relative rounded-xl border border-white/5 overflow-hidden mb-4">
                <div className="p-3 select-none" style={{ filter: "blur(4px)", pointerEvents: "none" }}>
                  <div className="text-[9px] text-slate-600 font-dm-mono tracking-wider mb-2">{t.topic_mastery}</div>
                  <div className="flex justify-between py-1">
                    <span className="text-[10px] text-slate-400">Derivatives</span>
                    <span className="text-[10px] text-gold font-dm-mono">62%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[10px] text-slate-400">Integrals</span>
                    <span className="text-[10px] text-amber-500 font-dm-mono">44%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[10px] text-slate-400">Kinematics</span>
                    <span className="text-[10px] text-green-400 font-dm-mono">88%</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-[#040A14]/85 flex items-center justify-center">
                  <a
                    href="#pricing"
                    className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gold/20 transition"
                  >
                    <Lock />
                    {t.unlock_pro}
                  </a>
                </div>
              </div>

              <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl">
                <div className="text-[9px] text-slate-500 font-dm-mono tracking-wider mb-1">
                  {t.adm_prob_label}
                </div>
                <div className="text-[11px] text-gold font-bold">{t.adm_prob_text}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-2 text-[11px] text-gold font-bold font-dm-mono tracking-wider">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              {t.pricing_active}
            </div>
          </div>
          <div className="text-center mb-5">
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-3">{t.pricing_h2}</h2>
            <p className="text-slate-400 text-sm font-medium max-w-lg mx-auto">{t.pricing_p}</p>
          </div>
          <div className="text-center mb-8">
            <p className="text-slate-500 text-sm italic">{t.pricing_anchor}</p>
          </div>

          {/* Countdown */}
          <div className="flex justify-center mb-10">
            <div className="bg-darkcard border border-gold/20 rounded-2xl px-8 py-5 text-center">
              <div className="text-[10px] text-slate-500 font-dm-mono tracking-wider uppercase mb-3">
                {t.cd_expires}
              </div>
              <div className="flex items-center gap-3">
                {[
                  { v: cd.d, l: t.cd_d },
                  { v: cd.h, l: t.cd_h },
                  { v: cd.m, l: t.cd_m },
                  { v: cd.s, l: t.cd_s },
                ].map((c, i, arr) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-center">
                      <div
                        className="font-dm-mono font-bold text-gold leading-none inline-block text-center"
                        style={{
                          background: "rgba(200,150,30,0.09)",
                          border: "1px solid rgba(200,150,30,0.25)",
                          borderRadius: 8,
                          padding: "8px 0",
                          fontSize: "clamp(18px,3vw,26px)",
                          minWidth: 52,
                        }}
                      >
                        {c.v}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1.5 uppercase tracking-wider font-dm-mono">
                        {c.l}
                      </div>
                    </div>
                    {i < arr.length - 1 && <span className="text-gold text-xl font-dm-mono mb-3">:</span>}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-600 mt-3">{t.cd_after}</div>
            </div>
          </div>

          {/* Upgrade promise */}
          <div className="flex justify-center mb-10">
            <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 text-sm text-slate-400 max-w-2xl text-center">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong className="text-slate-300">{t.upgrade_promise_a}</strong>
                {t.upgrade_promise_b}
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Free */}
            <PricingCard
              borderClass="border-white/10"
              tagClass="text-slate-500 border-white/10"
              tagLabel={t.forever}
              title={t.free}
              titleColor="text-white"
              sub={t.free_sub}
              priceJsx={<div className="text-3xl font-dm-mono font-bold text-slate-400 mb-6">{t.free}</div>}
              ctaLabel={t.free_cta}
              ctaClass="bg-white/10 text-slate-300 hover:bg-white/15"
              note=""
              features={[
                { ok: true, text: t.li_free_1 },
                { ok: true, text: t.li_free_2 },
                { ok: true, text: t.li_free_3 },
                { ok: true, text: t.li_free_4 },
                { ok: false, text: t.li_free_5 },
              ]}
              ctaHref="/exam/guest"
            />

            {/* Core */}
            <PricingCard
              borderClass="border-blue-500/30"
              tagClass="text-blue-400 border-blue-500/30"
              tagLabel={t.months3}
              title="Core"
              titleColor="text-white"
              sub={t.core_sub}
              priceJsx={
                <div className="mb-6">
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-dm-mono font-bold text-blue-400">€34.99</span>
                    <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full mb-1">
                      33% OFF
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">{t.after_may15("€49.99")}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-dm-mono">{t.one_time_3mo}</div>
                </div>
              }
              ctaLabel={t.core_cta}
              ctaClass="bg-blue-600 text-white hover:opacity-90"
              note={t.instant_access}
              features={[
                { ok: true, text: t.li_core_1 },
                { ok: true, text: t.li_core_2 },
                { ok: true, text: t.li_core_3 },
                { ok: true, text: t.li_core_4 },
                { ok: false, text: t.li_core_5 },
              ]}
              ctaHref="/register?plan=core"
            />

            {/* Pro 3mo */}
            <PricingCard
              borderClass="border-gold/30"
              tagClass="text-gold border-gold/30"
              tagLabel={t.months3}
              title={
                <>
                  Pro <span className="text-[10px] font-dm-mono font-normal text-gold">3mo</span>
                </>
              }
              titleColor="text-white"
              sub={t.pro3_sub}
              priceJsx={
                <div className="mb-6">
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-dm-mono font-bold text-gold">€44.99</span>
                    <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full mb-1">
                      31% OFF
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">{t.after_may15("€64.99")}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-dm-mono">{t.one_time_3mo}</div>
                </div>
              }
              ctaLabel={t.pro3_cta}
              ctaClass="bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30"
              note={t.instant_access}
              features={[
                { ok: true, text: t.li_core_1 },
                { ok: true, text: t.li_core_2 },
                { ok: true, text: t.li_core_3 },
                { ok: true, text: t.li_core_4 },
                { ok: true, text: t.li_core_5 },
              ]}
              ctaHref="/register?plan=pro"
            />

            {/* Pro 6mo — most popular */}
            <div className="relative bg-gradient-to-b from-[#142847] to-[#0D1F3C] border-2 border-gold/50 rounded-2xl p-6 flex flex-col shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold to-gold-hover text-darkbg text-[10px] font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg shadow-gold/30">
                ★ {t.most_popular}
              </div>
              <div className="text-[10px] font-dm-mono text-gold border border-gold/30 bg-gold/10 rounded-full px-2 py-0.5 w-fit mb-3 mt-1.5">
                {t.months6}
              </div>
              <h3 className="font-playfair text-2xl font-bold text-white mb-1">
                Pro <span className="text-[10px] font-dm-mono font-normal text-gold">6mo</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">{t.pro6_sub}</p>
              <div className="mb-6">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-dm-mono font-bold text-white">€69.99</span>
                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full mb-1">
                    33% OFF
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">{t.after_may15("€99.99")}</div>
                <div className="text-[11px] text-gold/70 mt-1 font-dm-mono font-semibold">{t.one_time_6mo}</div>
              </div>
              <Link
                to="/register?plan=pro_extended"
                className="min-h-[44px] w-full inline-flex items-center justify-center bg-gradient-to-r from-gold to-gold-hover text-darkbg text-sm font-bold py-2.5 rounded-lg mb-2 hover:opacity-90 transition shadow-lg shadow-gold/25"
              >
                {t.pro6_cta}
              </Link>
              <p className="text-[10px] text-center text-slate-500 mb-4">{t.instant_access_pro6}</p>
              <ul className="space-y-2.5 text-xs text-slate-400 flex-grow">
                {[t.li_core_1, t.li_core_2, t.li_core_3, t.li_core_4, t.li_core_5].map((li, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-400">✓</span>
                    {li}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-gold text-[10px] font-bold tracking-widest uppercase mb-2 block font-dm-mono">
              {t.testimonials_label}
            </span>
            <h2 className="font-playfair text-3xl font-bold text-white">{t.testimonials_h}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { q: t.test_t1, n: "Beta Tester 04" },
              { q: t.test_t2, n: "Beta Tester 27" },
              { q: t.test_t3, n: "Beta Tester 12" },
              { q: t.test_t4, n: "Beta Tester 19" },
            ].map((tt, i) => (
              <div key={i} className="bg-darkcard p-7 rounded-xl border border-white/5">
                <div className="flex items-center gap-0.5 mb-4">
                  <span className="text-gold text-xs">★★★★★</span>
                </div>
                <p className="italic text-slate-400 text-sm mb-5 leading-relaxed">{tt.q}</p>
                <p className="font-bold text-white text-xs">— {tt.n}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{t.test_role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-playfair text-3xl font-bold text-white">{t.faq_h}</h2>
          </div>
          <div className="space-y-3">
            {t.faq.map((item, i) => (
              <details
                key={i}
                className="group bg-darkcard rounded-xl border border-white/5 overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer font-playfair font-bold text-white text-base">
                  <h3>{item.q}</h3>
                  <span className="transition duration-300 group-open:-rotate-180 text-gold flex-shrink-0">
                    <svg fill="none" height="20" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width="20">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 relative z-10">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-4">{t.final_h}</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">{t.final_p}</p>
          <Link
            to={startHref}
            className="min-h-[52px] inline-flex items-center justify-center bg-gradient-to-r from-gold to-gold-hover text-darkbg px-12 py-4 rounded-lg font-bold text-base hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-xl shadow-gold/25 mb-3"
          >
            {t.final_cta}
          </Link>
          <p className="text-[11px] text-slate-500">{t.final_sub}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 pt-12 pb-8 px-6 bg-darkbg relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
              <span className="text-gold font-playfair font-bold text-xs">T</span>
            </div>
            <span className="font-playfair text-base font-bold text-white">
              til<span className="text-gold">prep</span>
              <span className="font-dm-mono text-[8px] text-slate-600 ml-0.5">.com</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <a href="#pricing" className="hover:text-white transition">{t.foot_pricing}</a>
            <Link to="/login" className="hover:text-white transition">{t.nav_login}</Link>
            <Link to="/register" className="hover:text-white transition">{t.nav_signup}</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/5 pt-5 text-[10px] text-slate-600 leading-relaxed">
          <p className="mb-1 uppercase font-dm-mono font-bold tracking-wider">{t.foot_indep}</p>
          <p>{t.foot_disc}</p>
        </div>
      </footer>
    </div>
  );
};

// Pricing card subcomponent
function PricingCard(props: {
  borderClass: string;
  tagClass: string;
  tagLabel: string;
  title: React.ReactNode;
  titleColor: string;
  sub: string;
  priceJsx: React.ReactNode;
  ctaLabel: string;
  ctaClass: string;
  note: string;
  features: { ok: boolean; text: string }[];
  ctaHref: string;
}) {
  return (
    <div
      className={`bg-darkcard border ${props.borderClass} rounded-2xl p-6 flex flex-col hover:-translate-y-1 transition-all duration-300`}
    >
      <div className={`text-[10px] font-dm-mono border rounded-full px-2 py-0.5 w-fit mb-3 ${props.tagClass}`}>
        {props.tagLabel}
      </div>
      <h3 className={`font-playfair text-2xl font-bold mb-1 ${props.titleColor}`}>{props.title}</h3>
      <p className="text-xs text-slate-500 mb-5">{props.sub}</p>
      {props.priceJsx}
      <Link
        to={props.ctaHref}
        className={`min-h-[44px] w-full inline-flex items-center justify-center font-semibold text-sm py-2.5 rounded-lg mb-2 transition ${props.ctaClass}`}
      >
        {props.ctaLabel}
      </Link>
      {props.note && <p className="text-[10px] text-center text-slate-500 mb-4">{props.note}</p>}
      <ul className="space-y-2.5 text-xs text-slate-400 flex-grow">
        {props.features.map((f, i) => (
          <li key={i} className={`flex gap-2 ${f.ok ? "" : "opacity-40"}`}>
            <span className={f.ok ? "text-green-400" : ""}>{f.ok ? "✓" : "—"}</span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Index;
