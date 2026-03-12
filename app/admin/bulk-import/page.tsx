'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

export default function BulkImportPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [typeOfAC, setTypeOfAC] = useState('Airbus A330 NEO')
  const [kategori, setKategori] = useState('Airframe & Powerplant')
  const [subject, setSubject] = useState('INITIAL')
  const [examNo, setExamNo] = useState('1')
  const [excelData, setExcelData] = useState('')

  const handleImport = async () => {
    if (!excelData.trim()) return alert('Data masih kosong!')
    
    const rows = excelData.trim().split('\n')
    if (rows.length === 0) return

    if (!window.confirm(`Sistem mendeteksi ${rows.length} baris/soal.\nYakin ingin memasukkannya ke Bank Soal ${typeOfAC}?`)) return

    setLoading(true)
    setProgress({ current: 0, total: rows.length, success: 0, failed: 0 })

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split('|||')
      
      if (cols.length < 6) {
        console.error(`Baris ${i+1} gagal: Jumlah kolom kurang dari 6. Teks:`, rows[i])
        failedCount++
        setProgress(p => ({ ...p, current: i + 1, failed: failedCount }))
        continue
      }

      const [questionText, optA, optB, optC, optD, keyStr] = cols
      const correctAnswer = keyStr.trim().toUpperCase() 

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert([{
          type_of_ac: typeOfAC,
          kategori: kategori,
          subject: subject,
          exam_no: parseInt(examNo),
          question_text: questionText.trim()
        }])
        .select()
        .single()

      if (qError || !qData) {
        console.error(`Baris ${i+1} gagal di Insert Soal:`, qError)
        failedCount++
        setProgress(p => ({ ...p, current: i + 1, failed: failedCount }))
        continue
      }

      // FITUR BARU: HANYA MASUKKAN OPSI JIKA TEKSNYA TIDAK KOSONG
      const optionsToInsert = []
      if (optA.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optA.trim(), is_correct: correctAnswer === 'A' })
      if (optB.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optB.trim(), is_correct: correctAnswer === 'B' })
      if (optC.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optC.trim(), is_correct: correctAnswer === 'C' })
      if (optD.trim() !== '') optionsToInsert.push({ question_id: qData.id, option_text: optD.trim(), is_correct: correctAnswer === 'D' })

      if (optionsToInsert.length > 0) {
        const { error: optError } = await supabase.from('options').insert(optionsToInsert)
        if (optError) {
          console.error(`Baris ${i+1} gagal di Insert Opsi:`, optError)
          failedCount++
        } else {
          successCount++
        }
      } else {
        failedCount++ // Gagal jika semua opsinya ternyata kosong
      }

      setProgress(p => ({ ...p, current: i + 1, success: successCount, failed: failedCount }))
    }

    setLoading(false)
    setExcelData('') 
    alert(`✅ IMPORT SELESAI!\nBerhasil: ${successCount} soal\nGagal: ${failedCount} soal`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-green-700 text-white p-6 rounded-lg shadow-lg">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">🚀 SMART BULK IMPORT</h1>
            <p className="text-green-100 text-sm mt-1">Enter 100+ auto questions (Empty options will be automatically discarded)..</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-green-900 hover:bg-green-800 rounded font-bold shadow">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
            <div>
              <label className="block text-xs font-bold text-green-900 mb-1 uppercase">Type of A/C</label>
              <select value={typeOfAC} onChange={(e) => setTypeOfAC(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500">
                <option value="Airbus A330-Series">Airbus A330-Series</option><option value="Airbus A330 NEO">Airbus A330 NEO</option>
                <option value="B737-800 NG">B737-800 NG</option>
                <option value="B737-MAX">B737-MAX</option><option value="B777-300 ER">B777-300 ER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-green-900 mb-1 uppercase">Category</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500">
                <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                <option value="Electric & Avionic">Electric & Avionic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-green-900 mb-1 uppercase">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500">
                <option value="INITIAL">INITIAL</option><option value="RENEWAL">RENEWAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-green-900 mb-1 uppercase">Exam No</label>
              <select value={examNo} onChange={(e) => setExamNo(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Enter data here:</label>
            <textarea 
              rows={10} 
              value={excelData} 
              onChange={(e) => setExcelData(e.target.value)}
              placeholder="Type or paste your question here..." 
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-green-500 outline-none whitespace-pre overflow-x-auto font-mono text-sm bg-gray-50"
              disabled={loading}
            />
          </div>

          {loading && (
            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-bold text-blue-800 mb-2">Memproses: {progress.current} / {progress.total} Soal...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs mt-2 font-bold">
                <span className="text-green-600">✅ Berhasil: {progress.success}</span>
                <span className="text-red-600">❌ Gagal: {progress.failed}</span>
              </div>
            </div>
          )}

          <button 
            onClick={handleImport} 
            disabled={loading || !excelData} 
            className={`w-full py-4 mt-6 text-white font-black uppercase tracking-widest rounded-md shadow-md transition ${loading || !excelData ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {loading ? 'SEDANG MENGUPLOAD...' : '⚡ import all questions now'}
          </button>
        </div>

      </div>
    </div>
  )
}