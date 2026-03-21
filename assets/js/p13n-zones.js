/**
 * p13n-zones.js — SF Personalization campaign zone renderer
 *
 * Campaign zones are <div data-p13n-zone="zone-name"> elements.
 * When the SDK returns a campaign response, this module renders it
 * into the appropriate zone. Without a real dataset, zones show their
 * static HTML fallback (already in the HTML).
 *
 * Zones on this site:
 *   hero-banner    — homepage hero (can be overridden by campaign)
 *   homepage-recs  — "Recommended for you" product strip
 *   pdp-recs       — "You may also like" on product pages
 *   cart-promo     — promotional banner above cart
 *   exit-intent    — overlay (triggered on mouse-leave, optional)
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // Zone registry — maps zone name to a renderer function
  // ─────────────────────────────────────────────
  const zoneRenderers = {

    // These zones just show their static fallback from the HTML
    // A real campaign response would replace the innerHTML via renderZone()
    'hero-banner':  null,
    'cart-promo':   null,

    // Recommendation zones — populated by product data (fallback)
    'homepage-recs': renderRecsZone.bind(null, 'homepage-recs-grid', 4),
    'pdp-recs':      renderRecsZone.bind(null, 'pdp-recs-grid', 4)

  };

  // ─────────────────────────────────────────────
  // Render a campaign response into a zone
  // Called by SDK campaign response handler (when real dataset is configured)
  // ─────────────────────────────────────────────
  function renderZone(zoneName, campaignHtml) {
    const zone = document.querySelector('[data-p13n-zone="' + zoneName + '"]');
    if (!zone) return;
    zone.innerHTML = campaignHtml;
    console.log('[TechNest P13n] Zone rendered:', zoneName);
  }

  // ─────────────────────────────────────────────
  // Recommendation zone fallback — loads from product data
  // ─────────────────────────────────────────────
  async function renderRecsZone(gridId, count, products) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // Use provided products (from campaign) or pick random from catalog
    let items = products;
    if (!items) {
      const allProducts = await getProducts();
      // Shuffle and pick N — prefer products not currently viewed
      const currentId = new URLSearchParams(window.location.search).get('id');
      const pool = allProducts.filter(p => p.id !== currentId);
      items = shuffleArray(pool).slice(0, count);
    }

    grid.innerHTML = items.map(p => buildProductCard(p)).join('');
    wireProductCards(grid);
  }

  // ─────────────────────────────────────────────
  // Product card builder (reused across the site)
  // ─────────────────────────────────────────────
  function buildProductCard(p) {
    const badgeMap = {
      'Best Seller': 'badge-bestseller',
      'Top Rated':   'badge-toprated',
      'New':         'badge-new',
      'Sale':        'badge-sale'
    };
    const badgeHtml = p.badge
      ? `<div class="product-card-badge"><span class="badge ${badgeMap[p.badge] || ''}">${p.badge}</span></div>`
      : '';
    const originalHtml = p.originalPrice
      ? `<span class="price-original">$${p.originalPrice.toFixed(2)}</span>`
      : '';
    const stars = renderStars(p.rating);

    return `
      <div class="product-card" data-id="${p.id}" onclick="TechNestApp.goToProduct('${p.id}')">
        <div class="product-card-img">
          ${badgeHtml}
          <img src="${p.thumbnail || p.image}" alt="${p.name}" loading="lazy">
          <button class="product-card-wishlist" onclick="event.stopPropagation();showToast&&showToast('Added to wishlist!','success')" title="Add to wishlist">♡</button>
        </div>
        <div class="product-card-body">
          <div class="product-card-category">${p.subcategory || p.category}</div>
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-rating">
            <span class="stars">${stars}</span>
            <span>${p.rating} (${p.reviews})</span>
          </div>
        </div>
        <div class="product-card-footer">
          <div class="product-price">
            <span class="price-current">$${p.price.toFixed(2)}</span>
            ${originalHtml}
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();addToCartFromCard('${p.id}')">
            + Cart
          </button>
        </div>
      </div>
    `;
  }

  function renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5;
    let html = '★'.repeat(full);
    if (half) html += '½';
    html += '☆'.repeat(5 - full - (half ? 1 : 0));
    return html;
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─────────────────────────────────────────────
  // Wire product card click → catalog event
  // ─────────────────────────────────────────────
  function wireProductCards(container) {
    // SF P13n catalog events are fired in app.js goToProduct
    // Nothing extra needed here
  }

  // ─────────────────────────────────────────────
  // Product data loader (cached)
  // ─────────────────────────────────────────────
  let _productsCache = null;
  async function getProducts() {
    if (_productsCache) return _productsCache;
    const resp = await fetch('assets/data/products.json');
    const data = await resp.json();
    _productsCache = data.products;
    return _productsCache;
  }

  // ─────────────────────────────────────────────
  // Init — run zone renderers for current page
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    for (const [zoneName, renderer] of Object.entries(zoneRenderers)) {
      if (!renderer) continue;
      const zone = document.querySelector('[data-p13n-zone="' + zoneName + '"]');
      if (zone) {
        try {
          await renderer();
        } catch (e) {
          console.warn('[TechNest P13n] Zone render error for', zoneName, e);
        }
      }
    }
  });

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────
  window.TechNestZones = {
    renderZone,
    buildProductCard,
    getProducts,
    renderRecsZone
  };

  // ─────────────────────────────────────────────
  // Global helper: add to cart from a product card button
  // ─────────────────────────────────────────────
  window.addToCartFromCard = async function (productId) {
    const products = await getProducts();
    const product  = products.find(p => p.id === productId);
    if (product && window.TechNestCart) {
      TechNestCart.add(product, 1);
    }
  };

})();
