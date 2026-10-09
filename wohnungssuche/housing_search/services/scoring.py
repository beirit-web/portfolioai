def calculate_score(search_profile, listing_data):
    score = 100

    warm_rent = listing_data.get("warm_rent") or listing_data.get("rent")
    if search_profile.max_rent and warm_rent:
        ratio = warm_rent / search_profile.max_rent
        if ratio > 1:
            score -= 35
        elif ratio > 0.9:
            score -= 10
        elif ratio < 0.75:
            score += 3

    size = listing_data.get("size")
    if search_profile.min_size and size and size < search_profile.min_size:
        score -= 20
    if search_profile.max_size and size and size > search_profile.max_size:
        score -= 8

    rooms = listing_data.get("rooms")
    if search_profile.min_rooms and rooms and rooms < search_profile.min_rooms:
        score -= 15
    if search_profile.max_rooms and rooms and rooms > search_profile.max_rooms:
        score -= 5

    preferred_cities = {city.casefold() for city in search_profile.city_list()}
    if preferred_cities and listing_data.get("city", "").casefold() not in preferred_cities:
        score -= 25

    amenities = ["pets_allowed", "balcony", "garden", "elevator", "barrier_free"]
    for amenity in amenities:
        if getattr(search_profile, amenity) and not listing_data.get(amenity):
            score -= 10
        elif listing_data.get(amenity):
            score += 2

    if search_profile.max_distance_km and listing_data.get("distance_km"):
        if listing_data["distance_km"] > search_profile.max_distance_km:
            score -= 15

    return max(0, min(100, int(score)))


def price_label(listing):
    value = listing.warm_rent_per_sqm
    if value is None:
        return "unbekannt"
    if value < 14:
        return "guenstig"
    if value <= 20:
        return "normal"
    return "teuer"


def scam_risk(listing):
    text = f"{listing.title} {listing.description}".casefold()
    warnings = 0
    if listing.warm_rent_per_sqm and listing.warm_rent_per_sqm < 8:
        warnings += 1
    if "kaution vor besichtigung" in text or "vorkasse" in text:
        warnings += 2
    if "telegram" in text or "whatsapp" in text:
        warnings += 1
    if not listing.address:
        warnings += 1
    if len(listing.description.strip()) < 40:
        warnings += 1

    if warnings >= 3:
        return "stark verdaechtig"
    if warnings:
        return "vorsicht"
    return "kein risiko erkannt"
