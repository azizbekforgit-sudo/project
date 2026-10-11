from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

# Параметры из строки подключения, которые понимает psql, но не драйвер asyncpg.
# Neon, Supabase и другие облачные Postgres добавляют их в ссылку — убираем и
# включаем защищённое соединение сами.
_LIBPQ_ONLY = {"sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey", "options", "target_session_attrs", "pgbouncer"}

_CLOUD_SSL_HOSTS = (".neon.tech", ".supabase.com", ".supabase.co")


def _engine_args(url: str):
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    sslmode = (query.get("sslmode") or "").lower()
    clean_url = urlunsplit(parts._replace(query=urlencode({k: v for k, v in query.items() if k not in _LIBPQ_ONLY})))

    host = (parts.hostname or "").lower()
    connect_args = {}
    # облачные базы (Neon, Supabase) принимают только защищённое соединение, даже если в ссылке нет sslmode
    if sslmode in ("require", "verify-ca", "verify-full") or host.endswith(_CLOUD_SSL_HOSTS):
        connect_args["ssl"] = "require"
    # пулер соединений (у Neon — адрес с «-pooler», у Supabase — pooler.supabase.com)
    # не держит заготовленные запросы
    if "pooler" in host or query.get("pgbouncer") == "true":
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"
    return clean_url, connect_args


_url, _connect_args = _engine_args(settings.database_url)

engine = create_async_engine(
    _url,
    echo=False,
    pool_pre_ping=True,   # бесплатная база засыпает без запросов — проверяем соединение перед работой
    pool_recycle=240,
    pool_size=5,          # бесплатные тарифы ограничивают число соединений
    max_overflow=5,
    connect_args=_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
