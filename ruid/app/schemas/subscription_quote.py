from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.plans import CurrencyValue, DiscountSourceValue, PaymentGatewayTypeValue, PlanTypeValue

PurchaseChannelValue = Literal["WEB", "TELEGRAM", "MINI_APP"]
SubscriptionQuoteActionValue = Literal["NEW", "ADDITIONAL", "RENEW", "UPGRADE", "TRIAL"]


class SubscriptionQuoteWarningSchema(BaseModel):
    code: str
    message: str


class SubscriptionQuoteDurationSchema(BaseModel):
    id: str
    days: int


class SubscriptionQuotePlanSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    tag: str | None
    type: PlanTypeValue
    traffic_limit: int | None = Field(alias="trafficLimit")
    device_limit: int = Field(alias="deviceLimit")
    traffic_limit_strategy: str = Field(alias="trafficLimitStrategy")
    durations: list[SubscriptionQuoteDurationSchema]


class SubscriptionQuotePriceSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    gateway_type: PaymentGatewayTypeValue = Field(alias="gatewayType")
    currency: CurrencyValue
    original_price: str = Field(alias="originalPrice")
    price: str
    discount_percent: int = Field(alias="discountPercent")
    discount_source: DiscountSourceValue = Field(alias="discountSource")


class SubscriptionQuoteActionFlagsSchema(BaseModel):
    NEW: bool
    ADDITIONAL: bool
    RENEW: bool
    UPGRADE: bool
    TRIAL: bool


class SubscriptionActionPolicySchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    channel: PurchaseChannelValue
    actions: SubscriptionQuoteActionFlagsSchema
    active_subscription_count: int = Field(alias="activeSubscriptionCount")
    max_subscriptions: int = Field(alias="maxSubscriptions")
    current_subscription_id: str | None = Field(alias="currentSubscriptionId")
    available_plans: list[SubscriptionQuotePlanSchema] = Field(alias="availablePlans")
    warnings: list[SubscriptionQuoteWarningSchema]


class SubscriptionQuoteSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    purchase_type: SubscriptionQuoteActionValue = Field(alias="purchaseType")
    channel: PurchaseChannelValue
    is_eligible: bool = Field(alias="isEligible")
    selected_subscription_id: str | None = Field(alias="selectedSubscriptionId")
    selected_plan: SubscriptionQuotePlanSchema | None = Field(alias="selectedPlan")
    selected_duration: SubscriptionQuoteDurationSchema | None = Field(alias="selectedDuration")
    available_plans: list[SubscriptionQuotePlanSchema] = Field(alias="availablePlans")
    price: SubscriptionQuotePriceSchema | None
    warnings: list[SubscriptionQuoteWarningSchema]


class SubscriptionActionPolicyInputSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    subscription_id: UUID | None = Field(alias="subscriptionId", default=None)
    channel: PurchaseChannelValue | None = None


class SubscriptionQuoteInputSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    purchase_type: SubscriptionQuoteActionValue = Field(alias="purchaseType")
    subscription_id: UUID | None = Field(alias="subscriptionId", default=None)
    plan_id: UUID | None = Field(alias="planId", default=None)
    duration_days: int | None = Field(alias="durationDays", default=None, ge=-1)
    channel: PurchaseChannelValue | None = None
    gateway_type: PaymentGatewayTypeValue | None = Field(alias="gatewayType", default=None)
