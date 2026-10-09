from django.db import transaction

from housing_search.models import Listing, ListingStatus


LISTING_FIELDS = {
    "title",
    "description",
    "rent",
    "warm_rent",
    "cold_rent",
    "additional_costs",
    "deposit",
    "rooms",
    "size",
    "city",
    "address",
    "latitude",
    "longitude",
    "source_name",
    "source_url",
    "external_id",
    "image_url",
    "property_type",
    "pets_allowed",
    "balcony",
    "garden",
    "elevator",
    "barrier_free",
    "distance_km",
    "score",
}


@transaction.atomic
def store_listing_for_user(user, listing_data):
    data = {key: value for key, value in listing_data.items() if key in LISTING_FIELDS}
    listing = _find_existing_listing(data)
    created = listing is None

    if listing is None:
        listing = Listing.objects.create(**data)
    else:
        for key, value in data.items():
            setattr(listing, key, value)
        listing.save()

    status, status_created = ListingStatus.objects.get_or_create(
        user=user,
        listing=listing,
        defaults={"status": ListingStatus.STATUS_NEW},
    )
    return listing, created, status, status_created


def _find_existing_listing(data):
    external_id = data.get("external_id")
    source_name = data.get("source_name")
    if external_id and source_name:
        listing = Listing.objects.filter(source_name=source_name, external_id=external_id).first()
        if listing:
            return listing

    source_url = data.get("source_url")
    if source_url:
        listing = Listing.objects.filter(source_url=source_url).first()
        if listing:
            return listing

    return Listing.objects.filter(
        title=data.get("title", ""),
        city=data.get("city", ""),
        warm_rent=data.get("warm_rent"),
        size=data.get("size"),
    ).first()
