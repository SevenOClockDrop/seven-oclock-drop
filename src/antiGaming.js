// antiGaming.js — Abuse Prevention Logic

import { supabase } from './supabase.js';

// Generate a simple browser fingerprint
export function getDeviceFingerprint() {
  const fp = btoa(navigator.userAgent + screen.width + screen.height);
  localStorage.setItem('device_fp', fp);
  return fp;
}

// Check if free entry already claimed on this device today
export async function isFreeEntryAllowed(uid) {
  const fp = getDeviceFingerprint();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('free_entry_log')
    .select('*')
    .eq('uid', uid)
    .eq('device_fp', fp)
    .eq('date', today);

  return !data || data.length === 0;
}

// Log free entry claim
export async function logFreeEntry(uid) {
  const fp = getDeviceFingerprint();
  const today = new Date().toISOString().split('T')[0];

  await supabase.from('free_entry_log').insert([{
    uid,
    device_fp: fp,
    date: today,
    timestamp: new Date().toISOString()
  }]);
}

// Validate referral
export function isReferralValid(referrerUid, newUserUid) {
  return referrerUid !== newUserUid && !!referrerUid && !!newUserUid;
}
