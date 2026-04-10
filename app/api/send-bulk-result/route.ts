import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, attachments } = await req.json();

        // Validasi payload
        if (!email || !attachments || !Array.isArray(attachments) || attachments.length === 0) {
            return NextResponse.json({ error: 'Email and valid attachments array are required' }, { status: 400 });
        }

        // 1. Konfigurasi Gmail (Mengikuti setting stabil Anti-Timeout milik Mas Zidny)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'arikyanwar07@gmail.com', // Sesuai dengan kode asli
                pass: process.env.GMAIL_APP_PASSWORD // Sesuai dengan kode asli
            },
            connectionTimeout: 5 * 60 * 1000, // 5 menit
            greetingTimeout: 5 * 60 * 1000,
            socketTimeout: 5 * 60 * 1000,
        });

        // 2. Looping & Format Array Lampiran (Attachments)
        const mailAttachments = attachments.map((item: any) => {
            // TRIK SAKTI: Potong awalan base64 persis seperti cara Mas Zidny
            const base64Data = item.pdfBase64.split("base64,")[1];
            
            return {
                filename: `Exam_Documents_${item.name.replace(/\s+/g, '_')}.pdf`,
                content: base64Data, // Menggunakan format 'content' Base64 murni
                encoding: 'base64'
            };
        });

        // 3. Format Email (Kosong melompong persis seperti request Anda)
        const mailOptions = {
            from: '"Garuda Airworthiness Management" <muhammadzidny76@gmail.com>',
            to: email,
            subject: ` `, // Kosong tanpa subject
            text: ` `, // Kosong tanpa text
            attachments: mailAttachments
        };

        // 4. Eksekusi Pengiriman
        await transporter.sendMail(mailOptions);
        
        return NextResponse.json({ success: true, message: `Email sent successfully with ${attachments.length} PDFs via Gmail!` });
        
    } catch (error: any) {
        console.error("Bulk Email sending error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}