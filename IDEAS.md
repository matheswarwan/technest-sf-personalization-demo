# ssjs30.com — Future Idea: Developer Resource Hub

A developer-focused reference site for Salesforce Personalization Web SDK.

## Concept
The site *itself* uses the SDK as a living reference. Pages:
- **Hero**: 3-step quickstart (embed → init → sendEvent)
- **SDK Playground**: Event builder UI + live terminal event log (fire Page View, Catalog, Cart, Order, Identity, Custom events; see [MOCK]/[SENT] badges)
- **Code Snippets**: Tabbed, data-driven from `snippets.json` — Sitemap, sendEvent, Campaigns, Identity, Catalog, Orders
- **SDK Inspector Panel**: Fixed bottom-right drawer showing SDK State, Events Sent, Campaign Responses, User Identity

## Tech Stack
- Vanilla JS + Alpine.js v3 (no build step)
- Prism.js (syntax highlighting)
- CSS custom properties with dark/light theme toggle

## Key Architecture Decisions
- `onActionEvent` hook intercepts every outbound SDK event → Inspector panel
- Mock shim: when SDK not loaded, dispatches `ssjs30:mockEvent` DOM events so everything works offline
- Data-driven snippets: adding a new code example = JSON edit only
