"""Page metadata for public plant information and private collection screens."""

from urllib.parse import urlencode

from django.conf import settings
from django.templatetags.static import static
from django.urls import reverse


PAGE_COPY = {
    "search": (
        "Pflanzen entdecken",
        "Entdecke Pflanzenarten im iNaturalist-Katalog und finde Pflegehinweise. "
        "Mit ENBT Botanic kannst du Pflanzen zu deiner persönlichen Sammlung hinzufügen.",
    ),
    "plants": (
        "Meine Pflanzen",
        "Verwalte deine persönliche Pflanzensammlung mit ENBT Botanic: "
        "Pflanzen hinzufügen, Standorte festhalten und individuelle Gießtermine im Blick behalten.",
    ),
    "watering": (
        "Gießplan",
        "Behalte deine individuellen Gießtermine mit ENBT Botanic im Blick: "
        "fällige Pflanzen anzeigen, Gießen dokumentieren und Termine bei Bedarf verschieben.",
    ),
    "weather": (
        "Wetter",
        "Wetter für Garten und Pflanzen in ENBT Botanic: "
        "Temperatur, Regenfenster, Sonnenzeiten und Vorhersage für deinen gewählten Ort.",
    ),
}


def build_page_metadata(request, context, status=200):
    tab = context.get("tab", "search")
    heading, description = PAGE_COPY.get(tab, PAGE_COPY["search"])
    plant, species = context.get("plant"), context.get("species")
    has_errors = any(
        form is not None and bool(form.errors)
        for form in (context.get("form"), context.get("search_form"))
    )
    public_collection_intro = tab == "plants" and not request.user.is_authenticated and plant is None
    noindex = (tab != "search" and not public_collection_intro) or plant is not None or request.method != "GET"
    noindex = noindex or status >= 400 or bool(context.get("api_error")) or has_errors

    if plant is not None:
        heading = "Pflanze bearbeiten"
        description = (
            "Bearbeite eine Pflanze in deiner persönlichen ENBT-Botanic-Sammlung: "
            "Standort, Notizen und Gießintervall anpassen und das Gießprotokoll ansehen."
        )
        path = reverse("botanic:edit", args=[plant.pk])
    elif species is not None:
        heading = species.name
        description = (
            f"{species.name} ({species.scientific_name}) in ENBT Botanic: "
            "Pflanzeninformationen und verfügbare Pflegehinweise ansehen "
            "und die Art zur persönlichen Sammlung hinzufügen."
        )
        path = reverse("botanic:species", args=[species.pk])
    elif request.resolver_match and request.resolver_match.url_name in {"species", "add"}:
        path = reverse("botanic:species", kwargs={"taxon_id": request.resolver_match.kwargs["taxon_id"]})
    elif tab == "weather":
        path = reverse("botanic:weather")
    else:
        params = {"tab": tab}
        form = context.get("search_form")
        if tab == "search" and form is not None and form.is_valid():
            query = form.cleaned_data["q"]
            page = form.cleaned_data["page"] or 1
            if query != "Monstera":
                params["q"] = query
            if page != 1:
                params["page"] = page
        path = f"{reverse('botanic:index')}?{urlencode(params)}"

    if context.get("api_error") or status >= 400:
        heading = "Pflanzenquelle nicht verfügbar"
        description = "Die Pflanzenquelle ist gerade nicht verfügbar. Versuche die Anfrage in ENBT Botanic später erneut."

    origin = settings.SITE_URL.rstrip("/")
    return {
        "title": f"{heading} | ENBT Botanic | Beirit Digital",
        "description": description,
        "canonical": f"{origin}{path}",
        "robots": "noindex, nofollow" if noindex else "index, follow",
        "image": f"{origin}{static('images/portfolio-covers/enbt-botanic-cover-v1-960.webp')}",
    }
