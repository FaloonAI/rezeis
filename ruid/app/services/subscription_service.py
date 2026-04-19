from __future__ import annotations

from pydantic import ValidationError

from app.schemas.subscription_quote import (
    SubscriptionActionPolicyInputSchema,
    SubscriptionActionPolicySchema,
    SubscriptionQuoteInputSchema,
    SubscriptionQuoteSchema,
)
from app.schemas.subscription import SubscriptionSchema
from app.schemas.user_lookup import UserLookupSchema
from app.services.internal_admin_client import InternalAdminClient, InternalAdminContractError


class SubscriptionService:
    def __init__(self, client: InternalAdminClient) -> None:
        self._client = client

    async def get_subscription(self, lookup: UserLookupSchema) -> SubscriptionSchema | None:
        payload = await self._client.get_json(
            "/api/internal/user/subscription",
            params=lookup.to_query_params(),
        )
        if payload is None:
            return None
        try:
            return SubscriptionSchema.model_validate(payload)
        except ValidationError as err:
            raise InternalAdminContractError from err

    async def get_subscription_by_user_id(self, user_id: str) -> SubscriptionSchema | None:
        lookup = UserLookupSchema.model_validate({"userId": user_id})
        return await self.get_subscription(lookup)

    async def get_action_policy_by_user_id(
        self,
        user_id: str,
        input: SubscriptionActionPolicyInputSchema,
    ) -> SubscriptionActionPolicySchema:
        lookup = UserLookupSchema.model_validate({"userId": user_id})
        payload = await self._client.post_json(
            "/api/internal/subscriptions/action-policy",
            body={
                "userId": str(lookup.user_id),
                "subscriptionId": None if input.subscription_id is None else str(input.subscription_id),
                "channel": input.channel,
            },
        )
        try:
            return SubscriptionActionPolicySchema.model_validate(payload)
        except ValidationError as err:
            raise InternalAdminContractError from err

    async def get_quote_by_user_id(
        self,
        user_id: str,
        input: SubscriptionQuoteInputSchema,
    ) -> SubscriptionQuoteSchema:
        lookup = UserLookupSchema.model_validate({"userId": user_id})
        payload = await self._client.post_json(
            "/api/internal/subscriptions/quote",
            body={
                "userId": str(lookup.user_id),
                "purchaseType": input.purchase_type,
                "subscriptionId": None if input.subscription_id is None else str(input.subscription_id),
                "planId": None if input.plan_id is None else str(input.plan_id),
                "durationDays": input.duration_days,
                "channel": input.channel,
                "gatewayType": input.gateway_type,
            },
        )
        try:
            return SubscriptionQuoteSchema.model_validate(payload)
        except ValidationError as err:
            raise InternalAdminContractError from err
