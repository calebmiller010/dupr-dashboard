"""
DUPR API client. Handles auth and paginated match fetching.
Resolves the public DUPR ID (e.g. "0QQOEG") to the internal numeric player ID.
"""

import logging

import httpx

logger = logging.getLogger("dupr_client")

BASE_URL = "https://api.dupr.gg"


class DUPRClient:
    def __init__(self):
        self.token: str | None = None
        self.player_id: int | None = None
        self.client = httpx.Client(timeout=30.0)

    def login(self, email: str, password: str) -> bool:
        try:
            resp = self.client.post(
                f"{BASE_URL}/auth/v1.0/login",
                json={"email": email, "password": password},
            )
            resp.raise_for_status()
            data = resp.json()
            result = data.get("result", {})
            self.token = result.get("accessToken")
            self.player_id = result.get("user", {}).get("id")
            if self.token:
                logger.info(f"DUPR auth successful. Player ID: {self.player_id}")
                return True
            logger.error("No access token in auth response.")
            return False
        except Exception as e:
            logger.error(f"DUPR auth failed: {e}")
            return False

    def fetch_all_matches(self, player_id: int) -> list[dict]:
        return self._paginated_fetch(player_id, existing_ids=set())

    def fetch_new_matches(self, player_id: int, existing_ids: set[str]) -> list[dict]:
        return self._paginated_fetch(player_id, existing_ids)

    def _paginated_fetch(self, player_id: int, existing_ids: set[str]) -> list[dict]:
        if not self.token:
            logger.error("Not authenticated.")
            return []

        all_matches: list[dict] = []
        offset = 0
        limit = 10

        while True:
            try:
                resp = self.client.post(
                    f"{BASE_URL}/player/v1.0/{player_id}/history",
                    headers={"Authorization": f"Bearer {self.token}"},
                    json={
                        "filters": {},
                        "limit": limit,
                        "offset": offset,
                        "sort": {"order": "DESC", "parameter": "MATCH_DATE"},
                        "exclude": ["RALLIES"],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                result = data.get("result", {})
                hits = result.get("hits", [])

                if not hits:
                    break

                new_in_page = []
                hit_existing = False

                for match in hits:
                    mid = str(match.get("matchId"))
                    if mid in existing_ids:
                        hit_existing = True
                        break
                    new_in_page.append(match)

                all_matches.extend(new_in_page)
                logger.info(
                    f"Fetched page offset={offset}: "
                    f"{len(new_in_page)} new, {len(hits)} total in page"
                )

                if hit_existing:
                    logger.info("Hit existing matches. Stopping fetch.")
                    break

                if not result.get("hasMore", False):
                    break

                offset += limit

            except httpx.HTTPStatusError as e:
                logger.error(f"Fetch failed at offset {offset}: {e}")
                logger.error(f"Response body: {e.response.text[:500]}")
                break
            except Exception as e:
                logger.error(f"Fetch failed at offset {offset}: {e}")
                break

        logger.info(f"Total new matches fetched: {len(all_matches)}")
        return all_matches
