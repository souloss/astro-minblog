from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path
from typing import Callable

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:4321")
AI_API_URL = os.environ.get("E2E_AI_API_URL", "http://localhost:8787")
ARTICLE_SLUG = os.environ.get("E2E_ARTICLE_SLUG", "complete-setup-guide")

ROOT_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = ROOT_DIR / "tests" / "artifacts"
RESULTS_PATH = ROOT_DIR / "tests" / "e2e-results.json"

RESULTS: list[dict[str, str]] = []
HARD_FAILURES = 0


def record(name: str, status: str, detail: str = "") -> None:
    global HARD_FAILURES
    RESULTS.append({"test": name, "status": status, "detail": detail})
    if status == "FAIL":
        HARD_FAILURES += 1
    icon = (
        "✅"
        if status == "PASS"
        else "❌"
        if status == "FAIL"
        else "⚠️"
        if status == "WARN"
        else "⏭️"
    )
    print(f"  {icon} {name}" + (f" — {detail}" if detail else ""))


def safe_name(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def save_artifact(page, name: str) -> str:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACTS_DIR / f"{safe_name(name)}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path.relative_to(ROOT_DIR))


def goto(page, path: str) -> None:
    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def assert_visible(page, selector: str, name: str, detail: str = "") -> None:
    locator = page.locator(selector).first
    try:
        locator.wait_for(state="visible", timeout=8000)
        record(name, "PASS", detail)
    except PlaywrightTimeoutError:
        artifact = save_artifact(page, name)
        record(name, "FAIL", f"{detail} screenshot={artifact}".strip())
        raise


def assert_count(page, selector: str, minimum: int, name: str) -> int:
    locator = page.locator(selector)
    count = locator.count()
    status = "PASS" if count >= minimum else "FAIL"
    detail = f"{count} found, expected >= {minimum}"
    if status == "FAIL":
        detail = f"{detail}, screenshot={save_artifact(page, name)}"
    record(name, status, detail)
    if status == "FAIL":
        raise AssertionError(detail)
    return count


def run_test(page, name: str, fn: Callable) -> None:
    print(f"\n🧪 {name}")
    try:
        fn(page)
    except Exception as exc:  # noqa: BLE001
        record(f"{name} unexpected error", "FAIL", str(exc)[:200])


def test_homepage(page) -> None:
    goto(page, "/zh/")
    title = page.title().strip()
    record("Homepage title", "PASS" if title else "FAIL", title)
    if not title:
        raise AssertionError("Empty homepage title")

    assert_visible(page, "nav", "Navigation present")
    assert_count(page, "a[href^='/zh/posts/']", 4, "Post links rendered on homepage")
    assert_visible(page, "footer", "Footer present")
    assert_visible(page, "#theme-btn", "Theme toggle present")
    assert_visible(page, "#ai-chat-toggle-fab", "AI chat FAB present")


def test_article_detail(page) -> None:
    goto(page, f"/zh/posts/{ARTICLE_SLUG}/")
    assert_visible(page, "article#article", "Article body present")

    h1 = page.locator("h1").first
    article_title = (h1.text_content() or "").strip()
    record(
        "Article h1 present", "PASS" if article_title else "FAIL", article_title[:80]
    )
    if not article_title:
        raise AssertionError("Article heading missing")

    assert_visible(page, "[data-inline-toc]", "Inline TOC present")
    assert_visible(page, "#immersive-mode-btn-nav", "Immersive mode button present")
    assert_visible(page, "#waline", "Waline container present")
    assert_count(
        page, "[data-pagefind-filter='tag']", 1, "Pagefind tag metadata present"
    )
    assert_count(page, "a[href*='/zh/tags/']", 1, "Tag links present on article page")


def test_dark_mode(page) -> None:
    goto(page, "/zh/")
    theme_btn = page.locator("#theme-btn")
    theme_btn.wait_for(state="visible", timeout=8000)

    html = page.locator("html")
    initial_theme = html.get_attribute("data-theme") or ""
    theme_btn.click()
    page.wait_for_function(
        "expected => document.documentElement.getAttribute('data-theme') !== expected",
        arg=initial_theme,
        timeout=8000,
    )
    after_theme = html.get_attribute("data-theme") or ""
    record("Dark mode toggle works", "PASS", f"{initial_theme} -> {after_theme}")

    theme_btn.click()
    page.wait_for_function(
        "expected => document.documentElement.getAttribute('data-theme') === expected",
        arg=initial_theme,
        timeout=8000,
    )
    final_theme = html.get_attribute("data-theme") or ""
    record("Theme toggle restores initial state", "PASS", final_theme)


def test_taxonomy_pages(page) -> None:
    goto(page, "/zh/tags/")
    assert_count(page, "a[href*='/zh/tags/']", 4, "Tag links rendered")

    goto(page, "/zh/categories/")
    assert_count(page, "a[href*='/zh/categories/']", 1, "Category links rendered")

    goto(page, "/zh/series/")
    assert_count(page, "a[href*='/zh/series/']", 1, "Series links rendered")

    goto(page, "/zh/archives/")
    assert_count(page, "a[href^='/zh/posts/']", 4, "Archives page shows post links")

    goto(page, "/zh/projects/")
    assert_count(
        page, "a[href*='github.com']", 1, "Projects page shows repository links"
    )

    goto(page, "/zh/friends/")
    assert_count(
        page, "a[target='_blank'][href^='http']", 1, "Friends page shows outbound links"
    )


def test_search_page(page) -> None:
    goto(page, "/zh/search/")
    assert_visible(page, "#pagefind-search", "Search container present")

    warning = page.locator("text=DEV mode Warning!")
    if warning.count() > 0:
        record("Search dev warning rendered", "PASS")

    search_input = page.locator(
        ".pagefind-ui__search-input, #pagefind-search input"
    ).first
    search_input.wait_for(state="visible", timeout=10000)
    search_input.fill("配置")
    record("Search input interactive", "PASS", "query=配置")
    page.wait_for_function(
        "() => window.location.search.includes('q=%E9%85%8D%E7%BD%AE')", timeout=10000
    )
    record("Search query updates URL", "PASS", page.url)


def test_ai_info_api(page) -> None:
    payload = fetch_json(f"{AI_API_URL}/api/ai-info")
    status = payload.get("status")
    providers = payload.get("ai", {}).get("providers", [])
    configured = payload.get("ai", {}).get("configured")
    record(
        "AI info endpoint healthy", "PASS" if status == "ok" else "FAIL", str(status)
    )
    if status != "ok":
        raise AssertionError("AI info endpoint did not return ok")
    record(
        "AI providers reported",
        "PASS" if configured and len(providers) > 0 else "FAIL",
        f"providers={len(providers)} configured={configured}",
    )
    if not configured or len(providers) == 0:
        raise AssertionError("AI providers missing from ai-info")


def test_ai_chat_widget(page) -> None:
    goto(page, "/zh/")
    page.wait_for_function("typeof window.__aiChatToggle === 'function'", timeout=10000)
    assert_visible(page, "#ai-chat-toggle-fab", "AI FAB button present")

    page.locator("#ai-chat-toggle-fab").click()
    assert_visible(page, "#ai-chat-panel", "Chat panel opens")
    assert_visible(page, "textarea", "Chat textarea present")
    assert_count(page, "#ai-chat-panel button", 3, "Chat panel controls rendered")


def test_ai_chat_interaction(page) -> None:
    goto(page, "/zh/")
    page.wait_for_function("typeof window.__aiChatToggle === 'function'", timeout=10000)
    page.locator("#ai-chat-toggle-fab").click()
    chat_input = page.locator("textarea").first
    chat_input.wait_for(state="visible", timeout=10000)
    chat_input.fill("推荐几篇文章")
    record("Chat input filled", "PASS")
    with page.expect_response(
        lambda response: "/api/chat" in response.url
        and response.request.method == "POST",
        timeout=30000,
    ) as response_info:
        chat_input.press("Enter")
    response = response_info.value
    record("Message sent", "PASS", f"status={response.status}")
    if response.status >= 400:
        raise AssertionError(f"Chat API returned status {response.status}")
    response_body = response.text()
    has_stream_output = (
        "text-delta" in response_body
        or '"type":"text"' in response_body
        or "finish" in response_body
    )
    record(
        "AI response stream returned",
        "PASS" if has_stream_output else "FAIL",
        "stream markers detected" if has_stream_output else "missing stream markers",
    )
    if not has_stream_output:
        raise AssertionError(
            "Chat response body did not include expected stream markers"
        )

    user_bubble = page.locator("#ai-chat-panel").get_by_text("推荐几篇文章")
    try:
        user_bubble.first.wait_for(timeout=5000)
        record("User message rendered in chat", "PASS")
    except PlaywrightTimeoutError:
        record(
            "User message rendered in chat",
            "FAIL",
            f"screenshot={save_artifact(page, 'ai-chat-interaction')}",
        )
        raise


def test_404_page(page) -> None:
    goto(page, "/nonexistent-page-xyz/")
    assert_visible(page, "#not-found", "404 container rendered")
    assert_visible(page, "#go-home-link", "404 go-home link rendered")

    content = page.locator("#not-found").inner_text().strip()
    record("404 text present", "PASS" if "404" in content else "FAIL", content[:80])
    if "404" not in content:
        raise AssertionError("404 text missing")


def test_rss_feed(page) -> None:
    page.goto(f"{BASE_URL}/rss.xml", wait_until="domcontentloaded")
    content = page.content()
    has_rss = "<rss" in content or "<channel>" in content
    record("RSS XML valid", "PASS" if has_rss else "FAIL")
    if not has_rss:
        raise AssertionError("RSS markup missing")


def test_pagination(page) -> None:
    goto(page, "/zh/posts/")
    assert_count(page, "a[href^='/zh/posts/']", 4, "Posts index contains post links")
    pagination = page.locator(
        "nav[aria-label*='pagination'], [class*='pagination'], a[href*='/zh/posts/2']"
    )
    count = pagination.count()
    record(
        "Pagination controls detected",
        "PASS" if count > 0 else "WARN",
        f"{count} matches",
    )


def test_back_to_top(page) -> None:
    goto(page, f"/zh/posts/{ARTICLE_SLUG}/")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_function("window.scrollY > 300", timeout=8000)
    back_btn = page.locator("#back-to-top-btn")
    back_btn.wait_for(state="visible", timeout=8000)
    record("Back to top button visible after scroll", "PASS")

    back_btn.click()
    page.wait_for_function("window.scrollY < 50", timeout=8000)
    record("Back to top button works", "PASS")


def main() -> int:
    print("=" * 60)
    print("astro-minimax v0.7.2 E2E Browser Tests")
    print("=" * 60)
    print(f"BASE_URL={BASE_URL}")
    print(f"AI_API_URL={AI_API_URL}")
    print(f"ARTICLE_SLUG={ARTICLE_SLUG}")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.set_default_timeout(10000)

        try:
            run_test(page, "Homepage", test_homepage)
            run_test(page, "Article Detail", test_article_detail)
            run_test(page, "Dark Mode", test_dark_mode)
            run_test(page, "Taxonomy Pages", test_taxonomy_pages)
            run_test(page, "Search Page", test_search_page)
            run_test(page, "AI Info API", test_ai_info_api)
            run_test(page, "AI Chat Widget", test_ai_chat_widget)
            run_test(page, "AI Chat Interaction", test_ai_chat_interaction)
            run_test(page, "404 Page", test_404_page)
            run_test(page, "RSS Feed", test_rss_feed)
            run_test(page, "Pagination", test_pagination)
            run_test(page, "Back to Top", test_back_to_top)
        finally:
            context.close()
            browser.close()

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    warned = sum(1 for r in RESULTS if r["status"] == "WARN")
    skipped = sum(1 for r in RESULTS if r["status"] == "SKIP")
    total = len(RESULTS)
    print(
        f"  Total: {total} | ✅ Pass: {passed} | ❌ Fail: {failed} | ⚠️ Warn: {warned} | ⏭️ Skip: {skipped}"
    )

    RESULTS_PATH.write_text(
        json.dumps(RESULTS, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("\n📄 Results saved to tests/e2e-results.json")

    return 1 if HARD_FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
