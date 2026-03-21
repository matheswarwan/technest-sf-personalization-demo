# TechNest — Salesforce Personalization Demo Store

A realistic electronics retail site built to **demo, develop, and test** Salesforce Personalization (formerly Evergage / Interaction Studio) Web SDK integrations. Every customer journey — browse, product view, cart, checkout, identity — fires the appropriate SF Personalization event.

Live at **[ssjs30.com](https://ssjs30.com)**

---

## What This Is

TechNest is a mock tech retail store (laptops, phones, accessories) that serves as a sandbox for:

- Building and testing **SF Personalization sitemaps**
- Experimenting with **campaign zones** and template responses
- Validating **catalog, cart, order, and identity events** before deploying to a real site
- Demonstrating SF Personalization capabilities to stakeholders

---

## SF Personalization SDK Integration

### Events Fired

| Page | Event | SDK Call |
|---|---|---|
| Any page | Page view (by page type) | via sitemap `interaction` |
| Category page | Category catalog view | `sendEvent` with `catalog.type = 'Category'` |
| Product page | Product catalog view | `sendEvent` with `catalog.type = 'Product'` |
| Add to Cart | Cart add | `sendEvent` with `cart.singleItem` |
| Cart page | Cart view | `sendEvent` with `cart.items` |
| Checkout | Order complete | `sendEvent` with `order` |
| Account sign-in | Identity stitch | `sendEvent` with `user.attributes` (email, name, contactKey) |

### Campaign Zones

| Zone name | Location | Default |
|---|---|---|
| `hero-banner` | Homepage hero area | Static gradient banner |
| `homepage-recs` | "Recommended for you" strip | Random product fallback |
| `pdp-recs` | "You may also like" on PDP | Related products fallback |
| `cart-promo` | Above cart items | Free shipping banner |
| `exit-intent` | Full-screen overlay | Not shown (opt-in) |

---

## Connect to a Real Dataset

1. Log in to Salesforce Personalization → **Channels & Campaigns → Web**
2. Copy your **Dataset ID** (from the beacon URL in your web connector settings)
3. In each HTML file, replace the commented-out beacon with:

```html
<script async src="https://cdn.c360a.salesforce.com/beacon/c360a/YOUR-DATASET-ID/scripts/c360a.min.js"></script>
```

4. Remove or comment out the mock shim line at the top of each HTML's inline `<script>` block (the `window.SalesforceInteractions = window.SalesforceInteractions || {}` part).

Until a real dataset ID is added, the site runs in **mock mode**: all SDK calls are logged to the browser console under `[TechNest P13n]` and dispatched as DOM events (`p13n:eventSent`) — no network requests are made.

---

## Project Structure

```
/
├── index.html          Homepage (hero, featured products, recs zone)
├── category.html       Product listing with filter sidebar
├── product.html        Product detail page
├── cart.html           Shopping cart + order summary
├── account.html        Identity sign-in (fires setUser event)
├── assets/
│   ├── css/
│   │   ├── tokens.css          Design tokens (all CSS variables)
│   │   ├── reset.css
│   │   ├── layout.css          Header, footer, containers
│   │   ├── components.css      Cards, buttons, badges, forms
│   │   ├── zones.css           Campaign zone styles & debug outlines
│   │   └── pages/              Page-specific styles
│   ├── js/
│   │   ├── sdk-init.js         SDK init + sitemap + mock shim
│   │   ├── p13n-zones.js       Campaign zone renderer + product cards
│   │   ├── cart.js             Cart state + cart/order events
│   │   ├── account.js          Identity state + setUser event
│   │   └── app.js              Page bootstrap + category/PDP logic
│   └── data/
│       └── products.json       24 demo products (laptops, phones, accessories)
└── IDEAS.md            Future developer hub concept
```

---

## Tech Stack

- **Vanilla JS** — no framework, no build step
- **CSS custom properties** — single `tokens.css` source of truth
- **Google Fonts** (Inter) — via CDN
- No bundler, no npm — open `index.html` directly in a browser

---

## Running Locally

```bash
# Option 1: open directly
open index.html

# Option 2: serve with any static server
npx serve .
python3 -m http.server 8080
```

Product images use `picsum.photos` — requires internet access.

---

## Debug Mode

Add `?debug=1` to any URL or run in the browser console:

```js
document.body.classList.add('p13n-debug');
```

This outlines all campaign zones with a blue dashed border and labels them with their zone name.

---

## Extending

**Add a product:** Edit `assets/data/products.json`.

**Add a campaign zone:** Add `<div data-p13n-zone="my-zone-name">` to any HTML page, then register a renderer in `p13n-zones.js`.

**Add a page type:** Add an entry to the `pageTypes` array in `assets/js/sdk-init.js`.

---

## Related

- [SF Personalization Web SDK Docs](https://developer.salesforce.com/docs/marketing/personalization/guide/web-integration.html)
- [Sitemap Reference](https://developer.salesforce.com/docs/marketing/personalization/guide/sitemap-reference.html)
- [ssjs30.com](https://ssjs30.com) — live demo
