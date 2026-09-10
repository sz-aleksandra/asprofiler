from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


class SessionResponse(BaseModel):
    authenticated: bool
