// reset.js — Daily Cleanup + Prep Logic

import { supabase } from './supabase.js';

export async function dailyReset() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Archive today's pot total
    const { data: potData, error: potError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'entry')
      .eq('date', today);

    const totalPot = potData ? potData.reduce((sum, tx) => sum + tx.amount, 0) : 0;

    await supabase.from('pot_history').insert([{
      date: today,
      total: totalPot,
      timestamp: new Date().toISOString()
    }]);

    // 2. Delete today's entries
    await supabase.from('entries').delete().eq('date', today);

    // 3. Reset free entry flags
    await supabase.from('users').update({ claimed_today: false });

    console.log(`✅ Daily reset complete. Pot archived: ${totalPot} Pi`);
  } catch (err) {
    console.error('❌ Daily reset failed:', err);
  }
}
