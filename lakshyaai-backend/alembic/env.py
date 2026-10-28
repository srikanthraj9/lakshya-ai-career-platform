import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.db.database import Base, _clean_database_url
import app.db.models  # Ensure all SQLAlchemy models are registered

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


from scripts.validate_environment import assert_migration_safety as _assert_migration_safety, sanitize_url as _sanitize_url


def get_url() -> str:
    """Resolve database URL prioritizing DIRECT_URL (session pooler) for migrations."""
    if os.environ.get("TESTING") == "true":
        test_url = os.environ.get("TEST_DATABASE_URL")
        if test_url:
            return test_url
        return "sqlite:///:memory:"

    is_staging = os.environ.get("ENVIRONMENT", "").strip().lower() == "staging"
    if is_staging:
        staging_direct = os.environ.get("STAGING_DIRECT_URL")
        if staging_direct:
            return _clean_database_url(staging_direct)
        staging_db = os.environ.get("STAGING_DATABASE_URL")
        if staging_db:
            return _clean_database_url(staging_db)

    direct_url = getattr(settings, "DIRECT_URL", None) or os.environ.get("DIRECT_URL")
    if direct_url:
        return _clean_database_url(direct_url)

    db_url = getattr(settings, "DATABASE_URL", None) or os.environ.get("DATABASE_URL")
    if db_url:
        return _clean_database_url(db_url)

    return config.get_main_option("sqlalchemy.url", "postgresql://postgres:postgres@localhost:5432/postgres")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    _assert_migration_safety(url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = get_url()
    _assert_migration_safety(url)

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
