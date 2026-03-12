'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: examResultId } = use(params)
  
  // State untuk menyimpan email kandidat
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCandidateEmail = async () => {
      try {
        // Tarik data email dari tabel candidates melalui relasi exam_results
        const { data, error } = await supabase
          .from('exam_results')
          .select('candidates(email)')
          .eq('id', examResultId)
          .single()

        if (data && data.candidates) {
          // Supabase bisa mengembalikan object tunggal atau array tergantung setingan relasi foreign key
          const candidateEmail = Array.isArray(data.candidates) 
            ? data.candidates[0]?.email 
            : (data.candidates as any).email;
            
          if (candidateEmail) {
            setEmail(candidateEmail)
          }
        }
      } catch (err) {
        console.error("Error fetching email:", err)
      } finally {
        setLoading(false)
      }
    }

    if (examResultId) {
      fetchCandidateEmail()
    }
  }, [examResultId])
  
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden">
        
        {/* ========================================== */}
        {/* BACKGROUND GA3.jpg (20% GELAP)             */}
        {/* ========================================== */}
        <div className="fixed inset-0 z-0 bg-white">
            <div className="absolute inset-0 bg-[url('/GA3.jpg')] bg-cover bg-center"></div>
            <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* ========================================== */}
        {/* CARD RESULT (GLASSMORPHISM MODERN)         */ }
        {/* ========================================== */}
        <div className="relative z-10 max-w-lg w-full bg-white/95 backdrop-blur-xl shadow-[0_35px_100px_rgba(0,16,42,0.4)] rounded-3xl overflow-hidden border border-white/30 text-center animate-in fade-in zoom-in duration-700">
            
            {/* Header Success / Green Panel */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-white relative overflow-hidden">
                {/* Aksen Motif Transparan */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl border-4 border-green-300/40">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black tracking-[0.2em] uppercase text-white drop-shadow-md">
                    Exam Completed
                </h1>
            </div>

            {/* Body Content */}
            <div className="p-8 space-y-9 bg-white">
                <div>
                    <h2 className="text-3xl font-black text-[#002561] mb-3">Thank You!</h2>
                    <p className="text-gray-500 text-sm font-semibold leading-relaxed px-2">
                        Your examination answers have been securely saved and submitted to the centralized system for verification.
                    </p>
                </div>

                {/* Notifikasi Email Dinamis */}
                <div className="bg-[#F4F6F9] border border-gray-200 p-6 rounded-2xl relative overflow-hidden shadow-inner">
                    {/* Aksen Garis Kiri */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#009CB4]"></div>
                    
                    <p className="text-xs font-black text-[#009CB4] uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        Notification
                    </p>
                    <p className="text-sm text-gray-700 font-medium">
                        The final official evaluation result <br/> 
                        <span className="font-bold text-[#002561]">(PASSED / FAILED)</span> <br/> 
                        will be sent directly to:
                    </p>

                    {/* Badge Penampil Email */}
                    <div className="mt-4 py-2.5 px-6 bg-white border-2 border-gray-200 rounded-xl inline-block shadow-sm">
                        {loading ? (
                            <span className="text-[#009CB4] font-bold text-sm animate-pulse flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-[#009CB4] border-t-transparent rounded-full animate-spin"></span>
                                Retrieving Email...
                            </span>
                        ) : (
                            <span className="text-[#002561] font-black tracking-wide text-sm md:text-base">
                                {email || 'your registered email'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Button Kembali */}
                <button onClick={() => router.push('/')} 
                    className="w-full py-4 bg-[#002561] hover:bg-[#001c4a] text-white font-black tracking-widest uppercase rounded-2xl transition-all shadow-xl shadow-[#002561]/30 hover:scale-[1.02] active:scale-[0.98]">
                    Return to Homepage
                </button>
            </div>
        </div>
    </div>
  )
}