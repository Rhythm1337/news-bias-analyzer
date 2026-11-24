from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings

# connect_timeout=5 prevents the first connection attempt from blocking the
# uvicorn worker for 30+ seconds when Postgres is unavailable at startup.
# pool_pre_ping silently drops stale connections at request time (not startup).
engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"connect_timeout": 5},
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def db_healthcheck() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
