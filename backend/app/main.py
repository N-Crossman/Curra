from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routes import appointments, auth, care_team, journal, labs, medications, messages, users, vitals


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Curra API",
    description="Health management for chronic illness patients.",
    version="1.0.0",
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(labs.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")
app.include_router(journal.router, prefix="/api")
app.include_router(care_team.router, prefix="/api")
app.include_router(messages.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "Curra API v1.0.0"}