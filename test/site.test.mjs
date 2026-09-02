// Integrity tests for the static site. Zero dependencies: run with `npm test`.
// These guard the things most likely to break silently on a content edit:
// the Netlify form wiring, local asset paths (file:// + Netlify), structured
// data, and a few content/regression invariants.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const html = read('index.html');

test('Netlify contact form is fully wired', () => {
  assert.match(html, /<form[^>]*\bname="contact"/i, 'form must be name="contact"');
  assert.match(html, /<form[^>]*method="POST"/i, 'form must POST');
  assert.match(html, /<form[^>]*action="\/?thanks\.html"/i, 'form action -> thanks page');
  assert.match(html, /data-netlify="true"/i, 'data-netlify flag');
  assert.match(html, /data-netlify-honeypot="bot-field"/i, 'honeypot configured');
  assert.match(html, /name="bot-field"/i, 'honeypot field present');
  assert.match(
    html,
    /<input[^>]*type="hidden"[^>]*name="form-name"[^>]*value="contact"/i,
    'hidden form-name input (required for Netlify detection)'
  );
  assert.match(html, /data-netlify-recaptcha="true"/i, 'reCAPTCHA widget');
});

test('referenced local assets exist on disk', () => {
  for (const f of ['erin-geoghan.jpg', 'favicon.svg', 'og-image.png', 'privacy.html', 'thanks.html', 'coaching.html', 'residency.html', 'technical-leadership-residency.pdf', 'head-of-ai-checklist.html', 'erin-illustration.jpg']) {
    assert.ok(existsSync(join(root, f)), `missing asset: ${f}`);
  }
});

test('local asset paths are relative (work under file:// and when served)', () => {
  assert.match(html, /src="erin-geoghan\.jpg"/, 'hero photo uses a relative path');
  assert.doesNotMatch(html, /src="\/erin-geoghan\.jpg"/, 'no root-absolute photo path');
  assert.match(html, /href="favicon\.svg"/, 'favicon uses a relative path');
});

test('three JSON-LD blocks present and all valid JSON', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(blocks.length, 3, 'expected 3 structured-data blocks');
  for (const b of blocks) assert.doesNotThrow(() => JSON.parse(b), 'JSON-LD block must parse');
});

test('exactly one H1', () => {
  const count = (html.match(/<h1[\s>]/gi) || []).length;
  assert.equal(count, 1, 'a page should have exactly one h1');
});

test('the three outcome cards are present and populated', () => {
  const cards = [...html.matchAll(/<article class="grow"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  assert.equal(cards.length, 3, 'expected 3 outcome cards');
  for (const c of cards) {
    assert.match(c, /<h3>[\s\S]+?<\/h3>/, 'each card has a heading');
    assert.match(c, /<p>[\s\S]+?<\/p>/, 'each card has body copy');
  }
});

test('hero and contact both link to the booking calendar', () => {
  const links = (html.match(/calendar\.app\.google\/6GFwQByUaJ4S3Rk66/g) || []).length;
  assert.ok(links >= 2, 'booking link should appear in hero and contact');
});

// The lead-magnet section is toggled off (commented out) until the downloadable
// artifact exists. When re-enabling it, restore the wired-form assertions this
// test had before (name/method/action/data-netlify/honeypot/hidden form-name/email).
test('lead magnet stays toggled off, with the section preserved for re-enable', () => {
  const live = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(live, /name="lead-magnet"/i, 'lead-magnet form must not be live yet');
  assert.doesNotMatch(live, /AI Adoption Scorecard/i, 'lead-magnet section must not render yet');
  assert.match(html, /name="lead-magnet"/i, 'commented-out lead-magnet section should stay in the file for re-enable');
});

test('advisor band is present', () => {
  assert.match(html, /AI moved faster than anyone could change the business around it/i, 'advisor lede must appear on the page');
  for (const step of ['Clarity', 'Alignment', 'Momentum']) {
    assert.match(html, new RegExp(step, 'i'), `offer rail step "${step}" must appear`);
  }
  assert.match(html, /the business changes with the technology/i, 'advisor close must appear on the page');
  assert.match(html, /what improved and why/i, 'value close must appear on the page');
});

test('hero leads with the stalled-work line and keeps scope unrestricted', () => {
  assert.match(html, /I make <span class="u">stalled work/i, 'hero h1 must be the stalled-work line');
  assert.match(html, /whoever else ended up owning AI/i, 'hero role line must keep the open door');
  assert.doesNotMatch(html, /CEOs, COOs, CTOs/, 'title-list audience framing must stay gone');
  assert.doesNotMatch(html, /a handful of engineering teams|product companies with a few engineering teams/i, 'company-size qualifiers must stay out (too restrictive)');
  assert.match(html, /without an overhaul you can't afford to run/i, 'hero deck must keep the without-clause');
  assert.match(html, /find exactly where that's costing you/i, 'hero deck must lead with diagnosis');
});

test('activation cycle framing is present', () => {
  assert.match(html, /90-day Activation Cycle/, 'the Activation Cycle must be named');
  assert.match(html, /week 12/i, 'the week-12 outcome must appear');
});

test('white palette holds — no tan/terracotta regression', () => {
  for (const f of ['index.html', 'coaching.html', 'residency.html', 'privacy.html', 'thanks.html', 'one-pager.html', 'og-image.html', 'favicon.svg', 'head-of-ai-checklist.html']) {
    assert.doesNotMatch(read(f), /F4F1EA|ECE7DB|A8392A|1F4D47|C2912F/i, `${f} must not contain old palette colors`);
  }
  assert.match(html, /<meta name="theme-color" content="#FFFFFF"/i, 'theme-color is white');
});

test('no known regressions', () => {
  assert.doesNotMatch(html, /congifured/i, 'fixed typo must not reappear');
  assert.doesNotMatch(html, /What leadership decides/i, 'removed leadership line must stay gone');
  assert.doesNotMatch(html, /no fixed boundary/i, 'open-set lore section must stay gone');
  assert.doesNotMatch(html, /studied mathematics/i, 'math backstory must stay gone');
  assert.doesNotMatch(html, /—/, 'no em dashes (voice rule)');
  assert.doesNotMatch(html, /fractional/i, 'broader advisory offering must stay unnamed on the site');
});

test('coaching page is wired to the consulting page and holds the voice rules', () => {
  const coaching = read('coaching.html');
  assert.match(html, /href="coaching\.html"/, 'consulting page must link to coaching');
  assert.match(coaching, /href="index\.html"/, 'coaching page must link back to consulting');
  assert.match(coaching, /Open Set Coaching/, 'coaching page is branded');
  assert.match(coaching, /The Technical Leadership Residency/, 'the offering must be named');
  assert.doesNotMatch(coaching, /\u2014/, 'no em dashes (voice rule)');
  assert.doesNotMatch(coaching, /\$\s?\d/, 'pricing stays off the coaching page');
  const h1s = (coaching.match(/<h1[\s>]/gi) || []).length;
  assert.equal(h1s, 1, 'coaching page should have exactly one h1');
});

test('one-pager download is gated behind the email capture form', () => {
  const coaching = read('coaching.html');
  const delivery = read('residency.html');
  assert.match(coaching, /<form[^>]*\bname="residency-download"/i, 'capture form must be name="residency-download"');
  assert.match(coaching, /<form[^>]*method="POST"/i, 'capture form must POST');
  assert.match(coaching, /<form[^>]*action="\/?residency\.html"/i, 'capture form action -> delivery page');
  assert.match(coaching, /data-netlify="true"/i, 'data-netlify flag');
  assert.match(coaching, /data-netlify-honeypot="bot-field"/i, 'honeypot configured');
  assert.match(coaching, /name="bot-field"/i, 'honeypot field present');
  assert.match(
    coaching,
    /<input[^>]*type="hidden"[^>]*name="form-name"[^>]*value="residency-download"/i,
    'hidden form-name input (required for Netlify detection)'
  );
  assert.match(coaching, /<input[^>]*id="op-email"[^>]*type="email"[^>]*required/i, 'email is required');
  assert.doesNotMatch(coaching, /href="technical-leadership-residency\.pdf"/i, 'the PDF must never be linked directly from the coaching page');
  assert.match(coaching, /id="one-pager"/, 'the capture section must be anchorable');
  assert.match(delivery, /href="technical-leadership-residency\.pdf"/i, 'delivery page serves the PDF');
  assert.match(delivery, /content="noindex, nofollow"/i, 'delivery page must be noindex');
  assert.doesNotMatch(delivery, /\u2014/, 'no em dashes (voice rule)');
  assert.match(read('robots.txt'), /Disallow: \/residency\.html/, 'delivery page disallowed in robots.txt');
});

test('head of AI checklist page is complete and on-brand', () => {
  const c = read('head-of-ai-checklist.html');
  for (const view of ['view-intro', 'view-quiz', 'view-result']) {
    assert.match(c, new RegExp(`<section id="${view}"`), `checklist must keep the ${view} section`);
  }
  assert.match(c, /id="btn-start"/, 'start button present');
  assert.match(c, /id="cta-book"[^>]*href="https:\/\/calendar\.app\.google\/6GFwQByUaJ4S3Rk66"/, 'result CTA must use the site booking URL');
  assert.match(c, /id="save-btn"/, 'email-results button present');
  assert.match(c, /src="erin-illustration\.jpg"/, 'illustration referenced by relative path (not base64)');
  assert.doesNotMatch(c, /data:image\/jpeg;base64/, 'base64 image must stay slimmed out');
  assert.match(c, /rel="canonical" href="https:\/\/opensetconsulting\.com\/head-of-ai-checklist"/, 'canonical uses the clean URL');
  assert.match(c, /Fraunces/, 'checklist uses the site display face');
  assert.doesNotMatch(c, /Newsreader/, 'old display face must stay gone');
  assert.doesNotMatch(c, /—/, 'no em dashes (voice rule)');
  const h1s = (c.match(/<h1[\s>]/gi) || []).length;
  assert.equal(h1s, 1, 'checklist page should have exactly one h1');
});

test('checklist results email is wired to Netlify forms, with the mailto fallback kept', () => {
  const c = read('head-of-ai-checklist.html');
  assert.match(c, /<form[^>]*\bname="checklist-results"/i, 'static detection form must be name="checklist-results"');
  assert.match(c, /<form[^>]*\bname="checklist-results"[^>]*data-netlify="true"/i, 'data-netlify flag');
  assert.match(c, /<form[^>]*\bname="checklist-results"[^>]*data-netlify-honeypot="bot-field"/i, 'honeypot configured');
  assert.match(c, /<input[^>]*type="hidden"[^>]*name="form-name"[^>]*value="checklist-results"/i, 'hidden form-name input (required for Netlify detection)');
  for (const field of ['email', 'score', 'results', 'source']) {
    assert.match(c, new RegExp(`name="${field}"`), `detection form must declare the ${field} field`);
  }
  assert.match(c, /form\.append\("form-name","checklist-results"\)/, 'fetch submission must send form-name');
  assert.doesNotMatch(c, /EMAIL_ENDPOINT = "REPLACE_WITH_ENDPOINT"/, 'endpoint must be wired');
  assert.match(c, /mailto:"\+ERIN_EMAIL/, 'mailto fallback must stay in place');
});

test('homepage routes to the checklist from both entry points, booking stays primary', () => {
  const entries = (html.match(/href="head-of-ai-checklist\.html"/g) || []).length;
  assert.equal(entries, 2, 'exactly two checklist entry points on the homepage');
  assert.match(html, /Not ready<br>to talk yet\?/, 'mid-page nudge present after the recognition section');
  assert.match(html, /Prefer to start on your own\?/, 'pre-contact nudge present above the booking section');
  const bookings = (html.match(/calendar\.app\.google\/6GFwQByUaJ4S3Rk66/g) || []).length;
  assert.ok(bookings >= 3, 'primary booking CTAs must remain');
  assert.match(read('sitemap.xml'), /head-of-ai-checklist/, 'checklist is in the sitemap');
});

test('one-pager exists and is branded', () => {
  assert.ok(existsSync(join(root, 'one-pager.html')), 'one-pager.html should exist');
  assert.match(read('one-pager.html'), /Open Set/, 'one-pager is branded');
});
