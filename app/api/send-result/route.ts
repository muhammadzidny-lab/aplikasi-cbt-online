import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, name, pdfBase64 } = await req.json();

        // 1. TRIK SAKTI: Potong awalan "data:application/pdf..." dan ambil murni teks base64-nya saja
        const base64Data = pdfBase64.split("base64,")[1];

        // 2. Konfigurasi Gmail (Sangat stabil & Anti Timeout/ECONNRESET)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'arikyanwar07@gmail.com', // Email Gmail Anda
                pass: process.env.GMAIL_APP_PASSWORD // Sandi Aplikasi Gmail (16 huruf)
            },
            // Tambahan waktu tunggu (timeout) agar upload file besar tidak putus di tengah jalan
            connectionTimeout: 5 * 60 * 1000, // 5 menit
            greetingTimeout: 5 * 60 * 1000,
            socketTimeout: 5 * 60 * 1000,
        });

        // 3. Format Email
        const mailOptions = {
            from: '"Garuda Airworthiness Management" <muhammadzidny76@gmail.com>', // Nama pengirim bebas
            to: email, // Akan menerima alamat email GMF dari frontend
            subject: ` `, // Kosong tanpa subject sesuai permintaan
            text: ` `, // Kosong tanpa text sesuai permintaan
            attachments: [
                {
                    filename: `Exam_Documents_${name.replace(/\s+/g, '_')}.pdf`,
                    content: base64Data, // Menggunakan format 'content' Base64 murni
                    encoding: 'base64'
                }
            ]
        };

        // 4. Eksekusi Pengiriman
        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, message: "Email sent successfully via Gmail!" });
        
    } catch (error: any) {
        console.error("Email sending error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}