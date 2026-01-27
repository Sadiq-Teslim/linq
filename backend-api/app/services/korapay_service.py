"""
Korapay Payment Integration Service
Real API integration for subscription payments
https://docs.korapay.com/
"""

import httpx
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class KorapayService:
    """
    Korapay API integration for subscription payments
    https://docs.korapay.com/
    """

    BASE_URL = "https://api.korapay.com/merchant/api/v1"

    def __init__(self):
        self.secret_key = settings.KORAPAY_SECRET_KEY
        self.public_key = settings.KORAPAY_PUBLIC_KEY
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a request to Korapay API"""
        async with httpx.AsyncClient() as client:
            url = f"{self.BASE_URL}{endpoint}"

            response = await client.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data,
                timeout=30.0,
            )

            result = response.json()

            # Log for debugging
            logger.info(f"Korapay API Call: {method} {endpoint}")
            logger.debug(f"Request data: {data}")
            logger.debug(f"Response status: {response.status_code}")
            logger.debug(f"Response body: {result}")

            if not result.get("status"):
                logger.error(f"Korapay error: {result}")
                raise KorapayError(
                    message=result.get("message", "Korapay request failed"),
                    response=result,
                )

            return result

    # ===== Charge/Transaction =====

    async def initialize_charge(
        self,
        reference: str,
        amount: int,  # Amount in cents (smallest currency unit)
        currency: str = "USD",
        customer_name: str = "",
        customer_email: str = "",
        notification_url: Optional[str] = None,
        redirect_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        channels: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Initialize a charge - returns checkout URL for redirect method
        https://docs.korapay.com/accepting-payments/charge

        For Checkout Standard (inline), use the public key directly on frontend
        """
        data = {
            "reference": reference,
            "amount": amount,  # Amount in cents
            "currency": currency,
            "customer": {
                "name": customer_name,
                "email": customer_email,
            },
            "notification_url": notification_url,
            "redirect_url": redirect_url,
            "metadata": metadata or {},
        }

        if channels:
            data["channels"] = channels

        data = {k: v for k, v in data.items() if v is not None}

        result = await self._request("POST", "/charges/initialize", data)
        return result.get("data", {})

    async def verify_charge(self, reference: str) -> Dict[str, Any]:
        """
        Verify a charge by reference
        https://docs.korapay.com/accepting-payments/verify-charge
        """
        result = await self._request("GET", f"/charges/{reference}")
        return result.get("data", {})

    async def get_charge(self, reference: str) -> Optional[Dict[str, Any]]:
        """
        Get charge details by reference
        """
        try:
            result = await self._request("GET", f"/charges/{reference}")
            return result.get("data")
        except KorapayError:
            return None

    # ===== Webhook Verification =====

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Verify Korapay webhook signature
        Korapay uses HMAC SHA256 for webhook signatures
        """
        expected_signature = hmac.new(
            self.secret_key.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    def get_public_key(self) -> str:
        """Return the public key for frontend use"""
        return self.public_key


class KorapayError(Exception):
    """Korapay API error"""

    def __init__(self, message: str, response: Optional[Dict[str, Any]] = None):
        self.message = message
        self.response = response
        super().__init__(self.message)


# Singleton instance
korapay_service = KorapayService()
