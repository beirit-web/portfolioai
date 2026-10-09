class BaseHousingProvider:
    name = ""

    def search(self, search_profile):
        raise NotImplementedError
