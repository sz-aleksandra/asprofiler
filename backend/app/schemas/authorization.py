from pydantic import BaseModel


class LoginPayload(BaseModel):
    password: str = ""


class LoginResponse(BaseModel):
    ok: bool = True


class SessionResponse(BaseModel):
    ok: bool = True
    configured: bool
    authenticated: bool
