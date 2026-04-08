'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient' 
import Link from 'next/link'

export default function AddQuestionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [typeOfAC, setTypeOfAC] = useState('Airbus A330-Series')
  const [kategori, setKategori] = useState('Airframe & Powerplant')
  const [subject, setSubject] = useState('INITIAL')
  const [examNo, setExamNo] = useState('1')
  const [questionText, setQuestionText] = useState('')
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [optC, setOptC] = useState('')
  const [optD, setOptD] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('A')

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // LOGIKA PENYIMPANAN 100% AMAN (TIDAK DISENTUH)
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .insert([{
        type_of_ac: typeOfAC,
        kategori: kategori,
        subject: subject,
        exam_no: parseInt(examNo),
        question_text: questionText
      }])
      .select()
      .single()

    if (qError || !qData) {
      alert('Gagal menyimpan soal: ' + (qError?.message || 'Unknown error'))
      setIsSubmitting(false)
      return
    }

    const optionsToInsert = []
    if (optA.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optA.trim(), is_correct: correctAnswer === 'A' })
    if (optB.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optB.trim(), is_correct: correctAnswer === 'B' })
    if (optC.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optC.trim(), is_correct: correctAnswer === 'C' })
    if (optD.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optD.trim(), is_correct: correctAnswer === 'D' })

    if (optionsToInsert.length > 0) {
      const { error: optError } = await supabase.from('options').insert(optionsToInsert)

      if (optError) {
        alert('Soal tersimpan, tapi gagal menyimpan jawaban: ' + optError.message)
      } else {
        alert('✅ Soal berhasil ditambahkan ke Bank Soal!')
        setQuestionText('')
        setOptA(''); setOptB(''); setOptC(''); setOptD('')
        setCorrectAnswer('A')
      }
    } else {
      alert('⚠️ Soal tersimpan, namun Anda tidak memasukkan satupun pilihan jawaban!')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ========================================== */}
        {/* HEADER AREA                                */}
        {/* ========================================== */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#002561] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden gap-6">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#009CB4] opacity-20 skew-x-[-20deg] translate-x-10 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-4">
              <span className="p-2.5 bg-white/10 rounded-xl text-xl shadow-inner">➕</span> Add Question
            </h1>
            <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-2">MANUAL ENTRY TO QUESTION BANK</p>
          </div>
          <Link href="/admin" className="relative z-10 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2 shadow-lg">
            <span>🔙</span> Back to Dashboard
          </Link>
        </div>

        {/* ========================================== */}
        {/* MAIN FORM: SPLIT PANEL DESIGN              */}
        {/* ========================================== */}
        <form onSubmit={handleSubmitQuestion} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* KOLOM KIRI: PANEL PENGATURAN (1/3 Layar) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-[#e5e7eb] sticky top-8">
              <div className="flex items-center gap-3 mb-6 border-b border-[#f3f4f6] pb-4">
                <span className="text-xl">⚙️</span>
                <h2 className="font-black text-[#002561] tracking-wider uppercase text-sm">Module Settings</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black text-[#6b7280] mb-1.5 uppercase tracking-wider pl-1">Type of A/C</label>
                  <select value={typeOfAC} onChange={(e) => setTypeOfAC(e.target.value)} className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold text-sm cursor-pointer shadow-sm">
                    <option value="Airbus A330-Series">Airbus A330-Series</option>
                    <option value="Airbus A330 NEO">Airbus A330 NEO</option>
                    <option value="B737-800 NG">B737-800 NG</option>
                    <option value="B737-MAX">B737-MAX</option>
                    <option value="B777-300 ER">B777-300 ER</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-black text-[#6b7280] mb-1.5 uppercase tracking-wider pl-1">Category</label>
                  <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold text-sm cursor-pointer shadow-sm">
                    <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                    <option value="Electric & Avionic">Electric & Avionic</option>
                    <option value="REGULASI">REGULASI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-black text-[#6b7280] mb-1.5 uppercase tracking-wider pl-1">Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold text-sm cursor-pointer shadow-sm">
                    <option value="INITIAL">INITIAL</option>
                    <option value="RENEWAL">RENEWAL</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-black text-[#6b7280] mb-1.5 uppercase tracking-wider pl-1">Exam No</label>
                  <select value={examNo} onChange={(e) => setExamNo(e.target.value)} className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#002561] font-bold text-sm cursor-pointer shadow-sm text-center">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: KANVAS SOAL (2/3 Layar) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-[#e5e7eb] flex flex-col h-full relative">
              
              <div className="flex items-center gap-3 mb-6 border-b border-[#f3f4f6] pb-4">
                <span className="text-xl">📝</span>
                <h2 className="font-black text-[#002561] tracking-wider uppercase text-sm">Question Canvas</h2>
              </div>

              {/* TAHAP 3: AREA KETIK SOAL DISTRACTION-FREE */}
              <div className="mb-8">
                <label className="block text-xs font-black text-[#002561] mb-2 uppercase tracking-widest pl-1">Question Text</label>
                <div className="relative group">
                  {/* Efek glowing di belakang text area saat focus */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#009CB4] to-[#002561] rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                  <textarea 
                    required 
                    rows={5} 
                    value={questionText} 
                    onChange={(e) => setQuestionText(e.target.value)} 
                    placeholder="Type or paste your detailed question here..." 
                    className="relative w-full bg-white border-2 border-[#e5e7eb] rounded-2xl p-5 md:p-6 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#1f2937] text-base leading-relaxed shadow-sm resize-y placeholder-gray-400" 
                  />
                  {/* Penghitung karakter halus */}
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-gray-400 opacity-0 group-focus-within:opacity-100 transition-opacity bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                    {questionText.length} chars
                  </div>
                </div>
              </div>

              {/* TAHAP 2: AREA PILIHAN GANDA (INTERACTIVE CARDS) */}
              <div className="mb-10 flex-1">
                <div className="flex items-center justify-between mb-4 pl-1">
                  <label className="text-xs font-black text-[#002561] uppercase tracking-widest">Answer Options</label>
                  <span className="text-[10px] font-bold text-[#009CB4] bg-[#009CB4]/10 px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#009CB4]/20">Select 1 Correct Answer</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* KARTU OPSI A */}
                  <div className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${correctAnswer === 'A' ? 'bg-[#10b981]/5 border-[#10b981] shadow-[0_4px_15px_rgba(16,185,129,0.15)] scale-[1.01]' : 'bg-white border-[#e5e7eb] hover:border-[#d1d5db]'}`}>
                    <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-2 mb-1">
                      <span className={`font-black text-lg ${correctAnswer === 'A' ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>Option A</span>
                      <button type="button" onClick={() => setCorrectAnswer('A')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${correctAnswer === 'A' ? 'bg-[#10b981] text-white shadow-md' : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-gray-600'}`}>
                        {correctAnswer === 'A' ? '✓ Correct Answer' : 'Mark as Correct'}
                      </button>
                    </div>
                    <textarea required rows={2} value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Type answer for Option A here..." className="w-full bg-transparent outline-none text-sm font-medium text-[#1f2937] resize-none" />
                  </div>
                  
                  {/* KARTU OPSI B */}
                  <div className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${correctAnswer === 'B' ? 'bg-[#10b981]/5 border-[#10b981] shadow-[0_4px_15px_rgba(16,185,129,0.15)] scale-[1.01]' : 'bg-white border-[#e5e7eb] hover:border-[#d1d5db]'}`}>
                    <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-2 mb-1">
                      <span className={`font-black text-lg ${correctAnswer === 'B' ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>Option B</span>
                      <button type="button" onClick={() => setCorrectAnswer('B')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${correctAnswer === 'B' ? 'bg-[#10b981] text-white shadow-md' : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-gray-600'}`}>
                        {correctAnswer === 'B' ? '✓ Correct Answer' : 'Mark as Correct'}
                      </button>
                    </div>
                    <textarea required rows={2} value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Type answer for Option B here..." className="w-full bg-transparent outline-none text-sm font-medium text-[#1f2937] resize-none" />
                  </div>
                  
                  {/* KARTU OPSI C */}
                  <div className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${correctAnswer === 'C' ? 'bg-[#10b981]/5 border-[#10b981] shadow-[0_4px_15px_rgba(16,185,129,0.15)] scale-[1.01]' : 'bg-white border-[#e5e7eb] hover:border-[#d1d5db]'}`}>
                    <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-2 mb-1">
                      <span className={`font-black text-lg ${correctAnswer === 'C' ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>Option C</span>
                      <button type="button" onClick={() => setCorrectAnswer('C')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${correctAnswer === 'C' ? 'bg-[#10b981] text-white shadow-md' : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-gray-600'}`}>
                        {correctAnswer === 'C' ? '✓ Correct Answer' : 'Mark as Correct'}
                      </button>
                    </div>
                    <textarea rows={2} value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="(Optional) Type answer for Option C here..." className="w-full bg-transparent outline-none text-sm font-medium text-[#1f2937] resize-none" />
                  </div>
                  
                  {/* KARTU OPSI D */}
                  <div className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${correctAnswer === 'D' ? 'bg-[#10b981]/5 border-[#10b981] shadow-[0_4px_15px_rgba(16,185,129,0.15)] scale-[1.01]' : 'bg-white border-[#e5e7eb] hover:border-[#d1d5db]'}`}>
                    <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-2 mb-1">
                      <span className={`font-black text-lg ${correctAnswer === 'D' ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>Option D</span>
                      <button type="button" onClick={() => setCorrectAnswer('D')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${correctAnswer === 'D' ? 'bg-[#10b981] text-white shadow-md' : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-gray-600'}`}>
                        {correctAnswer === 'D' ? '✓ Correct Answer' : 'Mark as Correct'}
                      </button>
                    </div>
                    <textarea rows={2} value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="(Optional) Type answer for Option D here..." className="w-full bg-transparent outline-none text-sm font-medium text-[#1f2937] resize-none" />
                  </div>

                </div>
              </div>

              {/* TAHAP 4: FLOATING ACTION BUTTON */}
              <div className="mt-auto pt-4">
                <button type="submit" disabled={isSubmitting} className={`relative w-full py-4 text-white font-black tracking-[0.2em] uppercase rounded-xl overflow-hidden transition-all duration-300 transform shadow-[0_8px_20px_rgba(0,37,97,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(0,37,97,0.4)] ${isSubmitting ? 'bg-gray-400 cursor-not-allowed shadow-none hover:translate-y-0' : 'bg-gradient-to-r from-[#002561] to-[#004294]'}`}>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isSubmitting ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving to Database...</>
                    ) : (
                      <>💾 Save Question to Bank</>
                    )}
                  </span>
                  {/* Efek kilauan saat di-hover */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
              </div>

            </div>
          </div>
        </form>

      </div>
    </div>
  )
}