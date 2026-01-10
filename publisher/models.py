from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SpecItem(BaseModel):
    name: str = Field(default="")
    value: str = Field(default="")


class DraftProduct(BaseModel):
    # champs requis (min)
    name: str
    manufacturer_id: int
    category_ids: list[int]
    price_ht: float
    short_html: str
    long_html: str

    # champs optionnels
    reference: str | None = None
    specs: list[SpecItem] = Field(default_factory=list)
    weight_kg: float | None = None
    pdf_file: str | None = None
    active: bool = False
    accessories: list[int] | None = None


class JobError(BaseModel):
    code: str
    message: str


class JobState(BaseModel):
    status: Literal["queued", "running", "success", "error"]
    progress: int
    last_log: str = ""
    result: dict[str, Any] | None = None
    error: JobError | None = None
