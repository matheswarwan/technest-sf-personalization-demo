/**
 * sdk-init.js — Salesforce Personalization Web SDK initialization
 *
 * Replace [DATASET-ID] in the beacon <script> tag in each HTML page's <head>
 * to connect to a real SF Personalization dataset. Until then, the mock shim
 * below handles all SDK calls gracefully.
 *
 * Docs: https://developer.salesforce.com/docs/marketing/personalization/guide/web-integration.html
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // MOCK SHIM
  // If the real SDK beacon hasn't loaded (no dataset configured),
  // provide a mock that logs events and dispatches DOM events so
  // the rest of the site still works.
  // ─────────────────────────────────────────────
  if (!window.SalesforceInteractions || typeof window.SalesforceInteractions.init !== 'function') {
    console.info('[TechNest P13n] SDK not loaded — running in mock mode. Add your beacon script to enable live events.');

    window.SalesforceInteractions = {
      _mock: true,
      _initialized: false,

      init: function (config) {
        this._initialized = true;
        this._config = config;
        console.group('[TechNest P13n] Mock init()');
        console.log('Config:', config);
        console.groupEnd();

        // Run the sitemap on the current page (mock)
        this._runSitemap(config.siteMap);
      },

      sendEvent: function (payload) {
        console.group('[TechNest P13n] Mock sendEvent()');
        console.log('Payload:', JSON.parse(JSON.stringify(payload)));
        console.groupEnd();

        // Dispatch custom DOM event so inspector/other modules can listen
        window.dispatchEvent(new CustomEvent('p13n:eventSent', {
          detail: { payload, mock: true, timestamp: new Date().toISOString() }
        }));

        return Promise.resolve({ mock: true, payload });
      },

      _runSitemap: function (siteMap) {
        if (!siteMap || !siteMap.pageTypes) return;
        const page = siteMap.pageTypes.find(pt => {
          try { return pt.isMatch && pt.isMatch(); } catch (e) { return false; }
        });
        if (page) {
          console.log('[TechNest P13n] Matched page type:', page.name);
          if (page.interaction) {
            this.sendEvent({ interaction: page.interaction });
          }
          if (page.catalog) {
            const catalogData = typeof page.catalog === 'function' ? page.catalog() : page.catalog;
            if (catalogData) this.sendEvent(catalogData);
          }
        } else {
          console.log('[TechNest P13n] No page type matched for:', window.location.href);
        }
      }
    };
  }

  // ─────────────────────────────────────────────
  // INIT CONFIGURATION
  // ─────────────────────────────────────────────
  SalesforceInteractions.init({
    consentsKey: 'technest_consent',
    defaultConsent: true,   // Demo site: opt-in by default
    allowUnsecure: true,    // Allows file:// and http://localhost

    siteMap: {

      // ── Global listeners (fire on every page) ──
      global: {
        onActionEvent: function (event) {
          // Feed every outbound event to the p13n debug bar if present
          if (window.__p13nDebug) {
            window.__p13nDebug.record(event);
          }
          return event;
        }
      },

      // ── Page types ──
      pageTypes: [

        // ── Homepage ──
        {
          name: 'home',
          isMatch: function () {
            const path = window.location.pathname;
            return path === '/' || path.endsWith('index.html') || path === '';
          },
          interaction: {
            name: 'Home : View'
          }
        },

        // ── Category / Listing page ──
        {
          name: 'category',
          isMatch: function () {
            return window.location.pathname.endsWith('category.html');
          },
          interaction: {
            name: 'Category : View'
          },
          // Dynamic catalog category from URL param
          catalog: function () {
            const params = new URLSearchParams(window.location.search);
            const cat = params.get('cat');
            if (!cat || cat === 'deals') return null;
            return {
              interaction: { name: 'Category : View' },
              catalog: {
                type: 'Category',
                id: cat,
                attributes: { name: cat.charAt(0).toUpperCase() + cat.slice(1) }
              }
            };
          }
        },

        // ── Product Detail Page ──
        {
          name: 'product',
          isMatch: function () {
            return window.location.pathname.endsWith('product.html');
          },
          // Catalog event built dynamically once product data is loaded
          // App.js calls SalesforceInteractions.sendEvent() directly after loading
          interaction: {
            name: 'Product : View'
          }
        },

        // ── Cart ──
        {
          name: 'cart',
          isMatch: function () {
            return window.location.pathname.endsWith('cart.html');
          },
          interaction: {
            name: 'Cart : View'
          }
        },

        // ── Account / Identity ──
        {
          name: 'account',
          isMatch: function () {
            return window.location.pathname.endsWith('account.html');
          },
          interaction: {
            name: 'Account : View'
          }
        }

      ] // end pageTypes
    } // end siteMap
  });

  // Expose a convenience reference for other modules
  window.__p13n = window.SalesforceInteractions;

})();
