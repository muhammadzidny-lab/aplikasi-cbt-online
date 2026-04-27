'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

type Question = {
  id: string
  question_text: string
  options: { id: string; option_text: string; is_correct?: boolean }[]
}

// ==========================================
// DAFTAR GAMBAR LATAR BELAKANG (RANDOM)
// ==========================================
const backgroundImages = Array.from({ length: 20 }, (_, i) => `/GA_${i + 1}.jpg`);

// ==========================================
// FUNGSI ACAK SOAL (SEEDED RANDOM)
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

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examResultId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0) 
  const [answers, setAnswers] = useState<Record<string, string>>({}) 
  
  // State UI
  const [candidateId, setCandidateId] = useState<string>('UNKNOWN')
  const [typeOfAC, setTypeOfAC] = useState<string>('')
  const [kategori, setKategori] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [examNo, setExamNo] = useState<string>('')
  const [currentBackground, setCurrentBackground] = useState<string>(backgroundImages[0])

  // Fitur Anti-Cheat (Tanpa Kamera)
  const [cheatWarnings, setCheatWarnings] = useState(0)
  const cheatWarningsRef = useRef(0) 
  const lastCheatTime = useRef(0) 
  const isSystemDialogActive = useRef(false) 
  const isUnloading = useRef(false) 
  const cheatTimeout = useRef<NodeJS.Timeout | null>(null)
  
  const MAX_WARNINGS = 5

  useEffect(() => {
    const savedWarnings = localStorage.getItem(`cheat_${examResultId}`)
    if (savedWarnings) {
      const count = parseInt(savedWarnings, 10)
      setCheatWarnings(count)
      cheatWarningsRef.current = count
    }
  }, [examResultId])

  useEffect(() => {
    const fetchExamData = async () => {
      const { data: resultData, error } = await supabase.from('exam_results').select('*, candidates(personnel_no)').eq('id', examResultId).single()
      if (error || !resultData) { 
        isSystemDialogActive.current = true;
        alert('Exam session not found!'); 
        setTimeout(() => { isSystemDialogActive.current = false; }, 500);
        router.push('/'); 
        return; 
      }
      
      // =================================================================
      // PERBAIKAN ALUR ROUTING: CEK STATUS COMPLETED DAN ESSAY
      // =================================================================
      if (resultData.status === 'COMPLETED') { router.push(`/result/${examResultId}`); return; }
      if (resultData.status === 'ESSAY') { router.push(`/exam/${examResultId}/essay`); return; }

      setCandidateId(resultData.candidates?.personnel_no || 'UNKNOWN')
      setTypeOfAC(resultData.type_of_ac || 'Aircraft')
      setKategori(resultData.kategori || 'Category')
      setSubject(resultData.subject || 'Subject')
      setExamNo(resultData.exam_no || '0')

      if (resultData.type_of_ac === 'Airbus A330 NEO' && resultData.kategori === 'Electric & Avionic' && resultData.subject === 'INITIAL') {
        isSystemDialogActive.current = true;
        alert('ATTENTION: Airbus A330 NEO for Electric & Avionic category does not have INITIAL module (Only Renewal 50 Questions). Exam cancelled.');
        setTimeout(() => { isSystemDialogActive.current = false; }, 500);
        router.push('/'); 
        return;
      }

      let specificLimit = 0; let regLimit = 0;
      if (resultData.subject === 'INITIAL') { specificLimit = 80; regLimit = 20; } 
      else if (resultData.subject === 'RENEWAL') { specificLimit = 40; regLimit = 10; }

      const duration = 120;
      const startedAt = new Date(resultData.started_at).getTime()
      const now = new Date().getTime()
      const endTime = startedAt + (duration * 60 * 1000)
      const remainingSeconds = Math.floor((endTime - now) / 1000)
      setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0)

      const { data: specificQsData } = await supabase.from('questions').select(`id, question_text, options (id, option_text, is_correct)`).eq('type_of_ac', resultData.type_of_ac).eq('kategori', resultData.kategori)
      const { data: regQsData } = await supabase.from('questions').select(`id, question_text, options (id, option_text, is_correct)`).ilike('kategori', '%REGULASI%') 

      const shuffledSpecific = shuffleArray(specificQsData || [], examResultId).slice(0, specificLimit)
      const shuffledReg = shuffleArray(regQsData || [], examResultId).slice(0, regLimit)
      const combinedQuestions = [...shuffledSpecific, ...shuffledReg]
      const finalShuffledQuestions = shuffleArray(combinedQuestions, examResultId + "mix")

      if (finalShuffledQuestions.length > 0) {
         const finalQuestions = finalShuffledQuestions.map((q: any) => {
             let safeOptions = q.options;
             if (safeOptions.length > 4) {
                 const correctOpt = safeOptions.find((o: any) => o.is_correct);
                 const wrongOpts = safeOptions.filter((o: any) => !o.is_correct);
                 safeOptions = correctOpt ? [correctOpt, ...wrongOpts.slice(0, 3)] : safeOptions.slice(0, 4);
             }
             return { ...q, options: shuffleArray(safeOptions, examResultId + q.id) }
         })
         setQuestions(finalQuestions)
      }

      const { data: existingAnswersData } = await supabase.from('exam_answers').select('question_id, selected_option_id').eq('result_id', examResultId)
      if (existingAnswersData && existingAnswersData.length > 0) {
        const mappedAnswers: Record<string, string> = {}
        existingAnswersData.forEach((ans: any) => { mappedAnswers[ans.question_id] = ans.selected_option_id })
        setAnswers(mappedAnswers)
      }
      setLoading(false)
    }
    fetchExamData()
  }, [examResultId, router])

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

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    setCurrentBackground(backgroundImages[randomIndex]);
  }, [currentIdx]);

  // Fitur Anti-Cheat (Tanpa Kamera)
  useEffect(() => {
    if (loading) return;

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

          // Jika pelanggaran fatal, status langsung COMPLETED
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

  const handleAnswer = async (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    const { data: existingAnswer } = await supabase.from('exam_answers').select('id').eq('result_id', examResultId).eq('question_id', questionId).single()
    if (existingAnswer) { await supabase.from('exam_answers').update({ selected_option_id: optionId }).eq('id', existingAnswer.id) } 
    else { await supabase.from('exam_answers').insert({ result_id: examResultId, question_id: questionId, selected_option_id: optionId }) }
    updateLiveScore()
  }

  const handleClearAnswer = async (questionId: string) => {
    setAnswers((prev) => { const newAnswers = { ...prev }; delete newAnswers[questionId]; return newAnswers })
    await supabase.from('exam_answers').delete().eq('result_id', examResultId).eq('question_id', questionId)
    updateLiveScore()
  }

  const updateLiveScore = async () => {
    const { data: allCurrentAnswers } = await supabase.from('exam_answers').select('question_id, selected_option_id').eq('result_id', examResultId)
    const questionIds = questions.map((q: any) => q.id)
    const { data: correctOptions } = await supabase.from('options').select('question_id, id').in('question_id', questionIds).eq('is_correct', true)

    let correctCount = 0
    if (allCurrentAnswers && correctOptions && questions.length > 0) {
      allCurrentAnswers.forEach((ans: any) => {
        const isCorrect = correctOptions.some((opt: any) => opt.question_id === ans.question_id && opt.id === ans.selected_option_id)
        if (isCorrect) correctCount++
      })
    }
    const liveScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
    await supabase.from('exam_results').update({ score: liveScore }).eq('id', examResultId)
  }

  const handleSubmit = async (forceSubmitType: 'TIMEOUT' | 'CHEAT' | null = null) => {
    if (!forceSubmitType) { 
      const answeredCount = Object.keys(answers).length;
      const unansweredCount = questions.length - answeredCount;
      isSystemDialogActive.current = true;
      if (unansweredCount > 0) {
        const confirmIncomplete = window.confirm(`⚠️ WARNING!\n\nYou still have ${unansweredCount} UNANSWERED questions.\nAre you sure you want to end and submit the exam now?`);
        setTimeout(() => { isSystemDialogActive.current = false; }, 500); 
        if (!confirmIncomplete) return; 
      } else {
        const confirmComplete = window.confirm(`✅ Excellent! All questions are answered.\nAre you sure you want to submit the exam now?`);
        setTimeout(() => { isSystemDialogActive.current = false; }, 500); 
        if (!confirmComplete) return;
      }
    } else if (forceSubmitType === 'TIMEOUT') { 
      isSystemDialogActive.current = true;
      alert('⏳ Time is up! Your answers will be automatically submitted.');
      setTimeout(() => { isSystemDialogActive.current = false; }, 500);
    }
    setLoading(true)
    
    // =================================================================
    // PERBAIKAN ALUR ROUTING: SET STATUS MENJADI 'ESSAY'
    // =================================================================
    await supabase.from('exam_results').update({ status: 'ESSAY' }).eq('id', examResultId)
    localStorage.removeItem(`cheat_${examResultId}`)
    
    router.push(`/exam/${examResultId}/essay`)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-center">
        <div>
            <div className="w-16 h-16 border-4 border-[#002561] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-[#002561] font-black tracking-widest uppercase animate-pulse">
                Preparing Secure Environment...
            </div>
        </div>
    </div>
  )
  
  const currentQ = questions[currentIdx]

  return (
    <div className="flex flex-col h-screen relative font-sans overflow-hidden select-none" onContextMenu={(e)=> e.preventDefault()}>

      {/* BACKGROUND BERUBAH ACAK */}
      <div className="absolute inset-0 z-0 bg-[#00102a]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 mix-blend-luminosity transition-opacity duration-1000 ease-in-out" 
          style={{ backgroundImage: `url(${currentBackground})` }} />
        <div className="absolute inset-0 bg-linear-to-b from-[#002561]/50 via-transparent to-[#002561]/90"></div>
      </div>

      {/* HEADER EXAM */}
      <div className="relative z-10 bg-[#002561]/90 backdrop-blur-md border-b border-white/20 shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="bg-white p-2.5 rounded-xl hidden md:block shadow-md">
            <img src="/logo.png" alt="Garuda Indonesia Logo" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-widest uppercase mb-1">{typeOfAC}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#009CB4] text-[11px] font-bold tracking-[0.2em] uppercase mr-2">CANDIDATE: {candidateId}</span>
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
      <div className="flex-1 flex overflow-hidden relative z-10 p-4 gap-6 max-w-[1400px] mx-auto w-full">
        
        {/* area soal utama */}
        <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden">
          <div className="flex-1 p-8 md:p-12 overflow-y-auto">
            
            <div className="w-full flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">
              <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#009CB4] transition-all duration-300" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
              </div>
            </div>

            {currentQ ? (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold text-[#002561] mb-10 leading-relaxed pl-5 border-l-4 border-[#009CB4]">
                  {currentQ.question_text}
                </h2>
                
                <div className="space-y-4">
                  {currentQ.options.map((opt, idx) => {
                    const optionLetter = String.fromCharCode(65 + idx);
                    const isSelected = answers[currentQ.id] === opt.id;
                    
                    return (
                      <button key={opt.id} onClick={() => handleAnswer(currentQ.id, opt.id)}
                        className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 flex items-center gap-5
                          ${isSelected ? 'bg-[#002561]/5 shadow-inner border-[#002561] scale-[1.01]' : 'bg-gray-50 border-gray-100 hover:border-[#002561]/20 hover:scale-[1.01]'}`}>
                        
                        <div className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border-2 font-black text-xl tracking-widest transition-colors duration-300 
                          ${isSelected ? 'bg-[#002561] text-white border-transparent' : 'bg-white text-gray-400 border-gray-200'}`}>
                          {optionLetter}
                        </div>
                        
                        <span className={`text-sm md:text-base font-bold flex-1 leading-relaxed ${isSelected ? 'text-[#002561]' : 'text-gray-700'}`}>
                          {opt.option_text}
                        </span>
                        
                        <div className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full border-2 transition-all duration-300
                          ${isSelected ? 'bg-[#009CB4] border-[#009CB4]' : 'bg-transparent border-gray-300'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                        </div>

                      </button>
                    )
                  })}
                </div>

                {answers[currentQ.id] && (
                  <div className="mt-8 flex justify-end">
                    <button onClick={() => handleClearAnswer(currentQ.id)}
                      className="px-6 py-2.5 text-xs font-black tracking-widest text-[#8B5E34] hover:text-white bg-transparent hover:bg-[#8B5E34] uppercase rounded-full transition-all border border-[#8B5E34]">
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            ) : (<div className="text-center text-gray-500 mt-20 font-bold uppercase tracking-widest">Questions Not Found.</div>)}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between gap-4">
             <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} 
                className={`px-8 py-3.5 font-bold tracking-widest uppercase rounded-full border-2 transition-all
                ${currentIdx === 0 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-[#002561] text-[#002561] hover:bg-[#002561]/10'}`}>
                &larr; Prev
             </button>
             
             {currentIdx === questions.length - 1 ? (
                <button onClick={() => handleSubmit(null)} className="px-10 py-3.5 bg-red-600 text-white font-black tracking-widest uppercase rounded-full hover:bg-red-700 shadow-xl shadow-red-600/30 transition-all hover:scale-105">
                  Submit Exam
                </button>
             ) : (
                <button onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} 
                  className="px-10 py-3.5 bg-[#009CB4] text-white font-black tracking-widest uppercase rounded-full hover:bg-opacity-90 shadow-lg shadow-[#009CB4]/30 transition-all hover:scale-105">
                  Next &rarr;
                </button>
             )}
          </div>
        </div>

        {/* nav map sidebar */}
        <div className="w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 flex-col overflow-hidden hidden lg:flex">
          <div className="bg-[#002561] p-6 text-center border-b-4 border-[#009CB4]">
             <h3 className="font-black text-white tracking-widest uppercase text-sm">Navigation Map</h3>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-4 gap-3">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id];
                const isActive = currentIdx === idx;
                return (
                  <button key={q.id} onClick={() => setCurrentIdx(idx)}
                    className={`h-12 w-full flex items-center justify-center text-sm rounded-xl font-bold transition-all duration-300 border-2
                    ${isActive ? 'ring-4 ring-[#009CB4]/30 scale-110' : ''}
                    ${isAnswered ? 'bg-[#002561] text-white border-[#002561]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#002561]/30'} `}>
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="bg-gray-50 p-6 border-t border-gray-200 space-y-3">
             <div className="flex items-center gap-3 text-xs font-bold text-gray-600 uppercase tracking-widest">
                <div className="w-4 h-4 rounded-full bg-[#002561]"></div> Answered
             </div>
             <div className="flex items-center gap-3 text-xs font-bold text-gray-600 uppercase tracking-widest">
                <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300"></div> Unanswered
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}