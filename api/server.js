// server.js — SevenO'Clock Drop Backend

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- ENTRY TIERS (Proposal-Compliant) ---
const TIERS = {
  '1.00': 10,
  '5.00': 60,   // 50 base + 10 bonus
  '10.00': 150  // 100 base + 50 bonus — corrected per proposal
};

// --- TEMPORARY IN-MEMORY DATA ---
let currentPotValue = 1540;
const usedReferralCodes = new Set();
const VALID_REFERRAL_CODES = ["DROP1234", "DROP5678", "DROP2025", "PIONEER"];

// --- USER HELPER ---
async function getOrCreateUser(uid) {
  let { data: user, error } = await supabase.from('users').select('*').eq('uid', uid).single();
  if (error && error.code === 'PGRST116') {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ uid: uid, entries: 0 })
      .select()
      .single();
    if (insertError) throw insertError;
    return newUser;
  } else if (error) {
    throw error;
  }
  return user;
}

// --- APP DATA ENDPOINT ---
app.get('/api/app-data', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

  try {
    const user = await getOrCreateUser(uid);
    const dropHourUTC = 2; // 7 PM PDT = 2 AM UTC next day
    const now = new Date();
    let nextDrop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), dropHourUTC, 0, 0, 0));
    if (now.getTime() >= nextDrop.getTime()) {
      nextDrop.setUTCDate(nextDrop.getUTCDate() + 1);
    }

    res.json({
      potValue: currentPotValue,
      nextDropTimestamp: nextDrop.getTime(),
      userEntries: user.entries
    });
  } catch (dbError) {
    console.error('Database error in app-data:', dbError);
    res.status(500).json({ message: "An error occurred with the database." });
  }
});

// --- REFERRAL ENDPOINT ---
app.post('/api/apply-referral', async (req, res) => {
  const { code, uid } = req.body;
  if (!uid || !code) return res.status(400).json({ success: false, message: 'User ID and code are required.' });
  if (usedReferralCodes.has(code)) return res.status(400).json({ success: false, message: '❌ This code has already been used.' });

  if (VALID_REFERRAL_CODES.includes(code)) {
    try {
      const user = await getOrCreateUser(uid);
      const newEntryCount = user.entries + 5; // ✅ Proposal-compliant: 5 bonus entries
      await supabase.from('users').update({ entries: newEntryCount }).eq('uid', uid);
      usedReferralCodes.add(code);
      return res.json({ success: true, message: '✅ Referral applied!', newEntryCount: newEntryCount });
    } catch (dbError) {
      console.error('Database error on referral:', dbError);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
  } else {
    return res.status(400).json({ success: false, message: '❌ Invalid referral code.' });
  }
});

// --- PAYMENT PREPARATION ---
app.post('/api/create-payment', async (req, res) => {
  const { amount, uid } = req.body;
  if (!uid || !amount || !TIERS[amount]) {
    return res.status(400).json({ success: false, message: "Invalid tier or user ID." });
  }

  try {
    const piPayment = {
      amount: parseFloat(amount),
      memo: `Entries for SevenO'Clock Drop (${TIERS[amount]} entries)`,
      metadata: { uid: uid, tier: amount }
    };
    res.json({ success: true, piPayment: piPayment });
  } catch (error) {
    console.error("Error creating payment object:", error);
    res.status(500).json({ success: false, message: "Could not prepare payment." });
  }
});

// --- PAYMENT COMPLETION (Sandbox Mode) ---
app.post('/api/complete-payment', async (req, res) => {
  const { paymentId, txid } = req.body;
  console.log(`Received payment completion for PaymentID: ${paymentId} and TXID: ${txid}`);
  res.json({ success: true, message: "Payment received (Sandbox Mode). We will update your entries shortly." });
});

// --- EXPORT FOR VERCEL ---
module.exports = app;
