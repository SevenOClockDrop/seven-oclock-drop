// supabase.js — Supabase Client + Table Hooks

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'public-anon-key'; // Use env vars in production

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🧾 Table: users
// Stores Pi UID and wallet address
export async function registerUser(uid, wallet) {
  return await supabase.from('users').upsert({ uid, wallet });
}

// 🎟️ Table: entries
// Stores each entry with UID, date, and tier
export async function logEntry(uid, tier) {
  return await supabase.from('entries').insert({
    uid,
    tier,
    date: new Date().toISOString().split('T')[0]
  });
}

// 💰 Table: transactions
// Logs Pi payments for entries and payouts
export async function logTransaction(uid, amount, type, metadata) {
  return await supabase.from('transactions').insert({
    uid,
    amount,
    type, // 'entry' or 'payout'
    metadata,
    date: new Date().toISOString().split('T')[0]
  });
}

// 🏆 Table: winners
// Stores winner UID, payout amount, and randomness seed
export async function logWinner(uid, wallet, amount, seed) {
  return await supabase.from('winners').insert({
    uid,
    wallet,
    amount,
    seed,
    timestamp: new Date().toISOString()
  });
}
