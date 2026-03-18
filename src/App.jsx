import { useState, useEffect, useRef } from "react";

/* ── Arka planda çalışmayı sürdürmek için sessiz ses ── */
function useWakeLock() {
  const wakeLockRef = useRef(null);

  async function request() {
    // 1) Screen Wake Lock API (en iyi yöntem)
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        return;
      }
    } catch (e) {}

    // 2) Web Audio API fallback – sıfır ses çalar, sayfa aktif kalır
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.loop = true;
      src.start(0);
      wakeLockRef.current = { type: "audio", ctx, src };
    } catch (e) {}
  }

  function release() {
    try {
      if (!wakeLockRef.current) return;
      if (wakeLockRef.current.type === "audio") {
        wakeLockRef.current.src.stop();
        wakeLockRef.current.ctx.close();
      } else {
        wakeLockRef.current.release();
      }
      wakeLockRef.current = null;
    } catch (e) {}
  }

  // Uygulama tekrar öne gelince wake lock yenile
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible" && wakeLockRef.current) request(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { request, release };
}

const SUBJECTS = [
  {
    id: "mat", name: "Matematik", emoji: "📐", color: "#FF6B6B",
    types: [
      { id: "kazanim",   label: "Kazanım Sorusu", secPerQ: 60  },
      { id: "yeninesil", label: "Yeni Nesil Soru", secPerQ: 150 },
    ],
  },
  {
    id: "fen", name: "Fen Bilimleri", emoji: "🔬", color: "#4ECDC4",
    types: [
      { id: "kazanim",   label: "Kazanım Sorusu", secPerQ: 45 },
      { id: "yeninesil", label: "Yeni Nesil Soru", secPerQ: 90 },
    ],
  },
  {
    id: "turkce", name: "Türkçe", emoji: "📖", color: "#FFD93D",
    types: [
      { id: "paragraf",  label: "Paragraf Sorusu", secPerQ: 120 },
      { id: "yeninesil", label: "Yeni Nesil Soru", secPerQ: 90  },
    ],
  },
  {
    id: "inkilap",   name: "İnkılap Tarihi", emoji: "🏛️", color: "#C3A6FF",
    types: [{ id: "soru", label: "Soru", secPerQ: 90 }],
  },
  {
    id: "ingilizce", name: "İngilizce",    emoji: "🌍", color: "#87CEEB",
    types: [{ id: "soru", label: "Soru", secPerQ: 90 }],
  },
  {
    id: "din",       name: "Din Kültürü", emoji: "☪️", color: "#A8E6CF",
    types: [{ id: "soru", label: "Soru", secPerQ: 90 }],
  },
];

const DAYS      = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const FULL_DAYS = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];

function getSub(id)     { return SUBJECTS.find(s => s.id === id) || SUBJECTS[0]; }
function getTodayIdx()  { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }
function fmtDur(sec) {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return h > 0
    ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

const defaultSchedule = {
  0: [{ subject:"mat",      type:"kazanim",   questionCount:20, topic:"Denklemler"           }],
  1: [{ subject:"fen",      type:"yeninesil", questionCount:10, topic:"Kuvvet ve Hareket"     }],
  2: [{ subject:"turkce",   type:"paragraf",  questionCount:12, topic:"Anlam Bilgisi"         },
      { subject:"ingilizce",type:"soru",      questionCount:15, topic:"Tenses"                }],
  3: [{ subject:"inkilap",  type:"soru",      questionCount:20, topic:"Kurtuluş Savaşı"       }],
  4: [{ subject:"mat",      type:"yeninesil", questionCount:8,  topic:"Fonksiyonlar"          },
      { subject:"din",      type:"soru",      questionCount:15, topic:"İbadet"                }],
  5: [{ subject:"fen",      type:"kazanim",   questionCount:25, topic:"Madde ve Özellikleri"  }],
  6: [],
};

/* ── tiny ring ── */
function Ring({ value, max, color, size=80, children }) {
  const r = (size-14)/2, circ = 2*Math.PI*r, pct = Math.min(value/Math.max(max,1),1);
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray .9s cubic-bezier(.34,1.56,.64,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>{children}</div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, letterSpacing:1 }}>{children}</div>;
}
function EmptyState({ text }) {
  return (
    <div style={{ background:"rgba(255,255,255,.03)", borderRadius:20, padding:"28px 20px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:14, lineHeight:1.7, border:"1px dashed rgba(255,255,255,.1)" }}>
      {text}
    </div>
  );
}

/* ══════════════════════════════════════════════
   INLINE TIMER – compact + optional fullscreen landscape
══════════════════════════════════════════════ */
function InlineTimer({ sess, color, onClose }) {
  const sub   = getSub(sess.subject);
  const tp    = sub.types.find(t => t.id === sess.type) || sub.types[0];
  const total = sess.questionCount * tp.secPerQ;

  const [elapsed,    setElapsed]    = useState(0);
  const [running,    setRunning]    = useState(false);
  const [phase,      setPhase]      = useState("idle");
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useRef(null);
  const wakeLock = useWakeLock();

  const remain = Math.max(total - elapsed, 0);
  const pct    = elapsed / Math.max(total, 1);
  const qDone  = Math.min(Math.floor(elapsed / tp.secPerQ), sess.questionCount);
  const qPct   = (elapsed % tp.secPerQ) / tp.secPerQ;

  useEffect(() => {
    if (running) {
      wakeLock.request();
      ref.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= total) { clearInterval(ref.current); setRunning(false); setPhase("done"); return total; }
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
      wakeLock.release();
    }
    return () => { clearInterval(ref.current); wakeLock.release(); };
  }, [running, total]);

  function handlePlay() {
    if (phase === "done") { setElapsed(0); setPhase("idle"); return; }
    setRunning(r => !r);
    if (phase === "idle") setPhase("running");
  }
  function handleReset() { setRunning(false); setElapsed(0); setPhase("idle"); }

  async function openFullscreen() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (e) { /* bazı tarayıcılar desteklemez, sessizce geç */ }
    setFullscreen(true);
  }

  async function closeFullscreen() {
    setFullscreen(false);
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  /* ── shared timer body, rendered in both modes ── */
  function TimerBody({ fs }) {
    const ringR   = fs ? 130 : 52;
    const ringW   = fs ? 14  : 10;
    const ringPx  = fs ? (ringR*2+ringW*2+4) : 120;
    const c2      = 2 * Math.PI * ringR;

    return (
      <div style={fs ? {
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        width:"100%", height:"100%", gap:24,
      } : {
        display:"flex", alignItems:"center", gap:14,
      }}>

        {/* Ring */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <svg width={ringPx} height={ringPx} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={ringPx/2} cy={ringPx/2} r={ringR} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={ringW}/>
            <circle cx={ringPx/2} cy={ringPx/2} r={ringR} fill="none" stroke={color} strokeWidth={ringW}
              strokeDasharray={`${c2*pct} ${c2}`} strokeLinecap="round"
              style={{ transition: running ? "stroke-dasharray 1s linear" : "none", filter:`drop-shadow(0 0 ${fs?14:6}px ${color}99)` }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap: fs?6:2 }}>
            {phase === "done" ? (
              <span style={{ fontSize: fs?28:13, fontWeight:800, color:"#10B981", textAlign:"center" }}>🎉{fs?" Bitti!":"\nBitti!"}</span>
            ) : (
              <>
                <span style={{ fontSize: fs?52:20, fontWeight:900, color:"#fff", letterSpacing:-1, fontVariantNumeric:"tabular-nums" }}>{fmtDur(remain)}</span>
                <span style={{ fontSize: fs?15:11, color:"rgba(255,255,255,.45)" }}>{qDone}/{sess.questionCount} soru</span>
              </>
            )}
          </div>
        </div>

        {/* Info + controls */}
        <div style={fs ? {
          display:"flex", flexDirection:"column", alignItems:"center", gap:14, width:"80%",
        } : {
          flex:1, display:"flex", flexDirection:"column", gap:8,
        }}>
          {/* Per-Q bar */}
          {phase === "running" && (
            <div style={{ width:"100%" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom: fs?6:4 }}>
                <span style={{ color:"rgba(255,255,255,.4)", fontSize: fs?13:11 }}>Soru #{qDone+1}</span>
                <span style={{ color, fontSize: fs?13:11, fontWeight:700 }}>{fmtDur(Math.round((1-qPct)*tp.secPerQ))} kaldı</span>
              </div>
              <div style={{ background:"rgba(255,255,255,.1)", borderRadius:99, height: fs?8:5 }}>
                <div style={{ height:"100%", borderRadius:99, background:color, width:`${qPct*100}%`, transition:"width 1s linear" }}/>
              </div>
            </div>
          )}

          {/* Subject + info row */}
          {fs && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:26 }}>{sub.emoji}</span>
              <div>
                <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>{sess.topic}</div>
                <div style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>{sub.name} · {tp.label} · {sess.questionCount} soru</div>
              </div>
            </div>
          )}
          {!fs && (
            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>
              {tp.secPerQ < 60 ? `${tp.secPerQ}sn` : `${tp.secPerQ/60}dk`} / soru · {sess.questionCount} soru · {fmtDur(total)}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, width: fs?"100%":undefined }}>
            <button onClick={handlePlay}
              style={{ flex: fs?undefined:undefined, width: fs?64:38, height: fs?64:38, borderRadius: fs?20:12, background:`linear-gradient(135deg,${color},${color}bb)`, border:"none", color:"#fff", fontSize: fs?28:18, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 18px ${color}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {phase==="done" ? "↺" : running ? "⏸" : "▶"}
            </button>
            <button onClick={handleReset}
              style={{ width: fs?54:38, height: fs?54:38, borderRadius: fs?18:12, background:"rgba(255,255,255,.1)", border:"none", color:"rgba(255,255,255,.6)", fontSize: fs?20:17, cursor:"pointer" }}>↺</button>
            {/* fullscreen toggle */}
            <button onClick={() => fs ? closeFullscreen() : openFullscreen()}
              style={{ width: fs?54:38, height: fs?54:38, borderRadius: fs?18:12, background: fs?"rgba(255,255,255,.15)":"rgba(255,255,255,.07)", border:"none", color:"rgba(255,255,255,.7)", fontSize: fs?18:14, cursor:"pointer" }}>
              {fs ? "⊠" : "⛶"}
            </button>
            {!fs && (
              <button onClick={onClose}
                style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,.05)", border:"none", color:"rgba(255,255,255,.35)", fontSize:17, cursor:"pointer" }}>✕</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── compact inline panel ── */}
      <div style={{ background:`${color}0e`, borderRadius:18, padding:"14px 16px", border:`1px solid ${color}30`, marginTop:2 }}
        onClick={e => e.stopPropagation()}>
        <TimerBody fs={false}/>
      </div>

      {/* ── fullscreen landscape overlay ── */}
      {fullscreen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position:"fixed",
            top:0, left:0,
            width:"100vw",
            height:"100vh",
            zIndex:9999,
            background:"#0A0A14",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
          }}>
          <div style={{
            width:"100%",
            height:"100%",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            padding:"0 48px",
            boxSizing:"border-box",
            position:"relative",
          }}>
            <button
              onClick={closeFullscreen}
              style={{ position:"absolute", top:16, right:16, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.12)", border:"none", color:"rgba(255,255,255,.7)", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>
              ✕
            </button>
            <TimerBody fs={true}/>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════
   SESSION CARD  (schedule + home)
══════════════════════════════════════════════ */
function SessionCard({ sess, dayIdx, idx, done, toggleDone, onRemove, showTimerBtn }) {
  const [timerOpen, setTimerOpen] = useState(false);
  const sub    = getSub(sess.subject);
  const tp     = sub.types.find(t => t.id === sess.type) || sub.types[0];
  const isDone = done[`${dayIdx}-${idx}`];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {/* Main row */}
      <div
        onClick={() => toggleDone(dayIdx, idx)}
        style={{ background: isDone ? "rgba(16,185,129,.07)" : "rgba(255,255,255,.04)", borderRadius: timerOpen ? "20px 20px 0 0" : 20, padding:"14px 16px", border:`1px solid ${isDone ? "rgba(16,185,129,.3)" : "rgba(255,255,255,.07)"}`, borderBottom: timerOpen ? "none" : undefined, display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all .2s" }}>

        {/* Emoji badge */}
        <div style={{ width:46, height:46, borderRadius:15, background:`${sub.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0, border:`1px solid ${sub.color}35` }}>
          {sub.emoji}
        </div>

        {/* Text */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color: isDone ? "rgba(255,255,255,.35)" : "#fff", textDecoration: isDone ? "line-through" : "none", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sess.topic}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.38)", marginTop:2 }}>{sub.name} · {tp.label}</div>
          <div style={{ fontSize:12, color:sub.color, marginTop:1, fontWeight:600 }}>{sess.questionCount} soru · {fmtDur(sess.questionCount*tp.secPerQ)}</div>
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
          {/* ✓ done */}
          <button onClick={() => toggleDone(dayIdx, idx)}
            style={{ width:28, height:28, borderRadius:9, background: isDone ? "#10B981" : "rgba(255,255,255,.08)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", cursor:"pointer", transition:"all .2s" }}>
            {isDone ? "✓" : ""}
          </button>

          {/* ⏱ timer toggle */}
          {showTimerBtn && (
            <button onClick={() => setTimerOpen(o => !o)}
              style={{ width:28, height:28, borderRadius:9, background: timerOpen ? `${sub.color}33` : "rgba(255,255,255,.06)", border:`1px solid ${timerOpen ? sub.color : "transparent"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, cursor:"pointer", transition:"all .2s" }}>
              ⏱
            </button>
          )}

          {/* × remove */}
          {onRemove && (
            <button onClick={onRemove}
              style={{ width:28, height:28, borderRadius:9, background:"rgba(239,68,68,.1)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#EF4444", cursor:"pointer" }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Inline timer panel */}
      {timerOpen && showTimerBtn && (
        <div style={{ border:`1px solid ${sub.color}30`, borderTop:"none", borderRadius:"0 0 20px 20px", overflow:"hidden" }}>
          <InlineTimer sess={sess} color={sub.color} onClose={() => setTimerOpen(false)} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════ */
export default function App() {
  const [tab,      setTab]      = useState("home");
  const [schedule, setSchedule] = useState(() => {
    try { const s = localStorage.getItem("dp_schedule"); return s ? JSON.parse(s) : defaultSchedule; } catch { return defaultSchedule; }
  });
  const [selDay,   setSelDay]   = useState(getTodayIdx());
  const [done,     setDone]     = useState(() => {
    try { const d = localStorage.getItem("dp_done"); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const [showAdd,  setShowAdd]  = useState(false);
  const [animIn,   setAnimIn]   = useState(true);

  useEffect(() => { try { localStorage.setItem("dp_schedule", JSON.stringify(schedule)); } catch {} }, [schedule]);
  useEffect(() => { try { localStorage.setItem("dp_done", JSON.stringify(done)); } catch {} }, [done]);

  useEffect(() => {
    setAnimIn(false);
    const t = setTimeout(() => setAnimIn(true), 40);
    return () => clearTimeout(t);
  }, [tab]);

  function toggleDone(d, i)  { const k=`${d}-${i}`; setDone(p => ({...p,[k]:!p[k]})); }
  function removeSession(d,i){ setSchedule(s => ({...s,[d]:s[d].filter((_,j)=>j!==i)})); }
  function addSession(sess)  { setSchedule(s => ({...s,[selDay]:[...(s[selDay]||[]),sess]})); setShowAdd(false); }

  const todayIdx     = getTodayIdx();
  const todaySessions = schedule[todayIdx]||[];
  const todayDone    = todaySessions.filter((_,i)=>done[`${todayIdx}-${i}`]).length;
  const totalWeekSec = Object.values(schedule).flat().reduce((a,s)=>{
    const sub=getSub(s.subject), tp=sub.types.find(t=>t.id===s.type)||sub.types[0];
    return a+s.questionCount*tp.secPerQ;
  },0);
  const totalSessions = Object.values(schedule).flat().length;

  const TABS = [
    { id:"home",     icon:"⌂",  label:"Ana Sayfa"  },
    { id:"schedule", icon:"📅", label:"Program"    },
    { id:"stats",    icon:"📊", label:"İstatistik" },
  ];

  return (
    <div style={{ minHeight:"100dvh", background:"#0F0F1A", display:"flex", flexDirection:"column", fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>

        {/* Safe area top spacer */}
        <div style={{ height:"env(safe-area-inset-top, 0px)", background:"#0F0F1A" }}/>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 0 110px", WebkitOverflowScrolling:"touch", opacity:animIn?1:0, transform:animIn?"translateY(0)":"translateY(14px)", transition:"opacity .35s ease, transform .35s ease" }}>
          {tab==="home"     && <HomeTab     schedule={schedule} todaySessions={todaySessions} todayIdx={todayIdx} todayDone={todayDone} totalWeekSec={totalWeekSec} totalSessions={totalSessions} done={done} toggleDone={toggleDone}/>}
          {tab==="schedule" && <ScheduleTab schedule={schedule} selDay={selDay} setSelDay={setSelDay} done={done} toggleDone={toggleDone} removeSession={removeSession} setShowAdd={setShowAdd}/>}
          {tab==="stats"    && <StatsTab    schedule={schedule} totalWeekSec={totalWeekSec} done={done}/>}
        </div>

        {/* Tab bar */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(15,15,26,.95)", backdropFilter:"blur(24px)", borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:10, paddingBottom:"max(28px, env(safe-area-inset-bottom, 28px))", display:"flex", justifyContent:"space-around" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 20px", color:tab===t.id?"#7C9EFF":"rgba(255,255,255,.32)", transition:"color .2s" }}>
              <span style={{ fontSize:22, lineHeight:1 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:600, letterSpacing:.4 }}>{t.label}</span>
              {tab===t.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:"#7C9EFF", marginTop:-1 }}/>}
            </button>
          ))}
        </div>

        {showAdd && <AddModal selDay={selDay} onAdd={addSession} onClose={()=>setShowAdd(false)}/>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════  HOME  ══ */
function HomeTab({ schedule, todaySessions, todayIdx, todayDone, totalWeekSec, totalSessions, done, toggleDone }) {
  const wh = Math.floor(totalWeekSec/3600), wm = Math.floor((totalWeekSec%3600)/60);
  return (
    <div style={{ padding:"0 20px" }}>
      <p style={{ color:"rgba(255,255,255,.4)", fontSize:14, margin:"0 0 3px" }}>
        {new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}
      </p>
      <h1 style={{ color:"#fff", fontSize:27, margin:"0 0 20px", fontWeight:800, letterSpacing:-0.6 }}>Merhaba! 👋</h1>

      {/* Progress card */}
      <div style={{ background:"linear-gradient(135deg,#1a1040 0%,#0e1f50 60%,#0a2a40 100%)", borderRadius:26, padding:20, marginBottom:14, border:"1px solid rgba(124,158,255,.18)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(124,158,255,.07)" }}/>
        <p style={{ color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, letterSpacing:1.2, margin:"0 0 14px" }}>BUGÜNKÜ İLERLEME</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:44, fontWeight:900, color:"#fff", lineHeight:1, letterSpacing:-1.5 }}>
              {todayDone}<span style={{ fontSize:26, color:"rgba(255,255,255,.35)", fontWeight:600 }}>/{todaySessions.length}</span>
            </div>
            <p style={{ color:"rgba(255,255,255,.45)", fontSize:13, margin:"5px 0 0" }}>ders tamamlandı</p>
          </div>
          <div style={{ display:"flex", gap:14 }}>
            <div style={{ textAlign:"center" }}>
              <Ring value={todayDone} max={Math.max(todaySessions.length,1)} color="#7C9EFF" size={76}>
                <span style={{ color:"#fff", fontSize:15, fontWeight:800 }}>{todaySessions.length>0?Math.round(todayDone/todaySessions.length*100):0}%</span>
              </Ring>
              <p style={{ color:"rgba(255,255,255,.35)", fontSize:10, margin:"5px 0 0" }}>Bugün</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <Ring value={totalWeekSec} max={18000} color="#A78BFA" size={76}>
                <span style={{ color:"#fff", fontSize:13, fontWeight:800 }}>{wh}s</span>
              </Ring>
              <p style={{ color:"rgba(255,255,255,.35)", fontSize:10, margin:"5px 0 0" }}>Haftalık</p>
            </div>
          </div>
        </div>
        <div style={{ marginTop:16, background:"rgba(255,255,255,.08)", borderRadius:99, height:6 }}>
          <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#7C9EFF,#A78BFA)", width:`${todaySessions.length>0?(todayDone/todaySessions.length)*100:0}%`, transition:"width .7s cubic-bezier(.34,1.56,.64,1)" }}/>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11, marginBottom:22 }}>
        {[
          { label:"Haftalık Süre", value:`${wh}s ${wm}dk`, icon:"⏰", color:"#F59E0B" },
          { label:"Toplam Seans",  value:`${totalSessions}`, icon:"📚", color:"#10B981" },
        ].map((s,i)=>(
          <div key={i} style={{ background:"rgba(255,255,255,.04)", borderRadius:18, padding:"14px 16px", border:"1px solid rgba(255,255,255,.07)" }}>
            <span style={{ fontSize:24 }}>{s.icon}</span>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, marginTop:6 }}>{s.value}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.38)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:"0 0 12px", letterSpacing:-0.3 }}>Bugünün Dersleri</h2>
      {todaySessions.length===0
        ? <EmptyState text="Bugün için ders yok 🎉"/>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {todaySessions.map((sess,i)=>(
              <SessionCard key={i} sess={sess} dayIdx={todayIdx} idx={i} done={done} toggleDone={toggleDone} showTimerBtn={false}/>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════  SCHEDULE  ══ */
function ScheduleTab({ schedule, selDay, setSelDay, done, toggleDone, removeSession, setShowAdd }) {
  return (
    <div style={{ padding:"0 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ color:"#fff", fontSize:24, fontWeight:800, margin:0, letterSpacing:-0.5 }}>Program</h1>
        <button onClick={()=>setShowAdd(true)} style={{ background:"linear-gradient(135deg,#7C9EFF,#A78BFA)", border:"none", borderRadius:13, width:38, height:38, color:"#fff", fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 18px rgba(124,158,255,.4)" }}>+</button>
      </div>

      {/* Day scroller */}
      <div style={{ display:"flex", gap:8, marginBottom:24, overflowX:"auto", paddingBottom:4 }}>
        {DAYS.map((day,i)=>{
          const isToday=i===getTodayIdx(), isSel=i===selDay, hasSess=(schedule[i]||[]).length>0;
          return (
            <button key={i} onClick={()=>setSelDay(i)}
              style={{ flexShrink:0, background:isSel?"linear-gradient(135deg,#7C9EFF,#A78BFA)":"rgba(255,255,255,.05)", border:isToday&&!isSel?"1px solid rgba(124,158,255,.45)":"1px solid transparent", borderRadius:15, padding:"10px 15px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:isSel?"#fff":"rgba(255,255,255,.45)", transition:"all .2s", boxShadow:isSel?"0 4px 18px rgba(124,158,255,.3)":"none" }}>
              <span style={{ fontSize:13, fontWeight:700 }}>{day}</span>
              {hasSess&&<div style={{ width:5, height:5, borderRadius:"50%", background:isSel?"rgba(255,255,255,.7)":"#7C9EFF" }}/>}
            </button>
          );
        })}
      </div>

      <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>{FULL_DAYS[selDay]}</h2>

      {(schedule[selDay]||[]).length===0
        ? <EmptyState text={<>Ders eklenmemiş.<br/><span style={{color:"#7C9EFF"}}>+ butonu</span> ile ekle.</>}/>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(schedule[selDay]||[]).map((sess,i)=>(
              <SessionCard
                key={i} sess={sess} dayIdx={selDay} idx={i}
                done={done} toggleDone={toggleDone}
                onRemove={()=>removeSession(selDay,i)}
                showTimerBtn={true}
              />
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════  STATS  ══ */
function StatsTab({ schedule, totalWeekSec, done }) {
  const subjectStats = SUBJECTS.map(sub=>{
    let secs=0, count=0;
    Object.values(schedule).flat().forEach(s=>{
      if(s.subject===sub.id){
        const tp=sub.types.find(t=>t.id===s.type)||sub.types[0];
        secs+=s.questionCount*tp.secPerQ; count+=s.questionCount;
      }
    });
    return {...sub,secs,count};
  }).filter(s=>s.secs>0).sort((a,b)=>b.secs-a.secs);

  const maxSecs   = subjectStats.length>0 ? subjectStats[0].secs : 1;
  const totalDone = Object.values(done).filter(Boolean).length;
  const totalSess = Object.values(schedule).flat().length;

  return (
    <div style={{ padding:"0 20px" }}>
      <h1 style={{ color:"#fff", fontSize:24, fontWeight:800, margin:"0 0 20px", letterSpacing:-0.5 }}>İstatistikler</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[
          { l:"Haftalık", v:`${Math.floor(totalWeekSec/3600)}s ${Math.floor((totalWeekSec%3600)/60)}dk`, c:"#7C9EFF" },
          { l:"Tamamlanan", v:totalDone, c:"#10B981" },
          { l:"Seans", v:totalSess, c:"#F59E0B" },
        ].map((s,i)=>(
          <div key={i} style={{ background:"rgba(255,255,255,.04)", borderRadius:16, padding:"14px 10px", border:"1px solid rgba(255,255,255,.07)", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Ders Dağılımı</h2>
      {subjectStats.length===0
        ? <EmptyState text="Henüz ders eklenmemiş."/>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            {subjectStats.map((s,i)=>(
              <div key={s.id}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"#fff", fontSize:14, fontWeight:600 }}>{s.emoji} {s.name}</span>
                  <span style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>{s.count} soru · {Math.floor(s.secs/60)}dk</span>
                </div>
                <div style={{ background:"rgba(255,255,255,.06)", borderRadius:99, height:9, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:99, background:s.color, width:`${(s.secs/maxSecs)*100}%`, transition:`width ${0.6+i*0.1}s cubic-bezier(.34,1.56,.64,1)` }}/>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:"26px 0 14px" }}>Haftalık Özet</h2>
      <div style={{ display:"flex", gap:7, alignItems:"flex-end", height:88 }}>
        {DAYS.map((day,i)=>{
          const secs=(schedule[i]||[]).reduce((a,s)=>{
            const sub=getSub(s.subject),tp=sub.types.find(t=>t.id===s.type)||sub.types[0];
            return a+s.questionCount*tp.secPerQ;
          },0);
          const maxW=Math.max(...Object.keys(schedule).map(d=>(schedule[d]||[]).reduce((a,s)=>{
            const sub=getSub(s.subject),tp=sub.types.find(t=>t.id===s.type)||sub.types[0];
            return a+s.questionCount*tp.secPerQ;
          },0)),1);
          const isToday=i===getTodayIdx();
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <div style={{ width:"100%", borderRadius:7, background:isToday?"linear-gradient(180deg,#7C9EFF,#A78BFA)":"rgba(255,255,255,.08)", height:Math.max((secs/maxW)*68,secs>0?8:0), transition:"height .6s ease" }}/>
              <span style={{ fontSize:10, color:isToday?"#7C9EFF":"rgba(255,255,255,.3)", fontWeight:isToday?800:400 }}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════  ADD MODAL  ══ */
function AddModal({ selDay, onAdd, onClose }) {
  const [subId,  setSubId]  = useState("mat");
  const [typeId, setTypeId] = useState("kazanim");
  const [qCount, setQCount] = useState(10);
  const [topic,  setTopic]  = useState("");

  const sub = getSub(subId);
  const tp  = sub.types.find(t=>t.id===typeId)||sub.types[0];

  useEffect(()=>{ setTypeId(getSub(subId).types[0].id); },[subId]);

  function submit() {
    if(!topic.trim()) return;
    onAdd({ subject:subId, type:typeId, questionCount:qCount, topic:topic.trim() });
  }

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(10px)", display:"flex", alignItems:"flex-end", zIndex:200 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", background:"#181826", borderRadius:"30px 30px 0 0", padding:"22px 20px 48px", border:"1px solid rgba(255,255,255,.1)", animation:"su .3s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ color:"#fff", margin:0, fontSize:18, fontWeight:800 }}>{FULL_DAYS[selDay]} — Ders Ekle</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:30, height:30, color:"#fff", cursor:"pointer", fontSize:17 }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Subject */}
          <div>
            <Label>DERS</Label>
            <div style={{ display:"flex", gap:7, marginTop:8, flexWrap:"wrap" }}>
              {SUBJECTS.map(s=>(
                <button key={s.id} onClick={()=>setSubId(s.id)}
                  style={{ background:subId===s.id?`${s.color}22`:"rgba(255,255,255,.05)", border:`1px solid ${subId===s.id?s.color:"transparent"}`, borderRadius:11, padding:"7px 13px", cursor:"pointer", color:subId===s.id?"#fff":"rgba(255,255,255,.45)", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>
          {/* Type */}
          <div>
            <Label>SORU TÜRÜ</Label>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              {sub.types.map(t=>(
                <button key={t.id} onClick={()=>setTypeId(t.id)}
                  style={{ flex:1, background:typeId===t.id?`${sub.color}22`:"rgba(255,255,255,.04)", border:`1px solid ${typeId===t.id?sub.color:"rgba(255,255,255,.08)"}`, borderRadius:13, padding:"9px 8px", cursor:"pointer", color:typeId===t.id?"#fff":"rgba(255,255,255,.4)", fontSize:13, fontWeight:600 }}>
                  <div>{t.label}</div>
                  <div style={{ fontSize:11, color:typeId===t.id?sub.color:"rgba(255,255,255,.25)", marginTop:3 }}>
                    {t.secPerQ<60?`${t.secPerQ}sn`:`${t.secPerQ/60}dk`}/soru
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Topic */}
          <div>
            <Label>KONU</Label>
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Örn: Denklemler (isteğe bağlı)"
              style={{ width:"100%", marginTop:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:14, padding:"12px 14px", color:"#fff", fontSize:15, outline:"none", boxSizing:"border-box" }}/>
          </div>
          {/* Count */}
          <div>
            <Label>SORU SAYISI — {qCount} soru → {fmtDur(qCount*tp.secPerQ)}</Label>
            <div style={{ display:"flex", gap:7, marginTop:8, flexWrap:"wrap" }}>
              {[5,10,15,20,25,30,40,50].map(n=>(
                <button key={n} onClick={()=>setQCount(n)}
                  style={{ background:qCount===n?`${sub.color}28`:"rgba(255,255,255,.05)", border:`1px solid ${qCount===n?sub.color:"transparent"}`, borderRadius:10, padding:"7px 13px", cursor:"pointer", color:qCount===n?"#fff":"rgba(255,255,255,.4)", fontSize:13, fontWeight:700 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit}
            style={{ width:"100%", padding:"16px", background:"linear-gradient(135deg,#7C9EFF,#A78BFA)", border:"none", borderRadius:17, color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", marginTop:4, boxShadow:"0 8px 24px rgba(124,158,255,.38)", letterSpacing:.3 }}>
            ✨ Ders Ekle
          </button>
        </div>
      </div>
    </div>
  );
}
