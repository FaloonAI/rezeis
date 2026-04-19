from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.dependencies import get_optional_auth_session, get_plans_service
from app.schemas.auth_session import AuthSessionSchema
from app.main import app
from app.schemas.plans import PlanSchema
from app.services.internal_admin_client import InternalAdminContractError


def test_get_plans_endpoint_returns_typed_payload() -> None:
    expected_plan = PlanSchema.model_validate(
        {
            "id": "plan-1",
            "orderIndex": 1,
            "name": "Starter",
            "description": "Starter plan",
            "tag": "popular",
            "type": "BOTH",
            "trafficLimit": 100,
            "deviceLimit": 3,
            "durations": [
                {
                    "id": "duration-1",
                    "days": 30,
                    "prices": [
                        {
                            "gatewayType": "YOOKASSA",
                            "currency": "USD",
                            "originalPrice": "9.99",
                            "price": "9.99",
                            "discountPercent": 0,
                            "discountSource": "NONE",
                            "supportedPaymentAssets": None,
                        }
                    ],
                }
            ],
        },
    )

    class StubPlansService:
        async def get_plans(self, *, user_id: str | None) -> list[PlanSchema]:
            assert user_id is None
            return [expected_plan]

    app.dependency_overrides[get_plans_service] = lambda: StubPlansService()
    app.dependency_overrides[get_optional_auth_session] = lambda: None

    with TestClient(app) as client:
        response = client.get("/api/v1/plans")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "plan-1",
            "orderIndex": 1,
            "name": "Starter",
            "description": "Starter plan",
            "tag": "popular",
            "type": "BOTH",
            "trafficLimit": 100,
            "deviceLimit": 3,
            "durations": [
                {
                    "id": "duration-1",
                    "days": 30,
                    "prices": [
                        {
                            "gatewayType": "YOOKASSA",
                            "currency": "USD",
                            "originalPrice": "9.99",
                            "price": "9.99",
                            "discountPercent": 0,
                            "discountSource": "NONE",
                            "supportedPaymentAssets": None,
                        }
                    ],
                }
            ],
        }
    ]


def test_get_plans_endpoint_maps_contract_drift_to_bad_gateway() -> None:
    class StubPlansService:
        async def get_plans(self, *, user_id: str | None) -> list[PlanSchema]:
            raise InternalAdminContractError()

    app.dependency_overrides[get_plans_service] = lambda: StubPlansService()
    app.dependency_overrides[get_optional_auth_session] = lambda: None

    with TestClient(app) as client:
        response = client.get("/api/v1/plans")

    assert response.status_code == 502
    assert response.json() == {"detail": "Internal admin returned an invalid contract payload"}


def test_get_plans_endpoint_forwards_cookie_session_identity_when_present() -> None:
    expected_plan = PlanSchema.model_validate(
        {
            "id": "plan-1",
            "orderIndex": 1,
            "name": "Starter",
            "description": "Starter plan",
            "tag": "popular",
            "type": "BOTH",
            "trafficLimit": 100,
            "deviceLimit": 3,
            "durations": [
                {
                    "id": "duration-1",
                    "days": 30,
                    "prices": [
                        {
                            "gatewayType": "YOOKASSA",
                            "currency": "USD",
                            "originalPrice": "12.99",
                            "price": "9.99",
                            "discountPercent": 23,
                            "discountSource": "PURCHASE",
                            "supportedPaymentAssets": None,
                        }
                    ],
                }
            ],
        },
    )

    class StubPlansService:
        async def get_plans(self, *, user_id: str | None) -> list[PlanSchema]:
            assert user_id == "user-1"
            return [expected_plan]

    app.dependency_overrides[get_plans_service] = lambda: StubPlansService()
    app.dependency_overrides[get_optional_auth_session] = lambda: AuthSessionSchema.model_validate(
        {
            "userId": "user-1",
            "telegramId": None,
            "createdAt": "2026-04-19T09:00:00.000Z",
        }
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/plans")

    assert response.status_code == 200
    assert response.json()[0]["durations"][0]["prices"][0]["discountSource"] == "PURCHASE"
