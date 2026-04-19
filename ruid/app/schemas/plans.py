from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CurrencyValue = Literal["USD", "RUB", "USDT", "XTR", "TON", "BTC", "ETH"]
PlanTypeValue = Literal["TRAFFIC", "DEVICES", "BOTH", "UNLIMITED"]
PaymentGatewayTypeValue = Literal[
    "YOOKASSA",
    "TELEGRAM_STARS",
    "PLATEGA",
    "HELEKET",
    "CRYPTOMUS",
    "MULENPAY",
]
DiscountSourceValue = Literal["NONE", "PURCHASE", "PERSONAL"]


class PlanPriceSchema(BaseModel):
    gateway_type: PaymentGatewayTypeValue = Field(alias="gatewayType")
    currency: CurrencyValue
    original_price: str = Field(alias="originalPrice")
    price: str
    discount_percent: int = Field(alias="discountPercent")
    discount_source: DiscountSourceValue = Field(alias="discountSource")
    supported_payment_assets: list[str] | None = Field(alias="supportedPaymentAssets")


class PlanDurationSchema(BaseModel):
    id: str
    days: int
    prices: list[PlanPriceSchema]


class PlanSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    order_index: int = Field(alias="orderIndex")
    name: str
    description: str | None
    tag: str | None
    type: PlanTypeValue
    traffic_limit: int | None = Field(alias="trafficLimit")
    device_limit: int = Field(alias="deviceLimit")
    durations: list[PlanDurationSchema]
