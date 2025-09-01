import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentId, uid, amount } = req.body;

  // ✅ Securely access your Pi validation key
  const validationKey = process.env.PI_VALIDATION_KEY;

  // ✅ Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!validationKey || !paymentId || !uid || amount === undefined || !supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Missing required fields or environment variables' });
  }

  try {
    // 🔄 Approve the payment
    const approve = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${validationKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ metadata: { uid } })
    });

    const approveResult = await approve.json();
    console.log("✅ Payment approved:", approveResult);

    // ✅ Complete the payment
    const complete = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${validationKey}`,
        'Content-Type': 'application/json'
      }
    });

    const completeResult = await complete.json();
    console.log("✅ Payment completed:", completeResult);

    // 🧾 Log to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    await supabase.from('entries').insert([
      {
        uid,
        tier: `tier-${amount}`,
        date: today,
        timestamp: new Date().toISOString()
      }
    ]);

    await supabase.from('transactions').insert([
      {
        uid,
        amount,
        type: 'entry',
        date: today,
        timestamp: new Date().toISOString()
      }
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Payment flow failed:", err);
    return res.status(500).json({ error: 'Payment processing failed' });
  }
}
