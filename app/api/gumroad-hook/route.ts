import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Gumroad sends data as form-urlencoded, not JSON usually, but let's handle the body safely
    const formData = await request.formData();
    const licenseKey = formData.get('license_key') as string;
    const email = formData.get('email') as string;
    const permalink = formData.get('permalink') as string; // Your product ID

    // Security Check: You can verify the permalink matches your specific product
    // if (permalink !== 'your_product_permalink') return ...

    if (!licenseKey) {
        return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    // Insert the NEW sale into Supabase
    const { error } = await supabase
      .from('licenses')
      .insert({
        code: licenseKey,
        email: email,
        type: 'full', // Sales are always full versions
        expires_at: null, // Never expires
        device_id: null // Will be claimed when they first log in
      });

    if (error) {
        console.error('Supabase Error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}