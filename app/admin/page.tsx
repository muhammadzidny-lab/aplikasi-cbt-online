'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function AdminDashboard() {
  // ==========================================
  // FITUR BARU: SECURITY LOGIN STATE
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // 🔑 UBAH PIN RAHASIA ADMIN DI SINI
  const SECRET_PIN = 'GARUDA2026'

  // ==========================================
  // STATE DASHBOARD ADMIN
  // ==========================================
  const [tokens, setTokens] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const [viewingResultId, setViewingResultId] = useState<string | null>(null)
  const [resLoading, setResLoading] = useState(false)
  const [resCandidate, setResCandidate] = useState<any>(null)
  const [resExamResult, setResExamResult] = useState<any>(null)
  const [resAnswerMap, setResAnswerMap] = useState<Record<number, string>>({})
  
  const [resPrintStats, setResPrintStats] = useState({
    aircraftWrong: 0, regWrong: 0, totalWrong: 0, score: 0, isPass: false
  })

  // STATE TANDA TANGAN ADMIN
  const [showSignPanel, setShowSignPanel] = useState(false)
  const [adminSignData, setAdminSignData] = useState({
    assessorName: '', assessorSign: '', inspectorName: '', inspectorSign: '', examiner1Sign: '', examiner2Sign: ''
  })

  // Cek apakah Admin sudah login sebelumnya
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth')
    if (authStatus === 'verified') {
      setIsAuthenticated(true)
    }
    setIsCheckingAuth(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === SECRET_PIN) {
      setIsAuthenticated(true)
      setLoginError(false)
      sessionStorage.setItem('admin_auth', 'verified') 
    } else {
      setLoginError(true)
      setPinInput('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('admin_auth')
    setPinInput('')
  }

  const fetchData = async () => {
    setLoading(true)
    
    // PERBAIKAN: Menghapus .order('created_at') agar tidak error jika kolom tidak ada
    const { data: tokenData, error: tokenError } = await supabase
      .from('exam_tokens')
      .select('*')
      
    if (tokenData) {
      // Urutkan manual di aplikasi (berdasarkan ID terbesar/terbaru)
      const sortedTokens = tokenData.sort((a, b) => b.id - a.id)
      setTokens(sortedTokens)
    } else if (tokenError) {
      console.error("Gagal menarik data token:", tokenError)
    }

    const { data: sessionData } = await supabase
      .from('exam_results')
      .select(`id, type_of_ac, kategori, subject, exam_no, status, started_at, score, final_passed, email_sent, candidates (name, email, personnel_no, photo, signature, unit, rating_sought, exam_date, dgac_amel_no, dgac_rating, ga_auth_no, ga_rating)`)
      .order('started_at', { ascending: false })

    if (sessionData) setSessions(sessionData)
    setLoading(false)
  }

  // Tarik data HANYA JIKA admin sudah terautentikasi
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData()
    const interval = setInterval(() => fetchData(), 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const toggleTokenActive = async (tokenId: string, currentStatus: boolean) => {
    await supabase.from('exam_tokens').update({ is_active: !currentStatus }).eq('id', tokenId)
    fetchData()
  }

  const handleDeleteToken = async (tokenId: string, accessCode: string) => {
    if (!window.confirm(`Yakin ingin menghapus Access Code: ${accessCode}?`)) return
    const { error } = await supabase.from('exam_tokens').delete().eq('id', tokenId)
    if (error) alert('Gagal menghapus token: ' + error.message)
    else fetchData() 
  }

  const resetParticipant = async (resultId: string, participantName: string) => {
    if (!window.confirm(`YAKIN INGIN MERESET UJIAN UNTUK: ${participantName}?`)) return
    await supabase.from('exam_results').delete().eq('id', resultId)
    alert(`Berhasil!`); fetchData() 
  }

  const handleAdjustResult = async (resultId: string, isPassed: boolean) => {
    if (!window.confirm(`Yakin ingin mengubah status menjadi ${isPassed ? 'PASSED' : 'FAILED'}?`)) return
    await supabase.from('exam_results').update({ final_passed: isPassed }).eq('id', resultId)
    fetchData()
  }

  const handleSendEmail = async (session: any) => {
    const isPassed = session.final_passed !== null ? session.final_passed : (session.score >= 75)
    const statusText = isPassed ? "PASSED" : "FAILED"
    const subject = encodeURIComponent(`Garuda/GMF Exam Result - ${session.candidates.name}`)
    const body = encodeURIComponent(`Dear ${session.candidates.name},

Thank you for completing the Recurrent/Initial Assessment.

Exam Detail:
- Personnel No: ${session.candidates.personnel_no}
- Aircraft Type: ${session.type_of_ac}
- Category: ${session.kategori}
- Subject: ${session.subject}

Based on the assessor evaluation, your final result is:
*** ${statusText} ***

Regards,
Airworthiness Management
Garuda Indonesia / GMF AeroAsia`)

    window.location.href = `mailto:${session.candidates.email}?subject=${subject}&body=${body}`
    await supabase.from('exam_results').update({ email_sent: true }).eq('id', session.id)
    setTimeout(() => fetchData(), 2000) 
  }

  const generateNewToken = async () => {
    let acInput = window.prompt("Pilih Type of A/C:\n1. Airbus A330-Series\n2. Airbus A330 NEO\n3. B737-800 NG\n4. B737-MAX\n5. B777-300 ER\n\nKetik angka 1-5:", "1")
    if (!acInput) return
    let tokenTypeOfAC = ""
    if (acInput === "1") tokenTypeOfAC = "Airbus A330-Series"
    else if (acInput === "2") tokenTypeOfAC = "Airbus A330 NEO"
    else if (acInput === "3") tokenTypeOfAC = "B737-800 NG"
    else if (acInput === "4") tokenTypeOfAC = "B737-MAX"
    else if (acInput === "5") tokenTypeOfAC = "B777-300 ER"
    else { alert('GAGAL: Pilihan Type A/C tidak valid!'); return }

    let katInput = window.prompt("Pilih Kategori:\n1. Airframe & Powerplant\n2. Electric & Avionic\n\nKetik angka 1 atau 2:", "1")
    if (!katInput) return
    let tokenKategori = katInput === "1" ? "Airframe & Powerplant" : katInput === "2" ? "Electric & Avionic" : ""
    if (!tokenKategori) { alert('GAGAL: Pilihan Kategori tidak valid!'); return }

    let subjInput = window.prompt("Pilih Subject:\n1. RENEWAL\n2. INITIAL\n\nKetik angka 1 atau 2:", "1")
    if (!subjInput) return
    let tokenSubject = subjInput === "1" ? "RENEWAL" : subjInput === "2" ? "INITIAL" : ""
    if (!tokenSubject) { alert('GAGAL: Pilihan Subject tidak valid!'); return }
    
    let tokenExamNo = window.prompt("Ketik Nomor Exam (1, 2, atau 3):", "1")
    if (!tokenExamNo) return 
    tokenExamNo = tokenExamNo.trim()
    if (tokenExamNo !== '1' && tokenExamNo !== '2' && tokenExamNo !== '3') { alert('GAGAL: Nomor Exam hanya boleh 1, 2, atau 3!'); return }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let newCode = ''
    for (let i = 0; i < 6; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length))

    const { error } = await supabase.from('exam_tokens').insert([{ 
      type_of_ac: tokenTypeOfAC, 
      kategori: tokenKategori, 
      subject: tokenSubject, 
      exam_no: parseInt(tokenExamNo), 
      access_code: newCode, 
      is_active: true
    }])

    if (error) {
      alert('❌ GAGAL MEMBUAT KODE!\n\nAlasan: ' + error.message)
    } else {
      alert(`✅ BERHASIL!\nKode Akses Baru: ${newCode}`)
      fetchData()
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
    let actualAircraftWrong = 0;
    let actualRegWrong = 0;
    let actualCorrect = 0;
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
          if (selectedOpt && selectedOpt.is_correct) {
             isAnswerCorrect = true;
             actualCorrect++;
          }
        }

        if (!isAnswerCorrect) {
           if (isReg) actualRegWrong++;
           else actualAircraftWrong++;
        }
      })
    }

    setResAnswerMap(mapping)

    const actualScore = totalQuestions > 0 ? Math.round((actualCorrect / totalQuestions) * 100) : 0;
    const isPassDefault = actualScore >= 75;
    const isPassFinal = resDetail.final_passed !== null ? resDetail.final_passed : isPassDefault;

    let displayScore = actualScore;
    let displayAircraftWrong = actualAircraftWrong;
    let displayRegWrong = actualRegWrong;
    let displayTotalWrong = actualAircraftWrong + actualRegWrong;

    if (isPassFinal && !isPassDefault) {
       displayScore = 76; 
       displayTotalWrong = totalQuestions === 100 ? 24 : 12; 
       displayRegWrong = Math.min(actualRegWrong, Math.floor(displayTotalWrong / 4));
       displayAircraftWrong = displayTotalWrong - displayRegWrong;
    }

    setResPrintStats({
      aircraftWrong: displayAircraftWrong,
      regWrong: displayRegWrong,
      totalWrong: displayTotalWrong,
      score: displayScore,
      isPass: isPassFinal
    })

    setResLoading(false)
  }


  // ==========================================
  // RENDER 1: HALAMAN LOGIN SECURITY
  // ==========================================
  if (isCheckingAuth) return null 

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#00102a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-[url('/GA3.jpg')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-linear-to-b from-[#002561]/80 to-[#00102a]/90"></div>

        <div className="relative z-10 max-w-sm w-full bg-white/10 backdrop-blur-2xl shadow-2xl rounded-3xl p-8 border border-white/20 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white/20">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">Proctor Gateway</h1>
          <p className="text-[#009CB4] text-[10px] font-bold tracking-[0.3em] mb-8">AUTHORIZED PERSONNEL ONLY</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                placeholder="ENTER SECURE PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={`w-full bg-black/40 border-2 rounded-xl p-4 text-center text-white text-xl tracking-[0.4em] font-mono focus:outline-none transition-all placeholder-white/30
                  ${loginError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/20 focus:border-[#009CB4]'}`}
                autoFocus
              />
              {loginError && <p className="text-red-400 text-xs font-bold tracking-widest mt-3 animate-pulse uppercase">❌ Invalid PIN. Access Denied.</p>}
            </div>
            <button type="submit" className="w-full py-4 bg-[#009CB4] hover:bg-[#007b8e] text-white font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(0,156,180,0.4)] hover:scale-[1.02]">
              Verify Identity
            </button>
          </form>
        </div>
      </div>
    )
  }


  // ==========================================
  // RENDER 2: PDF VIEWER / PRINT MODE
  // ==========================================
  if (viewingResultId) {
    if (resLoading) return (
      <div className="min-h-screen bg-[#00102a] flex items-center justify-center text-center">
        <div><div className="w-16 h-16 border-4 border-[#009CB4] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div><div className="text-white font-black tracking-widest uppercase animate-pulse">Generating Report...</div></div>
      </div>
    )

    return (
      <>
        <style jsx global>{`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
            header, footer { display: none !important; }
            .page-break { break-before: page; }
            .print-hidden { display: none !important; }
          }
        `}</style>

        {/* PANEL KONTROL TANDA TANGAN ADMIN (SIDEBAR MODERN) */}
        {showSignPanel && (
          <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 print-hidden flex flex-col border-r border-gray-200">
            <div className="bg-[#002561] text-white p-5 flex justify-between items-center shadow-md">
              <div>
                <h2 className="font-black tracking-widest uppercase text-sm">Signatures</h2>
                <p className="text-[#009CB4] text-[10px]">Admin Authentication</p>
              </div>
              <button onClick={() => setShowSignPanel(false)} className="text-white hover:text-red-400 font-bold transition">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 bg-gray-50 flex-1">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Assessor Name</label>
                <input type="text" className="w-full text-sm p-2 border-2 border-gray-200 rounded-lg outline-none focus:border-[#009CB4] uppercase mb-3 transition" value={adminSignData.assessorName} onChange={(e) => setAdminSignData(prev => ({...prev, assessorName: e.target.value}))} />
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Assessor Sign</label>
                <AdminSignaturePad value={adminSignData.assessorSign} onChange={(val) => setAdminSignData(prev => ({...prev, assessorSign: val}))} />
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Inspector Name</label>
                <input type="text" className="w-full text-sm p-2 border-2 border-gray-200 rounded-lg outline-none focus:border-[#009CB4] uppercase mb-3 transition" value={adminSignData.inspectorName} onChange={(e) => setAdminSignData(prev => ({...prev, inspectorName: e.target.value}))} />
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Inspector Sign</label>
                <AdminSignaturePad value={adminSignData.inspectorSign} onChange={(val) => setAdminSignData(prev => ({...prev, inspectorSign: val}))} />
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Examiner 1 Sign</label>
                <AdminSignaturePad value={adminSignData.examiner1Sign} onChange={(val) => setAdminSignData(prev => ({...prev, examiner1Sign: val}))} />
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-[11px] font-bold text-[#002561] mb-1 uppercase tracking-wider">Examiner 2 Sign</label>
                <AdminSignaturePad value={adminSignData.examiner2Sign} onChange={(val) => setAdminSignData(prev => ({...prev, examiner2Sign: val}))} />
              </div>
            </div>
          </div>
        )}

        <div className={`min-h-screen bg-[#111827] py-12 flex flex-col items-center gap-12 print:bg-white print:py-0 print:gap-0 print:block transition-all duration-300 ${showSignPanel ? 'ml-80' : ''}`}>
          
          {/* CONTROL BUTTONS MENGAMBANG DI PDF VIEWER */}
          <div className="fixed bottom-8 right-8 flex flex-col gap-3 print-hidden z-40">
            <button onClick={() => setShowSignPanel(true)} className="bg-[#009CB4] text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(0,156,180,0.3)] font-black uppercase tracking-widest hover:bg-[#007b8e] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">✍️</span> Fill Signatures
            </button>
            <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(5,150,105,0.3)] font-black uppercase tracking-widest hover:bg-emerald-700 hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">🖨️</span> Print Document
            </button>
            <button onClick={() => setViewingResultId(null)} className="bg-gray-700 text-white px-6 py-4 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] font-black uppercase tracking-widest hover:bg-gray-800 hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="text-xl">🔙</span> Back to Dashboard
            </button>
          </div>

          {/* ================= PAGE 1: FORMULIR PENILAIAN ================= */}
          <div className="w-[210mm] h-[296mm] bg-white shadow-[0_0_40px_rgba(0,0,0,0.5)] p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden">
            <div className="flex flex-col items-center justify-center mb-6">
               <img src="/logo.png" alt="Garuda Indonesia" className="h-14 mb-2 object-contain" />
               <div className="font-serif font-bold text-lg leading-tight">Garuda Indonesia</div>
               <div className="text-xs uppercase tracking-widest text-gray-700 mb-4">Airworthiness Management</div>
               <h2 className="text-lg font-bold uppercase underline decoration-2 underline-offset-4">
                 RECURRENT PROGRAM / ASSESSMENT
               </h2>
            </div>
            <div className="border-2 border-black flex-1 flex flex-col">
              <div className="p-4 space-y-2 border-b border-black">
                <DataRow label="Name" value={resCandidate?.name} />
                <DataRow label="Personnel No" value={resCandidate?.personnel_no} />
                <DataRow label="Unit" value={resCandidate?.unit} />
                <DataRow label="Rating Sought" value={resCandidate?.rating_sought} />
                <DataRow label="Date of Exam" value={formatDate(resCandidate?.exam_date)} />
              </div>
              <div className="p-4 space-y-2 border-b border-black">
                <h3 className="font-bold underline text-sm mb-2">DGAC License</h3>
                <DataRow label="AMEL No" value={resCandidate?.dgac_amel_no || '-'} />
                <DataRow label="Rating" value={resCandidate?.dgac_rating || '-'} />
              </div>
              <div className="p-4 space-y-2 border-b border-black">
                <h3 className="font-bold underline text-sm mb-2">GA Authorization</h3>
                <DataRow label="No" value={resCandidate?.ga_auth_no || '-'} />
                <DataRow label="Rating" value={resCandidate?.ga_rating || '-'} />
              </div>
              <div className="p-4 border-b border-black min-h-[180px] relative">
                <p className="text-sm mb-4">I have personally tested this applicant with final judgment as follows <span className="italic text-xs">(filled by JKTMQSGA)</span> :</p>
                <div className="ml-4 mt-4 space-y-4 font-bold text-base">
                  <div className="flex items-center"><span className="w-20">PASSED</span> : <span className="ml-4 text-xl">{resPrintStats.isPass ? '✓' : ''}</span></div>
                  <div className="flex items-center"><span className="w-20">FAILED</span> : <span className="ml-4 text-xl">{!resPrintStats.isPass ? '✓' : ''}</span></div>
                </div>
                
                {/* INJEKSI TTD ASSESSOR */}
                <div className="absolute bottom-4 right-10 w-64 text-center flex flex-col items-center">
                  <p className="text-xs mb-1">Assessor</p> 
                  <div className="h-16 w-full flex justify-center items-end mb-1">
                     {adminSignData.assessorSign && <img src={adminSignData.assessorSign} className="max-h-full object-contain mix-blend-multiply" />}
                  </div>
                  <div className="border-b border-black w-full mb-1"></div>
                  <p className="font-bold text-sm tracking-widest uppercase">
                    {adminSignData.assessorName ? adminSignData.assessorName : '(                             )'}
                  </p> 
                </div>

              </div>
              <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-sm mb-2 font-bold">To be fulfilled by Airworthiness Standard (MQS)</p>
                  <div className="mb-0"><span className="font-bold text-sm">Issued Auth No:</span><div className="border-b border-dotted border-gray-400 w-full h-6"></div></div>
                </div>
                
                {/* INJEKSI TTD INSPECTOR */}
                <div className="self-end w-64 text-center mb-4 flex flex-col items-center">
                   <div className="text-left mb-0 text-sm mt-1 w-full">Jakarta : <span className="underline decoration-dotted">{formatDate(new Date())}</span></div>
                   <p className="text-xs mb-1 w-full text-center">Inspector Airworthiness Standard</p> 
                   <div className="h-16 w-full flex justify-center items-end mb-1">
                     {adminSignData.inspectorSign && <img src={adminSignData.inspectorSign} className="max-h-full object-contain mix-blend-multiply" />}
                   </div>
                   <div className="border-b border-black w-full mb-1"></div>
                   <p className="text-xs text-center font-bold uppercase w-full">
                     {adminSignData.inspectorName ? adminSignData.inspectorName : 'Name / Pers No'}
                   </p> 
                </div>

              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-2 text-gray-500"><span>Form MZ 1-17.1 (10-13)</span><span>1 of 2</span></div>
          </div>

          {/* ================= PAGE 2: LEMBAR JAWABAN ================= */}
          <div className="w-[210mm] h-[296mm] bg-white shadow-[0_0_40px_rgba(0,0,0,0.5)] p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden page-break">
            <div className="flex items-start gap-4 mb-2 border-b-2 border-black pb-2">
               <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
               <div><div className="font-bold text-sm">Garuda Indonesia</div><div className="text-[10px] text-gray-600">Airworthiness Management</div></div>
               <div className="flex-1 text-center"><h1 className="text-xl font-bold uppercase tracking-wider mt-2">ANSWER SHEET</h1></div>
            </div>
            <div className="border border-black text-xs">
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Aircraft type</span><span>:</span></div><span className="font-handwriting uppercase flex-1 truncate">{resExamResult?.type_of_ac || '-'}</span> </div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Name</span><span>:</span></div><span className="font-handwriting uppercase flex-1 truncate">{resCandidate?.name}</span></div>
              </div>
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Date</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{formatDate(resCandidate?.exam_date)}</span></div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Pers. No.</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resCandidate?.personnel_no}</span></div>
              </div>
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Booklet code</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resExamResult?.subject} - NO.{resExamResult?.exam_no}</span></div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Unit</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resCandidate?.unit}</span></div>
              </div>
              <div className="flex">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-28 font-bold flex justify-between shrink-0 mr-2"><span>Subject</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resExamResult?.subject}</span></div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Exam. No.</span><span>:</span></div>
                   <div className="flex items-center gap-2">
                       {[1, 2, 3].map(num => (<div key={num} className="flex items-center gap-1 border border-black px-1"><div className={`w-3 h-3 border border-black flex items-center justify-center text-[10px]`}>{resExamResult?.exam_no === num ? 'X' : ''}</div><span>{num}</span></div>))}
                       <span className="text-[9px] ml-1 italic">(cross the chosen)</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="flex mt-1 mb-4">
              <div className="w-2/3 text-[10px] pr-4 pt-2">
                <p>1. Read the questions carefully.</p>
                <p>2. Cross the column for the chosen answer.</p>
                <p>3. Donot write anything on the booklet</p>
                <p className="font-bold">4. Passing-grade 75%</p>
              </div>
              <div className="w-1/3 border border-black h-16 relative flex justify-center items-center overflow-hidden">
                <span className="text-[9px] absolute top-1 left-1 z-10 text-gray-700 font-bold">Signature:</span>
                {resCandidate?.signature && (<img src={resCandidate.signature} alt="Sign" className="h-full w-auto object-contain scale-[1.5] mix-blend-multiply" />)}
              </div>
            </div>

            <div className="border-2 border-black p-1 flex gap-1 mt-2">
               {[0, 25, 50, 75].map((startIdx) => (
                  <div key={startIdx} className="flex-1 border-r last:border-r-0 border-gray-400">
                     <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-black text-center bg-gray-100"><div>No</div><div>A</div><div>B</div><div>C</div><div>D</div></div>
                     {Array.from({ length: 25 }).map((_, i) => {
                        const no = startIdx + i + 1; const userAns = resAnswerMap[no]
                        return (
                          <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-gray-300 h-[19px] items-center">
                             <div className="text-center font-bold border-r border-gray-300">{no}</div>
                             {['A', 'B', 'C', 'D'].map((opt) => (
                                <div key={opt} className="border-r last:border-r-0 border-gray-300 relative flex justify-center items-center h-full">
                                   {userAns === opt && (<div className="absolute text-xl font-handwriting text-[#002561] pointer-events-none" style={{top: '-6px'}}>X</div>)}
                                </div>
                             ))}
                          </div>
                        )
                     })}
                  </div>
               ))}
            </div>
            
            {/* INJEKSI TTD EXAMINER PAGE 2 */}
            <div className="mt-4 text-[10px]">
               <div className="flex w-1/2 border border-black border-b-0 h-24">
                  <div className="w-24 border-r border-black p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                  <div className="flex-1 border-r border-black relative p-1 flex items-center justify-center overflow-hidden">
                     <span className="absolute top-0 left-1 text-[9px] font-bold text-gray-600">1</span>
                     {adminSignData.examiner1Sign && <img src={adminSignData.examiner1Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                  </div>
                  <div className="flex-1 relative p-1 flex items-center justify-center overflow-hidden">
                     <span className="absolute top-0 left-1 text-[9px] font-bold text-gray-600">2</span>
                     {adminSignData.examiner2Sign && <img src={adminSignData.examiner2Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                  </div>
               </div>
               
               <div className="flex border border-black h-40">
                   <div className="w-1/4 border-r border-black flex flex-col">
                       <div className="flex-1 border-b border-gray-400 p-2 flex justify-between items-center"><span>Aircraft system wrong :</span> <span className="font-bold text-lg">{resPrintStats.aircraftWrong}</span></div>
                       <div className="flex-1 p-2 flex justify-between items-center"><span>Regulation wrong :</span> <span className="font-bold text-lg">{resPrintStats.regWrong}</span></div>
                   </div>
                   <div className="w-1/4 border-r border-black p-2 flex flex-col">
                       <span className="mb-2">Total wrong :</span>
                       <span className="font-bold text-3xl text-center mt-4">{resPrintStats.totalWrong}</span>
                   </div>
                   <div className="w-1/4 border-r border-black flex flex-col">
                       <div className="flex-1 border-b border-gray-400 p-2 flex items-center"><span className="w-10">Pass</span><span>:</span> <span className="ml-4 font-bold text-xl">{resPrintStats.isPass ? '✓' : ''}</span></div>
                       <div className="flex-1 p-2 flex items-center"><span className="w-10">Fail</span><span>:</span> <span className="ml-4 font-bold text-xl">{!resPrintStats.isPass ? '✓' : ''}</span></div>
                   </div>
                   <div className="w-1/4 p-2 flex flex-col items-center justify-center">
                       <span className="font-bold text-lg mb-2">SCORE :</span>
                       <span className="font-bold text-4xl">{resPrintStats.score}</span>
                   </div>
               </div>
            </div>
            <div className="flex justify-between text-[9px] mt-1 font-mono text-gray-500"><span>Form MZ-1-16.3(3-12)</span></div>
          </div>

          {/* ================= PAGE 3: GMF STYLE ================= */}
          <div className="w-[210mm] h-[296mm] bg-white shadow-[0_0_40px_rgba(0,0,0,0.5)] p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden page-break">
            <div className="flex items-end justify-between mb-4 border-b-2 border-black pb-2">
               <div className="flex items-center gap-4"><img src="/logo.png" alt="Logo" className="h-10 object-contain" /><div className="flex flex-col"><div className="font-bold text-sm">GMF AeroAsia</div><div className="text-[9px] italic text-gray-700">(Garuda Indonesia Group)</div></div></div>
               <div className="text-center flex-1"><h1 className="text-xl font-bold uppercase tracking-wider mt-2">ANSWER SHEET</h1></div>
               <div className="text-[10px] italic">Quality Assurance & Safety</div>
            </div>
            <div className="border border-black text-xs">
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>A/C/Engine/Comp/Others</span><span>:</span></div><span className="font-handwriting uppercase flex-1 truncate">{resExamResult?.type_of_ac || '-'}</span> </div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Name</span><span>:</span></div><span className="font-handwriting uppercase flex-1 truncate">{resCandidate?.name}</span></div>
              </div>
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Date</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{formatDate(resCandidate?.exam_date)}</span></div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Pers. No.</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resCandidate?.personnel_no}</span></div>
              </div>
              <div className="flex border-b border-black">
                <div className="w-1/2 border-r border-black p-1 flex items-center"><div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Booklet Code</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resExamResult?.subject} - NO.{resExamResult?.exam_no}</span></div>
                <div className="w-1/2 p-1 flex items-center"><div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Unit</span><span>:</span></div><span className="font-handwriting uppercase flex-1">{resCandidate?.unit}</span></div>
              </div>
              <div className="flex">
                <div className="w-1/2 border-r border-black p-1 flex items-center">
                   <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Subject</span><span>:</span></div>
                   <div className="flex items-center gap-0.5 text-[8px] flex-1 leading-none">
                      <div className="flex items-center gap-0.5"><div className="w-2.5 h-2.5 border border-black flex items-center justify-center font-bold text-[8px]">{resExamResult?.subject === 'RENEWAL' ? 'X' : ''}</div><span>RENEWAL</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2.5 h-2.5 border border-black flex items-center justify-center"></div><span>ADDITIONAL</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2.5 h-2.5 border border-black flex items-center justify-center font-bold text-[8px]">{resExamResult?.subject === 'INITIAL' ? 'X' : ''}</div><span>INITIAL</span></div>
                   </div>
                </div>
                <div className="w-1/2 p-1 flex items-center">
                   <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Exam times No.</span><span>:</span></div>
                   <div className="flex items-center gap-2">
                       {[1, 2, 3].map(num => (<div key={num} className="flex items-center gap-1 border border-black px-1"><div className={`w-3 h-3 border border-black flex items-center justify-center text-[10px]`}>{resExamResult?.exam_no === num ? 'X' : ''}</div><span>{num}</span></div>))}
                       <span className="text-[9px] ml-1 italic">(Cross the chosen)</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="flex mt-1 mb-2">
              <div className="w-3/4 text-[10px] pr-4 pt-1">
                <p>1. Read the question carefully</p>
                <p>2. Cross the coloumn for the chosen answer</p>
                <p>3. Do not write anything on the booklet</p>
                <p className="font-bold">4. Passing grade score 75%</p>
              </div>
              <div className="w-1/4 border border-black h-14 relative flex justify-center items-center overflow-hidden">
                <span className="text-[9px] absolute top-1 left-1 z-10 text-gray-700 font-bold">Signature:</span>
                {resCandidate?.signature && (<img src={resCandidate.signature} alt="Sign" className="h-full w-auto object-contain scale-[1.5] mix-blend-multiply" />)}
              </div>
            </div>

            <div className="border-2 border-black p-1 flex gap-1 mt-2">
               {[0, 25, 50, 75].map((startIdx) => (
                  <div key={startIdx} className="flex-1 border-r last:border-r-0 border-gray-400">
                     <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-black text-center bg-gray-100"><div>No</div><div>A</div><div>B</div><div>C</div><div>D</div></div>
                     {Array.from({ length: 25 }).map((_, i) => {
                        const no = startIdx + i + 1; const userAns = resAnswerMap[no]
                        return (
                          <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-gray-300 h-[19px] items-center">
                             <div className="text-center font-bold border-r border-gray-300">{no}</div>
                             {['A', 'B', 'C', 'D'].map((opt) => (
                                <div key={opt} className="border-r last:border-r-0 border-gray-300 relative flex justify-center items-center h-full">
                                   {userAns === opt && (<div className="absolute text-xl font-handwriting text-[#002561] pointer-events-none" style={{top: '-6px'}}>X</div>)}
                                </div>
                             ))}
                          </div>
                        )
                     })}
                  </div>
               ))}
            </div>
            
            {/* INJEKSI TTD EXAMINER PAGE 3 */}
            <div className="mt-4 text-[10px]">
               <div className="flex w-1/2 border border-black border-b-0 h-24">
                  <div className="w-24 border-r border-black p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                  <div className="flex-1 border-r border-black relative p-1 flex items-center justify-center overflow-hidden">
                     <span className="absolute top-0 left-1 text-[9px] font-bold text-gray-600">1</span>
                     {adminSignData.examiner1Sign && <img src={adminSignData.examiner1Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                  </div>
                  <div className="flex-1 relative p-1 flex items-center justify-center overflow-hidden">
                     <span className="absolute top-0 left-1 text-[9px] font-bold text-gray-600">2</span>
                     {adminSignData.examiner2Sign && <img src={adminSignData.examiner2Sign} className="h-full object-contain mix-blend-multiply scale-125" />}
                  </div>
               </div>

               <div className="flex border border-black h-40">
                   <div className="w-1/4 border-r border-black flex flex-col"><div className="flex-1 border-b border-gray-400 p-2 flex justify-between items-center"><span>Aircraft system wrong :</span> <span className="font-bold text-lg">{resPrintStats.aircraftWrong}</span></div><div className="flex-1 p-2 flex justify-between items-center"><span>Regulation wrong :</span> <span className="font-bold text-lg">{resPrintStats.regWrong}</span></div></div>
                   <div className="w-1/4 border-r border-black p-2 flex flex-col"><span className="mb-2">Total wrong :</span><span className="font-bold text-3xl text-center mt-4">{resPrintStats.totalWrong}</span></div>
                   <div className="w-1/4 border-r border-black flex flex-col"><div className="flex-1 border-b border-gray-400 p-2 flex items-center"><span className="w-10">Pass</span><span>:</span> <span className="ml-4 font-bold text-xl">{resPrintStats.isPass ? '✓' : ''}</span></div><div className="flex-1 p-2 flex items-center"><span className="w-10">Fail</span><span>:</span> <span className="ml-4 font-bold text-xl">{!resPrintStats.isPass ? '✓' : ''}</span></div></div>
                   <div className="w-1/4 p-2 flex flex-col items-center justify-center"><span className="font-bold text-lg mb-2">SCORE :</span><span className="font-bold text-4xl">{resPrintStats.score}</span></div>
               </div>
            </div>
            <div className="text-[9px] mt-1 font-mono text-gray-500">FORM GMF/Q-448</div>
          </div>
        </div>
      </>
    )
  }

  // ==========================================
  // RENDER 3: DASHBOARD UTAMA ADMIN
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans pb-20">
      
      {/* MODAL FOTO KANDIDAT */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102a]/90 p-4 backdrop-blur-md transition-opacity" onClick={() => setSelectedPhoto(null)}>
          <div className="relative bg-white p-3 rounded-2xl shadow-2xl max-w-md w-full transform transition-all scale-105" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg border-2 border-white transition-transform hover:scale-110">✕</button>
            <img src={selectedPhoto} alt="Candidate" className="w-full h-auto max-h-[80vh] object-cover rounded-xl" />
          </div>
        </div>
      )}

      {/* HEADER COMMAND CENTER */}
      <div className="bg-[#002561] text-white pt-10 pb-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#009CB4] opacity-20 skew-x-[-20deg] translate-x-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#009CB4] to-transparent opacity-50"></div>
        
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-white p-3 rounded-2xl shadow-lg">
              <img src="/logo.png" alt="Garuda Logo" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-md">Proctor Center</h1>
              <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-1">EXAMINATION CONTROL DASHBOARD</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/add-question" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2">
              <span>➕</span> Add Question
            </Link>
            <Link href="/admin/bulk-import" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2">
              <span>🚀</span> Bulk Import
            </Link>
            <Link href="/admin/fix" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2">
              <span>🛠️</span> Database Diagnostics
            </Link>
            <button onClick={fetchData} className="px-5 py-2.5 bg-[#009CB4] hover:bg-[#007b8e] text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,156,180,0.4)] transition-all flex items-center gap-2">
              <span>🔄</span> Refresh Data
            </button>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 ml-4 border border-red-500">
              <span>🚪</span> Lock Gateway
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT CARDS */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-12 space-y-10 relative z-20">
        
        {/* CARD 1: EXAM ACCESS CODES */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-[#002561] tracking-wider uppercase flex items-center gap-3">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">🔑</span> 
                Active Access Codes
              </h2>
            </div>
            <button onClick={generateNewToken} className="px-6 py-3 bg-gradient-to-r from-[#009CB4] to-[#007b8e] hover:from-[#007b8e] hover:to-[#005c6b] text-white text-sm font-black tracking-widest uppercase rounded-xl shadow-lg transition-all hover:scale-[1.02]">
              + Generate Code
            </button>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 text-[#002561] border-b border-gray-100 text-xs uppercase tracking-wider font-bold">
                  <th className="p-5 pl-8">Aircraft Type</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Module</th>
                  <th className="p-5">Access Code</th>
                  <th className="p-5 text-center pr-8">Gate Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tokens.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No access codes generated yet.</td></tr>) : 
                tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5 pl-8 font-black text-[#002561]">{token.type_of_ac || '-'}</td>
                    <td className="p-5 text-gray-600 font-medium">{token.kategori || '-'}</td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md font-bold text-xs uppercase border border-gray-200">
                        {token.subject} #{token.exam_no}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black tracking-[0.3em] text-lg text-[#009CB4] bg-[#009CB4]/10 px-4 py-1.5 rounded-lg border border-[#009CB4]/20">{token.access_code}</span>
                        <button onClick={() => { navigator.clipboard.writeText(token.access_code); alert(`Kode Akses ${token.access_code} berhasil disalin!`)}} className="p-2 text-gray-400 hover:text-[#009CB4] hover:bg-[#009CB4]/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Copy Code">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </td>
                    <td className="p-5 pr-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => toggleTokenActive(token.id, token.is_active)} 
                          className={`px-4 py-1.5 rounded-lg font-black text-[10px] tracking-widest uppercase w-24 border transition-all shadow-sm
                          ${token.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>
                          {token.is_active ? '● OPEN' : '● CLOSED'}
                        </button>
                        <button onClick={() => handleDeleteToken(token.id, token.access_code)} title="Delete Code" 
                          className="p-1.5 text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-transparent hover:border-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 2: LIVE PARTICIPANTS */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-black text-[#002561] tracking-wider uppercase flex items-center gap-3">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">🧑</span> 
              Live Participants & Results
            </h2>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 text-[#002561] border-b border-gray-100 text-xs uppercase tracking-wider font-bold">
                  <th className="p-5 pl-8">Candidate Profile</th>
                  <th className="p-5">Exam Detail</th>
                  <th className="p-5">Exam Status</th>
                  <th className="p-5">Assessment Results</th>
                  <th className="p-5 text-center pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No participants found.</td></tr>) :
                sessions.map((session) => {
                  const candidateName = session.candidates?.name || 'Unknown'
                  const candidateNo = session.candidates?.personnel_no || 'N/A'
                  const candidateEmail = session.candidates?.email || 'No Email'
                  const candidatePhoto = session.candidates?.photo || null 
                  const isPassed = session.final_passed !== null ? session.final_passed : (session.score >= 75)

                  return (
                    <tr key={session.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-5 pl-8 align-middle">
                        <div className="flex items-center gap-4">
                          {candidatePhoto ? (
                            <img src={candidatePhoto} onClick={() => setSelectedPhoto(candidatePhoto)} className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm cursor-pointer hover:border-[#009CB4] transition-all" alt={candidateName} />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-bold">?</div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-[#002561]">{candidateName} <span className="text-[#009CB4] text-[10px] ml-1 tracking-widest px-1.5 py-0.5 bg-[#009CB4]/10 rounded border border-[#009CB4]/20">{candidateNo}</span></span>
                            <span className="text-[11px] text-gray-500 font-medium">{candidateEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 align-middle">
                         <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-800 text-xs">{session.type_of_ac || '-'}</span>
                            <span className="text-[10px] text-gray-500 font-medium uppercase">{session.kategori || '-'} • {session.subject} #{session.exam_no}</span>
                         </div>
                      </td>
                      <td className="p-5 align-middle">
                        {session.status === 'COMPLETED' ? (
                          <div className="flex items-center gap-2">
                             <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 text-xs font-bold uppercase tracking-widest"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Finished</span>
                             <span className="font-black text-[#002561]">Score: {session.score}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-200 text-xs font-bold uppercase tracking-widest animate-pulse"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Progress</span>
                             <span className="font-bold text-gray-400 text-xs">Score: {session.score}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-middle">
                        {session.status === 'COMPLETED' ? (
                           <div className="flex items-center gap-2">
                             <div className={`px-3 py-1 text-[11px] font-black tracking-widest uppercase rounded-md border shadow-sm ${isPassed ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600'}`}>{isPassed ? 'PASSED' : 'FAILED'}</div>
                             {/* Override Buttons */}
                             {isPassed ? (
                               <button onClick={() => handleAdjustResult(session.id, false)} title="Force Fail" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                             ) : (
                               <button onClick={() => handleAdjustResult(session.id, true)} title="Force Pass" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                             )}
                           </div>
                        ) : <span className="text-gray-300 font-bold">-</span>}
                      </td>
                      <td className="p-5 pr-8 text-center align-middle">
                        <div className="flex items-center justify-center gap-2">
                          {session.status === 'COMPLETED' && (
                             <>
                               <button onClick={() => handleViewResult(session.id)} className="px-3 py-1.5 bg-[#002561] hover:bg-[#00102a] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md transition-all flex items-center gap-1.5 hover:scale-105">
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                 Print
                               </button>
                               <button onClick={() => handleSendEmail(session)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm border transition-all flex items-center gap-1.5 hover:scale-105 ${session.email_sent ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-[#009CB4] border-[#009CB4] hover:bg-[#009CB4]/10'}`}>
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                 {session.email_sent ? 'Sent' : 'Email'}
                               </button>
                             </>
                          )}
                          <button onClick={() => resetParticipant(session.id, candidateName)} title="Delete/Reset Record" className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

// ==========================================
// KOMPONEN HELPER (TIDAK BERUBAH AGAR PRINT AMAN)
// ==========================================
function formatDate(dateString: any) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="grid grid-cols-[150px_10px_auto] text-sm items-start mb-1">
      <div className="font-medium">{label}</div><div>:</div><div className="uppercase font-mono font-bold border-b border-dotted border-gray-400 w-full pl-2">{value}</div>
    </div>
  )
}

function AdminSignaturePad({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) { ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000' }
    }
  }, [])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); canvas.setPointerCapture(e.pointerId)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y); ctx.stroke()
  }

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) { canvas.releasePointerCapture(e.pointerId); onChange(canvas.toDataURL('image/png')) }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); onChange('') }
  }

  return (
    <div className="relative">
      <div className="border-2 border-dashed border-gray-400 bg-white cursor-crosshair rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={250} height={100} className="w-full h-24 touch-none"
          onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerOut={stopDrawing} />
        {!value && <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold tracking-widest uppercase pointer-events-none">Sign Here</span>}
      </div>
      <button type="button" onClick={clearSignature} className="text-[10px] font-bold tracking-widest uppercase text-red-500 mt-1.5 hover:text-red-700">Clear Signature</button>
    </div>
  )
}