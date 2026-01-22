from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os

load_dotenv()

from app.api.health import router as health_router
from app.api.upload import router as upload_router
from app.api.chat import router as chat_router
from app.api.chat_ws import router as chat_ws_router

logger = logging.getLogger(__name__)

app = FastAPI(title="KnowledgeForge API")

# ============= CORS =============

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= GLOBAL EXCEPTION HANDLER =============

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ============= ROUTERS =============

app.include_router(health_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(chat_ws_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "KnowledgeForge API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "knowledge-base-assistant",
    }
