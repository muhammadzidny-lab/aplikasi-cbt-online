const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// 1. MASUKKAN KUNCI SUPABASE BARU ANDA DI SINI
// ==========================================
const SUPABASE_URL = 'https://eloflnplziitjaaurisw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsb2ZsbnBsemlpdGphYXVyaXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTIzOTIsImV4cCI6MjA5MTY2ODM5Mn0.IxKR11W8z9CWbwABz2hDgptHiRRvCkTrC_LAVLSGuRk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const results = [];

// ==========================================
// 2. NAMA FILE CSV
// ==========================================
const CSV_FILENAME = 'exam_answers_rows.csv';

console.log('⏳ Mulai membaca file CSV...');

fs.createReadStream(CSV_FILENAME)
  .pipe(csv())
  .on('data', (data) => {
    // Memasukkan data per baris ke dalam array, abaikan baris yang benar-benar kosong
    if (Object.keys(data).length > 0) {
      // Supabase menolak string kosong "" untuk kolom UUID atau tanggal.
      // Kita ubah string kosong menjadi null agar aman.
      for (const key in data) {
        if (data[key] === "") {
          data[key] = null;
        }
      }
      results.push(data);
    }
  })
  .on('end', async () => {
    console.log(`✅ Selesai membaca ${results.length} baris dari CSV.`);
    console.log('🚀 Mulai proses upload ke Supabase...');

    // ==========================================
    // 3. MESIN UPLOAD BERTAHAP (BATCHING)
    // ==========================================
    // Diatur 5 agar Base64 yang raksasa tidak kena "Payload Too Large"
    const BATCH_SIZE = 1; 
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase.from('exam_answers').insert(batch);
      
      if (error) {
        console.error(`❌ Error pada baris ${i + 1} - ${i + batch.length}:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Berhasil upload baris ${i + 1} sampai ${i + batch.length}`);
        successCount += batch.length;
      }
    }
    
    console.log('\n===================================');
    console.log(`🎉 UPLOAD SELESAI!`);
    console.log(`Total Berhasil: ${successCount}`);
    console.log(`Total Gagal:    ${errorCount}`);
    console.log('===================================');
  });