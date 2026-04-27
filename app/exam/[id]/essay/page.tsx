"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// DAFTAR GAMBAR LATAR BELAKANG (RANDOM)
// ==========================================
const backgroundImages = Array.from({ length: 20 }, (_, i) => `/GA_${i + 1}.jpg`);

// =======================================================================
// KOMPONEN 1: KANVAS PULPEN BEBAS (Untuk Sign & Coretan)
// =======================================================================
const DrawPad = ({ value, onChange, className = "" }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== canvas.offsetWidth) canvas.width = canvas.offsetWidth;
    if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (value && typeof value === 'string' && value.startsWith('data:image')) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const startDrawing = (e: any) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx?.beginPath();
    ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    if (ctx) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2.5; // DIBUAT TEBAL SESUAI PERMINTAAN
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rect = canvas?.getBoundingClientRect();
    if (!ctx || !rect) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (e: any) => {
    if (isDrawing) {
      setIsDrawing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      const canvas = canvasRef.current;
      if (canvas && onChange) onChange(canvas.toDataURL());
    }
  };

  const clearCanvas = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      onChange("");
    }
  };

  return (
    <div className={`absolute inset-0 z-30 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair touch-none block"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      {value && (
        <button type="button" onClick={clearCanvas} onPointerDown={(e) => e.stopPropagation()} title="Hapus Coretan" className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 z-40 rounded-bl shadow-md cursor-pointer hover:bg-red-800 transition-colors">
          X
        </button>
      )}
    </div>
  );
};

// =======================================================================
// KOMPONEN 2: MESIN TIK (Garis Sisir Setengah)
// =======================================================================
const CombInputGrid = ({ count, name, value = "", onChange, disabled, placeholders = [] }: any) => {
  const safeValue = typeof value === 'string' ? value : "";
  const chars = safeValue.split('').slice(0, count);
  return (
    <div className="flex-1 flex w-full relative">
      {!disabled && onChange && !placeholders.length && (
        <input name={name} value={safeValue} onChange={onChange} maxLength={count} className="absolute inset-0 w-full h-full opacity-0 cursor-text z-30" style={{ outline: 'none' }} autoComplete="off" spellCheck="false" />
      )}
      <div className="absolute bottom-0 left-0 w-full h-[45%] flex pointer-events-none">
         {Array.from({length: count}).map((_, i) => (
            <div key={`tick-${i}`} className={`flex-1 ${i < count - 1 ? 'border-r-[1.5px] border-black' : ''}`}></div>
         ))}
      </div>
      <div className="absolute inset-0 flex pointer-events-none">
         {Array.from({length: count}).map((_, i) => (
            <div key={`char-${i}`} className={`flex-1 flex items-center justify-center font-mono ${placeholders.length ? 'text-[12px] font-bold text-gray-300' : 'text-[14px] font-extrabold text-black uppercase'} z-10`}>
              {placeholders.length ? placeholders[i] : (chars[i] || '')}
            </div>
         ))}
      </div>
      {placeholders.length > 0 && onChange && (
        <DrawPad value={safeValue} onChange={(val: string) => onChange({ target: { name, value: val }})} />
      )}
    </div>
  )
};

// =======================================================================
// KOMPONEN 3: SECTION INPUT (Garis Pembatas Penuh)
// =======================================================================
const SectionInputGrid = ({ count, name, value = "", onChange, placeholders = [] }: any) => {
  const safeValue = typeof value === 'string' ? value : "";
  return (
    <div className="flex-1 flex w-full relative">
      <div className="absolute inset-0 flex pointer-events-none">
         {Array.from({length: count}).map((_, i) => (
            <div key={`line-${i}`} className={`flex-1 ${i < count - 1 ? 'border-r-[1.5px] border-black' : ''}`}></div>
         ))}
      </div>
      <div className="absolute inset-0 flex pointer-events-none">
        {placeholders.map((ph: string, i: number) => (
           <div key={`ph-${i}`} className="flex-1 flex items-center justify-center font-mono text-[11px] font-bold text-gray-400 z-10">
             {ph}
           </div>
        ))}
      </div>
      <DrawPad value={safeValue} onChange={(val: string) => onChange({ target: { name, value: val }})} />
    </div>
  )
};

// =======================================================================
// MAIN COMPONENT ESSAY (ASH GREEN THEME)
// =======================================================================
export default function EssayPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: examResultId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 

  // Header UI States
  const [candidateId, setCandidateId] = useState<string>('UNKNOWN');
  const [typeOfAC, setTypeOfAC] = useState<string>('');
  const [kategori, setKategori] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [examNo, setExamNo] = useState<string>('');
  const [currentBackground, setCurrentBackground] = useState<string>(backgroundImages[0]);

  // Anti-Cheat States
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const cheatWarningsRef = useRef(0);
  const lastCheatTime = useRef(0);
  const isSystemDialogActive = useRef(false);
  const isUnloading = useRef(false);
  const cheatTimeout = useRef<NodeJS.Timeout | null>(null);
  const MAX_WARNINGS = 5;

  // Essay Answers State
  const [answers, setAnswers] = useState({
    q1: "", q2: "", q3: "", q4: "", q6: "",
    aml: Array.from({ length: 3 }).map(() => ({
      seqExt: "", flightNo: "", depSta: "", acReg: "", date: "",
      partNo: "", melri: "", exts: "", fic: "", subject: "", pos: "", serialIn: "", serialOut: "",
      complaint: "", action: "", sign: "", flightTime: "", hyd: "", oil: "",
      autoYes: "", autoNo: "", autoCat2: "", autoCat3: "", complaintImm: "", etops: "",
      workOrder: "", msNumber: "", insp: "", mhrs: "",
      actionSta: "", actionDd: "", actionMm: "", actionTime: "", actionSign: "", actionAuth: "",
      releaseSta: "", releaseDd: "", releaseMm: "", releaseTime: "", releaseSign: "", releaseAuth: "",
      rii: "", riiDd: "", riiMm: "", riiTime: "", riiSign: "", riiAuth: ""
    }))
  });

  // STATE DAN FUNGSI UNTUK POP-UP MODAL TANDA TANGAN
  const [signModal, setSignModal] = useState({ isOpen: false, idx: -1, field: '', tempSign: '' });

  const openSignModal = (idx: number, field: string, currentValue: string) => {
    setSignModal({ isOpen: true, idx, field, tempSign: currentValue || '' });
  };

  const closeSignModal = () => {
    setSignModal({ isOpen: false, idx: -1, field: '', tempSign: '' });
  };

  const saveSignature = () => {
    if (signModal.idx !== -1 && signModal.field) {
        handleAmlChange(signModal.idx, { target: { name: signModal.field, value: signModal.tempSign } });
    }
    closeSignModal();
  };

  // 1. Fetch Data & Setup Environment
  useEffect(() => {
    const fetchExamData = async () => {
      const { data: resultData, error } = await supabase.from('exam_results').select('*, candidates(personnel_no)').eq('id', examResultId).single();
      if (error || !resultData) { 
        alert('Exam session not found!'); 
        router.push('/'); return; 
      }
      if (resultData.status === 'COMPLETED') { router.push(`/result/${examResultId}`); return; }

      setCandidateId(resultData.candidates?.personnel_no || 'UNKNOWN');
      setTypeOfAC(resultData.type_of_ac || 'Aircraft');
      setKategori(resultData.kategori || 'Category');
      setSubject(resultData.subject || 'Subject');
      setExamNo(resultData.exam_no || '0');

      // Kalkulasi Sisa Waktu
      const duration = 120;
      const startedAt = new Date(resultData.started_at).getTime();
      const now = new Date().getTime();
      const endTime = startedAt + (duration * 60 * 1000);
      const remainingSeconds = Math.floor((endTime - now) / 1000);
      setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0);

      setLoading(false);
    };
    fetchExamData();
  }, [examResultId, router]);

  // 2. Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0 && !loading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit('TIMEOUT'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  // 3. Random Background
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    setCurrentBackground(backgroundImages[randomIndex]);
  }, []);

  // 4. Auto-Save Logic
  useEffect(() => {
    const savedData = localStorage.getItem(`essay_draft_${examResultId}`);
    if (savedData) {
      try { setAnswers(JSON.parse(savedData)); } catch (err) {}
    }
  }, [examResultId]);

  useEffect(() => {
    localStorage.setItem(`essay_draft_${examResultId}`, JSON.stringify(answers));
  }, [answers, examResultId]);

  // 5. Anti-Cheat Logic
  useEffect(() => {
    if (loading) return;
    const savedWarnings = localStorage.getItem(`cheat_${examResultId}`);
    if (savedWarnings) {
      const count = parseInt(savedWarnings, 10);
      setCheatWarnings(count);
      cheatWarningsRef.current = count;
    }

    const handleCheatDetected = () => {
      if (isSystemDialogActive.current) return;
      cheatTimeout.current = setTimeout(() => {
        if (isUnloading.current) return; 
        const now = Date.now();
        if (now - lastCheatTime.current < 3000) return; 
        lastCheatTime.current = now;
        if (cheatWarningsRef.current >= MAX_WARNINGS) return; 
        
        cheatWarningsRef.current += 1;
        setCheatWarnings(cheatWarningsRef.current);
        localStorage.setItem(`cheat_${examResultId}`, cheatWarningsRef.current.toString());
        supabase.from('exam_results').update({ cheat_warnings: cheatWarningsRef.current }).eq('id', examResultId).then(); 

        if (cheatWarningsRef.current >= MAX_WARNINGS) {
          isSystemDialogActive.current = true;
          alert(`🚨 FATAL VIOLATION!\n\nYou have been detected leaving the exam area ${MAX_WARNINGS} times. The exam is forcibly terminated!`);
          setTimeout(() => { isSystemDialogActive.current = false; }, 500);
          supabase.from('exam_results').update({ status: 'COMPLETED', finished_at: new Date().toISOString() }).eq('id', examResultId).then(() => {
            router.push(`/result/${examResultId}`);
          });
        } else {
          isSystemDialogActive.current = true;
          alert(`⚠️ FRAUD WARNING (${cheatWarningsRef.current}/${MAX_WARNINGS}) ⚠️\n\nScreen focus lost! You were detected opening another application, using split screen, or switching tabs.\n\nIf this occurs ${MAX_WARNINGS} times, the exam will be automatically submitted!`);
          setTimeout(() => { isSystemDialogActive.current = false; }, 500);
        }
      }, 300); 
    };

    const handleVisibilityChange = () => { if (document.hidden) handleCheatDetected(); };
    const handleWindowBlur = () => { handleCheatDetected(); };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleBeforeUnload = () => {
      isUnloading.current = true;
      if (cheatTimeout.current) clearTimeout(cheatTimeout.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (cheatTimeout.current) clearTimeout(cheatTimeout.current);
    };
  }, [loading, examResultId, router]);

  // Handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleAmlChange = (index: number, e: any) => {
    const newAml = [...answers.aml];
    newAml[index] = { ...newAml[index], [e.target.name]: e.target.value };
    setAnswers({ ...answers, aml: newAml });
  };

  const handleSubmit = async (forceSubmitType: 'TIMEOUT' | null = null) => {
    if (!forceSubmitType) { 
      isSystemDialogActive.current = true;
      const confirmComplete = window.confirm(`✅ Are you sure you want to finish and submit the Essay Exam?`);
      setTimeout(() => { isSystemDialogActive.current = false; }, 500); 
      if (!confirmComplete) return;
    } else if (forceSubmitType === 'TIMEOUT') { 
      isSystemDialogActive.current = true;
      alert('⏳ Time is up! Your answers will be automatically submitted.');
      setTimeout(() => { isSystemDialogActive.current = false; }, 500);
    }

    setIsSubmitting(true);
    await supabase.from('exam_results').update({ essay_answers: answers, essay_completed: true, status: 'COMPLETED', finished_at: new Date().toISOString() }).eq('id', examResultId);
    localStorage.removeItem(`cheat_${examResultId}`);
    localStorage.removeItem(`essay_draft_${examResultId}`);
    router.push(`/result/${examResultId}`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Loading Screen
  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-center">
        <div>
            <div className="w-16 h-16 border-4 border-[#3B4D41] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-[#3B4D41] font-black tracking-widest uppercase animate-pulse">Preparing Essay Environment...</div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen relative font-sans overflow-hidden select-none" onContextMenu={(e)=> e.preventDefault()}>

      {/* POP-UP MODAL TANDA TANGAN (DENGAN KANVAS LEBAR) */}
      {signModal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-[#3B4D41] px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-black tracking-widest uppercase text-lg">📝 DRAW IN THE CANVAS</h3>
                    <button onClick={closeSignModal} className="text-white hover:text-red-400 font-bold text-2xl transition-colors">&times;</button>
                </div>
                <div className="p-8 flex flex-col">
                    <div className="relative w-full h-80 border-4 border-dashed border-[#D3DDD6] rounded-2xl bg-white overflow-hidden shadow-inner cursor-crosshair">
                        <DrawPad value={signModal.tempSign} onChange={(val: string) => setSignModal(prev => ({ ...prev, tempSign: val }))} />
                        {!signModal.tempSign && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 font-black tracking-widest uppercase pointer-events-none text-3xl opacity-30">Draw Here</span>}
                    </div>
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={() => setSignModal(prev => ({ ...prev, tempSign: '' }))} className="text-red-500 font-black uppercase tracking-widest hover:text-red-700 flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors">
                            <span>🗑️</span> Clear Canvas
                        </button>
                        <div className="flex gap-4">
                            <button onClick={closeSignModal} className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-gray-600 border-2 border-gray-200 hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={saveSignature} className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest bg-[#4A6354] text-white hover:bg-[#3B4D41] transition-all shadow-lg hover:scale-105">Save Signature</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* BACKGROUND BERUBAH ACAK DENGAN TONE ASH GREEN */}
      <div className="absolute inset-0 z-0 bg-[#1A241E]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity transition-opacity duration-1000 ease-in-out" 
          style={{ backgroundImage: `url(${currentBackground})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#3B4D41]/60 via-transparent to-[#3B4D41]/95"></div>
      </div>

      {/* HEADER EXAM */}
      <div className="relative z-10 bg-[#3B4D41]/90 backdrop-blur-md border-b border-white/20 shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="bg-white p-2.5 rounded-xl hidden md:block shadow-md">
            <img src="/logo.png" alt="Garuda Indonesia Logo" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-widest uppercase mb-1">{typeOfAC} - ESSAY SECTION</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#7FA38B] text-[11px] font-bold tracking-[0.2em] uppercase mr-2">CANDIDATE: {candidateId}</span>
              <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase border border-white/30 bg-white/5 px-2 py-0.5 rounded-md">{kategori}</span>
              <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase border border-white/30 bg-white/5 px-2 py-0.5 rounded-md">{subject}</span>
              <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase border border-white/30 bg-white/5 px-2 py-0.5 rounded-md">EXAM {examNo}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {cheatWarnings > 0 && (
            <span className="text-xs font-black text-white bg-red-600/90 px-4 py-2 rounded-full animate-pulse tracking-widest border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              VIOLATION: {cheatWarnings}/{MAX_WARNINGS}
            </span>
          )}
          <div className={`text-2xl font-mono font-black px-6 py-1.5 rounded-full border-2 shadow-lg tracking-widest transition-colors
            ${timeLeft < 300 ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-white/10 text-white border-white/20'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-4 md:p-6 gap-6 max-w-[1500px] mx-auto w-full">
        
        {/* CONTAINER GLASSMORPHISM */}
        <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden">
          
          <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
            
            {/* Title Content */}
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black text-[#3B4D41] tracking-widest uppercase border-b-4 border-[#7FA38B] inline-block pb-2">
                Essay & Simulation Task
              </h2>
              <p className="text-[#5C7D67] font-bold mt-4 tracking-wide">Please answer all questions and fill out the forms clearly.</p>
            </div>

            {/* ======================= SOAL 1-4 ======================= */}
            <div className="space-y-8 max-w-5xl">
              {[
                { id: "q1", text: "1. How do you know about Garuda safety & policy indoctrination and when you got that?" },
                { id: "q2", text: "2. What are privilege Aircraft maintenance engineer license ref. CASR Part 65?" },
                { id: "q3", text: "3. Refer CMM chapter IX, what kind of type of maintenance task shall be executed for release to service?" },
                { id: "q4", text: "4. What are the safety precautions during refueling?" },
              ].map((q) => (
                <div key={q.id} className="bg-[#EBF0EC]/40 border border-[#D3DDD6] p-6 rounded-2xl shadow-sm hover:border-[#7FA38B]/50 transition-colors">
                  <label className="block font-bold text-[#3B4D41] mb-4 text-lg">{q.text}</label>
                  <textarea name={q.id} value={(answers as any)[q.id]} onChange={handleTextChange} rows={4} 
                    className="w-full p-4 border-2 border-[#D3DDD6] rounded-xl focus:ring-4 focus:ring-[#7FA38B]/20 focus:border-[#7FA38B] outline-none transition-all text-[#2F3E34] font-bold resize-none bg-white"
                    placeholder="Type your detailed answer here..."></textarea>
                </div>
              ))}
            </div>

            <hr className="my-16 border-t-2 border-[#D3DDD6] border-dashed" />

            {/* ============================================================== */}
            {/* SOAL NO 5 : SIMULASI AML (MATRIKS PIKSEL SEMPURNA)             */}
            {/* ============================================================== */}
            <div className="max-w-[1400px] mx-auto">
              <h2 className="text-xl md:text-2xl font-bold text-[#3B4D41] mb-6 leading-relaxed pl-5 border-l-4 border-[#7FA38B]">
                5. SIMULATION TASK: AML RECTIFICATION
              </h2>
              <div className="bg-[#3B4D41]/5 p-6 border border-[#3B4D41]/10 mb-8 text-base font-mono text-[#3B4D41] rounded-2xl shadow-inner leading-relaxed">
                <strong className="text-lg">Case for Airframe/Avionic:</strong><br/>
                Ref info DPS MM PK-G…….as GA535 RTO due to WX radar fail.<br/>
                Based on Pilot trip report aircraft RTO at speed 70 Knot.<br/>
                <br/>
                Note: you can make assumption another parameter that you need on this case, Use AMM ref with ATA-XX-XX rev Oct 2022
              </div>

              <div className="overflow-x-auto pb-8">
                <div className="min-w-[1250px] flex flex-col gap-12 bg-[#F4F7F5] p-4 rounded-xl shadow-lg border border-[#D3DDD6]">
                  
                  {answers.aml.map((data, idx) => (
                    <div key={idx} className="border-[3px] border-black bg-white text-black font-sans text-[10px] leading-tight select-none shadow-xl flex flex-col mx-auto w-full">
                      
                      {/* --- ROW 1 & 2 HEADER --- */}
                      <div className="flex w-full">
                        <div className="w-[55%] flex flex-col border-r-[3px] border-black">
                          <div className="grid h-[46px] border-b-[3px] border-black" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
                            <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">FLIGHT. No</div><CombInputGrid count={4} name="flightNo" value={data.flightNo} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">DEP. STA</div><CombInputGrid count={3} name="depSta" value={data.depSta} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">A/C. REG</div><CombInputGrid count={3} name="acReg" value={data.acReg} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 6' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">D D M M Y Y</div><CombInputGrid count={6} name="date" value={data.date} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 4' }} className="flex flex-col relative">
                              <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">SEQ. No</div>
                              <div className="flex-1 flex relative">
                                <input name="seqExt" value={data.seqExt} onChange={(e) => handleAmlChange(idx, e)} maxLength={2} className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-text" />
                                <div className="absolute bottom-0 left-0 w-full h-[45%] flex pointer-events-none"><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1"></div></div>
                                <div className="absolute inset-0 flex pointer-events-none"><div className="flex-1 flex items-center justify-center font-extrabold text-[14px] bg-gray-100">0</div><div className="flex-1 flex items-center justify-center font-extrabold text-[14px] bg-gray-100">{idx}</div><div className="flex-1 flex items-center justify-center font-extrabold text-black font-mono text-[14px]">{data.seqExt[0]||''}</div><div className="flex-1 flex items-center justify-center font-extrabold text-black font-mono text-[14px]">{data.seqExt[1]||''}</div></div>
                              </div>
                            </div>
                          </div>
                          <div className="h-[44px] border-b-[3px] border-black relative">
                            <div className="absolute top-1 left-2 text-[11px] font-extrabold">Subject</div>
                            <input name="subject" value={data.subject} onChange={(e) => handleAmlChange(idx, e)} className="w-full h-full bg-transparent outline-none font-extrabold text-black text-[13px] uppercase px-3 pt-5" />
                          </div>
                        </div>

                        {/* KANAN ATAS (Grid 26 Unit) */}
                        <div className="w-[45%] flex flex-col">
                          <div className="grid h-[46px] border-b-[3px] border-black" style={{ gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }}>
                            <div style={{ gridColumn: 'span 16' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">PART NUMBER</div><CombInputGrid count={16} name="partNo" value={data.partNo} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">M.E.L.R.I</div><SectionInputGrid count={4} name="melri" value={data.melri} onChange={(e:any)=>handleAmlChange(idx,e)} placeholders={['A','B','C','D']} /></div>
                            <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">EXTS</div><SectionInputGrid count={2} name="exts" value={data.exts} onChange={(e:any)=>handleAmlChange(idx,e)} placeholders={['B','C']} /></div>
                            <div style={{ gridColumn: 'span 4' }} className="flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">FIC</div><CombInputGrid count={4} name="fic" value={data.fic} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          </div>
                          <div className="grid h-[44px] border-b-[3px] border-black" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                            <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">POS</div><CombInputGrid count={2} name="pos" value={data.pos} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 11' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">SERIAL No. IN</div><CombInputGrid count={11} name="serialIn" value={data.serialIn} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                            <div style={{ gridColumn: 'span 11' }} className="flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">SERIAL No. OUT</div><CombInputGrid count={11} name="serialOut" value={data.serialOut} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          </div>
                        </div>
                      </div>

                      {/* --- BAGIAN TENGAH: TEXTAREA --- */}
                      <div className="flex h-[210px] border-b-[3px] border-black">
                        <div className="w-[55%] border-r-[3px] border-black flex">
                          <div className="w-8 border-r-[2px] border-black flex items-center justify-center bg-gray-50"><span className="-rotate-90 whitespace-nowrap text-[13px] font-extrabold tracking-widest text-black">Complaint</span></div>
                          <div className="flex-1 relative bg-[repeating-linear-gradient(transparent,transparent_34px,#000_34px,#000_35px)] bg-[size:100%_35px]">
                            <textarea name="complaint" value={data.complaint} onChange={(e) => handleAmlChange(idx, e)} className="absolute inset-0 w-full h-full bg-transparent leading-[35px] resize-none outline-none text-black font-extrabold px-3 uppercase" />
                          </div>
                        </div>
                        <div className="w-[45%] flex">
                          <div className="flex-1 flex border-r-[3px] border-black">
                            <div className="w-8 border-r-[2px] border-black flex items-center justify-center bg-gray-50"><span className="-rotate-90 whitespace-nowrap text-[13px] font-extrabold tracking-widest text-black">Action</span></div>
                            <div className="flex-1 relative bg-[repeating-linear-gradient(transparent,transparent_34px,#000_34px,#000_35px)] bg-[size:100%_35px]">
                              <textarea name="action" value={data.action} onChange={(e) => handleAmlChange(idx, e)} className="absolute inset-0 w-full h-full bg-transparent leading-[35px] resize-none outline-none text-black font-extrabold px-3 uppercase" />
                            </div>
                          </div>
                          <div className="w-10 flex items-center justify-center bg-gray-50">
                            <span className="-rotate-90 whitespace-nowrap font-black text-lg tracking-widest text-black">SNAG</span>
                          </div>
                        </div>
                      </div>

                      {/* --- BAGIAN BAWAH: MATRIX SEJAJAR SEMPURNA --- */}
                      <div className="flex h-[200px]">
                        
                        {/* MATRIX KIRI BAWAH */}
                        <div className="w-[65%] grid border-r-[3px] border-black" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}>
                          <div style={{ gridColumn: 'span 10' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col relative bg-[#F4F7F5]">
                            <span className="text-[11px] text-center py-[4px] font-extrabold border-b-[2px] border-black">Sign</span>
                            <div className="flex-1 relative cursor-pointer group hover:bg-blue-50 transition-colors" onClick={() => openSignModal(idx, 'sign', data.sign)}>
                                {data.sign ? (
                                    <img src={data.sign} className="absolute inset-0 w-full h-full object-contain p-1 pointer-events-none mix-blend-multiply" alt="sign" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 uppercase tracking-widest">KLIK</div>
                                )}
                            </div>
                          </div>
                          <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">FLIGHT TIME</div><CombInputGrid count={4} name="flightTime" value={data.flightTime} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          <div style={{ gridColumn: 'span 11' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">HYD. REFILL</div><SectionInputGrid count={4} name="hyd" value={data.hyd} onChange={(e:any)=>handleAmlChange(idx,e)} placeholders={['S1','S2','S3','S4']} /></div>
                          <div style={{ gridColumn: 'span 7' }} className="border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">OIL REFILL</div><SectionInputGrid count={5} name="oil" value={data.oil} onChange={(e:any)=>handleAmlChange(idx,e)} placeholders={['E1','E2','E3','E4','APU']} /></div>

                          <div style={{ gridColumn: 'span 10' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col">
                            {idx === 0 ? (
                              <>
                                <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px] bg-gray-100">AUTO LAND STATUS</div>
                                {/* AUTO LAND - DIKEMBALIKAN KE INPUT BIASA + DRAWPAD TRANSPARAN */}
                                <div className="flex-1 flex relative">
                                  <div className="flex-[0.8] bg-gray-300 border-r-[1.5px] border-black"></div>
                                  <div className="flex-1 flex items-center justify-center text-[9px] font-extrabold border-r-[1.5px] border-black">YES</div>
                                  <div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black border-r-[1.5px] border-black">{data.autoYes?.[0]||''}</div>
                                  <div className="flex-1 flex items-center justify-center text-[9px] font-extrabold border-r-[1.5px] border-black">NO</div>
                                  <div className="flex-[2] relative border-r-[1.5px] border-black flex"><div className="absolute bottom-0 left-0 w-full h-[45%] flex pointer-events-none"><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1"></div></div><div className="absolute inset-0 flex pointer-events-none"><div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black">{data.autoNo?.[0]||''}</div><div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black">{data.autoNo?.[1]||''}</div></div></div>
                                  <div className="flex-[0.8] bg-gray-300 border-r-[1.5px] border-black"></div>
                                  <div className="flex-1 flex items-center justify-center text-[9px] font-extrabold border-r-[1.5px] border-black">CAT II</div>
                                  <div className="flex-[2] relative border-r-[1.5px] border-black flex"><div className="absolute bottom-0 left-0 w-full h-[45%] flex pointer-events-none"><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1"></div></div><div className="absolute inset-0 flex pointer-events-none"><div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black">{data.autoCat2?.[0]||''}</div><div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black">{data.autoCat2?.[1]||''}</div></div></div>
                                  <div className="flex-1 flex items-center justify-center text-[9px] font-extrabold border-r-[1.5px] border-black">III</div>
                                  <div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[14px] text-black border-r-[1.5px] border-black">{data.autoCat3?.[0]||''}</div>
                                  <div className="flex-1 bg-gray-300"></div>
                                  
                                  {/* KANVAS AUTO LAND */}
                                  <DrawPad value={data.autoYes} onChange={(val: string) => handleAmlChange(idx, { target: { name: 'autoYes', value: val }})} />
                                </div>
                              </>
                            ) : (
                              <><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">COMPLAINT (IMM CODE)</div><CombInputGrid count={10} name="complaintImm" value={data.complaintImm} onChange={(e:any)=>handleAmlChange(idx,e)} /></>
                            )}
                          </div>
                          <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">ETOPS</div><SectionInputGrid count={4} name="etops" value={data.etops} onChange={(e:any)=>handleAmlChange(idx,e)} placeholders={['NE','90','120','180']} /></div>
                          <div style={{ gridColumn: 'span 18' }} className="border-b-[2px] border-black flex flex-col"><CombInputGrid count={18} disabled={true} /></div>

                          <div style={{ gridColumn: 'span 14' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">WORK ORDER NUMBER</div><CombInputGrid count={14} name="workOrder" value={data.workOrder} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          <div style={{ gridColumn: 'span 11' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">MS. NUMBER</div><CombInputGrid count={11} name="msNumber" value={data.msNumber} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">INSP</div><CombInputGrid count={3} name="insp" value={data.insp} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                          <div style={{ gridColumn: 'span 4' }} className="flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">MHRS</div><CombInputGrid count={4} name="mhrs" value={data.mhrs} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                        </div>

                        {/* MATRIX KANAN BAWAH */}
                        <div className="w-[35%] flex flex-col">
                          {[
                            { label: "Action STA", st: "actionSta", stCount: 3, dd: "actionDd", mm: "actionMm", t: "actionTime", s: "actionSign", a: "actionAuth" },
                            { label: "Release STA", st: "releaseSta", stCount: 3, dd: "releaseDd", mm: "releaseMm", t: "releaseTime", s: "releaseSign", a: "releaseAuth" },
                            { label: "R.I.I.", st: "rii", stCount: 1, dd: "riiDd", mm: "riiMm", t: "riiTime", s: "riiSign", a: "riiAuth", isLast: true }
                          ].map((row, i) => (
                            <div key={i} className={`grid h-full ${!row.isLast ? 'border-b-[2px] border-black' : ''}`} style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                              <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">{row.label}</div><CombInputGrid count={row.stCount} name={row.st} value={(data as any)[row.st]} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                              <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">D D</div><CombInputGrid count={2} name={row.dd} value={(data as any)[row.dd]} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                              <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">M M</div><CombInputGrid count={2} name={row.mm} value={(data as any)[row.mm]} onChange={(e:any)=>handleAmlChange(idx,e)} /></div>
                              <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col">
                                <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">Time</div>
                                <input name={row.t} value={(data as any)[row.t]} onChange={(e:any) => handleAmlChange(idx, e)} className="flex-1 w-full bg-transparent outline-none text-center font-mono text-[14px] font-extrabold text-black" />
                              </div>
                              <div style={{ gridColumn: 'span 3' }} className="flex flex-col">
                                <div className="flex-1 flex border-b-[2px] border-black relative">
                                  <span className="w-10 border-r-[2px] border-black text-[11px] font-extrabold flex items-center justify-center bg-gray-50">Sign</span>
                                  <div className="flex-1 relative bg-[#F4F7F5] cursor-pointer group hover:bg-blue-50 transition-colors" onClick={() => openSignModal(idx, row.s, (data as any)[row.s])}>
                                      {(data as any)[row.s] ? (
                                          <img src={(data as any)[row.s]} className="absolute inset-0 w-full h-full object-contain p-0.5 pointer-events-none mix-blend-multiply" alt="sign" />
                                      ) : (
                                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 uppercase tracking-widest">KLIK</div>
                                      )}
                                  </div>
                                </div>
                                <div className="flex-1 flex bg-gray-50/50">
                                  <span className="w-10 border-r-[2px] border-black text-[11px] font-extrabold flex items-center justify-center bg-gray-50">Auth.</span>
                                  <input name={row.a} value={(data as any)[row.a]} onChange={(e) => handleAmlChange(idx, e)} className="flex-1 w-full bg-transparent outline-none text-center px-0.5 font-mono uppercase text-[11px] text-black font-extrabold" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>
                  ))}
                  
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* SOAL NO 6 : ANALISIS GAMBAR JOB CARD       */}
            {/* ========================================== */}
            <div className="max-w-5xl mx-auto mt-16 mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#3B4D41] mb-6 leading-relaxed pl-5 border-l-4 border-[#7FA38B]">
                6. Please describe what is wrong with this job card.
              </h2>
              <div className="mb-6 p-4 bg-white border-2 border-[#D3DDD6] rounded-2xl shadow-sm flex justify-center">
                 <img src="/jobcard.jfif" alt="Job Card Analysis" className="max-w-full h-auto rounded-xl" />
              </div>
              <textarea name="q6" value={answers.q6} onChange={handleTextChange} rows={5} 
                className="w-full p-6 bg-white border-2 border-[#D3DDD6] rounded-2xl focus:ring-4 focus:ring-[#7FA38B]/20 focus:border-[#7FA38B] outline-none transition-all text-[#2F3E34] font-bold shadow-inner resize-y" 
                placeholder="Describe the errors found in the job card above..."></textarea>
            </div>

          </div>

          {/* FOOTER BUTTON (ASH GREEN THEME) */}
          <div className="bg-white/80 border-t border-[#D3DDD6] p-6 flex items-center justify-end gap-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] relative z-20">
            <button onClick={() => handleSubmit(null)} disabled={isSubmitting} 
              className={`px-12 py-4 font-black tracking-widest uppercase rounded-full transition-all shadow-xl
              ${isSubmitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-[#4A6354] text-white hover:bg-[#33473C] shadow-[#4A6354]/30 hover:scale-105"}`}>
              {isSubmitting ? "SUBMITTING..." : "SUBMIT FINAL EXAM"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}