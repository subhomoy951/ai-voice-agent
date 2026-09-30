"""PostgreSQL connection settings shared with the Laravel backend."""

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def connect() -> psycopg.Connection:
    if os.getenv("DB_CONNECTION") != "pgsql":
        raise ValueError("DB_CONNECTION must be pgsql")

    return psycopg.connect(
        host=os.environ["DB_HOST"],
        port=os.environ["DB_PORT"],
        dbname=os.environ["DB_DATABASE"],
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        connect_timeout=5,
    )
