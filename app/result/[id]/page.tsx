'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resultId } = use(params)
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState<any>(null)
  const [examResult, setExamResult] = useState<any>(null)
  const [answerMap, setAnswerMap] = useState<Record<number, string>>({}) 
  const [stats, setStats] = useState({ totalWrong: 0, score: 0, passed: false })

  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil Data Result & Candidate
      const { data: resDetail, error } = await supabase
        .from('exam_results')
        .select(`*, candidates(*)`)
        .eq('id', resultId)
        .single()

      if (error || !resDetail) {
        alert('Data not found')
        return
      }

      setCandidate(resDetail.candidates)
      setExamResult(resDetail)

      // 2. Mapping Jawaban
      const { data: questions } = await supabase
        .from('questions')
        .select(`id, options(id)`)
        .eq('subject', resDetail.subject)
        .eq('exam_no', resDetail.exam_no)
        .order('id', { ascending: true }) 

      const { data: answers } = await supabase
        .from('exam_answers')
        .select('question_id, selected_option_id, options(is_correct)')
        .eq('result_id', resultId)

      const mapping: Record<number, string> = {}
      let wrongCount = 0

      if (answers && questions) {
        wrongCount = answers.filter((a: any) => !a.options?.is_correct).length
        
        answers.forEach((ans: any) => {
          const qIndex = questions.findIndex((q: any) => q.id === ans.question_id)
          if (qIndex !== -1) {
            const sortedOptions = questions[qIndex].options.sort((a: any, b: any) => a.id.localeCompare(b.id))
            const optIndex = sortedOptions.findIndex((opt: any) => opt.id === ans.selected_option_id)
            const char = ['A', 'B', 'C', 'D'][optIndex] || ''
            if (char) mapping[qIndex + 1] = char 
          }
        })
      }

      const currentScore = resDetail.score || 0
      
      setAnswerMap(mapping)
      setStats({
        totalWrong: wrongCount,
        score: currentScore,
        passed: currentScore >= 75
      })

      setLoading(false)
    }

    fetchData()
  }, [resultId])

  if (loading) return <div className="text-center p-10">Loading Report...</div>

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
          header, footer { display: none !important; }
          .page-break { break-before: page; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-500 py-10 flex flex-col items-center gap-10 print:bg-white print:py-0 print:gap-0 print:block">
        
        {/* ================= PAGE 1: FORMULIR PENILAIAN ================= */}
        <div className="w-[210mm] h-[296mm] bg-white shadow-2xl p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col items-center justify-center mb-6">
             <img src="/logo.png" alt="Garuda Indonesia" className="h-14 mb-2 object-contain" />
             <div className="font-serif font-bold text-lg leading-tight">Garuda Indonesia</div>
             <div className="text-xs uppercase tracking-widest text-gray-700 mb-4">Airworthiness Management</div>
             <h2 className="text-lg font-bold uppercase underline decoration-2 underline-offset-4">
               RECURRENT PROGRAM / ASSESSMENT
             </h2>
          </div>

          {/* Form Utama */}
          <div className="border-2 border-black flex-1 flex flex-col">
            <div className="p-4 space-y-2 border-b border-black">
              <DataRow label="Name" value={candidate?.name} />
              <DataRow label="Personnel No" value={candidate?.personnel_no} />
              <DataRow label="Unit" value={candidate?.unit} />
              <DataRow label="Rating Sought" value={candidate?.rating_sought} />
              <DataRow label="Date of Exam" value={formatDate(candidate?.exam_date)} />
            </div>

            <div className="p-4 space-y-2 border-b border-black">
              <h3 className="font-bold underline text-sm mb-2">DGAC License</h3>
              <DataRow label="AMEL No" value={candidate?.dgac_amel_no || '-'} />
              <DataRow label="Rating" value={candidate?.dgac_rating || '-'} />
            </div>

            <div className="p-4 space-y-2 border-b border-black">
              <h3 className="font-bold underline text-sm mb-2">GA Authorization</h3>
              <DataRow label="No" value={candidate?.ga_auth_no || '-'} />
              <DataRow label="Rating" value={candidate?.ga_rating || '-'} />
            </div>

            <div className="p-4 border-b border-black min-h-[180px] relative">
              <p className="text-sm mb-4">
                I have personally tested this applicant with final judgment as follows <span className="italic text-xs">(filled by JKTMQSGA)</span> :
              </p>
              <div className="ml-4 mt-4 space-y-4 font-bold text-base">
                <div className="flex items-center"><span className="w-20">PASSED</span> : </div>
                <div className="flex items-center"><span className="w-20">FAILED</span> : </div>
              </div>
              <div className="absolute bottom-4 right-10 w-64 text-center">
                <p className="text-xs mb-16">Assessor</p> 
                <div className="border-b border-black w-full mb-1"></div>
                <p className="font-bold text-sm tracking-widest">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</p> 
              </div>
            </div>

            {/* Bagian 5: MQS Validation */}
            <div className="p-4 bg-white flex-1 flex flex-col justify-between">
              <div>
                <p className="text-sm mb-2 font-bold">To be fulfilled by Airworthiness Standard (MQS)</p>
                <div className="mb-0">
                  <span className="font-bold text-sm">Issued Auth No:</span>
                  <div className="border-b border-dotted border-gray-400 w-full h-6"></div>
                </div>
              </div>
              <div className="self-end w-64 text-center mb-4">
                 <div className="text-left mb-0 text-sm mt-1">
                    Jakarta : <span className="underline decoration-dotted">{formatDate(new Date())}</span>
                  </div>
                  <p className="text-xs mb-20 text-center">Inspector Airworthiness Standard</p> 
                  <div className="border-b border-black w-full mb-1"></div>
                  <p className="text-xs text-center">Name / Pers No</p> 
              </div>
            </div>
          </div>

          <div className="flex justify-between text-[10px] font-mono mt-2">
            <span>Form MZ 1-17.1 (10-13)</span>
            <span>1 of 2</span>
          </div>
        </div>

        {/* ================= PAGE 2: LEMBAR JAWABAN ================= */}
        <div className="w-[210mm] h-[296mm] bg-white shadow-2xl p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden page-break">
          
          {/* Header Answer Sheet */}
          <div className="flex items-start gap-4 mb-2 border-b-2 border-black pb-2">
             <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
             <div>
                <div className="font-bold text-sm">Garuda Indonesia</div>
                <div className="text-[10px] text-gray-600">Airworthiness Management</div>
             </div>
             <div className="flex-1 text-center">
                <h1 className="text-xl font-bold uppercase tracking-wider mt-2">ANSWER SHEET</h1>
             </div>
          </div>

          {/* Form Header Box */}
          <div className="border border-black text-xs">
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-28 font-bold flex justify-between shrink-0 mr-2">
                    <span>Aircraft type</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1 truncate">{candidate?.ga_rating || '-'}</span> 
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2">
                    <span>Name</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1 truncate">{candidate?.name}</span>
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-28 font-bold flex justify-between shrink-0 mr-2">
                    <span>Date</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1">{formatDate(candidate?.exam_date)}</span>
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2">
                    <span>Pers. No.</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1">{candidate?.personnel_no}</span>
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-28 font-bold flex justify-between shrink-0 mr-2">
                    <span>Booklet code</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1">{examResult?.subject} - NO.{examResult?.exam_no}</span>
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2">
                    <span>Unit</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1">{candidate?.unit}</span>
              </div>
            </div>
            <div className="flex">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-28 font-bold flex justify-between shrink-0 mr-2">
                    <span>Subject</span><span>:</span>
                 </div>
                 <span className="font-handwriting uppercase flex-1">{examResult?.subject}</span>
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2">
                    <span>Exam. No.</span><span>:</span>
                 </div>
                 <div className="flex items-center gap-2">
                     {[1, 2, 3].map(num => (
                       <div key={num} className="flex items-center gap-1 border border-black px-1">
                          <div className={`w-3 h-3 border border-black flex items-center justify-center text-[10px]`}>
                             {examResult?.exam_no === num ? 'X' : ''}
                          </div>
                          <span>{num}</span>
                       </div>
                     ))}
                     <span className="text-[9px] ml-1 italic">(cross the chosen)</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex mt-1 mb-4">
             <div className="w-2/3 text-[10px] pr-4 pt-2">
                <p>1. Read the questions carefully.</p>
                <p>2. Cross the column for the chosen answer.</p>
                <p>3. Donot write anything on the booklet</p>
                <p className="font-bold">4. Passing-grade 75%</p>
             </div>
             <div className="w-1/3 border border-black h-16 relative">
                <span className="text-[9px] absolute top-1 left-1">Signature:</span>
             </div>
          </div>

          {/* GRID JAWABAN */}
          <div className="border-2 border-black p-1 flex gap-1 mt-2">
             {[0, 25, 50, 75].map((startIdx) => (
                <div key={startIdx} className="flex-1 border-r last:border-r-0 border-gray-400">
                   <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-black text-center bg-gray-100">
                      <div>No</div>
                      <div>A</div>
                      <div>B</div>
                      <div>C</div>
                      <div>D</div>
                   </div>
                   {Array.from({ length: 25 }).map((_, i) => {
                      const no = startIdx + i + 1
                      const userAns = answerMap[no]
                      return (
                        <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-gray-300 h-[19px] items-center">
                           <div className="text-center font-bold border-r border-gray-300">{no}</div>
                           {['A', 'B', 'C', 'D'].map((opt) => (
                              <div key={opt} className="border-r last:border-r-0 border-gray-300 relative flex justify-center items-center h-full">
                                 {userAns === opt && (
                                    <div className="absolute text-xl font-handwriting text-blue-900 pointer-events-none" style={{top: '-6px'}}>X</div>
                                 )}
                              </div>
                           ))}
                        </div>
                      )
                   })}
                </div>
             ))}
          </div>

          {/* FOOTER AREA */}
          <div className="mt-4 text-[10px]">
             
             {/* ROW 1: EXAMINER */}
             <div className="flex w-1/2 border border-black border-b-0 h-24">
                 <div className="w-24 border-r border-black p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                 <div className="flex-1 border-r border-black relative p-1">
                     <span className="absolute top-0 left-1 text-[9px]">1</span>
                 </div>
                 <div className="flex-1 relative p-1">
                     <span className="absolute top-0 left-1 text-[9px]">2</span>
                 </div>
             </div>

             {/* ROW 2: STATS */}
             <div className="flex border border-black h-40">
                 {/* Col 1 */}
                 <div className="w-1/4 border-r border-black flex flex-col">
                     <div className="flex-1 border-b border-gray-400 p-2 flex justify-between items-center">
                         <span>Aircraft system wrong :</span>
                     </div>
                     <div className="flex-1 p-2 flex justify-between items-center">
                         <span>Regulation wrong :</span>
                     </div>
                 </div>
                 {/* Col 2 */}
                 <div className="w-1/4 border-r border-black p-2 flex flex-col justify-between">
                     <span>Total wrong :</span>
                 </div>
                 {/* Col 3 */}
                 <div className="w-1/4 border-r border-black flex flex-col">
                     <div className="flex-1 border-b border-gray-400 p-2 flex items-center gap-2">
                         <span className="w-8">Pass</span><span>:</span>
                     </div>
                     <div className="flex-1 p-2 flex items-center gap-2">
                         <span className="w-8">Fail</span><span>:</span>
                     </div>
                 </div>
                 {/* Col 4 */}
                 <div className="w-1/4 p-2 flex items-start gap-2">
                     <span className="font-bold text-lg">SCORE :</span>
                 </div>
             </div>
          </div>

          <div className="flex justify-between text-[9px] mt-1 font-mono">
             <span>Form MZ-1-16.3(3-12)</span>
          </div>
        </div>

        {/* ================= PAGE 3: GMF STYLE (FIXED) ================= */}
        <div className="w-[210mm] h-[296mm] bg-white shadow-2xl p-[10mm] print:shadow-none print:w-full print:h-[296mm] print:p-[10mm] relative flex flex-col overflow-hidden page-break">
          
          <div className="flex items-end justify-between mb-4 border-b-2 border-black pb-2">
             <div className="flex items-center gap-4">
               <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
               <div className="flex flex-col">
                  <div className="font-bold text-sm">GMF AeroAsia</div>
                  <div className="text-[9px] italic text-gray-700">(Garuda Indonesia Group)</div>
               </div>
             </div>
             <div className="text-center flex-1">
                <h1 className="text-xl font-bold uppercase tracking-wider">ANSWER SHEET</h1>
             </div>
             <div className="text-[10px] italic">
                Quality Assurance & Safety
             </div>
          </div>

          <div className="border border-black text-xs">
            {/* Row 1 */}
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>A/C/Engine/Comp/Others</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1 truncate">{candidate?.ga_rating || '-'}</span> 
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Name</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1 truncate">{candidate?.name}</span>
              </div>
            </div>
            {/* Row 2 */}
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Date</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1">{formatDate(candidate?.exam_date)}</span>
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Pers. No.</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1">{candidate?.personnel_no}</span>
              </div>
            </div>
            {/* Row 3 */}
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Booklet Code</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1">{examResult?.subject} - NO.{examResult?.exam_no}</span>
              </div>
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Unit</span><span>:</span></div>
                 <span className="font-handwriting uppercase flex-1">{candidate?.unit}</span>
              </div>
            </div>
            {/* Row 4: FIXED COMPACT LAYOUT */}
            <div className="flex">
              <div className="w-1/2 border-r border-black p-1 flex items-center">
                 {/* Label w-48 tetap dijaga agar titik 2 sejajar */}
                 <div className="w-48 font-bold flex justify-between shrink-0 mr-2"><span>Subject</span><span>:</span></div>
                 
                 {/* Content: DIPADATKAN (text-8px, gap-0.5, checkbox w-2.5) */}
                 <div className="flex items-center gap-0.5 text-[8px] flex-1 leading-none">
                    <div className="flex items-center gap-0.5">
                       <div className="w-2.5 h-2.5 border border-black flex items-center justify-center"></div>
                       <span>INITIAL</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                       <div className="w-2.5 h-2.5 border border-black flex items-center justify-center"></div>
                       <span>ADDITIONAL</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                       <div className="w-2.5 h-2.5 border border-black flex items-center justify-center font-bold text-[8px]">
                          {examResult?.subject === 'RENEWAL' ? 'X' : ''}
                       </div>
                       <span>RENEWAL</span>
                    </div>
                 </div>
              </div>
              
              <div className="w-1/2 p-1 flex items-center">
                 <div className="w-20 font-bold flex justify-between shrink-0 mr-2"><span>Exam times No.</span><span>:</span></div>
                 <div className="flex items-center gap-2">
                     {[1, 2, 3].map(num => (
                       <div key={num} className="flex items-center gap-1 border border-black px-1">
                          <div className={`w-3 h-3 border border-black flex items-center justify-center text-[10px]`}>
                             {examResult?.exam_no === num ? 'X' : ''}
                          </div>
                          <span>{num}</span>
                       </div>
                     ))}
                     <span className="text-[9px] ml-1 italic">(Cross the chosen)</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex mt-1 mb-2">
             <div className="w-3/4 text-[10px] pr-4 pt-1">
                <p>1. Read the question carefully</p>
                <p>2. Cross the coloumn for the chosen answer</p>
                <p>3. Do not write anything on the booklet</p>
                <p className="font-bold">4. Passing grade score 75%</p>
             </div>
             <div className="w-1/4 border border-black h-14 relative">
                <span className="text-[9px] absolute top-1 left-1">Signature:</span>
             </div>
          </div>

          {/* GRID JAWABAN */}
          <div className="border-2 border-black p-1 flex gap-1 mt-2">
             {[0, 25, 50, 75].map((startIdx) => (
                <div key={startIdx} className="flex-1 border-r last:border-r-0 border-gray-400">
                   <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] font-bold border-b border-black text-center bg-gray-100">
                      <div>No</div><div>A</div><div>B</div><div>C</div><div>D</div>
                   </div>
                   {Array.from({ length: 25 }).map((_, i) => {
                      const no = startIdx + i + 1
                      const userAns = answerMap[no]
                      return (
                        <div key={no} className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] text-[10px] border-b border-gray-300 h-[19px] items-center">
                           <div className="text-center font-bold border-r border-gray-300">{no}</div>
                           {['A', 'B', 'C', 'D'].map((opt) => (
                              <div key={opt} className="border-r last:border-r-0 border-gray-300 relative flex justify-center items-center h-full">
                                 {userAns === opt && (
                                    <div className="absolute text-xl font-handwriting text-blue-900 pointer-events-none" style={{top: '-6px'}}>X</div>
                                 )}
                              </div>
                           ))}
                        </div>
                      )
                   })}
                </div>
             ))}
          </div>

          {/* FOOTER PAGE 3 */}
          <div className="mt-4 text-[10px]">
             <div className="flex w-1/2 border border-black border-b-0 h-24">
                 <div className="w-24 border-r border-black p-1 flex items-center justify-center font-bold text-xs">EXAMINER</div>
                 <div className="flex-1 border-r border-black relative p-1"><span className="absolute top-0 left-1 text-[9px]">1</span></div>
                 <div className="flex-1 relative p-1"><span className="absolute top-0 left-1 text-[9px]">2</span></div>
             </div>
             <div className="flex border border-black h-40">
                 <div className="w-1/4 border-r border-black flex flex-col">
                     <div className="flex-1 border-b border-gray-400 p-2 flex justify-between items-center"><span>Aircraft system wrong :</span></div>
                     <div className="flex-1 p-2 flex justify-between items-center"><span>Regulation wrong :</span></div>
                 </div>
                 <div className="w-1/4 border-r border-black p-2 flex flex-col justify-between"><span>Total wrong :</span></div>
                 <div className="w-1/4 border-r border-black flex flex-col">
                     <div className="flex-1 border-b border-gray-400 p-2 flex items-center gap-2"><span className="w-8">Pass</span><span>:</span></div>
                     <div className="flex-1 p-2 flex items-center gap-2"><span className="w-8">Fail</span><span>:</span></div>
                 </div>
                 <div className="w-1/4 p-2 flex items-start gap-2"><span className="font-bold text-lg">SCORE :</span></div>
             </div>
          </div>

          <div className="text-[9px] mt-1 font-mono">
             FORM GMF/Q-448
          </div>
          <div className="absolute bottom-[10mm] right-[10mm] text-[9px] font-mono">
             
          </div>

        </div>

        {/* Tombol Aksi */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-2 print:hidden z-50">
          <button onClick={() => window.print()} className="bg-blue-900 text-white px-6 py-3 rounded-full shadow-lg font-bold hover:bg-blue-800 flex items-center gap-2">
            🖨️ CETAK DOKUMEN
          </button>
          <button onClick={() => window.location.href = '/'} className="bg-gray-500 text-white px-6 py-3 rounded-full shadow-lg font-bold hover:bg-gray-600">
            🏠 BERANDA
          </button>
        </div>

      </div>
    </>
  )
}

function formatDate(dateString: any) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="grid grid-cols-[150px_10px_auto] text-sm items-start mb-1">
      <div className="font-medium">{label}</div>
      <div>:</div>
      <div className="uppercase font-mono font-bold border-b border-dotted border-gray-400 w-full pl-2">
        {value}
      </div>
    </div>
  )
}