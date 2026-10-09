from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.views import View
from django.views.generic import CreateView, DeleteView, DetailView, ListView, UpdateView

from .forms import ApplicantProfileForm, ContactLogForm, ListingStatusForm, SearchProfileForm
from .models import ApplicantProfile, ContactLog, Listing, ListingStatus, SearchProfile
from .services.application import generate_cover_letter
from .services.scoring import price_label, scam_risk


@login_required
def dashboard(request):
    statuses = ListingStatus.objects.filter(user=request.user).select_related("listing")
    context = {
        "new_count": statuses.filter(status=ListingStatus.STATUS_NEW).count(),
        "favorite_count": statuses.filter(status=ListingStatus.STATUS_FAVORITE).count(),
        "active_profile_count": SearchProfile.objects.filter(user=request.user, is_active=True).count(),
        "last_profile_run": SearchProfile.objects.filter(user=request.user, last_run_at__isnull=False)
        .order_by("-last_run_at")
        .first(),
        "best_matches": statuses.order_by("-listing__score", "-created_at")[:5],
        "status_counts": statuses.values("status").annotate(total=Count("id")),
        "legal_notice": (
            "Die Nutzung externer Wohnungsportale muss deren Nutzungsbedingungen beachten. "
            "Wenn automatische Abfragen nicht erlaubt sind, soll eine offizielle API, RSS, "
            "E-Mail-Suchauftrag oder manuelle Importfunktion genutzt werden."
        ),
    }
    return render(request, "housing_search/dashboard.html", context)


class UserSearchProfileMixin(LoginRequiredMixin):
    model = SearchProfile
    form_class = SearchProfileForm

    def get_queryset(self):
        return SearchProfile.objects.filter(user=self.request.user)


class SearchProfileListView(UserSearchProfileMixin, ListView):
    template_name = "housing_search/searchprofile_list.html"
    context_object_name = "profiles"


class SearchProfileCreateView(UserSearchProfileMixin, CreateView):
    template_name = "housing_search/searchprofile_form.html"

    def form_valid(self, form):
        form.instance.user = self.request.user
        messages.success(self.request, "Suchprofil wurde erstellt.")
        return super().form_valid(form)


class SearchProfileUpdateView(UserSearchProfileMixin, UpdateView):
    template_name = "housing_search/searchprofile_form.html"

    def form_valid(self, form):
        messages.success(self.request, "Suchprofil wurde gespeichert.")
        return super().form_valid(form)


class SearchProfileDeleteView(UserSearchProfileMixin, DeleteView):
    template_name = "housing_search/searchprofile_confirm_delete.html"
    success_url = reverse_lazy("housing_search:search_profile_list")

    def form_valid(self, form):
        messages.success(self.request, "Suchprofil wurde geloescht.")
        return super().form_valid(form)


class SearchProfileToggleView(UserSearchProfileMixin, View):
    def post(self, request, *args, **kwargs):
        profile = get_object_or_404(SearchProfile, pk=kwargs["pk"], user=request.user)
        profile.is_active = not profile.is_active
        profile.save(update_fields=["is_active"])
        return redirect("housing_search:search_profile_list")


class ListingListView(LoginRequiredMixin, ListView):
    template_name = "housing_search/listing_list.html"
    context_object_name = "statuses"
    paginate_by = 20

    def get_queryset(self):
        queryset = ListingStatus.objects.filter(user=self.request.user).select_related("listing")
        status = self.request.GET.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-listing__score", "-created_at")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["status_choices"] = ListingStatus.STATUS_CHOICES
        context["active_status"] = self.request.GET.get("status", "")
        return context


class ListingDetailView(LoginRequiredMixin, DetailView):
    template_name = "housing_search/listing_detail.html"
    context_object_name = "listing_status"

    def get_queryset(self):
        return ListingStatus.objects.filter(user=self.request.user).select_related("listing")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        listing = self.object.listing
        context["form"] = ListingStatusForm(instance=self.object)
        context["contact_form"] = ContactLogForm()
        context["contact_logs"] = ContactLog.objects.filter(user=self.request.user, listing=listing)
        context["has_applicant_profile"] = ApplicantProfile.objects.filter(user=self.request.user).exists()
        context["price_label"] = price_label(listing)
        context["scam_risk"] = scam_risk(listing)
        return context


class ListingStatusUpdateView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        listing_status = get_object_or_404(
            ListingStatus.objects.select_related("listing"),
            pk=kwargs["pk"],
            user=request.user,
        )
        form = ListingStatusForm(request.POST, instance=listing_status)
        if form.is_valid():
            form.save()
            messages.success(request, "Status wurde aktualisiert.")
        else:
            messages.error(request, "Status konnte nicht gespeichert werden.")
        return HttpResponseRedirect(reverse("housing_search:listing_detail", kwargs={"pk": listing_status.pk}))


class ListingQuickStatusView(LoginRequiredMixin, View):
    allowed_statuses = {choice[0] for choice in ListingStatus.STATUS_CHOICES}

    def post(self, request, *args, **kwargs):
        listing_status = get_object_or_404(ListingStatus, pk=kwargs["pk"], user=request.user)
        status = kwargs["status"]
        if status in self.allowed_statuses:
            listing_status.status = status
            listing_status.save(update_fields=["status", "updated_at"])
        return redirect(request.POST.get("next") or "housing_search:listing_list")


class ContactLogCreateView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        listing_status = get_object_or_404(
            ListingStatus.objects.select_related("listing"),
            pk=kwargs["pk"],
            user=request.user,
        )
        form = ContactLogForm(request.POST)
        if form.is_valid():
            contact_log = form.save(commit=False)
            contact_log.user = request.user
            contact_log.listing = listing_status.listing
            contact_log.save()
            messages.success(request, "Kontakt wurde gespeichert.")
        else:
            messages.error(request, "Kontakt konnte nicht gespeichert werden.")
        return HttpResponseRedirect(reverse("housing_search:listing_detail", kwargs={"pk": listing_status.pk}))


class ApplicantProfileUpdateView(LoginRequiredMixin, UpdateView):
    model = ApplicantProfile
    form_class = ApplicantProfileForm
    template_name = "housing_search/applicantprofile_form.html"
    success_url = reverse_lazy("housing_search:dashboard")

    def get_object(self, queryset=None):
        profile, _ = ApplicantProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "full_name": self.request.user.get_full_name() or self.request.user.username,
                "email": self.request.user.email,
            },
        )
        return profile

    def form_valid(self, form):
        messages.success(self.request, "Bewerberprofil wurde gespeichert.")
        return super().form_valid(form)


class CoverLetterPreviewView(LoginRequiredMixin, DetailView):
    template_name = "housing_search/cover_letter_preview.html"
    context_object_name = "listing_status"

    def get_queryset(self):
        return ListingStatus.objects.filter(user=self.request.user).select_related("listing")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        applicant_profile = get_object_or_404(ApplicantProfile, user=self.request.user)
        context["applicant_profile"] = applicant_profile
        context["paragraphs"] = generate_cover_letter(applicant_profile, self.object.listing)
        return context

# Create your views here.
