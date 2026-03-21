/**
 * app.js — Bootstrap & page-specific logic
 *
 * Handles:
 *  - Homepage: load featured products
 *  - Category page: filter, sort, render product grid
 *  - Product detail page: load product, render PDP, fire catalog event
 *  - Navigation active state
 *  - Global search (basic filter)
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // Routing helper
  // Supports both .html extensions (local) and clean URLs (Cloudflare Pages)
  // ─────────────────────────────────────────────
  function matchPage(name) {
    const p = location.pathname.replace(/\/$/, '');
    return p.endsWith(name + '.html') || p.endsWith('/' + name) || p === '/' + name;
  }

  const page = {
    isHome:     () => location.pathname === '/' || location.pathname === '' || matchPage('index'),
    isCategory: () => matchPage('category'),
    isProduct:  () => matchPage('product'),
    isCart:     () => matchPage('cart'),
    isAccount:  () => matchPage('account')
  };

  const params = new URLSearchParams(location.search);

  // ─────────────────────────────────────────────
  // Navigate to a product page
  // ─────────────────────────────────────────────
  window.TechNestApp = {
    goToProduct: function (id) {
      location.href = 'product.html?id=' + id;
    }
  };

  // ─────────────────────────────────────────────
  // Product data
  // ─────────────────────────────────────────────
  async function loadProducts() {
    if (window.TechNestZones) {
      return window.TechNestZones.getProducts();
    }
    const resp = await fetch('assets/data/products.json');
    const data = await resp.json();
    return data.products;
  }

  // ─────────────────────────────────────────────
  // Homepage
  // ─────────────────────────────────────────────
  async function initHome() {
    const grid = document.getElementById('featured-products');
    if (!grid) return;

    const products = await loadProducts();
    const featured = products.filter(p => p.featured).slice(0, 4);

    grid.innerHTML = featured.map(p =>
      window.TechNestZones ? TechNestZones.buildProductCard(p) : ''
    ).join('');

    // SF P13n: homepage view already fired by sdk-init sitemap
  }

  // ─────────────────────────────────────────────
  // Category page
  // ─────────────────────────────────────────────
  let _allProducts = [];
  let _filters = { category: 'all', subcategory: null, priceMax: 2500, rating: 0 };
  let _sort = 'default';

  async function initCategory() {
    const grid = document.getElementById('product-listing');
    if (!grid) return;

    _allProducts = await loadProducts();

    // Pre-select category from URL
    const cat = params.get('cat');
    if (cat && cat !== 'deals') {
      _filters.category = cat;
      const radio = document.querySelector(`input[name="category"][value="${cat}"]`);
      if (radio) radio.checked = true;
    } else if (cat === 'deals') {
      _filters.category = 'all';
    }

    // Breadcrumb
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    if (breadcrumbCurrent && cat) {
      breadcrumbCurrent.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    }

    // Page title highlight
    const navLink = document.getElementById('nav-' + cat);
    if (navLink) navLink.classList.add('active');

    // Subcategory filter options
    renderSubcategoryFilters();
    renderProducts();
    wireFilters();

    // SF P13n: category view event already fired by sdk-init sitemap
  }

  function getFilteredProducts() {
    let results = [..._allProducts];

    // Category
    if (_filters.category !== 'all') {
      results = results.filter(p => p.category === _filters.category);
    }

    // Subcategory
    if (_filters.subcategory) {
      results = results.filter(p => p.subcategory === _filters.subcategory);
    }

    // Price max
    results = results.filter(p => p.price <= _filters.priceMax);

    // Rating
    if (_filters.rating > 0) {
      results = results.filter(p => p.rating >= _filters.rating);
    }

    // Deals: only show items with original price
    if (params.get('cat') === 'deals') {
      results = results.filter(p => p.originalPrice !== null);
    }

    // Sort
    switch (_sort) {
      case 'price-asc':  results.sort((a, b) => a.price - b.price); break;
      case 'price-desc': results.sort((a, b) => b.price - a.price); break;
      case 'rating':     results.sort((a, b) => b.rating - a.rating); break;
      case 'name':       results.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    return results;
  }

  function renderProducts() {
    const grid     = document.getElementById('product-listing');
    const countEl  = document.getElementById('listing-count');
    if (!grid) return;

    const items = getFilteredProducts();
    if (countEl) countEl.textContent = items.length + ' product' + (items.length !== 1 ? 's' : '');

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🔍</div>
          <h3>No products found</h3>
          <p>Try adjusting your filters.</p>
          <button class="btn btn-ghost" id="inline-clear">Clear filters</button>
        </div>`;
      document.getElementById('inline-clear')?.addEventListener('click', clearFilters);
      return;
    }

    grid.innerHTML = items.map(p =>
      window.TechNestZones ? TechNestZones.buildProductCard(p) : ''
    ).join('');
  }

  function renderSubcategoryFilters() {
    const container = document.getElementById('subcategory-filter');
    if (!container) return;
    const subs = [...new Set(_allProducts.map(p => p.subcategory))].sort();
    container.innerHTML = subs.map(s =>
      `<li><label class="filter-option"><input type="checkbox" name="subcategory" value="${s}"> ${s}</label></li>`
    ).join('');
    container.addEventListener('change', function (e) {
      if (e.target.name === 'subcategory') {
        const checked = [...container.querySelectorAll('input:checked')].map(i => i.value);
        _filters.subcategory = checked.length ? checked[0] : null; // single select for simplicity
        renderProducts();
      }
    });
  }

  function wireFilters() {
    // Category radio
    document.querySelectorAll('input[name="category"]').forEach(input => {
      input.addEventListener('change', function () {
        _filters.category = this.value;
        renderProducts();
      });
    });

    // Price range
    const priceRange = document.getElementById('price-max');
    const priceLabel = document.getElementById('price-max-label');
    if (priceRange) {
      priceRange.addEventListener('input', function () {
        _filters.priceMax = parseInt(this.value, 10);
        if (priceLabel) priceLabel.textContent = this.value >= 2500 ? '$2,500+' : '$' + this.value;
        renderProducts();
      });
    }

    // Rating
    document.querySelectorAll('input[name="rating"]').forEach(input => {
      input.addEventListener('change', function () {
        _filters.rating = parseFloat(this.value);
        renderProducts();
      });
    });

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        _sort = this.value;
        renderProducts();
      });
    }

    // Grid/list view toggle
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');
    const grid    = document.getElementById('product-listing');
    if (gridBtn && listBtn && grid) {
      gridBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridBtn.classList.add('active'); listBtn.classList.remove('active'); });
      listBtn.addEventListener('click', () => { grid.classList.add('list-view'); listBtn.classList.add('active'); gridBtn.classList.remove('active'); });
    }

    // Clear filters
    document.getElementById('clear-filters')?.addEventListener('click', clearFilters);
  }

  function clearFilters() {
    _filters = { category: 'all', subcategory: null, priceMax: 2500, rating: 0 };
    _sort = 'default';
    document.querySelectorAll('input[name="category"]').forEach(i => { i.checked = i.value === 'all'; });
    document.querySelectorAll('input[name="rating"]').forEach(i => { i.checked = i.value === '0'; });
    document.querySelectorAll('input[name="subcategory"]').forEach(i => { i.checked = false; });
    const pr = document.getElementById('price-max');
    const pl = document.getElementById('price-max-label');
    if (pr) pr.value = 2500;
    if (pl) pl.textContent = '$2,500+';
    renderProducts();
  }

  // ─────────────────────────────────────────────
  // Product Detail Page
  // ─────────────────────────────────────────────
  async function initProduct() {
    const pdpContent = document.getElementById('pdp-content');
    if (!pdpContent) return;

    const id       = params.get('id');
    if (!id) { pdpContent.innerHTML = '<p>Product not found.</p>'; return; }

    const products = await loadProducts();
    const product  = products.find(p => p.id === id);
    if (!product) { pdpContent.innerHTML = '<p>Product not found.</p>'; return; }

    // Breadcrumb
    const breadCat  = document.getElementById('breadcrumb-cat');
    const breadProd = document.getElementById('breadcrumb-product');
    if (breadCat) { breadCat.textContent = product.category.charAt(0).toUpperCase() + product.category.slice(1); breadCat.href = 'category.html?cat=' + product.category; }
    if (breadProd) breadProd.textContent = product.name;

    // Page title
    document.title = product.name + ' — TechNest';

    // Specs
    const specsHtml = Object.entries(product.specs).map(([k, v]) =>
      `<div class="spec-item"><span class="spec-key">${formatKey(k)}</span><span class="spec-val">${v}</span></div>`
    ).join('');

    const badgeMap = { 'Best Seller': 'badge-bestseller', 'Top Rated': 'badge-toprated', 'New': 'badge-new', 'Sale': 'badge-sale' };
    const badgeHtml = product.badge
      ? `<div class="pdp-badges"><span class="badge ${badgeMap[product.badge] || ''}">${product.badge}</span></div>`
      : '';

    const saveHtml = product.originalPrice
      ? `<span class="price-save">Save $${(product.originalPrice - product.price).toFixed(0)}</span>`
      : '';
    const origHtml = product.originalPrice
      ? `<span class="price-original">$${product.originalPrice.toFixed(2)}</span>`
      : '';

    const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(product.rating));

    // Similar products for thumbnails (use same seed with offset)
    const thumb2 = product.image.replace('/600/400', '/300/200').replace(`seed/${product.id.replace('-','')}/`, `seed/${product.id.replace('-','')}b/`);
    const thumb3 = product.image.replace('/600/400', '/300/200').replace(`seed/${product.id.replace('-','')}/`, `seed/${product.id.replace('-','')}c/`);

    pdpContent.innerHTML = `
      <div class="pdp-gallery">
        <div class="pdp-img-main" id="pdp-main-img">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="pdp-thumbnails">
          <div class="pdp-thumb active" data-src="${product.image}"><img src="${product.thumbnail}" alt=""></div>
          <div class="pdp-thumb" data-src="${product.image}"><img src="${product.thumbnail}" alt="" style="filter:hue-rotate(30deg)"></div>
          <div class="pdp-thumb" data-src="${product.image}"><img src="${product.thumbnail}" alt="" style="filter:hue-rotate(60deg)"></div>
        </div>
      </div>

      <div class="pdp-info">
        ${badgeHtml}
        <h1 class="pdp-name">${product.name}</h1>

        <div class="pdp-rating">
          <span class="stars">${stars}</span>
          <span>${product.rating} · ${product.reviews} reviews</span>
        </div>

        <div class="pdp-price">
          <span class="price-current">$${product.price.toFixed(2)}</span>
          ${origHtml}
          ${saveHtml}
        </div>

        <p class="pdp-description">${product.description}</p>

        <div class="pdp-specs">
          <div class="specs-title">Specifications</div>
          <div class="specs-grid">${specsHtml}</div>
        </div>

        <div class="pdp-actions">
          <div class="qty-stepper">
            <button class="qty-btn" id="qty-dec">−</button>
            <input class="qty-value" type="number" id="qty-input" value="1" min="1">
            <button class="qty-btn" id="qty-inc">+</button>
          </div>
          <button class="btn btn-primary btn-lg" id="add-to-cart-btn">Add to Cart</button>
        </div>

        <div class="pdp-delivery">
          <div class="delivery-item"><span>🚚</span><span>Free shipping on orders over $50</span></div>
          <div class="delivery-item"><span>🔄</span><span>30-day hassle-free returns</span></div>
          <div class="delivery-item"><span>🛡️</span><span>2-year manufacturer warranty</span></div>
        </div>
      </div>
    `;

    // Qty stepper
    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-dec')?.addEventListener('click', () => { qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1); });
    document.getElementById('qty-inc')?.addEventListener('click', () => { qtyInput.value = parseInt(qtyInput.value) + 1; });

    // Thumbnail click
    pdpContent.querySelectorAll('.pdp-thumb').forEach(thumb => {
      thumb.addEventListener('click', function () {
        pdpContent.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        pdpContent.querySelector('#pdp-main-img img').src = this.dataset.src;
      });
    });

    // Add to cart
    document.getElementById('add-to-cart-btn')?.addEventListener('click', function () {
      const qty = parseInt(qtyInput.value, 10) || 1;
      TechNestCart.add(product, qty);
    });

    // ── SF Personalization: Product catalog event ──
    window.__p13n && window.__p13n.sendEvent({
      interaction: { name: 'Product : View' },
      catalog: {
        type: 'Product',
        id:   product.id,
        attributes: {
          name:        product.name,
          description: product.description,
          price:       product.price,
          imageUrl:    product.image,
          url:         window.location.href,
          category:    product.category,
          subcategory: product.subcategory
        }
      }
    });
  }

  function formatKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    if (page.isHome())     await initHome();
    if (page.isCategory()) await initCategory();
    if (page.isProduct())  await initProduct();

    // Highlight active nav link
    const cat = params.get('cat');
    if (cat) {
      document.querySelectorAll('.primary-nav a').forEach(a => {
        if (a.href.includes('cat=' + cat)) a.classList.add('active');
      });
    }
  });

})();
