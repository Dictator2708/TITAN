import httpx
from typing import List, Optional
from app.core.config import settings
from app.schemas.integrations import NewsArticleOut, NewsResponseOut


async def get_live_news(
    category: str = "technology", query: Optional[str] = None, page_size: int = 10
) -> NewsResponseOut:
    page_size = max(1, min(page_size, 25))

    # 1. If NewsAPI key is provided, query NewsAPI
    if settings.NEWS_API_KEY and settings.NEWS_API_KEY.strip():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                if query and query.strip():
                    url = "https://newsapi.org/v2/everything"
                    params = {
                        "apiKey": settings.NEWS_API_KEY,
                        "q": query.strip(),
                        "pageSize": page_size,
                        "sortBy": "publishedAt",
                        "language": "en",
                    }
                else:
                    url = "https://newsapi.org/v2/top-headlines"
                    params = {
                        "apiKey": settings.NEWS_API_KEY,
                        "category": category if category in ["technology", "business", "science", "general"] else "technology",
                        "pageSize": page_size,
                        "language": "en",
                    }
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    articles_raw = data.get("articles", [])
                    articles_out = []
                    for a in articles_raw:
                        articles_out.append(
                            NewsArticleOut(
                                title=a.get("title") or "Untitled",
                                description=a.get("description"),
                                url=a.get("url") or "#",
                                source_name=a.get("source", {}).get("name") or "NewsAPI",
                                image_url=a.get("urlToImage"),
                                published_at=a.get("publishedAt"),
                                category=category,
                            )
                        )
                    return NewsResponseOut(
                        category=category,
                        query=query,
                        total_results=data.get("totalResults", len(articles_out)),
                        articles=articles_out,
                        provider="NewsAPI",
                    )
        except Exception:
            pass  # Fall back to public live developer news feeds

    # 2. Live Public Developer & AI News Feeds (DEV.to + Hacker News API)
    # 100% Real Live Tech & AI Data, Zero Fake Mock Data
    tag = "ai" if category.lower() in ["ai", "artificial-intelligence"] else "technology"
    if query and "ai" in query.lower():
        tag = "ai"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            dev_url = "https://dev.to/api/articles"
            params = {"tag": tag, "per_page": page_size, "top": 7}
            resp = await client.get(dev_url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                articles_out = []
                for item in data:
                    articles_out.append(
                        NewsArticleOut(
                            title=item.get("title") or "Untitled",
                            description=item.get("description"),
                            url=item.get("url") or "#",
                            source_name=f"DEV.to ({item.get('user', {}).get('name', 'Community')})",
                            image_url=item.get("cover_image") or item.get("social_image"),
                            published_at=item.get("published_at"),
                            category=tag,
                        )
                    )
                return NewsResponseOut(
                    category=category,
                    query=query,
                    total_results=len(articles_out),
                    articles=articles_out,
                    provider="DEV.to Live Tech Feeds",
                )
    except Exception:
        pass

    # 3. Fallback to Hacker News Live Stories API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            top_ids_resp = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json")
            if top_ids_resp.status_code != 200:
                return NewsResponseOut(
                    category=category,
                    query=query,
                    total_results=0,
                    articles=[],
                    provider="Live News Unavailable",
                )
            if top_ids_resp.status_code == 200:
                top_ids = top_ids_resp.json()[:page_size]
                articles_out = []
                for story_id in top_ids:
                    item_resp = await client.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
                    if item_resp.status_code == 200:
                        s = item_resp.json()
                        if s and s.get("title"):
                            articles_out.append(
                                NewsArticleOut(
                                    title=s.get("title"),
                                    description=f"Hacker News story with {s.get('score', 0)} points by {s.get('by', 'user')}.",
                                    url=s.get("url") or f"https://news.ycombinator.com/item?id={story_id}",
                                    source_name="Hacker News",
                                    image_url=None,
                                    published_at=None,
                                    category=category,
                                )
                            )
                return NewsResponseOut(
                    category=category,
                    query=query,
                    total_results=len(articles_out),
                    articles=articles_out,
                    provider="Hacker News Live API",
                )
    except Exception as e:
        return NewsResponseOut(
            category=category,
            query=query,
            total_results=0,
            articles=[],
            provider="Live News Unavailable",
        )
