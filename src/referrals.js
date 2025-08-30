// referrals.js — Referral Bonus Logic (Proposal-Compliant)

import { logEntry } from './reset.js'; // or wherever your entry logging lives

/**
 * Handles referral bonuses for both referrer and new user.
 * Awards 5 entries each, per proposal spec.
 * @param {string} referrerUid - UID of the referring Pioneer
 * @param {string} newUserUid - UID of the newly onboarded Pioneer
 */
export async function handleReferral(referrerUid, newUserUid) {
  if (!isReferralValid(referrerUid, newUserUid)) {
    console.warn('❌ Invalid referral attempt.');
    return;
  }

  // Award 5 entries to each
  await logEntry(referrerUid, 5);   // Referrer bonus
  await logEntry(newUserUid, 5);    // New user bonus

  console.log(`✅ Referral bonus applied: ${referrerUid} +5, ${newUserUid} +5`);
}

/**
 * Validates referral logic to prevent abuse.
 * - No self-referrals
 * - Both UIDs must be present
 * @param {string} referrerUid
 * @param {string} newUserUid
 * @returns {boolean}
 */
export function isReferralValid(referrerUid, newUserUid) {
  return (
    referrerUid &&
    newUserUid &&
    referrerUid !== newUserUid
  );
}
