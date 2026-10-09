from decimal import Decimal


def _city_matches(search_profile, listing_data):
    cities = {city.casefold() for city in search_profile.city_list()}
    return not cities or listing_data.get("city", "").casefold() in cities


def _between(value, minimum, maximum):
    if value is None:
        return False
    if minimum is not None and value < minimum:
        return False
    if maximum is not None and value > maximum:
        return False
    return True


def listing_matches(search_profile, listing_data):
    warm_rent = listing_data.get("warm_rent") or listing_data.get("rent")
    rooms = listing_data.get("rooms")
    size = listing_data.get("size")

    checks = [
        _city_matches(search_profile, listing_data),
        _between(warm_rent, search_profile.min_rent, search_profile.max_rent),
        _between(rooms, search_profile.min_rooms, search_profile.max_rooms),
        _between(size, search_profile.min_size, search_profile.max_size),
    ]
    if search_profile.pets_allowed:
        checks.append(bool(listing_data.get("pets_allowed")))
    if search_profile.balcony:
        checks.append(bool(listing_data.get("balcony")))
    if search_profile.garden:
        checks.append(bool(listing_data.get("garden")))
    if search_profile.elevator:
        checks.append(bool(listing_data.get("elevator")))
    if search_profile.barrier_free:
        checks.append(bool(listing_data.get("barrier_free")))
    if search_profile.max_distance_km is not None and listing_data.get("distance_km") is not None:
        checks.append(Decimal(listing_data["distance_km"]) <= Decimal(search_profile.max_distance_km))

    return all(checks)
