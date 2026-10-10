from .base import BaseHousingProvider


class ImmobilienScoutProvider(BaseHousingProvider):
    name = "ImmobilienScout24"

    def search(self, search_profile):
        return []
