import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

const T = {
  nav: { login: { en: "Login", it: "Accedi" }, signup: { en: "Sign Up", it: "Registrati" }, dashboard: { en: "Dashboard", it: "Dashboard" } },
  hero: {
    badge: { en: "Prepare before the next TIL session", it: "Preparati prima della prossima sessione TIL" },
    builtBy: { en: "Built by Engineering Students from Politecnico di Torino", it: "Creato da studenti di ingegneria del Politecnico di Torino" },
    h1a: { en: "Pass the TIL.", it: "Supera il TIL." },
    h1b: { en: "Not by luck —", it: "Non per fortuna —" },
    h1c: { en: "by design.", it: "con metodo." },
    sub: { en: "Train until the real exam feels familiar. TILPrep mirrors the exact format, timing, and penalty system — so you walk in having already done this before.", it: "Allenati finché l'esame reale non ti sembra familiare. TILPrep replica il formato esatto, i tempi e il sistema di penalità — così arrivi all'esame avendolo già vissuto." },
    cta: { en: "Start Free Mock", it: "Inizia Simulazione Gratuita" },
    ctaNote1: { en: "Free access · No commitment", it: "Accesso gratuito · Nessun impegno" },
    ctaNote2: { en: "Join 157+ students preparing right now", it: "Unisciti a 157+ studenti che si preparano ora" },
    remaining: { en: "remaining", it: "rimanente" },
  },
  stats: {
    sets: { en: "14 Sets", it: "14 Set" }, setsLabel: { en: "Calibrated Exams", it: "Esami Calibrati" },
    qLabel: { en: "Unique Questions", it: "Domande Uniche" }, penaltyLabel: { en: "Penalty Active", it: "Penalità Attiva" },
    yrs: { en: "3 Yrs", it: "3 Anni" }, yrsLabel: { en: "Public Data Models", it: "Di Dati Pubblici" },
  },
  features: {
    eyebrow: { en: "Core Mechanics", it: "Meccaniche Principali" },
    title: { en: "Engineered for the extremes.", it: "Progettato per gli estremi." },
    f1t: { en: "Adaptive & Extreme Testing", it: "Test Adattivi ed Estremi" },
    f1d: { en: "Our sets are highly randomized and focused on testing you to the absolute extreme. We brutally prepare you for the worst possible scenarios so the real exam feels manageable.", it: "I nostri set sono altamente randomizzati e mirano a testarti fino al limite assoluto. Ti prepariamo rigorosamente per gli scenari peggiori, in modo che l'esame reale ti sembri gestibile." },
    f2t: { en: "Penalty Optimization", it: "Ottimizzazione delle Penalità" },
    f2d: { en: 'Blind guessing destroys scores. Our analytics track your risk-taking behavior across sections to mathematically optimize your "skip vs. guess" threshold.', it: 'Tirare a indovinare distrugge il punteggio. Le nostre analisi tracciano la tua propensione al rischio per ottimizzare matematicamente la tua soglia di "salta vs. indovina".' },
    f3t: { en: "Realistic Interface", it: "Interfaccia Realistica" },
    f3d: { en: "We built a tight approximation of the testing interface. Learn to manage the digital timer, navigation flow, and bilingual toggles to build muscle memory before test day.", it: "Abbiamo sviluppato un'accurata approssimazione dell'interfaccia d'esame. Impara a gestire il timer digitale, il flusso di navigazione e i toggle bilingue per sviluppare memoria muscolare prima del test." },
  },
  pricing: {
    title: { en: "Start free. Upgrade when ready.", it: "Inizia gratis. Passa a Pro quando sei pronto." },
    sub: { en: "One-time payments. No hidden subscriptions.", it: "Pagamenti una tantum. Nessun abbonamento nascosto." },
    expiresIn: { en: "Launch price expires in", it: "Il prezzo di lancio scade tra" },
    days: { en: "Days", it: "Giorni" }, hours: { en: "Hours", it: "Ore" }, min: { en: "Min", it: "Min" }, sec: { en: "Sec", it: "Sec" },
    increases: { en: "Price increases to full rate on May 15", it: "Il prezzo aumenta al valore pieno il 15 maggio" },
    upgradePromiseTitle: { en: "Bought the wrong plan?", it: "Hai scelto il piano sbagliato?" },
    upgradePromiseBody: { en: "Upgrade any time — we credit your original purchase in full. You only ever pay the difference.", it: "Aggiorna in qualsiasi momento — accreditiamo il tuo acquisto originale per intero. Paghi solo la differenza." },
    forever: { en: "Forever", it: "Per sempre" }, months3: { en: "3 months", it: "3 mesi" }, months6: { en: "6 months", it: "6 mesi" },
    free: { en: "Free", it: "Gratis" }, freeTry: { en: "Try before you commit", it: "Prova prima di impegnarti" },
    freeBtn: { en: "Try One Exam Free", it: "Prova un Esame Gratis" },
    coreSub: { en: "Everything you need to start", it: "Tutto il necessario per iniziare" }, coreBtn: { en: "Start with Core", it: "Inizia con Core" },
    pro3Sub: { en: "Full arsenal, short window", it: "Arsenale completo, finestra breve" }, pro3Btn: { en: "Start Pro 3mo", it: "Inizia Pro 3 mesi" },
    pro6Sub: { en: "Covers your entire preparation period", it: "Copre l'intero periodo di preparazione" }, pro6Btn: { en: "Start Pro 6mo", it: "Inizia Pro 6 mesi" },
    mostPopular: { en: "Most Popular", it: "Più Popolare" },
    instantNote: { en: "Instant access · No hidden fees", it: "Accesso immediato · Nessun costo nascosto" },
    instantNoteNoRenew: { en: "Instant access · No hidden fees · No renewals", it: "Accesso immediato · Nessun costo nascosto · Nessun rinnovo" },
    afterMay: { en: "after", it: "dopo il" }, may15: { en: "May 15", it: "15 maggio" },
    onetime3: { en: "3 months full access — one-time payment", it: "3 mesi di accesso completo — pagamento unico" },
    onetime6: { en: "6 months full access — one-time payment. No renewals.", it: "6 mesi di accesso — pagamento unico. Nessun rinnovo." },
  },
  testi: {
    eyebrow: { en: "Early Access Feedback", it: "Feedback Accesso Anticipato" },
    title: { en: "What beta testers are saying.", it: "Cosa dicono i beta tester." },
    role: { en: "Engineering student, PoliTo applicant", it: "Studente di ingegneria, candidato PoliTo" },
    t1: { en: '"The sets are brutally hard. My time management was a disaster at first. It was exactly the wake-up call I needed."', it: '"I test sono brutali. Il mio time management era disastroso all\'inizio. Esattamente la sveglia di cui avevo bisogno."' },
    t2: { en: '"The penalty analytics showed me I was losing almost 4 points per exam just from random guessing. I adjusted my strategy immediately."', it: '"L\'analisi delle penalità mi ha mostrato che perdevo 4 punti per risposte casuali. Ho cambiato strategia immediatamente."' },
    t3: { en: '"Arriving at the exam knowing exactly what interface and difficulty to expect changes everything. I feel completely in control."', it: '"Arrivare all\'esame sapendo esattamente quale interfaccia e difficoltà aspettarsi cambia tutto. Mi sento in totale controllo."' },
    t4: { en: '"Seeing my admission probability calculated against actual historical PoliTo data finally gave me the peace of mind to focus."', it: '"Vedere la probabilità di ammissione calcolata sui dati storici reali del PoliTo mi ha dato la tranquillità per concentrarmi."' },
  },
  faq: {
    title: { en: "Frequently Asked Questions", it: "Domande Frequenti" },
    q1: { en: "What is the TIL-I exam?", it: "Cos'è l'esame TIL-I?" },
    a1: { en: "The TIL-I (Test di Ingegneria e Logica) is the official engineering admission test for Politecnico di Torino. It consists of 42 questions across Mathematics, Logic, Physics, and Technical Knowledge, lasting 90 minutes. Incorrect answers result in a -0.25 penalty.", it: "Il TIL-I è il test ufficiale di ammissione per ingegneria al Politecnico di Torino. È composto da 42 domande di Matematica, Logica, Fisica e Conoscenze Tecniche, per 90 minuti. Le risposte errate prevedono una penalità di -0.25." },
    q2: { en: "Is the TIL-I the same as the TOLC-I?", it: "Il TIL-I è uguale al TOLC-I?" },
    a2: { en: "No. The TOLC-I is a generic test managed by CISIA for multiple universities. The TIL-I is exclusive to Politecnico di Torino, with a different difficulty scale, structure, and penalty system.", it: "No. Il TOLC-I è un test generico gestito dal CISIA. Il TIL-I è esclusivo del Politecnico di Torino, con scala di difficoltà, struttura e penalità differenti." },
    q3: { en: "How is admission probability calculated?", it: "Come viene calcolata la probabilità di ammissione?" },
    a3: { en: "We map your mock exam score against publicly available historical PoliTo admission ranking lists from the last 3 years, specific to your engineering programme.", it: "Confrontiamo il punteggio della simulazione con le graduatorie storiche pubbliche del PoliTo degli ultimi 3 anni, specifiche per il tuo programma." },
    q4: { en: "Can I retake the TIL-I?", it: "Posso ripetere il TIL-I?" },
    a4: { en: "Yes. You can retake it in subsequent sessions. On TILPrep, your history is saved so you can resume prep with full analytical context.", it: "Sì. Puoi ripeterlo nelle sessioni successive. Su TILPrep lo storico viene salvato per riprendere la preparazione." },
    q5: { en: "Is TILPrep available in English?", it: "TILPrep è disponibile in inglese?" },
    a5: { en: "Yes — fully. Every simulation, explanation, and dashboard is available in both English and Italian. Switch languages anytime via the toggle in the navigation bar.", it: "Sì — completamente. Ogni simulazione, spiegazione e dashboard è disponibile in inglese e italiano. Cambia lingua in qualsiasi momento dalla barra di navigazione." },
  },
  footer: {
    independent: { en: "Independent Platform", it: "Piattaforma Indipendente" },
    body: { en: 'TILPrep is an independent educational tool and is not affiliated with, endorsed by, or connected to Politecnico di Torino. "TIL-I" is a registered trademark of Politecnico di Torino. Built for launch 2026.', it: 'TILPrep è uno strumento educativo indipendente e non è affiliato al Politecnico di Torino. "TIL-I" è un marchio registrato del Politecnico di Torino. Sviluppato per il lancio nel 2026.' },
    terms: { en: "Terms", it: "Termini" }, privacy: { en: "Privacy", it: "Privacy" }, pricing: { en: "Pricing", it: "Prezzi" },
  },
  sticky: {
    title: { en: "TILPrep — Launch pricing ends May 15", it: "TILPrep — Prezzi lancio terminano il 15 maggio" },
    sub: { en: "From €34.99 one-time · No subscription", it: "Da €34.99 una tantum · Nessun abbonamento" },
    tryFree: { en: "Try Free", it: "Prova Gratis" }, seePlans: { en: "See Plans →", it: "Vedi Piani →" },
  },
  exit: {
    eyebrow: { en: "Wait — before you go", it: "Aspetta — prima di andare" },
    title: { en: "Get your free TIL-I preparation guide.", it: "Ricevi la guida gratuita alla preparazione TIL-I." },
    body: { en: "We'll send you the exact score thresholds, penalty strategy, and topic priority guide used by our top-scoring beta testers. No spam. One email.", it: "Ti inviamo le soglie di punteggio, la strategia sulle penalità e la priorità degli argomenti dei nostri beta tester migliori. Niente spam." },
    submit: { en: "Send Me the Guide →", it: "Inviami la Guida →" },
    no: { en: "No thanks, I'll figure it out myself", it: "No grazie, me la cavo da solo" },
    successTitle: { en: "Check your inbox.", it: "Controlla la tua casella." },
    successBody: { en: "The guide is on its way. Good luck with your preparation.", it: "La guida è in arrivo. Buona fortuna con la preparazione." },
  },
  cookie: {
    body: { en: "We use analytics cookies to understand how students use TILPrep and improve the experience. We do not sell your data.", it: "Utilizziamo cookie analitici per capire come gli studenti usano TILPrep. Non vendiamo i tuoi dati." },
    accept: { en: "Accept", it: "Accetta" }, reject: { en: "Reject", it: "Rifiuta" },
  },
};

const tt = (k: { en: string; it: string }, lang: "en" | "it") => k[lang];

function Opt({ label, state }: { label: string; state?: "correct" | "wrong" }) {
  if (state === "correct")
    return (
      <div className="p-2 border border-green-500/50 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-700 dark:text-green-400 text-[11px] font-bold flex justify-between items-center">
        <span>{label}</span>
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
    );
  if (state === "wrong")
    return (
      <div className="p-2 border border-red-500/50 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-700 dark:text-red-400 text-[11px] font-bold flex justify-between items-center">
        <span>{label}</span>
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </div>
    );
  return <div className="p-2 border border-black/10 dark:border-white/10 rounded-lg text-navy/80 dark:text-slate-300 text-[11px] font-medium bg-cream-50 dark:bg-darkbg/50">{label}</div>;
}

function SlideshowCards({ lang }: { lang: "en" | "it" }) {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setCur((c) => (c + 1) % 3), 4500);
    return () => clearInterval(id);
  }, [paused]);
  const cls = (i: number) =>
    `absolute top-0 left-0 w-full h-full bg-white dark:bg-darkcard rounded-xl shadow-2xl border border-cream-100 dark:border-white/5 p-5 flex flex-col transition-all duration-500 ${i === cur ? "opacity-100 scale-100 pointer-events-auto z-10" : "opacity-0 scale-95 pointer-events-none z-0"}`;
  return (
    <div className="relative w-full max-w-sm h-[400px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={cls(0)}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-black/5 dark:border-white/5">
          <span className="bg-black/5 dark:bg-white/10 text-navy/70 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded font-mono uppercase tracking-wider">{lang === "en" ? "Mathematics" : "Matematica"}</span>
          <span className="text-red-500 text-xs font-mono font-medium flex items-center gap-1">
            <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[9px] text-red-400 mr-0.5">{tt(T.hero.remaining, lang)}</span>12:45
          </span>
        </div>
        <p className="text-navy dark:text-white font-medium text-sm leading-snug mb-4 flex-grow">
          {lang === "en" ? "Evaluate the limit:" : "Calcolare il seguente limite:"}
          <span className="block mt-2 font-mono text-center text-base bg-cream dark:bg-darkbg py-1.5 rounded border border-black/5 dark:border-white/5">lim<sub>x→0</sub> (sin x) / x</span>
        </p>
        <div className="space-y-1.5">
          <Opt label={lang === "en" ? "A) Undefined" : "A) Non esiste"} />
          <Opt label="B) 1" state="correct" /><Opt label="C) 0" state="wrong" /><Opt label="D) ∞" /><Opt label="E) -1" />
        </div>
      </div>
      <div className={cls(1)}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-black/5 dark:border-white/5">
          <span className="bg-black/5 dark:bg-white/10 text-navy/70 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded font-mono uppercase tracking-wider">{lang === "en" ? "Physics" : "Fisica"}</span>
        </div>
        <p className="text-navy dark:text-white font-medium text-sm leading-snug mb-3 flex-grow">
          {lang === "en" ? <>A block of mass <i>m</i> slides down a frictionless incline of angle <i>θ</i>. What is its acceleration?</> : <>Un corpo di massa <i>m</i> scivola lungo un piano inclinato privo di attrito di angolo <i>θ</i>. Qual è la sua accelerazione?</>}
        </p>
        <div className="space-y-1.5">
          <Opt label="A) m · g · cos(θ)" state="wrong" /><Opt label="B) g · cos(θ)" /><Opt label="C) g · sin(θ)" state="correct" /><Opt label="D) g · tan(θ)" /><Opt label="E) m · g · sin(θ)" />
        </div>
      </div>
      <div className={cls(2)}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-black/5 dark:border-white/5">
          <span className="bg-black/5 dark:bg-white/10 text-navy/70 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded font-mono uppercase tracking-wider">{lang === "en" ? "Logic" : "Logica"}</span>
        </div>
        <p className="text-navy dark:text-white font-medium text-sm leading-snug mb-3 flex-grow">
          {lang === "en" ? '"If all engineers are methodical, and some students are engineers, then..."' : '"Tutti gli ingegneri sono metodici e alcuni studenti sono ingegneri, quindi..."'}
        </p>
        <div className="space-y-1.5">
          <Opt label={lang === "en" ? "A) All students are methodical." : "A) Tutti gli studenti sono metodici."} />
          <Opt label={lang === "en" ? "B) No students are methodical." : "B) Nessuno studente è metodico."} state="wrong" />
          <Opt label={lang === "en" ? "C) All engineers are students." : "C) Tutti gli ingegneri sono studenti."} />
          <Opt label={lang === "en" ? "D) Some students are methodical." : "D) Alcuni studenti sono metodici."} state="correct" />
          <Opt label={lang === "en" ? "E) Some methodical people are not students." : "E) Alcune persone metodiche non sono studenti."} />
        </div>
      </div>
    </div>
  );
}

function useCountdown() {
  const target = useRef<number>(Date.now() + 11 * 24 * 60 * 60 * 1000).current;
  const [t, setT] = useState({ d: "00", h: "00", m: "00", s: "00" });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const pad = (v: number) => String(v).padStart(2, "0");
      setT({
        d: pad(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000)),
        m: pad(Math.floor((diff % 3600000) / 60000)),
        s: pad(Math.floor((diff % 60000) / 1000)),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <div className={`inline-block border ${cls} text-[10px] font-mono px-2 py-0.5 rounded-full mb-4 w-fit`}>{children}</div>;
}

function Price({ color, price, original, lang, oneTime, highlight }: { color: string; price: string; original: string; lang: "en" | "it"; oneTime: string; highlight?: boolean }) {
  const pct = Math.round((1 - parseFloat(price.replace("€", "")) / parseFloat(original.replace("€", ""))) * 100);
  return (
    <div className="mb-6">
      <div className="flex items-end gap-2 mb-1">
        <span className={`text-3xl font-mono font-bold ${color}`}>{price}</span>
        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full mb-1">{pct}% OFF</span>
      </div>
      <div className="text-[10px] text-slate-500">{original} {tt(T.pricing.afterMay, lang)} <strong className="text-terra dark:text-gold">{tt(T.pricing.may15, lang)}</strong></div>
      <div className={`text-[11px] mt-1 font-mono ${highlight ? "text-gold/70 font-semibold" : "text-slate-500"}`}>{oneTime}</div>
    </div>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 flex-grow font-medium">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-4 h-4 rounded-full border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center text-[8px] flex-shrink-0 mt-0.5">✓</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Index() {
  const { lang, setLang, theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cd = useCountdown();
  const [stickyVisible, setStickyVisible] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitSent, setExitSent] = useState(false);
  const [exitEmail, setExitEmail] = useState("");
  const [cookieVisible, setCookieVisible] = useState(false);
  const dashboard = user ? "/dashboard" : "/register";

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById("hero")?.offsetHeight ?? 600;
      setStickyVisible(window.scrollY > hero);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("cookies-accepted") && !localStorage.getItem("cookies-rejected")) {
      const id = setTimeout(() => setCookieVisible(true), 1800);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    let shown = false;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !shown && !localStorage.getItem("exit-email-captured")) { shown = true; setExitOpen(true); }
    };
    const onHide = () => {
      if (document.hidden && !shown && !localStorage.getItem("exit-email-captured")) { shown = true; setTimeout(() => setExitOpen(true), 300); }
    };
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => { document.removeEventListener("mouseleave", onLeave); document.removeEventListener("visibilitychange", onHide); };
  }, []);

  const submitExitEmail = () => {
    const email = exitEmail.trim();
    if (!email.includes("@")) return;
    localStorage.setItem("captured_email", email);
    localStorage.setItem("exit-email-captured", "true");
    setExitSent(true);
    setTimeout(() => setExitOpen(false), 3000);
  };

  const logo = theme === "dark" ? logoDark : logoLight;

  return (
    <div className="font-sans bg-cream text-navy dark:bg-darkbg dark:text-slate-300 antialiased overflow-x-hidden relative min-h-screen transition-colors duration-300">
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-300"
        style={{
          backgroundImage: theme === "dark"
            ? "linear-gradient(rgba(43,95,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43,95,166,0.05) 1px, transparent 1px)"
            : "linear-gradient(rgba(19,27,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(19,27,42,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 py-3 border-b border-black/5 dark:border-white/5 bg-cream/90 dark:bg-darkbg/90 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="TILPrep" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-1.5 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center text-navy/70 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5 transition" aria-label="Toggle Theme">
              {theme === "dark"
                ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 4.22a1 1 0 01-1.415 1.415l-.708-.708a1 1 0 011.415-1.415l.708.708zM12 10a2 2 0 11-4 0 2 2 0 014 0zm-2 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5-5a1 1 0 01-1-1h-1a1 1 0 110-2h1a1 1 0 011 1zm-9-2a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM4.929 15.071a1 1 0 011.415-1.415l.708.708a1 1 0 01-1.415 1.415l-.708-.708zM15.071 4.929a1 1 0 01-1.415 1.415l-.708-.708a1 1 0 011.415-1.415l.708.708zM15.071 15.071a1 1 0 01-1.415-1.415l-.708.708a1 1 0 011.415 1.415l.708-.708zM4.929 4.929a1 1 0 011.415 1.415l.708-.708a1 1 0 01-1.415-1.415l-.708.708z"/></svg>
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>}
            </button>
            <div className="flex rounded-md border border-black/10 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-white/5 text-[11px] font-bold font-mono">
              <button onClick={() => setLang("en")} className={`px-3 py-2 min-h-[44px] transition ${lang === "en" ? "bg-black/5 dark:bg-white/10 text-navy dark:text-white" : "text-navy/50 dark:text-slate-500 hover:text-navy dark:hover:text-white"}`}>EN</button>
              <button onClick={() => setLang("it")} className={`px-3 py-2 min-h-[44px] transition ${lang === "it" ? "bg-black/5 dark:bg-white/10 text-navy dark:text-white" : "text-navy/50 dark:text-slate-500 hover:text-navy dark:hover:text-white"}`}>IT</button>
            </div>
            <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
            <Link to="/login" className="text-xs font-semibold text-navy/80 hover:text-navy dark:text-white/80 dark:hover:text-white transition hidden sm:flex items-center min-h-[44px]">{tt(T.nav.login, lang)}</Link>
            <Link to={dashboard} className="text-xs font-bold bg-navy text-white dark:bg-gold dark:text-darkbg px-4 py-2 min-h-[44px] flex items-center rounded-md hover:opacity-90 transition">
              {user ? tt(T.nav.dashboard, lang) : tt(T.nav.signup, lang)}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="hero" className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 border border-terra/30 text-terra dark:border-gold/30 dark:bg-gold/10 dark:text-gold rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-terra dark:bg-gold animate-pulse" />
              <span>{tt(T.hero.badge, lang)}</span>
            </div>
            <div className="text-[11px] font-mono text-navy/60 dark:text-slate-400 mb-3 font-bold uppercase tracking-wider">{tt(T.hero.builtBy, lang)}</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] font-bold text-navy dark:text-white mb-6">
              {tt(T.hero.h1a, lang)}<br />
              <span className="text-terra dark:text-gold italic font-normal">{tt(T.hero.h1b, lang)}</span><br />
              {tt(T.hero.h1c, lang)}
            </h1>
            <p className="text-base sm:text-[1.15rem] text-navy/70 dark:text-slate-300 mb-8 max-w-lg leading-relaxed font-medium">{tt(T.hero.sub, lang)}</p>
            <div className="flex flex-col sm:items-start gap-3">
              <button onClick={() => navigate(dashboard)} className="min-h-[48px] w-full sm:w-auto bg-terra text-white dark:bg-gold dark:text-darkbg px-10 py-3.5 rounded-lg font-bold text-sm tracking-wide hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-terra/20 dark:shadow-gold/20">{tt(T.hero.cta, lang)}</button>
              <div className="text-[11px] text-navy/60 dark:text-slate-400 font-medium leading-relaxed mt-1">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {tt(T.hero.ctaNote1, lang)}
                </span>
                <span className="inline-block mt-1 sm:ml-2">{tt(T.hero.ctaNote2, lang)}</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 relative h-[450px] flex justify-center items-center">
            <div className="absolute w-[300px] h-[300px] bg-terra/10 dark:bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
            <SlideshowCards lang={lang} />
          </div>
        </div>
      </header>

      {/* STATS */}
      <section className="border-y border-black/5 dark:border-white/5 bg-cream-50/50 dark:bg-white/[0.02] relative z-10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center sm:justify-between items-center gap-8 text-center sm:text-left">
          {[
            { v: tt(T.stats.sets, lang), l: tt(T.stats.setsLabel, lang) },
            { v: "588", l: tt(T.stats.qLabel, lang) },
            { v: "-0.25", l: tt(T.stats.penaltyLabel, lang) },
            { v: tt(T.stats.yrs, lang), l: tt(T.stats.yrsLabel, lang) },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-mono text-3xl font-bold text-navy dark:text-white">{s.v}</div>
              <div className="text-[11px] font-bold text-navy/50 dark:text-slate-500 uppercase tracking-widest mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <span className="text-terra dark:text-gold text-[10px] font-bold tracking-widest uppercase mb-3 block font-mono">{tt(T.features.eyebrow, lang)}</span>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy dark:text-white">{tt(T.features.title, lang)}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />, title: tt(T.features.f1t, lang), desc: tt(T.features.f1d, lang), accent: false },
              { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />, title: tt(T.features.f2t, lang), desc: tt(T.features.f2d, lang), accent: true },
              { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />, title: tt(T.features.f3t, lang), desc: tt(T.features.f3d, lang), accent: false },
            ].map((f, i) => (
              <div key={i} className="bg-gradient-to-b from-white to-cream-50 dark:from-[#0D1627] dark:to-[#0A1120] p-8 rounded-xl border border-cream-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${f.accent ? "bg-terra/10 dark:bg-gold/10 text-terra dark:text-gold" : "bg-navy/5 dark:bg-white/5 text-navy dark:text-slate-300"}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h3 className="font-serif text-xl font-bold text-navy dark:text-white mb-4">{f.title}</h3>
                <p className="text-navy/70 dark:text-slate-400 text-[15px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 border-y border-black/5 dark:border-white/5 bg-cream-50/50 dark:bg-[#040A14] relative z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy dark:text-white">{tt(T.pricing.title, lang)}</h2>
            <p className="text-navy/60 dark:text-slate-400 mt-3 text-sm font-medium">{tt(T.pricing.sub, lang)}</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className="bg-white dark:bg-darkcard border border-terra/20 dark:border-gold/20 rounded-2xl px-8 py-5 text-center">
              <div className="text-[10px] text-navy/50 dark:text-slate-500 font-mono tracking-wider uppercase mb-3">{tt(T.pricing.expiresIn, lang)}</div>
              <div className="flex items-center gap-3 justify-center">
                {[{ v: cd.d, l: tt(T.pricing.days, lang) }, { v: cd.h, l: tt(T.pricing.hours, lang) }, { v: cd.m, l: tt(T.pricing.min, lang) }, { v: cd.s, l: tt(T.pricing.sec, lang) }].map((c, i) => (
                  <div key={i} className="flex items-end gap-3">
                    <div className="text-center">
                      <div className="font-mono text-3xl font-bold text-navy dark:text-white tabular-nums">{c.v}</div>
                      <div className="text-[9px] text-navy/50 dark:text-slate-500 mt-1.5 uppercase tracking-wider font-mono">{c.l}</div>
                    </div>
                    {i < 3 && <span className="text-terra dark:text-gold text-xl font-mono mb-3">:</span>}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-navy/50 dark:text-slate-600 mt-3">{tt(T.pricing.increases, lang)}</div>
            </div>
          </div>

          <div className="flex justify-center mb-10">
            <div className="flex items-center gap-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 text-sm text-navy/70 dark:text-slate-400 max-w-2xl text-center">
              <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span><strong className="text-navy dark:text-slate-300">{tt(T.pricing.upgradePromiseTitle, lang)}</strong> {tt(T.pricing.upgradePromiseBody, lang)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            <div className="bg-white dark:bg-[#0A1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col h-full hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <Pill cls="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">{tt(T.pricing.forever, lang)}</Pill>
              <h3 className="font-serif text-2xl font-bold text-navy dark:text-white mb-1">{tt(T.pricing.free, lang)}</h3>
              <div className="text-xs text-slate-500 mb-6 min-h-[3.5rem]">{tt(T.pricing.freeTry, lang)}</div>
              <div className="mb-8"><span className="text-3xl font-mono font-bold text-slate-400 dark:text-slate-300">{tt(T.pricing.free, lang)}</span></div>
              <button onClick={() => navigate(dashboard)} className="min-h-[44px] w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm py-2.5 rounded-lg mb-8 hover:bg-slate-200 dark:hover:bg-slate-700 transition">{tt(T.pricing.freeBtn, lang)}</button>
              <Features items={[
                lang === "en" ? "1 full mock exam" : "1 simulazione completa",
                lang === "en" ? "Score + section totals" : "Punteggio + totali per sezione",
                lang === "en" ? "Historical percentile rank" : "Percentile storico",
                lang === "en" ? "Admission probability estimate" : "Stima probabilità ammissione",
              ]} />
            </div>

            <div className="bg-white dark:bg-[#0A1120] border border-blue-200 dark:border-blue-900 rounded-2xl p-6 flex flex-col h-full hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <Pill cls="border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400">{tt(T.pricing.months3, lang)}</Pill>
              <h3 className="font-serif text-2xl font-bold text-navy dark:text-white mb-1">Core</h3>
              <div className="text-xs text-slate-500 mb-6 min-h-[3.5rem]">{tt(T.pricing.coreSub, lang)}</div>
              <Price color="text-blue-600 dark:text-blue-400" price="€34.99" original="€49.99" lang={lang} oneTime={tt(T.pricing.onetime3, lang)} />
              <button onClick={() => navigate("/pricing")} className="min-h-[44px] w-full bg-blue-600 text-white dark:bg-blue-700 font-semibold text-sm py-2.5 rounded-lg mb-3 hover:opacity-90 transition">{tt(T.pricing.coreBtn, lang)}</button>
              <p className="text-[10px] text-center text-slate-400 mb-5">{tt(T.pricing.instantNote, lang)}</p>
              <Features items={[
                lang === "en" ? "6 full mock exams + 1 bonus set" : "6 simulazioni complete + 1 set bonus",
                lang === "en" ? "Step-by-step solution for every question" : "Soluzione passo-passo per ogni domanda",
                lang === "en" ? "Historical percentile + admission probability" : "Percentile storico + probabilità ammissione",
                lang === "en" ? "Exam readiness score" : "Punteggio di prontezza",
              ]} />
            </div>

            <div className="bg-white dark:bg-darkcard border-2 border-terra dark:border-gold/40 rounded-2xl p-6 flex flex-col h-full relative shadow-xl hover:-translate-y-2 transition-all duration-300 z-10">
              <Pill cls="border-terra/30 text-terra dark:border-gold/40 dark:text-gold">{tt(T.pricing.months3, lang)}</Pill>
              <h3 className="font-serif text-2xl font-bold text-navy dark:text-white mb-1">Pro <span className="text-[10px] font-mono font-normal text-terra dark:text-gold">3mo</span></h3>
              <div className="text-xs text-slate-500 mb-6 min-h-[3.5rem]">{tt(T.pricing.pro3Sub, lang)}</div>
              <Price color="text-terra dark:text-gold" price="€44.99" original="€64.99" lang={lang} oneTime={tt(T.pricing.onetime3, lang)} />
              <button onClick={() => navigate("/pricing")} className="min-h-[44px] w-full bg-terra text-white dark:bg-gold/20 dark:text-gold dark:border dark:border-gold/30 font-bold text-sm py-2.5 rounded-lg mb-3 hover:opacity-90 dark:hover:bg-gold/30 transition shadow-lg shadow-terra/20 dark:shadow-none">{tt(T.pricing.pro3Btn, lang)}</button>
              <p className="text-[10px] text-center text-slate-400 mb-5">{tt(T.pricing.instantNote, lang)}</p>
              <Features items={[
                lang === "en" ? "12 full mock exams + 2 bonus sets" : "12 simulazioni complete + 2 set bonus",
                lang === "en" ? "Step-by-step solutions + error analysis" : "Soluzioni passo-passo + analisi degli errori",
                lang === "en" ? "Admission probability based on PoliTo data" : "Probabilità di ammissione su dati PoliTo",
                lang === "en" ? "See exactly why you lose marks (penalty optimizer)" : "Scopri esattamente perché perdi punti",
                lang === "en" ? "Topic mastery mode + preparation schedule" : "Modalità padronanza argomenti + piano di studio",
              ]} />
            </div>

            <div className="relative bg-white dark:bg-gradient-to-b dark:from-[#142847] dark:to-[#0D1F3C] border-2 border-gold/50 rounded-2xl p-6 flex flex-col h-full shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold to-gold-hover text-darkbg text-[10px] font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg shadow-gold/30">★ {tt(T.pricing.mostPopular, lang)}</div>
              <Pill cls="border-gold/40 bg-gold/10 text-gold mt-1">{tt(T.pricing.months6, lang)}</Pill>
              <h3 className="font-serif text-2xl font-bold text-navy dark:text-white mb-1">Pro <span className="text-[10px] font-mono font-normal text-gold">6mo</span></h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-6 min-h-[3.5rem]">{tt(T.pricing.pro6Sub, lang)}</div>
              <Price color="text-gold dark:text-white" price="€69.99" original="€99.99" lang={lang} oneTime={tt(T.pricing.onetime6, lang)} highlight />
              <button onClick={() => navigate("/pricing")} className="min-h-[44px] w-full bg-gradient-to-r from-gold to-gold-hover text-darkbg font-bold text-sm py-2.5 rounded-lg mb-3 hover:opacity-90 transition shadow-lg shadow-gold/25">{tt(T.pricing.pro6Btn, lang)}</button>
              <p className="text-[10px] text-center text-slate-400 mb-5">{tt(T.pricing.instantNoteNoRenew, lang)}</p>
              <Features items={[
                lang === "en" ? "12 full mock exams + 2 bonus sets" : "12 simulazioni complete + 2 set bonus",
                lang === "en" ? "Step-by-step solutions + full error analysis" : "Soluzioni passo-passo + analisi completa errori",
                lang === "en" ? "Admission probability based on PoliTo data" : "Probabilità di ammissione su dati PoliTo",
                lang === "en" ? "See exactly why you lose marks (penalty optimizer)" : "Scopri esattamente perché perdi punti",
                lang === "en" ? "Topic mastery mode + preparation schedule" : "Modalità padronanza argomenti + piano di studio",
                lang === "en" ? "Exam content support (24hr response)" : "Supporto contenuti esame (risposta 24h)",
              ]} />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-terra dark:text-gold text-[10px] font-bold tracking-widest uppercase mb-2 block font-mono">{tt(T.testi.eyebrow, lang)}</span>
            <h2 className="font-serif text-3xl font-bold text-navy dark:text-white">{tt(T.testi.title, lang)}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { q: tt(T.testi.t1, lang), n: "— Beta Tester 04" },
              { q: tt(T.testi.t2, lang), n: "— Beta Tester 27" },
              { q: tt(T.testi.t3, lang), n: "— Beta Tester 12" },
              { q: tt(T.testi.t4, lang), n: "— Beta Tester 19" },
            ].map((t, i) => (
              <div key={i} className="bg-white dark:bg-darkcard p-8 rounded-xl border border-cream-100 dark:border-white/5">
                <div className="text-gold text-xs mb-4">★★★★★</div>
                <p className="italic text-navy/70 dark:text-slate-400 text-sm mb-6 leading-relaxed">{t.q}</p>
                <p className="font-bold text-navy dark:text-white text-xs">{t.n}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{tt(T.testi.role, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-black/5 dark:border-white/5 bg-cream-50/50 dark:bg-[#040A14] relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12"><h2 className="font-serif text-3xl font-bold text-navy dark:text-white">{tt(T.faq.title, lang)}</h2></div>
          <div className="space-y-4">
            {[
              { q: tt(T.faq.q1, lang), a: tt(T.faq.a1, lang) },
              { q: tt(T.faq.q2, lang), a: tt(T.faq.a2, lang) },
              { q: tt(T.faq.q3, lang), a: tt(T.faq.a3, lang) },
              { q: tt(T.faq.q4, lang), a: tt(T.faq.a4, lang) },
              { q: tt(T.faq.q5, lang), a: tt(T.faq.a5, lang) },
            ].map((f, i) => (
              <details key={i} className="group bg-white dark:bg-darkcard rounded-xl border border-cream-100 dark:border-white/5 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-serif font-bold text-navy dark:text-white text-lg">
                  <h3>{f.q}</h3>
                  <span className="transition duration-300 group-open:-rotate-180 text-terra dark:text-gold">
                    <svg fill="none" height="24" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-navy/70 dark:text-slate-400 text-sm leading-relaxed border-t border-black/5 dark:border-white/5 pt-4">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10 dark:border-white/5 pt-12 pb-8 px-6 bg-cream-50 dark:bg-darkbg relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="TILPrep" className="h-8 w-auto object-contain" /></Link>
          <div className="flex flex-wrap gap-6 text-xs font-semibold text-navy/60 dark:text-slate-400">
            <a href="#faq" className="hover:text-navy dark:hover:text-white">FAQ</a>
            <a href="#pricing" className="hover:text-navy dark:hover:text-white">{tt(T.footer.pricing, lang)}</a>
            <Link to="/terms" className="hover:text-navy dark:hover:text-white">{tt(T.footer.terms, lang)}</Link>
            <Link to="/privacy" className="hover:text-navy dark:hover:text-white">{tt(T.footer.privacy, lang)}</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-black/5 dark:border-white/5 pt-6 text-[10px] text-navy/50 dark:text-slate-500 leading-relaxed">
          <p className="mb-2 uppercase font-mono font-bold tracking-wider">{tt(T.footer.independent, lang)}</p>
          <p>{tt(T.footer.body, lang)}</p>
        </div>
      </footer>

      {/* STICKY BAR */}
      <div className={`fixed bottom-0 left-0 w-full z-40 bg-white/95 dark:bg-darkbg/95 backdrop-blur-md border-t border-black/10 dark:border-white/10 transition-transform duration-500 ${stickyVisible && !cookieVisible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <div className="text-navy dark:text-white font-bold text-sm font-serif">{tt(T.sticky.title, lang)}</div>
            <div className="text-[11px] text-navy/50 dark:text-slate-500">{tt(T.sticky.sub, lang)}</div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="min-h-[40px] text-navy/70 dark:text-slate-300 border border-black/15 dark:border-white/15 text-xs font-semibold px-4 py-2 rounded-lg hover:border-black/30 dark:hover:border-white/30 transition">{tt(T.sticky.tryFree, lang)}</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="min-h-[40px] bg-terra text-white dark:bg-gradient-to-r dark:from-gold dark:to-gold-hover dark:text-darkbg text-xs font-bold px-5 py-2 rounded-lg hover:opacity-90 transition">{tt(T.sticky.seePlans, lang)}</button>
          </div>
        </div>
      </div>

      {/* EXIT INTENT MODAL */}
      {exitOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(4,10,20,0.85)", backdropFilter: "blur(6px)" }} onClick={(e) => { if (e.target === e.currentTarget) setExitOpen(false); }}>
          <div className="bg-white dark:bg-darkcard border border-terra/30 dark:border-gold/30 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setExitOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-navy dark:hover:text-white transition" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {!exitSent ? (
              <>
                <div className="text-[10px] font-mono text-terra dark:text-gold uppercase tracking-widest mb-3">{tt(T.exit.eyebrow, lang)}</div>
                <h3 className="font-serif text-2xl font-bold text-navy dark:text-white mb-2">{tt(T.exit.title, lang)}</h3>
                <p className="text-navy/70 dark:text-slate-400 text-sm mb-6 leading-relaxed">{tt(T.exit.body, lang)}</p>
                <div className="flex flex-col gap-3">
                  <input type="email" placeholder="your@email.com" autoComplete="email" value={exitEmail} onChange={(e) => setExitEmail(e.target.value)} className="w-full bg-cream-50 dark:bg-darkbg border border-black/15 dark:border-white/15 rounded-lg px-4 py-3 text-navy dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-terra/50 dark:focus:border-gold/50 focus:outline-none transition" />
                  <button onClick={submitExitEmail} className="min-h-[48px] w-full bg-terra text-white dark:bg-gradient-to-r dark:from-gold dark:to-gold-hover dark:text-darkbg font-bold text-sm py-3 rounded-lg hover:opacity-90 transition">{tt(T.exit.submit, lang)}</button>
                  <button onClick={() => setExitOpen(false)} className="text-[11px] text-slate-500 hover:text-navy dark:hover:text-slate-300 transition py-1">{tt(T.exit.no, lang)}</button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-4 text-green-500">✓</div>
                <h3 className="font-serif text-xl font-bold text-navy dark:text-white mb-2">{tt(T.exit.successTitle, lang)}</h3>
                <p className="text-navy/70 dark:text-slate-400 text-sm">{tt(T.exit.successBody, lang)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COOKIE BANNER */}
      <div className={`fixed bottom-0 left-0 w-full bg-navy dark:bg-[#0A1120] border-t border-black/10 dark:border-white/10 z-50 transform transition-transform duration-500 ${cookieVisible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/80 font-medium leading-relaxed max-w-3xl">
            {tt(T.cookie.body, lang)} <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={() => { localStorage.setItem("cookies-rejected", "true"); setCookieVisible(false); }} className="min-h-[44px] bg-transparent text-white/60 hover:text-white font-semibold text-xs px-4 py-2 rounded border border-white/20 hover:border-white/50 transition whitespace-nowrap">{tt(T.cookie.reject, lang)}</button>
            <button onClick={() => { localStorage.setItem("cookies-accepted", "true"); setCookieVisible(false); }} className="min-h-[44px] bg-white text-navy font-bold text-xs px-6 py-2 rounded hover:opacity-90 transition whitespace-nowrap shadow-md">{tt(T.cookie.accept, lang)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
