export function fromLoginRequest(password) {
  return { password };
}

export function toSessionResponse(sessionResponse) {
  return {
    ok: Boolean(sessionResponse?.ok),
    configured: Boolean(sessionResponse?.configured),
    authenticated: Boolean(sessionResponse?.authenticated),
  };
}

export function toLoginResponse(loginResponse) {
  return {
    ok: Boolean(loginResponse?.ok),
  };
}
