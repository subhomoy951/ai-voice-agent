"""MySQL connection settings shared with the Laravel backend."""

import os
from pathlib import Path

import mysql.connector
from mysql.connector.connection import MySQLConnection
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def connect() -> MySQLConnection:
    if os.getenv("DB_CONNECTION") != "mysql":
        raise ValueError("DB_CONNECTION must be mysql")

    return mysql.connector.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ["DB_PORT"]),
        database=os.environ["DB_DATABASE"],
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        connection_timeout=5,
    )
