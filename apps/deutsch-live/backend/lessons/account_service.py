from django.conf import settings
from django.core import signing

from .models import UserProfile


def has_valid_auth_token(request):
    token = request.COOKIES.get("learning_auth_token")
    if not token:
        return False
    try:
        user_id = signing.TimestampSigner(salt="learning-auth").unsign(
            token,
            max_age=settings.AUTH_TOKEN_MAX_AGE,
        )
    except (signing.BadSignature, signing.SignatureExpired):
        return False
    return str(request.user.id) == str(user_id)


def get_profile(user):
    profile, _created = UserProfile.objects.get_or_create(user=user)
    return profile
