from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.plans import CurrencyValue, PaymentGatewayTypeValue

PurchaseTypeValue = Literal["NEW", "ADDITIONAL", "RENEW", "UPGRADE"]
PurchaseChannelValue = Literal["WEB", "TELEGRAM", "MINI_APP"]
TransactionStatusValue = Literal["PENDING", "COMPLETED", "CANCELED", "REFUNDED", "FAILED"]


class PaymentCheckoutInputSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    purchase_type: PurchaseTypeValue = Field(alias="purchaseType")
    plan_id: str = Field(alias="planId")
    duration_days: int = Field(alias="durationDays", ge=-1)
    gateway_type: PaymentGatewayTypeValue = Field(alias="gatewayType")
    subscription_id: str | None = Field(alias="subscriptionId", default=None)
    channel: PurchaseChannelValue | None = None


class PaymentCheckoutSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    payment_id: str = Field(alias="paymentId")
    transaction_status: TransactionStatusValue = Field(alias="transactionStatus")
    gateway_type: PaymentGatewayTypeValue = Field(alias="gatewayType")
    purchase_type: PurchaseTypeValue = Field(alias="purchaseType")
    amount: str
    currency: CurrencyValue
    checkout_url: str | None = Field(alias="checkoutUrl")
    provider_mode: str = Field(alias="providerMode")
    created_at: str = Field(alias="createdAt")


class PaymentStatusSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    payment_id: str = Field(alias="paymentId")
    status: TransactionStatusValue
    gateway_type: PaymentGatewayTypeValue = Field(alias="gatewayType")
    purchase_type: PurchaseTypeValue = Field(alias="purchaseType")
    amount: str
    currency: CurrencyValue
    checkout_url: str | None = Field(alias="checkoutUrl")
    failure_reason: str | None = Field(alias="failureReason")
    subscription_id: str | None = Field(alias="subscriptionId")
    updated_at: str = Field(alias="updatedAt")
