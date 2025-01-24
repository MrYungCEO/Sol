import os
import time
import httpx
import logging
from typing import Dict, Optional
from typing_extensions import TypedDict
from datetime import datetime

class PriceResponse(TypedDict):
    price: float
    raw_price: float
    market_cap: Optional[float]
    volume_24h: Optional[float]

class PriceService:
    API_BASE_URL = "https://data.solanatracker.io"
    API_KEY = "8d88754c-64e7-4482-b293-28b4f3579f5c"
    CACHE_DURATION = 30 * 1000  # 30 seconds
    MIN_REQUEST_INTERVAL = 10 * 1000  # 10 seconds
    MAX_RETRIES = 3

    def __init__(self):
        self.cache: Dict[str, tuple[PriceResponse, int]] = {}  # token -> (price_data, timestamp)
        self.last_request_time: Dict[str, int] = {}  # token -> timestamp
        self.logger = logging.getLogger(__name__)

    async def get_token_price(self, token_address: str) -> PriceResponse:
        """
        Get token price with smart caching and rate limiting
        """
        current_time = int(time.time() * 1000)

        # Check cache first
        if token_address in self.cache:
            price_data, cache_time = self.cache[token_address]
            if current_time - cache_time < self.CACHE_DURATION:
                self.logger.debug(f"Cache hit for {token_address}")
                return price_data

        # Rate limiting
        if token_address in self.last_request_time:
            time_since_last = current_time - self.last_request_time[token_address]
            if time_since_last < self.MIN_REQUEST_INTERVAL:
                self.logger.debug(f"Rate limit hit for {token_address}, using cache")
                if token_address in self.cache:
                    return self.cache[token_address][0]

        # Fetch new price data
        for attempt in range(self.MAX_RETRIES):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.API_BASE_URL}/price",
                        params={"token": token_address},
                        headers={
                            "accept": "application/json",
                            "x-api-key": self.API_KEY
                        }
                    )
                    response.raise_for_status()
                    data = response.json()

                    price_data = PriceResponse(
                        price=float(data["price"]),
                        raw_price=float(data["price"]),
                        market_cap=float(data["marketCap"]) if data.get("marketCap") else None,
                        volume_24h=float(data["liquidity"]) if data.get("liquidity") else None
                    )

                    # Update cache and last request time
                    self.cache[token_address] = (price_data, current_time)
                    self.last_request_time[token_address] = current_time

                    return price_data

            except Exception as e:
                self.logger.error(f"Error fetching price for {token_address} (attempt {attempt + 1}): {str(e)}")
                if attempt == self.MAX_RETRIES - 1:
                    # If we have cached data, return it as fallback
                    if token_address in self.cache:
                        self.logger.warning(f"Using cached data for {token_address} after failed attempts")
                        return self.cache[token_address][0]
                    raise  # Re-raise the last exception if no cache available

# Global instance
price_service = PriceService()
