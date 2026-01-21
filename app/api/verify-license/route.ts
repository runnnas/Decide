import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with the Service Role Key (Admin Access)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { code, deviceId } = await request.json();

    // 1. Check if the code exists in Supabase
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !license) {
      return NextResponse.json({ success: false, message: 'Invalid code.' }, { status: 404 });
    }

    // 2. Device Locking Check
    // If the license has no device_id yet, CLAIM IT for this user.
    if (!license.device_id) {
      await supabase
        .from('licenses')
        .update({ device_id: deviceId })
        .eq('id', license.id);
    } 
    // If it has a device_id, make sure it matches the current user
    else if (license.device_id !== deviceId) {
       return NextResponse.json({ success: false, message: 'This code is already used on another device.' }, { status: 403 });
    }

    // 3. Expiry Check (For Trials)
    if (license.type === 'trial' && license.expires_at) {
      const now = new Date();
      const expiryDate = new Date(license.expires_at);
      
      if (now > expiryDate) {
         return NextResponse.json({ success: false, status: 'expired', message: 'Trial has ended.' });
      }
      
      // Calculate hours remaining for the banner
      const diffMs = expiryDate.getTime() - now.getTime();
      const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
      
      return NextResponse.json({ 
        success: true, 
        type: 'trial', 
        hoursRemaining 
      });
    }

    // 4. Success (Full Version)
    return NextResponse.json({ success: true, type: 'full' });

  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}