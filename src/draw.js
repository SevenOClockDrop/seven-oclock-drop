// draw.js — Winner Selection + Payout Logic

import { createClient } from '@supabase/supabase-js';
import { Pi } from 'pi-sdk'; // Assume Pi SDK is globally available

const supabase = createClient('https://your-project.supabase.co', 'public-anon-key');

// Your personal Pi wallet for platform fee
const PLATFORM_WALLET = 'your_personal_pi_wallet_address';

async function selectWinnerAndPayOut() {
  try {
    // 1. Fetch all valid entries for today
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0]);

    if (error || !entries || entries.length === 0) {
      console.error('No entries found or error:', error);
      return;
    }

    // 2. Secure random selection
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const winnerIndex = seed % entries.length;
    const winner = entries[winnerIndex];

    // 3. Calculate payouts
    const potAmount = await getTodayPot(); // Assume this returns total Pi collected
    const winnerAmount = potAmount * 0.95;
    const platformFee = potAmount * 0.05;

    // 4. Send payments via Pi SDK
    Pi.sendPayment(winner.wallet, winnerAmount, {
      memo: `Seven O'Clock Drop Winner`,
      metadata: { winnerId: winner.uid }
    });

    Pi.sendPayment(PLATFORM_WALLET, platformFee, {
      memo: `Platform Fee`,
      metadata: { potDate: new Date().toISOString().split('T')[0] }
    });

    // 5. Log winner and transactions
    await supabase.from('winners').insert([{
      uid: winner.uid,
      wallet: winner.wallet,
      amount: winnerAmount,
      timestamp: new Date().toISOString(),
      seed: seed
    }]);

    console.log(`✅ Winner selected: ${winner.uid} — Paid ${winnerAmount} Pi`);
  } catch (err) {
    console.error('❌ Draw failed:', err);
  }
}

// Utility: Get today's pot total
async function getTodayPot() {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'entry')
    .eq('date', new Date().toISOString().split('T')[0]);

  if (error || !data) return 0;

  return data.reduce((sum, tx) => sum + tx.amount, 0);
}

export default selectWinnerAndPayOut;
