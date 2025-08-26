const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let currentPotValue = 1540;
let userEntries = { 'test-user': 15 };
const usedReferralCodes = new Set();
const VALID_REFERRAL_CODES = ["DROP1234", "DROP5678", "DROP2025", "PIONEER"];

app.get('/api/app-data', (req, res) => {
  const dropHourUTC = 2;
  const now = new Date();
  let nextDrop = new Date(now.valueOf());
  nextDrop.setUTCHours(dropHourUTC, 0, 0, 0);
  if (now.getTime() > nextDrop.getTime()) {
    nextDrop.setDate(nextDrop.getDate() + 1);
  }
  res.json({
    potValue: currentPotValue,
    nextDropTimestamp: nextDrop.getTime(),
    userEntries: userEntries['test-user'] || 0
  });
});

app.post('/api/apply-referral', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Please enter a referral code.' });
  if (usedReferralCodes.has(code)) return res.status(400).json({ success: false, message: '❌ This code has already been used.' });
  if (VALID_REFERRAL_CODES.includes(code)) {
    usedReferralCodes.add(code);
    userEntries['test-user'] = (userEntries['test-user'] || 0) + 5;
    return res.json({ success: true, message: '✅ Referral applied!', newEntryCount: userEntries['test-user'] });
  } else {
    return res.status(400).json({ success: false, message: '❌ Invalid referral code.' });
  }
});

module.exports = app;
