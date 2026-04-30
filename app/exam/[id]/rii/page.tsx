'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function RIIExamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: examId } = use(params)

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  // Header States
  const [candidateId, setCandidateId] = useState<string>('UNKNOWN')
  const [existingEssayAnswers, setExistingEssayAnswers] = useState<any>({})

  // RII Answers State
  const [answers, setAnswers] = useState({
    rii_q1: '', rii_q2: '', rii_q3: '', rii_q4: '', rii_q5: '', rii_p1: ''
  })

  // Anti-Cheat States
  const [cheatWarnings, setCheatWarnings] = useState(0)
  const cheatWarningsRef = useRef(0)
  const lastCheatTime = useRef(0)
  const isSystemDialogActive = useRef(false)
  const isUnloading = useRef(false)
  const cheatTimeout = useRef<NodeJS.Timeout | null>(null)
  const MAX_WARNINGS = 5

  const riiQuestions = [
    { id: 'rii_q1', text: '1. Explains definitions RII?' },
    { id: 'rii_q2', text: '2. How does authorized RII person check the task?' },
    { id: 'rii_q3', text: '3. Who is responsible issuing RII?' },
    { id: 'rii_q4', text: "4. What's meaning of buy back inspection?" },
    { id: 'rii_q5', text: '5. Which ATA are categorized as RII task?' },
    { id: 'rii_p1', text: 'Practical:\n1. Find example RII task On MP and review' }, // \n untuk enter
  ]

  // 1. Fetch Data & Lapor Admin
  useEffect(() => {
    const fetchExamData = async () => {
      await supabase.from('exam_results').update({ current_section: 'RII' }).eq('id', examId)

      const { data: resultData, error } = await supabase.from('exam_results').select('*, candidates(personnel_no)').eq('id', examId).single()
      if (error || !resultData) { 
        alert('Exam session not found!')
        router.push('/')
        return
      }

      setCandidateId(resultData.candidates?.personnel_no || 'UNKNOWN')
      if (resultData.essay_answers) setExistingEssayAnswers(resultData.essay_answers)

      const duration = 120
      const startedAt = new Date(resultData.started_at).getTime()
      const now = new Date().getTime()
      const endTime = startedAt + (duration * 60 * 1000)
      const remainingSeconds = Math.floor((endTime - now) / 1000)
      setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0)

      setLoading(false)
    }
    fetchExamData()
  }, [examId, router])

  // 2. Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0 && !loading) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit('TIMEOUT'); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, loading])

  // 3. Auto-Save Logic
  useEffect(() => {
    const savedData = localStorage.getItem(`rii_draft_${examId}`)
    if (savedData) {
      try { setAnswers(JSON.parse(savedData)) } catch (err) {}
    }
  }, [examId])

  useEffect(() => {
    localStorage.setItem(`rii_draft_${examId}`, JSON.stringify(answers))
  }, [answers, examId])

  // 4. Anti-Cheat Logic
  useEffect(() => {
    if (loading) return
    const savedWarnings = localStorage.getItem(`cheat_${examId}`)
    if (savedWarnings) {
      const count = parseInt(savedWarnings, 10)
      setCheatWarnings(count)
      cheatWarningsRef.current = count
    }

    const handleCheatDetected = () => {
      if (isSystemDialogActive.current) return
      cheatTimeout.current = setTimeout(() => {
        if (isUnloading.current) return
        const now = Date.now()
        if (now - lastCheatTime.current < 3000) return
        lastCheatTime.current = now
        if (cheatWarningsRef.current >= MAX_WARNINGS) return
        
        cheatWarningsRef.current += 1
        setCheatWarnings(cheatWarningsRef.current)
        localStorage.setItem(`cheat_${examId}`, cheatWarningsRef.current.toString())
        supabase.from('exam_results').update({ cheat_warnings: cheatWarningsRef.current }).eq('id', examId).then()

        if (cheatWarningsRef.current >= MAX_WARNINGS) {
          isSystemDialogActive.current = true
          alert(`🚨 FATAL VIOLATION!\n\nYou have been detected leaving the exam area ${MAX_WARNINGS} times. The exam is forcibly terminated!`)
          setTimeout(() => { isSystemDialogActive.current = false }, 500)
          handleSubmit('TIMEOUT')
        } else {
          isSystemDialogActive.current = true
          alert(`⚠️ FRAUD WARNING (${cheatWarningsRef.current}/${MAX_WARNINGS}) ⚠️\n\nScreen focus lost! You were detected opening another application, using split screen, or switching tabs.`)
          setTimeout(() => { isSystemDialogActive.current = false }, 500)
        }
      }, 300)
    }

    const handleVisibilityChange = () => { if (document.hidden) handleCheatDetected() }
    const handleWindowBlur = () => { handleCheatDetected() }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleBeforeUnload = () => {
      isUnloading.current = true
      if (cheatTimeout.current) clearTimeout(cheatTimeout.current)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (cheatTimeout.current) clearTimeout(cheatTimeout.current)
    }
  }, [loading, examId])

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async (forceSubmitType: 'TIMEOUT' | null = null) => {
    if (!forceSubmitType) {
      isSystemDialogActive.current = true
      const confirmComplete = window.confirm(`✅ Are you sure you want to finish the RII Section and submit your final exam?`)
      setTimeout(() => { isSystemDialogActive.current = false }, 500)
      if (!confirmComplete) return
    }

    setIsSubmitting(true)
    const combinedAnswers = { ...existingEssayAnswers, ...answers }

    await supabase.from('exam_results').update({
      essay_answers: combinedAnswers,
      status: 'COMPLETED',
      finished_at: new Date().toISOString()
    }).eq('id', examId)

    localStorage.removeItem(`cheat_${examId}`)
    localStorage.removeItem(`rii_draft_${examId}`)
    router.push(`/result/${examId}`)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

// Loading Screen (Gold Theme)
  if (loading) return (
    <div className="min-h-screen bg-[#261E0A] flex items-center justify-center text-center">
        <div>
            <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-[#D4AF37] font-black tracking-widest uppercase animate-pulse">Preparing RII Environment...</div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen relative font-sans overflow-hidden select-none" onContextMenu={(e)=> e.preventDefault()}>

      {/* BACKGROUND GAMBAR DENGAN TONE GOLD */}
      <div className="absolute inset-0 z-0 bg-[#261E0A]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity transition-opacity duration-1000 ease-in-out" 
          style={{ backgroundImage: `url(/GA_1.jpg)` }} /> 
        <div className="absolute inset-0 bg-gradient-to-b from-[#8B6508]/60 via-transparent to-[#8B6508]/95"></div>
      </div>

      {/* HEADER EXAM */}
      <div className="relative z-10 bg-[#8B6508]/90 backdrop-blur-md border-b border-white/20 shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="bg-white p-2.5 rounded-xl hidden md:block shadow-md">
            <img src="/logo.png" alt="Garuda Indonesia Logo" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-widest uppercase mb-1">RII AUTHORIZATION SECTION</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#FDF8E7] text-[11px] font-bold tracking-[0.2em] uppercase mr-2">CANDIDATE: {candidateId}</span>
              <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase border border-white/30 bg-white/5 px-2 py-0.5 rounded-md">REQUIRED INSPECTION ITEM</span>
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
            
            {/* Title Content (Rata Kiri persis seperti Essay) */}
            <div className="mb-10 text-left w-full">
              <h2 className="text-2xl md:text-3xl font-black text-[#8B6508] tracking-widest uppercase border-b-4 border-[#D4AF37] inline-block pb-2">
                REQUIRED INSPECTION ITEM
              </h2>
              <p className="text-[#A67C00] font-bold mt-4 tracking-wide">Please answer all questions clearly.</p>
            </div>

            {/* SOAL RII */}
            <div className="space-y-8 max-w-8xl w-full">
              {riiQuestions.map((q) => (
                <div key={q.id} className="bg-[#FDF8E7]/40 border border-[#E8D07A] p-6 rounded-2xl shadow-sm hover:border-[#D4AF37]/50 transition-colors w-full">
                  {/* Tambahkan text-justify di sini agar rata kanan-kiri */}
                  <label className="block font-bold text-[#8B6508] mb-4 text-lg whitespace-pre-line leading-relaxed text-justify">
                    {q.text}
                  </label>
                  <textarea 
                    name={q.id} 
                    value={(answers as any)[q.id]} 
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)} 
                    rows={4} 
                    className="w-full p-4 border-2 border-[#E8D07A] rounded-xl focus:ring-4 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-[#332A00] font-bold resize-none bg-white"
                    placeholder="Type your detailed answer here..."
                  ></textarea>
                </div>
              ))}
            </div>

          </div>

          {/* FOOTER BUTTON (GOLD THEME) */}
          <div className="bg-white/80 border-t border-[#E8D07A] p-6 flex items-center justify-end gap-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] relative z-20">
            <button onClick={() => handleSubmit(null)} disabled={isSubmitting} 
              className={`px-12 py-4 font-black tracking-widest uppercase rounded-full transition-all shadow-xl
              ${isSubmitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-[#B8860B] text-white hover:bg-[#8B6508] shadow-[#B8860B]/30 hover:scale-105"}`}>
              {isSubmitting ? "SUBMITTING..." : "SUBMIT FINAL EXAM"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}