import urllib.request
import urllib.error
import re
import os
import time
import html

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__)) + "/盲派看八字"

# All 78 article URLs from 4 pagination pages
ARTICLE_URLS = [
    # Page 1
    "https://www.suanzhun.net/article/2993.html",
    "https://www.suanzhun.net/article/2980.html",
    "https://www.suanzhun.net/article/2897.html",
    "https://www.suanzhun.net/article/2849.html",
    "https://www.suanzhun.net/article/2719.html",
    "https://www.suanzhun.net/article/2718.html",
    "https://www.suanzhun.net/article/2708.html",
    "https://www.suanzhun.net/article/2696.html",
    "https://www.suanzhun.net/article/2695.html",
    "https://www.suanzhun.net/article/2693.html",
    "https://www.suanzhun.net/article/2684.html",
    "https://www.suanzhun.net/article/2680.html",
    "https://www.suanzhun.net/article/2653.html",
    "https://www.suanzhun.net/article/2652.html",
    "https://www.suanzhun.net/article/2644.html",
    "https://www.suanzhun.net/article/2638.html",
    "https://www.suanzhun.net/article/2629.html",
    "https://www.suanzhun.net/article/2628.html",
    "https://www.suanzhun.net/article/2612.html",
    "https://www.suanzhun.net/article/2608.html",
    "https://www.suanzhun.net/article/2564.html",
    "https://www.suanzhun.net/article/2553.html",
    "https://www.suanzhun.net/article/2550.html",
    "https://www.suanzhun.net/article/2528.html",
    "https://www.suanzhun.net/article/2527.html",
    # Page 2
    "https://www.suanzhun.net/article/2488.html",
    "https://www.suanzhun.net/article/2463.html",
    "https://www.suanzhun.net/article/2462.html",
    "https://www.suanzhun.net/article/2457.html",
    "https://www.suanzhun.net/article/2418.html",
    "https://www.suanzhun.net/article/2388.html",
    "https://www.suanzhun.net/article/2387.html",
    "https://www.suanzhun.net/article/2383.html",
    "https://www.suanzhun.net/article/2382.html",
    "https://www.suanzhun.net/article/2330.html",
    "https://www.suanzhun.net/article/2305.html",
    "https://www.suanzhun.net/article/2280.html",
    "https://www.suanzhun.net/article/2264.html",
    "https://www.suanzhun.net/article/2254.html",
    "https://www.suanzhun.net/article/2249.html",
    "https://www.suanzhun.net/article/2228.html",
    "https://www.suanzhun.net/article/2208.html",
    "https://www.suanzhun.net/article/2202.html",
    "https://www.suanzhun.net/article/2201.html",
    "https://www.suanzhun.net/article/2197.html",
    "https://www.suanzhun.net/article/2196.html",
    "https://www.suanzhun.net/article/2191.html",
    "https://www.suanzhun.net/article/2187.html",
    "https://www.suanzhun.net/article/2186.html",
    "https://www.suanzhun.net/article/2178.html",
    # Page 3
    "https://www.suanzhun.net/article/2093.html",
    "https://www.suanzhun.net/article/2027.html",
    "https://www.suanzhun.net/article/2012.html",
    "https://www.suanzhun.net/article/2007.html",
    "https://www.suanzhun.net/article/1970.html",
    "https://www.suanzhun.net/article/1932.html",
    "https://www.suanzhun.net/article/1927.html",
    "https://www.suanzhun.net/article/1914.html",
    "https://www.suanzhun.net/article/1879.html",
    "https://www.suanzhun.net/article/1869.html",
    "https://www.suanzhun.net/article/1852.html",
    "https://www.suanzhun.net/article/1849.html",
    "https://www.suanzhun.net/article/1844.html",
    "https://www.suanzhun.net/article/1823.html",
    "https://www.suanzhun.net/article/1806.html",
    "https://www.suanzhun.net/article/1758.html",
    "https://www.suanzhun.net/article/1513.html",
    "https://www.suanzhun.net/article/1514.html",
    "https://www.suanzhun.net/article/1515.html",
    "https://www.suanzhun.net/article/1516.html",
    "https://www.suanzhun.net/article/1517.html",
    "https://www.suanzhun.net/article/1518.html",
    "https://www.suanzhun.net/article/1519.html",
    "https://www.suanzhun.net/article/1202.html",
    "https://www.suanzhun.net/article/1201.html",
    # Page 4
    "https://www.suanzhun.net/article/1200.html",
    "https://www.suanzhun.net/article/1199.html",
    "https://www.suanzhun.net/article/1198.html",
]


def sanitize_filename(name):
    """Remove illegal characters from filename."""
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()


def fetch_article(url):
    """Fetch article page and extract title + body."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode(resp.headers.get_content_charset() or "utf-8", errors="replace")
    except Exception as e:
        print(f"  ERROR fetching: {e}")
        return None

    # Extract <title>
    title_match = re.search(r"<title>(.*?)</title>", raw, re.S | re.I)
    title = html.unescape(title_match.group(1).strip()) if title_match else "untitled"
    # Clean title suffix
    title = re.sub(r"\s*[-–|].*$", "", title).strip()

    # Extract article body: look for <article> or <div class="content"> or <div class="article-body">
    body = ""
    # Try <article> first
    art_match = re.search(r"<article[^>]*>(.*?)</article>", raw, re.S | re.I)
    if art_match:
        body = art_match.group(1)
    else:
        # Try common content div patterns
        for cls in ["article-content", "article_body", "content", "articlebody", "entry-content"]:
            m = re.search(r'<div[^>]*class="[^"]*' + cls + r'[^"]*"[^>]*>(.*?)</div>\s*(?:<div|</article|<footer|$)', raw, re.S | re.I)
            if m:
                body = m.group(1)
                break

    if not body:
        # Fallback: grab between end of header/nav and start of footer/related
        # Try to find main content area
        body_match = re.search(r"<!--\s*文章内容|article|content\s*-->", raw, re.I)
        # Generic: grab everything between <header> or first <nav> end and <footer> or related-articles
        start = 0
        end_match = re.search(r'<footer|<div[^>]*class="[^"]*related|<div[^>]*class="[^"]*sidebar', raw, re.I)
        if end_match:
            raw = raw[:end_match.start()]

        # Remove header/nav
        header_end = re.search(r'</header>|</nav>', raw, re.I)
        if header_end:
            start = header_end.end()

        body = raw[start:]

    # Strip HTML tags
    text = re.sub(r"<script[^>]*>.*?</script>", "", body, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"</?p[^>]*>", "\n\n", text)
    text = re.sub(r"</?div[^>]*>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    # Clean leading/trailing whitespace per line
    lines = [l.strip() for l in text.split("\n")]
    text = "\n".join(lines)
    text = text.strip()

    return {"title": title, "url": url, "text": text}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = len(ARTICLE_URLS)
    success = 0
    fail = 0

    for i, url in enumerate(ARTICLE_URLS, 1):
        print(f"[{i}/{total}] {url}")
        result = fetch_article(url)
        if result and result["text"]:
            fname = sanitize_filename(result["title"]) + ".txt"
            fpath = os.path.join(OUTPUT_DIR, fname)
            content = f"# {result['title']}\n\n来源: {url}\n\n{result['text']}\n"
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            success += 1
            print(f"  -> {fname} ({len(result['text'])} chars)")
        else:
            fail += 1
            print(f"  -> FAILED")

        time.sleep(0.5)  # Be polite

    print(f"\nDone. Success: {success}, Failed: {fail}")


if __name__ == "__main__":
    main()
