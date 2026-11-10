from __future__ import annotations

import os
from typing import List


def get_cors_origins() -> List[str]:
    origins_env = os.getenv("CORS_ORIGINS", "")
    if origins_env:
        return [o.strip() for o in origins_env.split(",") if o.strip()]
    return [
        "https://rcbeam.netlify.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def get_cors_origin_regex() -> str:
    """Also allow this site's Netlify deploy previews (deploy-preview-12--rcbeam.netlify.app)."""
    return os.getenv("CORS_ORIGIN_REGEX", r"https://[a-z0-9-]+--rcbeam\.netlify\.app")


CONFIG_PATH = os.getenv("RCBEAM_CONFIG", "config.yaml")
