// Shared site behavior + Tweaks panel host integration
(function() {
  // Mobile nav toggle
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Highlight current page
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Donate amount toggle + embedded Stripe Checkout
  const amounts = document.querySelectorAll('.amount');
  const stripeBtn = document.getElementById('stripe-checkout');
  let embeddedCheckout = null;

  function donationSelection() {
    const active = document.querySelector('.amount.active');
    const freq = document.querySelector('.frequency button.active');
    const custom = document.getElementById('custom-amount');
    return {
      amount: Number((custom && custom.value) || (active && active.dataset.amount) || 0),
      frequency: freq ? freq.textContent.trim().toLowerCase() : 'one-time',
      name: (document.getElementById('donor-name') || {}).value || '',
      email: (document.getElementById('donor-email') || {}).value || ''
    };
  }

  amounts.forEach(a => a.addEventListener('click', () => {
    amounts.forEach(b => b.classList.remove('active'));
    a.classList.add('active');
    const custom = document.getElementById('custom-amount');
    if (custom) custom.value = a.dataset.amount || '';
  }));

  // Frequency toggle
  document.querySelectorAll('.frequency button').forEach(b => {
    b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  if (stripeBtn) {
    stripeBtn.addEventListener('click', async () => {
      const errorEl = document.getElementById('donation-error');
      const mount = document.getElementById('embedded-checkout');
      const selection = donationSelection();
      errorEl.textContent = '';

      if (!selection.amount || selection.amount < 1) {
        errorEl.textContent = 'Choose or enter a donation amount of at least $1.';
        return;
      }
      if (!selection.email || !selection.email.includes('@')) {
        errorEl.textContent = 'Enter a valid email address for your receipt.';
        return;
      }

      stripeBtn.disabled = true;
      stripeBtn.textContent = 'Loading secure payment…';
      try {
        if (embeddedCheckout) embeddedCheckout.destroy();
        const response = await fetch('/api/create-donation-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selection)
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Checkout could not be started');

        const stripe = Stripe(payload.publishableKey);
        embeddedCheckout = await stripe.initEmbeddedCheckout({
          clientSecret: payload.clientSecret
        });
        mount.hidden = false;
        mount.closest('.give-card')?.classList.add('checkout-active');
        embeddedCheckout.mount('#embedded-checkout');
        mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        errorEl.textContent = error.message || 'Secure payment could not be loaded.';
      } finally {
        stripeBtn.disabled = false;
        stripeBtn.textContent = 'Enter secure payment details';
      }
    });

    const sessionId = new URLSearchParams(location.search).get('session_id');
    if (sessionId) {
      fetch('/api/session-status?session_id=' + encodeURIComponent(sessionId))
        .then(r => r.json())
        .then(data => {
          if (data.confirmed && data.metadata && data.metadata.purpose === 'scholarship-donation') {
            document.getElementById('donation-confirmation').hidden = false;
          }
        })
        .catch(() => {});
    }
  }

  // Admissions and event RSVP forms are saved to the YES GoHighLevel subaccount.
  document.querySelectorAll('form[data-ghl-contact]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit], .submit-btn');
      const original = btn ? btn.innerHTML : '';
      if (btn) { btn.innerHTML = 'Saving…'; btn.disabled = true; }
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, formType: form.dataset.formType }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Please try again.');
        if (btn) btn.innerHTML = '✓ Submitted — we\'ll be in touch';
        form.reset();
      } catch (error) {
        if (btn) btn.innerHTML = 'Could not submit — try again';
      } finally {
        setTimeout(() => { if (btn) { btn.innerHTML = original; btn.disabled = false; } }, 3000);
      }
    });
  });
})();

/* ============ Tweaks panel host integration ============ */
(function() {
  const root = document.documentElement;
  const STORAGE = 'yes-tweaks-v1';
  const DEFAULTS = {
    accent: 'crimson',
    density: 'comfortable',
    headlineFont: 'playfair'
  };
  let state = { ...DEFAULTS, ...readStored() };

  function readStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); }
    catch { return {}; }
  }
  function persist() { localStorage.setItem(STORAGE, JSON.stringify(state)); }

  function apply() {
    // Accent
    if (state.accent === 'navy') {
      root.style.setProperty('--color-primary', 'var(--yes-navy)');
      root.style.setProperty('--color-link', 'var(--yes-navy)');
    } else if (state.accent === 'gold') {
      root.style.setProperty('--color-primary', 'var(--yes-gold-deep)');
      root.style.setProperty('--color-link', 'var(--yes-gold-deep)');
    } else {
      root.style.setProperty('--color-primary', 'var(--yes-crimson)');
      root.style.setProperty('--color-link', 'var(--yes-crimson)');
    }
    document.body.dataset.accent = state.accent;

    // Density
    if (state.density === 'compact') {
      root.style.setProperty('--space-9', '4rem');
      root.style.setProperty('--space-8', '2.5rem');
    } else {
      root.style.removeProperty('--space-9');
      root.style.removeProperty('--space-8');
    }

    // Headline font
    if (state.headlineFont === 'oswald') {
      root.style.setProperty('--font-display', '"Oswald", Impact, sans-serif');
    } else if (state.headlineFont === 'cormorant') {
      root.style.setProperty('--font-display', '"Cormorant Garamond", Georgia, serif');
    } else {
      root.style.removeProperty('--font-display');
    }
  }

  // Tweak panel UI
  function buildPanel() {
    if (document.getElementById('yes-tweaks-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'yes-tweaks-panel';
    panel.innerHTML = `
      <style>
        #yes-tweaks-panel {
          position: fixed; right: 18px; bottom: 18px; z-index: 9999;
          width: 280px;
          background: #fff; border-radius: 14px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
          font-family: 'Inter', system-ui, sans-serif;
          color: #152B54;
          overflow: hidden;
          transform: translateY(8px); opacity: 0;
          transition: transform 240ms, opacity 240ms;
        }
        #yes-tweaks-panel.shown { transform: translateY(0); opacity: 1; }
        #yes-tweaks-panel .hd {
          padding: 14px 16px; background: #0B1C3D; color: #fff;
          display: flex; justify-content: space-between; align-items: center;
        }
        #yes-tweaks-panel .hd b { font-family: 'Oswald', sans-serif; letter-spacing: .22em; font-size: .8rem; text-transform: uppercase; }
        #yes-tweaks-panel .hd button { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0 4px; }
        #yes-tweaks-panel .body { padding: 14px 16px 18px; }
        #yes-tweaks-panel .row { margin-bottom: 14px; }
        #yes-tweaks-panel label.lbl {
          display: block; font-family: 'Oswald', sans-serif;
          text-transform: uppercase; letter-spacing: .18em;
          font-size: .68rem; color: #20407A; margin-bottom: 8px; font-weight: 600;
        }
        #yes-tweaks-panel .opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        #yes-tweaks-panel .opt {
          padding: 8px; border-radius: 8px; cursor: pointer; text-align: center;
          background: #F7F4EC; border: 1.5px solid transparent;
          font-size: .78rem; font-weight: 600;
          transition: all 200ms;
        }
        #yes-tweaks-panel .opt:hover { background: #F9D8DC; }
        #yes-tweaks-panel .opt.active { background: #C8202E; color: #fff; border-color: #8A1A24; }
        #yes-tweaks-panel .swatch {
          height: 28px; border-radius: 6px; margin-bottom: 4px;
        }
      </style>
      <div class="hd">
        <b>Tweaks</b>
        <button data-close aria-label="Close">×</button>
      </div>
      <div class="body">
        <div class="row">
          <label class="lbl">Accent color</label>
          <div class="opts" data-key="accent">
            <div class="opt" data-val="crimson"><div class="swatch" style="background:#C8202E"></div>Crimson</div>
            <div class="opt" data-val="navy"><div class="swatch" style="background:#0B1C3D"></div>Navy</div>
            <div class="opt" data-val="gold"><div class="swatch" style="background:#C79226"></div>Gold</div>
          </div>
        </div>
        <div class="row">
          <label class="lbl">Headline font</label>
          <div class="opts" data-key="headlineFont">
            <div class="opt" data-val="playfair">Playfair</div>
            <div class="opt" data-val="cormorant">Cormorant</div>
            <div class="opt" data-val="oswald">Oswald</div>
          </div>
        </div>
        <div class="row">
          <label class="lbl">Density</label>
          <div class="opts" data-key="density" style="grid-template-columns: 1fr 1fr;">
            <div class="opt" data-val="comfortable">Comfortable</div>
            <div class="opt" data-val="compact">Compact</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('[data-close]').addEventListener('click', () => {
      hidePanel();
      window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
    });

    panel.querySelectorAll('.opts').forEach(group => {
      const key = group.dataset.key;
      group.querySelectorAll('.opt').forEach(opt => {
        if (opt.dataset.val === state[key]) opt.classList.add('active');
        opt.addEventListener('click', () => {
          group.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          state[key] = opt.dataset.val;
          persist();
          apply();
        });
      });
    });
  }

  function showPanel() {
    buildPanel();
    requestAnimationFrame(() => document.getElementById('yes-tweaks-panel').classList.add('shown'));
  }
  function hidePanel() {
    const p = document.getElementById('yes-tweaks-panel');
    if (p) p.classList.remove('shown');
  }

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') showPanel();
    if (d.type === '__deactivate_edit_mode') hidePanel();
  });

  apply();
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
})();
