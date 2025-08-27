const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// The server now connects to your Supabase database using the secret
// Environment Variables you set up in Vercel.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TEMPORARY DATA (to be replaced later) ---
let currentPotValue = 1540; // This is still a placeholder for now.
const usedReferralCodes = new Set(); // We'll move this to the database later.
const VALID_REFERRAL_CODES = ["DROP1234", "DROP5678", "DROP2025", "PIONEER"];


// --- API ENDPOINTS ---

// GET /api/app-data
// This function is now ASYNCHRONOUS because database calls take time.
app.get('/api/app-data', async (req, res) => {
  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ message: "User ID (uid) is required." });
  }

  try {
    // 1. Check if the user exists in our 'users' table.
    let { data: user, error } = await supabase
      .from('users')
      .select('entries')
      .eq('uid', uid)
      .single(); // .single() gets one record or null

    // 2. If the user does NOT exist, create them.
    if (error && error.code === 'PGRST116') { // PGRST116 means "no rows returned"
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ uid: uid, entries: 0 }) // They start with 0 entries by default.
        .select()
        .single();

      if (insertError) throw insertError; // If creating the user fails, throw an error.
      user = newUser; // The new user is now our current user.
    } else if (error) {
      throw error; // If any other database error occurred, throw it.
    }

    // 3. Calculate the next drop time.
    const dropHourUTC = 2; // 7 PM PST is 02:00 UTC
    const now = new Date();
    let nextDrop = new Date(now.valueOf());
    nextDrop.setUTCHours(dropHourUTC, 0, 0, 0);
    if (now.getUTCHours() >= dropHourUTC) {
      nextDrop.setDate(nextDrop.getDate() + 1);
    }

    // 4. Send the final data back to the frontend.
    res.json({
      potValue: currentPotValue,
      nextDropTimestamp: nextDrop.getTime(),
      userEntries: user.entries // Send the number of entries from the database.
    });

  } catch (dbError) {
    console.error('Database error:', dbError);
    res.status(500).json({ message: "An error occurred with the database." });
  }
});


// POST /api/apply-referral
app.post('/api/apply-referral', async (req, res) => {
  const { code, uid } = req.body;
  if (!uid || !code) {
    return res.status(400).json({ success: false, message: 'User ID and code are required.' });
  }
  if (usedReferralCodes.has(code)) {
    return res.status(400).json({ success: false, message: '❌ This code has already been used.' });
  }

  if (VALID_REFERRAL_CODES.includes(code)) {
    try {
      // 1. Get the user's current number of entries from the database.
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('entries')
        .eq('uid', uid)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calculate the new number of entries.
      const newEntryCount = user.entries + 5;

      // 3. Update the user's record in the database with the new value.
      const { error: updateError } = await supabase
        .from('users')
        .update({ entries: newEntryCount })
        .eq('uid', uid);

      if (updateError) throw updateError;

      usedReferralCodes.add(code); // Mark the code as used.
      return res.json({ success: true, message: '✅ Referral applied!', newEntryCount: newEntryCount });

    } catch (dbError) {
      console.error('Database error on referral:', dbError);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
  } else {
    return res.status(400).json({ success: false, message: '❌ Invalid referral code.' });
  }
});

// This makes the server work on Vercel.
module.exports = app;
