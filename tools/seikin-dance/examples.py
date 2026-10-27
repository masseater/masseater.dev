import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]
article = root / "apps/portfolio/content/blogs/video-vj-techniques.md"
out = root / "apps/portfolio/src/entities/technique/model/generated/examples.json"

WIKI = re.compile(r"\]\((https://(en|ja)\.wikipedia\.org/wiki/[^)\s]+)\)")
TAGS = re.compile(r"<[^>]+>")
FREE = re.compile(r"^(CC0|CC BY|CC-BY|Public domain|PD|GFDL|Attribution|No restrictions|FAL)", re.I)
AGENT = "masseater.dev seikin-techniques (https://masseater.dev)"


def get(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return {}
            time.sleep(int(error.headers.get("Retry-After", 0) or 0) + 15 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError) as error:
            print(url, error, flush=True)
            time.sleep(2**attempt)
    return {}


def text(meta: dict, key: str) -> str:
    return TAGS.sub("", meta.get(key, {}).get("value", "")).strip()


def batches(items: list, size: int = 40):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def page_images(lang: str, titles: list[str]) -> dict[str, str]:
    found = {}
    for batch in batches(titles):
        query = urllib.parse.urlencode(
            {"action": "query", "prop": "pageimages", "piprop": "name", "redirects": 1,
             "titles": "|".join(batch), "format": "json", "formatversion": 2}
        )
        data = get(f"https://{lang}.wikipedia.org/w/api.php?{query}").get("query", {})
        aliases = {}
        for step in data.get("normalized", []) + data.get("redirects", []):
            aliases[step["to"]] = aliases.get(step["from"], step["from"])
        for page in data.get("pages", []):
            if "pageimage" in page:
                origin = page["title"]
                while origin in aliases:
                    origin = aliases[origin]
                found[origin] = page["pageimage"]
        time.sleep(1)
    return found


def commons(files: list[str]) -> dict[str, dict]:
    found = {}
    for batch in batches(files):
        query = urllib.parse.urlencode(
            {"action": "query", "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 800,
             "titles": "|".join(f"File:{name}" for name in batch), "format": "json", "formatversion": 2}
        )
        data = get(f"https://commons.wikimedia.org/w/api.php?{query}").get("query", {})
        aliases = {step["to"]: step["from"] for step in data.get("normalized", [])}
        for page in data.get("pages", []):
            if page.get("missing") or "imageinfo" not in page:
                continue
            info = page["imageinfo"][0]
            meta = info.get("extmetadata", {})
            license_name = text(meta, "LicenseShortName")
            if not FREE.match(license_name):
                continue
            title = aliases.get(page["title"], page["title"])
            found[title.removeprefix("File:").replace(" ", "_")] = {
                "src": info.get("thumburl", info["url"]).split("?")[0],
                "width": info.get("thumbwidth", info.get("width")),
                "height": info.get("thumbheight", info.get("height")),
                "file": info["descriptionurl"],
                "artist": text(meta, "Artist")[:120],
                "license": license_name,
            }
        time.sleep(1)
    return found


def main() -> None:
    links = sorted({(match[1], match[2]) for match in WIKI.finditer(article.read_text())})
    titles = {}
    for url, lang in links:
        titles.setdefault(lang, {})[urllib.parse.unquote(url.rsplit("/wiki/", 1)[1].split("#")[0]).replace("_", " ")] = url
    images = {}
    for lang, mapping in titles.items():
        for title, file in page_images(lang, list(mapping)).items():
            if title in mapping:
                images[mapping[title]] = (title, file)
    licensed = commons(sorted({file for _, file in images.values()}))
    previous = json.loads(out.read_text()) if out.exists() else {}
    result = previous | {
        url: {"title": title, **licensed[file]}
        for url, (title, file) in images.items()
        if file in licensed
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(f"{len(result)}/{len(links)}")


if __name__ == "__main__":
    main()
