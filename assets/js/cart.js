/**
 * cart.js — Cart state management + SF Personalization cart/order events
 *
 * Cart state lives in localStorage under 'technest_cart'.
 * Events fired:
 *   - Cart : Add     (on addItem)
 *   - Cart : Remove  (on removeItem)
 *   - Cart : View    (on cart.html page load — handled by sitemap in sdk-init.js)
 *   - Order : Complete (on checkout)
 */

(function () {
  'use strict';

  const CART_KEY = 'technest_cart';

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  }

  function getItemCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function getCartTotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  // ─────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────
  function addItem(product, qty) {
    qty = qty || 1;
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id:        product.id,
        name:      product.name,
        category:  product.category,
        price:     product.price,
        image:     product.thumbnail || product.image,
        qty:       qty
      });
    }

    saveCart(cart);

    // ── SF Personalization: Cart Add event ──
    const cartItems = getCart().map(i => ({
      id:       i.id,
      name:     i.name,
      price:    i.price,
      quantity: i.qty
    }));

    window.__p13n && window.__p13n.sendEvent({
      interaction: { name: 'Cart : Add' },
      cart: {
        singleItem: {
          id:       product.id,
          name:     product.name,
          price:    product.price,
          quantity: qty
        },
        items:      cartItems,
        totalValue: getCartTotal()
      },
      catalog: {
        type: product.category === 'laptops' ? 'Product' : product.category === 'phones' ? 'Product' : 'Product',
        id:   product.id,
        attributes: {
          name:     product.name,
          category: product.category,
          price:    product.price
        }
      }
    });

    showToast('✓ Added to cart: ' + product.name, 'success');
    return true;
  }

  function removeItem(productId) {
    const cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);

    // ── SF Personalization: Cart Remove event ──
    window.__p13n && window.__p13n.sendEvent({
      interaction: { name: 'Cart : Remove' },
      cart: {
        items:      cart.map(i => ({ id: i.id, price: i.price, quantity: i.qty })),
        totalValue: getCartTotal()
      }
    });
  }

  function updateQty(productId, qty) {
    if (qty < 1) { removeItem(productId); return; }
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) { item.qty = qty; saveCart(cart); }
  }

  function clearCart() {
    saveCart([]);
  }

  // ─────────────────────────────────────────────
  // Checkout — fires Order Complete event
  // ─────────────────────────────────────────────
  function checkout() {
    const cart = getCart();
    if (!cart.length) return;

    const orderId = 'TN-' + Date.now().toString(36).toUpperCase();
    const total   = getCartTotal();

    // ── SF Personalization: Order Complete event ──
    const orderPayload = {
      interaction: { name: 'Order : Complete' },
      order: {
        id:         orderId,
        totalValue: parseFloat(total.toFixed(2)),
        currency:   'USD',
        lineItems:  cart.map(i => ({
          id:       i.id,
          name:     i.name,
          price:    i.price,
          quantity: i.qty
        }))
      }
    };

    window.__p13n && window.__p13n.sendEvent(orderPayload);
    console.info('[TechNest P13n] Order payload:', orderPayload);

    clearCart();
    return { orderId, total, payload: orderPayload };
  }

  // ─────────────────────────────────────────────
  // Cart badge UI
  // ─────────────────────────────────────────────
  function updateCartBadge() {
    const count = getItemCount();
    document.querySelectorAll('#cart-badge').forEach(el => {
      el.textContent = count;
      el.classList.toggle('visible', count > 0);
    });
  }

  // ─────────────────────────────────────────────
  // Cart page rendering
  // ─────────────────────────────────────────────
  function renderCartPage() {
    const emptyEl   = document.getElementById('cart-empty');
    const contentEl = document.getElementById('cart-content');
    const countEl   = document.getElementById('cart-item-count');
    if (!emptyEl || !contentEl) return;

    const cart = getCart();
    const total = getCartTotal();

    if (countEl) countEl.textContent = '(' + cart.length + ' item' + (cart.length !== 1 ? 's' : '') + ')';

    if (cart.length === 0) {
      emptyEl.style.display  = 'flex';
      contentEl.style.display = 'none';
      return;
    }

    emptyEl.style.display   = 'none';
    contentEl.style.display = 'block';

    // Render line items
    const itemsEl = document.getElementById('cart-items');
    if (itemsEl) {
      itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-img">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
          </div>
          <div class="cart-item-info">
            <div class="cart-item-category">${item.category}</div>
            <div class="cart-item-name">
              <a href="product.html?id=${item.id}">${item.name}</a>
            </div>
            <div class="cart-item-actions">
              <div class="qty-stepper">
                <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
                <input class="qty-value" type="number" value="${item.qty}" min="1" data-id="${item.id}">
                <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
              </div>
              <button class="cart-item-remove" data-id="${item.id}">Remove</button>
            </div>
          </div>
          <div class="cart-item-right">
            <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
          </div>
        </div>
      `).join('');

      // Wire qty and remove buttons
      itemsEl.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        const rem = e.target.closest('.cart-item-remove');
        if (btn) {
          const id  = btn.dataset.id;
          const cur = getCart().find(i => i.id === id);
          if (!cur) return;
          const newQty = btn.dataset.action === 'inc' ? cur.qty + 1 : cur.qty - 1;
          updateQty(id, newQty);
          renderCartPage();
        }
        if (rem) {
          removeItem(rem.dataset.id);
          renderCartPage();
        }
      });

      itemsEl.addEventListener('change', function (e) {
        if (e.target.classList.contains('qty-value')) {
          updateQty(e.target.dataset.id, parseInt(e.target.value, 10) || 1);
          renderCartPage();
        }
      });
    }

    // Summary
    const tax = total * 0.08;
    const qty = getItemCount();
    const el = id => document.getElementById(id);
    if (el('summary-subtotal')) el('summary-subtotal').textContent = '$' + total.toFixed(2);
    if (el('summary-shipping')) el('summary-shipping').textContent = total > 50 ? 'Free' : '$9.99';
    if (el('summary-tax'))      el('summary-tax').textContent      = '$' + tax.toFixed(2);
    if (el('summary-total'))    el('summary-total').textContent    = '$' + (total + tax + (total > 50 ? 0 : 9.99)).toFixed(2);
    if (el('cart-item-count'))  el('cart-item-count').textContent  = '(' + qty + ' item' + (qty !== 1 ? 's' : '') + ')';

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.onclick = function () {
        const result = checkout();
        if (!result) return;
        const modal = document.getElementById('order-modal');
        const orderIdEl = document.getElementById('order-id');
        if (modal) {
          if (orderIdEl) orderIdEl.textContent = result.orderId;
          modal.style.display = 'flex';
        }
        renderCartPage();
      };
    }

    // SF Personalization: fire Cart View event with current cart state
    window.__p13n && window.__p13n.sendEvent({
      interaction: { name: 'Cart : View' },
      cart: {
        items:      cart.map(i => ({ id: i.id, price: i.price, quantity: i.qty })),
        totalValue: total
      }
    });
  }

  // ─────────────────────────────────────────────
  // Close modal
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();

    const p = window.location.pathname;
    if (p.endsWith('cart.html') || p.endsWith('/cart')) {
      renderCartPage();
    }

    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
      closeBtn.onclick = function () {
        document.getElementById('order-modal').style.display = 'none';
      };
    }

    const promoBtn = document.getElementById('promo-btn');
    if (promoBtn) {
      promoBtn.onclick = function () {
        const code = document.getElementById('promo-input').value.trim().toUpperCase();
        showToast(code ? 'Promo code "' + code + '" applied! (demo)' : 'Enter a promo code first.', 'success');
      };
    }
  });

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────
  window.TechNestCart = {
    add:        addItem,
    remove:     removeItem,
    updateQty:  updateQty,
    clear:      clearCart,
    checkout:   checkout,
    getCart:    getCart,
    getCount:   getItemCount,
    getTotal:   getCartTotal,
    render:     renderCartPage
  };

  // ─────────────────────────────────────────────
  // Toast helper (used here and by other modules)
  // ─────────────────────────────────────────────
  function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'success');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'fadeOut 300ms ease forwards';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  window.showToast = showToast;

})();
