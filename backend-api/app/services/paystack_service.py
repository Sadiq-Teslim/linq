"""
Paystack Payment Integration Service
Real API integration for subscription payments
"""
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.core.config import settings


class PaystackService:
    """
    Paystack API integration for subscription payments
    https://paystack.com/docs/api/
    """

    BASE_URL = "https://api.paystack.co"

    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
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
        """Make a request to Paystack API"""
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

            if not result.get("status"):
                raise PaystackError(
                    message=result.get("message", "Paystack request failed"),
                    response=result,
                )

            return result

    # ===== Customer Management =====

    async def create_customer(
        self,
        email: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new customer
        https://paystack.com/docs/api/customer/#create
        """
        data = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "metadata": metadata or {},
        }
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}

        result = await self._request("POST", "/customer", data)
        return result.get("data", {})

    async def get_customer(self, email_or_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a customer by email or customer code
        https://paystack.com/docs/api/customer/#fetch
        """
        try:
            result = await self._request("GET", f"/customer/{email_or_code}")
            return result.get("data")
        except PaystackError:
            return None

    # ===== Plan Management =====

    async def create_plan(
        self,
        name: str,
        amount: int,  # Amount in kobo/cents
        interval: str = "monthly",  # hourly, daily, weekly, monthly, biannually, annually
        description: Optional[str] = None,
        currency: str = "USD",
    ) -> Dict[str, Any]:
        """
        Create a subscription plan
        https://paystack.com/docs/api/plan/#create
        """
        data = {
            "name": name,
            "amount": amount,
            "interval": interval,
            "description": description,
            "currency": currency,
        }
        data = {k: v for k, v in data.items() if v is not None}

        result = await self._request("POST", "/plan", data)
        return result.get("data", {})

    async def get_plan(self, plan_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a plan by code
        https://paystack.com/docs/api/plan/#fetch
        """
        try:
            result = await self._request("GET", f"/plan/{plan_code}")
            return result.get("data")
        except PaystackError:
            return None

    async def list_plans(self) -> List[Dict[str, Any]]:
        """
        List all plans
        https://paystack.com/docs/api/plan/#list
        """
        result = await self._request("GET", "/plan")
        return result.get("data", [])

    # ===== Subscription Management =====

    async def create_subscription(
        self,
        customer: str,  # Customer email or code
        plan: str,  # Plan code
        start_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer
        https://paystack.com/docs/api/subscription/#create
        """
        data = {
            "customer": customer,
            "plan": plan,
        }
        if start_date:
            data["start_date"] = start_date.isoformat()

        result = await self._request("POST", "/subscription", data)
        return result.get("data", {})

    async def get_subscription(self, subscription_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a subscription
        https://paystack.com/docs/api/subscription/#fetch
        """
        try:
            result = await self._request("GET", f"/subscription/{subscription_code}")
            return result.get("data")
        except PaystackError:
            return None

    async def enable_subscription(self, subscription_code: str, token: str) -> Dict[str, Any]:
        """
        Enable a subscription
        https://paystack.com/docs/api/subscription/#enable
        """
        data = {
            "code": subscription_code,
            "token": token,
        }
        result = await self._request("POST", "/subscription/enable", data)
        return result.get("data", {})

    async def disable_subscription(self, subscription_code: str, token: str) -> Dict[str, Any]:
        """
        Disable/cancel a subscription
        https://paystack.com/docs/api/subscription/#disable
        """
        data = {
            "code": subscription_code,
            "token": token,
        }
        result = await self._request("POST", "/subscription/disable", data)
        return result.get("data", {})

    async def generate_subscription_link(self, subscription_code: str) -> str:
        """
        Generate a link for managing subscription
        https://paystack.com/docs/api/subscription/#manage-link
        """
        result = await self._request("GET", f"/subscription/{subscription_code}/manage/link")
        return result.get("data", {}).get("link", "")

    # ===== Transaction/Payment =====

    async def initialize_transaction(
        self,
        email: str,
        amount: int,  # Amount in kobo/cents
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        plan: Optional[str] = None,  # For subscription payments
        currency: str = "USD",
    ) -> Dict[str, Any]:
        """
        Initialize a transaction (get payment URL)
        https://paystack.com/docs/api/transaction/#initialize
        """
        data = {
            "email": email,
            "amount": amount,
            "currency": currency,
            "callback_url": callback_url,
            "metadata": metadata or {},
        }
        if plan:
            data["plan"] = plan

        data = {k: v for k, v in data.items() if v is not None}

        result = await self._request("POST", "/transaction/initialize", data)
        return result.get("data", {})

    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """
        Verify a transaction by reference
        https://paystack.com/docs/api/transaction/#verify
        """
        result = await self._request("GET", f"/transaction/verify/{reference}")
        return result.get("data", {})

    # ===== Webhook Verification =====

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Verify Paystack webhook signature
        https://paystack.com/docs/payments/webhooks/#verify-event-origin
        """
        import hmac
        import hashlib

        expected_signature = hmac.new(
            self.secret_key.encode("utf-8"),
            payload,
            hashlib.sha512,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)


class PaystackError(Exception):
    """Paystack API error"""

    def __init__(self, message: str, response: Optional[Dict[str, Any]] = None):
        self.message = message
        self.response = response
        super().__init__(self.message)


# Singleton instance
paystack_service = PaystackService()
