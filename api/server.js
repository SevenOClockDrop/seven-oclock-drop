const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURATION ---
const TIERS = {
  '1.00': 10,
  '5.00': 60,  // 50 + 10 bonus
  '10.00': 130 // 100 + 30 bonus
};

// --- TEMPORARY DATA ---
let currentPotValue = 1540;
const usedReferralCodes = new Set();
const VALID_REFERRAL_CODES = ["DROP1234", "DROP5678", "DROP2025", "PIONEER"];

// --- HELPER FUNCTION ---
// Gets a user from the DB or creates them if they don't exist.
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

// --- API ENDPOINTS ---

// GET /api/app-data
app.get('/api/app-data', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

  try {
    const user = await getOrCreateUser(uid);
    const dropHourUTC = 2;
    const now = new Date();
    let nextDrop = new Date(now.valueOf());
    nextDrop.setUTCHours(dropHourUTC, 0, 0, 0);
    if (now.getUTCHours() >= dropHourUTC) {
      nextDrop.setDate(nextDrop.getDate() + 1);
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

// POST /api/apply-referral
app.post('/api/apply-referral', async (req, res) => {
  // This logic remains the same as before.
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


// --- NEW PAYMENT ENDPOINTS ---

// POST /api/create-payment
// Step 1 of the payment flow: The frontend asks the backend to prepare a payment.
app.post('/api/create-payment', async (req, res) => {
  const { amount, uid } = req.body;
  if (!uid || !amount || !TIERS[amount]) {
    return res.status(400).json({ success: false, message: "Invalid tier or user ID." });
  }

  try {
    const piPayment = {
      amount: parseFloat(amount),
      memo: `Entries for SevenO'Clock Drop (${TIERS[amount]} entries)`,
      metadata: { uid: uid, tier: amount } // We store the user ID and tier in the metadata.
    };
    res.json({ success: true, piPayment: piPayment });
  } catch (error) {
    console.error("Error creating payment object:", error);
    res.status(500).json({ success: false, message: "Could not prepare payment." });
  }
});

// POST /api/complete-payment
// Step 2 of the payment flow: The Pi SDK tells our backend that the payment was approved.
app.post('/api/complete-payment', async (req, res) => {
  const { paymentId, txid } = req.body;
  
  // For now, in the sandbox, we can't fully verify the transaction on-chain.
  // We will trust the callback from the SDK and add the entries.
  // In a Mainnet app, we would add a verification step here.
  
  // We need to get the user's UID from the payment metadata.
  // This is a placeholder for now as the sandbox doesn't provide it easily.
  // We will need to adjust this logic based on Pi's final API.
  // For now, we can't know which user paid. This is a limitation of the current sandbox.
  // We will proceed assuming we can get the UID in the future.
  
  // THIS IS A SIMPLIFICATION FOR THE SANDBOX.
  // In a real app, you would get the payment from Pi's servers using the paymentId,
  // extract the UID from its metadata, and then update that user's entries.
  
  // Since we can't do that yet, this endpoint won't work perfectly, but it sets up the structure.
  
  console.log(`Received payment completion for PaymentID: ${paymentId} and TXID: ${txid}`);
  
  // We will return a success message, but can't update entries without the UID.
  res.json({ success: true, message: "Payment received (Sandbox Mode)." });
  
  // The correct logic would look something like this:
  /*
  try {
    const payment = await getPaymentFromPiServers(paymentId);
    const uid = payment.metadata.uid;
    const tier = payment.metadata.tier;
    const entriesToAdd = TIERS[tier];

    const user = await getOrCreateUser(uid);
    const newEntryCount = user.entries + entriesToAdd;
    await supabase.from('users').update({ entries: newEntryCount }).eq('uid', uid);

    res.json({ success: true, newEntryCount: newEntryCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed." });
  }
  */
});


module.exports = app;
