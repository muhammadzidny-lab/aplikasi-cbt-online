'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient' 

function SelectExamContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personnelNo = searchParams.get('personnelNo')
  
  const [loading, setLoading] = useState(false)
  
  const [typeOfAC, setTypeOfAC] = useState('Airbus A330-Series') // Default A330
  const [kategori, setKategori] = useState('Airframe & Powerplant')
  const [subject, setSubject] = useState('RENEWAL')
  const [examNo, setExamNo] = useState('1') 
  const [accessCode, setAccessCode] = useState('')

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!personnelNo) {
      alert('Error: Personnel No tidak ditemukan. Silakan kembali ke halaman pendaftaran.')
      router.push('/')
      return
    }

    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('personnel_no', personnelNo)
      .order('created_at', { ascending: false }) 
      .limit(1)
      .maybeSingle()

    if (candidateError || !candidateData) {
      alert('Data kandidat tidak ditemukan. Silakan daftar ulang.')
      setLoading(false)
      return
    }
    const candidateInternalId = candidateData.id

    const { data: tokenData, error: tokenError } = await supabase
      .from('exam_tokens')
      .select('*')
      .eq('type_of_ac', typeOfAC)
      .eq('kategori', kategori)
      .eq('subject', subject)
      .eq('exam_no', parseInt(examNo))
      .eq('access_code', accessCode)
      .single()

    if (tokenError || !tokenData) {
      alert('KODE SALAH! Pastikan Type A/C, Kategori, Subject, Exam No, dan Kode semuanya sesuai dengan dari Pengawas.')
      setLoading(false)
      return
    }

    if (tokenData.is_active !== true) {
      alert('UJIAN BELUM DIBUKA ATAU SUDAH DITUTUP OLEH PENGAWAS.')
      setLoading(false)
      return
    }

    const { data: existingResult } = await supabase
      .from('exam_results')
      .select('id, status')
      .eq('candidate_id', candidateInternalId) 
      .eq('type_of_ac', typeOfAC)
      .eq('kategori', kategori)
      .eq('subject', subject)
      .eq('exam_no', parseInt(examNo))
      .maybeSingle() 

    if (existingResult) {
      if (existingResult.status === 'COMPLETED') {
         alert('ANDA SUDAH MENYELESAIKAN UJIAN INI! Anda tidak diizinkan mengulang.')
         setLoading(false)
         return
      } else {
         router.push(`/exam/${existingResult.id}`)
         return
      }
    }

    const { data: resultData, error: resultError } = await supabase
      .from('exam_results')
      .insert([{
        candidate_id: candidateInternalId, 
        type_of_ac: typeOfAC,
        kategori: kategori,
        subject: subject,
        exam_no: parseInt(examNo),
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (resultError) {
      alert('Gagal memulai ujian: ' + resultError.message)
      setLoading(false)
    } else {
      router.push(`/exam/${resultData.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-12 px-4 flex items-center justify-center font-sans">
      
      {/* ========================================== */}
      {/* CARD FORM DENGAN DESAIN MODERN SOLID BIKIN FOKUS */}
      {/* ========================================== */}
      <div className="max-w-md w-full bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-gray-100 p-8 md:p-10">
        
        {/* HEADER MINIMALIS */}
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#002561]/10 text-[#002561] text-[10px] font-black tracking-widest uppercase mb-4 border border-[#002561]/10">
            ID: {personnelNo || 'UNKNOWN'}
          </span>
          <h1 className="text-3xl font-black text-[#002561] tracking-widest uppercase">
            Select Exam
          </h1>
          <div className="w-12 h-1.5 bg-[#009CB4] mx-auto mt-4 rounded-full"></div>
        </div>

        <form onSubmit={handleStart} className="space-y-5">
          
          {/* INPUT FIELDS DENGAN DESAIN MODERN */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Type of A/C</label>
            <select value={typeOfAC} onChange={(e) => setTypeOfAC(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer appearance-none hover:bg-gray-100">
              <option value="Airbus A330-Series">Airbus A330-Series</option>
              <option value="Airbus A330 NEO">Airbus A330 NEO</option>
              <option value="B737-800 NG">B737-800 NG</option>
              <option value="B737-MAX">B737-MAX</option>
              <option value="B777-300 ER">B777-300 ER</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Kategori</label>
            <select value={kategori} onChange={(e) => setKategori(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer appearance-none hover:bg-gray-100">
              <option value="Airframe & Powerplant">Airframe & Powerplant</option>
              <option value="Electric & Avionic">Electric & Avionic</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer appearance-none hover:bg-gray-100">
                <option value="RENEWAL">RENEWAL</option>
                <option value="INITIAL">INITIAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Exam No.</label>
              <select value={examNo} onChange={(e) => setExamNo(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer appearance-none hover:bg-gray-100 text-center">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>

          {/* DIVIDER HALUS */}
          <div className="py-2">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          </div>

          {/* ACCESS CODE DENGAN GAYA PIN/TOKEN MODERN */}
          <div>
            <label className="block text-[11px] font-bold text-[#009CB4] tracking-widest mb-2 uppercase text-center">Security Access Code</label>
            <input type="text" required placeholder="1CB1R2" value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} 
              className="w-full bg-gray-50 border-2 border-[#002561]/10 rounded-2xl p-4 text-center text-2xl focus:ring-0 focus:bg-white focus:border-[#009CB4] focus:shadow-[0_0_15px_rgba(0,156,180,0.1)] outline-none tracking-[0.4em] font-mono font-black text-[#002561] uppercase transition-all placeholder-gray-300" />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading} 
              className={`w-full py-4 px-6 text-white font-black tracking-widest uppercase rounded-2xl shadow-lg transition-all duration-300 transform 
                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002561] hover:bg-[#001c4a] hover:scale-[1.02] hover:shadow-xl hover:shadow-[#002561]/20'}`}>
              {loading ? 'Authenticating...' : 'Enter Examination'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default function SelectExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#009CB4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-[#002561] font-bold tracking-widest uppercase animate-pulse text-sm">Loading Environment...</div>
        </div>
      </div>
    }>
      <SelectExamContent />
    </Suspense>
  )
}