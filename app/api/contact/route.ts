import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, type, message } = body;

    // This sends the email TO YOU (The developer)
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Use this default testing sender
      to: 'recapstack@gmail.com', // <--- PUT YOUR ACTUAL GMAIL HERE
      subject: `DECIDE App: [${type}] from User`,
      replyTo: email, // This lets you just hit "Reply" in Gmail
      html: `
        <h3>New Message from DECIDE App</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Type:</strong> ${type}</p>
        <hr />
        <p>${message}</p>
      `
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error });
  }
}