from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST

from pages.templatetags.asset_tags import asset_url

from .definitions import OPTIONAL_FIELDS, TEMPLATES
from .forms import ContractForm
from . import ai_service


def _form(request, data=None):
    source = request.POST if data is None else data
    key = source.get("template", "rent")
    if key not in TEMPLATES:
        raise Http404("Unbekannte Vertragsvorlage")
    return ContractForm(key, source)


@never_cache
@require_GET
def generator(request):
    form = _form(request, request.GET)
    config = {
        "templates": TEMPLATES, "optionalFields": sorted(OPTIONAL_FIELDS),
        "selectedTemplate": form.template_key,
        "previewUrl": reverse("contracts:preview"),
        "downloadUrl": reverse("contracts:download"),
        "iconsUrl": asset_url("contracts/icons.svg"),
        "aiUrl": reverse("contracts:assist"),
        "aiAvailable": ai_service.is_available(),
    }
    return render(request, "contracts/generator.html", {
        "form": form, "groups": form.groups(), "config": config,
        "definition": form.definition, "document": form.document(),
        "canonical_url": request.build_absolute_uri(reverse("contracts:generator")),
        "workspace": "editor" if "template" in request.GET or request.GET.get("workspace") == "editor" else "overview",
    })


@never_cache
@require_POST
def preview(request):
    form = _form(request)
    return JsonResponse({"text": form.document(), "documentValues": form.document_values(),
                         **form.validation()})


@never_cache
@require_POST
def download(request):
    form = _form(request)
    validation = form.validation()
    if validation["invalidFields"]:
        return JsonResponse(validation, status=400)
    response = HttpResponse(form.document(), content_type="text/plain; charset=utf-8")
    filename = f"{timezone.localdate().isoformat()}-{form.definition['fileName']}"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@never_cache
@require_POST
def assist(request):
    action = request.POST.get("action", "generate")
    template = request.POST.get("template", "rent")
    prompt = request.POST.get("prompt", "").strip()
    if template not in TEMPLATES or action not in {"generate", "improve", "shorten"}:
        return JsonResponse({"error": "Unbekannte KI-Aktion oder Vorlage."}, status=400)
    if not 10 <= len(prompt) <= 5000:
        return JsonResponse({"error": "Bitte zwischen 10 und 5.000 Zeichen eingeben."}, status=400)
    if request.POST.get("consent") != "yes":
        return JsonResponse({"error": "Bitte der Übermittlung deiner Beschreibung an Google Gemini zustimmen."}, status=400)
    try:
        return JsonResponse(ai_service.generate(template, prompt, action))
    except ai_service.AIError as error:
        return JsonResponse({"error": str(error)}, status=error.status)
