from django.http import JsonResponse


def error_response(message, status=400, code="error", request=None, **extra):
    payload = {"error": message, "code": code}
    request_id = getattr(request, "request_id", "") if request is not None else ""
    if request_id:
        payload["requestId"] = request_id
    payload.update(extra)
    return JsonResponse(payload, status=status)
