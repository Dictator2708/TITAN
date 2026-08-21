import httpx
from typing import List, Optional
from app.core.exceptions import TitanException
from app.schemas.integrations import LocationResultOut


async def search_locations(query: str, limit: int = 5) -> List[LocationResultOut]:
    if not query or not query.strip():
        return []

    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": "TITAN-AI-Assistant/1.0 (contact: support@titan-ai.local)"},
            timeout=10.0,
        ) as client:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": query.strip(),
                "format": "json",
                "addressdetails": 1,
                "limit": max(1, min(limit, 10)),
            }
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise TitanException(
                    status_code=502, detail="Location search service temporarily unavailable"
                )

            data = resp.json()
            results = []
            for item in data:
                bbox = None
                if "boundingbox" in item:
                    bbox = [float(coord) for coord in item["boundingbox"]]

                results.append(
                    LocationResultOut(
                        display_name=item.get("display_name", ""),
                        latitude=float(item.get("lat", 0.0)),
                        longitude=float(item.get("lon", 0.0)),
                        place_type=item.get("type"),
                        bounding_box=bbox,
                        address_details=item.get("address"),
                    )
                )
            return results
    except TitanException:
        raise
    except Exception as e:
        raise TitanException(status_code=502, detail=f"Failed to search locations: {str(e)}")
