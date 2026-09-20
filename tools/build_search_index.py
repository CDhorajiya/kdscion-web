#!/usr/bin/env python3
"""
build_search_index.py — writes search-index.json for the site-wide search.

Run from the repo root after adding/renaming pages (step 8 of the batch workflow):

    python3 tools/build_search_index.py

It starts at index.html and follows links from page to page, so only pages a
customer can actually reach are indexed — admin, test and backup pages are left
out simply because nothing public links to them.

Fabrics are deliberately NOT in this file: js/search-ui.js reads the live fabric
catalogue at search time so hidden and out-of-stock fabrics never show up.
"""
import json
import os
import re
import sys
from collections import deque
from datetime import datetime, timezone
from urllib.parse import unquote

START = 'index.html'
OUT = 'search-index.json'

# Never index these even if something links to them.
DENY = re.compile(r'^(admin-dashboard|test-.*|.*-backup|.*-copy|index-1)\.html$', re.I)

TAG_RE      = re.compile(r'<[^>]+>')
SCRIPT_RE   = re.compile(r'<(script|style|template)\b.*?</\1>', re.S | re.I)
# Pages are linked by href, by data attributes (the pool gallery uses
# data-product-url="p60.html") and from scripts — so take any quoted .html value.
HREF_RE     = re.compile(r'["\']([^"\'<>]+?\.html)["\']', re.I)
TITLE_RE    = re.compile(r'<title[^>]*>(.*?)</title>', re.S | re.I)
H_RE        = re.compile(r'<h[1-3][^>]*>(.*?)</h[1-3]>', re.S | re.I)
SKU_RE      = re.compile(r'data-sku\s*=\s*"([^"]+)"', re.I)
META_RE     = re.compile(r'<meta[^>]+(?:name|property)\s*=\s*"(?:og:)?description"[^>]*content\s*=\s*"([^"]*)"', re.I)
OGIMG_RE    = re.compile(r'<meta[^>]+property\s*=\s*"og:image"[^>]*content\s*=\s*"([^"]*)"', re.I)

STOPWORDS = {
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'you', 'our', 'are', 'was',
    'have', 'has', 'not', 'but', 'all', 'can', 'will', 'its', 'it', 'a', 'an', 'of', 'to',
    'in', 'on', 'at', 'by', 'is', 'be', 'as', 'or', 'we', 'us', 'kd', 'kdscion', 'scion',
    'html', 'page', 'href', 'com', 'www', 'https',
}


def text(fragment: str) -> str:
    """Strip tags/entities from an HTML fragment and collapse whitespace."""
    s = TAG_RE.sub(' ', fragment)
    for entity, char in (('&amp;', '&'), ('&nbsp;', ' '), ('&mdash;', '—'), ('&middot;', '·'),
                         ('&quot;', '"'), ('&#39;', "'"), ('&larr;', '←'), ('&times;', '×')):
        s = s.replace(entity, char)
    return re.sub(r'\s+', ' ', s).strip()


def page_type(name: str) -> str:
    if re.match(r'^p\d+(-product)?\.html$', name, re.I):
        return 'design'
    if 'variations' in name.lower():
        return 'variation'
    if 'pool' in name.lower():
        return 'gallery'
    return 'page'


def keywords(*parts: str, limit: int = 60) -> str:
    seen, out = set(), []
    for word in re.findall(r"[a-z0-9']{3,}", ' '.join(parts).lower()):
        if word in STOPWORDS or word in seen:
            continue
        seen.add(word)
        out.append(word)
        if len(out) >= limit:
            break
    return ' '.join(out)


def links_in(html: str):
    for href in HREF_RE.findall(html):
        href = href.split('#')[0].split('?')[0].strip()
        if not href or '//' in href or '$' in href or '{' in href:
            continue
        yield os.path.basename(unquote(href))


def entry_for(name: str, html: str) -> dict:
    body = SCRIPT_RE.sub(' ', html)
    kind = page_type(name)

    title = text(TITLE_RE.search(html).group(1)) if TITLE_RE.search(html) else name
    title = re.split(r'\s+[—|]\s+', title)[0].strip() or title

    headings = [text(h) for h in H_RE.findall(body)]
    headings = [h for h in headings if h][:12]

    desc_match = META_RE.search(html)
    desc = text(desc_match.group(1)) if desc_match else ''
    if not desc:
        desc = text(body)[:300]

    item = {'u': name, 't': kind, 'n': title, 'd': desc[:300]}

    if kind == 'design':
        # The garment name is the page's first heading; the SKU sits on the fabric panel.
        if headings:
            item['n'] = headings[0]
        sku = SKU_RE.search(html)
        if sku:
            item['sku'] = sku.group(1)
        img = OGIMG_RE.search(html)
        if img:
            item['img'] = re.sub(r'^https?://[^/]+/', '', img.group(1))
        code = re.match(r'^(p\d+)', name, re.I)
        if code:
            item['code'] = code.group(1).lower()

    # Words from the page's own name/SKU always count; the rest (headings, description)
    # are boilerplate candidates, thinned out in main() once every page has been read.
    item['_own'] = keywords(item['n'], item.get('sku', ''), item.get('code', ''))
    item['_rest'] = keywords(' '.join(headings), desc)
    return item


def main() -> int:
    if not os.path.exists(START):
        print(f'error: run this from the repo root ({START} not found)', file=sys.stderr)
        return 1

    seen, queue, pages, missing = {START}, deque([START]), [], []
    while queue:
        name = queue.popleft()
        if DENY.match(name) or not os.path.exists(name):
            continue
        with open(name, encoding='utf-8', errors='ignore') as fh:
            html = fh.read()
        pages.append(entry_for(name, html))
        for link in links_in(html):
            if link in seen:
                continue
            seen.add(link)
            if DENY.match(link):
                continue
            if os.path.exists(link):
                queue.append(link)
            else:
                missing.append((name, link))

    # Site-wide boilerplate ("bespoke", "tailored", "measurements"…) appears on most
    # pages and would match everything, so drop words shared by over 40% of pages —
    # unless they're part of that page's own name.
    freq = {}
    for p in pages:
        for word in set(p['_rest'].split()):
            freq[word] = freq.get(word, 0) + 1
    limit = max(3, int(len(pages) * 0.4))
    for p in pages:
        rest = [w for w in p['_rest'].split() if freq.get(w, 0) <= limit]
        p['k'] = ' '.join(dict.fromkeys(p['_own'].split() + rest))
        del p['_own'], p['_rest']

    pages.sort(key=lambda p: (p['t'], p['u']))
    index = {'generated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'pages': pages}
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(',', ':'))

    counts = {}
    for p in pages:
        counts[p['t']] = counts.get(p['t'], 0) + 1
    size_kb = os.path.getsize(OUT) / 1024
    print(f'{OUT}: {len(pages)} pages ({counts}), {size_kb:.0f} KB')
    if missing:
        print(f'broken links ({len(missing)}): ' + ', '.join(f'{a} → {b}' for a, b in missing[:10]))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
