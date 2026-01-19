import { useState, useEffect } from 'react';
// --- SAFE ID GENERATOR (Works on iPhone/HTTP) ---
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Backup for insecure networks
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
// Define the access levels
export type LicenseStatus = 'loading' | 'locked' | 'trial' | 'full' | 'dev';

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus>('loading');
  const [trialHoursLeft, setTrialHoursLeft] = useState<number>(0);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    // 1. Initialize Device ID (Fingerprint)
    let storedDeviceId = localStorage.getItem('decision_app_device_id');
    if (!storedDeviceId) {
      // CHANGE THIS LINE: Use your new safe function instead of crypto
      storedDeviceId = generateUUID(); 
      localStorage.setItem('decision_app_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
        
    // 2. Check for DEV_UNLOCK override
    if (process.env.NEXT_PUBLIC_DEV_UNLOCK === 'true') {
        console.log('DEV Mode Active');
        setStatus('dev');
        return;
    }

    // 3. Check Local Storage for existing license
    checkLicenseStatus(storedDeviceId);
  }, []);

  const checkLicenseStatus = async (did: string) => {
    const savedCode = localStorage.getItem('decision_app_license_code');
    
    // If no code, we are in "Soft Lock" (Limited Mode)
    if (!savedCode) {
      setStatus('locked');
      return;
    }

    // Verify the saved code with the server (prevents local storage hacking)
    try {
      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: savedCode, deviceId: did }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.type === 'trial') {
          setStatus('trial');
          setTrialHoursLeft(data.hoursRemaining);
        } else {
          setStatus('full');
        }
      } else {
        // If server says invalid (or trial expired), revert to locked
        setStatus('locked'); 
        if (data.status === 'expired') localStorage.removeItem('decision_app_license_code');
      }
    } catch (e) {
      // Offline fallback: keep locked to be safe, or trust local if you prefer
      setStatus('locked');
    }
  };

  const activateLicense = async (code: string) => {
    const res = await fetch('/api/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId }),
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem('decision_app_license_code', code);
      setStatus(data.type === 'trial' ? 'trial' : 'full');
      if (data.type === 'trial') setTrialHoursLeft(data.hoursRemaining);
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  };

  return { status, trialHoursLeft, activateLicense };
}