"""Refresh the three newest public posts using Substack's RSS feed (stdlib only)."""
import argparse
import email.utils
import html
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FEED = 'https://muhammedtariq.substack.com/feed'

def parse_feed(data):
    channel = ET.fromstring(data).find('channel')
    if channel is None:
        raise ValueError('Expected an RSS channel; retaining the existing posts.')
    posts = []
    for item in channel.findall('item'):
        url = item.findtext('link', '').strip()
        if urlparse(url).scheme != 'https' or urlparse(url).hostname != 'muhammedtariq.substack.com':
            continue
        title = item.findtext('title', '').strip()
        if not title:
            continue
        date = email.utils.parsedate_to_datetime(item.findtext('pubDate'))
        excerpt = html.unescape(re.sub('<[^>]+>', '', item.findtext('description', '')))
        excerpt = re.sub(r'\s+', ' ', excerpt).strip()
        if len(excerpt) > 240:
            excerpt = excerpt[:237].rsplit(' ', 1)[0] + '…'
        posts.append(dict(title=title, url=url, date=date.isoformat(), excerpt=excerpt))
    posts.sort(key=lambda post: post['date'], reverse=True)
    if len(posts) < 3:
        raise ValueError('Fewer than three valid posts; retaining the existing snapshot.')
    return {'publication': 'https://muhammedtariq.substack.com/', 'posts': posts[:3]}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=Path, help='Optional downloaded RSS for offline verification')
    args = parser.parse_args()
    if args.file:
        data = args.file.read_bytes()
    else:
        request = Request(FEED, headers={'User-Agent': 'Seriaura website RSS reader'})
        with urlopen(request, timeout=30) as response:
            data = response.read()
    result = parse_feed(data)
    destination = ROOT / 'assets' / 'substack-posts.json'
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('\n'.join(post['title'] for post in result['posts']))
