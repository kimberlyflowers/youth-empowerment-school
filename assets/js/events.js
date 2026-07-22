(function () {
  const money = cents => cents === 0 ? 'Free' : new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(cents / 100);

  const dateParts = iso => {
    const date = new Date(iso);
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.toLocaleDateString('en-US', { day: '2-digit' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.toLocaleDateString('en-US', { year: 'numeric' }),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  async function loadEventsList() {
    const list = document.querySelector('.event-list');
    if (!list) return;
    const response = await fetch('/api/events');
    const payload = await response.json();
    const events = payload.result || [];
    if (!events.length) return;

    list.innerHTML = events.map(event => {
      const d = dateParts(event.startDate);
      const tiers = event.priceTiers || [];
      const lowest = tiers.filter(t => !t.soldOut).sort((a, b) => a.priceCents - b.priceCents)[0];
      const ticketText = lowest ? (lowest.priceCents ? `From ${money(lowest.priceCents)}` : 'Free · RSVP') : 'Details online';
      return `<article class="event">
        <div class="event-date"><span>${d.weekday}</span><strong>${d.day}</strong><span>${d.month}</span><span class="yr">${d.year}</span></div>
        <div>
          <h3><a href="event.html?slug=${encodeURIComponent(event.slug)}" style="color:inherit;text-decoration:none">${escapeHtml(event.title)}</a></h3>
          <p>${escapeHtml(event.tagline || (event.about || [])[0] || '')}</p>
          <div class="ev-meta"><span>● ${d.time}</span><span>● ${escapeHtml(event.location?.name || 'Location TBA')}</span><span>● ${ticketText}</span></div>
        </div>
        <a href="event.html?slug=${encodeURIComponent(event.slug)}" class="btn ${lowest && lowest.priceCents ? 'btn-gold' : 'btn-primary'}">View details →</a>
      </article>`;
    }).join('');

    const featured = document.querySelector('.feature-event');
    if (featured) {
      const event = events[0];
      const d = dateParts(event.startDate);
      featured.innerHTML = `<div style="position:relative;z-index:2">
        <span class="eyebrow on-dark" style="color:var(--yes-gold-bright)">Featured event</span>
        <h2>${escapeHtml(event.title)}</h2>
        <p>${escapeHtml(event.tagline || (event.about || [])[0] || '')}</p>
        <a href="event.html?slug=${encodeURIComponent(event.slug)}" class="btn btn-gold btn-lg">View event details →</a>
      </div><div class="ev-card"><div class="day">${d.weekday}</div><div class="num">${d.day}</div><div class="month">${d.month}</div><hr><div class="when">${d.time}<br>${escapeHtml(event.location?.name || 'Location TBA')}</div></div>`;
    }
  }

  async function loadEventDetail() {
    if (!document.querySelector('.event-body')) return;
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) return;
    const response = await fetch('/api/events?slug=' + encodeURIComponent(slug));
    const payload = await response.json();
    const event = payload.result;
    if (!event) return;

    const start = dateParts(event.startDate);
    const end = event.endDate ? dateParts(event.endDate) : null;
    document.title = `${event.title} — YES Youth Empowerment School`;
    document.querySelector('.event-tag').textContent = event.kind || 'YES Event';
    document.querySelector('.event-hero h1').textContent = event.title;
    document.querySelector('.event-tagline').textContent = event.tagline || '';
    document.querySelector('.event-meta-row').innerHTML = `<div class="item"><div><strong>${start.full}</strong><span>${start.time}${end ? ` – ${end.time}` : ''} ${escapeHtml(event.timezone || '')}</span></div></div><div class="item"><div><strong>${escapeHtml(event.location?.name || 'Location TBA')}</strong><span>${escapeHtml(event.location?.city || '')}</span></div></div>`;

    const sections = document.querySelectorAll('.event-section');
    if (sections[0]) sections[0].innerHTML = `<h2>About this event</h2>${(event.about || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}`;
    if (sections[1]) sections[1].innerHTML = `<h2>Schedule</h2><div class="schedule-list">${(event.agenda || []).map(item => `<div class="schedule-row"><span class="when">${escapeHtml(item.time)}</span><span class="what">${escapeHtml(item.title)}${item.detail ? ` · ${escapeHtml(item.detail)}` : ''}</span></div>`).join('')}</div>`;
    if (sections[3]) sections[3].innerHTML = `<h2>Where</h2><div class="location-card"><h4>${escapeHtml(event.location?.name || 'Location TBA')}</h4><p class="addr">${escapeHtml(event.location?.address || '')}<br>${escapeHtml(event.location?.city || '')}</p></div>`;
    if (sections[4]) sections[4].innerHTML = `<h2>Frequently asked</h2>${(event.faq || []).map(item => `<details class="faq-item"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('')}`;

    const card = document.querySelector('.checkout-card');
    const tiers = event.priceTiers || [];
    let selectedTier = tiers.find(t => !t.soldOut) || null;
    card.querySelector('.checkout-meta').innerHTML = `<div class="row"><div><strong>${start.full}</strong><span>${start.time}${end ? ` – ${end.time}` : ''}</span></div></div><div class="row"><div><strong>${escapeHtml(event.location?.name || 'Location TBA')}</strong><span>${escapeHtml(event.location?.city || '')}</span></div></div>`;
    card.querySelectorAll('.ticket').forEach(ticket => ticket.remove());
    const label = card.querySelector('.ticket-label');
    tiers.slice().reverse().forEach(tier => {
      const ticket = document.createElement('button');
      ticket.type = 'button';
      ticket.className = `ticket${tier === selectedTier ? ' active' : ''}`;
      ticket.disabled = Boolean(tier.soldOut);
      ticket.innerHTML = `<div class="radio"></div><div class="body"><div class="name">${escapeHtml(tier.label)} <span style="float:right" class="price">${tier.soldOut ? 'Sold out' : money(tier.priceCents)}</span></div><div class="desc">${escapeHtml(tier.description || '')}</div></div>`;
      ticket.addEventListener('click', () => {
        card.querySelectorAll('.ticket').forEach(item => item.classList.remove('active'));
        ticket.classList.add('active');
        selectedTier = tier;
      });
      label.insertAdjacentElement('afterend', ticket);
    });

    const register = document.getElementById('event-register');
    const mount = document.getElementById('event-embedded-checkout');
    const errorEl = document.getElementById('event-payment-error');
    register.textContent = selectedTier && selectedTier.priceCents > 0 ? 'Enter secure payment details' : 'Reserve my spot';
    register.addEventListener('click', async eventClick => {
      eventClick.preventDefault();
      if (!selectedTier || selectedTier.priceCents === 0) {
        location.href = 'events.html#rsvp';
        return;
      }
      errorEl.textContent = '';
      register.setAttribute('aria-disabled', 'true');
      try {
        const checkoutResponse = await fetch('/api/create-event-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventSlug: event.slug, tierLabel: selectedTier.label, quantity: 1 })
        });
        const checkout = await checkoutResponse.json();
        if (!checkoutResponse.ok) throw new Error(checkout.error || 'Checkout could not be started');
        const stripe = Stripe(checkout.publishableKey);
        const embedded = await stripe.initEmbeddedCheckout({ clientSecret: checkout.clientSecret });
        mount.hidden = false;
        embedded.mount('#event-embedded-checkout');
        mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        errorEl.textContent = error.message || 'Secure payment could not be loaded.';
      } finally {
        register.removeAttribute('aria-disabled');
      }
    });

    const sessionId = new URLSearchParams(location.search).get('session_id');
    if (sessionId) {
      fetch('/api/session-status?session_id=' + encodeURIComponent(sessionId))
        .then(r => r.json())
        .then(status => {
          if (status.confirmed && status.metadata?.eventSlug === event.slug) {
            const confirmation = document.getElementById('event-confirmation');
            confirmation.hidden = false;
          }
        })
        .catch(() => {});
    }
  }

  loadEventsList().catch(() => {});
  loadEventDetail().catch(() => {});
})();
