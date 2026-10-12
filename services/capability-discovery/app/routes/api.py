from fastapi import APIRouter, File, UploadFile, status

from app.services.aasxtojson import convert_uploaded_aasx
from app.routes.auth import router as auth_router


router = APIRouter()


def register_routes(app):
    """Register each service API while preserving its existing URL prefix."""
    app.include_router(router, prefix="/api/v1")
    app.include_router(auth_router)


@router.post("/aasx/convert", status_code=status.HTTP_201_CREATED)
async def convert_aasx(file: UploadFile = File(...)):
    """Receive an AASX, convert its model to JSON, and extract files."""
    return await convert_uploaded_aasx(file)
