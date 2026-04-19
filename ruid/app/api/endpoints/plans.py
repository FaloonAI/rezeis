from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi import Response

from app.api.dependencies import (
    get_optional_auth_session,
    get_plans_service,
    raise_bff_http_error,
)
from app.schemas.auth_session import AuthSessionSchema
from app.schemas.plans import PlanSchema
from app.services.plans_service import PlansService

router: APIRouter = APIRouter(prefix="/plans")


@router.get("", response_model=list[PlanSchema])
async def get_plans(
    response: Response,
    service: Annotated[PlansService, Depends(get_plans_service)],
    auth_session: Annotated[AuthSessionSchema | None, Depends(get_optional_auth_session)],
) -> list[PlanSchema]:
    try:
        return await service.get_plans(user_id=None if auth_session is None else auth_session.user_id)
    except Exception as err:
        raise_bff_http_error(err)
