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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER & FILTER GANDA */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-red-600 text-white p-6 rounded-t-lg shadow-lg">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">🛠️ Database Integrity Manager</h1>
            <p className="text-red-100 text-sm mt-1">Centralized hub for Question Bank diagnostics and hygiene.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterAc} onChange={(e) => setFilterAc(e.target.value)} className="bg-white text-red-900 border-none font-bold py-2 px-4 rounded outline-none shadow cursor-pointer text-sm">
              <option value="ALL">All Aircrafts & Regulations</option>
              <option value="REGULASI">REGULATIONS Only</option>
              <option value="Airbus A330-Series">Airbus A330-Series Only</option>
              <option value="Airbus A330 NEO">Airbus A330 NEO Only</option>
              <option value="ATR72">ATR72 Only</option>
              <option value="B737-800 NG">B737-800 NG Only</option>
              <option value="B737-MAX">B737-MAX Only</option>
              <option value="B777-300 ER">B777-300 ER Only</option>
            </select>

            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-white text-red-900 border-none font-bold py-2 px-4 rounded outline-none shadow cursor-pointer text-sm">
              <option value="ALL">All Categories</option>
              <option value="Airframe & Powerplant">AP (Airframe & Powerplant) Only</option>
              <option value="Electric & Avionic">EA (Electric & Avionic) Only</option>
              <option value="General">General (Regulations) Only</option>
            </select>

            <Link href="/admin" className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded font-bold shadow text-sm">Back to Dashboard</Link>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex bg-white shadow rounded-b-lg overflow-hidden border-b-4 border-red-600 flex-col md:flex-row">
           <button onClick={() => setActiveTab('OPTIONS')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'OPTIONS' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              ⚠️ Incomplete Options ({badQuestions.length})
           </button>
           <button onClick={() => setActiveTab('DUPLICATES')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'DUPLICATES' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              🗂️ Duplicate Questions ({duplicateGroups.length})
           </button>
           <button onClick={() => setActiveTab('LANGUAGE')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'LANGUAGE' ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              🌐 Language Scanner ({languageIssues.length})
           </button>
        </div>

        {loading ? (
          <div className="text-center p-10 font-bold text-gray-500 animate-pulse">Scanning Database Anomalies...</div>
        ) : (
          <>
            {/* KONTEN TAB 1: PILIHAN KURANG */}
            {activeTab === 'OPTIONS' && (
              badQuestions.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center text-green-600 font-bold text-xl">🎉 System Healthy! All questions in this query have at least 4 options.</div>
              ) : (
                <div className="space-y-4">
                  {badQuestions.map((q, index) => (
                    <div key={q.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold text-gray-800"><span className="text-gray-400 mr-2">#{index + 1}</span>{q.question_text}</h2>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">{q.type_of_ac} | {q.kategori} | {q.subject}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 mb-4 space-y-1">
                        {q.options.map((opt: any) => (<div key={opt.id}>• {opt.option_text} {opt.is_correct && <span className="text-green-500 font-bold">(Correct Answer)</span>}</div>))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Enter the missing option..." value={newOptions[q.id] || ''} onChange={(e) => handleTextChange(q.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(q.id) }} className="flex-1 border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <button onClick={() => handleAddOption(q.id)} disabled={submittingId === q.id} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded transition disabled:bg-gray-400">Save Option</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* KONTEN TAB 2: SOAL DUPLIKAT */}
            {activeTab === 'DUPLICATES' && (
              duplicateGroups.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center text-green-600 font-bold text-xl">✨ Clean! No duplicate questions detected in this query.</div>
              ) : (
                <div className="space-y-6">
                  {/* TOMBOL NUKLIR (GLOBAL) */}
                  <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded shadow flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h3 className="text-red-800 font-black text-lg">🚨 MASS ACTION (MASTER PURGE)</h3>
                      <p className="text-red-700 text-sm mt-1">Detected <b>{duplicateGroups.length}</b> duplicate groups. This action will automatically retain 1 definitive version per group and purge the rest simultaneously.</p>
                    </div>
                    <button 
                      onClick={handleNukeAllDuplicates}
                      disabled={submittingId === 'nuke_all'}
                      className="px-6 py-4 bg-red-700 hover:bg-red-800 text-white font-black uppercase tracking-wider rounded-lg shadow-lg flex-shrink-0 animate-pulse hover:animate-none transition-all disabled:bg-gray-400"
                    >
                      {submittingId === 'nuke_all' ? 'PURGING...' : '🧹 EXECUTE MASTER PURGE'}
                    </button>
                  </div>

                  {/* DAFTAR PER KELOMPOK */}
                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-300 opacity-90">
                      <div className="mb-4 pb-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                         <div>
                           <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Case #{groupIndex + 1} ({group.length} Duplicates)</span>
                           <h2 className="text-lg font-bold text-gray-800 leading-relaxed">{group[0].question_text}</h2>
                           <p className="text-sm text-gray-500 mt-1 font-bold">{group[0].type_of_ac} | {group[0].kategori}</p>
                         </div>
                         <button onClick={() => handleDeleteAllDuplicates(group)} disabled={submittingId !== null} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded shadow transition flex-shrink-0 disabled:opacity-50">
                           Purge This Group Only
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.map((q: any, i: number) => (
                          <div key={q.id} className={`border p-4 rounded relative flex flex-col justify-between ${i === 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div>
                              <span className={`absolute -top-3 -left-3 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-green-600' : 'bg-gray-800'}`}>{i+1}</span>
                              {i === 0 && <span className="absolute top-2 right-2 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Retained Version</span>}
                              <div className="text-xs text-gray-500 mb-2 font-mono mt-1">ID: {q.id.split('-')[0]}...</div>
                              <div className="space-y-1 text-sm mb-4">
                                {q.options.map((opt: any) => (<div key={opt.id} className={opt.is_correct ? 'text-green-700 font-semibold' : 'text-gray-600'}>• {opt.option_text} {opt.is_correct && '✓'}</div>))}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteDuplicate(q.id)} disabled={submittingId !== null} className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded text-sm transition mt-2 disabled:bg-gray-200 disabled:text-gray-400">
                               🗑️ Delete This Version
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* KONTEN TAB 3: LANGUAGE SCANNER */}
            {activeTab === 'LANGUAGE' && (
              languageIssues.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center text-green-600 font-bold text-xl">🎉 Database Bersih! Tidak ada Bahasa Indonesia yang terdeteksi.</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-2xl">🔍</span>
                    <p className="text-rose-800 text-sm font-medium">
                      Sistem mendeteksi <b>{languageIssues.length}</b> item (Soal/Opsi) yang terindikasi menggunakan Bahasa Indonesia berdasarkan pemindaian kata kunci.
                    </p>
                  </div>

                  {languageIssues.map((item, index) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                      
                      {/* Bagian Kiri: Info Original */}
                      <div className="bg-gray-50 p-4 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-wider text-white ${item.type === 'QUESTION' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1 font-bold">{item.parent_info}</p>
                        <p className="text-sm font-medium text-gray-900 leading-relaxed bg-rose-100 p-3 rounded border border-rose-200 mt-2">
                          {item.original_text}
                        </p>
                      </div>

                      {/* Bagian Kanan: Form Translate */}
                      <div className="p-4 md:w-1/2 flex flex-col justify-between bg-white relative">
                        <div>
                          <label className="block text-xs font-bold text-green-700 mb-2">🇬🇧 English Translation:</label>
                          <textarea 
                            rows={3}
                            className="w-full text-sm p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 outline-none resize-none bg-green-50"
                            placeholder="Type the English translation here..."
                            value={translations[item.id] || ''}
                            onChange={(e) => handleTranslationChange(item.id, e.target.value)}
                          />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button 
                            onClick={() => handleUpdateTranslation(item)}
                            disabled={submittingId === item.id || !translations[item.id]}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {submittingId === item.id ? 'Saving...' : '💾 Save & Update'}
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )
            )}

          </>
        )}
      </div>
    </div>
  )
}