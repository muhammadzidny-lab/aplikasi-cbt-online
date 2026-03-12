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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-indigo-700 text-white p-6 rounded-lg shadow-lg">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">➕ Add Question Manual</h1>
            <p className="text-indigo-200 text-sm mt-1">Enter new questions one by one into the Question Bank.</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 rounded font-bold shadow transition border border-indigo-500">
            Back to Dashboard
          </Link>
        </div>

        {/* FORM TAMBAH SOAL MANUAL */}
        <div className="bg-white rounded-lg shadow overflow-hidden border-t-4 border-indigo-500">
          <form onSubmit={handleSubmitQuestion} className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Type of A/C</label>
                <select value={typeOfAC} onChange={(e) => setTypeOfAC(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="Airbus A330-Series">Airbus A330-Series</option>
                  <option value="Airbus A330 NEO">Airbus A330 NEO</option>
                  <option value="B737-800 NG">B737-800 NG</option>
                  <option value="B737-MAX">B737-MAX</option>
                  <option value="B777-300 ER">B777-300 ER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Category</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                  <option value="Electric & Avionic">Electric & Avionic</option>
                  <option value="REGULASI">REGULASI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="INITIAL">INITIAL</option>
                  <option value="RENEWAL">RENEWAL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Exam No</label>
                <select value={examNo} onChange={(e) => setExamNo(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Question Text</label>
              <textarea required rows={4} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Type or paste your question here..." className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Answer Options & Key (Select the green circle button for the correct answer)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`flex items-center gap-3 p-3 rounded-md border transition ${correctAnswer === 'A' ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="radio" checked={correctAnswer === 'A'} onChange={() => setCorrectAnswer('A')} className="w-5 h-5 text-green-600 cursor-pointer" />
                  <span className="font-bold text-gray-600">A.</span>
                  <input required type="text" value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Answer text A..." className="flex-1 bg-transparent outline-none p-1" />
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-md border transition ${correctAnswer === 'B' ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="radio" checked={correctAnswer === 'B'} onChange={() => setCorrectAnswer('B')} className="w-5 h-5 text-green-600 cursor-pointer" />
                  <span className="font-bold text-gray-600">B.</span>
                  <input required type="text" value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Answer text B..." className="flex-1 bg-transparent outline-none p-1" />
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-md border transition ${correctAnswer === 'C' ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="radio" checked={correctAnswer === 'C'} onChange={() => setCorrectAnswer('C')} className="w-5 h-5 text-green-600 cursor-pointer" />
                  <span className="font-bold text-gray-600">C.</span>
                  <input type="text" value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Answer text C.. (opsional)" className="flex-1 bg-transparent outline-none p-1" />
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-md border transition ${correctAnswer === 'D' ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="radio" checked={correctAnswer === 'D'} onChange={() => setCorrectAnswer('D')} className="w-5 h-5 text-green-600 cursor-pointer" />
                  <span className="font-bold text-gray-600">D.</span>
                  <input type="text" value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Answer text D... (opsional)" className="flex-1 bg-transparent outline-none p-1" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full py-4 text-white font-bold tracking-widest uppercase rounded-md shadow-md transition ${isSubmitting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isSubmitting ? 'Menyimpan Soal...' : 'SAVE QUESTION TO DATABASE'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}