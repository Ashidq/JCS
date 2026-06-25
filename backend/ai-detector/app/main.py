from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routes.payment import router as payment_router

app = FastAPI(
    title="AI Payment Detector"
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://jcs-tau.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    payment_router,
    prefix="/api"
)

@app.get("/")
def root():
    return {
        "status":"running"
    }