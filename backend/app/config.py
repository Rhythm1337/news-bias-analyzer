from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://newsbias:devpassword@localhost:5432/newsbias"
    cors_origin: str = "http://localhost:3000"

    ai_provider: str = "gemini"
    gemini_api_key: str | None = None
    openai_api_key: str | None = None

    # OpenShift AI (KServe / ModelMesh) inference endpoint. Set
    # AI_PROVIDER=openshift to route analyze() through this URL instead of
    # Gemini. The URL is the full /infer endpoint of an InferenceService,
    # e.g. https://my-model-myproj.apps.sandbox.x8i5.p1.openshiftapps.com
    # /v2/models/my-model/infer. The token is required when the route is
    # protected by OpenShift OAuth (the sandbox usually is); leave it empty
    # for unauthenticated in-cluster routes.
    openshift_ai_inference_url: str | None = None
    openshift_ai_token: str | None = None

    # Optional fallback. When the direct article fetch is blocked (403, JS
    # challenge, etc.), the scraper retries the URL through ScrapingBee.
    # Get a key at https://www.scrapingbee.com (free tier covers 1000
    # requests per month). If unset, the fallback is skipped silently.
    scrapingbee_api_key: str | None = None

    debug: bool = False

    # When True, the rate limiter reads a value from the X-Forwarded-For
    # header to identify the client. Only enable this when running behind a
    # trusted reverse proxy (e.g. Render, Fly, a load balancer you control).
    # If left False in such a deployment, every visitor will share one
    # rate-limit bucket keyed to the proxy IP.
    trust_x_forwarded_for: bool = False

    # Number of trusted reverse proxies between the public internet and
    # this app. The rate limiter reads the entry this many positions from
    # the RIGHT of the X-Forwarded-For chain (which is attacker-controlled
    # on the left, proxy-controlled on the right). Set to:
    #   1 = one trusted proxy in front (e.g. Render directly).
    #   2 = your trusted proxy is itself behind another trusted proxy
    #       (e.g. Render behind Cloudflare).
    # Anything taken from further left can be spoofed by the client.
    trusted_proxy_hops: int = 1

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origin.split(",") if o.strip()]


settings = Settings()
