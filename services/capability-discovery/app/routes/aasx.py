from fastapi import APIRouter, File, UploadFile, status

from app.services.aasxtojson import convert_uploaded_aasx


router = APIRouter()


@router.post("/aasx/convert", status_code=status.HTTP_201_CREATED)
async def convert_aasx(file: UploadFile = File(...)):
    """Receive an AASX, convert its model to JSON, and extract files."""
    return await convert_uploaded_aasx(file)
