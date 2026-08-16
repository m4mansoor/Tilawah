"""Central application configuration.

Everything here is overridable via environment variables or a `.env` file.
Keeping the model id + device in one place is what lets us upgrade the model
or move CPU -> GPU without touching any other code.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Tilawah"
    version: str = "0.1.0"

    # ASR model (faster-whisper / CTranslate2). Options:
    #   "/root/.cache/huggingface/quran-ct2" — Quran-fine-tuned (accurate) [default]
    #   "large-v3-turbo" — 809M vanilla, good but not Quran-tuned
    #   "base"           — 74M, fastest, least accurate
    model_id: str = "/root/.cache/huggingface/quran-ct2"

    # -1 = CPU, 0 = first GPU, 1 = second GPU, ...
    device: int = -1

    redis_url: str = "redis://localhost:6379/0"
    database_url: str = "postgresql://tilawah:tilawah@localhost:5432/tilawah"

    # Auth
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Comma-separated allowed CORS origins, or "*" for any (public API).
    cors_origins: str = "*"

    # Max audio length accepted per correction request (seconds).
    max_audio_seconds: int = 300

    # Temporary storage for uploaded audio before processing.
    tmp_dir: str = "/tmp/tilawah"

    # Persistent storage for collected training recitations (Qari platform).
    # On the VPS, override to /data/audio so recordings survive redeploys.
    audio_dir: str = "data/audio"

    # Comma-separated emails to promote to the admin role on startup.
    admin_emails: str = ""


settings = Settings()
