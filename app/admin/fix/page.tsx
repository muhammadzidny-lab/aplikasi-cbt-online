'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

// ==========================================
// DAFTAR KATA KUNCI BAHASA INDONESIA
// ==========================================
const ID_KEYWORDS = [
  ' yang ', ' adalah ', ' dan ', ' untuk ', ' dengan ', 
  ' apakah ', ' bagaimana ', ' dari ', ' pada ', ' tidak ',
  ' atau ', ' jika ', ' karena ', ' sebuah ', ' suatu '
]

type IssueItem = {
  id: string
  type: 'QUESTION' | 'OPTION'
  original_text: string
  parent_info?: string 
}

export default function FixQuestionsPage() {
  const [loading, setLoading] = useState(true)
  
  // State untuk Tab (Ditambah Tab LANGUAGE)
  const [activeTab, setActiveTab] = useState<'OPTIONS' | 'DUPLICATES' | 'LANGUAGE'>('OPTIONS')
  
  // State untuk Data
  const [badQuestions, setBadQuestions] = useState<any[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<any[][]>([])
  const [languageIssues, setLanguageIssues] = useState<IssueItem[]>([]) // State Baru Language Scanner
  
  // State Filter Ganda
  const [filterAc, setFilterAc] = useState('ALL')
  const [filterCat, setFilterCat] = useState('ALL')
  
  // State Input & Loading per Item
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [newOptions, setNewOptions] = useState<Record<string, string>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({}) // State Terjemahan Baru

  const fetchBadQuestions = async () => {
    setLoading(true)
    setBadQuestions([]) 
    setDuplicateGroups([])
    setLanguageIssues([])

    let query = supabase
      .from('questions')
      .select('id, question_text, type_of_ac, kategori, subject, options(id, option_text, is_correct)')
      .limit(3000) 

    if (filterAc !== 'ALL') query = query.eq('type_of_ac', filterAc)
    if (filterCat !== 'ALL') query = query.eq('kategori', filterCat)

    const { data, error } = await query

    if (error) {
      console.error(error)
      alert('Failed to retrieve data: ' + error.message)
    } else if (data) {
      // 1. CARI SOAL YANG PILIHANNYA KURANG DARI 4
      const missingOptions = data.filter((q: any) => q.options && q.options.length < 4)
      setBadQuestions(missingOptions)

      // 2. CARI SOAL DUPLIKAT
      const tracker: Record<string, any[]> = {}
      const detectedLanguageIssues: IssueItem[] = [] // Penampung Language Scanner

      data.forEach((q: any) => {
         // --- Logika Duplikat ---
         const normalizedText = q.question_text.trim().toLowerCase()
         const key = `${q.type_of_ac}_${q.kategori}_${normalizedText}`
         if (!tracker[key]) tracker[key] = []
         tracker[key].push(q)

         // --- Logika Language Scanner (Soal) ---
         const qTextLower = ` ${q.question_text.toLowerCase()} ` // Tambah spasi agar akurat
         const isQIndonesian = ID_KEYWORDS.some(kw => qTextLower.includes(kw))
         if (isQIndonesian) {
           detectedLanguageIssues.push({
             id: q.id,
             type: 'QUESTION',
             original_text: q.question_text,
             parent_info: `${q.type_of_ac || 'Unknown AC'} | ${q.kategori || 'Unknown Cat'}`
           })
         }

         // --- Logika Language Scanner (Opsi) ---
         if (q.options) {
           q.options.forEach((o: any) => {
             if (!o.option_text) return
             const oTextLower = ` ${o.option_text.toLowerCase()} `
             const isOIndonesian = ID_KEYWORDS.some(kw => oTextLower.includes(kw))
             if (isOIndonesian) {
               detectedLanguageIssues.push({
                 id: o.id,
                 type: 'OPTION',
                 original_text: o.option_text,
                 parent_info: `Opsi dari: "${q.question_text.substring(0, 60)}..."`
               })
             }
           })
         }
      })

      // Kumpulkan Grup Duplikat
      const duplicates: any[][] = []
      for (const key in tracker) {
        if (tracker[key].length > 1) {
          duplicates.push(tracker[key])
        }
      }
      setDuplicateGroups(duplicates)
      
      // Simpan Hasil Scan Bahasa
      setLanguageIssues(detectedLanguageIssues)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBadQuestions()
  }, [filterAc, filterCat])

  // ==========================================
  // FUNGSI UNTUK TAB 1 (TAMBAH OPSI)
  // ==========================================
  const handleTextChange = (questionId: string, text: string) => {
    setNewOptions(prev => ({ ...prev, [questionId]: text }))
  }

  const handleAddOption = async (questionId: string) => {
    const optionText = newOptions[questionId]
    if (!optionText || optionText.trim() === '') return alert('Option text cannot be empty!')

    setSubmittingId(questionId)
    const { error } = await supabase.from('options').insert([{ question_id: questionId, option_text: optionText, is_correct: false }])

    if (error) alert('Failed to add option: ' + error.message)
    else {
      setBadQuestions(prev => prev.filter(q => q.id !== questionId))
      setNewOptions(prev => { const copy = { ...prev }; delete copy[questionId]; return copy })
    }
    setSubmittingId(null)
  }

  // ==========================================
  // FUNGSI UNTUK TAB 2 (HAPUS DUPLIKAT)
  // ==========================================
  const handleDeleteDuplicate = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this question from the database?')) return
    setSubmittingId(questionId)
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) alert('Failed to delete question: ' + error.message)
    else fetchBadQuestions()
    setSubmittingId(null)
  }

  const handleDeleteAllDuplicates = async (group: any[]) => {
    const idsToDelete = group.slice(1).map(q => q.id)
    if (!window.confirm(`The system will retain the first definitive version and DELETE ${idsToDelete.length} duplicates simultaneously.\n\nProceed?`)) return
    
    setSubmittingId('batch_delete')
    const { error } = await supabase.from('questions').delete().in('id', idsToDelete)
    
    if (error) alert('Bulk delete failed: ' + error.message)
    else fetchBadQuestions()
    
    setSubmittingId(null)
  }

  const handleNukeAllDuplicates = async () => {
    let allIdsToDelete: string[] = []
    
    duplicateGroups.forEach(group => {
       const ids = group.slice(1).map(q => q.id) 
       allIdsToDelete = [...allIdsToDelete, ...ids]
    })

    if (allIdsToDelete.length === 0) return
    if (!window.confirm(`⚠️ MASS PURGE WARNING!\n\nThe system detected ${duplicateGroups.length} duplicate groups.\nThis action will PURGE A TOTAL OF ${allIdsToDelete.length} DUPLICATE QUESTIONS simultaneously from the database!\n\nAre you sure you want to execute this irreversible action?`)) return

    setSubmittingId('nuke_all')

    const chunkSize = 100
    let hasError = false

    for (let i = 0; i < allIdsToDelete.length; i += chunkSize) {
       const chunk = allIdsToDelete.slice(i, i + chunkSize)
       const { error } = await supabase.from('questions').delete().in('id', chunk)
       if (error) {
          console.error('Error during Mass Purge:', error)
          hasError = true
       }
    }

    if (hasError) alert('Some questions failed to delete because they are locked by candidate exam records. Please clear the associated exam sessions in the Admin Dashboard first.')
    else alert(`🎉 SUCCESS! ${allIdsToDelete.length} duplicate questions have been permanently purged.`)
    
    fetchBadQuestions()
    setSubmittingId(null)
  }

  // ==========================================
  // FUNGSI UNTUK TAB 3 (LANGUAGE SCANNER)
  // ==========================================
  const handleTranslationChange = (id: string, text: string) => {
    setTranslations(prev => ({ ...prev, [id]: text }))
  }

  const handleUpdateTranslation = async (item: IssueItem) => {
    const newText = translations[item.id]
    if (!newText || newText.trim() === '') {
      alert('Terjemahan tidak boleh kosong!')
      return
    }

    setSubmittingId(item.id)

    let error = null
    if (item.type === 'QUESTION') {
      const res = await supabase.from('questions').update({ question_text: newText.trim() }).eq('id', item.id)
      error = res.error
    } else {
      const res = await supabase.from('options').update({ option_text: newText.trim() }).eq('id', item.id)
      error = res.error
    }

    if (error) {
      alert(`Gagal mengupdate: ${error.message}`)
    } else {
      setLanguageIssues(prev => prev.filter(i => i.id !== item.id))
      setTranslations(prev => { const copy = { ...prev }; delete copy[item.id]; return copy })
    }
    setSubmittingId(null)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ========================================== */}
        {/* HEADER & FILTER GANDA                      */}
        {/* ========================================== */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center bg-[#002561] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden gap-6">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#009CB4] opacity-20 skew-x-[-20deg] translate-x-10 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-4">
              <span className="p-2.5 bg-white/10 rounded-xl text-xl shadow-inner">🛠️</span> Database Manager
            </h1>
            <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-2">DIAGNOSTICS & HYGIENE CENTER</p>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row flex-wrap gap-3 items-center w-full lg:w-auto">
            <select value={filterAc} onChange={(e) => setFilterAc(e.target.value)} className="w-full md:w-auto bg-white text-[#002561] font-bold py-3 px-4 rounded-xl outline-none shadow-lg cursor-pointer text-xs uppercase tracking-wider focus:ring-2 focus:ring-[#009CB4] transition-all">
              <option value="ALL">All Aircrafts & Regulations</option>
              <option value="REGULASI">REGULATIONS Only</option>
              <option value="Airbus A330-Series">Airbus A330-Series</option>
              <option value="Airbus A330 NEO">Airbus A330 NEO</option>
              <option value="B737-800 NG">B737-800 NG</option>
              <option value="B737-MAX">B737-MAX</option>
              <option value="B777-300 ER">B777-300 ER</option>
            </select>

            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="w-full md:w-auto bg-white text-[#002561] font-bold py-3 px-4 rounded-xl outline-none shadow-lg cursor-pointer text-xs uppercase tracking-wider focus:ring-2 focus:ring-[#009CB4] transition-all">
              <option value="ALL">All Categories</option>
              <option value="Airframe & Powerplant">AP (Airframe & Powerplant)</option>
              <option value="Electric & Avionic">EA (Electric & Avionic)</option>
              <option value="General">General (Regulations)</option>
            </select>

            <Link href="/admin" className="w-full md:w-auto text-center px-6 py-3 bg-[#009CB4] hover:bg-[#007b8e] rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,156,180,0.4)] transition-all">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* ========================================== */}
        {/* TABS NAVIGATION (MODERN PILLS)             */}
        {/* ========================================== */}
        <div className="flex bg-white shadow-md rounded-2xl p-1.5 gap-1 border border-[#e5e7eb] flex-col md:flex-row overflow-hidden">
           <button onClick={() => setActiveTab('OPTIONS')} className={`flex-1 py-4 px-2 rounded-xl font-black text-[11px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'OPTIONS' ? 'bg-[#002561] text-white shadow-md' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
              ⚠️ Incomplete Options <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'OPTIONS' ? 'bg-white/20' : 'bg-gray-200'}`}>{badQuestions.length}</span>
           </button>
           <button onClick={() => setActiveTab('DUPLICATES')} className={`flex-1 py-4 px-2 rounded-xl font-black text-[11px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'DUPLICATES' ? 'bg-[#002561] text-white shadow-md' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
              🗂️ Duplicates <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'DUPLICATES' ? 'bg-white/20' : 'bg-gray-200'}`}>{duplicateGroups.length}</span>
           </button>
           <button onClick={() => setActiveTab('LANGUAGE')} className={`flex-1 py-4 px-2 rounded-xl font-black text-[11px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'LANGUAGE' ? 'bg-[#002561] text-white shadow-md' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
              🌐 Language Scan <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'LANGUAGE' ? 'bg-white/20' : 'bg-gray-200'}`}>{languageIssues.length}</span>
           </button>
        </div>

        {/* ========================================== */}
        {/* LOADING STATE                              */}
        {/* ========================================== */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <div className="w-16 h-16 border-4 border-[#009CB4] border-t-transparent rounded-full animate-spin mb-6"></div>
            <div className="text-[#002561] font-black tracking-widest uppercase animate-pulse">Scanning Database Anomalies...</div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ========================================== */}
            {/* KONTEN TAB 1: PILIHAN KURANG               */}
            {/* ========================================== */}
            {activeTab === 'OPTIONS' && (
              badQuestions.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl shadow-lg border border-[#e5e7eb] text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-full flex items-center justify-center text-4xl mb-4">🎉</div>
                  <h3 className="text-[#10b981] font-black text-xl tracking-widest uppercase mb-2">System Healthy</h3>
                  <p className="text-[#6b7280] font-medium">All questions in this query have at least 4 options.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {badQuestions.map((q, index) => (
                    <div key={q.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-[#e5e7eb] relative overflow-hidden">
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-[#f59e0b]"></div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 pl-2">
                        <h2 className="text-lg font-bold text-[#1f2937] leading-relaxed"><span className="text-[#009CB4] font-black mr-3">#{index + 1}</span>{q.question_text}</h2>
                        <span className="text-[10px] font-black tracking-widest uppercase bg-[#f3f4f6] px-3 py-1.5 rounded-lg text-[#6b7280] border border-[#d1d5db] whitespace-nowrap">
                          {q.type_of_ac} | {q.kategori}
                        </span>
                      </div>
                      
                      <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e7eb] mb-6 space-y-2 ml-2">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className="flex items-start gap-2 text-sm text-[#4b5563]">
                            <span className="text-[#009CB4] mt-0.5">•</span> 
                            <span>{opt.option_text} {opt.is_correct && <span className="text-[#10b981] font-bold ml-2 bg-[#10b981]/10 px-2 py-0.5 rounded text-xs">(Correct Answer)</span>}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-3 pl-2">
                        <input 
                          type="text" 
                          placeholder="Type the missing option here..." 
                          value={newOptions[q.id] || ''} 
                          onChange={(e) => handleTextChange(q.id, e.target.value)} 
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(q.id) }} 
                          className="flex-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-all text-[#1f2937] text-sm shadow-inner" 
                        />
                        <button 
                          onClick={() => handleAddOption(q.id)} 
                          disabled={submittingId === q.id} 
                          className="bg-[#002561] hover:bg-[#00102a] text-white font-black tracking-widest uppercase text-xs px-6 py-3 rounded-xl shadow-md transition-all disabled:bg-gray-400 whitespace-nowrap"
                        >
                          {submittingId === q.id ? 'Saving...' : '💾 Save Option'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ========================================== */}
            {/* KONTEN TAB 2: SOAL DUPLIKAT                */}
            {/* ========================================== */}
            {activeTab === 'DUPLICATES' && (
              duplicateGroups.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl shadow-lg border border-[#e5e7eb] text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-full flex items-center justify-center text-4xl mb-4">✨</div>
                  <h3 className="text-[#10b981] font-black text-xl tracking-widest uppercase mb-2">Database Clean</h3>
                  <p className="text-[#6b7280] font-medium">No duplicate questions detected in this query.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* TOMBOL NUKLIR (GLOBAL) */}
                  <div className="bg-[#ef4444]/5 border-2 border-[#ef4444] p-6 md:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none">🚨</div>
                    <div className="relative z-10">
                      <h3 className="text-[#dc2626] font-black text-xl tracking-widest uppercase mb-2">Master Purge Action</h3>
                      <p className="text-[#7f1d1d] text-sm font-medium">Detected <b>{duplicateGroups.length}</b> duplicate groups. This action will automatically retain 1 definitive version per group and purge the rest simultaneously.</p>
                    </div>
                    <button 
                      onClick={handleNukeAllDuplicates}
                      disabled={submittingId === 'nuke_all'}
                      className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white font-black uppercase tracking-[0.2em] text-sm rounded-xl shadow-[0_8px_20px_rgba(239,68,68,0.3)] flex-shrink-0 animate-pulse hover:animate-none transition-all disabled:bg-gray-400 disabled:shadow-none"
                    >
                      {submittingId === 'nuke_all' ? 'PURGING...' : '🧹 EXECUTE MASTER PURGE'}
                    </button>
                  </div>

                  {/* DAFTAR PER KELOMPOK */}
                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-[#e5e7eb] relative">
                      
                      <div className="mb-6 pb-6 border-b border-[#f3f4f6] flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                         <div>
                           <span className="bg-[#009CB4]/10 text-[#009CB4] border border-[#009CB4]/20 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest mb-3 inline-block">Case #{groupIndex + 1} — {group.length} Duplicates</span>
                           <h2 className="text-lg font-bold text-[#1f2937] leading-relaxed">{group[0].question_text}</h2>
                           <p className="text-xs text-[#6b7280] mt-2 font-bold uppercase tracking-wider">{group[0].type_of_ac} | {group[0].kategori}</p>
                         </div>
                         <button onClick={() => handleDeleteAllDuplicates(group)} disabled={submittingId !== null} className="w-full md:w-auto px-6 py-3 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4b5563] text-[10px] font-black tracking-widest uppercase rounded-xl shadow-sm transition flex-shrink-0 disabled:opacity-50">
                           Purge This Group
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {group.map((q: any, i: number) => (
                          <div key={q.id} className={`border-2 p-5 rounded-2xl relative flex flex-col justify-between transition-all ${i === 0 ? 'bg-[#10b981]/5 border-[#10b981] shadow-sm' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
                            <div>
                              <span className={`absolute -top-3 -left-3 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shadow-md ${i === 0 ? 'bg-[#10b981]' : 'bg-[#6b7280]'}`}>{i+1}</span>
                              {i === 0 && <span className="absolute top-3 right-3 text-[9px] font-black tracking-widest uppercase text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-md">Retained Version</span>}
                              
                              <div className="text-[10px] text-[#9ca3af] mb-3 font-mono font-bold mt-1">ID: {q.id.split('-')[0]}...</div>
                              
                              <div className="space-y-1.5 text-sm mb-6">
                                {q.options.map((opt: any) => (
                                  <div key={opt.id} className={`flex items-start gap-1.5 ${opt.is_correct ? 'text-[#10b981] font-bold' : 'text-[#6b7280]'}`}>
                                    <span>•</span> 
                                    <span>{opt.option_text} {opt.is_correct && '✓'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <button onClick={() => handleDeleteDuplicate(q.id)} disabled={submittingId !== null} className="w-full py-2.5 bg-white border border-[#fca5a5] hover:bg-[#fef2f2] text-[#dc2626] font-black tracking-widest uppercase text-[10px] rounded-xl transition-all mt-auto disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200">
                               🗑️ Delete Version
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ========================================== */}
            {/* KONTEN TAB 3: LANGUAGE SCANNER             */}
            {/* ========================================== */}
            {activeTab === 'LANGUAGE' && (
              languageIssues.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl shadow-lg border border-[#e5e7eb] text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-full flex items-center justify-center text-4xl mb-4">🎉</div>
                  <h3 className="text-[#10b981] font-black text-xl tracking-widest uppercase mb-2">Language Clear</h3>
                  <p className="text-[#6b7280] font-medium">No Indonesian language anomalies detected.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  <div className="bg-[#fffbeb] border border-[#fcd34d] p-5 rounded-2xl flex items-start md:items-center gap-4 shadow-sm">
                    <span className="text-3xl">🔍</span>
                    <p className="text-[#92400e] text-sm font-medium leading-relaxed">
                      System detected <b>{languageIssues.length}</b> items (Questions/Options) indicating Indonesian usage based on keyword heuristics. Please provide English translations below.
                    </p>
                  </div>

                  {languageIssues.map((item, index) => (
                    <div key={item.id} className="bg-white rounded-3xl shadow-lg border border-[#e5e7eb] overflow-hidden flex flex-col lg:flex-row">
                      
                      {/* Bagian Kiri: Info Original */}
                      <div className="bg-[#f9fafb] p-6 lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[#e5e7eb]">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest uppercase text-white shadow-sm ${item.type === 'QUESTION' ? 'bg-[#009CB4]' : 'bg-[#f59e0b]'}`}>
                            {item.type}
                          </span>
                          <span className="text-xs text-[#9ca3af] font-black">#{index + 1}</span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] font-black tracking-wider uppercase mb-3 border-l-2 border-[#d1d5db] pl-2">{item.parent_info}</p>
                        
                        <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm relative">
                           <span className="absolute -top-2.5 right-4 bg-white px-2 text-[10px] font-black text-[#dc2626] uppercase tracking-widest">Original (ID)</span>
                           <p className="text-sm font-medium text-[#1f2937] leading-relaxed">
                             {item.original_text}
                           </p>
                        </div>
                      </div>

                      {/* Bagian Kanan: Form Translate */}
                      <div className="p-6 lg:w-1/2 flex flex-col justify-between bg-white">
                        <div>
                          <label className="block text-xs font-black text-[#002561] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span>🇬🇧</span> English Translation
                          </label>
                          <textarea 
                            rows={4}
                            className="w-full text-sm p-4 border-2 border-[#e5e7eb] rounded-2xl focus:border-[#009CB4] outline-none resize-y bg-[#f9fafb] shadow-inner font-medium text-[#1f2937] placeholder-gray-400"
                            placeholder="Type the English translation here..."
                            value={translations[item.id] || ''}
                            onChange={(e) => handleTranslationChange(item.id, e.target.value)}
                          />
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => handleUpdateTranslation(item)}
                            disabled={submittingId === item.id || !translations[item.id]}
                            className="px-8 py-3 bg-[#002561] hover:bg-[#00102a] text-white text-[11px] font-black tracking-widest uppercase rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {submittingId === item.id ? 'Updating...' : '💾 Update Text'}
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        )}
      </div>
    </div>
  )
}