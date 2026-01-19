import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, deviceId } = body;
    const cleanCode = code?.trim();

    console.log("--- 🔍 VERIFYING LICENSE ---");
    console.log("1. Received Code:", cleanCode);
    console.log("2. Device ID:", deviceId);

    // ==========================================
    // STRATEGY 1: CHECK GUMROAD
    // ==========================================
    if (process.env.GUMROAD_PRODUCT_ID) {
      console.log("3. Attempting Gumroad Check...");
      try {
        const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            product_id: process.env.GUMROAD_PRODUCT_ID,
            license_key: cleanCode,
            increment_uses_count: 'false', 
          }),
        });
        const gumroadData = await gumroadRes.json();
        console.log("4. Gumroad Result:", gumroadData.success, gumroadData.message || "");

        if (gumroadData.success) {
          return NextResponse.json({ success: true, type: 'full', message: 'Verified via Gumroad' });
        }
      } catch (err) {
        console.error("!! Gumroad Error:", err);
      }
    } else {
        console.log("!! SKIPPING GUMROAD: No Product ID found in .env");
    }

    // ==========================================
    // STRATEGY 2: CHECK SUPABASE (Trial / VIP / Dev)
    // ==========================================
    console.log("5. Falling back to Supabase...");
    
    // 1. Find the code in your DB (ONLY DO THIS ONCE!)
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !license) {
        console.error("6. Supabase Error/Not Found:", error?.message);
        return NextResponse.json({ success: false, message: 'Invalid license key' }, { status: 400 });
    }

    console.log("6. Found License in DB:", license);

    // 2. Device Locking (Prevents sharing)
    // If it's the FIRST time this code is used, lock it to this device
    if (!license.device_id) {
      console.log("7. First use! Locking to device...");
      await supabase.from('licenses').update({ 
        device_id: deviceId,
        activated_at: new Date().toISOString()
      }).eq('id', license.id);
    } 
    // If it's already locked, make sure it's the SAME device
    else if (license.device_id !== deviceId) {
       console.log("!! License Theft Attempt: Device ID mismatch");
       return NextResponse.json({ success: false, message: 'License already in use on another device.' }, { status: 403 });
    }

    // 3. Handle "2-Day Trial" Logic
    if (license.type === 'trial') {
      const now = new Date();
      let expiryDate = license.expires_at ? new Date(license.expires_at) : null;

      // If this is the FIRST activation, set the expiration date for 48 hours from now
      if (!expiryDate) {
        expiryDate = new Date(now.getTime() + (48 * 60 * 60 * 1000)); // Now + 48 hours
        
        await supabase.from('licenses').update({ 
          expires_at: expiryDate.toISOString() 
        }).eq('id', license.id);
      }

      // Check if expired
      if (now > expiryDate) {
         return NextResponse.json({ success: false, status: 'expired', message: 'Trial has ended.' });
      }
      
      // Calculate hours left for your UI banner
      const diffMs = expiryDate.getTime() - now.getTime();
      const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
      
      return NextResponse.json({ success: true, type: 'trial', hoursRemaining });
    }

    // 4. Success (Full or Dev)
    return NextResponse.json({ success: true, type: license.type });

  } catch (error) {
    console.error("!! CRITICAL SERVER ERROR:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}