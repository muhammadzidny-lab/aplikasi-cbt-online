'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resultId } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [scoreData, setScoreData] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)

  useEffect(() => {
    const calculateAndFetchResults = async () => {
      // 1. Ambil Data Jawaban User & Kunci Jawaban
      // Kita join table 'exam_answers' dengan 'options' untuk melihat is_correct
      const { data: answersData, error } = await supabase
        .from('exam_answers')
        .select(`
          id,
          selected_option_id,
          options ( is_correct )
        `)
        .eq('result_id', resultId)

      if (error || !answersData) {
        alert('Gagal mengambil data jawaban.')
        return
      }

      // 2. Hitung Nilai (Auto Grading)
      let correctCount = 0
      const totalAnswered = answersData.length
      
      // Loop semua jawaban
      answersData.forEach((ans: any) => {
        // @ts-ignore
        if (ans.options?.is_correct === true) {
          correctCount++
        }
      })

      // Hitung Skor (Skala 100)
      // Asumsi: Total soal diambil dari jumlah jawaban yang masuk (atau bisa query ke bank soal)
      // Agar aman, kita ambil total soal dari database questions
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        // Kita butuh subject & exam_no dari result dulu, tapi untuk simplifikasi
        // kita pakai logic sederhana: Skor = (Benar / Total Jawaban) * 100
        // (Di production, sebaiknya fetch total soal sebenarnya)
      
      // Ambil detail result untuk tahu subjectnya
      const { data: resDetail } = await supabase
        .from('exam_results')
        .select(`*, candidates(*)`) // Join ke tabel candidates
        .eq('id', resultId)
        .single()

      if (!resDetail) return

      // Update Candidate State
      setCandidate(resDetail.candidates)

      // Ambil Total Soal Sebenarnya dari Bank Soal
      const { count: realTotalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject', resDetail.subject)
        .eq('exam_no', resDetail.exam_no)

      const divider = realTotalQuestions || totalAnswered || 1
      const finalScore = Math.round((correctCount / divider) * 100)

      // 3. Simpan Nilai Permanen ke Database (Hanya jika belum ada nilai)
      if (resDetail.score === 0 || resDetail.score === null) {
        await supabase
          .from('exam_results')
          .update({
            score: finalScore,
            total_correct: correctCount,
            status: 'COMPLETED' // Pastikan status selesai
          })
          .eq('id', resultId)
        
        // Update tampilan lokal
        setScoreData({ score: finalScore, correct: correctCount, total: divider })
      } else {
        // Jika sudah ada nilai (misal refresh halaman), pakai yang di DB
        setScoreData({ score: resDetail.score, correct: resDetail.total_correct, total: divider })
      }

      setLoading(false)
    }

    calculateAndFetchResults()
  }, [resultId])

  if (loading) return <div className="text-center p-10 font-mono">CALCULATING SCORE...</div>

  // Menentukan Lulus/Gagal (Misal KKM 70)
  const isPassed = scoreData?.score >= 70

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden print:shadow-none">
        
        {/* Header Laporan */}
        <div className="bg-gray-800 text-white p-6 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold uppercase">Exam Result</h1>
              <p className="text-gray-400 print:text-gray-600">Official Report</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-sm">ID: {resultId.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {/* Section 1: Data Peserta */}
          <div className="grid grid-cols-2 gap-4 border-b pb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Candidate Name</p>
              <p className="text-lg font-medium">{candidate?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Personnel No.</p>
              <p className="text-lg font-medium">{candidate?.personnel_no}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Unit / Rating</p>
              <p className="text-lg font-medium">{candidate?.unit} / {candidate?.rating_sought}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Exam Date</p>
              <p className="text-lg font-medium">{candidate?.exam_date}</p>
            </div>
          </div>

          {/* Section 2: Skor & Status */}
          <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300">
            <h2 className="text-gray-500 uppercase tracking-widest text-sm font-bold mb-2">Final Score</h2>
            <div className="text-6xl font-bold text-gray-900 mb-2">
              {scoreData?.score}<span className="text-2xl text-gray-400">/100</span>
            </div>
            
            <div className={`px-6 py-2 rounded-full font-bold text-white uppercase tracking-wide
              ${isPassed ? 'bg-green-600 print:text-green-800 print:bg-white print:border-2 print:border-green-800' : 'bg-red-600 print:text-red-800 print:bg-white print:border-2 print:border-red-800'}`}>
              {isPassed ? 'PASSED' : 'FAILED'}
            </div>
            
            <p className="mt-4 text-gray-600 text-sm">
              Correct Answers: {scoreData?.correct} out of {scoreData?.total} questions
            </p>
          </div>

          {/* Section 3: Tanda Tangan (Khusus Print) */}
          <div className="hidden print:flex justify-between mt-20 pt-10">
            <div className="text-center">
              <div className="h-20 border-b border-black w-48 mb-2"></div>
              <p className="font-bold">Candidate Signature</p>
            </div>
            <div className="text-center">
              <div className="h-20 border-b border-black w-48 mb-2"></div>
              <p className="font-bold">Proctor Signature</p>
            </div>
          </div>

          {/* Tombol Aksi (Disembunyikan saat Print) */}
          <div className="flex gap-4 justify-center print:hidden pt-4">
            <button 
              onClick={() => window.print()} 
              className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition"
            >
              🖨️ PRINT RESULT
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-bold transition"
            >
              Back to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}