from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.dependencies import get_runtime_settings, get_payments_service, get_session_store
from app.core.config import get_settings
from app.main import app
from app.schemas.payment_checkout import PaymentCheckoutSchema, PaymentStatusSchema
from app.services.internal_admin_client import InternalAdminContractError, InternalAdminNotFoundError
from tests.support import InMemorySessionStore, build_auth_session, build_expected_session, reset_settings_cache


def test_checkout_payment_endpoint_returns_typed_payload_from_session_cookie() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubPaymentsService:
        async def checkout_by_user_id(self, user_id: str, input) -> PaymentCheckoutSchema:
            assert user_id == expected_session.id
            assert input.purchase_type == "NEW"
            return PaymentCheckoutSchema.model_validate(
                {
                    "paymentId": "payment-1",
                    "transactionStatus": "PENDING",
                    "gatewayType": "YOOKASSA",
                    "purchaseType": "NEW",
                    "amount": "9.99",
                    "currency": "USD",
                    "checkoutUrl": "https://checkout.example.com",
                    "providerMode": "REDIRECT",
                    "createdAt": "2026-04-19T12:00:00Z",
                }
            )

    app.dependency_overrides[get_payments_service] = lambda: StubPaymentsService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
      client.cookies.set("ruid_session", "stored-session-id")
      response = client.post(
          "/api/v1/payments/checkout",
          json={
              "purchaseType": "NEW",
              "planId": "11111111-1111-1111-1111-111111111111",
              "durationDays": 30,
              "gatewayType": "YOOKASSA",
              "channel": "WEB",
          },
      )

    assert response.status_code == 200
    assert response.json()["paymentId"] == "payment-1"


def test_payment_status_endpoint_returns_typed_payload_from_session_cookie() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubPaymentsService:
        async def get_payment_status_by_user_id(self, *, user_id: str, payment_id: str) -> PaymentStatusSchema:
            assert user_id == expected_session.id
            assert payment_id == "payment-1"
            return PaymentStatusSchema.model_validate(
                {
                    "paymentId": "payment-1",
                    "status": "COMPLETED",
                    "gatewayType": "YOOKASSA",
                    "purchaseType": "NEW",
                    "amount": "9.99",
                    "currency": "USD",
                    "checkoutUrl": "https://checkout.example.com",
                    "failureReason": None,
                    "subscriptionId": "subscription-1",
                    "updatedAt": "2026-04-19T12:00:00Z",
                }
            )

    app.dependency_overrides[get_payments_service] = lambda: StubPaymentsService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
      client.cookies.set("ruid_session", "stored-session-id")
      response = client.get("/api/v1/payments/payment-1")

    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"


def test_checkout_payment_endpoint_invalidates_stale_upstream_user(monkeypatch) -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubPaymentsService:
        async def checkout_by_user_id(self, user_id: str, input) -> PaymentCheckoutSchema:
            raise InternalAdminNotFoundError()

    monkeypatch.setenv("RUID_SESSION_COOKIE_SECURE", "true")
    reset_settings_cache()
    app.dependency_overrides[get_runtime_settings] = get_settings
    app.dependency_overrides[get_payments_service] = lambda: StubPaymentsService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
      client.cookies.set("ruid_session", "stored-session-id")
      response = client.post(
          "/api/v1/payments/checkout",
          json={
              "purchaseType": "NEW",
              "planId": "11111111-1111-1111-1111-111111111111",
              "durationDays": 30,
              "gatewayType": "YOOKASSA",
          },
      )

    assert response.status_code == 401
    assert response.json() == {"detail": "Session is no longer valid."}
    assert session_store.deleted_session_ids == ["stored-session-id"]


def test_payment_status_endpoint_maps_contract_drift_to_bad_gateway() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubPaymentsService:
        async def get_payment_status_by_user_id(self, *, user_id: str, payment_id: str) -> PaymentStatusSchema:
            raise InternalAdminContractError()

    app.dependency_overrides[get_payments_service] = lambda: StubPaymentsService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
      client.cookies.set("ruid_session", "stored-session-id")
      response = client.get("/api/v1/payments/payment-1")

    assert response.status_code == 502
    assert response.json() == {"detail": "Internal admin returned an invalid contract payload"}
