import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { deviceId } = await req.json();

    if (!deviceId) {
      return NextResponse.json({ success: false, message: 'Device ID required' }, { status: 400 });
    }

    // 1. Check if this device already had a trial
    const { data: existingTrials } = await supabase
      .from('licenses')
      .select('*')
      .eq('device_id', deviceId)
      .eq('type', 'trial');

    if (existingTrials && existingTrials.length > 0) {
      return NextResponse.json({ success: false, message: 'Trial already used on this device.' }, { status: 403 });
    }

    // 2. Generate a new Trial Code
    const trialCode = `TRIAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // +48 Hours

    // 3. Save it to Supabase
    const { error } = await supabase.from('licenses').insert({
      code: trialCode,
      type: 'trial',
      device_id: deviceId, // Lock it immediately
      expires_at: expiresAt.toISOString(),
      activated_at: new Date().toISOString()
    });

    if (error) throw error;

    return NextResponse.json({ success: true, code: trialCode });

  } catch (error) {
    console.error("Trial Gen Error:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}