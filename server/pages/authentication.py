"""Authenticate shared portfolio accounts by username or email address."""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        identifier = username if username is not None else kwargs.get(User.USERNAME_FIELD)
        if not isinstance(identifier, str) or password is None:
            return None
        identifier = User.normalize_username(identifier.strip())
        users = list(User._default_manager.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier),
        )[:2]) if identifier else []
        # Historical accounts may share email addresses or collide across fields.
        # Never select an arbitrary account for an ambiguous identifier.
        if len(users) != 1:
            User().set_password(password)
            return None
        user = users[0]
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
