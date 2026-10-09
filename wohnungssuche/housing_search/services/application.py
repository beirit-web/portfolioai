def generate_cover_letter(applicant_profile, listing):
    greeting = "Sehr geehrte Damen und Herren,"
    intro = applicant_profile.short_intro.strip() or (
        f"mein Name ist {applicant_profile.full_name}. Ich interessiere mich fuer die angebotene Wohnung "
        f"in {listing.city}."
    )
    household = f"Einziehen wuerden {applicant_profile.persons_count} Person(en)."
    if applicant_profile.pets:
        household += f" Haustiere: {applicant_profile.pets}."
    if applicant_profile.smoking:
        household += " Ich moechte transparent erwaehnen, dass im Haushalt geraucht wird."
    else:
        household += " Es handelt sich um einen Nichtraucherhaushalt."

    finances = []
    if applicant_profile.occupation:
        finances.append(f"Beruf/Taetigkeit: {applicant_profile.occupation}.")
    if applicant_profile.income:
        finances.append(f"Das angegebene Nettoeinkommen betraegt {applicant_profile.income} EUR.")
    if applicant_profile.schufa_available:
        finances.append("Eine SCHUFA-Auskunft kann vorgelegt werden.")
    if applicant_profile.documents_available:
        finances.append("Die ueblichen Bewerbungsunterlagen sind vorbereitet.")

    contact = f"Sie erreichen mich per E-Mail unter {applicant_profile.email}"
    if applicant_profile.phone:
        contact += f" oder telefonisch unter {applicant_profile.phone}"
    contact += "."

    paragraphs = [
        greeting,
        intro,
        (
            f"Die Wohnung \"{listing.title}\" mit {listing.rooms} Zimmern und {listing.size} m2 "
            f"passt gut zu meiner aktuellen Suche."
        ),
        household,
        " ".join(finances),
        "Ich freue mich ueber eine Rueckmeldung und gerne ueber einen Besichtigungstermin.",
        contact,
        "Mit freundlichen Gruessen",
        applicant_profile.full_name,
    ]
    return [paragraph for paragraph in paragraphs if paragraph.strip()]
