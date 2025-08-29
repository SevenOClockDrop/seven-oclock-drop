// referrals.js — Dual Referral Bonus Logic

import { supabase } from './supabase.js';
import { logEntry } from './supabase.js';

const BONUS_ENTRIES = 10;

export async function handleReferral(referrerUid, newUserUid) {
  try {
    // 1. Check if referral already rewarded
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

    // 3. Reward both users
    for (let i = 0; i < BONUS_ENTRIES; i++) {
      await logEntry(referrerUid, 'referral');
      await logEntry(newUserUid, 'referral');
    }

    console.log(`✅ ${BONUS_ENTRIES} entries awarded to both ${referrerUid} and ${newUserUid}`);
  } catch (err) {
    console.error('❌ Referral logic failed:', err);
  }
}
