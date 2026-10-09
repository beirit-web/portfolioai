from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.forms import DateField
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from . import api
from .care import care_for, care_search_url
from .forms import PlantForm, SearchForm
from .models import Plant, Watering


def _context(request, tab="search"):
    plants = Plant.objects.filter(owner=request.user).select_related("species") if request.user.is_authenticated else Plant.objects.none()
    today = timezone.localdate()
    return {
        "tab": tab, "today": today, "plant_count": plants.count(),
        "due_count": plants.filter(paused=False, next_watering__lte=today).count(),
        "paused_count": plants.filter(paused=True).count(),
        "login_url": f"{settings.LOGIN_URL}?{urlencode({'next': reverse('botanic:index') + '?tab=plants'})}",
    }


def _render(request, template, context, status=200):
    response = render(request, template, context, status=status)
    response.status_page_handled = status >= 400
    # Only Botanic pages can load allowlisted plant photographs from iNaturalist.
    for header in ("Content-Security-Policy", "Content-Security-Policy-Report-Only"):
        policy = str(settings.CONTENT_SECURITY_POLICY)
        directives = [directive.strip() for directive in policy.split(";") if directive.strip()]
        for index, directive in enumerate(directives):
            if directive.startswith("img-src "):
                directives[index] += " https://inaturalist-open-data.s3.amazonaws.com https://static.inaturalist.org"
                break
        else:
            directives.append("img-src 'self' data: https://inaturalist-open-data.s3.amazonaws.com https://static.inaturalist.org")
        if header == ("Content-Security-Policy" if settings.CONTENT_SECURITY_POLICY_ENFORCE else "Content-Security-Policy-Report-Only"):
            response[header] = "; ".join(directives)
    return response


@never_cache
@require_GET
def index(request):
    tab = request.GET.get("tab", "plants" if request.user.is_authenticated else "search")
    if tab not in {"search", "plants", "watering"}:
        tab = "search"
    context = _context(request, tab)
    if tab == "search":
        query = request.GET.get("q", "Monstera")
        form = SearchForm({"q": query, "page": request.GET.get("page", "1")})
        context.update(search_form=form, query=query)
        if form.is_valid():
            page = form.cleaned_data["page"] or 1
            try:
                context.update(api.search(form.cleaned_data["q"], page))
                context["previous_url"] = "?" + urlencode({"tab": "search", "q": query, "page": page - 1})
                context["next_url"] = "?" + urlencode({"tab": "search", "q": query, "page": page + 1})
                context["page_number"] = page
            except api.ApiError as exc:
                context["api_error"] = str(exc)
        return _render(request, "botanic/index.html", context)

    if not request.user.is_authenticated:
        return _render(request, "botanic/index.html", context)
    plants = Plant.objects.filter(owner=request.user).select_related("species")
    if tab == "plants":
        query = request.GET.get("q", "").strip()[:80]
        location = request.GET.get("location", "")[:80]
        context.update(query=query, location=location, locations=list(plants.exclude(location="").values_list("location", flat=True).distinct().order_by("location")))
        if query:
            plants = plants.filter(Q(nickname__icontains=query) | Q(species__name__icontains=query) | Q(species__scientific_name__icontains=query))
        if location:
            plants = plants.filter(location=location)
    else:
        today = context["today"]
        active = plants.filter(paused=False)
        days = []
        for offset in range(7):
            day = today + timedelta(days=offset)
            days.append({"date": day, "count": active.filter(next_watering=day).count(),
                         "url": "?" + urlencode({"tab": "watering", "day": day.isoformat()})})
        filter_key = request.GET.get("filter", "due")
        day_value = request.GET.get("day", "")
        if day_value:
            try:
                selected_day = DateField().clean(day_value)
            except ValidationError as exc:
                raise Http404("Ungültiges Datum.") from exc
            plants = active.filter(next_watering=selected_day)
            context["selected_day"] = selected_day
        elif filter_key == "upcoming":
            plants = active.filter(next_watering__gt=today, next_watering__lte=today + timedelta(days=7))
        elif filter_key == "paused":
            plants = plants.filter(paused=True)
        elif filter_key != "all":
            filter_key = "due"
            plants = active.filter(next_watering__lte=today)
        context.update(days=days, filter_key=filter_key)
    paginator = Paginator(plants.order_by("paused", "next_watering", "id"), 18)
    page_obj = paginator.get_page(request.GET.get("page"))
    params = request.GET.copy()
    params["tab"] = tab
    params["page"] = page_obj.previous_page_number() if page_obj.has_previous() else 1
    context["previous_url"] = "?" + params.urlencode()
    params["page"] = page_obj.next_page_number() if page_obj.has_next() else 1
    context.update(page_obj=page_obj, plants=page_obj.object_list, next_url="?" + params.urlencode())
    return _render(request, "botanic/index.html", context)


@never_cache
@require_GET
def weather(request):
    return _render(request, "botanic/weather.html", _context(request, "weather"))


@never_cache
@require_GET
def search_api(request):
    form = SearchForm({"q": request.GET.get("q", ""), "page": request.GET.get("page", "1")})
    if not form.is_valid():
        return JsonResponse({"errors": form.errors.get_json_data()}, status=400)
    try:
        result = api.search(form.cleaned_data["q"], form.cleaned_data["page"] or 1)
    except api.ApiError as exc:
        response = JsonResponse({"error": str(exc)}, status=exc.status)
        if exc.status == 429:
            response["Retry-After"] = "60"
        return response
    return JsonResponse({**result, "results": [{
        "id": species.pk, "name": species.name, "scientific_name": species.scientific_name,
        "image_url": species.image_url, "image_attribution": species.image_attribution,
        "image_license": species.image_license, "source_url": species.source_url,
        "image_source_url": species.image_source_url, "license_url": species.license_url,
        "detail_url": reverse("botanic:species", args=[species.pk]),
    } for species in result["results"]]})


@never_cache
@require_GET
def species_detail(request, taxon_id):
    context = _context(request)
    try:
        species = api.get_species(taxon_id)
    except api.ApiError as exc:
        return _render(request, "botanic/api_error.html", {**context, "api_error": str(exc)}, status=exc.status)
    context.update(species=species, form=PlantForm(species=species), care=care_for(species), care_search_url=care_search_url(species),
                   login_url=f"{settings.LOGIN_URL}?{urlencode({'next': reverse('botanic:species', args=[taxon_id])})}")
    return _render(request, "botanic/detail.html", context)


@never_cache
@require_POST
def add_plant(request, taxon_id):
    if not request.user.is_authenticated:
        return redirect(f"{settings.LOGIN_URL}?{urlencode({'next': reverse('botanic:species', args=[taxon_id])})}")
    try:
        species = api.get_species(taxon_id)
    except api.ApiError as exc:
        return _render(request, "botanic/api_error.html", {**_context(request), "api_error": str(exc)}, status=exc.status)
    form = PlantForm(request.POST, species=species)
    if form.is_valid():
        plant = form.save(commit=False)
        plant.owner = request.user
        plant.species = species
        plant.save()
        messages.success(request, f"{plant.display_name} ist in deiner Sammlung.")
        return redirect(reverse("botanic:index") + "?tab=plants")
    return _render(request, "botanic/detail.html", {**_context(request), "species": species, "form": form,
                    "care": care_for(species), "care_search_url": care_search_url(species)})


@never_cache
@login_required
@require_http_methods(["GET", "POST"])
def edit_plant(request, pk):
    plant = get_object_or_404(Plant.objects.select_related("species"), pk=pk, owner=request.user)
    form = PlantForm(request.POST if request.method == "POST" else None, instance=plant)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Pflanze und Gießplan gespeichert.")
        return redirect("botanic:edit", pk=plant.pk)
    return _render(request, "botanic/detail.html", {
        **_context(request, "plants"), "species": plant.species, "plant": plant, "form": form,
        "waterings": plant.waterings.all()[:12],
        "care": care_for(plant.species), "care_search_url": care_search_url(plant.species),
    })


def _back_to_plan():
    return redirect(reverse("botanic:index") + "?tab=watering")


@never_cache
@login_required
@require_POST
@transaction.atomic
def water_plant(request, pk):
    plant = get_object_or_404(Plant.objects.select_for_update().select_related("species"), pk=pk, owner=request.user)
    if plant.paused:
        messages.error(request, "Der Gießplan ist pausiert. Bitte zuerst wieder aktivieren.")
        return _back_to_plan()
    today = timezone.localdate()
    _, created = Watering.objects.get_or_create(plant=plant, watered_on=today)
    if created:
        plant.schedule_after(today)
        messages.success(request, f"{plant.display_name}: Gießen für heute eingetragen.")
    else:
        messages.info(request, "Für heute ist bereits ein Gießvorgang eingetragen.")
    return _back_to_plan()


@never_cache
@login_required
@require_POST
@transaction.atomic
def snooze_plant(request, pk):
    plant = get_object_or_404(Plant.objects.select_for_update(), pk=pk, owner=request.user)
    if request.POST.get("days") not in {"1", "3", "7"}:
        return JsonResponse({"error": "Bitte um 1, 3 oder 7 Tage verschieben."}, status=400)
    if plant.paused:
        messages.error(request, "Der Gießplan ist pausiert.")
        return _back_to_plan()
    plant.next_watering = max(timezone.localdate(), plant.next_watering or timezone.localdate()) + timedelta(days=int(request.POST["days"]))
    plant.save(update_fields=["next_watering", "updated_at"])
    messages.success(request, "Gießtermin verschoben.")
    return _back_to_plan()


@never_cache
@login_required
@require_POST
def delete_plant(request, pk):
    plant = get_object_or_404(Plant, pk=pk, owner=request.user)
    plant.delete()
    messages.success(request, "Pflanze aus deiner Sammlung entfernt.")
    return redirect(reverse("botanic:index") + "?tab=plants")
