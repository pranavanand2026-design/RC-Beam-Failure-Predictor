import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_cors_origins
from .core.lifespan import lifespan
from .routers import analyze, health, meta, playground, predict

app = FastAPI(
    title="RC Beam Fire Design API",
    version="1.0.0",
    description="ML-powered fire resistance prediction and design optimization for RC beams",
    lifespan=lifespan,
)


logger = logging.getLogger("rcbeam.api")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full traceback server-side; never send internals to the client.
    logger.error(
        "Unhandled error on %s %s\n%s",
        request.method,
        request.url.path,
        "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(meta.router)
app.include_router(predict.router)
app.include_router(analyze.router)
app.include_router(playground.router)
