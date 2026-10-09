from .base import BaseHousingProvider


class KleinanzeigenProvider(BaseHousingProvider):
    name = "Kleinanzeigen"

    def search(self, search_profile):
        return []
