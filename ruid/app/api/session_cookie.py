from __future__ import annotations

from typing import Literal

from fastapi import Response

from app.core.config import Settings

CookieSameSite = Literal["lax", "strict", "none"]


def get_cookie_samesite(value: str) -> CookieSameSite:
    normalized_value = value.lower()
    if normalized_value == "strict":
        return "strict"
    if normalized_value == "none":
        return "none"
    if normalized_value == "lax":
        return "lax"
    return "lax"


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.ruid_session_cookie_name,
        domain=settings.ruid_session_cookie_domain,
        path=settings.ruid_session_cookie_path,
        secure=settings.ruid_session_cookie_secure,
        httponly=True,
        samesite=get_cookie_samesite(settings.ruid_session_cookie_samesite),
    )


def build_clear_session_cookie_header(settings: Settings) -> str:
    response = Response()
    clear_session_cookie(response, settings)
    return response.headers["set-cookie"]
