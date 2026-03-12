'use client' 

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient' 

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    personnel_no: '',
    unit: '',
    rating_sought: '',
    exam_date: new Date().toISOString().split('T')[0], 
    dgac_amel_no: '',
    dgac_rating: '',
    ga_auth_no: '',
    ga_rating: '',
    photo: '',
    signature: '' 
  })

  // ==========================================
  // FITUR DIGITAL SIGNATURE PAD (CANVAS)
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000000' 
      }
    }
  }, [])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    canvas.setPointerCapture(e.pointerId) 
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId)
      setFormData(prev => ({ ...prev, signature: canvas.toDataURL('image/png') }))
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setFormData(prev => ({ ...prev, signature: '' }))
    }
  }
  // ==========================================

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('GAGAL: Format foto harus berupa JPG atau PNG!')
      e.target.value = '' 
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('GAGAL: Ukuran foto maksimal adalah 2 MB!')
      e.target.value = '' 
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData({ ...formData, photo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const personnelRegex = /^\d{6}$/
    if (!personnelRegex.test(formData.personnel_no)) {
      alert('GAGAL: Personnel No. harus terdiri dari tepat 6 angka!')
      return 
    }

    if (!formData.photo) {
      alert('GAGAL: Harap upload foto Anda terlebih dahulu!')
      return
    }

    if (!formData.signature) {
      alert('GAGAL: Harap isi Tanda Tangan Digital Anda terlebih dahulu!')
      return
    }

    setLoading(true)

    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('personnel_no', formData.personnel_no)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingCandidate) {
      const { error: updateError } = await supabase.from('candidates').update(formData).eq('id', existingCandidate.id)
      if (updateError) { alert('Error updating data: ' + updateError.message); setLoading(false); return }
    } else {
      const { error: insertError } = await supabase.from('candidates').insert([formData])
      if (insertError) { alert('Error saving data: ' + insertError.message); setLoading(false); return }
    }

    router.push(`/select-exam?personnelNo=${formData.personnel_no}`)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-12 px-4 flex items-center justify-center font-sans">
      
      {/* Container Utama Form (Card Putih Bersih) */}
      <div className="max-w-4xl w-full mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
        
        {/* HEADER DENGAN LOGO GARUDA INDONESIA */}
        <div className="bg-[#002561] p-8 text-white text-center md:text-left relative overflow-hidden border-b-4 border-[#009CB4]">
          {/* Ornamen Garis Miring */}
          <div className="absolute top-0 right-0 w-64 h-full bg-[#009CB4] opacity-10 skew-x-[-20deg] translate-x-10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <img 
              src="/logo.png" 
              alt="Garuda Indonesia Logo" 
              className="h-16 w-auto bg-white p-2 rounded-lg shadow-md"
            />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white shadow-sm">
                Candidate Registration
              </h1>
              <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-1">
                EXCELLENCE IN AVIATION TRAINING
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8 bg-white">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Full Name</label>
              <input required name="name" type="text" onChange={handleChange} 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                placeholder="ENTER YOUR FULL NAME" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Email Address</label>
              <input required name="email" type="email" onChange={handleChange} 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none lowercase transition-colors bg-gray-50 focus:bg-white" 
                placeholder="example@garuda-indonesia.com" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Personnel No.</label>
              <input required name="personnel_no" type="text" onChange={handleChange} maxLength={6} pattern="\d{6}" title="Masukkan tepat 6 angka"
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                placeholder="E.G. 533524" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Unit</label>
              <input required name="unit" type="text" onChange={handleChange} 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                placeholder="E.G. TCO 3" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Rating Sought</label>
              <input required name="rating_sought" type="text" onChange={handleChange} 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                placeholder="E.G. B737-800 NG" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002561] tracking-wider mb-2 uppercase">Date of Exam</label>
              <input required name="exam_date" type="date" value={formData.exam_date} onChange={handleChange} 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none transition-colors bg-gray-50 focus:bg-white text-gray-700" />
            </div>

            {/* INPUT FOTO */}
            <div className="md:col-span-2 bg-[#F4F6F9] p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#009CB4] transition-colors">
              <label className="block text-sm font-black text-[#002561] mb-3">Upload Photo <span className="text-gray-500 font-normal">(JPG/PNG, Max 2MB)</span></label>
              <input required type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoChange} 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-bold file:tracking-wider file:bg-[#002561] file:text-white hover:file:opacity-90 cursor-pointer transition-all" />
              {formData.photo && (
                <div className="mt-4 flex items-center gap-3 text-sm font-bold text-[#009CB4] bg-white p-3 rounded-lg border border-gray-100 shadow-sm inline-flex">
                  <span className="text-xl">✅</span>
                  <span>Photo Attached Successfully!</span>
                  <img src={formData.photo} alt="Preview" className="h-10 w-10 object-cover rounded-full border-2 border-[#009CB4] ml-2" />
                </div>
              )}
            </div>

            {/* INPUT TANDA TANGAN DIGITAL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black text-[#002561] mb-3 flex justify-between items-end">
                <span>Digital Signature</span>
                <button type="button" onClick={clearSignature} className="text-xs text-[#8B5E34] hover:text-white font-bold border border-[#8B5E34] rounded-full px-4 py-1.5 bg-transparent hover:bg-[#8B5E34] transition-all">
                  Clear Signature
                </button>
              </label>
              <div className="border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden relative shadow-inner focus-within:border-[#009CB4] transition-colors">
                <canvas 
                  ref={canvasRef}
                  width={600} 
                  height={180} 
                  className="w-full h-[180px] touch-none cursor-crosshair bg-white"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerOut={stopDrawing}
                />
                {!formData.signature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-300 font-bold tracking-widest uppercase text-xl">Sign Here</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* SECTION: DGAC LICENSE */}
          <div>
            <h3 className="text-lg font-black text-[#002561] mb-5 border-l-4 border-[#8B5E34] pl-3 tracking-wide uppercase">DGAC License</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2 uppercase">AMEL No.</label>
                <input name="dgac_amel_no" type="text" onChange={handleChange} 
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                  placeholder="E.G. 3250" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2 uppercase">Rating</label>
                <input name="dgac_rating" type="text" onChange={handleChange} 
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                  placeholder="E.G. A330 NEO" />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* SECTION: GA AUTHORIZATION */}
          <div>
            <h3 className="text-lg font-black text-[#002561] mb-5 border-l-4 border-[#009CB4] pl-3 tracking-wide uppercase">GA Authorization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2 uppercase">Authorization No.</label>
                <input name="ga_auth_no" type="text" onChange={handleChange} 
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                  placeholder="E.G. GA-3726" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2 uppercase">Rating</label>
                <input name="ga_rating" type="text" onChange={handleChange} 
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:ring-0 focus:border-[#009CB4] outline-none uppercase transition-colors bg-gray-50 focus:bg-white" 
                  placeholder="E.G. B777-300 ER" />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading} 
              className={`w-full py-4 px-6 text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all duration-300 transform 
                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#009CB4] hover:opacity-90 hover:scale-[1.01] shadow-[#009CB4]/40'}`}>
              {loading ? 'Processing Data...' : 'Proceed to Examination'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}