const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();

// --- MIDDLEWARE ---
// This allows your frontend to talk to your backend
app.use(cors());
// This allows the server to understand JSON data sent from the frontend
app.use(express.json());

// --- DATABASE CONNECTION ---
// These lines securely read the secret keys you stored in Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- APP CONFIGURATION ---
const TIERS = {
  '1.00': 10,
  '5.00': 60,  // 50 base + 10 bonus
  '10.00': 130 // 100 base + 30 bonus
};

// --- TEMPORARY IN-MEMORY DATA ---
// In the future, this will come from the database
let currentPotValue = 1540;
const usedReferralCodes = new Set();
const VALID_REFERRAL_CODES = ["DROP1234", "DROP5678", "DROP2025", "PIONEER"];

// --- HELPER FUNCTION ---
// A reusable function to get a user's data from the database.
// If the user doesn't exist, it creates a new record for them.
async function getOrCreateUser(uid) {
  let { data: user, error } = await supabase.from('users').select('*').eq('uid', uid).single();
  
  // 'PGRST116' is the Supabase error code for "no rows found"
  if (error && error.code === 'PGRST116') {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ uid: uid, entries: 0 }) // New users start with 0 entries
      .select()
      .single();
    if (insertError) throw insertError;
    return newUser;
  } else if (error) {
    throw error;
  }
  return user;
}

// --- API ENDPOINTS ---

// Endpoint to get the main app data when a user logs in
app.get('/api/app-data', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

  try {
    const user = await getOrCreateUser(uid);
    
    // Calculate the timestamp for the next 7 PM PST drop
    const dropHourUTC = 2; // 7 PM PST is 2:00 AM UTC the next day
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

// Endpoint to handle referral code submissions
app.post('/api/apply-referral', async (req, res) => {
  const { code, uid } = req.body;
  if (!uid || !code) return res.status(400).json({ success: false, message: 'User ID and code are required.' });
  if (usedReferralCodes.has(code)) return res.status(400).json({ success: false, message: '❌ This code has already been used.' });

  if (VALID_REFERRAL_CODES.includes(code)) {
    try {
      const user = await getOrCreateUser(uid);
      const newEntryCount = user.entries + 5;
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

// --- PAYMENT ENDPOINTS ---

// Step 1: Frontend asks backend to prepare a payment object for the Pi SDK
app.post('/api/create-payment', async (req, res) => {
  const { amount, uid } = req.body;
  if (!uid || !amount || !TIERS[amount]) {
    return res.status(400).json({ success: false, message: "Invalid tier or user ID." });
  }

  try {
    // This is the payment object the Pi SDK needs
    const piPayment = {
      amount: parseFloat(amount),
      memo: `Entries for SevenO'Clock Drop (${TIERS[amount]} entries)`,
      metadata: { uid: uid, tier: amount } // We pass the user's ID and tier choice in the metadata
    };
    res.json({ success: true, piPayment: piPayment });
  } catch (error) {
    console.error("Error creating payment object:", error);
    res.status(500).json({ success: false, message: "Could not prepare payment." });
  }
});

// Step 2: Pi SDK tells our frontend the payment is done, and frontend tells our backend.
app.post('/api/complete-payment', async (req, res) => {
  const { paymentId, txid } = req.body;
  
  // IMPORTANT SANDBOX NOTE:
  // In the real world (Mainnet), we would take the paymentId and make a server-to-server
  // call to Pi's servers to get the payment details, including the metadata.
  // The current sandbox does not support this server-to-server verification easily.
  // The code below is a placeholder for how it *should* work.
  // For now, we cannot securely know which user paid from the backend.
  
  console.log(`Received payment completion for PaymentID: ${paymentId} and TXID: ${txid}`);
  
  // This is a SIMPLIFICATION for the sandbox.
  // We will trust the frontend for now, but this is not secure for Mainnet.
  // In a future update, we will replace this with a proper verification flow.
  res.json({ success: true, message: "Payment received (Sandbox Mode). We will update your entries shortly." });
});


// This makes the server available for Vercel to run.
module.exports = app;
