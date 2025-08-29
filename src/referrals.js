// referrals.js — Referral Bonus Logic

import { supabase } from './supabase.js';
import { logEntry } from './supabase.js';

// 🎁 Reward: 5 bonus entries per referral
const BONUS_ENTRIES = 5;

// Called when a user signs up via referral link
export async function handleReferral(referrerUid, newUserUid) {
  try {
    // 1. Check if referral already logged
    const { data: existing, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_uid', referrerUid)
      .eq('new_user_uid', newUserUid);

    if (existing && existing.length > 0) {
      console.log('Referral already rewarded.');
      return;
    }

    // 2. Log referral
    await supabase.from('referrals').insert([{
      referrer_uid: referrerUid,
      new_user_uid: newUserUid,
      timestamp: new Date().toISOString()
    }]);

    // 3. Reward referrer with bonus entries
    for (let i = 0; i < BONUS_ENTRIES; i++) {
      await logEntry(referrerUid, 'referral');
    }

    console.log(`✅ ${BONUS_ENTRIES} bonus entries awarded to ${referrerUid}`);
  } catch (err) {
    console.error('❌ Referral logic failed:', err);
  }
}
