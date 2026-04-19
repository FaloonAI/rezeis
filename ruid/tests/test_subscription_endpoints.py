from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.dependencies import get_runtime_settings, get_session_store, get_subscription_service
from app.core.config import get_settings
from app.main import app
from app.schemas.subscription import SubscriptionSchema
from app.schemas.subscription_quote import (
    SubscriptionActionPolicyInputSchema,
    SubscriptionActionPolicySchema,
    SubscriptionQuoteInputSchema,
    SubscriptionQuoteSchema,
)
from app.services.internal_admin_client import (
    InternalAdminContractError,
    InternalAdminNotFoundError,
)
from tests.support import (
    InMemorySessionStore,
    build_auth_session,
    build_expected_session,
    build_expected_subscription,
    reset_settings_cache,
)


def test_subscription_endpoint_returns_typed_payload_from_session_cookie() -> None:
    expected_session = build_expected_session()
    expected_subscription = build_expected_subscription()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_subscription_by_user_id(self, user_id: str) -> SubscriptionSchema | None:
            assert user_id == expected_session.id
            return expected_subscription

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.get("/api/v1/subscription")

    assert response.status_code == 200
    assert response.json()["id"] == expected_subscription.id


def test_subscription_endpoint_returns_null_when_user_has_no_subscription() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_subscription_by_user_id(self, user_id: str) -> SubscriptionSchema | None:
            assert user_id == expected_session.id
            return None

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.get("/api/v1/subscription")

    assert response.status_code == 200
    assert response.json() is None


def test_subscription_endpoint_invalidates_stale_upstream_user(monkeypatch) -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_subscription_by_user_id(self, user_id: str) -> SubscriptionSchema | None:
            raise InternalAdminNotFoundError()

    monkeypatch.setenv("RUID_SESSION_COOKIE_SECURE", "true")
    reset_settings_cache()
    app.dependency_overrides[get_runtime_settings] = get_settings
    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.get("/api/v1/subscription")

    assert response.status_code == 401
    assert response.json() == {"detail": "Session is no longer valid."}
    assert session_store.deleted_session_ids == ["stored-session-id"]
    assert "ruid_session=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_subscription_action_policy_endpoint_returns_typed_payload_from_session_cookie() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)
    subscription_id = str(uuid4())

    class StubSubscriptionService:
        async def get_action_policy_by_user_id(
            self,
            user_id: str,
            input: SubscriptionActionPolicyInputSchema,
        ) -> SubscriptionActionPolicySchema:
            assert user_id == expected_session.id
            assert str(input.subscription_id) == subscription_id
            assert input.channel == "WEB"
            return build_expected_action_policy(user_id=user_id, subscription_id=subscription_id)

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post(
            "/api/v1/subscription/action-policy",
            json={"subscriptionId": subscription_id, "channel": "WEB"},
        )

    assert response.status_code == 200
    assert response.json()["userId"] == expected_session.id
    assert response.json()["currentSubscriptionId"] == subscription_id


def test_subscription_action_policy_endpoint_requires_authentication_cookie() -> None:
    with TestClient(app) as client:
        response = client.post("/api/v1/subscription/action-policy", json={})

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_subscription_action_policy_endpoint_rejects_client_user_id_payload() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_action_policy_by_user_id(
            self,
            user_id: str,
            input: SubscriptionActionPolicyInputSchema,
        ) -> SubscriptionActionPolicySchema:
            return build_expected_action_policy(user_id=user_id, subscription_id=None)

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post(
            "/api/v1/subscription/action-policy",
            json={"userId": str(uuid4())},
        )

    assert response.status_code == 422


def test_subscription_action_policy_endpoint_invalidates_stale_upstream_user(monkeypatch) -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_action_policy_by_user_id(
            self,
            user_id: str,
            input: SubscriptionActionPolicyInputSchema,
        ) -> SubscriptionActionPolicySchema:
            raise InternalAdminNotFoundError()

    monkeypatch.setenv("RUID_SESSION_COOKIE_SECURE", "true")
    reset_settings_cache()
    app.dependency_overrides[get_runtime_settings] = get_settings
    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post("/api/v1/subscription/action-policy", json={})

    assert response.status_code == 401
    assert response.json() == {"detail": "Session is no longer valid."}
    assert session_store.deleted_session_ids == ["stored-session-id"]
    assert "ruid_session=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_subscription_action_policy_endpoint_maps_contract_drift_to_bad_gateway() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_action_policy_by_user_id(
            self,
            user_id: str,
            input: SubscriptionActionPolicyInputSchema,
        ) -> SubscriptionActionPolicySchema:
            raise InternalAdminContractError()

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post("/api/v1/subscription/action-policy", json={})

    assert response.status_code == 502
    assert response.json() == {"detail": "Internal admin returned an invalid contract payload"}


def test_subscription_quote_endpoint_returns_typed_payload_from_session_cookie() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)
    subscription_id = str(uuid4())
    plan_id = str(uuid4())

    class StubSubscriptionService:
        async def get_quote_by_user_id(
            self,
            user_id: str,
            input: SubscriptionQuoteInputSchema,
        ) -> SubscriptionQuoteSchema:
            assert user_id == expected_session.id
            assert input.purchase_type == "NEW"
            assert str(input.subscription_id) == subscription_id
            assert str(input.plan_id) == plan_id
            assert input.duration_days == 30
            assert input.channel == "WEB"
            assert input.gateway_type == "YOOKASSA"
            return build_expected_quote(user_id=user_id, subscription_id=subscription_id, plan_id=plan_id)

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post(
            "/api/v1/subscription/quote",
            json={
                "purchaseType": "NEW",
                "subscriptionId": subscription_id,
                "planId": plan_id,
                "durationDays": 30,
                "channel": "WEB",
                "gatewayType": "YOOKASSA",
            },
        )

    assert response.status_code == 200
    assert response.json()["userId"] == expected_session.id
    assert response.json()["selectedPlan"]["id"] == plan_id


def test_subscription_quote_endpoint_requires_authentication_cookie() -> None:
    with TestClient(app) as client:
        response = client.post("/api/v1/subscription/quote", json={"purchaseType": "NEW"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_subscription_quote_endpoint_rejects_client_user_id_payload() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_quote_by_user_id(
            self,
            user_id: str,
            input: SubscriptionQuoteInputSchema,
        ) -> SubscriptionQuoteSchema:
            return build_expected_quote(user_id=user_id, subscription_id=None, plan_id=str(uuid4()))

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post(
            "/api/v1/subscription/quote",
            json={"purchaseType": "NEW", "userId": str(uuid4())},
        )

    assert response.status_code == 422


def test_subscription_quote_endpoint_invalidates_stale_upstream_user(monkeypatch) -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_quote_by_user_id(
            self,
            user_id: str,
            input: SubscriptionQuoteInputSchema,
        ) -> SubscriptionQuoteSchema:
            raise InternalAdminNotFoundError()

    monkeypatch.setenv("RUID_SESSION_COOKIE_SECURE", "true")
    reset_settings_cache()
    app.dependency_overrides[get_runtime_settings] = get_settings
    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post("/api/v1/subscription/quote", json={"purchaseType": "NEW"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Session is no longer valid."}
    assert session_store.deleted_session_ids == ["stored-session-id"]
    assert "ruid_session=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_subscription_quote_endpoint_maps_contract_drift_to_bad_gateway() -> None:
    expected_session = build_expected_session()
    session_store = InMemorySessionStore()
    session_store.sessions["stored-session-id"] = build_auth_session(user_id=expected_session.id)

    class StubSubscriptionService:
        async def get_quote_by_user_id(
            self,
            user_id: str,
            input: SubscriptionQuoteInputSchema,
        ) -> SubscriptionQuoteSchema:
            raise InternalAdminContractError()

    app.dependency_overrides[get_subscription_service] = lambda: StubSubscriptionService()
    app.dependency_overrides[get_session_store] = lambda: session_store

    with TestClient(app) as client:
        client.cookies.set("ruid_session", "stored-session-id")
        response = client.post("/api/v1/subscription/quote", json={"purchaseType": "NEW"})

    assert response.status_code == 502
    assert response.json() == {"detail": "Internal admin returned an invalid contract payload"}


def build_expected_action_policy(
    *,
    user_id: str,
    subscription_id: str | None,
) -> SubscriptionActionPolicySchema:
    return SubscriptionActionPolicySchema.model_validate(
        {
            "userId": user_id,
            "channel": "WEB",
            "actions": {
                "NEW": True,
                "ADDITIONAL": True,
                "RENEW": True,
                "UPGRADE": False,
                "TRIAL": False,
            },
            "activeSubscriptionCount": 1,
            "maxSubscriptions": 3,
            "currentSubscriptionId": subscription_id,
            "availablePlans": [
                {
                    "id": str(uuid4()),
                    "name": "Starter",
                    "tag": "popular",
                    "type": "BOTH",
                    "trafficLimit": 107374182400,
                    "deviceLimit": 3,
                    "trafficLimitStrategy": "RESET",
                    "durations": [{"id": str(uuid4()), "days": 30}],
                }
            ],
            "warnings": [],
        }
    )


def build_expected_quote(
    *,
    user_id: str,
    subscription_id: str | None,
    plan_id: str,
) -> SubscriptionQuoteSchema:
    return SubscriptionQuoteSchema.model_validate(
        {
            "userId": user_id,
            "purchaseType": "NEW",
            "channel": "WEB",
            "isEligible": True,
            "selectedSubscriptionId": subscription_id,
            "selectedPlan": {
                "id": plan_id,
                "name": "Starter",
                "tag": "popular",
                "type": "BOTH",
                "trafficLimit": 107374182400,
                "deviceLimit": 3,
                "trafficLimitStrategy": "RESET",
                "durations": [{"id": str(uuid4()), "days": 30}],
            },
            "selectedDuration": {"id": str(uuid4()), "days": 30},
            "availablePlans": [
                {
                    "id": plan_id,
                    "name": "Starter",
                    "tag": "popular",
                    "type": "BOTH",
                    "trafficLimit": 107374182400,
                    "deviceLimit": 3,
                    "trafficLimitStrategy": "RESET",
                    "durations": [{"id": str(uuid4()), "days": 30}],
                }
            ],
            "price": {
                "gatewayType": "YOOKASSA",
                "currency": "USD",
                "originalPrice": "12.99",
                "price": "9.99",
                "discountPercent": 23,
                "discountSource": "PURCHASE",
            },
            "warnings": [],
        }
    )
