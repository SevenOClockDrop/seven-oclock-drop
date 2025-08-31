import { useState } from 'react';

export default function SevenDropUI() {
  const [claimed, setClaimed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  function playSound(name) {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.8;
    audio.play();
  }

  function handleClaim() {
    playSound('zap');
    setClaimed(true);
    setShowOverlay(true);
    // TODO: logEntry(uid, 'free') + logTransaction(uid, 0, 'entry')
  }

  function handleTierSelect(amount, bonus) {
    playSound('chime');
    setShowOverlay(false);
    // TODO: logEntry(uid, 'tierX') + logTransaction(uid, amount, 'entry')
  }

  return (
    <div style={{ fontFamily: 'Montserrat', color: '#fff', padding: '2rem' }}>
      {!claimed && (
        <button
          style={{
            background: '#C800FF',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '999px',
            color: '#fff',
            fontWeight: 'bold',
            boxShadow: '0 0 12px #C800FF',
          }}
          onClick={handleClaim}
        >
          Claim Free Entry
        </button>
      )}

      {showOverlay && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#00CFFF' }}>Boost Your Entries</h2>
          {[{ amount: 1, bonus: 0 }, { amount: 5, bonus: 1 }, { amount: 10, bonus: 3 }].map(tier => (
            <button
              key={tier.amount}
              style={{
                background: '#C800FF',
                border: 'none',
                margin: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: '0 0 8px #C800FF',
              }}
              onClick={() => handleTierSelect(tier.amount, tier.bonus)}
            >
              {tier.amount} Pi → {tier.amount + tier.bonus} Entries
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
