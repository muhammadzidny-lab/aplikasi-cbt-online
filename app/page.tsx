'use client' // Wajib karena kita pakai interaksi (form input)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient' // Import koneksi database

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // State untuk menyimpan data inputan user
  const [formData, setFormData] = useState({
    name: '',
    personnel_no: '',
    unit: '',
    rating_sought: '',
    exam_date: new Date().toISOString().split('T')[0], // Default hari ini
    dgac_amel_no: '',
    dgac_rating: '',
    ga_auth_no: '',
    ga_rating: ''
  })

  // Fungsi saat user mengetik
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Fungsi saat tombol "Next" ditekan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Simpan data ke Supabase
    const { data, error } = await supabase
      .from('candidates')
      .insert([formData])
      .select()

    if (error) {
      alert('Error saving data: ' + error.message)
      setLoading(false)
    } else {
      // 2. Jika sukses, ambil ID peserta baru
      const newCandidateId = data[0].id
      
      // 3. Pindah ke Halaman 2 (Pilih Ujian)
      router.push(`/select-exam?candidateId=${newCandidateId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        
        {/* Header Biru */}
        <div className="bg-blue-900 p-6 text-white">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Candidate Registration</h1>
          <p className="text-blue-200 text-sm mt-1">Please fill in your details correctly.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* BAGIAN 1: Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input required name="name" type="text" onChange={handleChange} 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter your full name" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personnel No.</label>
              <input required name="personnel_no" type="text" onChange={handleChange} 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input required name="unit" type="text" onChange={handleChange} 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating Sought</label>
              <input required name="rating_sought" type="text" onChange={handleChange} 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Exam</label>
              <input required name="exam_date" type="date" value={formData.exam_date} onChange={handleChange} 
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* BAGIAN 2: DGAC License */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">DGAC License</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AMEL No.</label>
                <input name="dgac_amel_no" type="text" onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <input name="dgac_rating" type="text" onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* BAGIAN 3: GA Authorization */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">GA Authorization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authorization No.</label>
                <input name="ga_auth_no" type="text" onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <input name="ga_rating" type="text" onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Tombol Submit */}
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 px-4 text-white font-bold rounded-md shadow-md transition duration-200 
                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}
            >
              {loading ? 'Processing...' : 'NEXT STEP'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}