# Public PV Counter Design

## Goal

Add a low-maintenance public page-view counter to the bilingual GitHub Pages homepage while keeping the existing Baidu Analytics integration for private analytics.

## Counting model

- Use Busuanzi's site-wide page-view counter.
- Count visits to `index.html` and `index_ch.html` in one shared site total because both pages use the same hostname.
- Define the public value as `Busuanzi site PV + 10,000`.
- The offset is a fixed presentation baseline and must be applied exactly once in the browser after Busuanzi provides its value.
- Do not alter or reinterpret the value collected by Baidu Analytics.
- Do not attempt to reconstruct visits from before this integration.

## Presentation

- Place the counter below the existing footer logo row on both pages.
- Chinese copy: `累计访问 · {display PV} 次`.
- English copy: `Total visits · {display PV}`.
- Use centered, muted, 12px text without a card, badge, or prominent icon.
- Format the displayed integer with locale-appropriate thousands separators.
- Keep the presentation compact and responsive on mobile.

## Loading and failure behavior

- Load the counter script asynchronously with `defer` so it does not block the homepage.
- Keep the counter hidden until a valid non-negative integer is available.
- Never show `0`, `NaN`, `Loading`, or an error message while the service is unavailable.
- If the third-party script fails or times out, leave the counter hidden and keep the rest of the page fully functional.
- Apply the 10,000 offset idempotently so repeated callbacks or DOM observation cannot add it more than once.

## Privacy and operational boundary

- Add no API key, account credential, cookie, or local storage entry.
- Retain the existing Baidu Analytics script unchanged.
- Treat the public count as an approximate display metric: refreshes and bots may increase it, and it may differ from Baidu Analytics.
- The counter depends on Busuanzi availability and its hostname-based aggregation behavior.

## Verification

- Verify both language pages contain the same site-wide counter integration and the correct localized copy.
- Verify a mocked raw PV of `1` renders as `10,001`, including thousands separators.
- Verify the offset is not applied twice when the counter value changes or the observer runs repeatedly.
- Verify invalid, missing, and failed third-party responses leave the counter hidden.
- Verify the footer remains visually balanced at desktop and mobile viewport widths.
- Verify the existing Baidu Analytics integration and CV file remain unchanged.

## Explicitly excluded

- No public UV counter, per-page counter, traffic chart, referrer breakdown, or analytics dashboard.
- No server, database, Cloudflare Worker, paid analytics service, or secret-bearing API call.
- No retroactive import of historical visits.
