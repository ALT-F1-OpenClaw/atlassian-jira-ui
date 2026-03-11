"""Configuration tests."""

import os
import pytest
from app.config import Settings


def test_settings_jira_base_url():
    """Given jira_host without protocol, when accessing jira_base_url, then prepend https."""
    s = Settings(
        jira_host="test.atlassian.net",
        jira_email="test@test.com",
        jira_api_token="token",
    )
    assert s.jira_base_url == "https://test.atlassian.net/rest/api/3"


def test_settings_jira_base_url_with_protocol():
    """Given jira_host with https, when accessing jira_base_url, then don't double prefix."""
    s = Settings(
        jira_host="https://mycompany.atlassian.net",
        jira_email="test@test.com",
        jira_api_token="token",
    )
    assert s.jira_base_url == "https://mycompany.atlassian.net/rest/api/3"


def test_settings_jira_agile_url():
    """Given jira_host, when accessing jira_agile_url, then return agile API URL."""
    s = Settings(
        jira_host="https://test.atlassian.net",
        jira_email="test@test.com",
        jira_api_token="token",
    )
    assert s.jira_agile_url == "https://test.atlassian.net/rest/agile/1.0"


def test_settings_cors_origins_parsed():
    """Given comma-separated CORS origins, when accessing cors_origin_list, then split correctly."""
    s = Settings(
        jira_host="https://test.atlassian.net",
        jira_email="test@test.com",
        jira_api_token="token",
        cors_origins="http://localhost:5173, http://localhost:3000",
    )
    assert s.cors_origin_list == ["http://localhost:5173", "http://localhost:3000"]


def test_settings_trailing_slash_stripped():
    """Given jira_host with trailing slash, when accessing URLs, then no double slash."""
    s = Settings(
        jira_host="https://test.atlassian.net/",
        jira_email="test@test.com",
        jira_api_token="token",
    )
    assert "//" not in s.jira_base_url.replace("https://", "")
