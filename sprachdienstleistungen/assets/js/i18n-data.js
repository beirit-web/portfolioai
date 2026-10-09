const cleanContactNote = (note) => {
  if (!note || /platzhalter|placeholder/i.test(note)) return "";
  return note;
};

const contactDefaults = Object.freeze({
  email: "max.mustermann@example.com",
  phone: "Nur nach Login sichtbar",
  landline: "",
  region: "Nach Login sichtbar",
  availability: "Nach Anmeldung sichtbar",
  note: cleanContactNote(""),
});

const RU_FALLBACK_TRANSLATIONS = Object.freeze({
  "Nur nach Login sichtbar": "Доступно после входа",
  "Nach Login sichtbar": "Доступно после входа",
  "Nach Anmeldung sichtbar": "Доступно после входа",
  "Mo. – Fr. 09:00–18:00 Uhr": "Пн–Пт 09:00–18:00",
  "Antwort in < 24 Stunden": "Ответ в течение < 24 часов",
  "Helmstedt · Persönliche Hilfe vor Ort": "Хельмштедт · Нижняя Саксония",
});

// Einfache Übersetzungs-Helfer, damit Standardwerte im RU-UI nicht deutsch bleiben.
const translateRuFallback = (value) => {
  if (!value) return value;
  const trimmed = value.trim();
  if (RU_FALLBACK_TRANSLATIONS[trimmed]) {
    return RU_FALLBACK_TRANSLATIONS[trimmed];
  }
  // Fuzzy contains to catch Varianten aus ENV (Spacing/nbsp)
  if (/hel mstedt|Helmstedt/i.test(trimmed)) {
    return "Хельмштедт · Нижняя Саксония";
  }
  if (/Fr\.\s*09:00|Mo.\s*–\s*Fr.|Mo\.\s*-\s*Fr\./i.test(trimmed)) {
    return "Пн–Пт 09:00–18:00";
  }
  if (/Antwort\s+in\s*<\s*24\s*Stunden/i.test(trimmed)) {
    return "Ответ в течение < 24 часов";
  }
  return trimmed;
};

const TRANSLATIONS = {
  de: {
    nav: {
      home: "Start",
      project: "Projekt",
      project_home: "Zur Projektstartseite",
      functions: "Funktionen",
      technology: "Technik",
      about_project: "Über das Projekt",
      account: "Mein Konto",
      interpreters: "Leistungen",
      prices: "Preise",
      interpreters_link_label: "Zu meinen Leistungen",
      interpreters_cube_front: "Telefonisch",
      interpreters_cube_right: "Online",
      interpreters_cube_left: "Mündlich",
      interpreters_cube_top: "Dokumente",
      interpreters_cube_bottom: "Kurzaufträge",
      interpreters_cube_caption: "Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      contact: "Kontakt",
      dashboard: "Dashboard",
      apply: "Als Dolmetscher bewerben",
      about: "Über",
      manual: "Handbuch",
      imprint: "Impressum",
      legal: "Nutzungsbedingungen",
      weather: "Wetter",
      scroll_top: "Seite nach oben scrollen",
    },
    home: {
      quicklinks: {
        manual_label: "Handbuch",
        manual_hint: "Handbuch öffnen",
        legal_label: "Nutzungsbedingungen",
        legal_hint: "Nutzung und Datenschutz",
      },
    },
    dashboard: {
      context: {
        aria_label: "Arbeitsbereich",
        kicker: "Arbeitsbereich",
        title: "Dolmetscher-Dashboard",
        nav_label: "Dashboard-Bereiche",
      },
      shortcuts: {
        section_label: "Dashboard",
        overview: "Überblick",
        planner: "Planung",
        agenda: "Agenda",
        contact_book: "Kontaktbuch",
        calendar: "Kalender",
      },
    },
    footer: {
      brand: "© 2026 Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      home_link: "Startseite",
      contact_link: "Kontakt",
      interpreters_link: "Leistungen",
      donate_link: "Spenden",
      manual_link: "Handbuch",
      account_link: "Mein Konto",
      dashboard_link: "Dashboard",
      apply_link: "Als Dolmetscher bewerben",
      weather_link: "Wetter",
      imprint_link: "Impressum",
      privacy_link: "Datenschutz",
      legal_link: "Nutzungsbedingungen",
      deploy_badge: "Update 02.04.2026: Service-Verzeichnis, gezielte Profilauswahl und Kalender-Markierungen für Wochenenden und Feiertage in Niedersachsen aktualisiert.",
    },
    email_contact: {
      kicker: "E-Mail-Kontakt",
      title: "E-Mail-Anbieter wählen",
      intro:
        "Kopieren Sie die Adresse oder öffnen Sie Ihren Webmail-Anbieter. Gmail, GMX, WEB.DE, Outlook und andere Anbieter können genutzt werden.",
      address_aria: "E-Mail-Adresse",
      recipient: "Empfänger",
      copy: "Kopieren",
      copied: "Kopiert",
      providers_aria: "E-Mail-Anbieter",
    },
    homeMain: {
      services: {
        title: "Wobei ich unterstütze",
        cards: [
          {
            title: "Telefonische Sprachmittlung",
            text:
              "Telefonische Sprachmittlung bei wichtigen Gesprächen. Der Anruf kann nach Absprache über mein Smartphone oder Festnetz geführt werden.",
          },
          {
            title: "Online-Sprachmittlung",
            text: "Sprachliche Unterstützung bei Video-Terminen und Online-Gesprächen.",
          },
          {
            title: "Persönliche Begleitung",
            text: "Begleitung bei persönlichen Terminen, beispielsweise bei Arztpraxen oder anderen Einrichtungen.",
          },
          {
            title: "Behörden & Einrichtungen",
            text: "Unterstützung bei Gesprächen mit Behörden, Jobcenter, Schulen und weiteren Einrichtungen.",
          },
        ],
      },
      prices: {
        title: "Preise",
        intro:
          "Klare Preise für Dolmetschen und Sprachmittlung. Besondere Anforderungen oder weitere Anfahrten werden vorab vereinbart.",
        groups: {
          interpreting: {
            title: "Telefonische Sprachmittlung",
            items: {
              phone: "Je angefangene Stunde: 10 €",
              online: "Persönliche und Online-Sprachmittlung: erste angefangene Stunde 20 €, jede weitere angefangene Stunde 15 €",
              on_site:
                "Telefonische Sprachmittlung wird getrennt mit 10 € je angefangene Stunde berechnet.",
            },
          },
        },
        note:
          "Persönliche Termine in Helmstedt und Umgebung. Weitere Orte nach Absprache.",
        examples: {
          title: "Preisbeispiele",
          items: {
            up_to_60: "Telefon bis 60 Minuten: 10 €",
            up_to_120: "Telefon 61–120 Minuten: 20 €",
            up_to_180: "Online/persönlich 121–180 Minuten: 50 €",
          },
        },
      },
      profile: {
        fallback_name: "Dolmetsch-Service Deutsch / Russisch",
        subtitle: "Persönlicher Dolmetsch-Service für Deutsch und Russisch",
        facts: {
          name: "Name",
          languages: "Sprachen",
          region: "Region",
          experience: "Erfahrung",
          availability: "Verfügbarkeit",
        },
        defaults: {
          name: "Auf Anfrage",
          languages: "Deutsch / Russisch",
          region: "Deutschlandweit",
          experience: "Persönliche Unterstützung bei wichtigen Anliegen",
          availability: "Nach Absprache",
        },
      },
      contact: {
        gmail: "max.mustermann@example.com",
        proton: "",
        whatsapp: "WhatsApp Business",
        signal: "",
        telegram: "",
        phone_label: "WhatsApp Business",
        phone_cta: "WhatsApp Business",
      },
    },
    weather: {
      kicker: "Wetter",
      title: "Aktuelles Wetter & Vorhersage",
      lead: "Einfache Wetterübersicht mit Standortsuche. Die App läuft vollständig im Browser.",
      widget_aria: "Wetteransicht",
      planning_title: "Wetter für Termine planen",
      planning_lead:
        "Aktuelle Lage, Regenfenster und 24-Stunden-Verlauf für eine schnelle Entscheidung vor dem Losgehen.",
      search_form_aria: "Wetter nach Ort suchen",
      recent_searches_aria: "Zuletzt gesuchte Orte",
      current_aria: "Aktuelle Wetterlage",
      default_not_loaded: "Wetter noch nicht geladen",
      load_button: "Wetter laden",
      loading_button: "Lädt…",
      refresh_button: "Wetter aktualisieren",
      search_label: "Ort suchen",
      search_placeholder: "Ort suchen (z. B. Helmstedt)",
      status_idle: "Ort eingeben und Wetter laden.",
      status_searching: "Ort wird gesucht…",
      status_loading: "Wetter wird geladen…",
      status_updated_live: "Aktualisiert",
      status_updated_cache: "Cache",
      status_no_result: "Kein Ort gefunden.",
      status_offline: "Keine Internetverbindung.",
      status_error: "Wetter konnte nicht geladen werden.",
      card_wind: "Wind",
      card_humidity: "Luftfeuchte",
      card_uv: "UV-Index",
      card_precip: "Regenrisiko",
      forecast_title: "5-Tage-Ausblick",
      forecast_note: "Temperatur und Regenrisiko",
      hourly_title: "Nächste 24 Stunden",
      today: "Heute",
      max_short: "Max",
      min_short: "Min",
      rain_suffix: "Regen",
      precip_short: "Regen",
      record_high: "Bisher am wärmsten",
      record_low: "Bisher am kältesten",
      summary_title: "Heute relevant",
      summary_default: "Heute keine auffälligen Wetterwerte.",
      summary_dry_until: "Voraussichtlich trocken bis",
      summary_rain_now: "Regen aktuell möglich",
      summary_rain_later: "Regen später wahrscheinlich",
      summary_wind: "Wind auffällig",
      summary_uv: "UV hoch",
      summary_cold: "Jacke sinnvoll",
      summary_hot: "Hitze einplanen",
      rain_window_title: "Regen-Zeitfenster",
      rain_window_dry: "In den nächsten 24 Stunden kaum Regen.",
      rain_window_peak: "Höchstes Risiko",
      sun_times_title: "Sonnenzeiten",
      sunrise: "Aufgang",
      sunset: "Untergang",
      daylight_hours: "Sonne",
      darkness_hours: "Dunkelheit",
      hours_short: "Std.",
      wind_calm: "ruhig",
      wind_breezy: "böig",
      wind_stormy: "stürmisch",
      humidity_dry: "trocken",
      humidity_ok: "angenehm",
      humidity_humid: "feucht",
      uv_low: "niedrig",
      uv_medium: "mittel",
      uv_high: "hoch",
      uv_unknown: "k.A.",
      precip_likely: "Regen wahrscheinlich",
      precip_low: "gering",
      weather_unknown: "unbekannt",
      saved_kicker: "Gespeichert",
      saved_title: "Meine Suchen",
      saved_searches_empty: "Noch keine Wetter-Suche gespeichert.",
      saved_searches_aria: "Gespeicherte Wetter-Suchen",
      saved_searches_status_saved: "Suche gespeichert.",
      saved_searches_status_deleted: "Suche gelöscht.",
      saved_searches_status_error: "Gespeicherte Suchen konnten nicht aktualisiert werden.",
      saved_searches_delete: "Suche löschen",
      glance_kicker: "Kurzblick",
      glance_title: "Heute im Blick",
      glance_item_rain: "Regenrisiko vor Terminen prüfen.",
      glance_item_metrics: "Wind, UV und Luftfeuchte schnell einschätzen.",
      glance_item_hourly: "Stündlichen Verlauf horizontal durchsehen.",
      region_kicker: "Region",
      region_title: "Letzte Orte",
      region_text: "Nach deiner ersten Suche erscheinen letzte Orte direkt als Schnellwahl.",
      data_kicker: "Daten",
      data_text: "Die letzte Suche wird lokal im Browser gemerkt. Wetterdaten werden bei Bedarf neu geladen.",
      planning_kicker: "Planung",
      before_departure_title: "Vor dem Losgehen",
      before_departure_text: "Temperatur, Sonnenzeiten und Regenfenster bleiben zusammen auf einer Ansicht.",
    },
    residence_page: {
      meta_title: "Aufenthaltstitel bis 04.03.2027 | Info",
      kicker: "§24 AufenthG · Ukraine",
      title: "Aufenthaltstitel gilt automatisch bis 04.03.2027",
      intro:
        "Stand 26.02.2026: Der vorübergehende Schutz wurde verlängert. Für viele Betroffene bedeutet das: kein neuer Antrag, kein neuer Termin, Rechte bleiben bestehen.",
      chips: [
        "Kein Antrag nötig",
        "Gültig bis 04.03.2027",
        "Arbeit und Leistungen bleiben",
      ],
      hero_panel: {
        kicker: "Sofort wichtig",
        facts: [
          "Kein Behördentermin nötig",
          "AZR wird automatisch aktualisiert",
          "Gilt auch bei alter Karte",
        ],
      },
      overview: {
        kicker: "Kurzüberblick",
        title: "Was das konkret bedeutet",
        cards: [
          {
            label: "Verlängerung",
            title: "Automatisch bis 04.03.2027",
            text: "Alle §24-Titel, die am 01.02.2026 gültig waren, laufen rechtlich weiter.",
          },
          {
            label: "Behörde",
            title: "Kein Antrag, kein Termin",
            text: "Die Verlängerung ist im Ausländerzentralregister hinterlegt.",
          },
          {
            label: "Rechte",
            title: "Bleiben erhalten",
            text: "Arbeit, Studium, Sozialleistungen, Kindergeld, Wohngeld und Krankenversicherung.",
          },
        ],
      },
      german: {
        kicker: "Deutsch",
        title: "Was das konkret bedeutet (DE)",
        items: [
          "Alle §24-Titel, die am 01.02.2026 gültig waren, verlängern sich automatisch bis 04.03.2027.",
          "Kein Antrag, kein Termin: Verlängerung ist im Ausländerzentralregister (AZR) hinterlegt.",
          "Rechte bleiben: Arbeit, Studium, Sozialleistungen (SGB II/XII), BAföG, Kindergeld, Wohngeld, Krankenversicherung.",
          "Keine neue Karte nötig: Auch mit abgelaufener Datumskarte bleibt der Titel rechtlich gültig.",
        ],
        note:
          "Wer nicht erfasst ist: Einreise nach dem 01.02.2026 oder kein gültiger §24-Titel am 01.02.2026. Dann bitte regulär bei der Ausländerbehörde beantragen.",
      },
      russian: {
        kicker: "Русский",
        title: "Кратко о продлении",
        date_note: "Повторное продление · 26.02.2026",
        intro:
          "Совет ЕС 15.07.2025 продлил временную защиту до 4 марта 2027. В Германии это действует с 28.10.2025 через «2. UkraineAufenthÄndFGV» (BMI).",
        items: [
          "Разрешения по §24, действовавшие на 01.02.2026, автоматически продлены до 04.03.2027.",
          "Заявление и личный визит не нужны; продление внесено в AZR, пограничные службы оповещены.",
          "Права сохраняются: работа, учёба, соцвыплаты (SGB II/XII), BAföG, Kindergeld, Wohngeld, медстрахование.",
          "Старые карты можно не менять: даже с истёкшей датой документ остаётся действительным.",
        ],
        note:
          "Не распространяется: въезд после 01.02.2026 или отсутствие действующего §24 на эту дату; Fiktionsbescheinigung по незавершённым заявлениям не продлевается автоматически.",
      },
      sources: {
        kicker: "Quellen & Links",
        title: "Originalquelle und weiterführende Infos",
        note:
          "Jobcenter informiert sich über das automatische AZR-Update; eine separate Bescheinigung der Ausländerbehörde ist nicht nötig.",
        links: {
          faq: "Germany4Ukraine – FAQ",
          bmi: "BMI / Germany4Ukraine Meldung (04.03.2027)",
          helmstedt: "Landkreis Helmstedt – Ausländerabteilung",
        },
      },
      audience: {
        kicker: "Einordnung",
        title: "Für wen ist die Info wichtig?",
        items: [
          "Menschen mit gültigem §24-Titel am 01.02.2026",
          "Arbeitgeber, Schulen, Jobcenter und Krankenkassen",
          "Familien, die nur eine abgelaufene Karte vorzeigen können",
        ],
      },
      sidebar: {
        memory_kicker: "Merken",
        memory_title: "Das Wichtigste in 20 Sekunden",
        timeline: [
          {
            date: "15.07.2025",
            text: "EU-Ratsbeschluss verlängert den vorübergehenden Schutz.",
          },
          {
            date: "28.10.2025",
            text: "Deutschland setzt die Verlängerung durch Verordnung um.",
          },
          {
            date: "04.03.2027",
            text: "Neues Enddatum für die automatische Gültigkeit.",
          },
        ],
        hint_kicker: "Hinweis",
        hint_title: "Wichtig bei Rückfragen",
        hint_text:
          "Wenn eine Stelle unsicher ist, helfen oft die Originalquelle oder der Hinweis auf das automatische AZR-Update. Eine neue Karte ist nicht in jedem Fall erforderlich.",
      },
    },
    ticker: {
      title: "Sprachen & Leistungen auf einen Blick",
      defaultService: "Dolmetschen & Begleitung",
    },
    womens_day: {
      kicker: "8. März · Weltfrauentag",
      title: "Ein herzlicher Gruß zum Weltfrauentag",
      lead: "Heute sage ich danke an Frauen, die mit Geduld, Herz und Stärke so viel für andere tragen und möglich machen.",
      note_label: "Interaktive Karte",
      note_text:
        "Klicken Sie in das Bild oder ziehen Sie die Trennkante, um die Farbe freizulegen.",
      slider: "Klicken oder ziehen",
      cta_page: "Zur Weltfrauentag-Seite",
      cta_home: "Zur Startseite",
      card: {
        headline: "Alles Liebe zum Weltfrauentag",
        subline:
          "Danke für Ihre Wärme, Ihre Geduld und all das Gute, das Sie jeden Tag weitergeben.",
      },
      page: {
        kicker: "Sonderseite",
        title: "Weltfrauentag 2026",
        intro:
          "Eine kleine Seite mit Blumen, Wärme und einem freundlichen Gruß zum 8. März.",
        pill_date: "8. März 2026",
        pill_note: "Ein kleiner warmer Gruß",
        cards: [
          {
            kicker: "Gedanke",
            title: "Ein Moment zum Innehalten",
            text: "Diese Seite ist einfach als freundlicher, schöner Moment gedacht – ohne Eile, ohne Lärm, nur mit etwas Farbe und Wertschätzung.",
          },
          {
            kicker: "Gruß",
            title: "Mit Respekt und Dankbarkeit",
            text: "Für alles, was Frauen im Alltag tragen, organisieren, trösten, aufbauen und mit Herz zusammenhalten.",
          },
        ],
      },
    },
    contact: {
      kicker: "Kontakt",
      title: "Kontakt",
      badge: "WhatsApp Business und E-Mail",
      login_prompt:
        "Sie können direkt Kontakt aufnehmen oder sich anmelden, um alle Funktionen zu nutzen.",
      login_text: "",
      register_hint: 'Neu hier? <a href="/register/">Registrieren</a>',
      notice_label: "Gemeinsame Sprache erforderlich",
      text: [
        "Schreiben Sie kurz, wobei Sie Unterstützung brauchen. Ich melde mich mit einer passenden Einschätzung und dem nächsten sinnvollen Schritt.",
        "Wichtige Kontaktwege finden Sie direkt hier. WhatsApp Business und E-Mail sind die zentralen Kontaktwege.",
      ],
      badges: [
        "Deutsch / Russisch",
        "Online und nach Absprache vor Ort",
        "Antwort zeitnah",
      ],
      secondary_label: "Kontaktwege",
      email_label: "Email",
      email_value: contactDefaults.email,
      phone_label: "WhatsApp Business",
      phone_value: "WhatsApp Business",
      landline_label: "",
      landline_value: "",
      availability_label: "Erreichbarkeit:",
      availability_value: contactDefaults.availability,
      region_label: "Region:",
      region_value: contactDefaults.region,
      quickactions: {
        email_label: "E-Mail",
        gmail: "max.mustermann@example.com",
        proton: "",
        whatsapp: "WhatsApp Business",
        landline_label: "",
        landline: "",
        signal: "",
        telegram: "",
      },
      map_kicker: "Karte",
      map_title: "Standort Musterstraße 1, 12345 Musterstadt",
      map_note: "Adresse wird aktuell ohne eingebettete Karte angezeigt.",
      note: contactDefaults.note,
    },
    login: {
      title: "Anmelden",
      lead: "Melden Sie sich an, um Kontaktinformationen zu sehen oder eine Bewerbung zu senden. Nach der Anmeldung öffnet sich der geschützte Bereich.",
      no_account_hint: "Noch kein Konto? Sie können sich direkt registrieren.",
      info_title: "Wichtige Hinweise",
      info_email_confirmed: "Ihre E-Mail-Adresse muss bestätigt sein.",
      info_register: "Neue Nutzer können sich direkt registrieren.",
      info_password_reset: "Wenn Sie Ihr Passwort vergessen haben, können Sie es sofort zurücksetzen.",
      info_idle_logout: "Aus Sicherheitsgründen erfolgt bei Inaktivität nach 10 Minuten eine automatische Abmeldung.",
      form_title: "Anmeldedaten",
      email_label: "E-Mail-Adresse",
      email_help: "Bitte verwenden Sie die E-Mail-Adresse, mit der Sie sich registriert haben.",
      password_label: "Passwort",
      password_show: "Passwort anzeigen",
      remember: "Angemeldet bleiben",
      remember_help:
        "Diese Option speichert Ihre Anmeldung auch nach dem Schließen des Browsers. Die automatische Abmeldung bei Inaktivität bleibt dennoch bestehen.",
      submit: "Anmelden",
      no_account: "Noch kein Konto?",
      register: "Registrieren",
      cancel: "Abbrechen",
      forgot: "Passwort vergessen?",
      reset: "Passwort zurücksetzen",
    },
    password_reset: {
      title: "Passwort zurücksetzen",
      subtitle:
        "Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen.",
      email_label: "E-Mail-Adresse",
      submit: "Link senden",
      back_login: "Zurück zum Login",
    },
    password_reset_done: {
      title: "E-Mail gesendet",
      subtitle:
        "Wenn ein Konto mit dieser E-Mail existiert, wurde Ihnen ein Link zum Zurücksetzen gesendet.",
      back_login: "Zurück zum Login",
    },
    password_reset_confirm: {
      title: "Neues Passwort setzen",
      new_password: "Neues Passwort",
      confirm_password: "Passwort bestätigen",
      submit: "Speichern",
      invalid_title: "Link ungültig",
      invalid_text: "Dieser Link ist abgelaufen oder unvollständig.",
      request_new: "Neuen Link anfordern",
      back_login: "Zurück zum Login",
    },
    password_reset_complete: {
      title: "Passwort geändert",
      subtitle: "Sie können sich jetzt mit Ihrem neuen Passwort anmelden.",
      back_login: "Zum Login",
      login: "Zum Login",
    },
    password_reset_invalid: {
      title: "Link ungültig",
      subtitle:
        "Der Reset-Link ist abgelaufen oder ungültig. Fordern Sie einfach einen neuen an.",
      retry: "Neuen Link anfordern",
    },
    hero: {
      kicker: "Deutsch ↔ Russisch",
      title: "Dolmetsch- & Sprachdienstleistungen",
      highlight: "",
      subtitle:
        '<span class="hero-subtitle__language">deutsch</span><span class="hero-subtitle__arrow" aria-hidden="true">⇄</span><span class="hero-subtitle__language">russisch</span>',
      seo_intro:
        "Persönliche Sprachmittlung bei Terminen, Telefonaten und Online-Gesprächen - vor Ort in Musterstadt und Umgebung sowie deutschlandweit online.",
      region: "",
      domain_notice_title: "Hinweis zur Domain",
      domain_notice_html:
        "Die aktuelle Adresse ist sprachservice.example.com. Die bisherige Domain portfolio.example.com wird auf die neue Sprachservice-Adresse weitergeleitet.",
      button_primary: "Kontakt aufnehmen",
      button_secondary: "Per WhatsApp schreiben",
      cta: {
        primary: "Kontakt aufnehmen",
        secondary: "Per WhatsApp schreiben",
        badges: ["Termin nach Absprache"],
      },
      portrait: {
        controls_label: "Foto-Aktionen",
        flip_label: "Foto umdrehen",
        weekdays_label: "Verfügbarkeitstage anzeigen",
        hours_label: "Erreichbarkeit anzeigen",
        channels_label: "Kontaktwege anzeigen",
        back_kicker: "Deutsch / Russisch",
        back_name: "Eugen Beirit",
        back_role: "Dolmetsch- & Sprachdienstleistungen",
        back_detail: "Telefon · Online · Vor Ort",
        weekdays_kicker: "Erreichbarkeit",
        weekdays_text: "Außer Wochenenden und Feiertage",
        hours_kicker: "Zeiten",
        hours_text: "erreichbar von 09:00 bis 18:00",
        channels_kicker: "Kontaktwege",
        channels_text: "WhatsApp Business und E-Mail",
        landline: "",
      },
    },
    benefits: {
      kicker: "Kurzinfos",
      title: "Klar strukturiert. Persönlich begleitet.",
      badge: "Ruhig, modern und serviceorientiert",
      cards: [
        {
          title: "Deutschlandweit",
          text: "Online und nach Absprache vor Ort",
        },
        {
          title: "Deutsch / Russisch",
          text: "Klare Unterstützung ohne unnötige Umwege",
        },
        {
          title: "Telefon · Online · Vor Ort",
          text: "Sprachmittlung bei Gesprächen und Terminen",
        },
        {
          title: "Schneller Kontakt",
          text: "WhatsApp Business und E-Mail",
        },
      ],
    },
    home: {
      account: {
        aria_label: "Ihr Bereich",
        kicker: "Ihr Bereich",
        role: "Profil und Kontoeinstellungen an einem Ort",
        points: [
          "Profilbild und persönliche Daten im Benutzerbereich verwalten",
          "Kontodaten und Profilbild zentral pflegen",
        ],
        primary_title: "Profil bearbeiten",
        primary_meta: "Bild, Daten und Kontoeinstellungen verwalten",
        delete_account: "Konto löschen",
        delete_account_title: "Konto dauerhaft löschen",
        delete_account_meta: "Nicht rückgängig machbar",
        footer: {
          messages: "Nachrichten",
          replies_saved: "Antworten gespeichert",
          last_message: "Letzte Nachricht",
          no_history: "Noch keine Nachrichten",
        },
      },
    },
    profile: {
      title: "Ihr Begleiter durch den Papierdschungel",
      role: "Dolmetschen · Sprachmittlung · Deutsch/Russisch",
      points: [
        "Praxis-Erfahrung mit Jobcenter, Krankenkassen & Bürgeramt",
        "Unterstützung für Kriegsgeflüchtete & Menschen mit Sprachbarrieren",
        "Ruhige, strukturierte Begleitung – auch bei schweren Fällen",
      ],
      meta: ["Termin nach Absprache"],
      tags: "Deutsch & Russisch",
      location: "Helmstedt · Persönliche Hilfe vor Ort",
    },
    services: {
      kicker: "Leistungen",
      title: "Sprachmittlung direkt anfragen",
      badge: "Aktuell online verfügbare Services",
      intro: "",
      directory_card: {
        title: "Services und Dolmetscher auswählen",
        text: "Öffne zuerst die separate Auswahlseite, vergleiche Angebote und gehe dann zum passenden Profil für die Kontaktaufnahme.",
        meta: "Zur Auswahlseite",
      },
      cards: [
        {
          title: "Telefonische Sprachmittlung",
          text:
            "Telefonische Sprachmittlung bei wichtigen Gesprächen. Der Anruf kann nach Absprache über mein Smartphone oder Festnetz geführt werden.",
          meta: "Telefonate nach Absprache",
        },
        {
          title: "Online-Sprachmittlung",
          text: "Sprachliche Unterstützung bei Video-Terminen und Online-Gesprächen.",
          meta: "Deutschlandweit online",
        },
        {
          title: "Termine & Gespräche",
          text: "Begleitung bei persönlichen Terminen, beispielsweise bei Arztpraxen oder anderen Einrichtungen.",
          meta: "Vor Ort oder online nach Absprache",
        },
        {
          title: "Behörden & Einrichtungen",
          text: "Unterstützung bei Gesprächen mit Behörden, Jobcenter, Schulen und weiteren Einrichtungen.",
          meta: "Helmstedt und Umgebung",
        },
      ],
    },
    human_translators: {
      kicker: "Vertrauen",
      title: "Warum persönliche Unterstützung wichtig ist",
      badge: "Besonders bei sensiblen Anliegen",
      intro: [
        "Bei sensiblen oder offiziellen Gesprächen reicht automatische Übertragung oft nicht aus.",
        "Gerade bei Behörden, Terminen und wichtigen Gesprächen sind Vertraulichkeit, Genauigkeit und direktes Verständnis besonders wichtig.",
      ],
      benefits_title:
        "Vorteile persönlicher Sprachmittlung:",
      benefits: [
        "Datenschutzkonforme Kommunikation ohne Weitergabe sensibler Inhalte an Dritte",
        "Sorgfältige und verständliche Sprachmittlung",
        "Persönliche Begleitung bei komplexen Gesprächen",
        "Vermeidung von Missverständnissen in wichtigen Situationen",
      ],
      recommended_title:
        "Persönliche Sprachmittlung ist insbesondere empfehlenswert bei:",
      recommended: [
        "Behörden",
        "Arzttermine",
        "Einrichtungen",
        "Online-Terminen",
        "Wichtige Gespräche",
      ],
      note_label: "Fazit",
      outro:
        "Automatische Übertragung kann unterstützen, ersetzt aber nicht Vertraulichkeit, Genauigkeit und direkte Verständigung.",
    },
    interpreters: {
      hero: {
        pill: "Direkte Unterstützung",
        title: "Ein Ansprechpartner. Direkte Hilfe.",
        intro:
          "Hier geht es direkt zu meinem Angebot. Ich unterstütze persönlich bei Gesprächen, Telefonaten, Online-Terminen und Terminen vor Ort.",
        list: [
          "Leistungen, Sprachen und Einsatzbereiche auf einen Blick.",
          "Direkter Weg zum Kontakt ohne Umweg über ein Verzeichnis.",
          "Anliegen und Termine können direkt mit mir abgestimmt werden.",
        ],
        cta_list: "Leistungen ansehen",
        cta_apply: "Als Dolmetscher:in bewerben",
      },
      card: {
        filter_region_label: "Region (optional)",
        filter_language_label: "Sprachen (optional)",
        filter_region_placeholder: "z. B. Berlin, NRW",
        filter_language_placeholder: "z. B. Arabisch, Russisch",
        filter_submit: "Filtern",
        filter_reset: "Zurücksetzen",
        languages_label: "Sprachen",
        region_label: "Region",
        experience_label: "Erfahrung",
        availability_label: "Verfügbarkeit",
        message_placeholder: "Ihre Nachricht",
        send_button: "Nachricht senden",
        empty: "Keine Dolmetscher:innen gefunden.",
        login_hint: "Bitte anmelden, um Kontakt aufzunehmen.",
        calendar_title: "Kalender",
        calendar_nav_label: "Kalendernavigation",
        calendar_prev_month: "Voriger Monat",
        calendar_next_month: "Nächster Monat",
        calendar_overview_label: "Kalenderübersicht",
        calendar_legend_free: "frei",
        calendar_legend_busy: "belegt",
        calendar_legend_blocked: "gesperrt",
        calendar_legend_weekend: "Wochenende",
        calendar_legend_holiday: "Feiertag Niedersachsen",
        calendar_tap_hint:
          "Tag antippen, um freie und belegte Zeiten zu sehen.",
        calendar_note: "Termine nach Absprache. Verfügbarkeit bitte anfragen.",
        calendar_day_blocked: "Gesperrt",
        calendar_day_free: "Frei",
        calendar_day_free_hint: "Termin kann angefragt werden.",
        calendar_day_busy_fallback: "Belegt",
        hint: "Profile werden alphabetisch sortiert angezeigt. Kontakt und Profilbilder nur für angemeldete Nutzer:innen.",
      },
    },
    apply: {
      badge: "Dolmetscher:in werden",
      title: "Bewerbung einreichen",
      subtitle:
        "Sprachen, Region und ein kurzer Hintergrund reichen für den ersten Eindruck.",
      hero: {
        chip_time: "Formular ausfüllen",
        chip_review: "Prüfung vor Freigabe",
        chip_status: "Status im Konto",
        value_1_title: "Klare Sichtbarkeit",
        value_1_text:
          "Auftraggeber:innen sehen Ihre Sprachen, Region und Schwerpunkte auf einen Blick.",
        value_2_title: "Kontrollierte Freigabe",
        value_2_text:
          "Jede Bewerbung wird geprüft, bevor das Profil öffentlich erscheint.",
        value_3_title: "Später aktualisierbar",
        value_3_text:
          "Verfügbarkeit, Foto und Angaben können Sie später weiter pflegen.",
      },
      process: {
        kicker: "Ablauf",
        step_1: "Konto öffnen und Bewerbungsformular ausfüllen.",
        step_2: "Sprachen, Region und Fachgebiet angeben.",
        step_3: "Optional Foto und Verfügbarkeit ergänzen.",
        step_4:
          "Nach Prüfung wird das Profil freigegeben oder mit Status zurückgemeldet.",
      },
      submitted: {
        title: "Bewerbung gesendet",
        text: "Danke! Ihre Angaben sind eingegangen und Sie dürfen schon als Dolmetscher los legen.",
      },
      form: {
        kicker: "Bewerbungsformular",
        note:
          "Für den Start reichen die wichtigsten Angaben. Ihre E-Mail-Adresse bleibt mit Ihrem Konto verknüpft und wird nicht aus diesem Formular öffentlich angezeigt.",
        display_name: "Name oder Firma (öffentliche Anzeige)",
        languages: "Sprachen (z. B. DE/RU)",
        region: "Region / Ort",
        specialization: "Fachgebiet (optional)",
        experience: "Erfahrung / Zertifikate (optional)",
        availability: "Verfügbarkeit (optional)",
        motivation: "Kurzbeschreibung",
        motivation_hint:
          "Empfohlen: Sprachkombination, Einsatzorte, Erfahrung und typische Termine kurz nennen.",
        photo_label: "Profilfoto (optional)",
        photo_hint:
          "Ein freundliches, klares Foto erhöht Vertrauen. Sie können auch ohne Foto starten.",
        submit: "Bewerbung senden",
        submit_note:
          "Mit dem Absenden bestätigen Sie, dass Ihre Angaben für die Profilprüfung gespeichert werden dürfen.",
      },
      latest: {
        title: "Letzte Bewerbung",
        text: "Eingereicht – Status:",
      },
      sidebar: {
        kicker: "Vor dem Absenden",
        item_1:
          "Nutzen Sie einen Namen, unter dem Sie später gefunden werden möchten.",
        item_2: "Schreiben Sie Sprachen und Regionen möglichst konkret.",
        item_3:
          "Nennen Sie Sprachkombinationen, Regionen und typische Einsatzbereiche.",
        item_4:
          "Kurze, konkrete Beschreibungen wirken stärker als allgemeine Aussagen.",
        example_title: "Gutes Kurzprofil",
        example_text:
          "DE/RU, Berlin und Brandenburg, Schwerpunkt Arzttermine und Behörden. Seit 4 Jahren im Einsatz, auch kurzfristige Einsätze nach Absprache möglich.",
        visibility_title: "Sichtbarkeit",
        visibility_text:
          "Vor Freigabe bleibt Ihr Eintrag intern. Erst nach Prüfung wird das Profil in der Dolmetscherliste angezeigt.",
      },
    },
    steps: {
      kicker: "Ablauf",
      title: "So funktioniert es",
      badge: "In 3 klaren Schritten",
      intro: "",
      items: [
        {
          title: "Anfrage senden",
          text: "Schreib kurz, wobei du Unterstützung brauchst.",
        },
        {
          title: "Rückmeldung erhalten",
          text: "Ich melde mich mit einer passenden Einschätzung.",
        },
        {
          title: "Unterstützung nutzen",
          text: "Telefonisch, online oder nach Absprache persönlich bei Terminen und Gesprächen.",
        },
      ],
    },
    calendar: {
      kicker: "Verfügbarkeit",
      title: "Monatskalender für freie Tage",
      badge: "Monatsübersicht, keine Online-Buchung",
      home: {
        kicker: "Kalender",
        title: "Verfügbarkeit auf einen Blick",
        badge: "Frei, belegt oder gesperrt",
        intro:
          "Der Kalender ist auf dieser Seite für alle sichtbar. Angemeldete Nutzer sehen dabei denselben Kalender wie Gäste.",
        detail_title: "Tag auswählen",
        detail_note:
          "Wählen Sie einen Tag im Kalender, um die Details hier zu sehen.",
        detail_action: "Details anzeigen",
        legend: {
          free: "Frei",
          busy: "Belegt",
          unavailable: "Gesperrt",
          holiday: "Feiertag",
        },
      },
      intro:
        "Sehen Sie auf einen Blick, wann Kapazitäten frei sind. Die Buchung erfolgt weiterhin persönlich per Telefon oder Nachricht.",
      intro_login_hint: "Bitte anmelden, um den Kalender zu sehen.",
      register_hint: 'Neu hier? <a href="/register/">Registrieren</a>',
      legend: {
        free: "Frei",
        busy: "Teilweise belegt",
        blocked: "Tag nicht verfügbar",
        holiday: "Sonntag/Feiertag (Niedersachsen)",
      },
      modal: {
        kicker: "Tagesübersicht",
        unavailable: "Keine Termine verfügbar.",
        no_events: "Keine Termine eingetragen.",
      },
      status: {
        upcoming: "Anstehende Termine",
        busy: "Belegt",
        free: "Frei",
        unavailable: "Tag nicht verfügbar",
        no_slots: "Keine freien Termine verfügbar",
      },
      note: {
        saturday: "Samstags 09:00–11:00 frei, danach nicht verfügbar.",
        sunday: "Sonntags: nicht verfügbar.",
      },
    },
    about: {
      kicker: "Über",
      title: "Wer hinter diesem Angebot steht",
      text: [
        "Ich heiße Eugen und kenne die deutsche Bürokratie sowohl aus eigener Erfahrung als auch aus vielerlei Begleitungen – insbesondere von Menschen, die durch Flucht, Krankheit oder Lebensumbrüche zusätzlich belastet sind.",
        "Mir ist wichtig, dass Sie sich nicht dumm oder schuldig fühlen müssen, nur weil Briefe unverständlich sind oder Anträge kompliziert wirken. Ich begleite Sie auf Augenhöhe – ruhig, strukturiert und ohne Druck.",
        "Ich bin am 09.09.1981 in Kasachstan geboren, mit 15 nach Deutschland gekommen und lebe seit Sommer 1997 hier. Seit rund 30 Jahren in Deutschland und mit langjähriger Alltagserfahrung in deutscher und russischer Sprache unterstütze ich Menschen bei sprachlicher Verständigung.",
      ],
      facts: [
        "Unterstützung in Deutsch & Russisch",
        "Besonderer Fokus auf Kriegsgeflüchtete und Menschen mit Sprachbarrieren",
        "Langjährige Alltagserfahrung in deutscher und russischer Sprache",
        "Geduldig, praxisorientiert, lösungsfokussiert",
        "Sprachliche Begleitung bei Gesprächen, Terminen und Telefonaten",
      ],
    },
    aboutPage: {
      lead: "Hintergrund, Motivation und Erfahrung im Detail.",
      story_title: "Mein Weg",
      facts_title: "Eckdaten",
      back: "Zurück zur Startseite",
      contact: "Kontakt aufnehmen",
      cta: "Mehr über mich",
      portfolio: {
        title: "Schwerpunkt & Erfahrung",
        p0: "",
        p1: "Mein Schwerpunkt auf dieser Website ist Deutsch-Russisch-Sprachmittlung bei Gesprächen, Terminen, Telefonaten und Online-Gesprächen.",
        p2: "<strong>Hinweis:</strong> Diese Website ist ausschließlich ein Angebot für Dolmetsch- und Sprachdienstleistungen.",
        p3: "Langfristig möchte ich Bot-Teams als digitale Kollegen etablieren: Jeder Mensch behält seine Rolle, bekommt aber 1–2 Wochen Schulung, um sein eigenes Bot-Team zu führen. So entstehen Entlastung und neue Effizienz, ohne Menschen zu ersetzen.",
        cta_primary: "Kontakt aufnehmen",
        cta_secondary: "Projekt unterstützen (Spende)",
      },
    },
    donate: {
      title: "Projekt unterstützen",
      kicker: "Unterstützen",
      heading: "Projekt unterstützen (Spende)",
      lead: "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      note: "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      methods_title: "So läuft die Spendenabsprache",
      methods_contact_lead: "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      methods_contact_suffix:
        "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      methods_manual:
        "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      methods_receipt:
        "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      info_no_account:
        "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      info_receipt:
        "PayPal und echte Zahlungen sind in diesem Portfolio deaktiviert.",
      donor_stats_label: "Bereits unterstützt:",
      donor_stats_suffix: "Personen.",
      cta_contact: "Kontakt aufnehmen",
      cta_back: "Zurück zur Startseite",
    },
    support: {
      kicker: "Unterstützung bei Behörden und Anträgen",
      title: "Verständlich machen, was Ämter verlangen",
      intro: [
        "Ich unterstütze Sie dabei, behördliche Schreiben zu verstehen sowie Anträge korrekt vorzubereiten und einzureichen. Ziel ist Klarheit über Anforderungen und Abläufe.",
        "Die Unterstützung richtet sich an alle Personen, unabhängig von Herkunft, Lebenssituation oder finanziellen Möglichkeiten – auch ohne Budget für professionelle Sprach- oder Beratungsdienste.",
        "Die Zusammenarbeit erfolgt sachlich, strukturiert und auf Augenhöhe. Ich kläre Inhalte Schritt für Schritt mit Ihnen, damit Sie Ihre Anliegen möglichst selbstständig weiterführen können. Rechtsberatung im Sinne des RDG wird nicht erbracht.",
      ],
      list_title: "Art der Unterstützung",
      items: [
        "Erklärung von Briefen und Bescheiden",
        "Sprachmittlung bei Terminen",
        "Begleitung bei Telefonaten",
      ],
      contact_title: "Kontakt",
      contact: [
        "Wenn Sie Unterstützung benötigen oder eine kurze Einschätzung wünschen, nehmen Sie gerne Kontakt auf.",
        "Die erste Anfrage ist unverbindlich.",
      ],
      cta: "Kontakt aufnehmen / Anfrage stellen",
      cta_call: "Jetzt anrufen",
    },
    manual: {
      kicker: "Handbuch",
      title: "Handbuch & Registrierung",
      badge: "Aktueller Stand & Version 2",
      intro:
        "Kurzfassung zu Registrierung, Login, Kontakt und den wichtigsten Funktionen. Details finden Sie im vollständigen Handbuch.",
      cta_full: "Handbuch öffnen",
      cta_primary: "Zum Handbuch",
      cta_secondary: "Fragen? Schreiben Sie mir direkt",
    },
    legalinfo: {
      kicker: "Nutzungsbedingungen (Kurz)",
      title: "Nutzungsbedingungen im Überblick",
      intro:
        "Kurz und ohne Wiederholung: Kernpunkte zu Nutzung, Nutzungsrechten und Datenschutz; die vollständige Fassung steht in den Nutzungsbedingungen.",
      agb_title: "Kurzfassung",
      privacy_title: "Datenschutz-Kurzinfo",
      items: [
        "Keine Rechts- oder Steuerberatung; Verfügbarkeit nach bestem Bemühen (ohne Garantie).",
        "Nutzung und geschützte Bereiche nur für registrierte Nutzer:innen; vollständige Fassung in den Nutzungsbedingungen sowie im Impressum.",
        "Kontakt/Uploads laufen per E-Mail; keine dauerhafte Speicherung, keine Zustell-Garantie.",
        "Datenschutz kurz: keine Analytics/Profiling; Spracheinstellung bleibt lokal im Browser.",
        "Rechtliche Details stehen auf der Seite Nutzungsbedingungen.",
      ],
      cta_full: "Nutzungsbedingungen",
      cta_imprint: "Impressum",
      cta_contact: "Kontakt aufnehmen",
    },
    manualPage: {
      kicker: "Handbuch",
      headerKicker: "Schnellnavigation",
      title: "Handbuch",
      lead: "Kurz-Anleitung für Nutzer:innen: Anmeldung, Navigation, Kontakt und die wichtigsten Bereiche der Startseite.",
      meta: {
        chapters: "9 Kapitel",
        audience: "für Nutzer:innen",
        interactive: "mit Schnellnavigation",
        current: "Aktiver Abschnitt",
      },
      back: "Zurück zur Seite",
      signal: "Direkt zum Kontaktbereich",
      sections: {
        contact: {
          title: "Kontakt",
          items: [
            "Kontakt läuft direkt über WhatsApp Business oder E-Mail.",
            "Bitte Anliegen kurz beschreiben; ich antworte persönlich.",
            "Uploads bitte per E-Mail senden; keine dauerhafte Speicherung.",
            "Servicezeiten: Mo–Fr tagsüber; bei Bedarf WhatsApp Business oder E-Mail nutzen.",
            "Passwort-Reset und Handbuch im Menü verfügbar.",
          ],
        },
        hints: {
          title: "Wichtige Hinweise",
          items: [
            "Dies ist keine Rechtsberatung; Nutzung in eigener Verantwortung.",
            "Externe Dienste (E-Mail und WhatsApp Business) nach bestem Bemühen; Verzögerungen oder Ausfälle sind möglich.",
            "Sicherheit: Passwörter werden nur als Hash gespeichert (kein Klartext). Passwort-Reset-Mails kommen von noreply@example.com – bitte auch Spam prüfen; bei Problemen kurze Mail an max.mustermann@example.com.",
          ],
          cards: {
            password: {
              title: "Passwort & Reset",
              body: '<span class="hint-underline">Passwörter</span> werden nur als Hash gespeichert (kein Klartext), z. B. <code class="hint-underline">pbkdf2_sha256$600000$ABC123$ZKqvuw6n5rX...</code> (mit zufälligem Zusatzwert, nicht zurück ins Passwort wandelbar). So kommen Reset-Mails sicher an:<br />1) Anfrage über „Passwort vergessen?“ auslösen.<br />2) Absender <code class="hint-underline">noreply@example.com</code> in Ihrem Mailpostfach zulassen/whitelisten.<br />3) <span class="hint-underline">Spam/Unbekannt</span> prüfen, falls im Posteingang nichts erscheint.<br />4) Wenn nach wenigen Minuten nichts da ist, kurze Mail an <code class="hint-underline">max.mustermann@example.com</code> schicken.',
            },
            delete: {
              title: "Konto löschen",
              body: 'Sie können Ihr registriertes Konto jederzeit selbst und unwiderruflich löschen: Einloggen, auf der Startseite zur Kontakt-Karte scrollen (dort, wo „Abmelden“ erscheint) und den Button <span class="hint-underline">„Konto löschen“</span> anklicken. Hinweis lesen und bestätigen; danach sind Zugriff und gespeicherte Daten für dieses Konto entfernt.',
            },
          },
        },
        register: {
          title: "Registrierung & Login",
          items: [
            "Öffnen Sie „Registrieren“. Geben Sie Ihre E-Mail-Adresse, ein Passwort und die Passwort-Wiederholung ein; ein Profilbild ist optional.",
            "Klicken Sie auf „Konto anlegen“. Wenn alles korrekt ist, werden Sie direkt automatisch eingeloggt.",
            "Für spätere Besuche öffnen Sie „Login“ und melden sich mit derselben E-Mail-Adresse und demselben Passwort an.",
            "Falls Sie Ihr Passwort vergessen haben, nutzen Sie auf der Login-Seite „Passwort vergessen?“ und prüfen Sie auch den Spam-Ordner.",
          ],
          callout:
            "Erst nach erfolgreichem Login sehen Sie Kontaktdaten und geschützte Bereiche.",
        },
        usage: {
          title: "So funktioniert der Kontakt",
          items: [
            "Nach dem Login öffnen Sie die Kontaktinfos und wählen den passenden Weg: WhatsApp Business oder E-Mail.",
            "Schreiben Sie kurz, wobei Sie Hilfe brauchen, welche Sprache Sie sprechen und ob es eine Frist gibt.",
            "Beschreiben Sie kurz den Termin oder das Gespräch, bei dem Sprachmittlung benötigt wird.",
            "Danach erhalten Sie eine Rückmeldung, und ich kläre mit Ihnen, ob Nachricht, Telefonat oder Termin vor Ort am besten passt.",
          ],
        },
        tools: {
          title: "Weitere Bereiche bedienen",
          items: [
            "Wetter: Nach dem Login Ort suchen, Ergebnis prüfen und gespeicherte Suchen bei Bedarf wieder löschen.",
          ],
        },
        updates: {
          title: "Hinweise & Aktualisierungen",
          items: [
            "Aktuelle Informationen stehen im Handbuch; Änderungen bitte hier nachsehen.",
            "Kurze Hinweise oder Wartungen maximal einmal täglich.",
            "Feedback und Wünsche sind ausdrücklich willkommen.",
            "Login-Hinweis: Im Passwortfeld wird bei jedem Aufruf ein neues Passwort generiert (Browser-Autofill ggf. deaktivieren).",
            "Neu: Bei der Registrierung können Sie ein eigenes Profilbild hochladen. Nach dem Login erscheint es im Avatar; Gäste sehen weiterhin ein animiertes Platzhalter-Badge.",
          ],
        },
        contact: {
          title: "Kontakt",
          items: [
            "Nach dem Login stehen WhatsApp Business und E-Mail zur Verfügung.",
            "WhatsApp Business und E-Mail sind die Kontaktwege; keine Gruppen.",
            "Bitte kurz Anliegen und ggf. Fristen nennen.",
          ],
        },
        licensing: {
          title: "Projektstatus & Betrieb",
          items: [
            "Serviceangebot eines Einzelbetreibers; Rückmeldungen und technische Anpassungen erfolgen im Rahmen der verfügbaren Kapazität.",
            "Verfügbarkeit voraussichtlich bis Juli 2026; beim Hosting-Wechsel bleiben alle Konten bestehen.",
            "Ab Juli 2026 kann das Projekt pausieren; bestehende Konten bleiben, Neuregistrierungen ggf. gesperrt.",
            'Rechtliches im Detail: siehe <a href="/rechtliches/">Nutzungsbedingungen</a> sowie <a href="/impressum/">Impressum</a>.',
            "Updates: Hinweise maximal 1x täglich; Feedback willkommen.",
          ],
        },
        partnership: {
          title: "Support & Rückmeldungen",
          items: [
            "Bei Unklarheiten oder Problemen bitte melden.",
            "Funktionswünsche gerne per WhatsApp Business oder E-Mail.",
            "Dringende Anliegen bitte mit „DRINGEND“ kennzeichnen.",
          ],
        },
        interpreters: {
          title: "Leistungsbereich",
          items: [
            "Schnellzugriff: Der animierte Würfel-Link im Header führt direkt zum Leistungsbereich auf der Startseite.",
            "Auf der Startseite sehen Sie direkt, wobei ich Sie konkret unterstütze.",
            "Für Rückfragen oder Terminabsprachen nutzen Sie den Kontaktbereich nach dem Login.",
            "Beschreiben Sie Ihr Anliegen kurz und nennen Sie wichtige Fristen oder Termine direkt in Ihrer Nachricht.",
            "Sensible Kontaktdaten und direkte Kommunikationswege sehen nur eingeloggte Nutzer:innen.",
            "Es gibt kein separates Verzeichnis und keine öffentlichen Dolmetscherprofile mehr; alle wichtigen Infos stehen direkt auf der Startseite.",
          ],
          callout:
            "Direkte Kontaktdaten und sensible Informationen sehen Sie erst nach dem Login.",
        },
        legal: {
          title: "Rechtliches",
          items: [
            "Betrieb ohne Rechts- oder Steuerberatung; Verfügbarkeit nach bestem Bemühen, ohne Garantie.",
            "Keine Tracking-, Analyse- oder Drittanbieter-Dienste aktiv.",
            "Inhalte nur für registrierte Nutzer:innen; Weitergabe oder Verkauf von Zugängen/Inhalten untersagt.",
            "Vollständige Informationen: Nutzungsbedingungen, Impressum.",
          ],
        },
        signal: {
          title: "Kontaktwege",
          intro:
            "Nach dem Login sehen Sie WhatsApp Business und E-Mail-Kontakt.",
          dualGroups: "",
          cta: "",
          ctaInterpreter: "",
          ctaUsers: "",
          note: "WhatsApp Business möglich, aber keine Gruppen.",
          seeTitle: "Wie Sie mich erreichen",
          see: [
            "E-Mail schreiben mit kurzem Anliegen und Fristen.",
            "WhatsApp Business nutzen, wenn etwas dringend ist.",
            "E-Mail nutzen, wenn Unterlagen oder längere Angaben nötig sind.",
          ],
          protectedTitle: "Was geschützt bleibt",
          protected: [
            "Keine Freigabe interner Systeme oder personenbezogener Daten.",
            "Keine Gruppen oder offenen Links; Kontakt nur direkt.",
            "Keine Änderungen an Konten oder Profilen anderer Nutzer:innen.",
          ],
          installTitle: "WhatsApp-Hinweis",
          install: [
            "WhatsApp Business nach Bedarf installieren.",
            "Direktnachricht statt Gruppen verwenden.",
            "Sensibles nur nach Rücksprache senden.",
          ],
        },
        groups: {
          title: "WhatsApp Business (Hinweis)",
          items: [
            "Es gibt keine Gruppen; nur Direktkontakt.",
            "Keine personenbezogenen Daten offen teilen.",
            "Bei Fragen bitte kurz per WhatsApp Business oder E-Mail melden.",
            "Zugänge oder Links nicht weitergeben.",
            "Fristen und Kontext nennen, damit ich schneller helfen kann.",
          ],
        },
        faq: {
          title: "Kurze Hilfe (FAQ)",
          items: [
            "Keine Kontaktdaten sichtbar? Bitte einloggen.",
            "Upload funktioniert nicht? Servicezeiten prüfen und Datei < 10 MB wählen.",
            "Support nötig? Nach dem Login im Kontaktbereich schreiben.",
            "Passwort vergessen? Nutzen Sie auf der Login-Seite „Passwort vergessen?“ und prüfen Sie auch den Spam-Ordner.",
            "Wenn ein Bereich nicht reagiert: Seite neu laden und bei Bedarf direkt per WhatsApp Business oder E-Mail melden.",
          ],
        },
      },
    },
    legalPage: {
      kicker: "Rechtliches",
      title: "Nutzungsbedingungen",
      lead: "Regeln für Leistungen, Direktkontakt, Nutzung und Nutzungsrechte von Eugen Beirit – Dolmetsch- & Sprachdienstleistungen.",
      facts: [
        "Keine Rechtsberatung",
        "Keine Tracking-Cookies",
        "Direktkontakt",
      ],
      facts_aria: "Kurzüberblick",
      back: "Zurück zur Startseite",
      contactBtn: "Kontakt",
      sections: {
        agb: {
          title: "Nutzungsbedingungen",
          intro:
            "Diese Seite regelt die Nutzung von Eugen Beirit – Dolmetsch- & Sprachdienstleistungen. Bedienhinweise stehen im Handbuch; hier geht es um Regeln, Verantwortung und Nutzungsrechte.",
          items: [
            "Leistungen: persönliche Sprachhilfe bei Terminen, Telefonaten, Online-Gesprächen und Kommunikation; keine Rechts- oder Steuerberatung.",
            "Unterstützung erfolgt ohne Rechtsvertretung; Inhalte sind keine Rechtsauskunft und keine verbindliche Handlungsanweisung.",
            "Für Personen, die mich beim Aufbau der Webseite mit Ideen und Unterstützung begleitet haben, sind individuelle Rabatte von bis zu 50 % möglich. Sonstige Aufträge werden zu den aktuell gültigen Preisen berechnet. Individuelle Absprachen sind nach Rücksprache möglich.",
            "Wenn Kund:innen zum vereinbarten Termin nicht erscheinen oder nicht rechtzeitig vorab absagen, kann eine Ausfallgebühr von 10 € berechnet werden, weil die Zeit für den Termin freigehalten wird.",
            "Öffentliche Inhalte können ohne Konto genutzt werden. Geschützte Bereiche, Wetterseite, direkte Kontaktdaten und persönliche Funktionen erfordern Registrierung und Login.",
            "Nutzer:innen müssen eigene Angaben korrekt halten und dürfen keine Daten Dritter ohne Berechtigung übermitteln.",
            "Kontakt erfolgt direkt zwischen Nutzer:in und Betreiber; es gibt keine öffentlichen Gruppen, Foren oder offenen Verzeichnisse.",
            "Kontaktzugänge, interne Links und persönliche Inhalte dürfen nicht weitergegeben, verkauft oder öffentlich geteilt werden.",
            "Uploads und Anhänge werden nur zur Bearbeitung genutzt und, soweit nötig, per E-Mail weitergeleitet. Eine Zustellung kann nicht garantiert werden.",
            "Externe Dienste wie WhatsApp Business, E-Mail oder verlinkte Kontaktwege haben eigene Datenschutz- und Nutzungsbedingungen.",
            "Missbrauch, Sicherheitsrisiken oder Verstöße gegen diese Regeln können zur Einschränkung oder Sperrung des Zugangs führen.",
            "Dieses Angebot dient der direkten Information und Kontaktaufnahme. Einzelne Bereiche können angepasst werden, wenn sich Leistungen, Technik oder rechtliche Anforderungen ändern.",
            "Passwörter werden nicht im Klartext gespeichert. Reset-Links gehen an die registrierte E-Mail-Adresse; bitte Postfach und Spam-Ordner prüfen.",
            "Nach 10 Minuten ohne Aktivität wird die Sitzung automatisch beendet. Danach ist ein neuer Login nötig.",
            "Termine und Kontaktfälle bleiben konto-intern und werden nicht öffentlich angezeigt.",
          ],
        },
        signal: {
          title: "Keine öffentlichen Gruppen",
          items: [
            "Es gibt keine öffentliche WhatsApp Business- oder Forum-Gruppe; Kontakt läuft direkt nach dem Login.",
            "Keine personenbezogenen Kundendaten in Gruppen oder offenen Kanälen posten.",
            "Private Gruppen liegen außerhalb dieses Angebots und in der Verantwortung der Teilnehmenden.",
            "Keine offenen Links teilen; sensible Fälle bitte nur direkt klären.",
            "Für dieses Angebot gilt: kein öffentlicher Gruppenbereich, nur Direktkontakt.",
          ],
        },
        privacy: {
          title: "Datenschutz",
          responsibleTitle: "Verantwortliche Stelle",
          responsibleText:
            "Beispielverantwortlicher ist Max Mustermann, Portfolio-Projekt (Musterangaben). Kontaktdaten stehen im Impressum.",
          dataTitle: "Welche Daten verarbeitet werden",
          data: [
            "Kontakt: WhatsApp Business oder E-Mail; Uploads werden nur zur Bearbeitung genutzt und bei Bedarf per E-Mail weitergeleitet.",
            "Browser-seitig: Spracheinstellung im LocalStorage; keine Werbe-Analytics und kein Profiling.",
            "Profilfoto (optional): Wird nur für den eigenen Avatar nach Login genutzt und nicht für andere Nutzer freigegeben.",
            "Kontaktanfragen können Text, Sprache, Terminwunsch und freiwillig mitgeteilte Angaben enthalten.",
            "Externe Links zu WhatsApp Business öffnen einen Dienst eines anderen Anbieters. Deren Datenverarbeitung richtet sich nach den jeweiligen Bedingungen.",
            "Nutzerkonten: E-Mail-Adresse, gehashte Passwörter und notwendige Kontodaten für Login, Reset und Kontoverwaltung.",
            "Termine: Datum, Uhrzeit, Ort, Anliegen, Benutzername und Notiz werden intern gespeichert, soweit die Funktion genutzt wird.",
            "Wetter: Gespeicherte Ortssuchen werden konto-intern dem angemeldeten Nutzer zugeordnet und nicht öffentlich angezeigt.",
            "Server-/Error-Logs können bei Fehlersituationen IP/User-Agent enthalten; rotierende Logs nur zur Störungsanalyse.",
            "E-Mail-Versand und Passwort-Reset laufen über angebundene Mailprovider; dabei können technische Zustell-Logs entstehen.",
            "Cookies: Django-Session-Cookie für Login; keine Tracking-Cookies.",
          ],
          purposeTitle: "Zwecke",
          purpose: [
            "Sprachwahl speichern.",
            "Kontaktaufnahme ermöglichen, Anfragen bearbeiten und freiwillige Angaben verwalten.",
          ],
          legalTitle: "Rechtsgrundlagen",
          legal: [
            "Berechtigtes Interesse (Art. 6 Abs. 1 f DSGVO) für Betrieb, Sicherheit und Usability der Seite.",
            "Vertrag/Anbahnung (Art. 6 Abs. 1 b DSGVO) bei Kontaktaufnahme.",
          ],
          storageTitle: "Speicherdauer",
          storage: [
            "LocalStorage bleibt im Browser, bis Sie es löschen.",
            "Sprachwahl: localStorage im Browser; löschen jederzeit möglich.",
            "E-Mails, Kommunikation und Uploads werden nur so lange aufbewahrt, wie es für Bearbeitung, Nachvollziehbarkeit oder gesetzliche Pflichten nötig ist.",
            "Nutzerkonten und Kontaktfälle bleiben bis zur Löschung, Erledigung oder gesetzlichen Pflicht gespeichert.",
          ],
          rightsTitle: "Ihre Rechte",
          rights: [
            "Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch nach DSGVO.",
            "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.",
            "Beschwerderecht bei einer Aufsichtsbehörde.",
          ],
          callout:
            "LocalStorage löschen: Im Browser „Website-Daten“ oder „Lokale Daten“ für diese Seite entfernen.",
        },
        privacy_notice: {
          title: "Datenschutz",
          text_before: "Die Datenschutzhinweise stehen auf einer eigenen Seite:",
          link: "Datenschutz",
        },
        contact: {
          title: "Kontakt & Verantwortlicher",
          items: {
            email: "E-Mail: max.mustermann@example.com",
            email_label: "E-Mail:",
            phone: "WhatsApp Business",
            landline: "",
            address: "Anschrift: Musterstraße 1, 12345 Musterstadt",
          },
          callout:
            "Für Datenschutz- oder Rechtsanfragen bitte per WhatsApp Business oder E-Mail melden.",
        },
        license: {
          title: "Nutzungsrechte / Urheberrecht",
          items: [
            "Inhalte, Layout und Medien dieser Website sind urheberrechtlich geschützt, soweit nicht ausdrücklich anders gekennzeichnet.",
            "Die Nutzung ist nur für den Zugriff auf diese Website und die angebotenen Inhalte erlaubt.",
            "Kein Weiterverkauf, Re-Hosting, automatisiertes Auslesen, Scraping oder öffentliches Weitergeben geschützter Inhalte.",
            "Für Open-Source-Bestandteile gelten deren Lizenzen; Hinweise in den jeweiligen Repos/Dateien.",
            "Persönliche Ausdrucke oder lokale Kopien einzelner Informationen sind für den Eigenbedarf erlaubt.",
            "Veröffentlichung, kommerzielle Nutzung oder Weitergabe geschützter Materialien ist ohne Zustimmung untersagt.",
          ],
        },
      },
    },
    imprintPage: {
      title: "Impressum",
      back: "Zurück zur Startseite",
      toPrivacy: "Zum Datenschutz",
      sections: {
        details: {
          title: "Angaben gemäß § 5 DDG",
          business_name: "Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
          country: "Deutschland",
          legal_form: {
            label: "Unternehmensform",
            value: "Demonstrationsprojekt",
          },
          contact: {
            label: "Kontakt",
            email_label: "E-Mail:",
            whatsapp_label: "WhatsApp Business:",
            whatsapp_link: "WhatsApp Business",
          },
          activity: {
            label: "Tätigkeit",
            value:
              "Dolmetsch- und Sprachdienstleistungen, insbesondere Deutsch-Russisch-Sprachmittlung bei Telefonaten, Online-Gesprächen und persönlichen Terminen.",
          },
        },
        liability: {
          title: "Haftung für Inhalte und Links",
          text_primary:
            "Eigene Inhalte dieser Website werden mit Sorgfalt erstellt. Für Inhalte externer Websites, auf die über Links verwiesen wird, sind die jeweiligen Betreiber verantwortlich.",
          text_secondary:
            "Die angebotenen Informationen und Leistungen stellen keine Rechts- oder Steuerberatung dar.",
        },
      },
    },
    privacyPage: {
      kicker: "Datenschutz",
      title: "Datenschutzhinweise",
      intro:
        "Informationen dazu, welche Daten bei Max Mustermann – Sprachdienstleistungen für Deutsch und Russisch verarbeitet werden können.",
      facts_aria: "Kurzüberblick",
      facts: {
        whatsapp: "WhatsApp Business",
        email: "E-Mail-Kontakt",
        no_ads: "Keine Werbe-Analytics",
      },
      sections: {
        controller: {
          title: "Verantwortlicher",
          text_before:
            "Verantwortlich für diese Website ist Max Mustermann, Max Mustermann – Sprachdienstleistungen für Deutsch und Russisch. Die vollständigen Anbieterangaben stehen im",
          imprint_link: "Impressum",
          email_label: "E-Mail:",
          contact_way: "Kontaktweg: WhatsApp Business und E-Mail",
        },
        serverlogs: {
          title: "Serverlogs und technischer Betrieb",
          text_primary:
            "Beim Aufruf der Website können technisch notwendige Zugriffsdaten verarbeitet werden, zum Beispiel IP-Adresse, Zeitpunkt, angeforderte URL, Browser/User-Agent, Referrer und technische Fehlermeldungen. Diese Daten dienen dem Betrieb, der Sicherheit und der Fehleranalyse.",
          text_secondary:
            "Die genaue Speicherdauer und vollständige technische Hosting-Konfiguration sind im Projekt nicht abschließend dokumentiert und müssen beim eingesetzten Hosting-/Serverbetrieb geprüft werden.",
        },
        contact: {
          title: "Kontakt per E-Mail und WhatsApp Business",
          email_text_before: "Wenn Sie per E-Mail an",
          email_text_after:
            "Kontakt aufnehmen, werden die von Ihnen übermittelten Angaben zur Bearbeitung Ihrer Anfrage verarbeitet.",
          whatsapp_text:
            "Beim Kontakt über WhatsApp Business öffnet die Website nur den vorhandenen WhatsApp-Kontaktweg. Für WhatsApp Business gelten zusätzlich die Datenschutz- und Nutzungsbedingungen des jeweiligen Dienstes. Eine Telefonnummer wird auf dieser Datenschutzseite nicht zusätzlich veröffentlicht.",
        },
        appointment_requests: {
          title: "Terminanfragen",
          text_primary:
            "Wenn Sie das Formular für eine Terminanfrage nutzen, werden die von Ihnen eingegebenen Angaben zur Bearbeitung und Abstimmung des Termins verarbeitet. Dazu können Name, E-Mail-Adresse, Mobilnummer, gewählter Samstag, gewünschte Uhrzeit, Terminart und Ihre optionale Nachricht gehören.",
          text_secondary:
            "E-Mail-Adresse und Mobilnummer sind einzeln freiwillig; für eine Antwort muss jedoch mindestens eine Kontaktmöglichkeit angegeben werden. Die Angaben werden nicht an externe Kalenderdienste übermittelt.",
          availability_note:
            "Derzeit sind Terminanfragen nur für Samstage möglich. Die verfügbaren Zeiten können sich in naher Zukunft ändern.",
        },
        account: {
          title: "Nutzerkonto, Login und Uploads",
          items: {
            login:
              "Bei Registrierung und Login werden E-Mail-Adresse, Benutzerkonto, Passwort-Hash, Sitzungsdaten und notwendige Kontodaten verarbeitet.",
            optional:
              "Optionale Profilangaben, Profilbild, Rückrufwunsch, Benachrichtigungseinstellungen, Termine, interne Nachrichten und gespeicherte Dokumente werden nur verarbeitet, wenn die jeweilige Funktion genutzt wird.",
            uploads:
              "Uploads können Dateiname, Dateityp, Dateigröße, Dateiinhalt, Titel und Notizen enthalten. Sie werden zur Bearbeitung und Kontoverwaltung genutzt.",
            email_delivery:
              "Passwort-Reset und Konto-E-Mails können technische Zustell- und Versanddaten beim angebundenen Mailversand auslösen.",
          },
        },
        cookies: {
          title: "Cookies, Session und lokale Speicherung",
          items: {
            session:
              "Für Login und Sicherheit nutzt die Django-Anwendung notwendige Session- und CSRF-Cookies.",
            language:
              "Die frühere manuelle Sprachwahl wird nicht mehr dauerhaft als bevorzugte Sprache verwendet. Alte Einträge mit dem Namen <code>preferred_lang</code> werden clientseitig entfernt.",
            local_ui:
              "Die Website kann lokale UI-Zustände speichern, etwa Theme-Auswahl, Loader-Status, Wetter-Zwischenspeicher oder Formular-/Widget-Zustände.",
            no_tracking:
              "Tracking-Cookies oder Werbe-Analytics wurden im geprüften Projektcode nicht gefunden.",
          },
        },
        external: {
          title: "Externe Dienste und APIs",
          items: {
            contact:
              "WhatsApp Business und E-Mail werden als externe Kontaktwege genutzt.",
            weather:
              "Die Wetterfunktion ruft Open-Meteo-Dienste für Geocoding und Wetterdaten ab, wenn diese Funktion verwendet wird.",
            no_fonts:
              "Externe Webfonts oder Analytics-Skripte wurden im geprüften Website-Code nicht als aktive Einbindung gefunden.",
            providers:
              "Für Hosting, Datenbank, E-Mail-Versand und Serverbetrieb können technische Dienstleister eingesetzt sein. Die konkrete Anbieter- und Aufbewahrungslage ist im Projekt nicht vollständig dokumentiert.",
          },
        },
        rights: {
          title: "Ihre Rechte",
          text:
            "Sie können nach Maßgabe der DSGVO Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch verlangen. Außerdem besteht ein Beschwerderecht bei einer zuständigen Datenschutzaufsichtsbehörde.",
          callout_before: "Datenschutzanfragen senden Sie bitte an",
        },
      },
    },
    forum: {
      kicker: "Forum",
      title: "Kontaktgruppe",
      badge: "Offene Gruppe",
      intro:
        "Austausch und Infos in einer Kontaktgruppe – ohne Zugriff auf persönliche Kontodaten oder interne Bereiche.",
      dual_groups: "Eine Kontaktgruppe für alle Teilnehmenden.",
      signal_note:
        "Das Forum ist auf dieser Website kein öffentlicher Kontaktweg.",
      install_note:
        "Bitte installieren Sie WhatsApp und koppeln Sie es. Danach öffnet der Link direkt die Gruppe.",
      features: {
        title: "Was Sie sehen können",
        items: [
          "Beiträge, Dateien und Ankündigungen für alle.",
          "Infos zu Terminen, Updates und Ressourcen.",
          "Support-Bereich für Fragen zur Zusammenarbeit oder Technik.",
          "Fragen stellen, ob jemand unterstützen kann.",
        ],
      },
      restrictions: {
        title: "Was geschützt bleibt",
        items: [
          "Kein Zugriff auf persönliche Kontodaten oder interne Bereiche.",
          "Rollenbasierter Zugriff – nur freigegebene Bereiche sichtbar.",
          "Keine Änderungen an System- oder Kundendaten möglich.",
          "Der externe Dienst bietet Ende-zu-Ende-Verschlüsselung; Einladungslinks sind teilbar. Teilen Sie den Link nur mit vertrauenswürdigen Personen.",
        ],
      },
      agb: {
        title: "Nutzungsbedingungen-Hinweis zu eigenen Gruppen",
        items: [
          "Eigene Kontaktgruppen sind private Peer-Gruppen, keine offiziellen Kanäle.",
          "Keine personenbezogenen Kundendaten teilen; DSGVO/Vertraulichkeit gelten.",
          "Ersteller:innen moderieren selbst; Links nur an verifizierte Dolmetscher:innen.",
          "Betreiber haftet nicht für Inhalte externer Gruppen; Zugänge können entzogen werden.",
          "Empfohlen: Links regelmäßig erneuern; sensible Fälle bilateral klären.",
        ],
      },
      cta_primary: "Login anfragen",
      cta_signal: "Kontakt aufnehmen",
      cta_signal_users: "Kontaktgruppe öffnen",
      cta_secondary: "Ablauf im Handbuch",
    },
    profile_page: {
      hero: {
        title: "Profil & Daten",
        intro:
          "Hier sehen Sie Ihre gespeicherten Angaben, Ihr Profilbild und den Stand Ihrer Bewerbungen, Dokumente, Nachrichten und Abstimmungen an einem Ort.",
      },
      chips: {
        applications: "Bewerbungen",
        photo: "Foto",
        photo_saved: "hinterlegt",
        photo_optional: "optional",
        account: "Konto",
        active: "aktiv",
        documents: "Dokumente",
        mailbox: "Postfach-Einträge",
      },
      overview: {
        kicker: "Überblick",
      },
      tabs: {
        account: "Konto",
        applications: "Bewerbungen",
        documents: "Dokumente",
        mailbox: "Nachrichten",
        callback: "Rückruf",
        notifications: "Benachrichtigungen",
        prev: "Vorherige Bereiche",
        next: "Nächste Bereiche",
      },
      common: {
        last_login: "Letzter Login",
        no_login: "Noch kein Login erfasst",
        member_since: "Mitglied seit",
        email: "E-Mail",
        no_email: "Keine E-Mail hinterlegt",
        entries: "Einträge",
        files: "Dateien",
        requests: "Anfragen",
        bytes: "Bytes",
        submitted: "Eingereicht",
        created: "Angelegt",
        planned: "Geplant",
        region_open: "Region offen",
      },
      account: {
        kicker: "Persönliche Daten",
        avatar_alt: "Profilbild",
      },
      account_data: {
        kicker: "Kontodaten",
        title: "Name und E-Mail bearbeiten",
        copy:
          "Vor- und Nachname können Sie leer lassen. Die E-Mail ist gleichzeitig Ihre Login-Adresse.",
      },
      form: {
        first_name: "Vorname",
        last_name: "Nachname",
        title: "Titel",
        note: "Notiz",
        file: "Datei",
        message: "Nachricht",
        callback_phone: "Rückrufnummer",
        time_windows: "Bevorzugte Zeitfenster",
        hint: "Hinweis",
        default_callback_phone: "Standard-Rückrufnummer",
        default_availability: "Übliche Erreichbarkeit",
      },
      photo: {
        kicker: "Profilbild",
        title: "Darstellung aktualisieren",
        copy: "Laden Sie ein neues Bild hoch oder entfernen Sie das aktuelle.",
        current: "Aktuelles Profilbild",
        preview: "Vorschau des neuen Profilbilds",
        preview_alt: "Profilbild-Vorschau",
        placeholder:
          "Wählen Sie ein Bild aus, um hier die Thumbnail-Vorschau zu sehen.",
        remove: "Bild entfernen",
        undo_remove: "Entfernen rückgängig",
        remove_hint: "Das aktuelle Profilbild wird nach dem Speichern entfernt.",
        new_label: "Neues Profilbild",
        file_hint:
          "JPG, PNG oder anderes Bildformat. Datei direkt hier auswählen.",
      },
      applications: {
        kicker: "Bewerbungen",
        title: "Bewerbungen als Dolmetscher:in",
        copy: "Hier sehen Sie den Stand Ihrer eingereichten Bewerbungen.",
        empty_title: "Noch keine Bewerbung vorhanden",
        empty_text:
          "Sobald Sie eine Bewerbung absenden, erscheint sie hier mit aktuellem Bearbeitungsstand.",
      },
      documents: {
        kicker: "Dokumentenablage",
        title: "Briefe, Formulare und PDFs",
        copy:
          "Legen Sie wichtige Unterlagen direkt im Konto ab und laden Sie sie später wieder herunter.",
        new_kicker: "Neues Dokument",
        upload_title: "Datei hochladen",
        upload_copy:
          "Geeignet für Schreiben, Formulare, PDF-Dateien oder einfache Textdokumente.",
        empty_title: "Noch keine Unterlagen gespeichert",
        empty_text:
          "Hochgeladene Dokumente erscheinen hier gesammelt mit Download-Link.",
      },
      mailbox: {
        kicker: "Internes Postfach",
        title: "Geschützter Nachrichtenbereich",
        copy:
          "Schreiben Sie direkt aus dem Konto heraus. Antworten und interne Hinweise erscheinen gesammelt im Verlauf.",
        new_kicker: "Neue Nachricht",
        write_title: "An das Team schreiben",
        write_copy: "Ideal für Rückfragen, kurze Updates oder neue Anliegen.",
        empty_title: "Noch kein Postfach-Verlauf vorhanden",
        empty_text:
          "Sobald Sie eine Nachricht senden oder eine Antwort erhalten, erscheint sie hier.",
      },
      callback: {
        kicker: "Rückruf & Terminfenster",
        title: "Erreichbarkeit hinterlegen",
        copy:
          "Teilen Sie mit, wann und unter welcher Nummer Sie gut erreichbar sind, damit die Abstimmung schneller geht.",
        new_kicker: "Neuer Rückrufwunsch",
        send_title: "Zeitfenster senden",
        send_copy:
          "Diese Angaben können später vom Team bestätigt oder terminiert werden.",
        empty_title: "Noch kein Rückrufwunsch hinterlegt",
        empty_text:
          "Ihre gesendeten Zeitfenster und Status-Updates erscheinen später hier.",
      },
      notifications: {
        kicker: "Benachrichtigungen",
        title: "E-Mail-Benachrichtigungen steuern",
        copy:
          "Legen Sie fest, welche Kontobewegungen zusätzlich per E-Mail gemeldet werden sollen.",
        notify_reply: "Neue Antwort im Postfach",
        notify_message: "Neue interne Nachricht",
        notify_appointments: "Änderungen bei Rückruf / Terminabstimmung",
      },
      status: {
        application: {
          new: "Neu",
          approved: "Freigegeben",
          rejected: "Abgelehnt",
        },
        callback: {
          new: "Neu",
          contacted: "Kontakt aufgenommen",
          scheduled: "Termin geplant",
          completed: "Abgeschlossen",
          cancelled: "Abgebrochen",
        },
        mailbox: {
          reply: "Antwort",
          notice: "Hinweis",
          message: "Ihre Nachricht",
        },
      },
      actions: {
        save_account: "Kontodaten speichern",
        save_photo: "Profilbild speichern",
        new_application: "Neue Bewerbung senden",
        save_document: "Dokument speichern",
        download: "Herunterladen",
        remove: "Entfernen",
        send_message: "Nachricht senden",
        save_callback: "Rückrufwunsch speichern",
        withdraw_application: "Bewerbung zurückziehen",
        withdraw_callback: "Rückrufwunsch zurückziehen",
        save_settings: "Einstellungen speichern",
      },
    },
    footer: {
      brand: "© 2026 Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      meta: [],
      views_label: "Besucher:",
      home_link: "Startseite",
      contact_link: "Kontakt",
      interpreters_link: "Leistungen",
      donate_link: "Spenden",
      manual_link: "Handbuch",
      account_link: "Mein Konto",
      dashboard_link: "Dashboard",
      weather_link: "Wetter",
      imprint_link: "Impressum",
      privacy_link: "Datenschutz",
      legal_link: "Nutzungsbedingungen",
      deploy_badge:
        "Update 01.04.2026: Sprachumschaltung und Seitenabläufe weiter verbessert.",
    },
    mobile: {
      primary: "Erstes Gespräch",
      secondary: "Leistungen",
    },
    ui: {
      fold_open: "Aufklappen",
      fold_close: "Zuklappen",
      account: "Konto",
      account_language: "Konto & Sprache",
      menu: "Menü",
      menu_subtitle: "",
      lang_button: "Sprache",
      lang_tooltip: {
        title: "Sprache wählen",
        subtitle: "Wechsle zwischen Deutsch, Russisch und Ukrainisch.",
      },
      register: "Registrieren",
      login: "Anmelden",
      logout: "Abmelden",
      delete_account: "Konto löschen",
      logged_in_as: "Angemeldet als",
    },
    interpreter_dashboard: {
      title: "Dolmetscher-Dashboard | Eugen Beirit – Dolmetsch- & Sprachdienstleistungen",
      hero: {
        kicker: "Dolmetscher:innen",
        title: "Dashboard",
        intro:
          "Verfügbarkeiten, Sperrtage und Kontaktanfragen an einem Ort. Die Seite ist jetzt als Arbeitsoberfläche aufgebaut: erst Überblick, dann Planung, danach Kommunikation.",
        edit_profile: "Profil bearbeiten",
        update_application: "Bewerbung aktualisieren",
        to_contact_book: "Zum Kontaktbuch",
        to_calendar: "Zum Kalender",
        contacts_in_chat: "Kontakte im Verlauf",
        upcoming_entries: "kommende Einträge",
      },
      spotlight: {
        next_entry: "Nächster Eintrag",
        blocked_all_day: "Ganztägig blockiert",
        calendar_open: "Kalender offen",
        empty: "Sie haben noch keine zukünftigen Termine oder Sperrtage eingetragen.",
        open_requests: "Offene Anfragen",
        contacts_with_open_topics: "Kontakte mit offenen Themen",
        this_week: "Diese Woche",
      },
      stats: {
        aria_label: "Übersicht",
        appointments: "Termine",
        appointments_note: "Kommende belegte Zeitfenster",
        blocked_days: "Sperrtage",
        blocked_days_note: "Ganztägig blockierte Tage",
        contacts: "Kontakte",
        contacts_note: "Kontakte mit Verlauf im Kontaktbuch",
        open_messages: "Offene Nachrichten",
      },
      planner: {
        kicker: "Planung",
        title: "Kalender pflegen",
        intro:
          "Neue Termine und Sperrtage werden direkt in die Agenda und in den Kalender übernommen.",
        appointment: {
          title: "Belegte Zeit hinzufügen",
          intro: "Für Arzttermine, Einsätze oder feste Blöcke.",
          chip: "Termin",
          save: "Termin speichern",
        },
        day: {
          title: "Tag sperren",
          intro: "Für Urlaub, Abwesenheit oder volle Tage.",
          save: "Sperrtag speichern",
        },
      },
      form: {
        date: "Datum",
        start: "Beginn",
        end: "Ende",
        description: "Beschreibung",
        internal_note: "Interne Notiz",
        note: "Hinweis",
      },
      agenda: {
        kicker: "Agenda",
        title: "Anstehende Einträge",
        intro:
          "Alles in chronologischer Reihenfolge, damit Sie Änderungen schneller erfassen.",
        until: "bis",
        time_open: "Zeit offen",
        all_day: "Ganztägig",
        no_note: "Kein zusätzlicher Hinweis",
        empty: "Es sind noch keine zukünftigen Termine oder Sperrtage eingetragen.",
      },
      actions: {
        edit: "Bearbeiten",
        delete: "Löschen",
        save: "Speichern",
        cancel: "Abbrechen",
        delete_appointment_aria: "Termin löschen",
        delete_day_aria: "Sperrtag löschen",
      },
      contacts: {
        kicker: "Kontakt",
        title: "Kontaktbuch",
        intro:
          "Nutzer:innen erscheinen hier automatisch, sobald sie eine Nachricht senden.",
        messages: "Nachrichten",
        no_email: "ohne E-Mail",
        no_email_stored: "Keine E-Mail hinterlegt",
        open: "offen",
        last_contact: "Letzter Kontakt:",
        empty_thread: "Noch keine Nachrichten vorhanden.",
        reply_to: "Antwort an",
        message_placeholder: "Nachricht eingeben",
        send_reply: "Antwort senden",
        empty_selected: "Wählen Sie links einen Kontakt aus.",
        empty_book:
          "Sobald ein eingeloggter Nutzer eine Nachricht sendet, erscheint er hier mit Profilbild und Verlauf.",
      },
      status: {
        kicker: "Status",
        title: "Arbeitsstand",
        intro:
          "Die wichtigsten Hinweise, ohne erst in die einzelnen Bereiche zu springen.",
        user: "Benutzer",
        next_appointment: "Nächster Termin",
        none: "keiner",
        agenda_total: "Agenda gesamt",
        entries: "Einträge",
        response_needed: "Antwortbedarf",
        messages: "Nachrichten",
        helper:
          "Empfehlung: Termine direkt mit kurzer interner Notiz speichern. Das macht die Agenda und spätere Rückfragen im Team deutlich lesbarer.",
      },
      calendar: {
        kicker: "Kalender",
        title: "Verfügbarkeit im Blick",
        intro:
          "Rechts sehen Sie dieselben Einträge nochmals visuell im Monatsraster.",
        legend_busy: "Termin oder belegter Zeitslot",
        legend_blocked: "Ganztägig gesperrt",
        legend_open: "Frei oder ohne Eintrag",
      },
      dialogs: {
        appointment_title: "Termin bearbeiten",
        day_title: "Sperrtag bearbeiten",
        optional_note: "Optionaler Hinweis",
      },
    },
  },
  ru: {
    nav: {
      home: "Главная",
      project: "Проект",
      project_home: "К странице проекта",
      functions: "Функции",
      technology: "Технологии",
      about_project: "О проекте",
      account: "Мой аккаунт",
      interpreters: "Услуги",
      prices: "Цены",
      interpreters_link_label: "К моим услугам",
      interpreters_cube_front: "Телефон",
      interpreters_cube_right: "Онлайн",
      interpreters_cube_left: "Устно",
      interpreters_cube_top: "Документы",
      interpreters_cube_bottom: "Кратко",
      interpreters_cube_caption: "Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      contact: "Контакты",
      dashboard: "Кабинет",
      apply: "Подать заявку переводчика",
      about: "Обо мне",
      manual: "Руководство",
      imprint: "Импрессум",
      legal: "Правила и конфиденциальность",
      weather: "Погода",
      scroll_top: "Прокрутить наверх",
    },
    home: {
      quicklinks: {
        manual_label: "Руководство",
        manual_hint: "Открыть руководство",
        legal_label: "Правила и конфиденциальность",
        legal_hint: "Правовые условия и защита данных",
      },
    },
    dashboard: {
      context: {
        aria_label: "Рабочая область",
        kicker: "Рабочая область",
        title: "Кабинет переводчика",
        nav_label: "Разделы кабинета",
      },
      shortcuts: {
        section_label: "Кабинет",
        overview: "Обзор",
        planner: "Планирование",
        agenda: "Повестка",
        contact_book: "Контакты",
        calendar: "Календарь",
      },
    },
    footer: {
      brand: "© 2026 Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      home_link: "Главная",
      contact_link: "Контакт",
      interpreters_link: "Услуги",
      donate_link: "Пожертвования",
      manual_link: "Руководство",
      account_link: "Мой аккаунт",
      dashboard_link: "Кабинет",
      apply_link: "Стать переводчиком",
      weather_link: "Погода",
      imprint_link: "Импрессум",
      privacy_link: "Конфиденциальность",
      legal_link: "Условия использования",
      deploy_badge: "Обновление 02.04.2026: обновлены каталог услуг, точечное открытие профилей и цветовые отметки выходных и праздников Нижней Саксонии в календаре.",
    },
    email_contact: {
      kicker: "E-mail-контакт",
      title: "Выбрать почтовый сервис",
      intro:
        "Скопируйте адрес или откройте Ваш почтовый сервис. Можно использовать Gmail, GMX, WEB.DE, Outlook и другие сервисы.",
      address_aria: "E-mail-адрес",
      recipient: "Получатель",
      copy: "Скопировать",
      copied: "Скопировано",
      providers_aria: "Почтовые сервисы",
    },
    homeMain: {
      services: {
        title: "Чем я помогаю",
        cards: [
          {
            title: "Телефонное языковое сопровождение",
            text:
              "Телефонное языковое сопровождение при важных разговорах. По договоренности звонок может проходить через мой смартфон или стационарный телефон.",
          },
          {
            title: "Онлайн-сопровождение",
            text: "Языковое сопровождение на видеовстречах и онлайн-разговорах.",
          },
          {
            title: "Личное сопровождение",
            text: "Языковое сопровождение на встречах, например в ведомствах, врачебных кабинетах и учреждениях в Хельмштедте и окрестностях.",
          },
          {
            title: "Ведомства и учреждения",
            text: "Языковое сопровождение при разговорах с ведомствами, Jobcenter, школами и другими учреждениями.",
          },
        ],
      },
      prices: {
        title: "Цены",
        intro:
          "Понятные цены на устный перевод и языковое сопровождение. Особые требования или дальние выезды согласуются заранее.",
        groups: {
          interpreting: {
            title: "Телефонное языковое сопровождение",
            items: {
              phone: "За каждый начатый час: 10 €",
              online:
                "Личное и онлайн-сопровождение: первый начатый час 20 €, каждый следующий начатый час 15 €",
              on_site:
                "Телефонное сопровождение рассчитывается отдельно: 10 € за каждый начатый час.",
            },
          },
        },
        note:
          "Личные встречи в Хельмштедте и окрестностях. Другие места по договоренности.",
        examples: {
          title: "Примеры цен",
          items: {
            up_to_60: "Телефон до 60 минут: 10 €",
            up_to_120: "Телефон 61–120 минут: 20 €",
            up_to_180: "Онлайн/лично 121–180 минут: 50 €",
          },
        },
      },
      profile: {
        fallback_name: "Сервис перевода немецкий / русский",
        subtitle: "Личное сопровождение на немецком и русском",
        facts: {
          name: "Имя",
          languages: "Языки",
          region: "Регион",
          experience: "Опыт",
          availability: "Доступность",
        },
        defaults: {
          name: "По запросу",
          languages: "Немецкий / русский",
          region: "По всей Германии",
          experience: "Личная поддержка по важным вопросам",
          availability: "По договоренности",
        },
      },
      contact: {
        gmail: "Написать e-mail",
        proton: "",
        whatsapp: "WhatsApp Business",
        signal: "",
        telegram: "",
        phone_label: "WhatsApp Business",
        phone_cta: "WhatsApp Business",
      },
    },
    weather: {
      kicker: "Погода",
      title: "Текущая погода и прогноз",
      lead: "Простой обзор погоды с поиском по локации. Приложение работает полностью в браузере.",
      widget_aria: "Обзор погоды",
      planning_title: "Планирование по погоде",
      planning_lead:
        "Текущая ситуация, период дождя и прогноз на 24 часа для быстрого решения перед выходом.",
      search_form_aria: "Поиск погоды по месту",
      recent_searches_aria: "Последние места поиска",
      current_aria: "Текущая погода",
      default_not_loaded: "Погода еще не загружена",
      load_button: "Загрузить погоду",
      loading_button: "Загрузка…",
      refresh_button: "Обновить погоду",
      search_label: "Введите город",
      search_placeholder: "Введите город, например Helmstedt",
      status_idle: "Введите место и загрузите погоду.",
      status_searching: "Ищем место…",
      status_loading: "Загружаем погоду…",
      status_updated_live: "Обновлено",
      status_updated_cache: "Кэш",
      status_no_result: "Место не найдено.",
      status_offline: "Нет подключения к интернету.",
      status_error: "Не удалось загрузить погоду.",
      card_wind: "Ветер",
      card_humidity: "Влажность",
      card_uv: "УФ-индекс",
      card_precip: "Риск дождя",
      forecast_title: "Прогноз на 5 дней",
      forecast_note: "Температура и риск дождя",
      hourly_title: "Ближайшие 24 часа",
      today: "Сегодня",
      max_short: "Макс",
      min_short: "Мин",
      rain_suffix: "дождь",
      precip_short: "Дождь",
      record_high: "Самая высокая пока",
      record_low: "Самая низкая пока",
      summary_title: "Важно сегодня",
      summary_default: "Сегодня без заметных погодных рисков.",
      summary_dry_until: "Скорее всего сухо до",
      summary_rain_now: "Дождь сейчас возможен",
      summary_rain_later: "Дождь позже вероятен",
      summary_wind: "Заметный ветер",
      summary_uv: "Высокий УФ",
      summary_cold: "Лучше взять куртку",
      summary_hot: "Жара возможна",
      rain_window_title: "Период дождя",
      rain_window_dry: "В ближайшие 24 часа дождь маловероятен.",
      rain_window_peak: "Самый высокий риск",
      sun_times_title: "Солнце",
      sunrise: "Восход",
      sunset: "Закат",
      daylight_hours: "Свет",
      darkness_hours: "Темнота",
      hours_short: "ч",
      wind_calm: "спокойно",
      wind_breezy: "порывисто",
      wind_stormy: "штормовой",
      humidity_dry: "сухо",
      humidity_ok: "комфортно",
      humidity_humid: "влажно",
      uv_low: "низкий",
      uv_medium: "средний",
      uv_high: "высокий",
      uv_unknown: "н/д",
      precip_likely: "Дождь вероятен",
      precip_low: "низкий риск",
      weather_unknown: "неизвестно",
      saved_kicker: "Сохранено",
      saved_title: "Мои поиски",
      saved_searches_empty: "Сохраненных поисков погоды пока нет.",
      saved_searches_aria: "Сохраненные поиски погоды",
      saved_searches_status_saved: "Поиск сохранен.",
      saved_searches_status_deleted: "Поиск удален.",
      saved_searches_status_error: "Не удалось обновить сохраненные поиски.",
      saved_searches_delete: "Удалить поиск",
      glance_kicker: "Кратко",
      glance_title: "Важно сегодня",
      glance_item_rain: "Проверить риск дождя перед встречами.",
      glance_item_metrics: "Быстро оценить ветер, УФ и влажность.",
      glance_item_hourly: "Посмотреть почасовой прогноз горизонтально.",
      region_kicker: "Регион",
      region_title: "Последние места",
      region_text: "После первого поиска последние места появятся как быстрый выбор.",
      data_kicker: "Данные",
      data_text: "Последний поиск сохраняется локально в браузере. Данные погоды обновляются при необходимости.",
      planning_kicker: "Планирование",
      before_departure_title: "Перед выходом",
      before_departure_text: "Температура, время солнца и период дождя остаются вместе в одном обзоре.",
    },
    residence_page: {
      meta_title: "ВНЖ до 04.03.2027 | Информация",
      kicker: "§24 AufenthG · Украина",
      title: "Разрешение на пребывание автоматически действует до 04.03.2027",
      intro:
        "По состоянию на 26.02.2026 временная защита продлена. Для многих это означает: не нужен новый Antrag, не нужен новый термин, права сохраняются.",
      chips: [
        "Заявление не требуется",
        "Действует до 04.03.2027",
        "Работа и выплаты сохраняются",
      ],
      hero_panel: {
        kicker: "Сразу важно",
        facts: [
          "Не нужен термин в ведомстве",
          "AZR обновляется автоматически",
          "Действует и со старой картой",
        ],
      },
      overview: {
        kicker: "Коротко",
        title: "Что это означает на практике",
        cards: [
          {
            label: "Продление",
            title: "Автоматически до 04.03.2027",
            text: "Все §24, действительные на 01.02.2026, продолжают действовать по закону.",
          },
          {
            label: "Ведомство",
            title: "Без заявления и без термина",
            text: "Продление внесено в Центральный реестр иностранцев (AZR).",
          },
          {
            label: "Права",
            title: "Сохраняются",
            text: "Работа, учёба, социальные выплаты, Kindergeld, Wohngeld и медстраховка.",
          },
        ],
      },
      german: {
        kicker: "Deutsch",
        title: "Что это конкретно означает (DE)",
        items: [
          "Все §24-Titel, которые были действительны на 01.02.2026, автоматически продлеваются до 04.03.2027.",
          "Никакого заявления и термина: продление внесено в Ausländerzentralregister (AZR).",
          "Права сохраняются: работа, учёба, Sozialleistungen (SGB II/XII), BAföG, Kindergeld, Wohngeld, Krankenversicherung.",
          "Новая карта не обязательна: даже с истекшей датой документ остаётся юридически действительным.",
        ],
        note:
          "Не относится к тем, кто въехал после 01.02.2026 или не имел действующего §24 на 01.02.2026. В этом случае нужно обычное обращение в Ausländerbehörde.",
      },
      russian: {
        kicker: "Русский",
        title: "Кратко о продлении",
        date_note: "Повторное продление · 26.02.2026",
        intro:
          "Совет ЕС 15.07.2025 продлил временную защиту до 4 марта 2027. В Германии это действует с 28.10.2025 через «2. UkraineAufenthÄndFGV» (BMI).",
        items: [
          "Разрешения по §24, действовавшие на 01.02.2026, автоматически продлены до 04.03.2027.",
          "Заявление и личный визит не нужны; продление внесено в AZR, пограничные службы оповещены.",
          "Права сохраняются: работа, учёба, соцвыплаты (SGB II/XII), BAföG, Kindergeld, Wohngeld, медстрахование.",
          "Старые карты можно не менять: даже с истёкшей датой документ остаётся действительным.",
        ],
        note:
          "Не распространяется: въезд после 01.02.2026 или отсутствие действующего §24 на эту дату; Fiktionsbescheinigung по незавершённым заявлениям не продлевается автоматически.",
      },
      sources: {
        kicker: "Источники и ссылки",
        title: "Оригинальный источник и дополнительные сведения",
        note:
          "Jobcenter получает информацию об автоматическом обновлении AZR; отдельная справка из Ausländerbehörde не требуется.",
        links: {
          faq: "Germany4Ukraine – FAQ",
          bmi: "Сообщение BMI / Germany4Ukraine (04.03.2027)",
          helmstedt: "Район Хельмштедт – отдел по делам иностранцев",
        },
      },
      audience: {
        kicker: "Для кого это важно",
        title: "Кому особенно полезна эта информация?",
        items: [
          "Людям с действительным §24 на 01.02.2026",
          "Работодателям, школам, Jobcenter и Krankenkassen",
          "Семьям, у которых на руках только карта с истекшей датой",
        ],
      },
      sidebar: {
        memory_kicker: "Запомнить",
        memory_title: "Самое важное за 20 секунд",
        timeline: [
          {
            date: "15.07.2025",
            text: "Решение Совета ЕС продлевает временную защиту.",
          },
          {
            date: "28.10.2025",
            text: "Германия вводит продление через постановление.",
          },
          {
            date: "04.03.2027",
            text: "Новая конечная дата автоматической действительности.",
          },
        ],
        hint_kicker: "Важно",
        hint_title: "Что говорить при вопросах",
        hint_text:
          "Если учреждение сомневается, обычно помогает ссылка на официальный источник или указание на автоматическое обновление AZR. Новая карта нужна не во всех случаях.",
      },
    },
    ticker: {
      title: "Языки и услуги переводчиков",
      defaultService: "Языковое сопровождение",
    },
    womens_day: {
      kicker: "8 марта · Международный женский день",
      title: "Тёплое поздравление с 8 Марта",
      lead: "Сегодня хочется сказать спасибо женщинам за тепло, терпение, заботу и ту силу, с которой они так много делают для других.",
      note_label: "Интерактивная открытка",
      note_text:
        "Нажмите на изображение или потяните линию разделения, чтобы открыть цвет.",
      slider: "Нажать или тянуть",
      cta_page: "Открыть отдельную страницу",
      cta_home: "На главную",
      card: {
        headline: "С любовью к 8 Марта",
        subline:
          "Спасибо за ваше тепло, терпение и всё добро, которое вы дарите каждый день.",
      },
      page: {
        kicker: "Специальная страница",
        title: "8 Марта 2026",
        intro:
          "Небольшая страница с цветами, теплом и добрым поздравлением к 8 Марта.",
        pill_date: "8 марта 2026",
        pill_note: "Небольшой тёплый знак внимания",
        cards: [
          {
            kicker: "Мысль",
            title: "Небольшой момент, чтобы остановиться",
            text: "Эта страница задумана просто как красивый и добрый момент — без спешки и шума, только с цветами.",
          },
          {
            kicker: "Поздравление",
            title: "С уважением и благодарностью",
            text: "За всё, что женщины каждый день несут на себе, организуют, поддерживают, создают и удерживают своим теплом.",
          },
        ],
      },
    },
    contact: {
      kicker: "Контакт",
      title: "Контакт",
      badge: "WhatsApp Business и e-mail",
      login_prompt:
        "Можно связаться сразу или войти, чтобы пользоваться всеми функциями.",
      login_text: "После входа откроются адрес и телефоны.",
      register_hint:
        'Новый пользователь? <a href="/register/">Зарегистрироваться</a>',
      notice_label: "Нужен общий язык",
      text: [
        "Коротко напишите, в чём вам нужна поддержка. Я отвечу с подходящей оценкой и следующим разумным шагом.",
        "Основные каналы связи собраны прямо здесь. WhatsApp Business и e-mail являются главными каналами связи.",
      ],
      badges: [
        "Немецкий / Русский",
        "Онлайн и по договорённости на месте",
        "Ответ без лишних задержек",
      ],
      secondary_label: "Каналы связи",
      email_label: "Эл. почта:",
      email_value: translateRuFallback(contactDefaults.email),
      phone_label: "WhatsApp Business",
      phone_value: "WhatsApp Business",
      landline_label: "",
      landline_value: "",
      availability_label: "Доступность:",
      availability_value: translateRuFallback(contactDefaults.availability),
      region_label: "Регион:",
      region_value: translateRuFallback(contactDefaults.region),
      quickactions: {
        email_label: "E-Mail",
        gmail: "Написать e-mail",
        proton: "",
        whatsapp: "WhatsApp Business",
        landline_label: "",
        landline: "",
        signal: "",
        telegram: "",
      },
      map_kicker: "Карта",
      map_title: "Адрес: Musterstraße 1, 12345 Musterstadt",
      map_note: "Адрес сейчас отображается без встроенной карты.",
      note: translateRuFallback(contactDefaults.note),
    },
    login: {
      title: "Войти",
      lead: "Войдите, чтобы увидеть контактные данные или отправить заявку. После входа откроется защищенный раздел.",
      no_account_hint: "Еще нет аккаунта? Вы можете сразу зарегистрироваться.",
      info_title: "Важная информация",
      info_email_confirmed: "Ваш адрес электронной почты должен быть подтвержден.",
      info_register: "Новые пользователи могут сразу зарегистрироваться.",
      info_password_reset: "Если вы забыли пароль, его можно сразу сбросить.",
      info_idle_logout: "В целях безопасности при бездействии через 10 минут выполняется автоматический выход.",
      form_title: "Данные для входа",
      email_label: "Эл. почта",
      email_help: "Пожалуйста, используйте адрес электронной почты, с которым вы зарегистрировались.",
      password_label: "Пароль",
      password_show: "Показать пароль",
      remember: "Оставаться в системе",
      remember_help:
        "Эта опция сохраняет вход даже после закрытия браузера. Автоматический выход при бездействии все равно остается активным.",
      submit: "Войти",
      no_account: "Нет аккаунта?",
      register: "Зарегистрироваться",
      cancel: "Отмена",
      forgot: "Забыли пароль?",
      reset: "Сбросить пароль",
    },
    password_reset: {
      title: "Сброс пароля",
      subtitle: "Введите свою эл. почту. Мы отправим ссылку для сброса пароля.",
      email_label: "Эл. почта",
      submit: "Отправить ссылку",
      back_login: "Вернуться к входу",
    },
    password_reset_done: {
      title: "Письмо отправлено",
      subtitle:
        "Если аккаунт с этим адресом существует, мы отправили письмо со ссылкой для сброса.",
      back_login: "Вернуться к входу",
    },
    password_reset_confirm: {
      title: "Установить новый пароль",
      new_password: "Новый пароль",
      confirm_password: "Подтвердить пароль",
      submit: "Сохранить",
      invalid_title: "Ссылка недействительна",
      invalid_text: "Эта ссылка истекла или неполная.",
      request_new: "Запросить новую ссылку",
      back_login: "Вернуться к входу",
    },
    password_reset_complete: {
      title: "Пароль изменён",
      subtitle: "Теперь вы можете войти с новым паролем.",
      back_login: "К входу",
      login: "К входу",
    },
    password_reset_invalid: {
      title: "Ссылка недействительна",
      subtitle:
        "Ссылка для сброса истекла или недействительна. Просто запросите новую.",
      retry: "Запросить новую ссылку",
    },
    hero: {
      kicker: "Немецкий ↔ русский",
      title: "Устный перевод и языковые услуги",
      highlight: "",
      subtitle:
        '<span class="hero-subtitle__language">немецкий</span><span class="hero-subtitle__arrow" aria-hidden="true">⇄</span><span class="hero-subtitle__language">русский</span>',
      seo_intro:
        "Личное языковое сопровождение на встречах, по телефону и онлайн.",
      region:
        "В Хельмштедте и окрестностях лично, а по всей Германии по телефону и онлайн.",
      domain_notice_title: "Информация о домене",
      domain_notice_html:
        "Актуальный адрес — sprachservice.example.com. Прежний домен portfolio.example.com перенаправляется на новый адрес языкового сервиса.",
      button_primary: "Связаться",
      button_secondary: "Написать в WhatsApp",
      cta: {
        primary: "Связаться",
        secondary: "Написать в WhatsApp",
        badges: ["Встречи по договорённости"],
      },
      portrait: {
        controls_label: "Действия с фото",
        flip_label: "Фото повернуть",
        weekdays_label: "Показать дни доступности",
        hours_label: "Показать часы доступности",
        channels_label: "Показать способы связи",
        back_kicker: "Немецкий / Русский",
        back_name: "Байрит Евгений",
        back_role: "Устный перевод и языковые услуги",
        back_detail: "Телефон · онлайн · лично",
        weekdays_kicker: "Доступность",
        weekdays_text: "Кроме выходных и праздничных дней",
        hours_kicker: "Время",
        hours_text: "Доступен с 09:00 до 18:00",
        channels_kicker: "Способы связи",
        channels_text: "WhatsApp Business и e-mail",
        landline: "",
      },
    },
    benefits: {
      kicker: "Кратко",
      title: "Структурно. Спокойно. С личным сопровождением.",
      badge: "Современно и ориентировано на сервис",
      cards: [
        {
          title: "По всей Германии",
          text: "Онлайн и по договорённости на месте",
        },
        {
          title: "Немецкий / Русский",
          text: "Понятная поддержка без лишних шагов",
        },
        {
          title: "Телефон · онлайн · лично",
          text: "Языковое сопровождение при разговорах и встречах",
        },
        {
          title: "Быстрый контакт",
          text: "E-Mail, мессенджеры и стационарный номер",
        },
      ],
    },
    home: {
      account: {
        aria_label: "Ваш раздел",
        kicker: "Ваш раздел",
        role: "Профиль и настройки аккаунта в одном месте",
        points: [
          "Управлять фото профиля и личными данными в кабинете",
          "Централизованно обновлять данные аккаунта и фото профиля",
        ],
        primary_title: "Редактировать профиль",
        primary_meta: "Управлять фото, данными и настройками аккаунта",
        delete_account: "Удалить аккаунт",
        delete_account_title: "Удалить аккаунт навсегда",
        delete_account_meta: "Действие нельзя отменить",
        footer: {
          messages: "сообщений",
          replies_saved: "ответов сохранено",
          last_message: "Последнее сообщение",
          no_history: "Сообщений пока нет",
        },
      },
    },
    profile: {
      title: "Помощь с бумагами и общением",
      role: "Устный перевод · языковое сопровождение · немецкий/русский",
      points: [
        "Опыт с Jobcenter, Krankenkasse и Bürgeramt.",
        "Помощь переселенцам и людям с языковым барьером.",
        "Спокойный, структурированный подход без спешки.",
      ],
      meta: ["Встреча по договорённости"],
      tags: "Немецкий · Русский",
      location: "Хельмштедт · Нижняя Саксония",
    },
    services: {
      kicker: "Услуги",
      title: "Запросить языковое сопровождение",
      badge: "По телефону, онлайн и лично",
      intro: "",
      directory_card: {
        title: "Выбор услуг и переводчиков",
        text: "Сначала откройте отдельную страницу с предложениями, затем выберите подходящий профиль и переходите к контакту.",
        meta: "К странице выбора",
      },
      cards: [
        {
          title: "Телефонное языковое сопровождение",
          text:
            "Телефонное языковое сопровождение при важных разговорах. По договоренности звонок может проходить через мой смартфон или стационарный телефон.",
          meta: "Звонки по договоренности",
        },
        {
          title: "Онлайн-сопровождение",
          text: "Языковое сопровождение на видеовстречах и онлайн-разговорах.",
          meta: "Онлайн по всей Германии",
        },
        {
          title: "Личное сопровождение",
          text: "Языковое сопровождение на встречах, например в ведомствах, врачебных кабинетах и учреждениях в Хельмштедте и окрестностях.",
          meta: "Лично или онлайн по договорённости",
        },
        {
          title: "Ведомства и учреждения",
          text: "Языковое сопровождение при разговорах с ведомствами, Jobcenter, школами и другими учреждениями.",
          meta: "Хельмштедт и окрестности",
        },
      ],
    },
    human_translators: {
      kicker: "Доверие",
      title: "Почему личная поддержка важна",
      badge: "Особенно для чувствительных запросов",
      intro: [
        "В чувствительных или официальных вопросах автоматического перевода часто недостаточно.",
        "Именно при общении с ведомствами, на встречах и в важных разговорах особенно важны конфиденциальность, точность и прямое понимание.",
      ],
      benefits_title: "Живой переводчик обеспечивает важные преимущества:",
      benefits: [
        "Конфиденциальную коммуникацию без передачи чувствительных данных третьим лицам",
        "Точный и понятный перевод",
        "Личное сопровождение в сложных ситуациях",
        "Предотвращение недопонимания в важных разговорах",
      ],
      recommended_title:
        "Рекомендуется использовать услуги живого переводчика, в частности, в следующих случаях:",
      recommended: [
        "Ведомства",
        "Приёмы у врача",
        "Учреждения",
        "Онлайн-встречи",
        "Важные разговоры",
      ],
      note_label: "Итог",
      outro:
        "Автоматический перевод может помогать, но не заменяет конфиденциальность, точность и прямое взаимопонимание.",
    },
    interpreters: {
      hero: {
        pill: "Прямая поддержка",
        title: "Один специалист. Прямая помощь.",
        intro:
          "Здесь вы переходите прямо к моему предложению. Я лично помогаю с разговорами, телефонными звонками, онлайн-встречами и личными встречами.",
        list: [
          "Услуги, языки и сферы помощи видны сразу.",
          "Прямой путь к контакту без списка исполнителей.",
          "Документы и запросы можно согласовать напрямую со мной.",
        ],
        cta_list: "Посмотреть услуги",
        cta_apply: "Подать заявку переводчика",
      },
      card: {
        filter_region_label: "Регион (необязательно)",
        filter_language_label: "Языки (необязательно)",
        filter_region_placeholder: "например, Берлин, NRW",
        filter_language_placeholder: "например, арабский, русский",
        filter_submit: "Фильтровать",
        filter_reset: "Сбросить",
        languages_label: "Языки",
        region_label: "Регион",
        experience_label: "Опыт",
        availability_label: "Доступность",
        message_placeholder: "Ваше сообщение",
        send_button: "Отправить сообщение",
        empty: "Переводчики не найдены.",
        login_hint: "Пожалуйста, войдите, чтобы связаться.",
        calendar_title: "Календарь",
        calendar_nav_label: "Навигация по календарю",
        calendar_prev_month: "Предыдущий месяц",
        calendar_next_month: "Следующий месяц",
        calendar_overview_label: "Обзор календаря",
        calendar_legend_free: "свободно",
        calendar_legend_busy: "занято",
        calendar_legend_blocked: "недоступно",
        calendar_legend_weekend: "выходные",
        calendar_legend_holiday: "праздник Нижней Саксонии",
        calendar_tap_hint:
          "Нажмите день, чтобы увидеть свободное и занятое время.",
        calendar_note: "Встречи по договорённости. Доступность уточняйте.",
        calendar_day_blocked: "Недоступно",
        calendar_day_free: "Свободно",
        calendar_day_free_hint: "Можно запросить запись.",
        calendar_day_busy_fallback: "Занято",
        hint: "Профили показываются по алфавиту. Контакт и фото доступны после входа.",
      },
    },
    steps: {
      kicker: "Процесс",
      title: "Как это работает",
      badge: "3 понятных шага",
      intro: "",
      items: [
        {
          title: "Отправить запрос",
          text: "Коротко напишите, в чём вам нужна помощь.",
        },
        {
          title: "Получить ответ",
          text: "Я свяжусь с вами и дам подходящую оценку ситуации.",
        },
        {
          title: "Получить поддержку",
          text: "По телефону, онлайн или по договорённости лично на встречах и разговорах.",
        },
      ],
    },
    calendar: {
      kicker: "Доступность",
      title: "Календарь свободных дней",
      badge: "Просмотр месяца, без онлайн-бронирования",
      home: {
        kicker: "Календарь",
        title: "Доступность с первого взгляда",
        badge: "Свободно, занято или заблокировано",
        intro:
          "Календарь на этой странице виден всем. Авторизованные пользователи и гости видят один и тот же календарь.",
        detail_title: "Выберите день",
        detail_note:
          "Выберите день в календаре, чтобы увидеть подробности здесь.",
        detail_action: "Показать детали",
        legend: {
          free: "Свободно",
          busy: "Занято",
          unavailable: "Заблокировано",
          holiday: "Праздник",
        },
      },
      intro:
        "Посмотрите, в какие дни есть время. Запись остаётся личной — по телефону или через сообщение.",
      intro_login_hint: "Пожалуйста, войдите, чтобы увидеть календарь.",
      register_hint:
        'Новый пользователь? <a href="/register/">Зарегистрироваться</a>',
      legend: {
        free: "Свободно",
        busy: "Частично занято",
        blocked: "День недоступен",
        holiday: "Воскресенье/праздник (Нижняя Саксония)",
      },
      modal: {
        kicker: "День",
        unavailable: "Нет доступных встреч.",
        no_events: "Нет записанных встреч.",
      },
      status: {
        upcoming: "Предстоящие встречи",
        busy: "Занято",
        free: "Свободно",
        unavailable: "День недоступен",
        no_slots: "Нет свободных слотов",
      },
      note: {
        saturday: "Суббота: свободно 09:00–11:00, позже недоступно.",
        sunday: "Воскресенье: не работаю.",
      },
    },
    about: {
      kicker: "Обо мне",
      title: "Кто стоит за этим предложением",
      text: [
        "Меня зовут Евгений. Я прошёл немецкую бюрократию сам и сопровождал многих людей — особенно тех, кто пережил войну, болезнь или резкие изменения.",
        "Мне важно, чтобы вы не чувствовали вины или беспомощности из‑за сложных писем. Работаем на равных — спокойно, структурированно, без давления.",
        "Я родился 09.09.1981 в Казахстане и живу в Германии с 1997 года. Около 30 лет жизни в Германии и многолетний повседневный опыт в немецком и русском языках помогают мне понятно сопровождать людей в языковых вопросах.",
      ],
      facts: [
        "Поддержка на немецком и русском",
        "Особый фокус на переселенцах и людях с языковым барьером",
        "Многолетний повседневный опыт в немецком и русском языках",
        "Терпеливый, практичный, ориентированный на решение",
        "Языковое сопровождение при разговорах, встречах и телефонных звонках",
      ],
    },
    aboutPage: {
      lead: "Больше о моём опыте, мотивации и подходе.",
      story_title: "Мой путь",
      facts_title: "Ключевые факты",
      back: "Назад на главную",
      contact: "Связаться",
      cta: "Подробнее обо мне",
      portfolio: {
        title: "Фокус и подход",
        p0: "",
        p1: "Фокус этой страницы — немецко-русское языковое сопровождение при разговорах, встречах, звонках и онлайн-разговорах.",
        p2: "<strong>Примечание:</strong> эта страница используется исключительно для устного перевода и языковых услуг.",
        p3: "",
        cta_primary: "Связаться",
        cta_secondary: "Поддержать проект пожертвованием",
      },
    },
    donate: {
      title: "Поддержать проект",
      kicker: "Поддержка",
      heading: "Поддержать проект пожертвованием",
      lead: "PayPal и реальные платежи в этом портфолио отключены.",
      note: "PayPal и реальные платежи в этом портфолио отключены.",
      methods_title: "Как проходит согласование пожертвования",
      methods_contact_lead: "PayPal и реальные платежи в этом портфолио отключены.",
      methods_contact_suffix:
        "PayPal и реальные платежи в этом портфолио отключены.",
      methods_manual:
        "PayPal и реальные платежи в этом портфолио отключены.",
      methods_receipt:
        "PayPal и реальные платежи в этом портфолио отключены.",
      info_no_account:
        "PayPal и реальные платежи в этом портфолио отключены.",
      info_receipt:
        "PayPal и реальные платежи в этом портфолио отключены.",
      donor_stats_label: "Уже поддержали:",
      donor_stats_suffix: "человек(а).",
      cta_contact: "Связаться",
      cta_back: "Назад на главную",
    },
    support: {
      kicker: "Поддержка с ведомствами и заявлениями",
      title: "Языковое сопровождение для писем и заявлений",
      intro: [
        "Я оказываю исключительно языковое сопровождение: помогаю понять содержание официальных писем и перевожу их на понятный язык.",
        "Я не составляю заявления, не заполняю формы и не принимаю решений за вас. Моя роль ограничивается переводом и пояснением языка — без оценки содержания или рекомендаций по действиям.",
        "Поддержка доступна для всех, независимо от происхождения, жизненной ситуации или финансовых возможностей, включая тех, кто не может позволить себе платные языковые услуги. Работаем спокойно, структурированно и на равных, чтобы вы сами понимали тексты и принимали решения. Юридические консультации в смысле RDG не оказываются.",
      ],
      list_title: "Виды поддержки",
      items: [
        "Объяснение писем и решений",
        "Языковое сопровождение на встречах",
        "Систематизация материалов",
      ],
      contact_title: "Контакт",
      contact: [
        "Если вам нужна поддержка или краткая оценка, напишите через WhatsApp Business или e-mail.",
        "Первичный запрос — без обязательств.",
      ],
      cta: "Связаться / Отправить запрос",
      cta_call: "WhatsApp Business",
    },
    manual: {
      kicker: "Руководство",
      title: "Руководство и регистрация",
      badge: "Текущий процесс и версия 2",
      intro:
        "Кратко о регистрации, входе, контакте и основных функциях. Подробности — в полном руководстве.",
      cta_full: "Открыть руководство",
      cta_primary: "Открыть руководство",
      cta_secondary: "Есть вопросы? Напишите",
    },
    legalinfo: {
      kicker: "Условия использования (кратко)",
      title: "Условия использования кратко",
      intro:
        "Коротко и без повторов: базовые условия и краткая конфиденциальность; полная версия — в Nutzungsbedingungen.",
      agb_title: "Правовая информация (кратко)",
      privacy_title: "Конфиденциальность (кратко)",
      items: [
        "Без юр./налоговых консультаций; доступность — best effort.",
        "Использование только для зарегистрированных пользователей; подробности — в Nutzungsbedingungen и Impressum.",
        "Контакт/загрузки идут по email; нет постоянного хранения и гарантии доставки.",
        "Конфиденциальность: без аналитики и профилирования; выбор языка хранится локально в браузере.",
        "Правовые детали находятся на странице Nutzungsbedingungen.",
      ],
      cta_full: "Условия использования",
      cta_imprint: "Импрессум",
      cta_contact: "Связаться",
    },
    manualPage: {
      kicker: "Руководство",
      headerKicker: "Быстрая навигация",
      title: "Руководство",
      lead: "Здесь коротко и по шагам объясняется, как зарегистрироваться, войти, связаться и пользоваться основными разделами главной страницы.",
      meta: {
        chapters: "9 разделов",
        audience: "для пользователей",
        interactive: "с быстрой навигацией",
        current: "Активный раздел",
      },
      back: "Назад на сайт",
      signal: "Перейти к контактам",
      sections: {
        contact: {
          title: "Контакт",
          items: [
            "Связь идет напрямую через WhatsApp Business или e-mail.",
            "Кратко опишите задачу; отвечаю лично.",
            "Файлы отправляйте по email; постоянного хранения нет.",
            "Время ответа: будни днём; при сбоях — телефон/мессенджер.",
            "Сброс пароля и руководство доступны в меню.",
          ],
        },
        hints: {
          title: "Важные заметки",
          items: [
            "Не юрконсультация; используете на свой риск.",
            "Внешние сервисы (email и WhatsApp Business) работают по принципу best effort; возможны задержки или сбои.",
            "Безопасность: пароли хранятся только в виде хеша; письма для сброса пароля приходят с noreply@example.com. Если письма нет, проверьте спам.",
          ],
          cards: {
            password: {
              title: "Пароль и сброс",
              body: '<span class="hint-underline">Пароли</span> хранятся только в виде хеша, без открытого текста, например <code class="hint-underline">pbkdf2_sha256$600000$ABC123$ZKqvuw6n5rX...</code> (со случайной солью; восстановить исходный пароль из него нельзя). Чтобы письмо для сброса пришло без проблем:<br />1) Нажмите «Забыли пароль?».<br />2) Разрешите письма от <code class="hint-underline">noreply@example.com</code> в вашем почтовом ящике.<br />3) Проверьте папки <span class="hint-underline">Спам</span> и «Неизвестные», если письма нет во входящих.<br />4) Если через несколько минут письма всё ещё нет, отправьте короткое письмо на <code class="hint-underline">max.mustermann@example.com</code>.<br />Документы также можно отправлять на <code>max.mustermann@example.com</code>.',
            },
            delete: {
              title: "Удаление аккаунта",
              body: 'Вы можете в любой момент самостоятельно и безвозвратно удалить свой аккаунт: войдите в систему, на главной странице прокрутите до карточки контакта (там, где видна кнопка «Выйти») и нажмите <span class="hint-underline">«Удалить аккаунт»</span>. Прочитайте предупреждение и подтвердите действие; после этого доступ и данные этого аккаунта будут удалены.',
            },
          },
        },
        register: {
          title: "Регистрация и вход",
          items: [
            "Откройте «Регистрация». Укажите e-mail, пароль и повтор пароля; фото профиля можно добавить по желанию.",
            "Нажмите «Создать аккаунт». Если всё заполнено правильно, вход выполнится автоматически.",
            "При следующем посещении откройте «Вход» и используйте тот же e-mail и тот же пароль.",
            "Если забыли пароль, нажмите «Забыли пароль?» на странице входа и проверьте папку спам.",
          ],
          callout:
            "Важно: только после успешного входа видны контакты и защищённые разделы.",
        },
        usage: {
          title: "Как происходит связь",
          items: [
            "После входа откройте контакты и выберите удобный способ связи: e-mail, телефон или мессенджер.",
            "Коротко напишите, с чем нужна помощь, на каком языке вам удобно общаться и есть ли срок.",
            "Коротко опишите встречу или разговор, где нужно языковое сопровождение.",
            "После этого вы получите ответ, и вместе будет решено, что лучше: переписка, звонок или личная встреча.",
          ],
        },
        tools: {
          title: "Как пользоваться новыми инструментами",
          items: [
            "Памятка по Krankenkasse: выберите нужный шаг, прочитайте или распечатайте; полностью офлайн, без форм.",
            "План питания: откройте план, используйте «Перемешать» для идей, редактируйте ячейки. «Печать» для бумажной копии; сохранение только после входа, план хранится внутри аккаунта и его можно очистить/перезаписать в любой момент.",
          ],
        },
        updates: {
          title: "Обновления и бета",
          items: [
            "Актуальная информация всегда в этом руководстве; проверяйте его при изменениях.",
            "Обновления будут анонсироваться заранее (новые функции, плановые работы).",
            "Для поддержавших пользователей планируются ранние бета-доступы к новым версиям.",
            "Подсказка по логину: в поле пароля при каждом открытии генерируется новый пароль (при необходимости отключите автозаполнение браузера).",
            "Новое: при регистрации можно загрузить собственное фото профиля. После входа оно появится в аватаре; гостям по-прежнему показывается анимированная заглушка.",
          ],
        },
        contact: {
          title: "Контактные каналы",
          items: [
            "После входа видны e-mail, телефон и мессенджер для связи.",
            "Можно писать в WhatsApp Business, но только личные сообщения (без групп).",
            "Коротко укажите задачу и сроки.",
          ],
        },
        licensing: {
          title: "Лицензия и работа проекта",
          items: [
            "Портфолио/демо: добровольный проект без гарантий обновлений, поддержки или доступности.",
            "Индивидуальное предложение Eugen Beirit без публичных групп и открытых профилей.",
            'Полные условия и конфиденциальность: смотрите <a href="/rechtliches/">Nutzungsbedingungen</a> и <a href="/impressum/">Impressum</a>.',
            "С июля 2026 возможна пауза; аккаунты сохранятся, новые регистрации будут закрыты до перезапуска; функции могут быть настроены заново.",
            "Обновления: уведомления максимум 1 раз в день; обратная связь и пожелания приветствуются.",
          ],
        },
        partnership: {
          title: "Поддержка и обратная связь",
          items: [
            "Сообщайте, если что-то непонятно или чего-то не хватает.",
            "Пожелания по функциям присылайте на e-mail или в мессенджере.",
            "Если срочно — пометьте сообщение словом «СРОЧНО».",
          ],
        },
        interpreters: {
          title: "Раздел услуг",
          items: [
            "Быстрый доступ: анимированная ссылка-куб в шапке ведёт прямо к разделу услуг на главной странице.",
            "На главной странице сразу видно, в чём именно я могу помочь.",
            "Для вопросов и согласования времени используйте раздел контактов после входа.",
            "Коротко опишите проблему и укажите важные сроки или встречи прямо в сообщении.",
            "Чувствительные контакты и прямые каналы связи видны только авторизованным пользователям.",
            "Отдельного каталога и публичных профилей переводчиков больше нет; вся важная информация теперь находится прямо на главной странице.",
          ],
          callout:
            "Прямые контакты и чувствительная информация видны только после входа.",
        },
        legal: {
          title: "Правовое и работа сервиса (кратко)",
          items: [
            "Сервис работает без юр./налоговой консультации; доступность на основе «лучших усилий» (без гарантий).",
            "Файлы/вложения пересылаются по email, не сохраняются постоянно; доставка не гарантируется.",
            "Счётчик посещений псевдонимизирован (хеш IP/UA/сессии); нет трекинга/профайлинга, нет сторонней аналитики.",
            "Информация может обновляться при изменении услуг, контактных данных или правовых требований.",
            "Лицензия: контент только для зарегистрированных пользователей; передача/продажа доступа или контента запрещена.",
            "Полная версия: Nutzungsbedingungen, Импрессум.",
          ],
        },
        signal: {
          title: "Контактные каналы",
          intro: "После входа видны e-mail, телефон и мессенджер для связи.",
          dualGroups: "",
          cta: "",
          ctaInterpreter: "",
          ctaUsers: "",
          note: "Можно писать в WhatsApp Business, но групп нет — только личные сообщения.",
          seeTitle: "Как связаться",
          see: [
            "Напишите короткое письмо с задачей и сроками.",
            "Позвоните, если вопрос срочный.",
            "Используйте мессенджер для быстрых уточнений (без групп).",
          ],
          protectedTitle: "Что защищено",
          protected: [
            "Нет доступа к внутренним системам или персональным данным других.",
            "Нет групп и открытых ссылок; связь только напрямую.",
            "Нельзя менять чужие аккаунты или профили.",
          ],
          installTitle: "Подсказка по мессенджерам",
          install: [
            "Установите нужный мессенджер (WhatsApp Business) при необходимости.",
            "Используйте личные сообщения, а не группы.",
            "Чувствительные данные отправляйте только после согласования.",
          ],
        },
        groups: {
          title: "Мессенджеры (напоминание)",
          items: [
            "Групп нет; общение только напрямую.",
            "Не публикуйте персональные данные открыто.",
            "При вопросах пишите коротко в e-mail или мессенджер.",
            "Не передавайте ссылки/доступы третьим лицам.",
            "Указывайте сроки и контекст, чтобы помочь быстрее.",
          ],
        },
        faq: {
          title: "Короткий FAQ",
          items: [
            "Не видите контакты? Сначала войдите.",
            "Не работает загрузка? Проверьте время работы и размер файла < 10 МБ.",
            "Поддержка? После входа напишите через контакты.",
            "Забыли пароль? На странице входа нажмите «Забыли пароль?» и проверьте папку спам.",
            "Если кнопка перевода не сработала: один раз переключитесь на другой язык, а потом снова выберите нужный язык.",
          ],
        },
      },
    },
    legalPage: {
      kicker: "Правовое",
      title: "Условия использования",
      lead: "Правила по услугам, прямому контакту, использованию и авторским правам Eugen Beirit – Dolmetsch- & Sprachdienstleistungen.",
      facts: [
        "Не юридическая консультация",
        "Без tracking-cookies",
        "Прямой контакт",
      ],
      facts_aria: "Краткий обзор",
      back: "Назад на главную",
      contactBtn: "Контакт",
      sections: {
        agb: {
          title: "Условия использования",
          intro:
            "Эта страница регулирует использование Eugen Beirit – Dolmetsch- & Sprachdienstleistungen. Инструкции по работе сайта находятся в руководстве; здесь описаны правила, ответственность и права использования.",
          items: [
            "Услуги: языковая поддержка на встречах, по телефону, онлайн и в коммуникации; без юр. и налоговых консультаций.",
            "Поддержка оказывается без представительства; содержание не является юридическим заключением или обязательной инструкцией к действию.",
            "Для людей, которые помогали мне идеями и поддержкой при создании сайта, по договоренности возможна индивидуальная скидка до 50 %. Остальные заказы рассчитываются по актуальным ценам. Индивидуальные договоренности возможны после согласования.",
            "Если клиент не приходит на согласованную встречу или не отменяет ее заранее вовремя, может взиматься 10 € за простой, потому что это время резервируется для встречи.",
            "Открытые материалы можно использовать без аккаунта. Защищённые разделы, страница погоды, прямые контакты и личные функции требуют регистрации и входа.",
            "Пользователи должны указывать корректные данные и не передавать данные третьих лиц без разрешения.",
            "Связь происходит напрямую между пользователем и оператором; публичных групп, форумов и открытых каталогов нет.",
            "Контактные доступы, внутренние ссылки и личные материалы нельзя передавать, продавать или публиковать.",
            "Загрузки и вложения используются только для обработки запроса и при необходимости пересылаются по email. Доставка не гарантируется.",
            "Внешние сервисы, такие как email, мессенджеры или связанные контактные каналы, имеют собственные правила конфиденциальности и использования.",
            "Злоупотребление, риски безопасности или нарушение этих правил могут привести к ограничению или блокировке доступа.",
            "Это предложение служит для прямой информации и связи. Отдельные разделы могут корректироваться, если меняются услуги, техника или правовые требования.",
            "Пароли не хранятся в открытом виде. Ссылки для сброса отправляются на зарегистрированный email; проверяйте почту и папку спам.",
            "После 10 минут бездействия сессия автоматически завершается. Затем требуется новый вход.",
            "Встречи и контактные обращения остаются внутри аккаунта и не отображаются публично.",
          ],
        },
        signal: {
          title: "Нет публичных групп",
          items: [
            "Публичной WhatsApp Business- или форум-группы нет; связь происходит напрямую после входа.",
            "Не публикуйте персональные данные в группах или открытых каналах.",
            "Частные группы находятся вне рамок этого предложения и остаются ответственностью самих участников.",
            "Не распространяйте открытые ссылки; чувствительные вопросы решайте только лично.",
            "Для этого предложения действует правило: никаких публичных групп, только прямой контакт.",
          ],
        },
        privacy: {
          title: "Конфиденциальность",
          responsibleTitle: "Ответственное лицо",
          responsibleText:
            "Вымышленный ответственный — Max Mustermann, проект портфолио с примерными данными. Контактные данные указаны в Impressum.",
          dataTitle: "Какие данные обрабатываются",
          data: [
            "Контакт: email, телефон или мессенджер; загрузки используются только для обработки и при необходимости пересылаются по email.",
            "В браузере: выбор языка хранится в LocalStorage; рекламной аналитики и профилирования нет.",
            "Фото профиля (необязательно): используется только для собственного аватара после входа и не открывается другим пользователям.",
            "Контактные запросы могут содержать текст, язык, желаемое время и добровольно переданные данные.",
            "Внешние ссылки и мессенджеры открывают сервисы других поставщиков. Их обработка данных регулируется их собственными условиями.",
            "Учетные записи: email, хешированные пароли и необходимые данные аккаунта для входа, сброса пароля и управления аккаунтом.",
            "Встречи: дата, время, место, тема, имя пользователя и заметка сохраняются внутри системы, если эта функция используется.",
            "Погода: сохранённые поиски мест привязаны внутри аккаунта к вошедшему пользователю и не отображаются публично.",
            "Серверные и ошибочные логи при сбоях могут содержать IP/User-Agent; они ведутся с ротацией только для анализа сбоев.",
            "Отправка email и сброс пароля идут через подключённых почтовых провайдеров; при этом могут возникать технические логи доставки.",
            "Cookies: сессионная cookie Django для логина; трекинг-cookies отсутствуют.",
          ],
          purposeTitle: "Цели",
          purpose: [
            "Сохранять выбор языка.",
            "Обеспечивать контакт, обрабатывать запросы и управлять добровольно переданными данными.",
          ],
          legalTitle: "Правовые основания",
          legal: [
            "Законный интерес (ст. 6(1)(f) GDPR) для работы, безопасности и удобства сайта.",
            "Договор/преддоговор (ст. 6(1)(b) GDPR) при обращении.",
          ],
          storageTitle: "Срок хранения",
          storage: [
            "LocalStorage остаётся в браузере, пока вы не удалите его.",
            "Выбор языка хранится в localStorage браузера; удалить можно в любой момент.",
            "Email, переписка и загрузки хранятся только столько, сколько нужно для обработки, проверки или исполнения законных обязанностей.",
            "Учетные записи и обращения хранятся до удаления, завершения обработки или исполнения обязанностей.",
          ],
          rightsTitle: "Ваши права",
          rights: [
            "Доступ, исправление, удаление, ограничение, возражение по GDPR.",
            "Отзыв согласия с действием на будущее.",
            "Право на жалобу в надзорный орган.",
          ],
          callout:
            "Удалить LocalStorage: очистите «данные сайта/локальные данные» для этого сайта в браузере.",
        },
        privacy_notice: {
          title: "Конфиденциальность",
          text_before: "Информация о конфиденциальности находится на отдельной странице:",
          link: "Конфиденциальность",
        },
        contact: {
          title: "Контакт и ответственное лицо",
          items: {
            email: "E-mail: max.mustermann@example.com",
            email_label: "E-mail:",
            phone: "WhatsApp Business",
            landline: "",
            address: "Адрес: Musterstraße 1, 12345 Musterstadt",
          },
          callout:
            "По вопросам конфиденциальности или правовым вопросам свяжитесь через WhatsApp Business или e-mail.",
        },
        license: {
          title: "Лицензия / авторские права",
          items: [
            "Контент, макет, медиа и собственный код сайта защищены авторским правом, если прямо не указано иное.",
            "Использование разрешено только для доступа к этому сайту и предлагаемым материалам.",
            "Запрещены перепродажа, re-hosting, автоматическое считывание, scraping и публичная передача защищённых материалов.",
            "Для open-source компонентов действуют их собственные лицензии (см. соответствующие репозитории/файлы).",
            "Личные распечатки или локальные копии отдельных сведений разрешены для личного использования.",
            "Публикация, коммерческое использование или передача защищённых материалов без согласия запрещены.",
          ],
        },
      },
    },
    imprintPage: {
      kicker: "Импрессум",
      title: "Импрессум",
      back: "Назад на главную",
      toPrivacy: "К политике конфиденциальности",
      sections: {
        details: {
          title: "Данные согласно § 5 DDG",
          business_name: "Евгений Байрит – устный перевод и языковые услуги",
          country: "Германия",
          legal_form: {
            label: "Форма предпринимательства",
            value: "Индивидуальное предприятие",
          },
          contact: {
            label: "Контакт",
            email_label: "E-mail:",
            whatsapp_label: "WhatsApp Business:",
            whatsapp_link: "WhatsApp Business",
          },
          activity: {
            label: "Деятельность",
            value:
              "Устный перевод и языковые услуги, особенно немецко-русское языковое сопровождение по телефону, онлайн и на личных встречах.",
          },
        },
        liability: {
          title: "Ответственность за содержание и ссылки",
          text_primary:
            "Собственное содержание этого сайта создается с должной тщательностью. За содержание внешних сайтов, на которые ведут ссылки, отвечают соответствующие операторы.",
          text_secondary:
            "Предлагаемая информация и услуги не являются юридической или налоговой консультацией.",
        },
      },
    },
    privacyPage: {
      kicker: "Конфиденциальность",
      title: "Информация о конфиденциальности",
      intro:
        "Информация о том, какие данные могут обрабатываться у Евгения Байрита – языковые услуги для немецкого и русского.",
      facts_aria: "Краткий обзор",
      facts: {
        whatsapp: "WhatsApp Business",
        email: "Контакт по e-mail",
        no_ads: "Без рекламной аналитики",
      },
      sections: {
        controller: {
          title: "Ответственное лицо",
          text_before:
            "Ответственным за этот сайт является Евгений Байрит, Евгений Байрит – языковые услуги для немецкого и русского. Полные данные поставщика услуги указаны в",
          imprint_link: "импрессуме",
          email_label: "E-mail:",
          contact_way: "Способы связи: WhatsApp Business и e-mail",
        },
        serverlogs: {
          title: "Серверные журналы и техническая работа",
          text_primary:
            "При открытии сайта могут обрабатываться технически необходимые данные доступа, например IP-адрес, время, запрошенный URL, браузер/User-Agent, referrer и технические сообщения об ошибках. Эти данные нужны для работы, безопасности и анализа ошибок.",
          text_secondary:
            "Точный срок хранения и полная техническая конфигурация хостинга в проекте окончательно не задокументированы и должны проверяться у используемого хостинга/серверного оператора.",
        },
        contact: {
          title: "Контакт по e-mail и WhatsApp Business",
          email_text_before: "Если вы связываетесь по e-mail через",
          email_text_after:
            "переданные вами данные обрабатываются для обработки вашего запроса.",
          whatsapp_text:
            "При контакте через WhatsApp Business сайт только открывает существующий способ связи WhatsApp. Для WhatsApp Business дополнительно действуют правила конфиденциальности и условия использования соответствующего сервиса. Номер телефона на этой странице конфиденциальности дополнительно не публикуется.",
        },
        appointment_requests: {
          title: "Заявки на встречу",
          text_primary:
            "Если вы используете форму заявки на встречу, введенные вами данные обрабатываются для обработки заявки и согласования встречи. К ним могут относиться имя, адрес e-mail, мобильный номер, выбранная суббота, желаемое время, тип встречи и ваше необязательное сообщение.",
          text_secondary:
            "Адрес e-mail и мобильный номер по отдельности являются добровольными; однако для ответа необходимо указать хотя бы один способ связи. Данные не передаются внешним календарным сервисам.",
          availability_note:
            "В настоящее время заявки на встречу возможны только по субботам. Доступное время может измениться в ближайшем будущем.",
        },
        account: {
          title: "Аккаунт, вход и загрузки",
          items: {
            login:
              "При регистрации и входе обрабатываются e-mail, аккаунт пользователя, хеш пароля, данные сессии и необходимые данные аккаунта.",
            optional:
              "Опциональные данные профиля, фото профиля, запрос обратного звонка, настройки уведомлений, встречи, внутренние сообщения и сохранённые документы обрабатываются только при использовании соответствующей функции.",
            uploads:
              "Загрузки могут содержать имя файла, тип файла, размер файла, содержимое файла, заголовок и заметки. Они используются для обработки запроса и управления аккаунтом.",
            email_delivery:
              "Сброс пароля и письма аккаунта могут вызывать технические данные доставки и отправки у подключённого почтового сервиса.",
          },
        },
        cookies: {
          title: "Cookies, сессия и локальное хранение",
          items: {
            session:
              "Для входа и безопасности Django-приложение использует необходимые session- и CSRF-cookies.",
            language:
              "Прежний ручной выбор языка больше не используется постоянно как предпочтительный язык. Старые записи с именем <code>preferred_lang</code> удаляются на стороне клиента.",
            local_ui:
              "Сайт может сохранять локальные состояния интерфейса, например выбор темы, статус загрузчика, кеш погоды или состояния форм/виджетов.",
            no_tracking:
              "Tracking-cookies или рекламная аналитика в проверенном коде проекта не найдены.",
          },
        },
        external: {
          title: "Внешние сервисы и API",
          items: {
            contact:
              "WhatsApp Business и e-mail используются как внешние способы связи.",
            weather:
              "Функция погоды обращается к сервисам Open-Meteo для геокодинга и погодных данных, если эта функция используется.",
            no_fonts:
              "В проверенном коде сайта не найдены активные подключения внешних webfonts или analytics-скриптов.",
            providers:
              "Для хостинга, базы данных, отправки e-mail и работы сервера могут использоваться технические поставщики услуг. Конкретные поставщики и сроки хранения в проекте полностью не задокументированы.",
          },
        },
        rights: {
          title: "Ваши права",
          text:
            "Согласно DSGVO вы можете требовать доступ к данным, исправление, удаление, ограничение обработки, переносимость данных и возражение. Также существует право подать жалобу в компетентный надзорный орган по защите данных.",
          callout_before: "Запросы по конфиденциальности отправляйте, пожалуйста, на",
        },
      },
    },
    forum: {
      kicker: "Форум",
      title: "Контактная группа",
      badge: "Открытая группа",
      intro:
        "Обмен информацией в WhatsApp Business для обновлений и вопросов — без доступа к личным данным аккаунтов или внутренним разделам.",
      signal_note:
        "Форум работает через группу в WhatsApp Business. Можно сразу перейти по ссылке.",
      install_note:
        "Установите WhatsApp Business (мобильный или десктоп) и привяжите устройство. Потом ссылка откроет группу напрямую.",
      features: {
        title: "Что видно",
        items: [
          "Посты, файлы и объявления для всех.",
          "Информация о доступности, обновлениях и ресурсах.",
          "Раздел поддержки по вопросам работы или техники.",
          "Можно спросить, кто сможет помочь или подменить.",
        ],
      },
      restrictions: {
        title: "Что остается защищено",
        items: [
          "Нет доступа к базам данных, исходникам или dev-инструментам.",
          "Доступ по ролям — видны только разрешенные разделы.",
          "Нельзя менять системные или клиентские данные.",
          "WhatsApp Business использует сквозное шифрование; ссылки-приглашения можно переслать. Делитесь только с доверенными людьми.",
        ],
      },
      agb: {
        title: "Примечание для условий",
        items: [
          "Собственные WhatsApp Business-группы — это частные группы, не официальные каналы.",
          "Не публикуйте персональные данные клиентов; конфиденциальность сохраняется.",
          "Создатели модерируют сами; ссылки только проверенным переводчикам.",
          "Оператор не отвечает за контент внешних групп; доступ может быть отозван.",
          "Рекомендация: периодически обновлять ссылки; чувствительные случаи решать лично.",
        ],
      },
      dual_groups: "Одна общая группа WhatsApp Business для всех.",
      cta_primary: "Запросить доступ",
      cta_signal: "Связаться",
      cta_signal_users: "Связаться",
      cta_secondary: "Процесс в руководстве",
    },
    contact: {
      kicker: "Контакты",
      title: "Как связаться со мной",
      login_prompt: "",
      login_label: "",
      login_text:
        "Зарегистрируйтесь — после входа откроются e-mail и телефон/мессенджер.",
      register_hint:
        'Новый пользователь? <a href="/register/">Зарегистрироваться</a>',
      notice_label: "Нужен общий язык",
      text: [
        "Напишите пару строк о разговоре или встрече, где нужна языковая помощь. Вместе найдём решение.",
        "Принимаю только случаи, где нужна коммуникация между немецким и русским.",
      ],
      email_label: "Написать e-mail:",
      email_value: translateRuFallback(contactDefaults.email),
      phone_label: "Мессенджер (WhatsApp Business)",
      phone_value: "WhatsApp Business",
      landline_label: "",
      landline_value: "",
      availability_label: "Время связи:",
      availability_value: translateRuFallback(contactDefaults.availability),
      region_label: "Регион:",
      region_value: translateRuFallback(contactDefaults.region),
      quickactions: {
        gmail: "Написать e-mail",
        proton: "",
        whatsapp: "Отправить сообщение",
        landline_label: "",
        landline: "",
        signal: "",
        telegram: "",
      },
      map_kicker: "Карта",
      map_title: "Адрес (видно только после входа)",
      map_note: "Адрес сейчас не отображается.",
      note: translateRuFallback(contactDefaults.note),
    },
    profile_page: {
      hero: {
        title: "Профиль и данные",
        intro:
          "Здесь собраны ваши сохранённые данные, фото профиля, заявки, документы, сообщения и настройки связи.",
      },
      chips: {
        applications: "Заявки",
        photo: "Фото",
        photo_saved: "загружено",
        photo_optional: "по желанию",
        account: "Аккаунт",
        active: "активен",
        documents: "Документы",
        mailbox: "Записи в почте",
      },
      overview: {
        kicker: "Обзор",
      },
      tabs: {
        account: "Аккаунт",
        applications: "Заявки",
        documents: "Документы",
        mailbox: "Сообщения",
        callback: "Обратный звонок",
        notifications: "Уведомления",
        prev: "Предыдущие разделы",
        next: "Следующие разделы",
      },
      common: {
        last_login: "Последний вход",
        no_login: "Вход ещё не зафиксирован",
        member_since: "С нами с",
        email: "E-Mail",
        no_email: "E-Mail не указан",
        entries: "Записи",
        files: "Файлы",
        requests: "Запросы",
        bytes: "байт",
        submitted: "Отправлено",
        created: "Создано",
        planned: "Запланировано",
        region_open: "Регион не указан",
      },
      account: {
        kicker: "Личные данные",
        avatar_alt: "Фото профиля",
      },
      account_data: {
        kicker: "Данные аккаунта",
        title: "Изменить имя и e-mail",
        copy:
          "Имя и фамилию можно оставить пустыми. E-mail одновременно используется для входа.",
      },
      form: {
        first_name: "Имя",
        last_name: "Фамилия",
        title: "Название",
        note: "Заметка",
        file: "Файл",
        message: "Сообщение",
        callback_phone: "Номер для обратного звонка",
        time_windows: "Предпочтительные временные окна",
        hint: "Примечание",
        default_callback_phone: "Стандартный номер для обратного звонка",
        default_availability: "Обычная доступность",
      },
      photo: {
        kicker: "Фото профиля",
        title: "Обновить отображение",
        copy: "Загрузите новое фото или удалите текущее.",
        current: "Текущее фото профиля",
        preview: "Предпросмотр нового фото профиля",
        preview_alt: "Предпросмотр фото профиля",
        placeholder: "Выберите изображение, чтобы увидеть миниатюру здесь.",
        remove: "Удалить фото",
        undo_remove: "Отменить удаление",
        remove_hint: "Текущее фото профиля будет удалено после сохранения.",
        new_label: "Новое фото профиля",
        file_hint: "JPG, PNG или другой формат изображения. Выберите файл здесь.",
      },
      applications: {
        kicker: "Заявки",
        title: "Заявки переводчика",
        copy: "Здесь отображается статус ваших отправленных заявок.",
        empty_title: "Заявок пока нет",
        empty_text:
          "После отправки заявки она появится здесь с текущим статусом обработки.",
      },
      documents: {
        kicker: "Хранилище документов",
        title: "Письма, формы и PDF",
        copy:
          "Сохраняйте важные документы прямо в аккаунте и скачивайте их позже.",
        new_kicker: "Новый документ",
        upload_title: "Загрузить файл",
        upload_copy:
          "Подходит для писем, форм, PDF-файлов или простых текстовых документов.",
        empty_title: "Документы пока не сохранены",
        empty_text:
          "Загруженные документы будут собраны здесь вместе со ссылкой на скачивание.",
      },
      mailbox: {
        kicker: "Внутренняя почта",
        title: "Защищённый раздел сообщений",
        copy:
          "Пишите прямо из аккаунта. Ответы и внутренние заметки будут собраны в истории.",
        new_kicker: "Новое сообщение",
        write_title: "Написать команде",
        write_copy: "Подходит для вопросов, коротких обновлений или новых обращений.",
        empty_title: "Истории сообщений пока нет",
        empty_text:
          "После отправки сообщения или получения ответа запись появится здесь.",
      },
      callback: {
        kicker: "Обратный звонок и время",
        title: "Указать доступность",
        copy:
          "Сообщите, когда и по какому номеру с вами удобно связаться, чтобы согласование шло быстрее.",
        new_kicker: "Новый запрос на звонок",
        send_title: "Отправить временные окна",
        send_copy:
          "Эти данные команда сможет позже подтвердить или назначить как встречу.",
        empty_title: "Запросов на обратный звонок пока нет",
        empty_text:
          "Ваши отправленные временные окна и обновления статуса появятся здесь.",
      },
      notifications: {
        kicker: "Уведомления",
        title: "Управление e-mail-уведомлениями",
        copy:
          "Укажите, о каких изменениях в аккаунте нужно дополнительно сообщать по e-mail.",
        notify_reply: "Новый ответ во внутренней почте",
        notify_message: "Новое внутреннее сообщение",
        notify_appointments: "Изменения по обратному звонку / согласованию времени",
      },
      status: {
        application: {
          new: "Новая",
          approved: "Одобрена",
          rejected: "Отклонена",
        },
        callback: {
          new: "Новый",
          contacted: "Связались",
          scheduled: "Время запланировано",
          completed: "Завершено",
          cancelled: "Отменено",
        },
        mailbox: {
          reply: "Ответ",
          notice: "Примечание",
          message: "Ваше сообщение",
        },
      },
      actions: {
        save_account: "Сохранить данные аккаунта",
        save_photo: "Сохранить фото профиля",
        new_application: "Отправить новую заявку",
        save_document: "Сохранить документ",
        download: "Скачать",
        remove: "Удалить",
        send_message: "Отправить сообщение",
        save_callback: "Сохранить запрос на звонок",
        withdraw_application: "Отозвать заявку",
        withdraw_callback: "Отозвать запрос на звонок",
        save_settings: "Сохранить настройки",
      },
    },
    footer: {
      brand: "© 2026 Max Mustermann – Dolmetsch- & Sprachdienstleistungen",
      meta: [
        "Языковое сопровождение для ведомств и резюме",
        "Немецкий & Русский",
      ],
      views_label: "Посетители:",
      home_link: "Главная",
      contact_link: "Контакт",
      interpreters_link: "Услуги",
      donate_link: "Пожертвования",
      manual_link: "Руководство",
      account_link: "Мой аккаунт",
      dashboard_link: "Кабинет",
      weather_link: "Погода",
      imprint_link: "Импрессум",
      privacy_link: "Конфиденциальность",
      legal_link: "Условия использования",
      deploy_badge:
        "Обновление 01.04.2026: улучшены переключение языка и навигация по сайту.",
    },
    mobile: {
      primary: "Связаться",
      secondary: "Услуги",
    },
    ui: {
      fold_open: "Развернуть",
      fold_close: "Свернуть",
      account: "Аккаунт",
      account_language: "Аккаунт и язык",
      menu: "Меню",
      menu_subtitle: "",
      lang_button: "Язык",
      register: "Регистрация",
      login: "Войти",
      logout: "Выйти",
      delete_account: "Удалить аккаунт",
      logged_in_as: "Вошли как",
      lang_tooltip: {
        title: "Выбрать язык",
        subtitle: "Переключайтесь между немецким, русским и украинским.",
      },
    },
    interpreter_dashboard: {
      title: "Кабинет переводчика | Eugen Beirit – Dolmetsch- & Sprachdienstleistungen",
      hero: {
        kicker: "Переводчики",
        title: "Кабинет",
        intro:
          "Доступность, заблокированные дни и контактные запросы собраны в одном месте. Страница устроена как рабочая панель: сначала обзор, затем планирование, потом коммуникация.",
        edit_profile: "Редактировать профиль",
        update_application: "Обновить заявку",
        to_contact_book: "К контактам",
        to_calendar: "К календарю",
        contacts_in_chat: "контактов в истории",
        upcoming_entries: "предстоящих записей",
      },
      spotlight: {
        next_entry: "Следующая запись",
        blocked_all_day: "Заблокировано на весь день",
        calendar_open: "Календарь свободен",
        empty: "Пока нет будущих встреч или заблокированных дней.",
        open_requests: "Открытые запросы",
        contacts_with_open_topics: "контактов с открытыми темами",
        this_week: "Эта неделя",
      },
      stats: {
        aria_label: "Обзор",
        appointments: "Встречи",
        appointments_note: "Предстоящие занятые интервалы",
        blocked_days: "Блокировки",
        blocked_days_note: "Дни, заблокированные на весь день",
        contacts: "Контакты",
        contacts_note: "Контакты с историей в адресной книге",
        open_messages: "Новые сообщения",
      },
      planner: {
        kicker: "Планирование",
        title: "Вести календарь",
        intro:
          "Новые встречи и блокировки сразу попадают в повестку и в календарь.",
        appointment: {
          title: "Добавить занятое время",
          intro: "Для визитов к врачу, выездов или фиксированных блоков.",
          chip: "Встреча",
          save: "Сохранить встречу",
        },
        day: {
          title: "Заблокировать день",
          intro: "Для отпуска, отсутствия или полностью занятых дней.",
          save: "Сохранить блокировку",
        },
      },
      form: {
        date: "Дата",
        start: "Начало",
        end: "Конец",
        description: "Описание",
        internal_note: "Внутренняя заметка",
        note: "Примечание",
      },
      agenda: {
        kicker: "Повестка",
        title: "Предстоящие записи",
        intro:
          "Все расположено по времени, чтобы изменения было проще увидеть.",
        until: "до",
        time_open: "Время не указано",
        all_day: "Весь день",
        no_note: "Без дополнительной заметки",
        empty: "Пока нет будущих встреч или заблокированных дней.",
      },
      actions: {
        edit: "Редактировать",
        delete: "Удалить",
        save: "Сохранить",
        cancel: "Отмена",
        delete_appointment_aria: "Удалить встречу",
        delete_day_aria: "Удалить блокировку дня",
      },
      contacts: {
        kicker: "Контакт",
        title: "Контакты",
        intro:
          "Пользователи появляются здесь автоматически, когда отправляют сообщение.",
        messages: "сообщений",
        no_email: "без e-mail",
        no_email_stored: "E-mail не указан",
        open: "открыто",
        last_contact: "Последний контакт:",
        empty_thread: "Сообщений пока нет.",
        reply_to: "Ответ для",
        message_placeholder: "Введите сообщение",
        send_reply: "Отправить ответ",
        empty_selected: "Выберите контакт слева.",
        empty_book:
          "Как только вошедший пользователь отправит сообщение, он появится здесь с фото профиля и историей.",
      },
      status: {
        kicker: "Статус",
        title: "Текущая картина",
        intro: "Главные сигналы без перехода по отдельным разделам.",
        user: "Пользователь",
        next_appointment: "Следующая встреча",
        none: "нет",
        agenda_total: "Всего в повестке",
        entries: "записей",
        response_needed: "Нужно ответить",
        messages: "сообщений",
        helper:
          "Совет: сохраняйте встречи сразу с короткой внутренней заметкой. Так повестка и последующие вопросы читаются заметно проще.",
      },
      calendar: {
        kicker: "Календарь",
        title: "Доступность на виду",
        intro:
          "Справа те же записи показаны ещё раз в виде сетки месяца.",
        legend_busy: "Встреча или занятый слот",
        legend_blocked: "Заблокировано на весь день",
        legend_open: "Свободно или без записи",
      },
      dialogs: {
        appointment_title: "Редактировать встречу",
        day_title: "Редактировать блокировку дня",
        optional_note: "Необязательная заметка",
      },
    },
    apply: {
      badge: "Стать переводчиком",
      title: "Подать заявку",
      subtitle:
        "Укажите языки, регион и пару слов о себе — этого достаточно для начала.",
      hero: {
        chip_time: "Заполнить форму",
        chip_review: "Проверка перед публикацией",
        chip_status: "Статус в аккаунте",
        value_1_title: "Понятная видимость",
        value_1_text:
          "Заказчики сразу видят ваши языки, регион и основные направления.",
        value_2_title: "Контролируемая публикация",
        value_2_text:
          "Каждая заявка проверяется до того, как профиль станет публичным.",
        value_3_title: "Можно обновлять позже",
        value_3_text:
          "Доступность, фото и данные можно позже поддерживать в актуальном виде.",
      },
      process: {
        kicker: "Порядок",
        step_1: "Откройте аккаунт и заполните форму заявки.",
        step_2: "Укажите языки, регион и специализацию.",
        step_3: "При желании добавьте фото и доступность.",
        step_4:
          "После проверки профиль будет опубликован или вернется со статусом.",
      },
      submitted: {
        title: "Заявка отправлена",
        text: "Спасибо! Ваши данные получены, вы уже можете начинать как переводчик.",
      },
      form: {
        kicker: "Форма заявки",
        note:
          "Для начала достаточно основных данных. Ваш e-mail остается связанным с аккаунтом и не показывается публично из этой формы.",
        display_name: "Имя или компания (показывается публично)",
        languages: "Языки (например, DE/RU)",
        region: "Регион / город",
        specialization: "Специализация (опционально)",
        experience: "Опыт / сертификаты (опционально)",
        availability: "Доступность (опционально)",
        motivation: "Краткое описание",
        motivation_hint:
          "Рекомендуется кратко указать языковую пару, места работы, опыт и типичные встречи.",
        photo_label: "Фото профиля (опционально)",
        photo_hint:
          "Дружелюбное и четкое фото повышает доверие. Начать можно и без фото.",
        submit: "Отправить заявку",
        submit_note:
          "Отправляя форму, вы подтверждаете, что ваши данные могут быть сохранены для проверки профиля.",
      },
      latest: {
        title: "Последняя заявка",
        text: "Отправлено — статус:",
      },
      sidebar: {
        kicker: "Перед отправкой",
        item_1: "Используйте имя, по которому вас позже смогут найти.",
        item_2: "Указывайте языки и регионы как можно конкретнее.",
        item_3:
          "Укажите языковые пары, регионы и типичные сферы работы.",
        item_4:
          "Короткие и конкретные описания сильнее общих формулировок.",
        example_title: "Хорошее краткое описание",
        example_text:
          "DE/RU, Берлин и Бранденбург, фокус на приемах у врача и ведомствах. 4 года опыта, возможны краткосрочные выезды по договоренности.",
        visibility_title: "Видимость",
        visibility_text:
          "До подтверждения запись остается внутренней. Профиль появится в списке переводчиков только после проверки.",
      },
    },
  },
};

const VOCAB_TRANSLATIONS = {
  "de": {
    "back": "Zur Sprachplattform",
    "module": "Lernmodul der Sprachplattform",
    "intro": "Lerne deutsche Nomen mit Artikeln. Suche, filtere, markiere schwierige Wörter und prüfe dein Wissen im Artikel-Quiz.",
    "words": "Vokabeln",
    "known": "gelernt",
    "favorites": "Favoriten",
    "word_list": "Wortliste",
    "search": "Suche",
    "search_placeholder": "z. B. Apfel oder Schule",
    "article": "Artikel",
    "all": "Alle",
    "training": "Training",
    "quiz": "Artikel-Quiz",
    "question": "Welcher Artikel passt?",
    "next": "Nächste Frage",
    "selection": "Auswahl",
    "overview": "Lernübersicht",
    "answers": "Antworten",
    "storage": "Lernstand und Favoriten werden in diesem Browser gespeichert.",
    "session_storage": "Lernstand und Favoriten bleiben für diese Sitzung erhalten. Der Browserspeicher ist nicht verfügbar.",
    "matches": "Treffer",
    "meaning": "Bedeutung",
    "mark_unknown": "Als ungelernt markieren",
    "mark_known": "Als gelernt markieren",
    "remove_favorite": "Favorit entfernen",
    "favorite": "Favorit",
    "correct": "Richtig",
    "incorrect": "Richtig ist"
  },
  "ru": {
    "back": "К языковой платформе",
    "module": "Учебный модуль языковой платформы",
    "intro": "Изучайте немецкие существительные с артиклями. Ищите слова, используйте фильтры, добавляйте сложные слова в избранное и проверяйте знания в тесте.",
    "words": "Слова",
    "known": "выучено",
    "favorites": "Избранное",
    "word_list": "Список слов",
    "search": "Поиск",
    "search_placeholder": "например, Apfel или Schule",
    "article": "Артикль",
    "all": "Все",
    "training": "Тренировка",
    "quiz": "Тест на артикли",
    "question": "Какой артикль подходит?",
    "next": "Следующий вопрос",
    "selection": "Выбор",
    "overview": "Обзор обучения",
    "answers": "Ответы",
    "storage": "Прогресс и избранное сохраняются в этом браузере.",
    "session_storage": "Прогресс доступен в текущем сеансе. Хранилище браузера недоступно.",
    "matches": "результатов",
    "meaning": "Значение",
    "mark_unknown": "Отметить как невыученное",
    "mark_known": "Отметить как выученное",
    "remove_favorite": "Удалить из избранного",
    "favorite": "В избранное",
    "correct": "Правильно",
    "incorrect": "Правильный ответ"
  },
  "uk": {
    "back": "До мовної платформи",
    "module": "Навчальний модуль мовної платформи",
    "intro": "Вивчайте німецькі іменники з артиклями. Шукайте слова, використовуйте фільтри, додавайте складні слова до обраного та перевіряйте знання в тесті.",
    "words": "Слова",
    "known": "вивчено",
    "favorites": "Обране",
    "word_list": "Список слів",
    "search": "Пошук",
    "search_placeholder": "наприклад, Apfel або Schule",
    "article": "Артикль",
    "all": "Усі",
    "training": "Тренування",
    "quiz": "Тест на артиклі",
    "question": "Який артикль підходить?",
    "next": "Наступне запитання",
    "selection": "Вибір",
    "overview": "Огляд навчання",
    "answers": "Відповіді",
    "storage": "Прогрес та обране зберігаються в цьому браузері.",
    "session_storage": "Прогрес доступний у поточному сеансі. Сховище браузера недоступне.",
    "matches": "результатів",
    "meaning": "Значення",
    "mark_unknown": "Позначити як невивчене",
    "mark_known": "Позначити як вивчене",
    "remove_favorite": "Видалити з обраного",
    "favorite": "До обраного",
    "correct": "Правильно",
    "incorrect": "Правильна відповідь"
  }
};
for (const [lang, vocab] of Object.entries(VOCAB_TRANSLATIONS)) {
  TRANSLATIONS[lang] = { ...TRANSLATIONS[lang], vocab, nav: { ...TRANSLATIONS[lang]?.nav, vocab: "Vokabelbox" } };
}

if (typeof window !== "undefined") {
  window.TRANSLATIONS = TRANSLATIONS;
}

// Node-Export für Konsistenz-Checks ohne DOM.
if (typeof module !== "undefined") {
  module.exports = TRANSLATIONS;
}

for (const language of Object.values(TRANSLATIONS)) language.nav.deutschlive = "DeutschLive";
