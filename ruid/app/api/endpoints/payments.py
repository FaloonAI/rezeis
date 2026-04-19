from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.session_cookie import build_clear_session_cookie_header, clear_session_cookie
from app.api.dependencies import (
    get_current_auth_session,
    get_payments_service,
    get_runtime_settings,
    get_session_store,
    raise_bff_http_error,
)
from app.core.config import Settings
from app.schemas.auth_session import AuthSessionSchema
from app.schemas.payment_checkout import (
    PaymentCheckoutInputSchema,
    PaymentCheckoutSchema,
    PaymentStatusSchema,
)
from app.services.internal_admin_client import InternalAdminNotFoundError
from app.services.payments_service import PaymentsService
from app.services.session_store import RedisSessionStore

router: APIRouter = APIRouter(prefix="/payments")


@router.post("/checkout", response_model=PaymentCheckoutSchema)
async def checkout_payment(
    request: Request,
    response: Response,
    input: PaymentCheckoutInputSchema,
    auth_session: Annotated[AuthSessionSchema, Depends(get_current_auth_session)],
    service: Annotated[PaymentsService, Depends(get_payments_service)],
    session_store: Annotated[RedisSessionStore, Depends(get_session_store)],
    settings: Annotated[Settings, Depends(get_runtime_settings)],
) -> PaymentCheckoutSchema:
    try:
        return await service.checkout_by_user_id(auth_session.user_id, input=input)
    except InternalAdminNotFoundError as err:
        await invalidate_stale_session(
            request=request,
            response=response,
            session_store=session_store,
            settings=settings,
            err=err,
        )
    except Exception as err:
        raise_bff_http_error(err)


@router.get("/{payment_id}", response_model=PaymentStatusSchema)
async def get_payment_status(
    request: Request,
    response: Response,
    payment_id: str,
    auth_session: Annotated[AuthSessionSchema, Depends(get_current_auth_session)],
    service: Annotated[PaymentsService, Depends(get_payments_service)],
    session_store: Annotated[RedisSessionStore, Depends(get_session_store)],
    settings: Annotated[Settings, Depends(get_runtime_settings)],
) -> PaymentStatusSchema:
    try:
        return await service.get_payment_status_by_user_id(
            user_id=auth_session.user_id,
            payment_id=payment_id,
        )
    except InternalAdminNotFoundError as err:
        await invalidate_stale_session(
            request=request,
            response=response,
            session_store=session_store,
            settings=settings,
            err=err,
        )
    except Exception as err:
        raise_bff_http_error(err)


async def invalidate_stale_session(
    *,
    request: Request,
    response: Response,
    session_store: RedisSessionStore,
    settings: Settings,
    err: InternalAdminNotFoundError,
) -> None:
    session_cookie = request.cookies.get(settings.ruid_session_cookie_name)
    if session_cookie is not None:
        await session_store.delete_session(session_cookie)
    clear_session_cookie(response, settings)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session is no longer valid.",
        headers={"set-cookie": build_clear_session_cookie_header(settings)},
    ) from err
