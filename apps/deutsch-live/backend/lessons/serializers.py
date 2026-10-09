def serialize_plan(plan):
    return {
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "priceCents": plan.price_cents,
        "currency": plan.currency,
        "interval": plan.interval,
        "isPremium": plan.is_premium,
    }


def serialize_subscription(subscription):
    return {
        "id": subscription.id,
        "planCode": subscription.plan.code,
        "planName": subscription.plan.name,
        "status": subscription.status,
        "provider": subscription.provider,
        "currentPeriodEnd": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "grantsPremiumAccess": subscription.grants_premium_access,
    }


def serialize_feedback(feedback):
    return {
        "id": feedback.id,
        "category": feedback.category,
        "status": feedback.status,
        "message": feedback.message,
        "createdAt": feedback.created_at.isoformat(),
    }


def serialize_writing_exercise(item):
    return {
        "id": item.id,
        "topicId": item.topic_id,
        "topicLabel": item.topic_label,
        "prompt": item.prompt,
        "userText": item.user_text,
        "correction": item.correction,
        "explanation": item.explanation,
        "status": item.status,
        "createdAt": item.created_at.isoformat(),
    }


def serialize_profile(profile):
    return {
        "role": profile.role,
        "premiumStatus": profile.premium_status,
        "hasPremiumAccess": profile.has_premium_access,
        "emailVerified": profile.email_verified,
        "interfaceLanguage": profile.interface_language,
        "explanationLanguage": profile.explanation_language,
        "themePreference": profile.theme_preference,
        "level": profile.level,
        "mainGoal": profile.main_goal,
        "preferredTopic": profile.preferred_topic,
        "saveProgress": profile.save_progress,
    }


def serialize_user(user, profile):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "isStaff": user.is_staff,
        "roles": list(user.groups.values_list("name", flat=True)),
        "settings": serialize_profile(profile),
    }


def serialize_dashboard_scene(scene):
    return {
        "id": scene.slug,
        "topicId": scene.topic_id,
        "title": scene.title,
        "level": scene.level.upper(),
        "isPremium": scene.is_premium,
    }
