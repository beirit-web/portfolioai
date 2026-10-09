from datetime import timedelta
import hashlib
from urllib.parse import urlencode

from django.conf import settings
from django.contrib import admin, messages
from django.contrib.admin.models import LogEntry
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.models import User
from django.db.models import Exists, OuterRef
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html, format_html_join
from django.utils.translation import gettext_lazy as _

from .models import (
    AccountDocument,
    AccountNotice,
    AnonymousClient,
    Appointment,
    CallbackRequest,
    ChatMessage,
    ChatReply,
    InterpreterApplication,
    Profile,
    Project,
    PaymentRequest,
    PayPalPayment,
    ServicePrice,
    UnavailableDay,
    WeatherSearch,
)


def _user_label(user):
    if not user:
        return "Unbekannt"
    if user.email:
        return f"{user.email} ({user.username})"
    return user.username


def _user_admin_link(user):
    if not user:
        return "Unbekannt"
    url = reverse("admin:auth_user_change", args=[user.pk])
    return format_html('<a href="{}">{}</a>', url, _user_label(user))


def _admin_url(url_name, *, query=None, args=None):
    url = reverse(url_name, args=args or ())
    if query:
        return f"{url}?{urlencode(query)}"
    return url


def _filtered_user_changelist(url_name, user):
    if not user:
        return ""
    return _admin_url(url_name, query={"user__id__exact": user.pk})


def _prefilled_notice_add_url(user, *, title="", text="", next_url=""):
    if not user:
        return ""
    query = {"user": user.pk}
    if title:
        query["title"] = title
    if text:
        query["text"] = text
    if next_url:
        query["next"] = next_url
    return _admin_url("admin:pages_accountnotice_add", query=query)


def _prefilled_reply_add_url(client_hash, *, text="", next_url=""):
    query = {"client_hash": client_hash}
    if text:
        query["text"] = text
    if next_url:
        query["next"] = next_url
    return _admin_url("admin:pages_chatreply_add", query=query)


def _account_mailbox_hash(user):
    normalized = (user.email or user.username or str(user.pk)).strip().lower().encode("utf-8")
    digest = hashlib.sha256(normalized).hexdigest()[:24]
    return f"acct-{user.pk}-{digest}"


def _workspace_links(user):
    if not user:
        return "Keine Benutzerzuordnung."

    profile = getattr(user, "profile", None)
    if profile:
        profile_url = _admin_url("admin:pages_profile_change", args=[profile.pk])
    else:
        profile_url = _admin_url("admin:pages_profile_add", query={"user": user.pk})

    links = [
        ("Profil", profile_url),
        ("Dokumente", _filtered_user_changelist("admin:pages_accountdocument_changelist", user)),
        ("Postfach", _filtered_user_changelist("admin:pages_chatmessage_changelist", user)),
        ("Kontonachrichten", _filtered_user_changelist("admin:pages_accountnotice_changelist", user)),
        ("Rückrufwünsche", _filtered_user_changelist("admin:pages_callbackrequest_changelist", user)),
    ]
    return format_html(
        '<div class="admin-workspace-links">{}</div>',
        format_html_join("", '<a href="{}">{}</a>', ((url, label) for label, url in links)),
    )


def _callback_sidebar_context(obj):
    if not obj or not obj.user_id:
        return {
            "mailbox_items": [],
            "document_items": [],
            "notice_items": [],
            "account_status": [],
            "sidebar_actions": [],
        }

    client_hash = _account_mailbox_hash(obj.user)
    profile = getattr(obj.user, "profile", None)
    if profile:
        profile_url = _admin_url("admin:pages_profile_change", args=[profile.pk])
    else:
        profile_url = _admin_url("admin:pages_profile_add", query={"user": obj.user.pk})
    mailbox_items = []
    incoming_messages = ChatMessage.objects.filter(
        user=obj.user,
        client_hash=client_hash,
    ).order_by("-created_at")[:4]
    outgoing_replies = ChatReply.objects.filter(client_hash=client_hash).order_by("-created_at")[:4]
    notice_items = AccountNotice.objects.filter(user=obj.user).order_by("-created_at")[:4]
    document_items = AccountDocument.objects.filter(user=obj.user).order_by("-created_at")[:4]

    for message in incoming_messages:
        mailbox_items.append(
            {
                "kind": "incoming",
                "label": "Nutzer-Nachricht",
                "text": message.text,
                "created_at": message.created_at,
                "meta": message.contact_email or obj.user.email or "",
                "url": _admin_url("admin:pages_chatmessage_change", args=[message.pk]),
            }
        )
    for reply in outgoing_replies:
        mailbox_items.append(
            {
                "kind": "reply",
                "label": "Antwort",
                "text": reply.text,
                "created_at": reply.created_at,
                "meta": "zugestellt" if reply.delivered else "neu im Postfach",
                "url": _admin_url("admin:pages_chatreply_change", args=[reply.pk]),
            }
        )

    mailbox_items.sort(key=lambda item: item["created_at"], reverse=True)

    return {
        "mailbox_items": mailbox_items[:6],
        "document_items": [
            {
                "label": document.title or document.file_name,
                "meta": document.file_name,
                "created_at": document.created_at,
                "url": _admin_url("admin:pages_accountdocument_change", args=[document.pk]),
            }
            for document in document_items
        ],
        "notice_items": [
            {
                "label": notice.title,
                "text": notice.text,
                "created_at": notice.created_at,
                "url": _admin_url("admin:pages_accountnotice_change", args=[notice.pk]),
            }
            for notice in notice_items
        ],
        "account_status": [
            {
                "label": "E-Mail",
                "value": obj.user.email or "Keine E-Mail hinterlegt",
            },
            {
                "label": "Standard-Rückrufnummer",
                "value": (
                    profile.callback_phone
                    if profile and profile.callback_phone
                    else "Nicht hinterlegt"
                ),
            },
            {
                "label": "Übliche Erreichbarkeit",
                "value": (
                    profile.callback_time_windows
                    if profile and profile.callback_time_windows
                    else "Nicht hinterlegt"
                ),
            },
            {
                "label": "E-Mail bei Antwort",
                "value": (
                    "Aktiv"
                    if profile and profile.notify_new_reply
                    else "Deaktiviert"
                ),
            },
            {
                "label": "E-Mail bei Kontonachricht",
                "value": (
                    "Aktiv"
                    if profile and profile.notify_new_message
                    else "Deaktiviert"
                ),
            },
            {
                "label": "E-Mail bei Terminänderung",
                "value": (
                    "Aktiv"
                    if profile and profile.notify_appointment_changes
                    else "Deaktiviert"
                ),
            },
        ],
        "sidebar_actions": [
            {"label": "Profil öffnen", "url": profile_url},
            {"label": "Dokumente öffnen", "url": _filtered_user_changelist("admin:pages_accountdocument_changelist", obj.user)},
            {"label": "Postfach öffnen", "url": _filtered_user_changelist("admin:pages_chatmessage_changelist", obj.user)},
            {"label": "Kontonachrichten öffnen", "url": _filtered_user_changelist("admin:pages_accountnotice_changelist", obj.user)},
        ],
    }


class UpcomingDateFilter(admin.SimpleListFilter):
    title = "Zeitraum"
    parameter_name = "window"

    def lookups(self, request, model_admin):
        return (
            ("today", "Heute"),
            ("next_7_days", "Nächste 7 Tage"),
            ("future", "Zukünftig"),
            ("past", "Vergangen"),
        )

    def queryset(self, request, queryset):
        today = timezone.localdate()
        value = self.value()
        if value == "today":
            return queryset.filter(date=today)
        if value == "next_7_days":
            return queryset.filter(date__gte=today, date__lte=today + timedelta(days=7))
        if value == "future":
            return queryset.filter(date__gte=today)
        if value == "past":
            return queryset.filter(date__lt=today)
        return queryset


class ReplyStateFilter(admin.SimpleListFilter):
    title = "Antwortstatus"
    parameter_name = "reply_state"

    def lookups(self, request, model_admin):
        return (
            ("pending", "Offene Antwort"),
            ("delivered", "Nur zugestellte Antworten"),
            ("none", "Ohne Antwort"),
        )

    def queryset(self, request, queryset):
        undelivered_replies = ChatReply.objects.filter(
            client_hash=OuterRef("client_hash"),
            delivered=False,
        )
        delivered_replies = ChatReply.objects.filter(
            client_hash=OuterRef("client_hash"),
            delivered=True,
        )
        queryset = queryset.annotate(
            _has_pending_reply=Exists(undelivered_replies),
            _has_delivered_reply=Exists(delivered_replies),
        )
        value = self.value()
        if value == "pending":
            return queryset.filter(_has_pending_reply=True)
        if value == "delivered":
            return queryset.filter(_has_pending_reply=False, _has_delivered_reply=True)
        if value == "none":
            return queryset.filter(_has_pending_reply=False, _has_delivered_reply=False)
        return queryset


@admin.register(InterpreterApplication)
class InterpreterApplicationAdmin(admin.ModelAdmin):
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_display = (
        "created_at",
        "contact",
        "display_name",
        "languages",
        "region",
        "specialization",
        "status",
    )
    list_editable = ("status",)
    list_filter = ("status", "created_at")
    list_select_related = ("user",)
    ordering = ("-created_at",)
    list_per_page = 50
    readonly_fields = ("created_at", "contact")
    search_fields = (
        "user__username",
        "user__email",
        "display_name",
        "languages",
        "region",
        "specialization",
        "experience",
        "availability",
        "motivation",
    )
    save_on_top = True
    fieldsets = (
        (
            "Kontakt",
            {
                "fields": (
                    "user",
                    "contact",
                    "display_name",
                    "status",
                )
            },
        ),
        (
            "Profil",
            {
                "fields": (
                    "languages",
                    "region",
                    "specialization",
                    "experience",
                    "availability",
                    "motivation",
                )
            },
        ),
        ("Protokoll", {"fields": ("created_at",), "classes": ("collapse",)}),
    )
    actions = ("approve_applications", "reject_applications", "mark_as_new")

    @admin.display(description="Benutzer", ordering="user__email")
    def contact(self, obj):
        return _user_admin_link(obj.user)

    @admin.action(description="Auswahl freigeben")
    def approve_applications(self, request, queryset):
        updated = queryset.update(status=InterpreterApplication.STATUS_APPROVED)
        self.message_user(request, f"{updated} Bewerbungen freigegeben.")

    @admin.action(description="Auswahl ablehnen")
    def reject_applications(self, request, queryset):
        updated = queryset.update(status=InterpreterApplication.STATUS_REJECTED)
        self.message_user(request, f"{updated} Bewerbungen abgelehnt.")

    @admin.action(description="Auswahl auf neu setzen")
    def mark_as_new(self, request, queryset):
        updated = queryset.update(status=InterpreterApplication.STATUS_NEW)
        self.message_user(request, f"{updated} Bewerbungen auf neu gesetzt.")


@admin.register(ServicePrice)
class ServicePriceAdmin(admin.ModelAdmin):
    list_display = ("sort_order", "title", "category", "price", "is_active", "updated_at")
    list_display_links = ("title",)
    list_editable = ("sort_order", "price", "is_active")
    list_filter = ("is_active", "category", "updated_at")
    search_fields = ("title", "included", "price", "category", "note")
    ordering = ("sort_order", "title")
    list_per_page = 50
    readonly_fields = ("updated_at",)
    save_on_top = True
    fieldsets = (
        (
            "Preisposition",
            {
                "fields": (
                    "is_active",
                    "sort_order",
                    "category",
                    "title",
                    "included",
                    "price",
                    "note",
                )
            },
        ),
        ("Protokoll", {"fields": ("updated_at",), "classes": ("collapse",)}),
    )


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_display = ("internal_reference", "title", "amount", "currency", "status", "customer_email", "paid_at", "created_at")
    list_filter = ("status", "currency", "created_at", "paid_at")
    list_editable = ("status",)
    search_fields = ("internal_reference", "title", "description", "customer_email", "user__username", "user__email")
    ordering = ("-created_at", "-id")
    readonly_fields = ("created_at", "updated_at", "paid_at")
    save_on_top = True
    fieldsets = (
        (
            "Zahlungsanforderung",
            {
                "fields": (
                    "status",
                    "internal_reference",
                    "title",
                    "description",
                    "amount",
                    "currency",
                    "customer_email",
                    "user",
                )
            },
        ),
        ("Protokoll", {"fields": ("created_at", "updated_at", "paid_at"), "classes": ("collapse",)}),
    )


@admin.register(PayPalPayment)
class PayPalPaymentAdmin(admin.ModelAdmin):
    date_hierarchy = "created_at"
    list_display = ("paypal_order_id", "internal_reference", "amount", "currency", "status", "paypal_capture_id", "payer_email", "paid_at")
    list_filter = ("status", "currency", "created_at", "paid_at")
    search_fields = ("paypal_order_id", "paypal_capture_id", "internal_reference", "payer_email", "payment_request__internal_reference")
    ordering = ("-created_at", "-id")
    readonly_fields = (
        "payment_request",
        "internal_reference",
        "paypal_order_id",
        "paypal_capture_id",
        "amount",
        "currency",
        "status",
        "payer_email",
        "raw_response",
        "created_at",
        "updated_at",
        "paid_at",
    )
    save_on_top = True


@admin.register(UnavailableDay)
class UnavailableDayAdmin(admin.ModelAdmin):
    autocomplete_fields = ("interpreter",)
    date_hierarchy = "date"
    list_display = ("date", "interpreter_link", "note", "created_at")
    list_filter = (UpcomingDateFilter, "interpreter")
    list_select_related = ("interpreter",)
    ordering = ("date",)
    list_per_page = 50
    readonly_fields = ("created_at",)
    search_fields = ("note", "interpreter__username", "interpreter__email")
    save_on_top = True

    @admin.display(description="Dolmetscher:in", ordering="interpreter__email")
    def interpreter_link(self, obj):
        if not obj.interpreter:
            return "Global"
        return _user_admin_link(obj.interpreter)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    autocomplete_fields = ("interpreter",)
    date_hierarchy = "date"
    list_display = (
        "date",
        "time_range",
        "interpreter_link",
        "subject",
        "username",
        "location",
        "short_note",
        "created_at",
    )
    list_filter = (UpcomingDateFilter, "interpreter")
    list_select_related = ("interpreter",)
    ordering = ("date", "start_time", "id")
    list_per_page = 50
    readonly_fields = ("created_at", "updated_at")
    save_on_top = True
    search_fields = (
        "subject",
        "username",
        "location",
        "note",
        "interpreter__username",
        "interpreter__email",
    )
    fieldsets = (
        (
            "Termin",
            {
                "fields": (
                    "interpreter",
                    "date",
                    ("start_time", "end_time"),
                    "location",
                    "subject",
                    "username",
                    "note",
                )
            },
        ),
        ("Protokoll", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Dolmetscher:in", ordering="interpreter__email")
    def interpreter_link(self, obj):
        if not obj.interpreter:
            return "Global"
        return _user_admin_link(obj.interpreter)

    @admin.display(description="Zeit")
    def time_range(self, obj):
        if obj.start_time and obj.end_time:
            return f"{obj.start_time:%H:%M} - {obj.end_time:%H:%M}"
        if obj.start_time:
            return f"ab {obj.start_time:%H:%M}"
        return "Ganztags"

    @admin.display(description="Notiz")
    def short_note(self, obj):
        note = (obj.note or "").strip()
        return f"{note[:60]}..." if len(note) > 60 else note or "—"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    change_list_template = "admin/pages/chat_list_refresh.html"
    date_hierarchy = "created_at"
    list_display = (
        "created_at",
        "lang",
        "user_link",
        "contact_email",
        "client_hash_short",
        "reply_state",
        "reply_link",
        "handled",
        "text_preview",
    )
    list_display_links = ("created_at", "text_preview")
    list_editable = ("handled",)
    list_filter = ("lang", "handled", ReplyStateFilter, "user")
    list_select_related = ("user",)
    ordering = ("-created_at",)
    list_per_page = 50
    readonly_fields = ("created_at", "reply_link", "reply_summary")
    save_on_top = True
    search_fields = ("text", "client_hash", "contact_email", "user__username", "user__email")
    actions = ("mark_handled", "mark_unhandled", "delete_selected")
    fieldsets = (
        (
            "Nachricht",
            {
                "fields": (
                    "created_at",
                    "handled",
                    "lang",
                    "user",
                    "contact_email",
                    "client_hash",
                    "text",
                    "reply_link",
                    "reply_summary",
                )
            },
        ),
    )

    def get_queryset(self, request):
        undelivered_replies = ChatReply.objects.filter(
            client_hash=OuterRef("client_hash"),
            delivered=False,
        )
        delivered_replies = ChatReply.objects.filter(
            client_hash=OuterRef("client_hash"),
            delivered=True,
        )
        return (
            super()
            .get_queryset(request)
            .select_related("user")
            .annotate(
                has_pending_reply=Exists(undelivered_replies),
                has_delivered_reply=Exists(delivered_replies),
            )
        )

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        if not obj.user:
            return "Gast"
        return _user_admin_link(obj.user)

    @admin.display(description="Client")
    def client_hash_short(self, obj):
        return obj.client_hash[:10]

    @admin.display(description="Antwort")
    def reply_state(self, obj):
        if getattr(obj, "has_pending_reply", False):
            return "Offen"
        if getattr(obj, "has_delivered_reply", False):
            return "Zugestellt"
        return "Keine"

    @admin.display(description="Text")
    def text_preview(self, obj):
        text = (obj.text or "").strip()
        return f"{text[:90]}..." if len(text) > 90 else text or "—"

    @admin.display(description="Aktion")
    def reply_link(self, obj):
        if not obj or not obj.client_hash:
            return "Nicht verfügbar"
        change_url = _admin_url("admin:pages_chatmessage_change", args=[obj.pk])
        url = _prefilled_reply_add_url(
            obj.client_hash,
            text="Danke für Ihre Anfrage. Ich prüfe das Anliegen und melde mich mit den nächsten Schritten.",
            next_url=change_url,
        )
        return format_html('<a class="admin-inline-action" href="{}">Antwort vorbereiten</a>', url)

    @admin.display(description="Antworten")
    def reply_summary(self, obj):
        replies = ChatReply.objects.filter(client_hash=obj.client_hash).order_by("-created_at")[:5]
        if not replies:
            return "Noch keine Antworten vorhanden."
        rows = []
        for reply in replies:
            state = "zugestellt" if reply.delivered else "offen"
            preview = reply.text[:80]
            rows.append(f"{reply.created_at:%d.%m.%Y %H:%M} [{state}] {preview}")
        return "\n".join(rows)

    @admin.action(description="Als erledigt markieren")
    def mark_handled(self, request, queryset):
        updated = queryset.update(handled=True)
        self.message_user(request, f"{updated} Einträge als erledigt markiert.")

    @admin.action(description="Als unerledigt markieren")
    def mark_unhandled(self, request, queryset):
        updated = queryset.update(handled=False)
        self.message_user(request, f"{updated} Einträge als unerledigt markiert.")


@admin.register(ChatReply)
class ChatReplyAdmin(admin.ModelAdmin):
    change_list_template = "admin/pages/chat_list_refresh.html"
    date_hierarchy = "created_at"
    list_display = (
        "created_at",
        "client_hash_short",
        "related_message_count",
        "delivered",
        "text_preview",
    )
    list_display_links = ("created_at", "text_preview")
    list_editable = ("delivered",)
    list_filter = ("delivered",)
    ordering = ("-created_at",)
    list_per_page = 50
    readonly_fields = ("created_at", "message_summary")
    save_on_top = True
    search_fields = ("client_hash", "text")
    actions = ("mark_delivered", "mark_undelivered", "delete_selected")
    fieldsets = (
        (
            "Antwort",
            {
                "fields": (
                    "created_at",
                    "client_hash",
                    "delivered",
                    "text",
                    "message_summary",
                )
            },
        ),
    )

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        client_hash = (request.GET.get("client_hash") or "").strip()
        if client_hash:
            initial["client_hash"] = client_hash
        text = (request.GET.get("text") or "").strip()
        if text:
            initial["text"] = text
        return initial

    @admin.display(description="Client")
    def client_hash_short(self, obj):
        return obj.client_hash[:10]

    @admin.display(description="Nachrichten")
    def related_message_count(self, obj):
        return ChatMessage.objects.filter(client_hash=obj.client_hash).count()

    @admin.display(description="Text")
    def text_preview(self, obj):
        text = (obj.text or "").strip()
        return f"{text[:90]}..." if len(text) > 90 else text or "—"

    @admin.display(description="Kontext")
    def message_summary(self, obj):
        messages_for_client = ChatMessage.objects.filter(client_hash=obj.client_hash).order_by("-created_at")[:5]
        if not messages_for_client:
            return "Keine zugehörigen Nachrichten gefunden."
        rows = []
        for message in messages_for_client:
            state = "erledigt" if message.handled else "offen"
            preview = message.text[:80]
            rows.append(f"{message.created_at:%d.%m.%Y %H:%M} [{state}] {preview}")
        return "\n".join(rows)

    @admin.action(description="Als zugestellt markieren")
    def mark_delivered(self, request, queryset):
        updated = queryset.update(delivered=True)
        self.message_user(request, f"{updated} Antworten als zugestellt markiert.")

    @admin.action(description="Als nicht zugestellt markieren")
    def mark_undelivered(self, request, queryset):
        updated = queryset.update(delivered=False)
        self.message_user(request, f"{updated} Antworten als nicht zugestellt markiert.")

    def response_add(self, request, obj, post_url_continue=None):
        next_url = (request.GET.get("next") or "").strip()
        if next_url and "_continue" not in request.POST and "_addanother" not in request.POST:
            ChatMessage.objects.filter(client_hash=obj.client_hash, handled=False).update(handled=True)
            self.message_user(request, "Antwort gespeichert und zugehörige offene Anfrage als erledigt markiert.")
            return HttpResponseRedirect(next_url)
        return super().response_add(request, obj, post_url_continue=post_url_continue)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    autocomplete_fields = ("user",)
    list_display = ("user_link", "has_image", "image_name", "image_mime", "image_size")
    list_filter = ("image_mime",)
    list_select_related = ("user",)
    readonly_fields = ("image_preview", "image_name", "image_mime", "image_size")
    search_fields = ("user__username", "user__email", "image_name", "image_mime")
    fieldsets = (
        (
            "Profil",
            {
                "fields": (
                    "user",
                    "image_preview",
                    "image_name",
                    "image_mime",
                    "image_size",
                    "callback_phone",
                    "callback_time_windows",
                    "notify_new_reply",
                    "notify_new_message",
                    "notify_appointment_changes",
                )
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        return _user_admin_link(obj.user)

    @admin.display(boolean=True, description="Bild")
    def has_image(self, obj):
        return bool(obj.image_data)

    @admin.display(description="Größe")
    def image_size(self, obj):
        if not obj.image_data:
            return "0 B"
        return f"{len(obj.image_data)} B"

    @admin.display(description="Vorschau")
    def image_preview(self, obj):
        if not obj.image_url:
            return "Kein Profilbild vorhanden."
        return format_html(
            '<img src="{}" alt="Profilbild" style="max-width: 9rem; border-radius: 1rem;">',
            obj.image_url,
        )


@admin.register(AccountDocument)
class AccountDocumentAdmin(admin.ModelAdmin):
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_display = ("created_at", "user_link", "title_or_name", "file_mime", "file_size")
    list_filter = ("file_mime", "created_at", "user")
    list_select_related = ("user",)
    search_fields = ("title", "file_name", "note", "user__username", "user__email")
    readonly_fields = ("created_at", "file_name", "file_mime", "file_size")
    list_per_page = 50

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        return _user_admin_link(obj.user)

    @admin.display(description="Dokument")
    def title_or_name(self, obj):
        return obj.title or obj.file_name


@admin.register(AccountNotice)
class AccountNoticeAdmin(admin.ModelAdmin):
    change_form_template = "admin/pages/accountnotice/change_form.html"
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_display = ("created_at", "user_link", "title", "text_preview")
    list_filter = ("created_at", "user")
    list_select_related = ("user",)
    search_fields = ("title", "text", "user__username", "user__email")
    readonly_fields = ("created_at", "workspace_links")
    list_per_page = 50
    fieldsets = (
        (
            "Kontonachricht",
            {
                "fields": (
                    "user",
                    "title",
                    "text",
                    "workspace_links",
                )
            },
        ),
        ("Protokoll", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        return _user_admin_link(obj.user)

    @admin.display(description="Text")
    def text_preview(self, obj):
        text = (obj.text or "").strip()
        return f"{text[:100]}..." if len(text) > 100 else text or "—"

    @admin.display(description="Arbeitsbereich")
    def workspace_links(self, obj):
        return _workspace_links(obj.user)

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        user_id = request.GET.get("user")
        if user_id:
            initial["user"] = user_id
        title = (request.GET.get("title") or "").strip()
        if title:
            initial["title"] = title
        text = (request.GET.get("text") or "").strip()
        if text:
            initial["text"] = text
        return initial

    def render_change_form(self, request, context, add=False, change=False, form_url="", obj=None):
        context["account_notice_back_url"] = request.GET.get("next", "")
        return super().render_change_form(request, context, add=add, change=change, form_url=form_url, obj=obj)

    def response_add(self, request, obj, post_url_continue=None):
        next_url = (request.GET.get("next") or "").strip()
        if next_url and "_continue" not in request.POST and "_addanother" not in request.POST:
            self.message_user(request, "Kontonachricht gespeichert und zum Arbeitskontext zurückgekehrt.")
            return HttpResponseRedirect(next_url)
        return super().response_add(request, obj, post_url_continue=post_url_continue)


@admin.register(CallbackRequest)
class CallbackRequestAdmin(admin.ModelAdmin):
    change_form_template = "admin/pages/callbackrequest/change_form.html"
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_display = (
        "created_at",
        "user_link",
        "phone",
        "status_badge",
        "scheduled_for_display",
        "time_windows_preview",
        "follow_up_link",
    )
    list_filter = ("status", "created_at", "scheduled_for", "user")
    list_select_related = ("user",)
    search_fields = ("phone", "time_windows", "note", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at", "workspace_links", "follow_up_link")
    fieldsets = (
        (
            "Rückrufwunsch",
            {
                "fields": (
                    "user",
                    "phone",
                    "time_windows",
                    "note",
                    "status",
                    "scheduled_for",
                )
            },
        ),
        (
            "Arbeitsablauf",
            {
                "fields": (
                    "follow_up_link",
                    "workspace_links",
                )
            },
        ),
        ("Protokoll", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    list_per_page = 50
    actions = ("mark_contacted", "mark_scheduled", "mark_completed", "mark_cancelled")

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        return _user_admin_link(obj.user)

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span class="admin-status-pill admin-status-pill--{}">{}</span>',
            obj.status,
            obj.get_status_display(),
        )

    @admin.display(description="Geplant", ordering="scheduled_for")
    def scheduled_for_display(self, obj):
        if not obj.scheduled_for:
            return "Noch offen"
        return timezone.localtime(obj.scheduled_for).strftime("%d.%m.%Y %H:%M")

    @admin.display(description="Zeitfenster")
    def time_windows_preview(self, obj):
        text = (obj.time_windows or "").strip()
        return f"{text[:80]}..." if len(text) > 80 else text or "—"

    @admin.display(description="Folgeaktion")
    def follow_up_link(self, obj):
        change_url = _admin_url("admin:pages_callbackrequest_change", args=[obj.pk])
        url = _prefilled_notice_add_url(
            obj.user,
            title=f"Rückmeldung zum Rückrufwunsch ({obj.phone})",
            text=(
                f"Status aktuell: {obj.get_status_display()}\n"
                f"Zeitfenster: {obj.time_windows}\n"
                f"Geplant für: {self.scheduled_for_display(obj)}"
            ),
            next_url=change_url,
        )
        return format_html('<a class="admin-inline-action" href="{}">Kontonachricht vorbereiten</a>', url)

    @admin.display(description="Arbeitsbereich")
    def workspace_links(self, obj):
        return _workspace_links(obj.user)

    def render_change_form(self, request, context, add=False, change=False, form_url="", obj=None):
        context["callback_notice_add_url"] = self.follow_up_link(obj) if obj else ""
        if obj:
            context["callback_notice_add_url"] = _prefilled_notice_add_url(
                obj.user,
                title=f"Rückmeldung zum Rückrufwunsch ({obj.phone})",
                text=(
                    f"Status aktuell: {obj.get_status_display()}\n"
                    f"Zeitfenster: {obj.time_windows}\n"
                    f"Geplant für: {self.scheduled_for_display(obj)}"
                ),
                next_url=_admin_url("admin:pages_callbackrequest_change", args=[obj.pk]),
            )
            context.update(_callback_sidebar_context(obj))
        return super().render_change_form(request, context, add=add, change=change, form_url=form_url, obj=obj)

    @admin.action(description="Als Kontakt aufgenommen markieren")
    def mark_contacted(self, request, queryset):
        updated = queryset.update(status=CallbackRequest.STATUS_CONTACTED)
        self.message_user(request, f"{updated} Rückrufwünsche auf 'Kontakt aufgenommen' gesetzt.")

    @admin.action(description="Als terminiert markieren")
    def mark_scheduled(self, request, queryset):
        updated = queryset.update(status=CallbackRequest.STATUS_SCHEDULED)
        self.message_user(request, f"{updated} Rückrufwünsche auf 'Termin geplant' gesetzt.")

    @admin.action(description="Als abgeschlossen markieren")
    def mark_completed(self, request, queryset):
        updated = queryset.update(status=CallbackRequest.STATUS_COMPLETED)
        self.message_user(request, f"{updated} Rückrufwünsche abgeschlossen.")

    @admin.action(description="Als abgebrochen markieren")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status=CallbackRequest.STATUS_CANCELLED)
        self.message_user(request, f"{updated} Rückrufwünsche abgebrochen.")


@admin.register(WeatherSearch)
class WeatherSearchAdmin(admin.ModelAdmin):
    autocomplete_fields = ("user",)
    date_hierarchy = "updated_at"
    list_display = ("updated_at", "user_link", "city_label", "query")
    list_filter = ("updated_at",)
    list_select_related = ("user",)
    search_fields = ("query", "city_label", "normalized_query", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at", "normalized_query")
    list_per_page = 50

    @admin.display(description="Benutzer", ordering="user__email")
    def user_link(self, obj):
        return _user_admin_link(obj.user)


@admin.register(AnonymousClient)
class AnonymousClientAdmin(admin.ModelAdmin):
    list_display = ("client_id", "first_seen_at", "last_seen_at", "last_intro_video_played_at")
    readonly_fields = ("client_id", "first_seen_at", "last_seen_at", "last_intro_video_played_at")
    search_fields = ("client_id",)
    ordering = ("-last_seen_at",)
    list_per_page = 50


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "sort_order",
        "title",
        "category",
        "status",
        "published",
        "featured",
        "live_link",
        "github_link",
        "updated_at",
    )
    list_display_links = ("title",)
    list_editable = ("sort_order", "published", "featured")
    list_filter = ("published", "featured", "status", "category")
    search_fields = ("title", "slug", "short_description", "description", "technologies", "category")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("image_preview", "created_at", "updated_at")
    ordering = ("sort_order", "title")
    list_per_page = 50
    fieldsets = (
        ("Basis", {
            "fields": (
                "title",
                "slug",
                "short_description",
                "description",
                "category",
                "status",
                "status_label",
            )
        }),
        ("Darstellung", {
            "fields": ("image", "image_url", "image_alt", "image_preview", "technologies", "features")
        }),
        ("Projektbeschreibung", {
            "fields": ("situation", "implementation", "result")
        }),
        ("Links", {
            "fields": ("live_url", "github_url")
        }),
        ("Veröffentlichung", {
            "fields": ("published", "featured", "sort_order", "created_at", "updated_at")
        }),
    )

    @admin.display(description="Vorschau")
    def image_preview(self, obj):
        image_url = obj.preview_image_url if obj else ""
        if not image_url:
            return "Kein Bild"
        return format_html(
            '<img src="{}" alt="" style="max-width: 260px; max-height: 150px; object-fit: contain; border-radius: 8px;" />',
            image_url,
        )

    @admin.display(description="Live")
    def live_link(self, obj):
        if not obj.live_url:
            return "-"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">öffnen</a>', obj.live_url)

    @admin.display(description="GitHub")
    def github_link(self, obj):
        if not obj.github_url:
            return "-"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">öffnen</a>', obj.github_url)


@admin.action(description="Benutzer deaktivieren")
def deactivate_users(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} Benutzer deaktiviert.")


@admin.action(description="Benutzer aktivieren")
def activate_users(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f"{updated} Benutzer aktiviert.")


@admin.action(description="Passwort-Reset-E-Mail senden")
def send_password_reset(modeladmin, request, queryset):
    emails = {user.email for user in queryset if user.email}
    if not emails:
        modeladmin.message_user(
            request,
            "Keine gültigen E-Mail-Adressen vorhanden.",
            level=messages.WARNING,
        )
        return

    count = 0
    for email in emails:
        form = PasswordResetForm({"email": email})
        if not form.is_valid():
            continue

        kwargs = {
            "use_https": (
                settings.PASSWORD_RESET_USE_HTTPS
                if settings.PASSWORD_RESET_USE_HTTPS is not None
                else request.is_secure()
            ),
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL", None),
            "email_template_name": "registration/password_reset_email.html",
        }
        if settings.PASSWORD_RESET_DOMAIN:
            kwargs["domain_override"] = settings.PASSWORD_RESET_DOMAIN
            kwargs["request"] = None
        else:
            kwargs["request"] = request
        form.save(**kwargs)
        count += 1

    modeladmin.message_user(
        request,
        f"Passwort-Reset-E-Mails an {count} Adresse(n) gesendet.",
    )


class BeiritDigitalUserAdmin(UserAdmin):
    actions = (deactivate_users, activate_users, send_password_reset)
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
        "last_login",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "groups", "date_joined")
    ordering = ("-date_joined",)
    list_per_page = 50
    search_fields = ("username", "first_name", "last_name", "email")


admin.site.unregister(User)
admin.site.register(User, BeiritDigitalUserAdmin)


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ("action_time", "user", "content_type", "object_repr", "action_flag")
    list_filter = ("action_flag", "content_type", "user")
    search_fields = ("object_repr", "change_message")
    date_hierarchy = "action_time"
    list_per_page = 50
    actions = ("delete_logs",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.action(description="Ausgewählte Protokolle löschen")
    def delete_logs(self, request, queryset):
        deleted = queryset.count()
        queryset.delete()
        self.message_user(request, f"{deleted} Einträge gelöscht.")


LogEntry._meta.verbose_name = "Admin-Protokoll"
LogEntry._meta.verbose_name_plural = "Admin-Protokolle"

admin.site.empty_value_display = "-"
admin.site.site_header = _("Beirit Digital Verwaltungs-Explorer")
admin.site.site_title = _("Verwaltungs-Explorer")
admin.site.index_title = _("Hierarchische Verwaltungsstruktur")
