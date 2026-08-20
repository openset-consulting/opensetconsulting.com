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
  for (const f of ['erin-geoghan.jpg', 'favicon.svg', 'og-image.png', 'privacy.html', 'thanks.html']) {
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
  for (const f of ['index.html', 'privacy.html', 'thanks.html', 'one-pager.html', 'og-image.html', 'favicon.svg']) {
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

test('one-pager exists and is branded', () => {
  assert.ok(existsSync(join(root, 'one-pager.html')), 'one-pager.html should exist');
  assert.match(read('one-pager.html'), /Open Set/, 'one-pager is branded');
});
