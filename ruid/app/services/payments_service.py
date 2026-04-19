from __future__ import annotations

from pydantic import ValidationError

from app.schemas.payment_checkout import (
    PaymentCheckoutInputSchema,
    PaymentCheckoutSchema,
    PaymentStatusSchema,
)
from app.services.internal_admin_client import InternalAdminClient, InternalAdminContractError


class PaymentsService:
    def __init__(self, client: InternalAdminClient) -> None:
        self._client = client

    async def checkout_by_user_id(
        self,
        user_id: str,
        input: PaymentCheckoutInputSchema,
    ) -> PaymentCheckoutSchema:
        payload = await self._client.post_json(
            "/api/internal/payments/checkout",
            body={
                "userId": user_id,
                "purchaseType": input.purchase_type,
                "planId": input.plan_id,
                "durationDays": input.duration_days,
                "gatewayType": input.gateway_type,
                "subscriptionId": input.subscription_id,
                "channel": input.channel,
            },
        )
        try:
            return PaymentCheckoutSchema.model_validate(payload)
        except ValidationError as err:
            raise InternalAdminContractError from err

    async def get_payment_status_by_user_id(
        self,
        *,
        user_id: str,
        payment_id: str,
    ) -> PaymentStatusSchema:
        payload = await self._client.get_json(
            f"/api/internal/payments/{payment_id}",
            params={"userId": user_id},
        )
        try:
            return PaymentStatusSchema.model_validate(payload)
        except ValidationError as err:
            raise InternalAdminContractError from err
