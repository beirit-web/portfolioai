from urllib.parse import urlencode


# Curated care guidance, separate from iNaturalist taxonomy; checked 2026-10-02.
CARE = {
    "monstera deliciosa": {
        "interval": 10, "range": "7–10 Tage", "source": "The Sill",
        "url": "https://www.thesill.com/blogs/plants-101/how-to-care-for-monstera-monstera-deliciosa",
        "note": "Erst gießen, wenn die oberen Zentimeter der Erde trocken sind. Bei weniger Licht verlängert sich der Abstand.",
    },
    "epipremnum aureum": {
        "interval": 10, "range": "7–14 Tage", "source": "The Sill",
        "url": "https://www.thesill.com/products/pothos-jade",
        "note": "Zwischen den Wassergaben antrocknen lassen. Ein heller Standort kann den Wasserbedarf erhöhen.",
    },
    "dracaena trifasciata": {
        "interval": 14, "range": "Etwa 14 Tage im Sommer, im Winter seltener", "source": "Berry College",
        "url": "https://www.berry.edu/studententerprises/_assets/Seasons-Harvest-Plant-Care-Guide.pdf",
        "note": "Erde zwischen den Wassergaben austrocknen lassen. Im Winter beschreibt die Quelle ein bis zwei Wassergaben im Monat.",
    },
    "goeppertia orbifolia": {
        "interval": None, "range": "Nach Erdfeuchte, kein fester Tagesabstand", "source": "RHS",
        "url": "https://www.rhs.org.uk/plants/calathea/growing-guide",
        "note": "Gleichmäßig leicht feucht halten, nicht vernässen. Im Winter die Oberfläche antrocknen lassen, den Ballen aber nicht vollständig austrocknen.",
    },
    "pilea peperomioides": {
        "interval": None, "range": "Nach Erdfeuchte, kein fester Tagesabstand", "source": "RHS",
        "url": "https://www.rhs.org.uk/plants/pilea/how-to-grow-pilea",
        "note": "Gießen, sobald die oberen Zentimeter der Erde antrocknen. Überschüssiges Wasser entfernen; im Winter meist weniger gießen.",
    },
    "ficus lyrata": {
        "interval": None, "range": "Nach Erdfeuchte, kein fester Tagesabstand", "source": "RHS Plants / Crocus",
        "url": "https://rhs.crocdn.co.uk/plants/_/ficus-lyrata/classid.2000047125/",
        "note": "Die oberen Zentimeter der Erde vor dem nächsten Gießen antrocknen lassen. Staunässe vermeiden.",
    },
}
CARE["sansevieria trifasciata"] = CARE["dracaena trifasciata"]
CARE["calathea orbifolia"] = CARE["goeppertia orbifolia"]


def care_for(species):
    return CARE.get(species.scientific_name.casefold())


def care_search_url(species):
    return "https://www.google.com/search?" + urlencode({"q": f"{species.scientific_name} Gießen Pflege"})
