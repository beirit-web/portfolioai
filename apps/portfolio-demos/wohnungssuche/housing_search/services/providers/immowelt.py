from .base import BaseHousingProvider


class ImmoweltProvider(BaseHousingProvider):
    name = "Immowelt"

    def search(self, search_profile):
        return []
