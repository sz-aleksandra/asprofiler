from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class AnalyzeParams(BaseModel):
    min_speed: float = Field(3.0, ge=0)
    bin_size: float = Field(0.2, gt=0)
    top_n: int = Field(2, ge=1)
    positive_only: bool = True
    confidence_level: float = Field(0.95, gt=0, lt=1)

class AnalyzeItemRequest(BaseModel):
    name: str
    params: AnalyzeParams | None = None


class AnalyzeRequest(BaseModel):
    items: List[AnalyzeItemRequest]
    color_map: dict[str, str] = {}


class FileInfo(BaseModel):
    name: str
    size: int


class DeleteRequest(BaseModel):
    names: List[str]


class AnalyzeResultsResponse(BaseModel):
    ok: bool = True
    results: list[dict]
