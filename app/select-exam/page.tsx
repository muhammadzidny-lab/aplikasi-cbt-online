'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function SelectExamContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const candidateId = searchParams.get('candidateId')
  
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('RENEWAL') // Default
  const [examNo, setExamNo] = useState('1') // Default
  const [accessCode, setAccessCode] = useState('')

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!candidateId) {
      alert('Error: Candidate ID not found. Please register again.')
      router.push('/')
      return
    }

    // 1. Validasi Token/Kode Soal di Database
    const { data: tokenData, error: tokenError } = await supabase
      .from('exam_tokens')
      .select('*')
      .eq('subject', subject)
      .eq('exam_no', parseInt(examNo))
      .eq('access_code', accessCode)
      .single()

    if (tokenError || !tokenData) {
      alert('KODE SALAH! Pastikan Subject, Exam No, dan Kode sesuai.')
      setLoading(false)
      return
    }

    // 2. Jika Kode Benar, Buat Sesi Ujian Baru (Exam Result)
    const { data: resultData, error: resultError } = await supabase
      .from('exam_results')
      .insert([
        {
          candidate_id: candidateId,
          subject: subject,
          exam_no: parseInt(examNo),
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (resultError) {
      alert('Gagal memulai ujian: ' + resultError.message)
      setLoading(false)
    } else {
      // 3. Redirect ke Halaman Soal (Kita buat nanti)
      router.push(`/exam/${resultData.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Select Exam</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Enter the access code provided by the proctor.</p>

        <form onSubmit={handleStart} className="space-y-4">
          
          {/* Pilihan Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="RENEWAL">RENEWAL</option>
              <option value="ACTIVATION">ACTIVATION</option>
            </select>
          </div>

          {/* Pilihan Exam No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam No.</label>
            <select 
              value={examNo}
              onChange={(e) => setExamNo(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          {/* Input Kode Rahasia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
            <input 
              type="text" 
              required
              placeholder="Enter Code (e.g. 123456)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 tracking-widest font-mono"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 mt-4 text-white font-bold rounded transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {loading ? 'Verifying...' : 'START EXAM'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Wrapper Suspense Wajib untuk useSearchParams di Next.js
export default function SelectExamPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <SelectExamContent />
    </Suspense>
  )
}