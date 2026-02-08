# Backend (FastAPI)

## Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run (dev)
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints
- `GET /files`
- `POST /files` (multipart)
- `DELETE /files/{name}`
- `POST /files/delete`
- `POST /analyze`
