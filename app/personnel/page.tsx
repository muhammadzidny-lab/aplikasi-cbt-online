'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

type Personnel = {
  id: string
  report_type?: string
  personnel_no: string
  name: string
  company: string
  station?: string
  basic_license?: string
  aircraft_type?: string
  special_auth?: string
  status: string
  ga_auth_no: string
}

function formatDate(date: any) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

// MESIN PEMBACA CSV AMAN
const parseCSVRow = (str: string) => {
  if (!str) return [];
  const result = [];
  let inQuotes = false;
  let currentStr = '';
  for (let i = 0; i < (str.length || 0); i++) {
    const char = str[i];
    if (char === '"') { inQuotes = !inQuotes; } 
    else if (char === ',' && !inQuotes) { result.push(currentStr); currentStr = ''; } 
    else { currentStr += char; }
  }
  result.push(currentStr);
  return result;
}

export default function PersonnelReportPage() {
  const [reportType, setReportType] = useState('Authorization Holder')
  const [acType, setAcType] = useState('ALL')
  const [station, setStation] = useState('ALL')
  const [basicLicense, setBasicLicense] = useState('ALL')
  const [specialAuth, setSpecialAuth] = useState('ALL')
  const [company, setCompany] = useState('ALL')
  const [statusOpt, setStatusOpt] = useState('ALL') 

  const acTypeOptions = ["ALL", "B-737", "B-738", "B-737 MAX 8", "B-744", "B-777", "A-320", "A330 Series", "A330 NEO", "CRJ-1000", "ATR-72"]
  const stationOptions = ["ALL", "AMQ", "AMS", "BDJ", "BDO", "BIK", "BKS", "BPN", "BTH", "BTJ", "CGK", "CITILINK", "DJB", "DJB-MM", "DJJ", "DPS", "HLP", "JED", "JKT", "JOG", "KNO", "KOE", "LOP", "MDC", "MES", "MLC", "MLG", "MLT", "MQ", "MQC", "PDG", "PKU", "PLM", "PLW", "PNK", "SIN", "SOC", "SOQ", "SRG", "SRGMM", "SUB", "SYD", "TBH", "TBJ", "TBN", "TBT", "TEA", "TF", "TFB", "TFD", "TFK", "TFN", "TFO", "TFS", "TIM", "TJC", "TKG", "TL", "TLD", "TLM", "TLP", "TQA", "TYC", "TYP", "UPG"]
  const specialAuthOptions = ["ALL", "GA-ETOPS", "RII", "Run Up", "Weighing", "Swing Compass", "Autoland"]

  const [personnelList, setPersonnelList] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form')

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [upDataType, setUpDataType] = useState('Master') 
  const [upAcType, setUpAcType] = useState('ALL')
  const [upStation, setUpStation] = useState('ALL')
  const [upBasic, setUpBasic] = useState('ALL')
  const [upCompany, setUpCompany] = useState('ALL')
  const [upStatus, setUpStatus] = useState('ALL')
  const [upSpecialAuth, setUpSpecialAuth] = useState('ALL')

  const fetchPersonnelData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('local_personnel').select('*').order('name', { ascending: true })
    if (error) {
        console.error('Error fetching data:', error)
    } else if (data) {
        setPersonnelList(data.filter(d => d && d.report_type !== 'Master')) 
    }
    setLoading(false)
  }, [])

  useEffect(() => { 
    fetchPersonnelData() 
  }, [fetchPersonnelData])

  // FILTERING & GROUPING LOGIC DENGAN TITANIUM SHIELD (ANTI ERROR)
  const getFilteredAndGroupedData = () => {
    if (!personnelList || !Array.isArray(personnelList)) return [];

    const rawFiltered = personnelList.filter((person) => {
      if (!person) return false;
      const matchCompany = company === 'ALL' || person.company === company;
      const matchStatus = statusOpt === 'ALL' || person.status === statusOpt;
      const matchReport = person.report_type === reportType || !person.report_type; 
      
      let rawAc = '';
      if (person.aircraft_type && typeof person.aircraft_type === 'string') {
          rawAc = person.aircraft_type.split(' ||| ')[0]?.trim() || '';
      }

      if (reportType === 'Authorization Holder') {
        const matchAC = acType === 'ALL' || rawAc === acType;
        const matchStation = station === 'ALL' || person.station === station;
        const matchLicense = basicLicense === 'ALL' || person.basic_license === basicLicense;
        return matchCompany && matchStatus && matchAC && matchStation && matchLicense && matchReport;
      } else {
        const matchSpecial = specialAuth === 'ALL' || person.special_auth === specialAuth;
        return matchCompany && matchStatus && matchSpecial && matchReport;
      }
    });

    const groupedMap = new Map();
    rawFiltered.forEach(person => {
        let ac = '';
        let auth = '';
        let val = '';

        if (person.aircraft_type && typeof person.aircraft_type === 'string') {
            const parts = person.aircraft_type.split(' ||| ');
            ac = parts[0]?.trim() || '';
            auth = parts[1]?.trim() || '';
            val = parts[2]?.trim() || '';
        } else {
            ac = String(person.aircraft_type || '');
        }

        const safePersNo = String(person.personnel_no || 'UNKNOWN');

        if (!groupedMap.has(safePersNo)) {
            groupedMap.set(safePersNo, {
                ...person,
                details: [{ ac, auth, val, id: person.id }]
            });
        } else {
            groupedMap.get(safePersNo).details.push({ ac, auth, val, id: person.id });
        }
    });

    return Array.from(groupedMap.values()) || [];
  }

  const groupedData = getFilteredAndGroupedData() || [];

  // INI FUNGSI YANG TERHAPUS SEBELUMNYA!
  const handlePreview = () => {
    setViewMode('table');
  }

  const handleCreateReport = () => {
    if (!groupedData || groupedData.length === 0) return alert("Data kosong! Tidak ada yang bisa di-export.");
    let csvContent = "Personnel No,Name,Company,Station,Basic License,Aircraft Type,Authorization,Validity,Special Auth,Status,GA Auth No\n";
    
    groupedData.forEach((row: any) => {
        if (row?.details && Array.isArray(row.details)) {
            row.details.forEach((d: any) => {
                csvContent += `"${row.personnel_no || ''}","${row.name || ''}","${row.company || ''}","${row.station || ''}","${row.basic_license || ''}","${d.ac || ''}","${d.auth || ''}","${d.val || ''}","${row.special_auth || ''}","${row.status || ''}","${row.ga_auth_no || ''}"\n`;
            });
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType.replace(/ /g, '_')}_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const handleDeleteFiltered = async () => {
    if (!groupedData || groupedData.length === 0) return alert("Tidak ada data yang cocok dengan filter untuk dihapus.");
    
    const pass = window.prompt(`⚠️ DANGER ZONE!\n\nAnda akan menghapus data yang tampil di layar ini dari Database secara permanen.\n\nKetik 'HAPUS' untuk melanjutkan:`);
    if (pass === 'HAPUS') {
      setLoading(true);
      const idsToDelete: string[] = [];
      groupedData.forEach((r: any) => {
          if (r?.details && Array.isArray(r.details)) {
              r.details.forEach((d: any) => {
                  if (d?.id) idsToDelete.push(d.id);
              });
          }
      });
      
      let hasError = false;
      for (let i = 0; i < idsToDelete.length; i += 500) {
          const chunk = idsToDelete.slice(i, i + 500);
          const { error } = await supabase.from('local_personnel').delete().in('id', chunk);
          if (error) { hasError = true; alert('❌ Error menghapus: ' + error.message); break; }
      }
      
      if (!hasError) {
          alert(`✅ Berhasil menghapus ${idsToDelete.length} data spesifik dari database!`);
          fetchPersonnelData();
          setViewMode('form');
      }
      setLoading(false);
    }
  }

  const handleDeleteAll = async () => {
    const pass = window.prompt("⚠️ TOTAL WIPE!\n\nKetik 'HAPUS SEMUA' untuk mengosongkan seluruh database tanpa sisa (TERMASUK MASTER DATA):");
    if (pass === 'HAPUS SEMUA') {
      setLoading(true);
      await supabase.from('local_personnel').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('✅ Database berhasil dikosongkan total!');
      fetchPersonnelData();
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUpDataType(reportType === 'Authorization Holder' ? 'Authorization Holder' : 'Special Authorization Holder'); 
    setShowUploadModal(true);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  }

  const handleSyncData = async () => {
    if (!uploadFile) return;
    setUploading(true);

    const normKey = (key: string) => key?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const companyMap = new Map<string, string>()
    
    if (upCompany === 'ALL' && upDataType !== 'Master') {
        const { data: existingPersonnel } = await supabase.from('local_personnel').select('ga_auth_no, company').eq('report_type', 'Master')
        if (existingPersonnel && Array.isArray(existingPersonnel)) {
            existingPersonnel.forEach((p: any) => { if (p?.ga_auth_no && p?.company) companyMap.set(normKey(p.ga_auth_no), p.company) })
        }
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const rows = text.split('\n') || [];
      const dataToInsert: any[] = [];

      let isDataSection = false;
      let lastSeen = { name: '', persNo: '', gaAuth: '', station: '', basic: '' };
      let colIdx = { name: 1, gaAuth: 2, persNo: 3, station: 4, basic: 5, aircraft: 8, auth: 9, company: -1, validity: -1 };

      for (let i = 0; i < (rows.length || 0); i++) {
        const row = rows[i]?.trim();
        if (!row) continue;
        const columns = parseCSVRow(row) || [];
        const upperCols = columns.map(c => c?.trim()?.toUpperCase() || '');

        if (upperCols.includes('NAME') && (upperCols.includes('GA LIC NO') || upperCols.includes('GA AUTH NO'))) {
            isDataSection = true;
            colIdx.name = upperCols.indexOf('NAME');
            colIdx.gaAuth = upperCols.includes('GA LIC NO') ? upperCols.indexOf('GA LIC NO') : upperCols.indexOf('GA AUTH NO');
            colIdx.persNo = upperCols.findIndex(c => c.includes('PERS'));
            colIdx.station = upperCols.indexOf('STATION');
            colIdx.basic = upperCols.findIndex(c => c.includes('BASIC'));
            colIdx.aircraft = upperCols.indexOf('AIRCRAFT TYPE');
            colIdx.auth = upperCols.indexOf('AUTHORIZATION');
            colIdx.company = upperCols.indexOf('COMPANY');
            colIdx.validity = upperCols.indexOf('VALIDITY');
            continue;
        }

        if (!isDataSection) continue;
        if (columns[0] === '' && !columns[colIdx.name] && !columns[colIdx.aircraft]) continue;

        const csvName = columns[colIdx.name]?.trim() || lastSeen.name;
        const csvGaAuthNo = columns[colIdx.gaAuth]?.trim() || lastSeen.gaAuth;
        const csvPersNo = columns[colIdx.persNo]?.trim() || lastSeen.persNo;
        const csvStation = columns[colIdx.station]?.trim() || lastSeen.station;
        
        const rawBasic = columns[colIdx.basic]?.trim() || lastSeen.basic;
        let csvBasicLicense = rawBasic;
        if (rawBasic === 'E/A') csvBasicLicense = 'Electric & Avionic';
        if (rawBasic === 'A/P') csvBasicLicense = 'Airframe & Powerplant';

        const csvAircraftType = colIdx.aircraft > -1 ? columns[colIdx.aircraft]?.trim() : '';
        const csvAuthColumn = colIdx.auth > -1 ? columns[colIdx.auth]?.trim() : '';
        let csvRawCompany = colIdx.company > -1 ? columns[colIdx.company]?.trim() : '';
        const csvValidity = colIdx.validity > -1 ? columns[colIdx.validity]?.trim() : '';

        if (columns[colIdx.name]?.trim()) { lastSeen = { name: csvName, gaAuth: csvGaAuthNo, persNo: csvPersNo, station: csvStation, basic: rawBasic }; }

        let autoStatus = 'Active';
        if (csvValidity && !csvValidity.includes('-1')) {
            const parts = csvValidity.split('/');
            if (parts && parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const monthStr = parts[1].toUpperCase();
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                const monthMap: any = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
                const expDate = new Date(year, monthMap[monthStr] || 0, day);
                const today = new Date(); today.setHours(0,0,0,0);
                if (expDate < today) autoStatus = 'Inactive';
            }
        }
        
        const finalStatus = upStatus !== 'ALL' ? upStatus : autoStatus;

        let finalCompany = 'Unknown Company';
        if (upCompany !== 'ALL') {
            finalCompany = upCompany;
        } else {
            if (csvRawCompany) {
                if (csvRawCompany.toUpperCase().includes('GMF')) finalCompany = 'PT GMF Aero Asia Tbk';
                else if (csvRawCompany.toUpperCase().includes('GARUDA')) finalCompany = 'PT Garuda Indonesia Tbk';
                else if (csvRawCompany.toUpperCase().includes('CITILINK')) finalCompany = 'Citilink';
                else finalCompany = csvRawCompany;
            } else {
                const mapComp = companyMap.get(normKey(csvGaAuthNo));
                if (mapComp) finalCompany = mapComp;
                else if (csvPersNo.startsWith('5')) finalCompany = 'PT GMF Aero Asia Tbk';
                else if (csvPersNo.trim() !== '') finalCompany = 'PT Garuda Indonesia Tbk';
            }
        }

        let finalSpecialAuths: string[] = [];
        if (upDataType === 'Special Authorization Holder') {
            if (upSpecialAuth !== 'ALL') {
                finalSpecialAuths.push(upSpecialAuth); 
            } else {
                const authUpper = csvAuthColumn?.toUpperCase() || '';
                if (authUpper.includes('RII')) finalSpecialAuths.push('RII');
                if (authUpper.includes('ETOPS') || authUpper.includes('+ER') || authUpper.match(/\bER\b/)) finalSpecialAuths.push('GA-ETOPS');
                if (authUpper.includes('RUN UP') || authUpper.includes('R/U') || authUpper.match(/\bRU\b/) || authUpper.includes('EGR') || authUpper.includes('ERU')) finalSpecialAuths.push('Run Up');
                if (authUpper.includes('WEIGHING') || authUpper.match(/\bWB\b/) || authUpper.includes('W/B') || authUpper.match(/\bWR\b/)) finalSpecialAuths.push('Weighing');
                if (authUpper.includes('SWING COMPASS') || authUpper.includes('COMPASS')) finalSpecialAuths.push('Swing Compass');
                if (authUpper.includes('AUTOLAND') || authUpper.includes('A/L')) finalSpecialAuths.push('Autoland');
                if (finalSpecialAuths.length === 0 && csvAuthColumn) finalSpecialAuths.push(csvAuthColumn);
            }
        } else {
            finalSpecialAuths.push('');
        }

        const finalAc = upDataType === 'Authorization Holder' ? (upAcType !== 'ALL' ? upAcType : csvAircraftType) : csvAircraftType;
        const packedAircraftData = `${finalAc} ||| ${csvAuthColumn} ||| ${csvValidity}`;

        finalSpecialAuths.forEach(sa => {
          dataToInsert.push({
            report_type: upDataType === 'Master' ? 'Master' : upDataType,
            personnel_no: csvPersNo,
            name: csvName,
            company: finalCompany,
            station: upStation !== 'ALL' ? upStation : csvStation,
            basic_license: upBasic !== 'ALL' ? upBasic : csvBasicLicense,
            aircraft_type: packedAircraftData,
            special_auth: sa || null,
            status: finalStatus,
            ga_auth_no: csvGaAuthNo
          });
        });
      }

      if (dataToInsert.length > 0) {
        const chunkSize = 500;
        let successCount = 0;
        let hasError = false;
        
        for (let i = 0; i < (dataToInsert.length || 0); i += chunkSize) {
           const chunk = dataToInsert.slice(i, i + chunkSize);
           const { error } = await supabase.from('local_personnel').insert(chunk);
           if (error) { hasError = true; alert('❌ Gagal upload: ' + error.message); break; } 
           else { successCount += chunk.length; }
        }
        
        if (!hasError) {
           alert(`✅ Selesai! Berhasil memproses & sinkronisasi ${successCount} baris data.`);
           fetchPersonnelData();
           setShowUploadModal(false);
           setUploadFile(null);
        }
      } else {
        alert('⚠️ Tidak ada data yang ditemukan. Pastikan format tabel CSV terbaca.');
      }
      setUploading(false);
    };
    reader.readAsText(uploadFile);
  }

  const renderUploadModal = () => {
    if (!showUploadModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00102a]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 w-full max-w-lg border border-gray-100 animate-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <span className="bg-[#F4F6F9] text-[#002561] text-[10px] font-black px-5 py-2 rounded-full tracking-widest uppercase shadow-sm border border-gray-200">
              CONFIGURE UPLOAD DATA
            </span>
          </div>
          <h2 className="text-center text-xl font-black text-[#002561] tracking-widest uppercase mb-2">
            UPLOAD PERSONNEL FILE
          </h2>
          <div className="w-12 h-1.5 bg-[#009CB4] mx-auto rounded-full mb-6"></div>
          
          <div className="bg-blue-50 text-xs font-bold text-[#002561] text-center p-3 rounded-xl mb-6 truncate border border-blue-100">
            📄 File: {uploadFile?.name || 'Unknown File'}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Upload As (Report Type)</label>
              <select value={upDataType} onChange={(e) => setUpDataType(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                <option value="Master">1. Master Data (Local Personnel List)</option>
                <option value="Authorization Holder">2. Authorization Holder Report</option>
                <option value="Special Authorization Holder">3. Special Authorization Report</option>
              </select>
            </div>

            {upDataType === 'Authorization Holder' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Tipe Pesawat</label>
                  <select value={upAcType} onChange={(e) => setUpAcType(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                    {acTypeOptions?.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'ALL (Auto-Detect)' : opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Station</label>
                  <select value={upStation} onChange={(e) => setUpStation(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer max-h-40">
                    {stationOptions?.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'ALL (Auto-Detect)' : opt}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Basic License</label>
                  <select value={upBasic} onChange={(e) => setUpBasic(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                    <option value="ALL">ALL (Auto-Detect)</option>
                    <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                    <option value="Electric & Avionic">Electric & Avionic</option>
                  </select>
                </div>
              </div>
            )}

            {upDataType === 'Special Authorization Holder' && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Special Authorization</label>
                <select value={upSpecialAuth} onChange={(e) => setUpSpecialAuth(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                  {specialAuthOptions?.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'ALL (Auto-Detect dari Teks)' : opt}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Company</label>
              <select value={upCompany} onChange={(e) => setUpCompany(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                <option value="ALL">ALL (Auto-Detect / Link from Master)</option>
                <option value="PT Garuda Indonesia Tbk">PT Garuda Indonesia Tbk</option>
                <option value="PT GMF Aero Asia Tbk">PT GMF Aero Asia Tbk</option>
                <option value="Citilink">Citilink</option>
              </select>
            </div>

            {upDataType !== 'Master' && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1">Status</label>
                <select value={upStatus} onChange={(e) => setUpStatus(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] bg-white cursor-pointer">
                  <option value="ALL">ALL (Auto-Detect Expired)</option>
                  <option value="Active">Force Active (Abaikan Expired)</option>
                  <option value="Inactive">Force Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all border border-gray-200">
              Cancel
            </button>
            <button onClick={handleSyncData} disabled={uploading} className="flex-1 bg-[#009CB4] hover:bg-[#007b8e] text-white py-3.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2">
              {uploading ? '⏳ Syncing...' : '🔄 Execute Data'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'form') {
    return (
      <>
        {renderUploadModal()}
        <div className="min-h-screen bg-[url('/GA2.jpg')] bg-cover bg-center bg-fixed flex flex-col justify-center items-center font-sans p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 w-full max-w-md relative z-10 border border-gray-100 transition-all duration-300">
            <div className="flex justify-center mb-6">
              <span className="bg-[#F4F6F9] text-[#002561] text-[10px] font-black px-5 py-2 rounded-full tracking-widest uppercase shadow-sm border border-gray-200">REPORT FILTER</span>
            </div>
            <h2 className="text-center text-2xl font-black text-[#002561] tracking-widest uppercase mb-2">PERSONNEL DATA</h2>
            <div className="w-12 h-1.5 bg-[#009CB4] mx-auto rounded-full mb-8 transition-all"></div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Report Type</label>
                <select value={reportType} onChange={(e) => { setReportType(e.target.value); setAcType('ALL'); setStation('ALL'); setBasicLicense('ALL'); setSpecialAuth('ALL'); }} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                  <option value="Authorization Holder">Authorization Holder</option>
                  <option value="Special Authorization Holder">Special Auth Holder</option>
                </select>
              </div>

              {reportType === 'Authorization Holder' ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Tipe Pesawat</label>
                      <select value={acType} onChange={(e) => setAcType(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                        {acTypeOptions?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Station</label>
                      <select value={station} onChange={(e) => setStation(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer max-h-40">
                        {stationOptions?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Basic License</label>
                    <select value={basicLicense} onChange={(e) => setBasicLicense(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                      <option value="ALL">ALL</option>
                      <option value="Airframe & Powerplant">Airframe & Powerplant</option>
                      <option value="Electric & Avionic">Electric & Avionic</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Special Authorization</label>
                    <select value={specialAuth} onChange={(e) => setSpecialAuth(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                      {specialAuthOptions?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Company</label>
                <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                  <option value="ALL">ALL</option>
                  <option value="PT Garuda Indonesia Tbk">PT Garuda Indonesia Tbk</option>
                  <option value="PT GMF Aero Asia Tbk">PT GMF Aero Asia Tbk</option>
                  <option value="Citilink">Citilink</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Status</label>
                <select value={statusOpt} onChange={(e) => setStatusOpt(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-[#009CB4] text-sm font-bold text-[#002561] transition-colors appearance-none bg-white shadow-sm cursor-pointer">
                  <option value="ALL">ALL Status</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handlePreview} className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#002561] py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2">Preview</button>
              <button onClick={handleCreateReport} className="flex-1 bg-[#002561] hover:bg-[#00102a] text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">Create Report</button>
            </div>

            <div className="mt-6 text-center flex justify-between px-2 items-center border-t border-gray-100 pt-5">
              <Link href="/" className="text-gray-400 hover:text-[#009CB4] text-[11px] font-bold uppercase tracking-widest transition">Home</Link>
              <div className="flex items-center gap-4">
                <button onClick={handleDeleteAll} className="text-[11px] text-gray-300 hover:text-red-500 font-bold uppercase tracking-widest transition flex items-center gap-1" title="Wipe Entire Database">⚠️ Clear DB</button>
                <label className="text-[11px] text-white bg-[#009CB4] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#007b8e] font-bold uppercase tracking-widest transition shadow-md flex items-center gap-1">
                   {uploading ? 'Wait...' : '⚙️ Upload CSV'}
                   <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onFileSelect} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[url('/GA2.jpg')] bg-cover bg-center bg-fixed font-sans py-10 px-4">
      <div className="max-w-screen-xl mx-auto space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-white/40">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-[#002561]">{String(reportType || '')}</h1>
            <p className="text-[#009CB4] text-xs font-bold tracking-[0.2em] mt-1">PREVIEW REPORT DATA</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setViewMode('form')} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-[#002561] rounded-xl font-bold text-xs uppercase tracking-widest transition-all">🔙 Back</button>
            <button onClick={handleDeleteFiltered} className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm">🗑️ Delete These</button>
            <button onClick={handleCreateReport} className="px-5 py-3 bg-[#009CB4] hover:bg-[#007b8e] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-teal-600/30 transition-all">📥 Export CSV</button>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden">
          <div className="overflow-x-auto w-full p-2">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#002561]/5 text-[#002561] text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="p-4 pl-6 rounded-tl-xl">NO</th>
                  <th className="p-4">NAME & GA LIC NO</th>
                  <th className="p-4">PERS. NO & COMPANY</th>
                  <th className="p-4">STATION & BASIC</th>
                  <th className="p-4">AIRCRAFT TYPE & AUTHORIZATION</th>
                  <th className="p-4 rounded-tr-xl">STATUS & VALIDITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-[#009CB4] font-black uppercase tracking-widest animate-pulse">Loading Data...</td></tr>
                ) : (!groupedData || groupedData.length === 0) ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic font-bold">No personnel found for this filter.</td></tr>
                ) : groupedData.map((person: any, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    
                    <td className="p-4 pl-6 text-sm font-bold text-gray-400">{idx + 1}</td>
                    
                    <td className="p-4">
                       <div className="font-black text-[#002561] uppercase">{String(person?.name || '-')}</div>
                       <div className="text-[11px] font-bold text-gray-500 mt-1">{String(person?.ga_auth_no || '-')}</div>
                    </td>
                    
                    <td className="p-4">
                       <div className="font-mono font-black text-[#009CB4]">{String(person?.personnel_no || '-')}</div>
                       <div className="text-[11px] font-bold text-gray-600 mt-1 uppercase">{String(person?.company || '-')}</div>
                    </td>
                    
                    <td className="p-4">
                       <div className="font-black text-gray-800 uppercase">{String(person?.station || '-')}</div>
                       <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">{String(person?.basic_license || '-')}</div>
                    </td>
                    
                    <td className="p-4 min-w-[250px]">
                       <ul className="space-y-2">
                          {person?.details && Array.isArray(person.details) && person.details.length > 0 ? (
                              person.details.map((detailItem: any, i: number) => {
                                  const acText = detailItem?.ac ? String(detailItem.ac) : 'ALL AIRCRAFT';
                                  const authText = detailItem?.auth ? String(detailItem.auth) : '';
                                  return (
                                      <li key={i} className="text-[11px] text-gray-700 flex items-start gap-2">
                                         <span className="text-[#009CB4] font-black mt-0.5">•</span>
                                         <span className="whitespace-normal leading-relaxed">
                                            <span className="font-black">{acText}</span> 
                                            {authText && <span className="font-bold text-gray-500"> | {authText}</span>}
                                         </span>
                                      </li>
                                  );
                              })
                          ) : null}
                       </ul>
                    </td>

                    <td className="p-4 align-top">
                       <div className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded w-fit border ${person?.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {String(person?.status || 'Unknown')}
                       </div>
                       {person?.details && Array.isArray(person.details) && person.details[0]?.val && (
                          <div className="text-[11px] font-bold text-gray-500 mt-2 ml-1">
                             {String(person.details[0].val)}
                          </div>
                       )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-[#002561] p-4 text-center text-[10px] font-black text-white tracking-[0.2em] uppercase">
            TOTAL DATA: {groupedData?.length || 0} PERSONNEL FOUND
          </div>
        </div>
      </div>
    </div>
  )
}