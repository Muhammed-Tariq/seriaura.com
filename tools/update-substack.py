"""Refresh public post metadata from Substack RSS using only Python's standard library.
Run: python tools/update-substack.py [optional-local-feed.xml]
An unsuccessful fetch leaves the last successful snapshot intact.
"""
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

FEED = 'https://muhammedtariq.substack.com/feed'
OUTPUT = Path(__file__).resolve().parents[1] / 'assets/substack-posts.json'

def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()

def parse_posts(xml):
    items = ET.fromstring(xml).findall('./channel/item')
    items.sort(key=lambda item: parsedate_to_datetime(item.findtext('pubDate')), reverse=True)
    posts = []
    for item in items[:3]:
        href = item.findtext('link', '')
        if urlparse(href).hostname != 'muhammedtariq.substack.com':
            raise ValueError('Unexpected post host')
        enclosure = item.find('enclosure')
        image = enclosure.get('url', '') if enclosure is not None else ''
        if not image:
            body = item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded', '')
            match = re.search(r'<img[^>]+src=["\']([^"\']+)', body)
            image = html.unescape(match.group(1)) if match else ''
        if image and urlparse(image).scheme != 'https':
            raise ValueError('Expected HTTPS image')
        posts.append(dict(title=plain(item.findtext('title')), description=plain(item.findtext('description')),
                          href=href, image=image, published=parsedate_to_datetime(item.findtext('pubDate')).isoformat()))
    if len(posts) != 3 or any(not p['title'] for p in posts):
        raise ValueError('Feed must provide three complete posts')
    return {'source': FEED, 'posts': posts}

if __name__ == '__main__':
    if len(sys.argv) > 1:
        xml = Path(sys.argv[1]).read_bytes()
    else:
        request = urllib.request.Request(FEED, headers={'User-Agent': 'Seriaura-Website/1.0 (public RSS reader)'})
        with urllib.request.urlopen(request, timeout=30) as response:
            xml = response.read()
    data = json.dumps(parse_posts(xml), ensure_ascii=False, indent=2) + '\n'
    if not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != data:
        OUTPUT.write_text(data, encoding='utf-8')
    print('Substack: three latest posts ready.')
