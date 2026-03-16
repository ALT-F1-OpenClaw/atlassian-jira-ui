"""Application configuration via Pydantic Settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """App settings loaded from environment / .env file."""

    # Jira
    jira_host: str
    jira_email: str
    jira_api_token: str

    # OAuth 2.0 (3LO)
    atlassian_client_id: str = ""
    atlassian_client_secret: str = ""

    # App
    app_secret_key: str = "change-me"
    cors_origins: str = "http://localhost:5173"
    debug: bool = False

    @property
    def jira_base_url(self) -> str:
        host = self.jira_host.rstrip("/")
        if not host.startswith("http"):
            host = f"https://{host}"
        return f"{host}/rest/api/3"

    @property
    def jira_agile_url(self) -> str:
        host = self.jira_host.rstrip("/")
        if not host.startswith("http"):
            host = f"https://{host}"
        return f"{host}/rest/agile/1.0"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
