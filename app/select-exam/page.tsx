'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient' 

function SelectExamContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personnelNo = searchParams.get('personnelNo')
  
  // SEMUA USE-STATE BERKUMPUL DI SINI (Mencegah Hook Error)
  const [loading, setLoading] = useState(false)
  const [examMode, setExamMode] = useState<'REGULAR' | 'WB'>('REGULAR')
  const [typeOfAC, setTypeOfAC] = useState('Airbus A330-Series')
  const [kategori, setKategori] = useState('Airframe & Powerplant')
  const [subject, setSubject] = useState('RENEWAL')
  const [examNo, setExamNo] = useState('1') 
  const [hasRII, setHasRII] = useState('No')

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

    const { data: masterGateData } = await supabase
      .from('exam_tokens')
      .select('is_active')
      .eq('access_code', 'MASTER_GATE')
      .maybeSingle()

    if (!masterGateData || !masterGateData.is_active) {
      alert('🔒 THE EXAM IS NOT OPEN YET!\n\nThe exam session has not been activated. Please wait for instructions from the Invigilator to begin.')
      setLoading(false)
      return
    }

    // OVERRIDE PARAMETER JIKA MODE WEIGHT & BALANCE DIPILIH
    const finalTypeOfAC = examMode === 'WB' ? 'WEIGHT & BALANCE' : typeOfAC;
    const finalKategori = examMode === 'WB' ? 'GENERAL' : kategori;
    const finalSubject = examMode === 'WB' ? 'INITIAL' : subject;
    const finalExamNo = examMode === 'WB' ? 1 : parseInt(examNo);
    const finalHasRII = examMode === 'WB' ? false : (hasRII === 'Yes');

    const { data: existingResult } = await supabase
      .from('exam_results')
      .select('id, status')
      .eq('candidate_id', candidateInternalId) 
      .eq('type_of_ac', finalTypeOfAC)
      .eq('kategori', finalKategori)
      .eq('subject', finalSubject)
      .eq('exam_no', finalExamNo)
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
        type_of_ac: finalTypeOfAC,
        kategori: finalKategori,
        subject: finalSubject,
        exam_no: finalExamNo,
        has_rii: finalHasRII,
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
      <div className="max-w-md w-full bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-gray-100 p-8 md:p-10 transition-all duration-500">
        
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#002561]/10 text-[#002561] text-[10px] font-black tracking-widest uppercase mb-4 border border-[#002561]/10">
            ID: {personnelNo || 'UNKNOWN'}
          </span>
          <h1 className="text-3xl font-black text-[#002561] tracking-widest uppercase">
            Select Module
          </h1>
          <div className="w-12 h-1.5 bg-[#009CB4] mx-auto mt-4 rounded-full"></div>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          
          {/* TOGGLE EXAM MODE */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner">
            <button type="button" onClick={() => setExamMode('REGULAR')} 
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${examMode === 'REGULAR' ? 'bg-white shadow-md text-[#002561] scale-100' : 'text-gray-400 hover:text-gray-600 scale-95'}`}>
              Regular A/C
            </button>
            <button type="button" onClick={() => setExamMode('WB')} 
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${examMode === 'WB' ? 'bg-[#002561] shadow-md text-white scale-100' : 'text-gray-400 hover:text-gray-600 scale-95'}`}>
              Weight & Balance
            </button>
          </div>

          {examMode === 'REGULAR' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Type of A/C</label>
                <select value={typeOfAC} onChange={(e) => setTypeOfAC(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer hover:bg-gray-100">
                  <option value="Airbus A330-Series">Airbus A330-Series</option>
                  <option value="Airbus A330 NEO">Airbus A330 NEO</option>
                  <option value="B737-800 NG">B737-800 NG</option>
                  <option value="B737-MAX">B737-MAX</option>
                  <option value="B777-300 ER">B777-300 ER</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Kategori</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer hover:bg-gray-100">
                  <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                  <option value="Electric & Avionic">Electric & Avionic</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">RII Authorization</label>
                <select value={hasRII} onChange={(e) => setHasRII(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer hover:bg-gray-100">
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer hover:bg-gray-100">
                    <option value="RENEWAL">RENEWAL</option>
                    <option value="INITIAL">INITIAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase ml-1">Exam No.</label>
                  <select value={examNo} onChange={(e) => setExamNo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold cursor-pointer text-center hover:bg-gray-100">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center animate-in fade-in zoom-in duration-500 bg-[#009CB4]/5 rounded-2xl border border-[#009CB4]/20">
               <span className="text-4xl mb-3 block">⚖️</span>
               <h3 className="font-black text-[#002561] tracking-widest uppercase text-lg">Weight & Balance</h3>
               <p className="text-xs font-bold text-gray-500 mt-2 px-6">30 Multiple Choice Questions.<br/>Time Limit: 120 Minutes.</p>
            </div>
          )}

          <div className="py-1">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} 
              className={`group relative w-full flex justify-center py-4 px-6 border border-transparent text-sm font-black rounded-2xl text-white uppercase tracking-[0.2em] transition-all duration-300 transform shadow-[0_8px_20px_rgba(0,37,97,0.2)]
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#002561] to-[#004294] hover:from-[#001c4a] hover:to-[#002561] hover:shadow-[0_10px_25px_rgba(0,37,97,0.4)] hover:-translate-y-1'
                }`}>
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Checking Gate...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Enter Examination
                  <svg className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SelectExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">Loading...</div>}>
      <SelectExamContent />
    </Suspense>
  )
} 