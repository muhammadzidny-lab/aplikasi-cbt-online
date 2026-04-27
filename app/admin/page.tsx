'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient' 
import Link from 'next/link'

// ==========================================
// MESIN PENGACAK REKONSTRUKSI
// ==========================================
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function shuffleArray(array: any[], seedString: string) {
  let seedNumber = 0;
  for (let i = 0; i < seedString.length; i++) {
    seedNumber += seedString.charCodeAt(i);
  }
  const random = mulberry32(seedNumber)
  const newArr = [...array]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr
}

// ==========================================
// KOMPONEN HELPER
// ==========================================
function formatDate(dateString: any) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="grid grid-cols-[150px_10px_auto] text-sm items-start mb-1 text-[#000000]">
      <div className="font-medium">{label}</div>
      <div>:</div>
      <div className="uppercase font-mono font-bold border-b border-dotted border-[#9ca3af] w-full pl-2">
        {value}
      </div>
    </div>
  )
}

// Dibungkus React.memo agar kebal dari efek Timer 1 Detik di komponen induk
const AdminSignaturePad = React.memo(({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const isInitialized = useRef(false)
  const timeoutRef = useRef<any>(null) // Rahasia Debounce

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) { 
         ctx.lineWidth = 3; 
         ctx.lineCap = 'round'; 
         ctx.lineJoin = 'round';
         ctx.strokeStyle = '#002561'; 
      }
    }
  }, [])

  useEffect(() => {
    if (value && !isInitialized.current && canvasRef.current) {
       const canvas = canvasRef.current;
       const ctx = canvas.getContext('2d');
       const img = new window.Image(); 
       img.onload = () => {
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       };
       img.src = value;
       isInitialized.current = true;
    }
  }, [value])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { 
      x: (e.clientX - rect.left) * (canvas.width / rect.width), 
      y: (e.clientY - rect.top) * (canvas.height / rect.height) 
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath(); 
    ctx.moveTo(x, y); 
    isDrawing.current = true; 
    canvas.setPointerCapture(e.pointerId)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Mendorong tinta ke performa tertinggi (Sinkron dengan Refresh Rate Monitor)
    requestAnimationFrame(() => {
       const { x, y } = getCoordinates(e)
       ctx.lineTo(x, y); 
       ctx.stroke()
    })
  }

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (canvas) { 
       canvas.releasePointerCapture(e.pointerId); 
       
       // TEKNIK DEBOUNCE: Hanya menyimpan saat Anda benar-benar selesai (jeda 500ms)
       if (timeoutRef.current) clearTimeout(timeoutRef.current);
       timeoutRef.current = setTimeout(() => {
          onChange(canvas.toDataURL('image/png')) 
       }, 500);
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) { 
       ctx.clearRect(0, 0, canvas.width, canvas.height); 
       onChange('');
       isInitialized.current = false;
    }
  }

  return (
    <div className="relative">
      <div className="border-2 border-dashed border-[#9ca3af] bg-[#ffffff] cursor-crosshair rounded-xl overflow-hidden shadow-inner">
        <canvas ref={canvasRef} width={400} height={200} className="w-full h-36 touch-none"
          onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerOut={stopDrawing} />
        {!value && <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#d1d5db] text-xs font-black tracking-widest uppercase pointer-events-none">Sign Here</span>}
      </div>
      <button type="button" onClick={clearSignature} className="text-[10px] font-black tracking-widest uppercase text-[#ef4444] mt-2 hover:text-[#b91c1c] flex items-center gap-1">
        <span className="text-sm">🗑️</span> Clear Signature
      </button>
    </div>
  )
}, (prevProps, nextProps) => prevProps.value === nextProps.value) // <--- Ini Tamengnya!


// =======================================================================
// KOMPONEN STATIC UNTUK ADMIN (Meniru persis komponen dari halaman Essay)
// =======================================================================
const StaticDrawPad = ({ value, className = "" }: { value: string, className?: string }) => {
  if (!value || !value.startsWith('data:image')) return <div className={`absolute inset-0 z-20 ${className}`}></div>;
  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none ${className}`}>
      <img 
        src={value} 
        alt="Drawing" 
        className="w-full h-full object-contain mix-blend-multiply" 
        style={{ 
          // Efek ganda untuk menebalkan dan menghitamkan tinta sekecil apapun
          filter: 'grayscale(100%) contrast(1000%) drop-shadow(0px 0px 1px black) drop-shadow(0px 0px 0.5px black)' 
        }} 
      />
    </div>
  );
};

const StaticCombGrid = ({ count, value = "", placeholders = [] }: any) => {
  const safeValue = typeof value === 'string' ? value : "";
  const chars = safeValue.split('').slice(0, count);
  return (
    <div className="flex-1 flex w-full relative">
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
      {placeholders.length > 0 && safeValue && <StaticDrawPad value={safeValue} />}
    </div>
  )
};

const StaticSectionInputGrid = ({ count, value = "", placeholders = [] }: any) => {
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
           <div key={`ph-${i}`} className="flex-1 flex items-center justify-center font-mono text-[8px] font-bold text-gray-400 z-10">
             {ph}
           </div>
        ))}
      </div>
      {safeValue && <StaticDrawPad value={safeValue} />}
    </div>
  )
};

// ==========================================
// KOMPONEN UTAMA ADMIN
// ==========================================
export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const SECRET_PIN = 'GARUDA2026'

  // STATE MASTER GATE
  const [isMasterGateOpen, setIsMasterGateOpen] = useState(false)
  
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [now, setNow] = useState(0)

  const [viewingResultId, setViewingResultId] = useState<string | null>(null)
  const [resLoading, setResLoading] = useState(false)
  const [resCandidate, setResCandidate] = useState<any>(null)
  const [resExamResult, setResExamResult] = useState<any>(null)
  const [resAnswerMap, setResAnswerMap] = useState<Record<number, string>>({})
  
  const [resPrintStats, setResPrintStats] = useState({
    aircraftWrong: 0, regWrong: 0, totalWrong: 0, score: 0, isPass: false
  })

  const [showSignPanel, setShowSignPanel] = useState(false)
  const [adminSignData, setAdminSignData] = useState({
    assessorName: '', assessorSign: '', inspectorName: '', inspectorSign: '', examiner1Sign: '', examiner2Sign: ''
  })
// Fungsi baru untuk update state + simpan ke browser
  const updateAdminSignData = (key: string, value: string) => {
    setAdminSignData(prev => {
      const newData = { ...prev, [key]: value }
      localStorage.setItem('garuda_admin_signatures', JSON.stringify(newData))
      return newData
    })
  }
  // Menarik data tanda tangan yang tersimpan saat web dibuka
  useEffect(() => {
    const savedSignData = localStorage.getItem('garuda_admin_signatures')
    if (savedSignData) {
      setAdminSignData(JSON.parse(savedSignData))
    }
  }, [])
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [selectedLiveCam, setSelectedLiveCam] = useState<string | null>(null)
  const [liveFrames, setLiveFrames] = useState<Record<string, string>>({})

  // STATE PENGIRIMAN EMAIL
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const pdfWrapperRef = useRef<HTMLDivElement>(null)
  const [autoSendTarget, setAutoSendTarget] = useState<string | null>(null)
  const [pdfCaptured, setPdfCaptured] = useState(false)

  // ====================================================
  // STATE BARU: BULK EMAIL PROCESSING
  // ====================================================
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([])
  const [bulkQueue, setBulkQueue] = useState<string[]>([])
  const [bulkCollected, setBulkCollected] = useState<{name: string, pdfBase64: string}[]>([])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [bulkTargetEmail, setBulkTargetEmail] = useState<string | null>(null)

  // ====================================================
  // STATE BARU: SMART FILTER CONTROL PANEL
  // ====================================================
  const getLocalToday = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
  }
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState(getLocalToday()) // Default: Hari Ini

  useEffect(() => {
    setNow(Date.now()); 
    const timerInterval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timerInterval)
  }, [])

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth')
    if (authStatus === 'verified') setIsAuthenticated(true)
    setIsCheckingAuth(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === SECRET_PIN) {
      setIsAuthenticated(true); setLoginError(false); sessionStorage.setItem('admin_auth', 'verified') 
    } else { setLoginError(true); setPinInput('') }
  }

  const handleLogout = () => { setIsAuthenticated(false); sessionStorage.removeItem('admin_auth'); setPinInput('') }

  const fetchData = async () => {
    setLoading(true)
    
    // FETCH STATUS MASTER GATE
    const { data: gateData } = await supabase.from('exam_tokens').select('*').eq('access_code', 'MASTER_GATE').single()
    if (gateData) {
      setIsMasterGateOpen(gateData.is_active)
    } else {
      setIsMasterGateOpen(false)
    }

  const { data: sessionData } = await supabase
      .from('exam_results')
      .select(`id, type_of_ac, kategori, subject, exam_no, status, started_at, score, cheat_warnings, final_passed, email_sent, essay_answers, candidates (name, email, personnel_no, unit, rating_sought, exam_date, dgac_amel_no, dgac_rating, ga_auth_no, ga_rating)`)
      .order('started_at', { ascending: false })

    if (sessionData) setSessions(sessionData)
    setLoading(false)
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData()
    const interval = setInterval(() => fetchData(), 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated])


  const getRemainingTime = (startedAt: string) => {
    if (!now) return '120m 00s';
    const duration = 120 * 60 * 1000; 
    const endTime = new Date(startedAt).getTime() + duration;
    const diff = Math.floor((endTime - now) / 1000);
    
    if (diff <= 0) return '00:00';
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  // FUNGSI KENDALI MASTER GATE
  const toggleMasterGate = async (turnOn: boolean) => {
    const confirmMsg = turnOn 
      ? "ARE YOU SURE YOU CAN OPEN THE EXAM GATE?\n\nAll participants will be able to log in and start the exam simultaneously." 
      : "ARE YOU SURE TO CLOSE THE GATE?\n\nNo more participants can enter/start the exam.";
    
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    const { data: existing } = await supabase.from('exam_tokens').select('id').eq('access_code', 'MASTER_GATE').single();
    
    if (existing) {
      await supabase.from('exam_tokens').update({ is_active: turnOn }).eq('access_code', 'MASTER_GATE');
    } else {
      await supabase.from('exam_tokens').insert([{
        access_code: 'MASTER_GATE',
        is_active: turnOn,
        type_of_ac: 'GLOBAL',
        kategori: 'GLOBAL',
        subject: 'GLOBAL',
        exam_no: 0
      }]);
    }
    fetchData();
  }

  const resetParticipant = async (resultId: string, participantName: string) => {
    if (!window.confirm(`YAKIN INGIN MERESET UJIAN UNTUK: ${participantName}?`)) return
    await supabase.from('exam_results').delete().eq('id', resultId); fetchData() 
  }

  const handleAdjustResult = async (resultId: string, isPassed: boolean) => {
    if (!window.confirm(`Yakin mengubah status menjadi ${isPassed ? 'PASSED' : 'FAILED'}?`)) return
    await supabase.from('exam_results').update({ final_passed: isPassed }).eq('id', resultId); fetchData()
  }

  // FUNGSI EMAIL BAWAAN (MAILTO)
  const handleSendEmail = async (session: any) => {
    const isPassed = session.final_passed !== null ? session.final_passed : (session.score >= 75)
    const subject = encodeURIComponent(`Garuda/GMF Exam Result - ${session.candidates.name}`)
    const body = encodeURIComponent(`Dear ${session.candidates.name},\n\nExam Detail:\n- Personnel No: ${session.candidates.personnel_no}\n- Aircraft: ${session.type_of_ac}\n- Category: ${session.kategori}\n\nFinal result: *** ${isPassed ? "PASSED" : "FAILED"} ***\n\nRegards,\nAirworthiness Management`)
    window.location.href = `mailto:${session.candidates.email}?subject=${subject}&body=${body}`
    await supabase.from('exam_results').update({ email_sent: true }).eq('id', session.id)
    setTimeout(() => fetchData(), 2000) 
  }

  // FUNGSI GHOST AUTO-SEND TABEL KE GMF
  const triggerAutoSendToGMF = async (sessionId: string) => {
    const targetEmails = 'mapriyansyahh@gmail.com, arik.yanwar@garuda-indonesia.com';
    if(!window.confirm(`Send a PDF copy of this document to:\n- mapriyansyahh@gmail.com\n- arik.yanwar@garuda-indonesia.com\n\n(The process runs for 3-5 seconds in the background.).`)) return;
    setAutoSendTarget(targetEmails);
    setPdfCaptured(false);
    await handleViewResult(sessionId);
  }

  // ====================================================
  // ALGORITMA BARU: BULK GHOST RENDER & SEND
  // ====================================================
  const startBulkSend = () => {
    const targetEmail = window.prompt(`You selected ${selectedForBulk.length} documents to be sent as attachments in ONE email.\n\nEnter destination email (separate multiple emails with commas):`, "mapriyansyahh@gmail.com, arik.yanwar@garuda-indonesia.com");
    if (!targetEmail) return;

    setBulkTargetEmail(targetEmail);
    setBulkQueue([...selectedForBulk]);
    setBulkCollected([]);
    setIsBulkProcessing(true);
  }

const sendBulkBatchesToAPI = async () => {
    setIsBulkProcessing(false); 
    
    // Pecah data per 5 file agar payload tidak raksasa (Bypass 413 Error)
    const BATCH_SIZE = 5;
    let successCount = 0;
    let errorCount = 0;
    let lastErrorDetail = "Tidak ada error API.";

    for (let i = 0; i < bulkCollected.length; i += BATCH_SIZE) {
        const batch = bulkCollected.slice(i, i + BATCH_SIZE);
        try {
            const response = await fetch('/api/send-bulk-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: bulkTargetEmail,
                    attachments: batch 
                })
            });
            if (response.ok) {
                successCount += batch.length;
            } else {
                const data = await response.json();
                lastErrorDetail = data.error || `HTTP Error ${response.status}`;
                errorCount += batch.length;
            }
        } catch (err: any) {
            lastErrorDetail = err.message;
            errorCount += batch.length;
        }
    }

    alert(`📊 HASIL BULK SEND:\n\n✅ Berhasil: ${successCount} PDF\n❌ Gagal: ${errorCount} PDF\n\n📌 PESAN ERROR:\n${lastErrorDetail}`);
    setSelectedForBulk([]); 
    setBulkCollected([]);
    setBulkTargetEmail(null);
  }

  // LOOP MANAGER: MENGATUR ANTREAN RENDER
  useEffect(() => {
    if (isBulkProcessing && !viewingResultId) {
        if (bulkQueue.length > 0) {
            handleViewResult(bulkQueue[0]); 
        } else if (bulkQueue.length === 0 && bulkCollected.length > 0) {
            sendBulkBatchesToAPI(); 
        }
    }
  }, [isBulkProcessing, viewingResultId, bulkQueue.length, bulkCollected.length]);

  // GHOST RENDERER KHUSUS BULK
  useEffect(() => {
    if (isBulkProcessing && viewingResultId && !resLoading && !pdfCaptured) {
        setPdfCaptured(true); 

        const processBulkPdf = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 2000)); 
                const element = document.getElementById('auto-pdf-wrapper');
                if (!element) throw new Error("Document wrapper tidak ditemukan di layar.");

                // ISOLASI HALAMAN 2 & ESSAY
                const page2ToExclude = document.getElementById('pdf-page-2-exclude');
                let page2OriginalDisplay = '';
                if (page2ToExclude) {
                    page2OriginalDisplay = page2ToExclude.style.display;
                    page2ToExclude.style.setProperty('display', 'none', 'important');
                }

                const essayPages = document.querySelectorAll('.pdf-essay-exclude');
                const essayOriginalDisplays: string[] = [];
                essayPages.forEach((page) => {
                    essayOriginalDisplays.push((page as HTMLElement).style.display);
                    (page as HTMLElement).style.setProperty('display', 'none', 'important');
                });

                const originalGap = element.style.gap;
                element.style.setProperty('gap', '0px', 'important');
                element.classList.remove('items-center', 'w-full');
                element.style.width = '210mm';

                const originalStyles: any[] = [];
                for(let i = 0; i < element.children.length; i++) {
                    const child = element.children[i] as HTMLElement;
                    originalStyles.push({ 
                        mt: child.style.marginTop, mb: child.style.marginBottom, shadow: child.style.boxShadow, height: child.style.height, hasPageBreak: child.classList.contains('page-break')
                    });
                    child.style.setProperty('margin-top', '0px', 'important'); 
                    child.style.setProperty('margin-bottom', '0px', 'important'); 
                    child.style.setProperty('box-shadow', 'none', 'important');
                    child.style.setProperty('height', '296.5mm', 'important'); // 296.5mm FIX ANTI BLANK PAGE
                    child.classList.remove('page-break'); 
                }

                const html2pdf: any = await new Promise((resolve) => {
                    if ((window as any).html2pdf) return resolve((window as any).html2pdf);
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
                    script.onload = () => resolve((window as any).html2pdf);
                    document.body.appendChild(script);
                });
                
                const opt = {
                    margin:       0,
                    filename:     `Exam_Result_${resCandidate?.name || 'Candidate'}.pdf`,
                    image:        { type: 'jpeg' as const, quality: 0.95 }, 
                    html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
                    jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
                };

                const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');

                // SIMPAN KE MEMORI KOLEKTIF
                setBulkCollected(prev => [...prev, { name: resCandidate?.name || 'Candidate', pdfBase64: pdfBase64 }]);

                // KEMBALIKAN STYLE KE ASAL
                if (page2ToExclude) page2ToExclude.style.display = page2OriginalDisplay;
                essayPages.forEach((page, index) => {
                    (page as HTMLElement).style.display = essayOriginalDisplays[index];
                });

                element.style.gap = originalGap;
                element.classList.add('items-center', 'w-full');
                element.style.width = '';
                for(let i = 0; i < element.children.length; i++) {
                    const child = element.children[i] as HTMLElement;
                    child.style.marginTop = originalStyles[i].mt;
                    child.style.marginBottom = originalStyles[i].mb;
                    child.style.boxShadow = originalStyles[i].shadow;
                    child.style.height = originalStyles[i].height;
                    if(originalStyles[i].hasPageBreak) child.classList.add('page-break');
                }
            } catch (error: any) {
                console.error("Bulk PDF Error:", error);
            } finally {
                // LANJUT KE ID BERIKUTNYA
                setViewingResultId(null); 
                setPdfCaptured(false);
                setBulkQueue(prev => prev.slice(1)); 
            }
        };
        
        processBulkPdf();
    }
  }, [isBulkProcessing, viewingResultId, resLoading, resCandidate, pdfCaptured]);

  // PENGAWAS GHOST RENDER (MENCEGAH BLANK PAGE 5 HALAMAN) - SINGLE AUTO SEND
  useEffect(() => {
    if (autoSendTarget && viewingResultId && !resLoading && !pdfCaptured) {
      setPdfCaptured(true); 

      const processPdf = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 2000)); 
            
            const element = document.getElementById('auto-pdf-wrapper');
            if (!element) throw new Error("Document wrapper tidak ditemukan di layar.");

            // ISOLASI HALAMAN 2 & ESSAY AGAR TIDAK TERKIRIM EMAIL
            const page2ToExclude = document.getElementById('pdf-page-2-exclude');
            let page2OriginalDisplay = '';
            if (page2ToExclude) {
                page2OriginalDisplay = page2ToExclude.style.display;
                page2ToExclude.style.setProperty('display', 'none', 'important');
            }

            const essayPages = document.querySelectorAll('.pdf-essay-exclude');
            const essayOriginalDisplays: string[] = [];
            essayPages.forEach((page) => {
                essayOriginalDisplays.push((page as HTMLElement).style.display);
                (page as HTMLElement).style.setProperty('display', 'none', 'important');
            });

            // TRIK SAKTI MENCEGAH BLANK PAGE:
            const originalGap = element.style.gap;
            element.style.setProperty('gap', '0px', 'important');
            element.classList.remove('items-center', 'w-full');
            element.style.width = '210mm';

            const originalStyles: any[] = [];
            for(let i = 0; i < element.children.length; i++) {
                const child = element.children[i] as HTMLElement;
                originalStyles.push({ 
                    mt: child.style.marginTop, 
                    mb: child.style.marginBottom,
                    shadow: child.style.boxShadow,
                    height: child.style.height,
                    hasPageBreak: child.classList.contains('page-break')
                });
                child.style.setProperty('margin-top', '0px', 'important'); 
                child.style.setProperty('margin-bottom', '0px', 'important'); 
                child.style.setProperty('box-shadow', 'none', 'important');
                child.style.setProperty('height', '296.5mm', 'important'); // 296.5mm FIX ANTI BLANK PAGE
                child.classList.remove('page-break'); // Matikan pemisah halaman bawaan
            }

            const html2pdf: any = await new Promise((resolve, reject) => {
                if ((window as any).html2pdf) return resolve((window as any).html2pdf);
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
                script.onload = () => resolve((window as any).html2pdf);
                script.onerror = () => reject(new Error("Gagal memuat pustaka dari server"));
                document.body.appendChild(script);
            });
            
            const opt = {
                margin:       0,
                filename:     `Exam_Result_${resCandidate?.name || 'Candidate'}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.95 }, 
                html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
                jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };

            const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');

            // KEMBALIKAN STYLE KE ASAL AGAR TAMPILAN LAYAR TIDAK RUSAK
            if (page2ToExclude) {
                page2ToExclude.style.display = page2OriginalDisplay;
            }
            essayPages.forEach((page, index) => {
                (page as HTMLElement).style.display = essayOriginalDisplays[index];
            });

            element.style.gap = originalGap;
            element.classList.add('items-center', 'w-full');
            element.style.width = '';
            for(let i = 0; i < element.children.length; i++) {
                const child = element.children[i] as HTMLElement;
                child.style.marginTop = originalStyles[i].mt;
                child.style.marginBottom = originalStyles[i].mb;
                child.style.boxShadow = originalStyles[i].shadow;
                child.style.height = originalStyles[i].height;
                if(originalStyles[i].hasPageBreak) child.classList.add('page-break');
            }

            const response = await fetch('/api/send-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: autoSendTarget, 
                    name: resCandidate?.name || 'Candidate',
                    subject: ' ',
                    pdfBase64: pdfBase64
                })
            });

            if (response.ok) {
                alert(`✅ BERHASIL!\n\nFile PDF sukses terkirim ke:\n${autoSendTarget}`);
            } else {
                const data = await response.json();
                alert('❌ GAGAL PENGIRIMAN EMAIL:\n' + data.error);
            }
        } catch (error: any) {
            alert('❌ ERROR SISTEM:\n' + error.message);
        } finally {
            setAutoSendTarget(null);
            setViewingResultId(null); 
            setPdfCaptured(false);
        }
      };
      
      processPdf();
    }
  }, [autoSendTarget, viewingResultId, resLoading, resCandidate, pdfCaptured]);

  const handleSendEmailWithAttachment = async () => {
    const targetEmail = window.prompt("Enter the destination email address (Manual Email Destination):", "list-tqd@gmf-aeroasia.co.id, m.apriyansyah@gmf-aeroasia.co.id, arik.yanwar@garuda-indonesia.com");
    if (!targetEmail) return;

    setIsSendingEmail(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 300));

        const element = document.getElementById('auto-pdf-wrapper');
        if (!element) throw new Error("Elemen PDF belum siap di layar. Silakan tunggu.");

        // ISOLASI HALAMAN 2 & ESSAY AGAR TIDAK TERKIRIM EMAIL
        const page2ToExclude = document.getElementById('pdf-page-2-exclude');
        let page2OriginalDisplay = '';
        if (page2ToExclude) {
            page2OriginalDisplay = page2ToExclude.style.display;
            page2ToExclude.style.setProperty('display', 'none', 'important');
        }

        const essayPages = document.querySelectorAll('.pdf-essay-exclude');
        const essayOriginalDisplays: string[] = [];
        essayPages.forEach((page) => {
            essayOriginalDisplays.push((page as HTMLElement).style.display);
            (page as HTMLElement).style.setProperty('display', 'none', 'important');
        });

        const originalGap = element.style.gap;
        element.style.setProperty('gap', '0px', 'important');
        element.classList.remove('items-center', 'w-full');
        element.style.width = '210mm';

        const originalStyles: any[] = [];
        for(let i = 0; i < element.children.length; i++) {
            const child = element.children[i] as HTMLElement;
            originalStyles.push({ 
                mt: child.style.marginTop, 
                mb: child.style.marginBottom,
                shadow: child.style.boxShadow,
                height: child.style.height,
                hasPageBreak: child.classList.contains('page-break')
            });
            child.style.setProperty('margin-top', '0px', 'important'); 
            child.style.setProperty('margin-bottom', '0px', 'important'); 
            child.style.setProperty('box-shadow', 'none', 'important');
            child.style.setProperty('height', '296.5mm', 'important');  // 296.5mm FIX ANTI BLANK PAGE
            child.classList.remove('page-break');
        }

        const html2pdf: any = await new Promise((resolve, reject) => {
            if ((window as any).html2pdf) return resolve((window as any).html2pdf);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
            script.onload = () => resolve((window as any).html2pdf);
            script.onerror = () => reject(new Error("Gagal memuat pustaka dari server"));
            document.body.appendChild(script);
        });

        const opt = {
            margin:       0,
            filename:     `Exam_Result_${resCandidate?.name || 'Candidate'}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.95 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
            jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');

        // KEMBALIKAN STYLE KE ASAL
        if (page2ToExclude) {
            page2ToExclude.style.display = page2OriginalDisplay;
        }
        essayPages.forEach((page, index) => {
            (page as HTMLElement).style.display = essayOriginalDisplays[index];
        });

        element.style.gap = originalGap;
        element.classList.add('items-center', 'w-full');
        element.style.width = '';
        for(let i = 0; i < element.children.length; i++) {
            const child = element.children[i] as HTMLElement;
            child.style.marginTop = originalStyles[i].mt;
            child.style.marginBottom = originalStyles[i].mb;
            child.style.boxShadow = originalStyles[i].shadow;
            child.style.height = originalStyles[i].height;
            if(originalStyles[i].hasPageBreak) child.classList.add('page-break');
        }

        const response = await fetch('/api/send-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: targetEmail,
                name: resCandidate?.name || 'Candidate',
                pdfBase64: pdfBase64
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`✅ BERHASIL!\n\nEmail beserta lampiran PDF telah dikirim ke:\n${targetEmail}`);
        } else {
            alert('❌ GAGAL Mengirim Email:\n' + data.error);
        }
    } catch (err: any) {
        console.error("PDF Generate Error: ", err);
        alert(`❌ TERJADI KESALAHAN SISTEM:\n${err.message}`);
    } finally {
        setIsSendingEmail(false);
    }
  }

  const handleViewResult = async (resultId: string) => {
    setViewingResultId(resultId)
    setResLoading(true)

    const { data: resDetail } = await supabase.from('exam_results').select(`*, candidates(*)`).eq('id', resultId).single()
    if (!resDetail) { alert('Data not found'); setViewingResultId(null); setResLoading(false); return }

    setResCandidate(resDetail.candidates)
    setResExamResult(resDetail)

    let specificLimit = 0; let regLimit = 0;
    if (resDetail.subject === 'INITIAL') { specificLimit = 80; regLimit = 20; }
    else if (resDetail.subject === 'RENEWAL') { specificLimit = 40; regLimit = 10; }

    const { data: specificQsData } = await supabase.from('questions').select('id, kategori, options(id, is_correct)').eq('type_of_ac', resDetail.type_of_ac).eq('kategori', resDetail.kategori)
    const { data: regQsData } = await supabase.from('questions').select('id, kategori, options(id, is_correct)').ilike('kategori', '%REGULASI%')

    const shuffledSpecific = shuffleArray(specificQsData || [], resultId).slice(0, specificLimit)
    const shuffledReg = shuffleArray(regQsData || [], resultId).slice(0, regLimit)
    const combinedQuestions = [...shuffledSpecific, ...shuffledReg]
    
    const finalShuffledQuestions = shuffleArray(combinedQuestions, resultId + "mix")
    const { data: answers } = await supabase.from('exam_answers').select('question_id, selected_option_id').eq('result_id', resultId)

    const mapping: Record<number, string> = {}
    let actualAircraftWrong = 0; let actualRegWrong = 0; let actualCorrect = 0;
    const totalQuestions = finalShuffledQuestions.length;
    
    if (answers && answers.length > 0) {
      finalShuffledQuestions.forEach((q: any, index: number) => {
        const userAns = answers.find((a: any) => a.question_id === q.id)
        const isReg = q.kategori && q.kategori.toUpperCase().includes('REGULASI');
        let isAnswerCorrect = false;

        if (userAns) {
          let safeOptions = q.options;
          if (safeOptions.length > 4) {
              const correctOpt = safeOptions.find((o:any) => o.is_correct);
              const wrongOpts = safeOptions.filter((o:any) => !o.is_correct);
              safeOptions = correctOpt ? [correctOpt, ...wrongOpts.slice(0, 3)] : safeOptions.slice(0, 4);
          }

          const shuffledOptions = shuffleArray(safeOptions, resultId + q.id)
          const optIndex = shuffledOptions.findIndex((opt: any) => opt.id === userAns.selected_option_id)
          const char = ['A', 'B', 'C', 'D'][optIndex] || ''
          if (char) mapping[index + 1] = char 

          const selectedOpt = safeOptions.find((o:any) => o.id === userAns.selected_option_id);
          if (selectedOpt && selectedOpt.is_correct) { isAnswerCorrect = true; actualCorrect++; }
        }

        if (!isAnswerCorrect) { if (isReg) actualRegWrong++; else actualAircraftWrong++; }
      })
    }

    setResAnswerMap(mapping)

    const actualScore = totalQuestions > 0 ? Math.round((actualCorrect / totalQuestions) * 100) : 0;
    const isPassDefault = actualScore >= 75;
    const isPassFinal = resDetail.final_passed !== null ? resDetail.final_passed : isPassDefault;

    let displayScore = actualScore; let displayAircraftWrong = actualAircraftWrong;
    let displayRegWrong = actualRegWrong; let displayTotalWrong = actualAircraftWrong + actualRegWrong;

    if (isPassFinal && !isPassDefault) {
       displayScore = 76; displayTotalWrong = totalQuestions === 100 ? 24 : 12; 
       displayRegWrong = Math.min(actualRegWrong, Math.floor(displayTotalWrong / 4));
       displayAircraftWrong = displayTotalWrong - displayRegWrong;
    }

    setResPrintStats({ aircraftWrong: displayAircraftWrong, regWrong: displayRegWrong, totalWrong: displayTotalWrong, score: displayScore, isPass: isPassFinal })
    setResLoading(false)
  }

  if (isCheckingAuth) return null 

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#00102a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/GA3.jpg')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-linear-to-b from-[#002561]/80 to-[#00102a]/90"></div>
        <div className="relative z-10 max-w-sm w-full bg-white/10 backdrop-blur-2xl shadow-2xl rounded-3xl p-8 border border-white/20 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-[#ffffff] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white/20">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">Proctor Gateway</h1>
          <p className="text-[#009CB4] text-[10px] font-bold tracking-[0.3em] mb-8">AUTHORIZED PERSONNEL ONLY</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input type="password" placeholder="ENTER SECURE PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                className={`w-full bg-black/40 border-2 rounded-xl p-4 text-center text-white text-xl tracking-[0.4em] font-mono focus:outline-none transition-all placeholder-white/30 ${loginError ? 'border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/20 focus:border-[#009CB4]'}`} autoFocus />
              {loginError && <p className="text-[#ef4444] text-xs font-bold tracking-widest mt-3 animate-pulse uppercase">❌ Invalid PIN. Access Denied.</p>}
            </div>
            <button type="submit" className="w-full py-4 bg-[#009CB4] hover:bg-[#007b8e] text-white font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(0,156,180,0.4)] hover:scale-[1.02]">
              Verify Identity
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ====================================================
  // LOGIKA SMART FILTER & SORTING
  // ====================================================
  const filteredSessions = sessions.filter(session => {
    const cand = session.candidates; 
    const candName = (cand?.name || '').toLowerCase();
    const candNo = (cand?.personnel_no || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = candName.includes(searchLower) || candNo.includes(searchLower);

    const isPassed = session.final_passed !== null ? session.final_passed : (session.score >= 75);
    let matchesStatus = true;
    if (statusFilter === 'LIVE') matchesStatus = session.status !== 'COMPLETED';
    if (statusFilter === 'PASSED') matchesStatus = session.status === 'COMPLETED' && isPassed;
    if (statusFilter === 'FAILED') matchesStatus = session.status === 'COMPLETED' && !isPassed;

    let matchesDate = true;
    if (dateFilter && session.started_at) {
       const localSessionDate = new Date(session.started_at);
       const tzoffset = localSessionDate.getTimezoneOffset() * 60000;
       const sessionDateStr = new Date(localSessionDate.getTime() - tzoffset).toISOString().split('T')[0];
       matchesDate = sessionDateStr === dateFilter;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // TAMBAHAN: GROUPING & SORTING SESSIONS BERDASARKAN KANDIDAT & STATUS LIVE
  const groupedSessionsArray = Object.values(filteredSessions.reduce((acc: any, session: any) => {
    const candNo = session.candidates?.personnel_no || 'Unknown';
    if (!acc[candNo]) {
      acc[candNo] = {
        candidate: session.candidates,
        exams: []
      };
    }
    acc[candNo].exams.push(session);
    return acc;
  }, {}));

  // SORTING MESIN: Memaksa grup yang memiliki status LIVE (Sedang ujian) untuk tampil di urutan teratas
  groupedSessionsArray.sort((a: any, b: any) => {
    const aHasLive = a.exams.some((e: any) => e.status !== 'COMPLETED');
    const bHasLive = b.exams.some((e: any) => e.status !== 'COMPLETED');

    if (aHasLive && !bHasLive) return -1;
    if (!aHasLive && bHasLive) return 1;

    // Jika sama-sama LIVE (atau sama-sama selesai), urutkan berdasarkan ujian yang paling baru dimulai
    const aLatest = Math.max(...a.exams.map((e: any) => new Date(e.started_at || 0).getTime()));
    const bLatest = Math.max(...b.exams.map((e: any) => new Date(e.started_at || 0).getTime()));
    
    return bLatest - aLatest;
  });

  // Mengurutkan ujian di dalam masing-masing kandidat (LIVE paling atas)
  groupedSessionsArray.forEach((group: any) => {
    group.exams.sort((a: any, b: any) => {
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
    });
  });

  const groupedSessions = groupedSessionsArray;

  // ==========================================
  // RENDER 2: PDF VIEWER / PRINT MODE
  // ==========================================
  if (viewingResultId) {
    if (resLoading) return (
      <div className="min-h-screen bg-[#00102a] flex items-center justify-center text-center">
        <div>
          <div className="w-16 h-16 border-4 border-[#009CB4] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-white font-black tracking-widest uppercase animate-pulse">Generating Report...</div>
        </div>
      </div>
    )
    return (
      <>
        {/* HAMBARAN LOADING AUTO-SEND */}
        {autoSendTarget && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#00102a]/95 backdrop-blur-md text-white">
             <div className="w-20 h-20 border-8 border-t-[#009CB4] border-[#374151] rounded-full animate-spin mb-8"></div>
             <h2 className="text-2xl font-black tracking-widest uppercase mb-3">Auto-Generating Document</h2>
             <p className="text-[#009CB4] font-bold">Scanning PDF and routing silently to: <span className="text-white">{autoSendTarget}</span></p>
             <p className="text-xs text-[#9ca3af] mt-5">(Please do not close this window)</p>
          </div>
        )}

        {/* HAMBARAN LOADING BULK SEND (KUNING) */}
        {isBulkProcessing && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111827]/95 backdrop-blur-md text-white">
             <div className="w-24 h-24 border-8 border-t-[#f59e0b] border-[#374151] rounded-full animate-spin mb-8 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
             <h2 className="text-3xl font-black tracking-widest uppercase mb-3 text-[#f59e0b] animate-pulse">Bulk Processing...</h2>
             <p className="text-lg font-bold bg-[#1f2937] px-6 py-2 rounded-full border border-[#374151]">
                Rendering <span className="text-[#f59e0b]">{bulkCollected.length + 1}</span> of <span className="text-[#10b981]">{selectedForBulk.length}</span> documents
             </p>
             <p className="text-xs text-[#9ca3af] mt-8">(Please wait. Do not close this window or change tabs)</p>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
            header, footer { display: none !important; }
            .page-break { break-before: page; }
            .print-hidden { display: none !important; }
          }
        `}} />
        
        {/* PANEL KONTROL TANDA TANGAN ADMIN */}
        {showSignPanel && (
          <div className="fixed top-0 left-0 h-full w-[400px] bg-[#ffffff] shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 print-hidden flex flex-col border-r border-[#e5e7eb]">
            <div className="bg-[#002561] text-white p-5 flex justify-between items-center shadow-md">
              <div>
                <h2 className="font-black tracking-widest uppercase text-sm">Signatures</h2>
                <p className="text-[#009CB4] text-[10px]">Admin Authentication</p>
              </div>
              <button onClick={() => setShowSignPanel(false)} className="text-white hover:text-[#f87171] font-bold transition">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 bg-[#f9fafb] flex-1">
              <div className="bg-[#ffffff] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Assessor Name</label>
                <input type="text" className="w-full text-sm p-2 border-2 border-[#e5e7eb] rounded-lg outline-none focus:border-[#009CB4] uppercase mb-3 transition" value={adminSignData.assessorName} onChange={(e) => updateAdminSignData('assessorName', e.target.value)} />
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Assessor Sign</label>
                <AdminSignaturePad value={adminSignData.assessorSign} onChange={(val) => updateAdminSignData('assessorSign', val)} />
              </div>

              <div className="bg-[#ffffff] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Inspector Name</label>
                <input type="text" className="w-full text-sm p-2 border-2 border-[#e5e7eb] rounded-lg outline-none focus:border-[#009CB4] uppercase mb-3 transition" value={adminSignData.inspectorName} onChange={(e) => updateAdminSignData('inspectorName', e.target.value)} />
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Inspector Sign</label>
                <AdminSignaturePad value={adminSignData.inspectorSign} onChange={(val) => updateAdminSignData('inspectorSign', val)} />
              </div>
              
              <div className="bg-[#ffffff] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Examiner 1 Sign</label>
                <AdminSignaturePad value={adminSignData.examiner1Sign} onChange={(val) => updateAdminSignData('examiner1Sign', val)} />
              </div>

              <div className="bg-[#ffffff] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Examiner 2 Sign</label>
                <AdminSignaturePad value={adminSignData.examiner2Sign} onChange={(val) => updateAdminSignData('examiner2Sign', val)} />
              </div>
            </div>
          </div>
        )}

        <div className={`min-h-screen bg-[#111827] py-12 flex flex-col items-center gap-12 print:bg-[#ffffff] print:py-0 print:gap-0 print:block transition-all duration-300 ${showSignPanel ? 'ml-[400px]' : ''}`}>
          
          <div className="fixed bottom-8 right-8 flex flex-col gap-3 print-hidden z-40">
            <button onClick={() => setShowSignPanel(true)} className="bg-[#d97706] text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(217,119,6,0.3)] font-black uppercase tracking-widest hover:bg-[#b45309] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">✍️</span> Fill Signatures
            </button>
            <button onClick={() => window.print()} className="bg-[#059669] text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(5,150,105,0.3)] font-black uppercase tracking-widest hover:bg-[#047857] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">🖨️</span> Print Document
            </button>
            <button onClick={handleSendEmailWithAttachment} disabled={isSendingEmail} className={`text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${isSendingEmail ? 'bg-[#60a5fa] border-[#93c5fd] cursor-not-allowed' : 'bg-[#2563eb] shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-[#1d4ed8] hover:scale-105 border-[#3b82f6]'}`}>
              <span className="text-xl">📨</span> {isSendingEmail ? 'Sending...' : 'Send Email'}
            </button>
            <button onClick={() => setViewingResultId(null)} className="bg-[#374151] text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] font-black uppercase tracking-widest hover:bg-[#1f2937] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">🔙</span> Back to Dashboard
            </button>
          </div>
          
          {/* TRACKER PDF ID DIMASUKAN KEMBALI DI SINI */}
          <div id="auto-pdf-wrapper" ref={pdfWrapperRef} className="flex flex-col items-center gap-12 print:gap-0 w-full text-[#000000]">
              
              {/* ================= PAGE 1 ================= */}
              <div className="w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[10mm] pt-[10mm] pb-[5mm] print:shadow-none print:w-full print:h-[297mm] print:px-[10mm] print:pt-[10mm] print:pb-[5mm] relative flex flex-col overflow-hidden">
                <div className="flex flex-col items-center justify-center mb-6">
                   <img src="/logo.png" alt="Garuda Indonesia" className="h-14 mb-2 object-contain" />
                   <div className="font-serif font-bold text-lg leading-tight">Garuda Indonesia</div>
                   <div className="text-xs uppercase tracking-widest text-[#374151] mb-4">Airworthiness Management</div>
                   <h2 className="text-lg font-bold uppercase underline decoration-2 underline-offset-4">RECURRENT PROGRAM / ASSESSMENT</h2>
                </div>
                <div className="border-2 border-[#000000] flex-1 flex flex-col">
                  <div className="p-4 space-y-2 border-b border-[#000000]">
                    <DataRow label="Name" value={resCandidate?.name} />
                    <DataRow label="Personnel No" value={resCandidate?.personnel_no} />
                    <DataRow label="Unit" value={resCandidate?.unit} />
                    <DataRow label="Rating Sought" value={resCandidate?.rating_sought} />
                    <DataRow label="Date of Exam" value={formatDate(resCandidate?.exam_date)} />
                  </div>
                  <div className="p-4 space-y-2 border-b border-[#000000]">
                    <h3 className="font-bold underline text-sm mb-2">DGAC License</h3>
                    <DataRow label="AMEL No" value={resCandidate?.dgac_amel_no || '-'} />
                    <DataRow label="Rating" value={resCandidate?.dgac_rating || '-'} />
                  </div>
                  <div className="p-4 space-y-2 border-b border-[#000000]">
                    <h3 className="font-bold underline text-sm mb-2">GA Authorization</h3>
                    <DataRow label="No" value={resCandidate?.ga_auth_no || '-'} />
                    <DataRow label="Rating" value={resCandidate?.ga_rating || '-'} />
                  </div>
                  <div className="p-4 border-b border-[#000000] min-h-45 relative flex-1">
                    <p className="text-sm mb-4">I have personally tested this applicant with final judgment as follows <span className="italic text-xs">(filled by JKTMQSGA)</span> :</p>
                    <div className="ml-4 mt-4 space-y-4 font-bold text-base">
                      <div className="flex items-center"><span className="w-20">PASSED</span> : <span className="ml-4 text-xl">{resPrintStats.isPass ? '✓' : ''}</span></div>
                      <div className="flex items-center"><span className="w-20">FAILED</span> : <span className="ml-4 text-xl">{!resPrintStats.isPass ? '✓' : ''}</span></div>
                    </div>
                    <div className="absolute bottom-4 right-10 w-64 text-center flex flex-col items-center">
                      <p className="text-xs mb-1">Assessor</p> 
                      <div className="h-16 w-full flex justify-center items-end mb-1">
                        {adminSignData.assessorSign && <img src={adminSignData.assessorSign} className="max-h-full object-contain mix-blend-multiply" />}
                      </div>
                      <div className="border-b border-[#000000] w-full mb-1"></div>
                      <p className="font-bold text-sm tracking-widest uppercase">
                      ( {adminSignData.assessorName ? adminSignData.assessorName : <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</>} )
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-[#ffffff] min-h-[160px] flex flex-col justify-between">
                    <div>
                      <p className="text-sm mb-2 font-bold">To be fulfilled by Airworthiness Standard (MQS)</p>
                      <div className="mb-0"><span className="font-bold text-sm">Issued Auth No:</span><div className="border-b border-dotted border-[#9ca3af] w-full h-6"></div></div>
                    </div>
                    <div className="self-end w-64 text-center mt-2 flex flex-col items-center">
                      <div className="text-left mb-0 text-sm mt-1 w-full">Jakarta : <span className="underline decoration-dotted"></span></div>
                      <p className="text-xs mb-1 w-full text-center">Inspector Airworthiness Standard</p> 
                      <div className="h-16 w-full flex justify-center items-end mb-1">
                        {adminSignData.inspectorSign && <img src={adminSignData.inspectorSign} className="max-h-full object-contain mix-blend-multiply" />}
                      </div>
                      <div className="border-b border-[#000000] w-full mb-1"></div>
                      <p className="text-xs text-center font-bold uppercase w-full">{adminSignData.inspectorName ? adminSignData.inspectorName : 'Name / Pers No'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono mt-2 text-[#6b7280]"><span>Form MZ 1-17.1 (10-13)</span><span>1 of 2</span></div>
              </div>

              {/* ================= PAGE 2: ASSESSMENT ITEMS (EXCLUDED DARI EMAIL) ================= */}
              <div id="pdf-page-2-exclude" className="w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[10mm] pt-[10mm] pb-[5mm] print:shadow-none print:w-full print:h-[297mm] print:px-[10mm] print:pt-[10mm] print:pb-[5mm] relative flex flex-col overflow-hidden page-break mt-12 print:mt-0">
                <div className="flex flex-col items-center justify-center mb-4">
                   <img src="/logo.png" alt="Garuda Indonesia" className="h-10 mb-1 object-contain" />
                   <div className="font-serif font-bold text-sm leading-tight">Garuda Indonesia</div>
                   <div className="text-[10px] uppercase tracking-widest text-[#374151] mb-2">Airworthiness Management</div>
                   <h2 className="text-base font-bold uppercase underline decoration-2 underline-offset-4">RECURRENT PROGRAM/ ASSESMENT</h2>
                </div>

                <table className="w-full border-collapse border border-[#000000] text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-[#000000] p-1.5 w-8 text-center font-bold">No</th>
                      <th className="border border-[#000000] p-1.5 text-center font-bold">ITEM</th>
                      <th className="border border-[#000000] p-1.5 w-12 text-center font-bold">PASS</th>
                      <th className="border border-[#000000] p-1.5 w-12 text-center font-bold">FAIL</th>
                      <th className="border border-[#000000] p-1.5 w-32 text-center font-bold">REMARK</th>
                    </tr>
                  </thead>
                  <tbody>
                      {/* ROW 1 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">1</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">GA Regulation/ TM/ Maintenance Program</div>
                          <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                            <li>CASR Part 21 / 39 / 43 / 65 / 91 / 121 / 145</li>
                            <li>Maintavi Format (Basic format / AOG / Component, etc)</li>
                            <li>De-icing / Snow Removal Procedure</li>
                            <li>Part Robbing Procedure</li>
                            <li>HIL Issuing</li>
                            <li>Dispatch Authorization Procedure, etc</li>
                          </ol>
                          <div className="border-b border-dotted border-gray-400 mt-5 w-3/4"></div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[70px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                      {/* ROW 2 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">2</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">Walk Around Inspection / Inspection Sheet</div>
                          <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                            <li>Nose Section - Significant item - Finding</li>
                            <li>Main Wheel Area - Significant item - Finding</li>
                            <li>Engine Section - Significant item - Finding</li>
                            <li>Wing Area - Significant item - Finding</li>
                            <li>Tail Section - Significant item - Finding</li>
                          </ol>
                          <div className="border-b border-dotted border-gray-400 mt-5 w-3/4"></div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[70px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                      {/* ROW 3 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">3</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">Manual Reading / Paper work / AML</div>
                          <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                            <li>DDG - For issuing HIL</li>
                            <li>IPC - Effectivity P/N</li>
                            <li>AML - Answering Pilot Report - Completion</li>
                            <li>Aircraft Technical Publication</li>
                          </ol>
                          <div className="border-b border-dotted border-gray-400 mt-5 w-3/4"></div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[70px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                      {/* ROW 4 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">4</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">Aircraft Document</div>
                          <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                            <li>A/C document - (Completeness)</li>
                            <li>C of A, C of R - (Process- Original - A/C effectivity)</li>
                            <li>Radio Permit - (Process)</li>
                            <li>A/C Weighing - (Process)</li>
                            <li>Compass card - (Process)</li>
                          </ol>
                          <div className="border-b border-dotted border-gray-400 mt-5 w-3/4"></div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[70px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                      {/* ROW 5 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">5</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">Aircraft System</div>
                          <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                            <li>A/C system during walk around check</li>
                            <li>A/C system procedure, system operational/ functional and trouble shooting per ATA Standard Chapter Number : ( ATA 5 - 12, 20 - 49, 51 - 57, 70 - 80)</li>
                            <li>Audit & Surveillance System.</li>
                            <li>A/C Modification, New Technologies, Alteration Status, Critical or Complex Inspection, installation/ adjustment, BITE process, and experience problem</li>
                            <li>ETOPS, RVSM, AutoLand, RNP, EGPWS, CDLS.</li>
                            <li>Engine Run Procedures</li>
                          </ol>
                          <div className="border-b border-dotted border-gray-400 mt-5 w-3/4"></div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[110px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                      {/* ROW 6 */}
                      <tr>
                        <td className="border border-[#000000] p-2 text-center align-top font-bold text-sm">6</td>
                        <td className="border border-[#000000] p-2 align-top text-xs">
                          <div className="font-bold mb-1">Personal Attitude and Human Factor</div>
                          <div className="pl-4 space-y-0.5 text-[10px] flex flex-col">
                            <span>a. Seeking Information (daya tangkap menerima pertanyaan)</span>
                            <span>b. Analysis thinking (pengelolaan pertanyaan untuk memberi jawaban)</span>
                            <span>c. Decision making (memutuskan jawaban yang benar).</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-0 text-center align-top">
                          <div className="relative w-full h-full min-h-[30px] flex items-center justify-center">
                            <input type="checkbox" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10" />
                            <span className="opacity-0 peer-checked:opacity-100 text-lg font-black text-black select-none pointer-events-none">✓</span>
                          </div>
                        </td>
                        <td className="border border-[#000000] p-1 align-top"><textarea className="w-full h-full min-h-[50px] resize-none outline-none bg-transparent text-[10px] p-1" placeholder="Type here..."></textarea></td>
                      </tr>
                  </tbody>
                </table>
                <div className="flex justify-between text-[10px] font-mono mt-8 text-[#6b7280]"><span>Form MZ 1-17.1 (10-13)</span><span>2 of 2</span></div>
              </div>
              
              {/* ================= PAGE 3 ================= */}
              <div className="w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[10mm] pt-[10mm] pb-[5mm] print:shadow-none print:w-full print:h-[297mm] print:px-[10mm] print:pt-[10mm] print:pb-[5mm] relative flex flex-col overflow-hidden page-break mt-12 print:mt-0">
                
                {/* HEADER EXACT MATCH DENGAN GAMBAR REFERENSI */}
                <div className="flex items-end w-full mb-4">
                  {/* Kiri: Logo dan Teks (Rata Tengah dalam bloknya sendiri) */}
                  <div className="flex flex-col items-center w-[40%] shrink-0">
                    <img src="/logo.png" alt="Garuda Indonesia" className="h-11 mb-1 object-contain" />
                    <div className="font-bold text-[15px] leading-tight text-black font-sans">Garuda Indonesia</div>
                    <div className="text-[12px] italic text-black font-sans">Airworthiness Management</div>
                  </div>
                  
                  {/* Kanan: Garis Hitam Tebal dan Judul Answer Sheet */}
                  <div className="flex flex-col w-[60%] shrink-0 pb-1">
                    <div className="w-full border-t-[3px] border-[#000000] mb-2"></div>
                    <h1 className="text-2xl font-bold uppercase text-black ml-4 tracking-wide">ANSWER SHEET</h1>
                  </div>
                </div>

                <div className="border border-[#000000] text-xs">
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Aircraft type</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1 truncate">{resExamResult?.type_of_ac || '-'}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Name</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1 truncate">{resCandidate?.name}</span>
                    </div>
                  </div>
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Date</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{formatDate(resCandidate?.exam_date)}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Pers. No.</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resCandidate?.personnel_no}</span>
                    </div>
                  </div>
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Booklet code</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resExamResult?.subject} - NO.{resExamResult?.exam_no}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Unit</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resCandidate?.unit}</span>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Subject</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resExamResult?.subject}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Exam. No.</span><span>:</span></div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3].map(num => (
                          <div key={num} className="flex items-center gap-1 border border-[#000000] px-1">
                            <div className={`w-3 h-3 border border-[#000000] flex items-center justify-center text-[10px]`}>{resExamResult?.exam_no === num ? 'X' : ''}</div>
                            <span>{num}</span>
                          </div>
                        ))}
                        <span className="text-[9px] ml-1 italic">(cross the chosen)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex mt-2 mb-3 items-stretch">
                  <div className="w-2/3 text-[10px] pr-4 pt-1">
                    <p>1. Read the questions carefully.</p>
                    <p>2. Cross the column for the chosen answer.</p>
                    <p>3. Do not write anything on the booklet.</p>
                    <p className="font-bold">4. Passing-grade 75%</p>
                  </div>
                  <div className="w-1/3 border border-[#000000] min-h-[65px] relative flex justify-center items-center overflow-hidden">
                    <span className="text-[10px] absolute top-1 left-1 z-10 text-[#000000] font-bold">Signature:</span>
                    {resCandidate?.signature && (<img src={resCandidate.signature} alt="Sign" className="absolute inset-0 w-full h-full object-contain scale-[1.3] mix-blend-multiply pt-3" />)}
                  </div>
                </div>
                <div className="border-2 border-[#000000] p-1 flex gap-1 mt-1">
                   {[0, 25, 50, 75].map((startIdx) => (
                     <div key={startIdx} className="flex-1 border-r last:border-r-0 border-[#9ca3af]">
                        <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-[#000000] text-center bg-[#f3f4f6]">
                          <div>No</div><div>A</div><div>B</div><div>C</div><div>D</div>
                        </div>
                        {Array.from({ length: 25 }).map((_, i) => {
                           const no = startIdx + i + 1; const userAns = resAnswerMap[no]
                           return (
                             <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-[#d1d5db] h-[21px] items-center">
                                <div className="text-center font-bold border-r border-[#d1d5db]">{no}</div>
                                {['A', 'B', 'C', 'D'].map((opt) => (
                                   <div key={opt} className="border-r last:border-r-0 border-[#d1d5db] relative flex justify-center items-center h-full">
                                      {userAns === opt && (<div className="absolute text-xl font-handwriting text-[#002561] pointer-events-none" style={{top: '-6px'}}>X</div>)}
                                   </div>
                                ))}
                             </div>
                           )
                        })}
                     </div>
                   ))}
                </div>
                <div className="mt-2 text-[10px]">
                   <div className="flex w-1/2 border border-[#000000] border-b-0 h-[70px]">
                     <div className="w-24 border-r border-[#000000] p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                     <div className="flex-1 border-r border-[#000000] relative p-1 flex items-center justify-center overflow-hidden">
                       <span className="absolute top-0 left-1 text-[9px] font-bold text-[#4b5563]">1</span>
                       {adminSignData.examiner1Sign && <img src={adminSignData.examiner1Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                     </div>
                     <div className="flex-1 relative p-1 flex items-center justify-center overflow-hidden">
                       <span className="absolute top-0 left-1 text-[9px] font-bold text-[#4b5563]">2</span>
                       {adminSignData.examiner2Sign && <img src={adminSignData.examiner2Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                     </div>
                   </div>
                   <div className="flex border border-[#000000] h-[100px]">
                     <div className="w-1/4 border-r border-[#000000] flex flex-col">
                       <div className="flex-1 border-b border-[#9ca3af] p-2 flex justify-between items-center">
                         <span>Aircraft system wrong :</span> <span className="font-bold text-lg">{resPrintStats.aircraftWrong}</span>
                       </div>
                       <div className="flex-1 p-2 flex justify-between items-center">
                         <span>Regulation wrong :</span> <span className="font-bold text-lg">{resPrintStats.regWrong}</span>
                       </div>
                     </div>
                     <div className="w-1/4 border-r border-[#000000] p-2 flex flex-col">
                       <span className="mb-2">Total wrong :</span>
                       <span className="font-bold text-3xl text-center mt-2">{resPrintStats.totalWrong}</span>
                     </div>
                     <div className="w-1/4 border-r border-[#000000] flex flex-col">
                       <div className="flex-1 border-b border-[#9ca3af] p-2 flex items-center">
                         <span className="w-10">Pass</span><span>:</span> <span className="ml-4 font-bold text-xl">{resPrintStats.isPass ? '✓' : ''}</span>
                       </div>
                       <div className="flex-1 p-2 flex items-center">
                         <span className="w-10">Fail</span><span>:</span> <span className="ml-4 font-bold text-xl">{!resPrintStats.isPass ? '✓' : ''}</span>
                       </div>
                     </div>
                     <div className="w-1/4 p-2 flex flex-col items-center justify-center">
                       <span className="font-bold text-lg mb-2">SCORE :</span>
                       <span className="font-bold text-4xl">{resPrintStats.score}</span>
                     </div>
                   </div>
                </div>
                <div className="flex justify-between text-[9px] font-mono mt-2 text-[#6b7280]"><span>Form MZ-1-16.3(3-12)</span></div>
              </div>

              {/* ================= PAGE 4: GMF STYLE ================= */}
              <div className="w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[10mm] pt-[10mm] pb-[5mm] print:shadow-none print:w-full print:h-[297mm] print:px-[10mm] print:pt-[10mm] print:pb-[5mm] relative flex flex-col overflow-hidden page-break mt-12 print:mt-0">
                
                {/* HEADER GMF EXACT MATCH DENGAN GAMBAR REFERENSI */}
                <div className="flex w-full items-end mb-4">
                   {/* Kiri: Logo GMF & Nama (Tanpa Garis Bawah) */}
                   <div className="flex items-center gap-3 pr-4 shrink-0 pb-1">
                     <img src="/logo.png" alt="GMF AeroAsia" className="h-9 object-contain" />
                     <div className="flex flex-col justify-center">
                       <div className="text-[17px] text-black font-sans tracking-wide leading-none">
                         <span className="font-bold">GMF</span>AeroAsia
                       </div>
                       <div className="text-[6px] tracking-[0.2em] text-[#6b7280] mt-1 uppercase">
                         Garuda Indonesia Group
                       </div>
                     </div>
                   </div>
                   
                   {/* Kanan: QA & Safety, Garis Hitam Tebal (Hanya di Kanan), Answer Sheet */}
                   <div className="flex-1 flex flex-col">
                     <div className="text-right text-[12px] italic text-black font-sans mb-1 leading-none pr-2">
                       Quality Assurance & Safety
                     </div>
                     <div className="w-full border-t-[2px] border-[#000000]"></div>
                     <div className="pt-1.5 text-center">
                       <h1 className="text-[19px] font-sans font-bold text-black tracking-wide uppercase">ANSWER SHEET</h1>
                     </div>
                   </div>
                </div>

                <div className="border border-[#000000] text-xs">
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>A/C/Engine/Comp/Others</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1 truncate">{resExamResult?.type_of_ac || '-'}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Name</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1 truncate">{resCandidate?.name}</span>
                    </div>
                  </div>
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Date</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{formatDate(resCandidate?.exam_date)}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Pers. No.</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resCandidate?.personnel_no}</span>
                    </div>
                  </div>
                  <div className="flex border-b border-[#000000]">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                      <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Booklet Code</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resExamResult?.subject} - NO.{resExamResult?.exam_no}</span>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                      <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Unit</span><span>:</span></div>
                      <span className="font-handwriting uppercase flex-1">{resCandidate?.unit}</span>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-1/2 border-r border-[#000000] p-1 flex items-center">
                       <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Subject</span><span>:</span></div>
                       <div className="flex items-center gap-0.5 text-[8px] flex-1 leading-none">
                          <div className="flex items-center gap-0.5">
                            <span className="w-2.5 h-2.5 inline-block border border-[#000000] flex items-center justify-center font-bold text-[8px]">
                              {resExamResult?.subject === 'RENEWAL' ? 'X' : ''}
                            </span>
                            <span>RENEWAL</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="w-2.5 h-2.5 inline-block border border-[#000000] flex items-center justify-center"></span>
                            <span>ADDITIONAL</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="w-2.5 h-2.5 inline-block border border-[#000000] flex items-center justify-center font-bold text-[8px]">
                              {resExamResult?.subject === 'INITIAL' ? 'X' : ''}
                            </span>
                            <span>INITIAL</span>
                          </div>
                       </div>
                    </div>
                    <div className="w-1/2 p-1 flex items-center">
                       <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Exam times No.</span><span>:</span></div>
                       <div className="flex items-center gap-2">
                           {[1, 2, 3].map(num => (
                             <div key={num} className="flex items-center gap-1 border border-[#000000] px-1">
                               <div className={`w-3 h-3 border border-[#000000] flex items-center justify-center text-[10px]`}>{resExamResult?.exam_no === num ? 'X' : ''}</div>
                               <span>{num}</span>
                             </div>
                           ))}
                           <span className="text-[9px] ml-1 italic">(Cross the chosen)</span>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex mt-2 mb-3 items-stretch">
                  <div className="w-3/4 text-[10px] pr-4 pt-1">
                    <p>1. Read the question carefully.</p>
                    <p>2. Cross the column for the chosen answer.</p>
                    <p>3. Do not write anything on the booklet.</p>
                    <p className="font-bold">4. Passing grade score 75%</p>
                  </div>
                  <div className="w-1/4 border border-[#000000] min-h-[65px] relative flex justify-center items-center overflow-hidden">
                    <span className="text-[10px] absolute top-1 left-1 z-10 text-[#000000] font-bold">Signature:</span>
                    {resCandidate?.signature && (<img src={resCandidate.signature} alt="Sign" className="absolute inset-0 w-full h-full object-contain scale-[1.3] mix-blend-multiply pt-3" />)}
                  </div>
                </div>

                <div className="border-2 border-[#000000] p-1 flex gap-1 mt-1">
                   {[0, 25, 50, 75].map((startIdx) => (
                     <div key={startIdx} className="flex-1 border-r last:border-r-0 border-[#9ca3af]">
                        <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-[#000000] text-center bg-[#f3f4f6]">
                          <div>No</div><div>A</div><div>B</div><div>C</div><div>D</div>
                        </div>
                        {Array.from({ length: 25 }).map((_, i) => {
                           const no = startIdx + i + 1; const userAns = resAnswerMap[no]
                           return (
                             <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-[#d1d5db] h-[21px] items-center">
                                <div className="text-center font-bold border-r border-[#d1d5db]">{no}</div>
                                {['A', 'B', 'C', 'D'].map((opt) => (
                                   <div key={opt} className="border-r last:border-r-0 border-[#d1d5db] relative flex justify-center items-center h-full">
                                      {userAns === opt && (<div className="absolute text-xl font-handwriting text-[#002561] pointer-events-none" style={{top: '-6px'}}>X</div>)}
                                   </div>
                                ))}
                             </div>
                           )
                        })}
                     </div>
                   ))}
                </div>
                
                <div className="mt-2 text-[10px]">
                   <div className="flex w-1/2 border border-[#000000] border-b-0 h-[80px]">
                     <div className="w-24 border-r border-[#000000] p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                     <div className="flex-1 border-r border-[#000000] relative p-1 flex items-center justify-center overflow-hidden">
                       <span className="absolute top-0 left-1 text-[9px] font-bold text-[#4b5563]">1</span>
                       {adminSignData.examiner1Sign && <img src={adminSignData.examiner1Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                     </div>
                     <div className="flex-1 relative p-1 flex items-center justify-center overflow-hidden">
                       <span className="absolute top-0 left-1 text-[9px] font-bold text-[#4b5563]">2</span>
                       {adminSignData.examiner2Sign && <img src={adminSignData.examiner2Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                     </div>
                   </div>
                   <div className="flex border border-[#000000] h-[100px]">
                     <div className="w-1/4 border-r border-[#000000] flex flex-col">
                       <div className="flex-1 border-b border-[#9ca3af] p-2 flex justify-between items-center">
                         <span>Aircraft system wrong :</span> <span className="font-bold text-lg">{resPrintStats.aircraftWrong}</span>
                       </div>
                       <div className="flex-1 p-2 flex justify-between items-center">
                         <span>Regulation wrong :</span> <span className="font-bold text-lg">{resPrintStats.regWrong}</span>
                       </div>
                     </div>
                     <div className="w-1/4 border-r border-[#000000] p-2 flex flex-col">
                       <span className="mb-2">Total wrong :</span>
                       <span className="font-bold text-3xl text-center mt-2">{resPrintStats.totalWrong}</span>
                     </div>
                     <div className="w-1/4 border-r border-[#000000] flex flex-col">
                       <div className="flex-1 border-b border-[#9ca3af] p-2 flex items-center">
                         <span className="w-10">Pass</span><span>:</span> <span className="ml-4 font-bold text-xl">{resPrintStats.isPass ? '✓' : ''}</span>
                       </div>
                       <div className="flex-1 p-2 flex items-center">
                         <span className="w-10">Fail</span><span>:</span> <span className="ml-4 font-bold text-xl">{!resPrintStats.isPass ? '✓' : ''}</span>
                       </div>
                     </div>
                     <div className="w-1/4 p-2 flex flex-col items-center justify-center">
                       <span className="font-bold text-lg mb-2">SCORE :</span>
                       <span className="font-bold text-4xl">{resPrintStats.score}</span>
                     </div>
                   </div>
                </div>
                <div className="flex justify-between text-[9px] font-mono mt-2 text-[#6b7280]"><span>FORM GMF/Q-448</span></div>
              </div>

              {/* ========================================================================================= */}
              {/* ESSAY QUESTION PAGE 1 (HALAMAN 1 ESSAY)                                                   */}
              {/* ========================================================================================= */}
              <div className="pdf-essay-exclude fixed-a4 w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[15mm] pt-[15mm] pb-[10mm] print:shadow-none print:w-full print:h-[297mm] print:px-[15mm] print:pt-[15mm] print:pb-[10mm] relative flex flex-col overflow-hidden page-break mt-12 print:mt-0 text-black font-sans">
                 <div className="flex flex-col items-center mb-8">
                    <img src="/logo.png" alt="Logo" className="h-14 mb-1 object-contain" />
                    <div className="font-bold text-[16px] leading-tight text-[#64748b] font-sans">Garuda Indonesia</div>
                    <div className="text-[14px] text-[#64748b] font-sans">Airworthiness Management</div>
                 </div>

                 {/* FORMAT HEADER BIODATA (Name di atas, Pers No di bawah) */}
                 <div className="mb-8 text-[13px] flex flex-col gap-3 w-full">
                    <div className="flex items-end">
                       <div className="w-[160px] font-bold text-gray-800">Name</div>
                       <div className="mr-2 font-bold text-gray-800">:</div>
                       <div className="flex-1 border-b border-[#60a5fa] font-bold text-black uppercase pb-0.5">{resCandidate?.name || ''}</div>
                    </div>
                    <div className="flex items-end">
                       <div className="w-[160px] font-bold text-gray-800">Personnel No. & Unit</div>
                       <div className="mr-2 font-bold text-gray-800">:</div>
                       <div className="flex-1 border-b border-[#60a5fa] font-bold text-black uppercase pb-0.5">{resCandidate?.personnel_no || ''} / {resCandidate?.unit || ''}</div>
                    </div>
                 </div>

                 <div className="space-y-1.5 text-[13px] mb-6 leading-snug">
                    <div className="flex gap-2"><span className="w-4">1.</span><p>How do you know about Garuda safety & policy indoctrination and when you got that?</p></div>
                    <div className="flex gap-2"><span className="w-4">2.</span><p>What are privilege Aircraft maintenance engineer license ref. CASR Part 65?</p></div>
                    <div className="flex gap-2"><span className="w-4">3.</span><p>Refer CMM chapter IX, what kind of type of maintenance task shall be executed for release to service?</p></div>
                    <div className="flex gap-2"><span className="w-4">4.</span><p>What are the safety precautions during refueling?</p></div>
                    <div className="flex gap-2"><span className="w-4">5.</span>
                       <div>
                          <p>Simulation task, please write the rectification on AML if this situation below appears:</p>
                          <p className="font-bold mt-1">Case for Airframe/Avionic:</p>
                          <p>Ref info DPS MM PK-G.......as GA535 RTO due to WX radar fail. Based on Pilot trip report aircraft RTO at speed 70 Knot.</p>
                          <p className="mt-4 italic">Note: you can make assumption another parameter that you need on this case, Use AMM ref with ATA-XX-XX rev Oct 2022</p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-2 text-[13px]">
                    <div className="flex gap-2 mb-6"><span className="w-4">6.</span><p>Please describe what is wrong with this job card.</p></div>
                    <p className="mb-2 ml-6">a)</p>
                    <div className="flex justify-center px-4">
                       <img src="/jobcard1.png" alt="Job Card 1" className="max-h-[300px] w-auto object-contain" />
                    </div>
                 </div>
              </div>

              {/* ========================================================================================= */}
              {/* ESSAY QUESTION PAGE 2 (HALAMAN 2 ESSAY)                                                   */}
              {/* ========================================================================================= */}
              <div className="pdf-essay-exclude fixed-a4 w-[210mm] h-[297mm] bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[15mm] pt-[15mm] pb-[10mm] print:shadow-none print:w-full print:h-[297mm] print:px-[15mm] print:pt-[15mm] print:pb-[10mm] relative flex flex-col overflow-hidden page-break mt-12 print:mt-0 text-black font-sans">
                 <div className="flex flex-col items-center mb-12 opacity-80">
                    <img src="/logo.png" alt="Logo" className="h-10 mb-1 object-contain" />
                    <div className="font-bold text-[14px] leading-tight text-[#64748b] font-sans">Garuda Indonesia</div>
                    <div className="text-[12px] text-[#64748b] font-sans">Airworthiness Management</div>
                 </div>

                 <div className="mt-4 text-[13px]">
                    <p className="mb-2 ml-6">b)</p>
                    <div className="flex justify-center px-4">
                       <img src="/jobcard2.png" alt="Job Card 2" className="max-h-[350px] w-auto object-contain" />
                    </div>
                 </div>
              </div>

              {/* ========================================================================================= */}
              {/* ESSAY ANSWER SHEET (HALAMAN DINAMIS UNTUK HASIL UJIAN)                                    */}
              {/* ========================================================================================= */}
              <div className="pdf-essay-exclude dynamic-page w-[210mm] min-h-[297mm] h-auto bg-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.5)] px-[10mm] pt-[10mm] pb-[5mm] print:shadow-none print:w-full print:h-auto print:px-[10mm] print:pt-[10mm] print:pb-[5mm] relative flex flex-col page-break mt-12 print:mt-0 text-black font-sans">
                  
                  <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4 shrink-0">
                    <img src="/logo.png" alt="Garuda Indonesia" className="h-10 object-contain" />
                    <div className="text-right">
                      <h1 className="font-black text-xl tracking-widest uppercase text-blue-900">PARTICIPANT ESSAY ANSWERS</h1>
                      <p className="text-[10px] font-bold text-gray-600 uppercase">Participant Report ID: {resExamResult?.id?.split('-')[0]}</p>
                    </div>
                  </div>

                  {/* FORMAT HEADER BIODATA (Name di atas, Pers No di bawah) */}
                  <div className="mb-8 text-[13px] flex flex-col gap-3 w-full">
                     <div className="flex items-end">
                        <div className="w-[160px] font-bold text-gray-800">Name</div>
                        <div className="mr-2 font-bold text-gray-800">:</div>
                        <div className="flex-1 border-b border-[#60a5fa] font-bold text-black uppercase pb-0.5">{resCandidate?.name || ''}</div>
                     </div>
                     <div className="flex items-end">
                        <div className="w-[160px] font-bold text-gray-800">Personnel No. & Unit</div>
                        <div className="mr-2 font-bold text-gray-800">:</div>
                        <div className="flex-1 border-b border-[#60a5fa] font-bold text-black uppercase pb-0.5">{resCandidate?.personnel_no || ''} / {resCandidate?.unit || ''}</div>
                     </div>
                  </div>

                  <div className="flex-1 pr-2">
                    <div className="space-y-6">
                      {/* JAWABAN Q1-4 */}
                      {[
                        { id: "q1", text: "1. Answer Q1:" },
                        { id: "q2", text: "2. Answer Q2:" },
                        { id: "q3", text: "3. Answer Q3:" },
                        { id: "q4", text: "4. Answer Q4:" },
                      ].map((q) => (
                        <div key={q.id} className="break-inside-avoid">
                          <p className="font-bold text-[11px] mb-1 text-gray-700">{q.text}</p>
                          <div className="w-full p-3 border border-gray-300 bg-gray-50 text-black whitespace-pre-wrap font-medium text-[11px] leading-relaxed shadow-inner rounded">
                            {resExamResult?.essay_answers?.[q.id] || <span className="text-gray-400 italic">No Answer Provided</span>}
                          </div>
                        </div>
                      ))}

                      {/* JAWABAN Q5 (AML) - KEMBALI KE FORMAT FULL WIDTH ASLI */}
                      {/* print:mt-12 ditambahkan agar judul tidak mepet atas di Halaman 2 */}
                      <div className="w-full mt-4 print:mt-12">
                        <p className="font-bold text-[11px] mb-2 print:mb-6 text-gray-700">5. Simulation Task (AML Rectification):</p>
                        
                        {/* ZOOM DIHAPUS, kembali normal */}
                        <div className="flex flex-col w-full pb-12">
                          {resExamResult?.essay_answers?.aml?.map((data: any, idx: number) => (
                            <div 
                              key={`aml-ans-${idx}`} 
                              /* KEMBALI MENGGUNAKAN w-full, tapi logika jarak & halamannya tetap kita pakai */
                              className={`w-full border-[3px] border-black bg-white text-black font-sans text-[10px] leading-tight select-none flex flex-col break-inside-avoid shadow-sm
                                ${idx === 0 ? 'mt-0' : ''}
                                ${idx === 1 ? 'mt-8' : ''}
                                ${idx === 2 ? 'mt-8 print:break-before-page print:mt-[120px]' : ''}
                              `}
                            >
                              
                              {/* --- ROW 1 & 2 HEADER --- */}
                              {/* (Biarkan kode ke bawahnya tetap sama) */}
                              <div className="flex w-full border-b-[3px] border-black h-[46px]">
                                <div className="w-[55%] flex border-r-[3px] border-black">
                                  <div className="flex-[4] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">FLIGHT. No</div><StaticCombGrid count={4} value={data.flightNo} /></div>
                                  <div className="flex-[3] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">DEP. STA</div><StaticCombGrid count={3} value={data.depSta} /></div>
                                  <div className="flex-[3] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">A/C. REG</div><StaticCombGrid count={3} value={data.acReg} /></div>
                                  <div className="flex-[6] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">D D M M Y Y</div><StaticCombGrid count={6} value={data.date} /></div>
                                  <div className="flex-[4] flex flex-col relative bg-gray-50">
                                    <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5 uppercase">SEQ. No</div>
                                    <div className="flex-1 flex relative bg-white">
                                      <div className="absolute bottom-0 left-0 w-full h-[45%] flex pointer-events-none"><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1 border-r-[1.5px] border-black"></div><div className="flex-1"></div></div>
                                      <div className="absolute inset-0 flex pointer-events-none z-10"><div className="flex-1 flex items-center justify-center font-extrabold text-[14px] bg-gray-100 border-r-[1.5px] border-black">0</div><div className="flex-1 flex items-center justify-center font-extrabold text-[14px] bg-gray-100 border-r-[1.5px] border-black">{idx}</div><div className="flex-1 flex items-center justify-center font-extrabold text-black font-mono text-[14px] border-r-[1.5px] border-black">{data.seqExt?.[0]||''}</div><div className="flex-1 flex items-center justify-center font-extrabold text-black font-mono text-[14px]">{data.seqExt?.[1]||''}</div></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-[45%] flex">
                                  <div className="flex-[16] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">PART NUMBER</div><StaticCombGrid count={16} value={data.partNo} /></div>
                                  <div className="flex-[4] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">M.E.L.R.I</div><StaticSectionInputGrid count={4} value={data.melri} placeholders={['A','B','C','D']} /></div>
                                  <div className="flex-[2] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">EXTS</div><StaticSectionInputGrid count={2} value={data.exts} placeholders={['B','C']} /></div>
                                  <div className="flex-[4] flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">FIC</div><StaticCombGrid count={4} value={data.fic} /></div>
                                </div>
                              </div>

                              {/* --- ROW 2: SUBJECT & SERIAL --- */}
                              <div className="flex w-full border-b-[3px] border-black h-[44px]">
                                <div className="w-[55%] border-r-[3px] border-black relative flex items-center px-3 bg-white">
                                  <div className="text-[11px] font-extrabold mr-2">Subject:</div>
                                  <div className="flex-1 h-full flex items-center bg-transparent font-extrabold text-black text-[13px] uppercase pb-0.5 truncate">{data.subject}</div>
                                </div>
                                <div className="w-[45%] flex">
                                  <div className="flex-[2] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">POS</div><StaticCombGrid count={2} value={data.pos} /></div>
                                  <div className="flex-[11] border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">SERIAL No. IN</div><StaticCombGrid count={11} value={data.serialIn} /></div>
                                  <div className="flex-[11] flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-0.5">SERIAL No. OUT</div><StaticCombGrid count={11} value={data.serialOut} /></div>
                                </div>
                              </div>

                              {/* --- ROW 3: COMPLAINT & ACTION --- */}
                              <div className="flex h-[210px] border-b-[3px] border-black bg-white">
                                <div className="w-[55%] border-r-[3px] border-black flex">
                                  <div className="w-8 border-r-[2px] border-black flex items-center justify-center bg-gray-50">
                                    <span className="-rotate-90 whitespace-nowrap text-[13px] font-extrabold tracking-widest text-black uppercase">Complaint</span>
                                  </div>
                                  <div className="flex-1 relative bg-[repeating-linear-gradient(transparent,transparent_34px,#d1d5db_34px,#d1d5db_35px)] bg-[size:100%_35px]">
                                    <div className="absolute inset-0 w-full h-full bg-transparent font-extrabold text-black uppercase text-[12px] leading-[35px] pt-[7px] pl-[8px] pr-[4px] whitespace-pre-wrap">{data.complaint}</div>
                                  </div>
                                </div>
                                <div className="w-[45%] flex">
                                  <div className="flex-1 flex border-r-[3px] border-black">
                                    <div className="w-8 border-r-[2px] border-black flex items-center justify-center bg-gray-50">
                                      <span className="-rotate-90 whitespace-nowrap text-[13px] font-extrabold tracking-widest text-black uppercase">Action</span>
                                    </div>
                                    <div className="flex-1 relative bg-[repeating-linear-gradient(transparent,transparent_34px,#d1d5db_34px,#d1d5db_35px)] bg-[size:100%_35px]">
                                      <div className="absolute inset-0 w-full h-full bg-transparent font-extrabold text-black uppercase text-[12px] leading-[35px] pt-[7px] pl-[8px] pr-[4px] whitespace-pre-wrap">{data.action}</div>
                                    </div>
                                  </div>
                                  <div className="w-10 flex items-center justify-center bg-gray-50">
                                    <span className="-rotate-90 whitespace-nowrap font-black text-lg tracking-widest text-black">SNAG</span>
                                  </div>
                                </div>
                              </div>

                              {/* --- ROW 4: BOTTOM MATRIX --- */}
                              <div className="flex h-[200px]">
                                
                                {/* MATRIX KIRI BAWAH */}
                                <div className="w-[65%] grid border-r-[3px] border-black" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}>
                                  <div style={{ gridColumn: 'span 10' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col relative bg-[#F4F7F5]">
                                    <span className="text-[11px] text-center py-[4px] font-extrabold border-b-[2px] border-black">Sign</span>
                                    <div className="flex-1 relative">
                                        <StaticDrawPad value={data.sign} />
                                    </div>
                                  </div>
                                  <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">FLIGHT TIME</div><StaticCombGrid count={4} value={data.flightTime} /></div>
                                  <div style={{ gridColumn: 'span 11' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">HYD. REFILL</div><StaticSectionInputGrid count={4} value={data.hyd} placeholders={['S1','S2','S3','S4']} /></div>
                                  <div style={{ gridColumn: 'span 7' }} className="border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">OIL REFILL</div><StaticSectionInputGrid count={5} value={data.oil} placeholders={['E1','E2','E3','E4','APU']} /></div>

                                  <div style={{ gridColumn: 'span 10' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col">
                                    {idx === 0 ? (
                                      <>
                                        <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px] bg-gray-100">AUTO LAND STATUS</div>
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
                                          
                                          <StaticDrawPad value={data.autoYes} />
                                        </div>
                                      </>
                                    ) : (
                                      <><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">COMPLAINT (IMM CODE)</div><StaticCombGrid count={10} value={data.complaintImm} /></>
                                    )}
                                  </div>
                                  <div style={{ gridColumn: 'span 4' }} className="border-r-[2px] border-b-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">ETOPS</div><StaticSectionInputGrid count={4} value={data.etops} placeholders={['NE','90','120','180']} /></div>
                                  <div style={{ gridColumn: 'span 18' }} className="border-b-[2px] border-black flex flex-col"><StaticCombGrid count={18} /></div>

                                  <div style={{ gridColumn: 'span 14' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">WORK ORDER NUMBER</div><StaticCombGrid count={14} value={data.workOrder} /></div>
                                  <div style={{ gridColumn: 'span 11' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">MS. NUMBER</div><StaticCombGrid count={11} value={data.msNumber} /></div>
                                  <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">INSP</div><StaticCombGrid count={3} value={data.insp} /></div>
                                  <div style={{ gridColumn: 'span 4' }} className="flex flex-col"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">MHRS</div><StaticCombGrid count={4} value={data.mhrs} /></div>
                                </div>

                                {/* MATRIX KANAN BAWAH */}
                                <div className="w-[35%] flex flex-col min-w-0">
                                  {[
                                    { label: "Action STA", st: data.actionSta, stCount: 3, dd: data.actionDd, mm: data.actionMm, t: data.actionTime, s: data.actionSign, a: data.actionAuth },
                                    { label: "Release STA", st: data.releaseSta, stCount: 3, dd: data.releaseDd, mm: data.releaseMm, t: data.releaseTime, s: data.releaseSign, a: data.releaseAuth },
                                    { label: "R.I.I.", st: data.rii, stCount: 1, dd: data.riiDd, mm: data.riiMm, t: data.riiTime, s: data.riiSign, a: data.riiAuth, isLast: true }
                                  ].map((row: any, i: number) => (
                                    <div key={i} className={`grid h-full ${!row.isLast ? 'border-b-[2px] border-black' : ''}`} style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                                      <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col min-w-0"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">{row.label}</div><StaticCombGrid count={row.stCount} value={row.st} rightBorder={false} flexVal={1}/></div>
                                      <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col min-w-0"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">D D</div><StaticCombGrid count={2} value={row.dd} rightBorder={false} flexVal={1}/></div>
                                      <div style={{ gridColumn: 'span 2' }} className="border-r-[2px] border-black flex flex-col min-w-0"><div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">M M</div><StaticCombGrid count={2} value={row.mm} rightBorder={false} flexVal={1}/></div>
                                      <div style={{ gridColumn: 'span 3' }} className="border-r-[2px] border-black flex flex-col min-w-0">
                                        <div className="text-[11px] text-center font-extrabold border-b-[2px] border-black py-[4px]">Time</div>
                                        <div className="flex-1 w-full flex items-center justify-center font-mono text-[10px] tracking-tighter font-extrabold text-black overflow-hidden">{row.t}</div>
                                      </div>
                                      <div style={{ gridColumn: 'span 3' }} className="flex flex-col min-w-0">
                                        <div className="flex-1 flex border-b-[2px] border-black relative">
                                          <span className="w-10 border-r-[2px] border-black text-[11px] font-extrabold flex items-center justify-center bg-gray-50">Sign</span>
                                          {/* DITAMBAHKAN overflow-hidden AGAR ZOOM TIDAK KELUAR KOTAK */}
                                          <div className="flex-1 relative bg-[#F4F7F5] overflow-hidden">
                                              {/* FILTER KHUSUS: Menggunakan filter kiri yang sukses + Scale(1.7) untuk nge-zoom tanda tangannya */}
                                              {row.s && <img src={row.s} className="absolute inset-0 w-full h-full object-contain mix-blend-multiply" style={{ filter: 'grayscale(100%) contrast(1000%)', transform: 'scale(1.7)' }} />}
                                          </div>
                                        </div>
                                        <div className="flex-1 flex bg-gray-50/50">
                                          <span className="w-10 border-r-[2px] border-black text-[11px] font-extrabold flex items-center justify-center bg-gray-50">Auth.</span>
                                          <div className="flex-1 w-full flex items-center justify-center bg-transparent text-center px-0.5 font-mono uppercase text-[7px] tracking-tighter text-black font-extrabold overflow-hidden">{row.a}</div>
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

                      {/* JAWABAN Q6 */}
                      <div className="break-inside-avoid">
                        <p className="font-bold text-[11px] mb-1 text-gray-700">6. Answer Q6 (Job Card Description):</p>
                        <div className="w-full p-3 border border-gray-300 bg-gray-50 text-black whitespace-pre-wrap font-medium text-[11px] leading-relaxed shadow-inner rounded">
                          {resExamResult?.essay_answers?.q6 || <span className="text-gray-400 italic">No Answer Provided</span>}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans pb-20">
      {autoSendTarget && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#00102a]/95 backdrop-blur-md text-white">
             <div className="w-20 h-20 border-8 border-t-[#009CB4] border-[#374151] rounded-full animate-spin mb-8"></div>
             <h2 className="text-2xl font-black tracking-widest uppercase mb-3">Auto-Generating Document</h2>
             <p className="text-[#009CB4] font-bold">Scanning PDF and routing silently to: <span className="text-white">{autoSendTarget}</span></p>
             <p className="text-xs text-[#9ca3af] mt-5">(Please do not close this window)</p>
          </div>
      )}
      {isBulkProcessing && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111827]/95 backdrop-blur-md text-white">
           <div className="w-24 h-24 border-8 border-t-[#f59e0b] border-[#374151] rounded-full animate-spin mb-8 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
           <h2 className="text-3xl font-black tracking-widest uppercase mb-3 text-[#f59e0b] animate-pulse">Bulk Processing...</h2>
           <p className="text-lg font-bold bg-[#1f2937] px-6 py-2 rounded-full border border-[#374151]">
              Rendering <span className="text-[#f59e0b]">{bulkCollected.length + 1}</span> of <span className="text-[#10b981]">{selectedForBulk.length}</span> documents
           </p>
           <p className="text-xs text-[#9ca3af] mt-8">(Please wait. Do not close this window or change tabs)</p>
        </div>
      )}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102a]/90 p-4 backdrop-blur-md transition-opacity" onClick={() => setSelectedPhoto(null)}>
          <div className="relative bg-white p-3 rounded-2xl shadow-2xl max-w-sm w-full transform transition-all scale-105" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg border-2 border-white transition-transform hover:scale-110">✕</button>
            <img src={selectedPhoto} alt="Snapshot" className="w-full h-auto object-cover rounded-xl" />
          </div>
        </div>
      )}
      {selectedLiveCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102a]/90 p-4 backdrop-blur-md transition-opacity" onClick={() => setSelectedLiveCam(null)}>
          <div className="relative bg-white p-3 rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all scale-105" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedLiveCam(null)} className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg border-2 border-white transition-transform hover:scale-110">✕</button>
            <img src={liveFrames[selectedLiveCam]} alt="Live Snapshot" className="w-full h-auto object-cover rounded-xl aspect-video bg-black" />
            <div className="absolute bottom-6 left-6 bg-red-600 text-white px-4 py-2 text-xs font-black rounded-full shadow-lg tracking-widest flex items-center gap-2 border-2 border-white/20">
               <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span> LIVE CCTV
            </div>
          </div>
        </div>
      )}
      <div className="bg-[#002561] text-white pt-10 pb-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#009CB4] opacity-20 skew-x-[-20deg] translate-x-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#009CB4] to-transparent opacity-50"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-[#ffffff] p-3 rounded-2xl shadow-lg"><img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" /></div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-md">Proctor Center</h1>
              <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-1">GARUDA INDONESIA / GMF E-ASSESSMENT</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/add-question" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2"><span>➕</span> ADD QUESTION</Link>
            <Link href="/admin/fix" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2"><span>🛠️</span> DB FIX</Link>
            <button onClick={fetchData} className="px-5 py-2.5 bg-[#009CB4] hover:bg-[#007b8e] text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,156,180,0.4)] transition-all flex items-center gap-2"><span>🔄</span> REFRESH</button>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-[#ef4444]/80 hover:bg-[#ef4444] text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all border border-[#ef4444]"><span>🚪</span> LOGOUT</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-12 space-y-10 relative z-20">
        <div className="bg-[#ffffff] rounded-3xl shadow-2xl border border-[#e5e7eb] overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-50 to-transparent opacity-50 pointer-events-none"></div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div><h2 className="text-2xl font-black text-[#002561] tracking-wider uppercase flex items-center gap-3 mb-2"><span className="p-3 bg-blue-50 text-[#2563eb] rounded-xl text-xl shadow-sm">🌐</span> Exam Gate</h2><p className="text-[#6b7280] font-medium text-sm">Control universal access for all candidates</p></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4 bg-[#f3f4f6] p-2 rounded-2xl border border-[#e5e7eb]">
                 <button onClick={() => toggleMasterGate(false)} className={`px-8 py-4 rounded-xl font-black tracking-widest uppercase transition-all duration-300 ${!isMasterGateOpen ? 'bg-[#ef4444] text-white shadow-[0_10px_20px_rgba(239,68,68,0.3)] scale-105' : 'text-[#9ca3af] hover:bg-gray-200'}`}>🔒 CLOSED</button>
                 <button onClick={() => toggleMasterGate(true)} className={`px-8 py-4 rounded-xl font-black tracking-widest uppercase transition-all duration-300 ${isMasterGateOpen ? 'bg-[#10b981] text-white shadow-[0_10px_20px_rgba(16,185,129,0.3)] scale-105' : 'text-[#9ca3af] hover:bg-gray-200'}`}>🔓 OPEN ALL</button>
              </div>
              <p className={`mt-4 text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isMasterGateOpen ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{isMasterGateOpen ? <><span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span> GATES ARE CURRENTLY OPEN</> : <><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> GATES ARE CURRENTLY CLOSED</>}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#ffffff] rounded-3xl shadow-2xl border border-[#e5e7eb] overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-[#e5e7eb] bg-[#ffffff] flex flex-col gap-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-[#002561] tracking-wider uppercase flex items-center gap-3"><span className="p-2 bg-blue-50 text-[#2563eb] rounded-lg text-lg">🧑‍✈️</span> Live Participants & Exam Results</h2><div className="flex items-center"><span className="bg-[#f3f4f6] text-[#4b5563] px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-sm border border-[#d1d5db]">{groupedSessions.length} CANDIDATES FOUND</span>{selectedForBulk.length > 0 && (<button onClick={startBulkSend} className="ml-4 px-5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-full text-[10px] font-black tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 transition-all animate-bounce border border-[#fcd34d] flex items-center gap-2"><span className="text-sm">📨</span> BULK SEND ({selectedForBulk.length})</button>)}</div></div>
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e7eb]"><div className="relative w-full xl:w-auto flex-1 max-w-md"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span><input type="text" placeholder="Search Name or Pers No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#d1d5db] focus:outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] placeholder-gray-400 shadow-inner" /></div><div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto"><div className="flex items-center gap-3 w-full md:w-auto bg-white border border-[#d1d5db] px-4 py-2 rounded-xl shadow-sm"><span className="text-lg">📅</span><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="focus:outline-none text-sm font-bold text-[#002561] uppercase cursor-pointer" />{dateFilter && (<button onClick={() => setDateFilter('')} className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-1 rounded-md hover:bg-red-200 transition-all uppercase tracking-wider">Clear</button>)}</div><div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">{['ALL', 'LIVE', 'PASSED', 'FAILED'].map(status => (<button key={status} onClick={() => setStatusFilter(status)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap border-2 ${statusFilter === status ? status === 'LIVE' ? 'bg-[#f59e0b] text-white border-[#f59e0b] shadow-[0_4px_10px_rgba(245,158,11,0.3)]' : status === 'PASSED' ? 'bg-[#10b981] text-white border-[#10b981] shadow-[0_4px_10px_rgba(16,185,129,0.3)]' : status === 'FAILED' ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-[0_4px_10px_rgba(239,68,68,0.3)]' : 'bg-[#002561] text-white border-[#002561] shadow-[0_4px_10px_rgba(0,37,97,0.3)]' : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:bg-gray-100'}`}>{status}</button>))}</div></div></div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-[#f9fafb]/50 text-[#002561] border-b border-[#e5e7eb] text-xs uppercase tracking-wider font-bold"><tr><th className="p-5 pl-8 w-32">Photo / CCTV</th><th className="p-5 w-64 border-r border-[#e5e7eb]">Candidate Info</th><th className="p-5 pl-8">Exam Modules & Results</th></tr></thead><tbody className="divide-y divide-[#e5e7eb]">{groupedSessions.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-[#9ca3af] font-medium tracking-wide">No participants match your search criteria.</td></tr>) : groupedSessions.map((group: any, index: number) => {
                  const cand = group.candidate; const candName = cand?.name || 'Unknown'; const candNo = cand?.personnel_no || 'N/A'; const candEmail = cand?.email || 'No Email'; const candUnit = cand?.unit || 'No Unit'; const activeSession = group.exams.find((s: any) => s.status !== 'COMPLETED');
                  return (<tr key={index} className="hover:bg-blue-50/10 transition-colors"><td className="p-5 pl-8 align-top"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] border-2 border-[#d1d5db] flex items-center justify-center text-[#9ca3af] shadow-inner"><span className="text-2xl">👤</span></div></td><td className="p-5 align-top border-r border-[#e5e7eb]"><div className="flex flex-col"><span className="font-black uppercase text-[#002561] text-sm mb-1">{candName}</span><span className="text-[#009CB4] text-[10px] font-black tracking-widest px-2 py-0.5 bg-[#009CB4]/10 rounded border border-[#009CB4]/20 w-fit mb-1.5">ID: {candNo}</span><span className="text-[11px] text-[#6b7280] font-medium">{candEmail}</span><span className="text-[11px] font-black text-[#4b5563] tracking-widest uppercase mt-0.5">{candUnit}</span></div></td><td className="p-0 align-top"><div className="flex flex-col divide-y divide-[#f3f4f6]">{group.exams.map((session: any) => { const isPassed = session.final_passed !== null ? session.final_passed : (session.score >= 75); const warnings = session.cheat_warnings || 0; return (<div key={session.id} className="flex flex-wrap xl:flex-nowrap items-center justify-between p-5 pl-8 hover:bg-white transition-colors gap-4"><div className="w-full xl:w-1/3 flex flex-col gap-1"><span className="font-bold text-[#1f2937] text-sm">{session.type_of_ac || '-'}</span><span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider">{session.kategori || '-'} • {session.subject} #{session.exam_no}</span></div><div className="w-full xl:w-1/3 flex flex-col items-start gap-1.5">{session.status === 'COMPLETED' ? (<><div className="flex items-center gap-2"><span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-[10px] font-black uppercase tracking-widest">Finished</span><span className="font-black text-[#002561] text-xs">Score: {session.score}</span></div><span className="text-[10px] font-bold text-[#9ca3af]">Time: 00:00</span></>) : (<><div className="flex items-center gap-2"><span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 text-[10px] font-black uppercase tracking-widest animate-pulse"><span className="w-2 h-2 inline-block rounded-full bg-[#f59e0b]"></span> Progress</span><span className="font-bold text-[#6b7280] text-xs">Score: {session.score}</span></div><span className="text-[10px] font-bold text-[#2563eb] flex items-center gap-1"><span className="text-sm">⏳</span> {getRemainingTime(session.started_at)} remaining</span></>)}{warnings > 0 && (<span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-sm animate-pulse">⚠️ Violations: {warnings}/5</span>)}</div><div className="w-full xl:w-1/3 flex items-center justify-end gap-3">{session.status === 'COMPLETED' ? (<div className="flex items-center gap-1 mr-2"><div className={`px-3 py-1 text-[11px] font-black tracking-widest uppercase rounded border shadow-sm ${isPassed ? 'bg-[#10b981] text-white border-[#059669]' : 'bg-[#ef4444] text-white border-[#dc2626]'}`}>{isPassed ? 'PASSED' : 'FAILED'}</div>{isPassed ? (<button onClick={() => handleAdjustResult(session.id, false)} className="p-1 text-[#d1d5db] hover:text-[#dc2626]">❌</button>) : (<button onClick={() => handleAdjustResult(session.id, true)} className="p-1 text-[#d1d5db] hover:text-[#059669]">✓</button>)}</div>) : (<span className="text-[#d1d5db] font-bold mr-4">-</span>)}<div className="flex items-center gap-1.5">{session.status === 'COMPLETED' && (<><label className={`flex items-center gap-2 cursor-pointer mr-3 px-2 py-1.5 rounded-lg border transition-colors ${selectedForBulk.includes(session.id) ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><input type="checkbox" checked={selectedForBulk.includes(session.id)} onChange={(e) => { if(e.target.checked) setSelectedForBulk(prev => [...prev, session.id]); else setSelectedForBulk(prev => prev.filter(id => id !== session.id)); }} className="w-4 h-4 cursor-pointer accent-[#2563eb]" /></label><button onClick={() => handleViewResult(session.id)} className="p-2 bg-[#002561] text-white rounded-lg shadow-md hover:scale-105">🖨️</button><button onClick={() => handleSendEmail(session)} className={`p-2 rounded-lg border ${session.email_sent ? 'bg-[#f3f4f6] text-[#9ca3af]' : 'bg-[#ffffff] text-[#009CB4] border-[#009CB4]'}`}>📧</button><button onClick={() => triggerAutoSendToGMF(session.id)} className="p-2 bg-[#2563eb] text-white rounded-lg shadow-md hover:scale-105">📄</button></>)}<button onClick={() => resetParticipant(session.id, candName)} className="p-2 text-[#d1d5db] hover:text-[#ef4444] hover:bg-red-50 rounded-lg ml-1">🗑️</button></div></div></div>)})}</div></td></tr>)})}</tbody></table>
          </div>
        </div>
      </div>
    </div>
  )
}