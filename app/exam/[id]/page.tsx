'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

// Interface TypeScript untuk Tipe Data
type Question = {
  id: string
  question_text: string
  options: { id: string; option_text: string }[]
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params (Next.js 15 rules)
  const { id: examResultId } = use(params)
  
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0) // dalam detik
  const [answers, setAnswers] = useState<Record<string, string>>({}) // { questionId: optionId }

  // 1. Load Data Ujian saat Halaman Dibuka
  useEffect(() => {
    const fetchExamData = async () => {
      // A. Ambil Data Sesi Ujian (Result ID)
      const { data: resultData, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('id', examResultId)
        .single()

      if (error || !resultData) {
        alert('Exam not found!')
        router.push('/')
        return
      }

      // Cek apakah sudah selesai?
      if (resultData.status === 'COMPLETED') {
        router.push(`/result/${examResultId}`)
        return
      }

      // B. Ambil Durasi dari Token (untuk Timer)
      const { data: tokenData } = await supabase
        .from('exam_tokens')
        .select('duration_minutes')
        .eq('subject', resultData.subject)
        .eq('exam_no', resultData.exam_no)
        .single()
      
      const duration = tokenData?.duration_minutes || 60

      // C. Hitung Sisa Waktu (Server Side Calculation)
      const startedAt = new Date(resultData.started_at).getTime()
      const now = new Date().getTime()
      const endTime = startedAt + (duration * 60 * 1000)
      const remainingSeconds = Math.floor((endTime - now) / 1000)

      setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0)

      // D. Ambil Soal & Opsi
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          id, 
          question_text, 
          options (id, option_text)
        `)
        .eq('subject', resultData.subject)
        .eq('exam_no', resultData.exam_no)
      
      if (questionsData) {
        setQuestions(questionsData)
      }

      setLoading(false)
    }

    fetchExamData()
  }, [examResultId, router])

  // 2. Logic Timer Mundur
  useEffect(() => {
    if (timeLeft <= 0 && !loading) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Waktu habis = Auto Submit
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, loading])

  // 3. Logic Pilih Jawaban (Auto-Save ke Database)
  const handleAnswer = async (questionId: string, optionId: string) => {
    // Update UI instan (biar cepat)
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))

    // Simpan ke Database (Background Process)
    // Cek dulu apakah sudah pernah jawab?
    const { data: existingAnswer } = await supabase
      .from('exam_answers')
      .select('id')
      .eq('result_id', examResultId)
      .eq('question_id', questionId)
      .single()

    if (existingAnswer) {
      // Update jawaban lama
      await supabase
        .from('exam_answers')
        .update({ selected_option_id: optionId })
        .eq('id', existingAnswer.id)
    } else {
      // Insert jawaban baru
      await supabase
        .from('exam_answers')
        .insert({
          result_id: examResultId,
          question_id: questionId,
          selected_option_id: optionId
        })
    }
  }

  // 4. Logic Submit Ujian
  const handleSubmit = async () => {
    if(!confirm('Are you sure you want to finish the exam?')) return;

    setLoading(true)
    
    // Update status jadi COMPLETED
    await supabase
      .from('exam_results')
      .update({ 
        status: 'COMPLETED',
        finished_at: new Date().toISOString()
      })
      .eq('id', examResultId)

    // Redirect ke halaman Nilai
    router.push(`/result/${examResultId}`)
  }

  // Helper: Format Waktu (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading) return <div className="text-center p-10">Loading Exam Data...</div>

  const currentQ = questions[currentIdx]

  return (
    <div className="flex flex-col h-screen bg-gray-50 select-none" onContextMenu={(e)=> e.preventDefault()}>
      
      {/* HEADER: Info & Timer */}
      <div className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-lg text-gray-800">Exam Session</h1>
          <p className="text-sm text-gray-500">Question {currentIdx + 1} of {questions.length}</p>
        </div>
        <div className={`text-xl font-mono font-bold px-4 py-2 rounded ${timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
          ⏳ {formatTime(timeLeft)}
        </div>
      </div>

      {/* BODY: Soal & Navigasi */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* KIRI: Area Soal */}
        <div className="flex-1 p-8 overflow-y-auto">
          {currentQ ? (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-medium text-gray-900 mb-6 leading-relaxed">
                {currentQ.question_text}
              </h2>
              
              <div className="space-y-3">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(currentQ.id, opt.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 
                      ${answers[currentQ.id] === opt.id 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                        : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'}`}
                  >
                    {opt.option_text}
                  </button>
                ))}
              </div>

              {/* Tombol Navigasi Bawah */}
              <div className="mt-10 flex justify-between">
                <button 
                  onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                
                {currentIdx === questions.length - 1 ? (
                  <button 
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700"
                  >
                    FINISH EXAM
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-20">No questions found for this exam package.</div>
          )}
        </div>

        {/* KANAN: Sidebar Nomor Soal */}
        <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto hidden md:block">
          <h3 className="font-bold text-gray-700 mb-4">Question Map</h3>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`p-2 text-sm rounded font-medium border
                  ${currentIdx === idx ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${answers[q.id] 
                    ? 'bg-blue-600 text-white border-blue-600' // Sudah dijawab
                    : 'bg-gray-100 text-gray-600 border-gray-200'} // Belum dijawab
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}