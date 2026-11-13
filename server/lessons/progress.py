"""Resolve the scene identifiers exposed by the learning-topic API."""

from .data import TOPICS
from .models import Scene


def resolve_progress_scene(topic_id, scene_id=""):
    scenes = Scene.objects.filter(
        category__slug=topic_id, category__is_published=True, is_published=True,
    )
    scene = scenes.filter(slug=scene_id).first() if scene_id else scenes.first()
    if scene:
        return scene.slug, scene
    if not scenes.exists() and topic_id in TOPICS and scene_id in ("", f"fallback:{topic_id}"):
        return f"fallback:{topic_id}", None
    return None, None
