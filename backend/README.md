# ASP Profiler Backend

Backend API for the ASP Profiler application.

## Requirements

- Python
- pip

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Copy `backend/.env.example` to `backend/.env` and set:

```env
APP_PASSWORD=your-password
APP_SESSION_SECRET=your-long-random-secret
```

`APP_CORS_ORIGINS` must include the frontend origin. For local development, use `http://localhost:5173`. For production, use `https://app.asprofiler.click`.

Session lifetime and cookie behavior can be overridden with `APP_SESSION_TTL_SECONDS`, `APP_COOKIE_SECURE`, and `APP_COOKIE_SAMESITE`. For local development, use `APP_COOKIE_SECURE=False` and `APP_COOKIE_SAMESITE=lax`. For production, use `APP_COOKIE_SECURE=True` and `APP_COOKIE_SAMESITE=none`.

## Development

```bash
uvicorn app.main:app --reload --env-file .env --host 0.0.0.0 --port 8000
```

## Tests

```bash
python -m pytest
```

Coverage is configured in `pytest.ini` and is printed in the terminal after the test run.

## Reference Validation

The reference scripts compare ASP Profiler results with the [`InSituASProfile`](https://github.com/LasseIshoi/InSituASProfile) R package on `tests/reference/data/ishoi_data.csv`.

```bash
python tests/reference/run_asprofiler_on_ishoi_data.py
Rscript tests/reference/run_ishoi_on_ishoi_data.R
```
