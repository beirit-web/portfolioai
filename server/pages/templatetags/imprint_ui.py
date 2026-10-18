"""Small, server-rendered legal example; no browser translation bundle needed."""

from copy import deepcopy
from functools import lru_cache
import json

from django import template
from django.conf import settings

register = template.Library()


@lru_cache(maxsize=3)
def imprint_copy(language):
    # Reuse the existing maintained legal translations, only the required subtree.
    source_language = language if language in {"de", "ru"} else "de"
    path = settings.SERVER_DIR / "assets" / "locales" / f"{source_language}.json"
    copy = deepcopy(json.loads(path.read_text(encoding="utf-8"))["imprintPage"]["sections"])
    if language == "ru":
        copy["notice"] = "Вымышленные примерные данные для демонстрации портфолио."
        copy["details"]["owner"] = "Пример владельца: Макс Мустерманн"
        copy["details"]["legal_form"]["value"] = "Демонстрационный проект"
        copy["tax"]["text_secondary"] = "Услуги не продаются, платежи не принимаются."
    elif language == "uk":
        copy["notice"] = "Вигадані приклади даних для демонстрації портфоліо."
        copy["details"].update(title="Відомості згідно з § 5 DDG", owner="Приклад власника: Макс Мустерманн", country="Німеччина")
        copy["details"]["legal_form"]["value"] = "Демонстраційний проєкт"
        copy["details"]["contact"] = {
            "label": "Контакт", "actions_label": "Способи зв'язку", "phone_aria": "Зателефонувати",
            "phone_link": "Телефон", "whatsapp_aria": "Відкрити WhatsApp Business", "whatsapp_link": "WhatsApp Business",
            "email_aria": "Відкрити контактну форму", "email_link": "Електронна пошта",
        }
        copy["purpose"] = {"title": "Сфера діяльності", "items": {
            "websites": "Сайти, вебзастосунки та цифрові проєкти", "development": "Веброзробка та розробка програмного забезпечення",
            "localization": "Локалізація та переклад текстів сайтів і програм за домовленістю",
        }}
        copy["tax"] = {"title": "Податок на додану вартість", "text_primary": copy["notice"], "text_secondary": "Послуги не продаються, платежі не приймаються."}
        copy["dispute"] = {"title": "Врегулювання споживчих спорів", "text": "Я не зобов'язаний і не готовий брати участь у врегулюванні спорів перед споживчим арбітражним органом."}
        copy["content_liability"] = {"title": "Відповідальність за зміст", "text": "Зміст цього сайту створено з великою ретельністю. Проте ми не можемо гарантувати правильність, повноту та актуальність інформації."}
        copy["link_liability"] = {"title": "Відповідальність за посилання", "text": "Цей сайт може містити посилання на зовнішні сайти третіх осіб. Я не впливаю на їхній зміст. За зміст пов'язаних сторінок відповідають відповідні постачальники або оператори."}
        copy["copyright"] = {"title": "Авторське право", "text": "Створені оператором зміст і твори на цьому сайті підпадають під німецьке авторське право. Відтворення, обробка, поширення та будь-яке використання поза межами авторського права потребують попередньої письмової згоди відповідного правовласника."}
    else:
        copy["notice"] = "Fiktive Musterangaben für die Portfolio-Demonstration."
        copy["tax"]["text_secondary"] = "Es werden keine Leistungen verkauft oder Zahlungen angeboten."
    return copy


@register.inclusion_tag("pages/impressum_content.html")
def imprint_content(language):
    return {"copy": imprint_copy(language)}
