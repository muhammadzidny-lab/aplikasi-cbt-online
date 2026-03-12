'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient' 

export default function MigratePage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)

  const handleMigrate = async () => {
    if (!file) return alert('Pilih file database_soal.sql dulu!')
    setStatus('Membaca file SQL...')
    setProgress(5)
    
    const text = await file.text()
    
    setStatus('Menganalisis dan menyusun ulang data (Parsing MySQL)...')
    setProgress(10)
    const parsedData = parseMySql(text)
    
    if (parsedData.length === 0) {
       setStatus('Gagal menemukan data soal! Pastikan format file benar.')
       return
    }

    setStatus(`Ditemukan ${parsedData.length} soal! Memulai upload...`)
    
    let successCount = 0

    for (let i = 0; i < parsedData.length; i++) {
       const q = parsedData[i]
       
       // 1. Simpan Teks Soal ke tabel questions
       const { data: qData, error: qError } = await supabase
         .from('questions')
         .insert([{
            type_of_ac: q.ac,
            kategori: q.cat,
            subject: 'INITIAL', 
            exam_no: 1,         
            question_text: q.question
         }])
         .select()
       
       // TANGKAP ERROR DAN TAMPILKAN DI LAYAR
       if (qError) {
         setStatus(`❌ ERROR DI SOAL KE-${i+1}: ${qError.message || qError.details || JSON.stringify(qError)}`)
         return // Hentikan sistem agar error terbaca
       }
       if (!qData || qData.length === 0) {
         setStatus(`❌ ERROR: Data gagal tersimpan tanpa pesan error (Kemungkinan terblokir RLS Supabase).`)
         return
       }

       // 2. Simpan 5 Pilihan Jawaban
       const optionsToInsert = q.options.map((opt: any) => ({
          question_id: qData[0].id,
          option_text: opt.text,
          is_correct: opt.is_correct
       }))

       const { error: optError } = await supabase
         .from('options')
         .insert(optionsToInsert)

       if (optError) {
         setStatus(`❌ ERROR JAWABAN DI SOAL KE-${i+1}: ${optError.message || JSON.stringify(optError)}`)
         return
       } 
       
       successCount++
       setProgress(Math.round(10 + ((i + 1) / parsedData.length) * 90))
       setStatus(`⏳ Menyuntikkan soal ke-${i + 1} dari ${parsedData.length} ke Database...`)
    }

    setStatus(`Selesai! 🎉 Berhasil: ${successCount} soal. Silakan hapus halaman ini jika sudah tidak dipakai.`)
  }

  const parseMySql = (sql: string) => {
    const results: any[] = []
    const blocks = sql.split('INSERT INTO ')
    
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]
      const tMatch = block.match(/^`([^`]+)`/)
      if (!tMatch) continue
      
      const tableName = tMatch[1] 
      if (tableName === 'soal_history') continue

      let ac = "General"
      let cat = "General"
      if (tableName.startsWith("soal_")) {
         const parts = tableName.replace("soal_", "").split("_")
         if (parts.length >= 2) {
            ac = parts[0].toUpperCase() 
            cat = parts[1].toUpperCase() 
            if(cat === 'AP') cat = 'Airframe & Powerplant'
            if(cat === 'EA') cat = 'Electric & Avionic'
         } else {
            ac = parts[0].toUpperCase() 
         }
      }

      const vIndex = block.indexOf('VALUES')
      if (vIndex === -1) continue
      
      let vString = block.substring(vIndex + 6)
      const sIndex = vString.lastIndexOf(';')
      if (sIndex !== -1) vString = vString.substring(0, sIndex)
      
      const rows = parseValues(vString)
      rows.forEach(row => {
         if (row.length >= 12) {
            results.push({
               ac,
               cat,
               question: row[1],
               options: [
                 { text: row[2], is_correct: row[3].includes('TRUE') },
                 { text: row[4], is_correct: row[5].includes('TRUE') },
                 { text: row[6], is_correct: row[7].includes('TRUE') },
                 { text: row[8], is_correct: row[9].includes('TRUE') },
                 { text: row[10], is_correct: row[11].includes('TRUE') }
               ].filter(o => o.text && o.text.trim() !== '') 
            })
         }
      })
    }
    return results
  }

  const parseValues = (str: string) => {
    const rows: string[][] = []
    let row: string[] = []
    let val = ''
    let inStr = false
    let esc = false
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if (esc) { val += char; esc = false; continue; }
      if (char === '\\') { esc = true; continue; }
      if (char === "'") { inStr = !inStr; continue; }
      
      if (!inStr) {
        if (char === '(' && val.trim() === '') {
           row = []
           val = ''
        } else if (char === ',') {
           row.push(val)
           val = ''
        } else if (char === ')') {
           row.push(val)
           rows.push(row)
           val = ''
        } else if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
        } else {
           val += char
        }
      } else {
        val += char
      }
    }
    return rows
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full border-t-4 border-blue-600">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">🚀 Supabase Data Migration Tool</h1>
        
        <div className="mb-6 mt-4">
          <input type="file" accept=".sql" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full border p-2 rounded" />
        </div>
        
        <button onClick={handleMigrate} disabled={progress > 0 && progress < 100} className="w-full py-3 text-white font-bold rounded bg-blue-600 hover:bg-blue-700">
          Mulai Migrasi Data
        </button>

        {status && (
          <div className="mt-8 p-5 bg-gray-50 border rounded-lg">
            <p className="font-semibold text-red-600 mb-3">{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}