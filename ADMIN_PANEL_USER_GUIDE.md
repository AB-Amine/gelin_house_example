# GELIN HOUSE — Complete guide to the current admin panel

Updated: **12 November 2026**, after the final start-time diary and connected public-synchronization fixes.

This is a practical guide to the **current application**. Explanations are in English; the screen, button and field names stay in French so you can find them in the admin.

No password, database password or secret key is included.

## Contents

1. [The system in plain language](#1-the-system-in-plain-language)
2. [Login, logout and account security](#2-login-logout-and-account-security)
3. [Navigation and common controls](#3-navigation-and-common-controls)
4. [Tableau de bord: every area and button](#4-tableau-de-bord-every-area-and-button)
5. [Incoming appointment requests: every action](#5-incoming-appointment-requests-every-action)
6. [Preferred start times and confirmation errors](#6-preferred-start-times-and-confirmation-errors)
7. [Rendez-vous: list, filters and details](#7-rendez-vous-list-filters-and-details)
8. [Appointment statuses and action buttons](#8-appointment-statuses-and-action-buttons)
9. [Calendar: viewing, changing and cancelling](#9-calendar-viewing-changing-and-cancelling)
10. [Creating an appointment yourself](#10-creating-an-appointment-yourself)
11. [Clientes: details, notes and history](#11-clientes-details-notes-and-history)
12. [Prestations: all fields and buttons](#12-prestations-all-fields-and-buttons)
13. [Categories](#13-categories)
14. [Offres: promotions](#14-offres-promotions)
15. [Mon salon: information and weekly hours](#15-mon-salon-information-and-weekly-hours)
16. [Exceptions and closures](#16-exceptions-and-closures)
17. [Photos, website content and languages](#17-photos-website-content-and-languages)
18. [Advanced screens and their controls](#18-advanced-screens-and-their-controls)
19. [What is saved, reserved or sent](#19-what-is-saved-reserved-or-sent)
20. [Daily workflows and troubleshooting](#20-daily-workflows-and-troubleshooting)
21. [Direct links and technical reference](#21-direct-links-and-technical-reference)

## 1. The system in plain language

The website collects preferred appointment requests. You decide whether to accept them. The admin now uses a **manual diary based only on start times**.

| Setting | Current operating model |
| --- | --- |
| Location | One physical salon in Khouribga, Morocco |
| Diary | One shared list/calendar of appointment starts |
| Same start time | Only one active appointment may use an exact start |
| Treatment overlap | Not automatically guaranteed: different starts can overlap during treatment; the owner decides |
| Duration/end time | Not required when confirming or manually creating an appointment; no duration is invented |
| Employees/equipment/city | No selection or setup required in normal appointment forms |
| Phone | 0607725751, stored internationally as +212607725751 |
| Address | khouadria cafe arha pres de ecole omar el khayam |
| Normal hours initially saved | 10:01–21:00; opening days and periods are editable |
| Time input | A preferred/manual start, including minutes such as 14:07; no 15-minute restriction in the diary |
| Prices | Known prices stay known; unknown prices remain sur demande |

Opening hours describe the salon's usual schedule. The owner assesses whether to accept a requested diary start, including any exceptional agreement. This simplified diary does not calculate treatment endings or promise a fully available treatment interval.

### Requests versus appointments

| Item | Meaning | Where it appears |
| --- | --- | --- |
| Pending website request | Customer's preferred services/date/start; no appointment start reserved yet | Dashboard and Demandes du site |
| Confirmed diary appointment | Owner accepted; exact start is reserved | Calendar, list, dashboard |
| Older interval appointment | Existing booking with previously recorded duration/end/allocations | Preserved calendar/history; existing interval protections remain |
| Modification request | Customer asks to change an existing booking | Protected advanced Demandes de modification |

Confirmation reuses the request's customer and services. Cancellation updates the appointment and retains its history; it does not delete the record. A cancelled diary start can be reused.

Old screen wording may mention a resource or internal **Au salon** location. The diary's confirmation/manual form requires neither. Admin login accounts remain separate from employee scheduling.

## 2. Login, logout and account security

Open [admin login](http://127.0.0.1:3000/admin/login).

The local address works while the development website is running on your computer. A future hosted website uses its own domain with the same `/admin` paths. Supabase data is remote; this does not make the local website address accessible from every device.

| Control | What to enter / what it does |
| --- | --- |
| **Adresse e-mail** | Your admin email: `aminebazaoui2002@gmail.com` |
| **Mot de passe** | The password you chose for this admin account |
| **Se connecter ↗** | Checks credentials and opens the dashboard |
| **Un instant…** | The sign-in request is being processed; wait |
| **Mot de passe oublié ?** | Opens `/admin/reset` |
| **Recevoir les instructions** | Requests password-reset instructions for the entered email; delivery depends on the configured email service |
| **Sécurité du compte** | Opens `/admin/password` from advanced settings |
| **Nouveau mot de passe (12 caractères minimum)** | The new account password, on the password-change page |
| **Mettre à jour** | Saves the new password after valid authentication/recovery |
| **Se déconnecter** | Ends the admin session and returns to login |

The admin password is not the Supabase database password. Do not paste database/API keys into the login form.

### Real admin versus preview

| Address | Purpose |
| --- | --- |
| `/admin/login` → `/admin` | Real authenticated admin connected to Supabase |
| `/admin/preview` | Development demonstration: changes stay in that browser |

Preview is not your real inbox or calendar. It may retain older example screens. It does not publish your changes or create real appointments, and it is unavailable in production.

## 3. Navigation and common controls

### The five main sections

| Menu | Use it for | Starting address |
| --- | --- | --- |
| **Tableau de bord** | Today's agenda and incoming requests | `/admin` |
| **Rendez-vous** | Scheduled bookings, requests, calendar and customers | `/admin/bookings` |
| **Prestations** | Services, prices, durations and categories | `/admin/services` |
| **Offres** | Promotions and eligible services | `/admin/promotions` |
| **Mon salon** | Information, hours, photos, website text and advanced settings | `/admin/settings` |

On a computer, use the sidebar. On a phone or narrow window, use **Menu**, then select the section. **Fermer** closes that navigation menu.

The **GELIN HOUSE** wordmark returns to the dashboard. **Voir le site ↗** opens the customer website.

### Section tabs

| Section | Current tabs |
| --- | --- |
| Rendez-vous | **Liste**, **Demandes du site**, **Calendrier**, **Clientes** |
| Prestations | **Prestations**, **Catégories** |
| Mon salon | **Informations**, **Horaires**, **Photos**, **Site web** |

**Réglages avancés et sécurité** opens a protected advanced area using the existing settings route. It keeps rare controls away from the four everyday tabs. Requests remain under Rendez-vous.

### Buttons used throughout the admin

| Button/control | Exact effect |
| --- | --- |
| **Ajouter** | Opens a new record form; does not save it yet |
| **Modifier** on a record | Opens the existing record for editing |
| **Enregistrer** | Validates the form and saves it to Supabase |
| **Enregistrement…** | A save is in progress; wait for the result |
| **Annuler** inside an ordinary edit form | Closes the form and abandons unsaved edits; this does not cancel an appointment |
| **Paramètres avancés** | Expands optional fields in that form |
| **Rechercher sur cette page** | Filters only the records already loaded on the current page |
| **Supprimer** | Opens an inline deletion confirmation for records where deletion is allowed |
| **Confirmer la suppression** | Actually deletes that specific record, subject to database protections |
| **Conserver** | Closes the deletion confirmation without deleting |
| **Continuer / Suivant →** beside a page number | Loads the next page of records; it is not an appointment confirmation |
| **Retour / Précédent ←** beside a page number | Loads the previous page |
| A checkbox | Changes the form value; usually you still need **Enregistrer** |

There is no automatic save while typing. Leaving a page, opening another record or closing a form may discard edits without an extra popup.

If saving shows an error, do not assume the change was saved. A disabled button can indicate a save in progress, a missing required value or an action unavailable in the current state.

## 4. Tableau de bord: every area and button

Open `/admin`.

### Header and main numbers

The header shows the salon's date and **+ Nouveau rendez-vous**.

| Number | What it counts |
| --- | --- |
| **Rendez-vous aujourd’hui** | Scheduled appointments starting today in the salon timezone, including their different statuses |
| **Rendez-vous à venir** | Future scheduled appointments whose status is pending or confirmed |
| **Demandes du site à traiter** | Website appointment requests whose decision is still pending |

A new website request increases the request counter. It does not increase the appointment counters until an appointment is created.

### Quick actions

| Button | Destination |
| --- | --- |
| **Nouveau rendez-vous** | Manual appointment creation |
| **Ajouter une prestation** | A new service form |
| **Créer une offre** | A new promotion form |

### Demandes de rendez-vous du site

The dashboard shows the six latest website appointment requests, newest first. Cards include customer name, contact details, original service/notes information, preferred date/time and decision status.

| Button | What it does |
| --- | --- |
| **Actualiser** | Reloads dashboard data immediately |
| **Tout voir** | Opens the complete inbox |
| **Confirmer** | Tries to create and confirm the appointment at the requested date/time |
| **Modifier** | Opens the request's date/time controls, including available times when calculable |
| **Refuser** | Records that the request was declined |
| **Voir le calendrier** | Shown after successful confirmation; opens the confirmed date |
| **Voir le rendez-vous** | Opens the linked booking details for an already converted request |

These request buttons are explained fully in section 5.

The recent list also retains resolved requests. A visible card with **Rendez-vous créé** or **Refusée** does not count as pending. A linked appointment may later be cancelled or changed; use **Voir le rendez-vous** for its actual current status.

### Aujourd’hui

Shows up to 12 scheduled appointments for today. Click an appointment to inspect it. **Tout voir →** opens the list filtered to today.

An unconfirmed website request is not a scheduled appointment and therefore is not placed in this agenda.

### À confirmer

Shows up to six pending **scheduled bookings**. This differs from the website request cards above.

- **Confirmer** opens the status action for the already scheduled booking.
- **Refuser** opens its refusal action and requires a reason.
- **Valider** applies the chosen action.
- **Annuler** closes that action form without applying it.
- **Tout voir** opens pending scheduled bookings in the full list.

### À suivre

Links to pending modification requests, general inbox messages and notification event records. These are separate counts, not additional appointments. Notification records do not prove an email or SMS was delivered.

### Refresh behaviour

The dashboard refreshes every 30 seconds while visible and when you return focus to the window. Its timer pauses during its own scheduled-appointment action form/save. **Actualiser** or a normal page reload also retrieves the current data.

## 5. Incoming appointment requests: every action

Open **Rendez-vous → Demandes du site** or use the dashboard request cards.

The card shows the customer's name, phone, services, preferred date/start and status. Email and notes appear only when supplied.

| Status | Meaning |
| --- | --- |
| **En attente** | Awaiting the salon's decision |
| **Refusée** | Declined; no appointment created |
| **Rendez-vous créé** | Linked to a booking; open that booking for its current status |

### Confirmer

Press **Confirmer** to accept the submitted date/start in one click. The app reuses contact details and services, validates the request and prevents an identical active start. It does not ask for a duration, end, staff, city or quote.

Success: **Rendez-vous confirmé et ajouté au calendrier.**

**Voir le calendrier** opens that date after success. **Voir le rendez-vous** opens the linked details on an already converted request.

A missing service duration no longer blocks diary confirmation. A hidden/archived/unavailable service or duplicate exact start can still block the action. Confirmation retries reuse the linked booking rather than creating duplicates.

### Modifier

| Field/button | Behaviour |
| --- | --- |
| **Date** | New preferred appointment date |
| **Heure de début** | New preferred start, entered directly |
| **Enregistrer la modification** | Saves the proposal and leaves the request pending |
| **Confirmer le rendez-vous** | Confirms the edited date/start if valid and not already reserved exactly |
| **Refuser** | Declines the request |
| **Fermer** | Closes the editor without saving further edits |

If proposing another time, contact the customer manually and confirm after agreement. The app does not send that proposal automatically. There is no treatment-duration or end-time field.

### Refuser

Records a refusal without an appointment or start reservation. It does not send a notification or delete the request. There is no ordinary undo-refusal button on this card.

### General messages and inbox controls

General contact/rental messages can appear alongside appointment requests.

- **Marquer comme traité** marks an ordinary message dealt with; it never creates an appointment.
- **Rouvrir** puts that ordinary message back into the attention list.
- **Actualiser les demandes** reloads the inbox.
- Page links browse older records, up to 50 per page.

## 6. Preferred start times and confirmation errors

The old “choose an available slot” workflow no longer applies to the normal diary. Customers choose a preference and owners accept or change a start time manually.

The diary accepts minute-specific starts such as **14:07** without assuming the treatment lasts until any particular time. The calendar shows start times. Owners must judge actual treatment overlap.

| Message/problem | Next action |
| --- | --- |
| **Un rendez-vous est déjà prévu à cette heure…** | Another active appointment has exactly that start; use Modifier to choose another start |
| **Cette heure de début est déjà réservée ou n’est pas valide…** | Change the date/start and try again |
| Service unavailable | Check publication/archiving; rental items remain enquiries |
| Missing salon configuration | Follow the settings link; contact and basic policies were already set up during this session |
| Invalid contact/date/time | Enter the required valid values |
| Session expired/access denied | Sign in again |
| Too many attempts | Wait before retrying |

A failed action does not create a confirmed record. It leaves the request pending.

The owner diary does not enforce the older interval flow's treatment-length calculations, 15-minute grid, lead-time window or staff/resource allocation. Existing older interval appointments retain their original rules and recorded times.

Dates/start times are interpreted on the server using the salon timezone, Africa/Casablanca, so browser timezone differences do not silently move a rescheduled start.

## 7. Rendez-vous: list, filters and details

Open **Rendez-vous → Liste**, `/admin/bookings`.

### Period shortcuts

| Link | Shows |
| --- | --- |
| **Aujourd’hui** | Appointments starting today |
| **Cette semaine** | The salon's current week, beginning Monday |
| **À venir** | Appointments starting in the future; the default period |
| **En attente** | Scheduled bookings pending confirmation |
| **Tous** | All periods, subject to any other filters |

The list includes booking records, not unconverted website requests. A reference/customer history link can open a specific record/history without the default future-date restriction.

### Search and filters

| Control | Use |
| --- | --- |
| Search field | Search booking/customer information supported by the booking search |
| **Plus de filtres** | Expands extra filters |
| **Du / Au** | Beginning/end of the date range |
| **Statut** | Select a booking status; Tous clears that status restriction |
| **Ville** | Retained location filter; current salon location is **Au salon** |
| **Prestations** | Restrict to bookings involving a selected service |
| **Filtrer** | Applies the form's filter choices |
| **+ Nouveau rendez-vous** | Opens manual booking creation |

Changing a filter field does not submit it automatically; press **Filtrer**. If a booking is missing, start with **Tous** and remove restrictive filters.

### The table

Columns include reference, customer, location, services, date/time, status, estimated price and actions. A reference such as `GH-…` identifies a booking; it is not the customer's account or payment number.

**Voir les détails** opens/closes the expanded booking. A page opened for one booking normally opens that booking automatically.

### Expanded booking details

You can see customer contact information, address/location, original notes, event details and the quoted amount. Expanding **Voir les détails** reveals recorded prices/discounts and private notes/history. Diary entries do not display a fabricated ending or duration; older interval records retain their historical timing details.

| Control | Action |
| --- | --- |
| Customer phone link | Opens your device's calling application when supported |
| **Notes internes** field | Write a private note about this appointment |
| **Enregistrer** beside notes | Saves the private note; does not change the booking status |
| **Historique des actions** | Loads the booking's recorded action history |
| Status action buttons | Offer only transitions allowed from the current status |

Internal notes are not public website descriptions. Saving them does not send them to the customer.

## 8. Appointment statuses and action buttons

These controls concern scheduled bookings. A website request has the separate statuses in section 5.

| Current status | Meaning | Actions that may be offered |
| --- | --- | --- |
| **En attente de confirmation** | A scheduled booking exists and reserves its period, but awaits the salon's decision | Confirmer; Refuser; cancel for customer/salon; change date/time |
| **Confirmé** | The salon confirmed the scheduled appointment | Start treatment; cancel; report absence when allowed; change date/time |
| **En cours** | Treatment has started | Complete; cancel for the salon with a reason |
| **Terminé** | Treatment was completed | No normal further status transition |
| **Refusé** | Scheduled booking was refused | History only |
| **Annulé par la cliente** | Cancelled at the customer's request | History only |
| **Annulé par le salon** | Cancelled by the salon | History only |
| **Absence** | Customer did not attend | History only |

### Every booking action

| Button | Effect |
| --- | --- |
| **Confirmer** | Changes a pending scheduled booking to confirmed |
| **Refuser** | Refuses a pending scheduled booking and releases its capacity |
| **Commencer la prestation** | Marks a confirmed appointment in progress |
| **Marquer comme terminé** | Completes an in-progress appointment |
| **Annuler à la demande de la cliente** | Records customer-requested cancellation and releases capacity |
| **Annuler le rendez-vous** | Opens salon cancellation; this is the actual appointment-cancellation action |
| **Signaler une absence** | Records a no-show when the configured time/grace rules allow it |
| **Modifier la date ou l’heure** | Opens the rescheduling form for a pending/confirmed booking |
| **Enregistrer** in the action form | Applies a non-cancellation action after validation |
| **Confirmer l’annulation** | Applies the cancellation selected in the action form |
| **Annuler** in the action form | Closes that form without changing the appointment |

A reason is required for refusing a scheduled booking and for cancelling a treatment that is already in progress. The form indicates the reason field. Other cancellation reasons can be optional.

Status changes are not free-form edits. Completed/cancelled/refused/no-show bookings do not have a normal “restore to confirmed” button. Preserve history rather than deleting records to change their effect.

## 9. Calendar: viewing, changing and cancelling

Open **Rendez-vous → Calendrier**, `/admin/calendar`.

### Calendar toolbar

| Field/button | Behaviour |
| --- | --- |
| **Date** | Select the date around which to display the calendar |
| **Vue → Jour** | Displays the selected day |
| **Vue → Semaine** | Displays the containing week |
| **Vue → Mois** | Displays the containing month |
| **Vue → Liste (30 jours)** | Lists appointments over a 30-day period |
| Search | Restricts the calendar to matching booking information |
| **Filtrer** | Applies date/view/search |
| **+ Nouveau rendez-vous** | Opens manual creation |
| **← Retour** in calendar navigation | Moves to the previous period while keeping filters |
| **Continuer →** in calendar navigation | Moves to the next period while keeping filters |
| A day/date link | Opens that day in day view |
| **+ N rendez-vous** on a crowded day | Opens the day to see appointments hidden by the compact preview |
| An appointment card | Opens its booking details |

Each appointment displays its time, customer and status. Expanded views also show services and more detail. Opening periods and closure blocks are context, not appointments.

The active calendar omits cancelled/rejected bookings. They remain in the booking list/history. The calendar refreshes when the window regains focus; use Filtrer/reload if you need an immediate reload while staying in the same window.

### Cancel a calendar appointment

1. Click its calendar card.
2. In the opened booking details, press **Annuler le rendez-vous**.
3. Enter a reason if needed.
4. Press **Confirmer l’annulation**.

The booking stays in Supabase as cancelled. Its active capacity allocations are released automatically. The period can be offered again if opening hours, notice and other rules still permit it. Do not delete an appointment to free a slot.

### Change an existing appointment's time

1. Open its details from the calendar/list.
2. Press **Modifier la date ou l’heure**.
3. Change the date/time field; it starts with the current appointment time.
4. Press **Enregistrer**.

This form uses a date/start field. For diary entries, choose the start agreed with the customer; there is no duration/end field or 15-minute grid. For diary appointments the server prevents an identical active start; it does not calculate a full available treatment period.

For a diary entry, the exact old start is released and the new start reserved together. A collision leaves the old start intact. Legacy interval appointments retain their original allocation checks.

## 10. Creating an appointment yourself

Use **Nouveau rendez-vous** from the dashboard, list or calendar. It opens **one form**, not the old wizard.

| Field/button | Use |
| --- | --- |
| Service selector | Add one or several published beauty services |
| Selected service rows | Review the chosen treatments; Retirer removes one from the form |
| **Date** | Appointment date |
| **Heure de début** | Start time only |
| **Nom de la cliente** | Customer name |
| **Téléphone** | Valid customer phone |
| Optional note | Relevant information without extra event questions |
| **Enregistrer le rendez-vous** | Creates a confirmed diary appointment directly |
| **Voir le calendrier** after success | Opens the saved date |

There is no city selector, event address/details, account requirement, quote stage, duration or end-time field. The physical Khouribga salon is used internally.

Different starts do not prove treatments cannot overlap. Decide based on the salon's real situation. If the exact start is already active, choose another one. Repeating the same successful submission does not create another copy.

## 11. Clientes: details, notes and history

Open **Rendez-vous → Clientes**, `/admin/clients`.

| Control/information | Meaning |
| --- | --- |
| Search + **Rechercher** | Searches the customer directory |
| Account/guest badge | Distinguishes an account holder from a guest customer |
| Phone/email links | Open your calling/email application when supported |
| Booking count | Number of appointments associated with that customer |
| Completed count | Number completed |
| Next appointment | The next recorded booking, when present |
| **Votre historique** | Opens this customer's booking list |
| **Mon profil** disclosure | Expands their notes/profile area |
| **Notes internes** | Private customer note, separate from appointment-specific notes |
| **Enregistrer** | Saves that customer note |
| Page arrows | Explore more customers |

A pending website request is in the inbox. Confirmation creates its booking/customer records. Do not expect sending a simple enquiry alone to create a scheduled customer history.

### Erasure controls

On supported guest records, **Traiter une demande d’effacement** opens the anonymisation form.

- It is for a verified customer erasure request, not ordinary appointment cancellation.
- The form asks for an internal request reference without personal information.
- The same action button applies anonymisation.
- **Annuler** closes it without applying the action.
- It removes contact details/notes and revokes private management access while preserving service history; active bookings must be resolved first.

## 12. Prestations: all fields and buttons

Open **Prestations**, `/admin/services`.

The official initial catalogue has 67 entries: Esthétique 38, Coiffure 21, Makeup 6 and Location 2. Later owner-created entries can increase the total. Lists show up to 50 records per page, so the first page is not the entire catalogue.

### Buttons and procedure

| Control | Action |
| --- | --- |
| **Rechercher sur cette page** | Find a service among the current page's records |
| **Ajouter une prestation** | Open an empty service form |
| **Modifier** on a service | Open that service's saved values |
| **Paramètres avancés** | Expand grouping, timing buffers, ordering, archiving and extra descriptions |
| **Enregistrer** | Save the service and its visible field changes |
| **Annuler** | Close without saving further edits |
| Page links | Load additional services |

### Service fields

| Field | What it means and how to use it |
| --- | --- |
| **Nom** | The public treatment/option name |
| **Catégorie** | Its principal category |
| **Description** | Customer-facing explanation |
| **Photo** | Choose an image file, then save the form |
| **Durée (minutes)** | Actual duration when known; optional for the start-only diary; never invented |
| **Type de prix** | Choose Prix fixe, À partir de or Sur demande |
| **Prix (MAD)** | Ordinary dirham amount: `150` means 150 MAD, not 1.50 MAD |
| **Afficher sur le site** | Publishes the service |
| **Disponible à la réservation** | Retained eligibility flag for older interval booking; not a requirement for a published service in the manual diary |
| **Mettre à la une** | Features it in the public displays that use featured services |
| **Sous-catégorie** | First grouping under the main category, such as Onglerie |
| **Groupe de prestations** | More specific grouping, such as Gel or BIAB |
| **Nature de la prestation** | Beauty appointment or Location (rental enquiry) |
| **Préparation avant la prestation (minutes)** | Extra reserved time before the treatment |
| **Temps après la prestation (minutes)** | Extra reserved time after the treatment |
| **Ordre d’affichage** | Controls ordering where supported; it is not a price |
| **Conseils de préparation** | Instructions customers should read before treatment |
| **Ce qui est inclus** | Contents of the treatment/package, if actually known |
| **Archiver** | Retires the service without deleting historical bookings |

### Price options

- **Prix fixe:** a known fixed price.
- **À partir de:** a starting price; final treatment requirements can matter.
- **Sur demande:** discuss the price with the salon. The numeric price input is disabled and the public label is “Prix sur demande”.

Do not type centimes into the ordinary money fields. Internal conversion is handled by the app.

### Published versus bookable

A published beauty service can appear, receive a request and be confirmed into the start-only diary even without a known duration. Only the older interval booking flow needs a duration. Enter real durations when known; never invent them.

To make a service ready for real testing:

1. Open its **Modifier** form.
2. Enter its real duration only if known; it may stay empty for diary testing.
3. Set the real price/type, or leave it Sur demande.
4. Enable **Afficher sur le site**. The optional old interval-booking switch still requires a real duration; leave it off for an unknown-duration service.
5. Save.

During the salon setup, **Épilation des aisselles** had an owner-entered duration of 30 minutes and was bookable. Other unknown durations were left unchanged.

Rentals remain enquiries. Do not change a rental into an appointment merely to enable confirmation.

Changes to a service's present price do not rewrite a previously recorded appointment's price snapshot.

## 13. Categories

Open **Prestations → Catégories**, `/admin/categories`.

| Field/control | Meaning |
| --- | --- |
| **Ajouter** | Create a category |
| **Modifier** | Edit the chosen category |
| **Nom** | Public category name |
| **Description** | Public explanation when used by the design |
| **Photo** | Upload/select an image, then save |
| **Afficher sur le site** | Publish the category |
| **Paramètres avancés → Ordre d’affichage** | Change its ordering |
| **Enregistrer / Annuler** | Save changes or abandon the editor |

A new category does not automatically move services. Edit each service's category as necessary. Hidden/archived categories can affect which services are visible/eligible; check both levels when something disappears.

## 14. Offres: promotions

Open **Offres**, `/admin/promotions`. The editor page heading may still say **Offres & Promotions**.

| Button/field | Meaning |
| --- | --- |
| **Créer une offre** | Opens a new promotion |
| **Modifier** | Opens an existing promotion |
| Name/title | Public offer name |
| **Description** | Offer explanation |
| **Type** | Pourcentage or Montant fixe |
| **Valeur** | Percentage for percentage offers; ordinary currency amount for fixed discounts |
| **Début / Fin** | The offer's validity period, in the displayed timezone |
| **Conditions** | Explain actual eligibility/terms |
| **Actif** | Enables the offer, subject to dates and eligibility |
| **Prestations concernées** checkboxes | Select eligible services |
| **Paramètres avancés** | Opens code and maximum-use controls |
| **Code promotionnel (facultatif)** | A code the customer can supply in a flow that supports promo codes |
| **Nombre maximal d’utilisations (facultatif)** | Limits actual selected uses |
| **Enregistrer** | Saves the offer and selected service associations together |
| **Annuler** | Closes without saving edits |

Cards show the discount, dates, eligible services and a state such as active, scheduled, expired or disabled. Check all those conditions if an offer does not apply.

The simplified website request form has no promotional-code field. Confirmation currently uses the ordinary quote/automatically eligible offers, not a code field you did not collect.

Promotion saving does not send a marketing campaign. Existing bookings retain their recorded prices/discounts. Discounts are not simply stacked indiscriminately.

## 15. Mon salon: information and weekly hours

### Informations — `/admin/settings`

| Field/button | Purpose |
| --- | --- |
| **Modifier** | Opens/reopens the salon information editor |
| **Nom** | Salon name used by supported public displays |
| **Logo** | Choose the logo image, then save |
| **Téléphone** | Public contact phone |
| **WhatsApp** | Public WhatsApp number |
| **Email** | Salon contact email, if supplied |
| **Adresse** | Actual salon address used by the current salon booking flow |
| **Lien de la carte** | Real map URL, if you have one; no map location was invented |
| **Instagram** | Actual profile link |
| **Présentation du salon** | About text |
| **Enregistrer / Annuler** | Save or close the editor |

Phone/address can appear publicly. The address is not independently geocoded or verified by saving the text.

### Horaires — `/admin/availability`

Select opening days by their weekday names. One set of daily periods applies to the checked days. Unchecked days show Fermé on the public hours display.

| Field/button | Action |
| --- | --- |
| **Ouverture** | Beginning of a normal daily opening period |
| **Fermeture** | End of that period |
| Weekday checkboxes | Choose Lundi through Dimanche as opening days |
| **Enregistrer les horaires** | Saves the selected days and daily periods together |
| **Ajouter une plage horaire** | Adds a blank extra period, for example for afternoon opening after a break |
| **Retirer cette plage** | Removes that period from the form; save to apply the change |
| **Modifier une journée** | Opens an exception for a specific date |
| **Fermer un jour** | Opens a dated closure form |

Opening must be earlier than closing. For a break, use two non-overlapping real opening periods. The example is a technique, not a recommendation to change the saved business hours.

Removing a period does not save immediately. Changes that would invalidate existing reservations can be blocked, with affected bookings needing attention first.

Your initially copied hours were **10:01–21:00**. If 10:01 was accidental, you can change the opening field yourself and press **Enregistrer les horaires**.

## 16. Exceptions and closures

### A one-day hours exception

Use **Horaires → Modifier une journée**, or advanced **Horaires exceptionnels**.

| Field/button | Use |
| --- | --- |
| **Ajouter** | Creates a date-specific exception |
| **Employée ou matériel (vide = tout le salon)** / resource selector, if shown | Choose **Tout le salon** for a salon-wide exception; employee setup is not needed |
| **Date** | The actual exception date |
| **Ouverture / Fermeture** | Opening period for that date |
| **Enregistrer** | Saves the exception |
| **Modifier** | Edits an existing exception |
| **Supprimer → Confirmer la suppression** | Removes the exception so ordinary hours can apply again |
| **Conserver** | Cancels deletion |

An exception **replaces** the normal opening intervals for that date. If that special day has morning and afternoon opening, record both exception periods. Adding only an afternoon interval does not preserve the normal morning automatically.

Use a closure for a fully closed day rather than an equal opening/closing time.

### A closure

Use **Horaires → Fermer un jour**, or advanced **Congés et fermetures**.

| Field/button | Use |
| --- | --- |
| Salon/resource selector | Choose **Tout le salon** to block the whole salon |
| **Début / Fin** | The closed period's actual date/time boundaries |
| **Motif** | Reason for closure |
| **Enregistrer** | Saves the block if it does not conflict with protected reservations |
| **Modifier** | Changes the closure |
| **Supprimer → Confirmer la suppression** | Removes the block; normal availability is recalculated |

Closures never silently cancel appointments. Existing interval reservations retain their protections. In the manual start-only diary, opening/closure information helps the owner decide; it is not a promise of full-treatment availability.

## 17. Photos, website content and languages

### Image controls used across forms

| Control/message | Meaning |
| --- | --- |
| File chooser / **Photo**, **Logo**, **Photo de l’accueil** | Select a JPEG, PNG or WebP image |
| Photo preview | Shows the selected/uploaded image |
| **Photo prête. Enregistrez le formulaire…** | Upload succeeded, but the record still needs saving |
| **Retirer** | Clears an optional photo association in the form; save afterwards |
| Disabled Retirer for a required gallery image | A gallery record requires an image |
| **Enregistrer** | Saves the record's connection to the uploaded file |

Uploading a file and saving its record are separate steps. Removing a record/image association does not automatically erase its public storage file.

### Photos — `/admin/portfolio`

| Field/button | Meaning |
| --- | --- |
| **Ajouter / Modifier** | New photo record or edit an existing one |
| **Photo** | Required image |
| **Titre / Description** | Customer-facing image information |
| **Description de la photo pour l’accessibilité** | Describe the actual picture for people who cannot see it |
| **Album** | Grouping label |
| **Ordre d’affichage** | Ordering |
| **Afficher sur le site** | Publication switch |
| **Mettre à la une** | Featured status for supported displays |
| **Autorisation de publication confirmée** | Confirms permission to publish the image |
| **Paramètres avancés → Photo temporaire** | Temporary photos are not published |
| **Lien vidéo (facultatif)** | Optional actual video link |
| **Enregistrer / Annuler** | Save or abandon form changes |
| **Supprimer** and its confirmation | Remove the gallery record, not automatically the stored file |

To appear publicly, the photo must satisfy the application's publication rules, including publication enabled, consent confirmed and not temporary.

### Site web — `/admin/settings?view=website`

Fields: **Titre de l’accueil**, **Sous-titre de l’accueil**, **Photo de l’accueil**, **Présentation du salon**, **Couleur du salon**. Use **Enregistrer** to publish saved values through supported public displays.

The links below this screen open **Questions fréquentes**, **Avis clients**, **Prestations à la une** and **Offres publiées**. The last two open the corresponding management lists; they do not invent or automatically create featured content.

### Questions fréquentes — `/admin/faqs`

Use **Ajouter**, enter the **Question** and **Réponse**, set publication as appropriate, then **Enregistrer**. **Modifier** edits an existing FAQ. Questions use generated internal keys; you do not have to type database identifiers.

### Avis clients — `/admin/reviews`

Fields include name, review text, optional rating out of five, publication consent, verified flag, publication and order. **Avis vérifié** is a recorded flag, not an automatic external verification process. Save actual reviews only.

### Langues du site — `/admin/translations`

1. **Ajouter** or **Modifier**.
2. Choose the **Type de contenu**.
3. Choose **Contenu à traduire** from the actual records.
4. Choose **Langue**: French, English or Arabic.
5. Enter translated text in the displayed fields.
6. **Enregistrer**.

Changing content type resets the selected record/translation editor. Editing one language does not replace every language's original text. **Supprimer**, where offered, removes that translation record after confirmation.

### Autres textes — `/admin/content`

**Texte à modifier** selects a supported website text section. Edit its title/text and publication state, then save. Existing content keys can appear as an existing section. This form is not a general visual page builder.

## 18. Advanced screens and their controls

Open **Mon salon → Réglages avancés et sécurité** to reach these protected links. They are not necessary for every daily booking.

### Protected advanced settings — `/admin/settings?view=advanced`

Reach this using **Réglages avancés et sécurité**. The retained interval-grid/notice/rescheduling settings below concern older interval workflows; they do not add a duration or 15-minute restriction to the manual diary.

| Field | Effect |
| --- | --- |
| **Informations du salon vérifiées** | Marks owner review of the salon information |
| **Ouvrir les réservations en ligne** | Scheduling activation; the simple request form and safe confirmation checks remain distinct |
| **Politique de confidentialité** | Editable public information about contact-data use |
| **Conditions de réservation** | Editable booking/pending/cancellation information |
| **Conditions d’acompte** | Describes actual deposit arrangements; does not collect payment |
| **Fuseau horaire** | Timezone used for salon dates, hours and slots |
| **Devise** | Currency for supported prices; not an exchange-rate converter |
| **Délai minimum avant un rendez-vous (minutes)** | Minimum lead time; last checked at 120 minutes |
| **Réserver jusqu’à combien de jours à l’avance ?** | Maximum future booking horizon |
| **Intervalle entre les horaires proposés (minutes)** | Start-time grid; last checked at 15 minutes |
| **Autoriser les demandes d’annulation** | Customer-facing cancellation request option, subject to rules |
| **Autoriser les demandes de déplacement** | Customer-facing rescheduling request option, subject to rules |
| **Préavis d’annulation (heures)** | Customer cancellation request deadline |
| **Préavis de déplacement (heures)** | Customer rescheduling request deadline |
| **Délai avant de déclarer une absence (minutes)** | Grace before the no-show action is allowed |
| **Enregistrer / Annuler** | Save or abandon settings edits |

The added policy text is editable information about the current process. It does not activate an email sender, payment provider or deposit collection.

### Demandes de modification — `/admin/requests`

For an existing appointment's customer cancellation/rescheduling request:

- Read its booking reference, reason, status and proposed new time if applicable.
- **Accepter la demande** applies the requested change through existing booking rules.
- **Refuser la demande** declines it, keeping the existing booking arrangement.
- Rescheduling still validates availability. An unreviewed change request does not free the original slot.

This screen is not the inbox for new website appointment requests.

### Encaissements — `/admin/payments`

| Field/button | Meaning |
| --- | --- |
| Appointment selector | Choose the booking reference; the form offers up to 200 recent appointments |
| **Montant (devise du rendez-vous)** | Ordinary amount actually received/refunded |
| **Type → Paiement / Remboursement** | Records a receipt or refund |
| **Méthode** | Actual method, such as cash or bank transfer |
| **Enregistrer** | Saves the receipt/refund record |
| Page links | Explore older payment records |

This does not charge a card, move money or initiate a bank refund. It records what happened outside the site. Estimated booking value and collected money are separate. Refund limits are protected by the database.

### Matériel and Matériel nécessaire

These retained advanced screens manage actual equipment and its service requirements.

- **Matériel:** Ajouter/Modifier, equipment name and active status, then Enregistrer.
- **Matériel nécessaire:** choose an actual service and equipment, then Enregistrer; Supprimer removes that requirement after confirmation.

You do not need to create employees here. The internal shared salon allocation is not a new employee or extra appointment you need to maintain.

### Suivi des notifications — `/admin/notifications`

Shows queued/sent/failed event records, creation times and booking references when present. The current inbox screen is a list, not an email/SMS sending tool. A queued event does not mean a customer received anything.

### Accès administrateurs — `/admin/team`

This controls login access, not staff scheduling.

| Control | Effect |
| --- | --- |
| **Inviter un administrateur** form | Enter the person's name and email |
| **Inviter un administrateur** button | Creates/sends the invitation through the configured account/email flow |
| **Actif** on an existing account | Chooses whether that admin account may access the admin |
| **Enregistrer** on that account | Applies the access change |

The interface states that active administrators share full access. The last active administrator is protected. Invitation/recovery delivery requires working email configuration; saving contact details does not configure SMTP.

### Historique des actions — `/admin/activity`

Read-only administrative audit records show time, action, entity and identifier. Page arrows browse more entries. This is separate from a specific appointment's history button.

### Sécurité du compte

Opens password management. It is not a salon opening-hours or booking configuration screen. See section 2.

### Legacy addresses

Some older protected routes remain for compatibility. City/hour/service-city setup links and employee/qualification links are no longer part of the normal navigation. The current internal **Au salon** location and service association are handled by the setup; new appointment services are associated with it automatically.

## 19. What is saved, reserved or sent

| Action | Saved result | Reservation effect |
| --- | --- | --- |
| Customer submits request | Pending preference/contact/services | No reserved start yet |
| Save request modification | Edited preference | Still pending |
| Confirm request | Confirmed diary appointment linked to request | Exact start reserved |
| Refuse request | Refused request retained | No appointment created |
| Save manual appointment | Confirmed diary appointment | Exact start reserved |
| Cancel diary appointment | Cancelled record/history retained | Exact start released |
| Change diary start | New start/history | Previous start released and new start reserved atomically |
| Save note | Private note | No reservation change |
| Record payment/refund | Receipt/refund record | Does not move money |
| Save catalogue/public settings | Current public data | Does not rewrite historical booked prices |
| Upload without saving form | Stored image file | Record publication is not finished |

No automatic email/SMS/WhatsApp sender or online payment collection was added. Contact customers manually. Queued notification records are not proof of delivery.

Old interval-based appointments retain their recorded start/end/duration/allocation history. New diary entries have an explicit internal start-only marker, not a fabricated treatment length. Their active exact-start reservation is the only overlap guarantee.

## 20. Daily workflows and troubleshooting

### Morning routine

1. Open the dashboard.
2. Check today's agenda and the request count.
3. Read new requests.
4. Confirm a valid preference, or use Modifier to choose an available time.
5. Tell the customer the decision using your usual contact channel.
6. Review existing scheduled bookings awaiting confirmation or customer modification requests.

### Prepare one service for testing

1. Open Prestations → Modifier on the real service.
2. Enter its actual duration and price type.
3. Enable publication/booking as appropriate and save.
4. On the public site, add it to the basket and submit a request.
5. In admin, accept or modify the start and confirm; assess treatment overlap yourself.
6. Open the calendar for that date.
7. To free it after your test, cancel through its appointment action; keep the historical record.

Unknown durations are allowed in the diary. Do not invent a duration or price for testing.

### Common questions

| Question | Explanation / next action |
| --- | --- |
| My request is not in the calendar. | It remains an inbox request until successful confirmation. Read the confirmation result. |
| I pressed Enregistrer la modification. Why is it pending? | That button saves a preference. Use Confirmer le rendez-vous to validate and schedule it. |
| I pressed Annuler and nothing was cancelled. | Annuler inside an edit/action form closes the form. Use Annuler le rendez-vous, then Confirmer l’annulation. |
| The request card remains after confirmation. | Recent/history cards stay visible. Use its linked booking for current details. |
| Pending count is zero but cards are visible. | Resolved cards remain in the recent six; only pending decisions count. |
| I changed appointment time; the request still shows the original date. | The original request preference and the later booking are different records. Open the linked booking for the actual time. |
| There is no available-time dropdown. | This is now a manual preferred-start diary. Enter the agreed start; identical active starts are blocked. |
| It asks for an employee. | Employee setup was removed from the active salon calendar mode. Some old descriptive wording can remain; do not create an employee to bypass a different missing requirement. |
| The calendar looks empty. | Check the displayed period and search; unconverted requests and cancelled bookings are not active entries. |
| I cannot see all services/messages. | Use pagination. Search on a generic record screen only searches its loaded page. |
| I saved a price but an old booking still has the old amount. | Historical booking price snapshots are intentionally preserved. |
| I uploaded a photo but it did not appear. | Save the record, then check publication, consent and temporary status. |
| Saving hours/closure is blocked. | Existing appointments would be invalidated. Inspect the affected bookings before changing the schedule. |
| A date exception changed the whole day. | Exceptions replace that date's normal periods. Add every intended exception period. |
| Customer received no email after confirmation. | No automatic delivery provider was added. Contact the customer directly. |
| My changes disappeared. | The form may have been left without Enregistrer or the save failed. |
| Preview changes did not affect the website. | Preview is browser-local. Use the authenticated admin. |
| Local links stopped working. | The local development server must be running; these are not hosted public links. |

If an error remains, record the page, button pressed and exact message. Do not assume an action succeeded just because the button was clicked.

## 21. Direct links and technical reference

These links target the current local website. Substitute a future hosting domain when appropriate.

| Screen | Link |
| --- | --- |
| Login | [Open](http://127.0.0.1:3000/admin/login) |
| Dashboard | [Open](http://127.0.0.1:3000/admin) |
| Requests/messages | [Open](http://127.0.0.1:3000/admin/messages) |
| Booking list | [Open](http://127.0.0.1:3000/admin/bookings) |
| Calendar | [Open](http://127.0.0.1:3000/admin/calendar) |
| Manual appointment | [Open](http://127.0.0.1:3000/admin/appointments/new) |
| Customers | [Open](http://127.0.0.1:3000/admin/clients) |
| Services | [Open](http://127.0.0.1:3000/admin/services) |
| Categories | [Open](http://127.0.0.1:3000/admin/categories) |
| Offers | [Open](http://127.0.0.1:3000/admin/promotions) |
| Salon information | [Open](http://127.0.0.1:3000/admin/settings) |
| Weekly hours | [Open](http://127.0.0.1:3000/admin/availability) |
| Date exceptions | [Open](http://127.0.0.1:3000/admin/exceptions) |
| Closures | [Open](http://127.0.0.1:3000/admin/closures) |
| Gallery | [Open](http://127.0.0.1:3000/admin/portfolio) |
| Website appearance/text | [Open](http://127.0.0.1:3000/admin/settings?view=website) |
| Booking rules/policies | [Open](http://127.0.0.1:3000/admin/settings?view=advanced) |
| FAQ | [Open](http://127.0.0.1:3000/admin/faqs) |
| Reviews | [Open](http://127.0.0.1:3000/admin/reviews) |
| Translations | [Open](http://127.0.0.1:3000/admin/translations) |
| Other text | [Open](http://127.0.0.1:3000/admin/content) |
| Modification requests | [Open](http://127.0.0.1:3000/admin/requests) |
| Receipts/refunds | [Open](http://127.0.0.1:3000/admin/payments) |
| Equipment | [Open](http://127.0.0.1:3000/admin/equipment) |
| Service equipment requirements | [Open](http://127.0.0.1:3000/admin/resources) |
| Notification events | [Open](http://127.0.0.1:3000/admin/notifications) |
| Admin accounts | [Open](http://127.0.0.1:3000/admin/team) |
| Audit history | [Open](http://127.0.0.1:3000/admin/activity) |
| Password management | [Open](http://127.0.0.1:3000/admin/password) |
| Public catalogue | [Open](http://127.0.0.1:3000/services) |
| Public request form | [Open](http://127.0.0.1:3000/reservation) |

### Where information is stored

This appendix is for understanding the implementation; you do not have to edit tables to use the admin.

| Information | Existing Supabase storage |
| --- | --- |
| Website requests/general messages | `contact_messages` |
| Scheduled appointments | `appointments` |
| Services/times/prices recorded for a booking | `appointment_items` |
| Protected occupied periods | `allocations` |
| Booking action history | `appointment_history` |
| Guest customer details | `customers` |
| Account customer information | `client_profiles` |
| Catalogue | `services`, `categories` |
| Salon information/rules | `salon_settings` |
| Normal hours | `working_hours` |
| Date-specific hours | `opening_exceptions` |
| Closed periods | `closures` |
| Offers and eligible services | `promotions`, `promotion_services` |
| Photos | `gallery` and public image storage |
| Admin accounts/actions | `admin_profiles`, `audit_logs` |

Confirmation uses a small compatibility operation in the existing tables and scheduling lock. New entries are marked diary, with no fabricated item durations or interval allocations; internal equal start/end timestamps are a start-only marker. Exact active starts are protected. Old interval records retain their real times/allocations. Cancellation keeps history, and a failed reschedule retains the old start.

Current implementation/verification notes: [Final simplification](docs/FINAL_SIMPLIFICATION.md). Earlier notes: [Simple appointment workflow](docs/SIMPLE_APPOINTMENT_WORKFLOW.md) and [Official catalogue](docs/OFFICIAL_CATALOGUE.md).

The older [admin simplification note](docs/ADMIN_SIMPLIFICATION.md) and [original system baseline](docs/ADMIN_PANEL_SYSTEM.md) are historical references. Their employee/city setup instructions do not describe the current day-to-day shared-calendar interface. Use this guide for current operation.
