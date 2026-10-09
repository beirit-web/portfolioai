from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist


class RealtimeAccessMiddleware:
    """Apply centralized WebSocket auth, role and connection-limit policies."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "websocket" or not settings.REALTIME_WS_ACCESS_ENABLED:
            return await self.app(scope, receive, send)

        policy = self._match_policy(scope)
        if not policy:
            return await self.app(scope, receive, send)

        scope["realtime_policy"] = policy["name"]
        if not self._rate_limit_allows(scope, policy):
            return await self._close(send, 4429)

        user = scope.get("user")
        if not getattr(user, "is_authenticated", False):
            return await self._close(send, 4401)
        if not self._role_allowed(user, policy):
            return await self._close(send, 4403)

        return await self.app(scope, receive, send)

    def _match_policy(self, scope):
        path = scope.get("path", "")
        for name, policy in settings.REALTIME_WS_POLICIES.items():
            if path == policy.get("path"):
                return {"name": name, **policy}
        return None

    def _rate_limit_allows(self, scope, policy):
        limit = getattr(settings, "REALTIME_WS_CONNECTION_LIMIT", 30)
        if limit <= 0:
            return True
        window = getattr(settings, "REALTIME_WS_CONNECTION_WINDOW_SECONDS", 60)
        key = f"rate-limit:realtime:{policy['name']}:{self._actor_key(scope)}"
        return self._increment(key, limit, window)

    def _increment(self, key, limit, window_seconds):
        attempts = cache.get(key, 0)
        if attempts >= limit:
            return False
        cache.set(key, attempts + 1, timeout=window_seconds)
        return True

    def _actor_key(self, scope):
        user = scope.get("user")
        if getattr(user, "is_authenticated", False):
            return f"user:{user.id}"
        client = scope.get("client") or ("unknown", "")
        return f"ip:{client[0]}"

    def _role_allowed(self, user, policy):
        allowed_roles = set(policy.get("allowed_roles", []))
        if not allowed_roles:
            return True
        if getattr(user, "is_superuser", False):
            return True
        role = self._user_role(user)
        return role in allowed_roles

    def _user_role(self, user):
        try:
            return getattr(user.learning_profile, "role", "learner")
        except ObjectDoesNotExist:
            return "learner"

    async def _close(self, send, code):
        await send({"type": "websocket.close", "code": code})
