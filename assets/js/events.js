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
      const imageUrl = event.experienceImageUrl || event.heroImageUrl;
      return `<article class="event">
        <a class="event-media" href="event.html?slug=${encodeURIComponent(event.slug)}">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(event.experienceImageAlt || event.heroImageAlt || event.title)}">` : ''}<span class="event-date-badge">${d.month} ${d.day} · ${d.year}</span></a>
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
      const imageUrl = event.experienceImageUrl || event.heroImageUrl;
      featured.innerHTML = `<div style="position:relative;z-index:2">
        <span class="eyebrow on-dark" style="color:var(--yes-gold-bright)">Featured event</span>
        <h2>${escapeHtml(event.title)}</h2>
        <p>${escapeHtml(event.tagline || (event.about || [])[0] || '')}</p>
        <a href="event.html?slug=${encodeURIComponent(event.slug)}" class="btn btn-gold btn-lg">View event details →</a>
      </div><a href="event.html?slug=${encodeURIComponent(event.slug)}" class="ev-card event-photo">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(event.experienceImageAlt || event.heroImageAlt || event.title)}">` : ''}<span>${d.weekday}, ${d.month} ${d.day} · ${d.time}</span></a>`;
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
    const hero = document.querySelector('.event-hero-bg');
    if (hero && event.heroImageUrl) {
      hero.innerHTML = `<img src="${escapeHtml(event.heroImageUrl)}" alt="${escapeHtml(event.heroImageAlt || event.title)}">`;
    }
    const experienceImage = document.querySelector('.event-experience');
    if (experienceImage && (event.experienceVideoUrl || event.experienceImageUrl)) {
      experienceImage.innerHTML = event.experienceVideoUrl
        ? `<video controls playsinline preload="metadata"${event.experienceImageUrl ? ` poster="${escapeHtml(event.experienceImageUrl)}"` : ''}><source src="${escapeHtml(event.experienceVideoUrl)}"${event.experienceVideoMimeType ? ` type="${escapeHtml(event.experienceVideoMimeType)}"` : ''}>Your browser does not support embedded video.</video>`
        : `<img src="${escapeHtml(event.experienceImageUrl)}" alt="${escapeHtml(event.experienceImageAlt || event.title)}">`;
      experienceImage.hidden = false;
    }
    document.querySelector('.event-meta-row').innerHTML = `<div class="item"><div><strong>${start.full}</strong><span>${start.time}${end ? ` – ${end.time}` : ''} ${escapeHtml(event.timezone || '')}</span></div></div><div class="item"><div><strong>${escapeHtml(event.location?.name || 'Location TBA')}</strong><span>${escapeHtml(event.location?.city || '')}</span></div></div>`;

    const sections = document.querySelectorAll('.event-section');
    if (sections[0]) sections[0].innerHTML = `<h2>About this event</h2>${(event.about || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}`;
    if (sections[1]) sections[1].innerHTML = `<h2>Schedule</h2><div class="schedule-list">${(event.agenda || []).map(item => `<div class="schedule-row"><span class="when">${escapeHtml(item.time)}</span><span class="what">${escapeHtml(item.title)}${item.detail ? ` · ${escapeHtml(item.detail)}` : ''}</span></div>`).join('')}</div>`;
    if (sections[2] && event.speakers?.length) sections[2].innerHTML = `<h2>You'll meet</h2><div class="speakers">${event.speakers.map(speaker => `<article class="speaker"><div class="ph">${speaker.headshotUrl ? `<img src="${escapeHtml(speaker.headshotUrl)}" alt="${escapeHtml(speaker.name)}">` : escapeHtml(speaker.name.split(' ').map(part => part[0]).join('').slice(0, 2))}</div><h4>${escapeHtml(speaker.name)}</h4><div class="role">${escapeHtml(speaker.role || '')}</div></article>`).join('')}</div>`;
    if (sections[3]) sections[3].innerHTML = `<h2>Where</h2><div class="location-card"><h4>${escapeHtml(event.location?.name || 'Location TBA')}</h4><p class="addr">${escapeHtml(event.location?.address || '')}<br>${escapeHtml(event.location?.city || '')}</p></div>`;
    if (sections[4]) sections[4].innerHTML = `<h2>Frequently asked</h2>${(event.faq || []).map(item => `<details class="faq-item"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('')}`;

    const card = document.querySelector('.checkout-card');
    const grid = document.querySelector('.event-grid');
    const mobileLayout = window.matchMedia('(max-width: 1024px)');
    const placeCheckout = media => {
      if (media.matches && sections[0]) {
        sections[0].insertAdjacentElement('afterend', card);
      } else if (grid) {
        grid.append(card);
      }
    };
    placeCheckout(mobileLayout);
    mobileLayout.addEventListener('change', placeCheckout);
    const tiers = event.priceTiers || [];
    let selectedTier = tiers.find(t => !t.soldOut) || null;
    let embeddedInstance = null;
    card.querySelector('.checkout-meta').innerHTML = `<div class="row"><div><strong>${start.full}</strong><span>${start.time}${end ? ` – ${end.time}` : ''}</span></div></div><div class="row"><div><strong>${escapeHtml(event.location?.name || 'Location TBA')}</strong><span>${escapeHtml(event.location?.city || '')}</span></div></div>`;
    card.querySelectorAll('.ticket').forEach(ticket => ticket.remove());
    const label = card.querySelector('.ticket-label');
    tiers.slice().reverse().forEach(tier => {
      const ticket = document.createElement('button');
      ticket.type = 'button';
      ticket.className = `ticket${tier === selectedTier ? ' active' : ''}`;
      ticket.disabled = Boolean(tier.soldOut);
      ticket.innerHTML = `<div class="radio"></div><div class="body"><div class="name">${escapeHtml(tier.label)}</div><div class="desc">${escapeHtml(tier.description || '')}</div></div><span class="price">${tier.soldOut ? 'Sold out' : money(tier.priceCents)}</span>`;
      ticket.addEventListener('click', () => {
        card.querySelectorAll('.ticket').forEach(item => item.classList.remove('active'));
        ticket.classList.add('active');
        selectedTier = tier;
        if (tier.priceCents > 0) startCheckout();
      });
      label.insertAdjacentElement('afterend', ticket);
    });

    const register = document.getElementById('event-register');
    const mount = document.getElementById('event-embedded-checkout');
    const errorEl = document.getElementById('event-payment-error');
    let checkoutLoading = false;
    const startCheckout = async () => {
      if (!selectedTier || selectedTier.priceCents === 0 || checkoutLoading) return;
      checkoutLoading = true;
      errorEl.textContent = '';
      errorEl.textContent = 'Loading secure payment options…';
      try {
        if (embeddedInstance) {
          embeddedInstance.destroy();
          embeddedInstance = null;
        }
        const checkoutResponse = await fetch('/api/create-event-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventSlug: event.slug, tierLabel: selectedTier.label, quantity: 1 })
        });
        const checkout = await checkoutResponse.json();
        if (!checkoutResponse.ok) throw new Error(checkout.error || 'Checkout could not be started');
        const stripe = Stripe(checkout.publishableKey);
        embeddedInstance = await stripe.initEmbeddedCheckout({ clientSecret: checkout.clientSecret });
        card.classList.add('checkout-active');
        mount.hidden = false;
        embeddedInstance.mount('#event-embedded-checkout');
        errorEl.textContent = '';
      } catch (error) {
        errorEl.textContent = error.message || 'Secure payment could not be loaded.';
      } finally {
        checkoutLoading = false;
      }
    };

    if (selectedTier && selectedTier.priceCents > 0) {
      register.hidden = true;
      startCheckout();
    } else {
      register.textContent = 'Reserve my spot';
      register.addEventListener('click', eventClick => {
        eventClick.preventDefault();
        location.href = 'events.html#rsvp';
      });
    }

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
