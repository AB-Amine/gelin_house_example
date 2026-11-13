> **Latest implementation:** [Five-tab salon administration and customer accounts](ADMIN_SIMPLIFIED_ACCOUNTS.md). The advanced-link descriptions below are historical; opening hours and closures now constrain new diary confirmations.

## Previous guide: Mon salon → Réglages avancés et sécurité

The explanations below describe the current code. The everyday salon tabs are **Informations** (identity and contact details), **Horaires** (opening days and shared daily hours), **Photos** (gallery and homepage photos), and **Site web** (homepage text, photo and appearance).

The current calendar is a **manual diary of appointment start times**. Customers send requests; the salon confirms them. Two active appointments cannot start at exactly the same time, but appointments with different starts can overlap. You assess treatment length and equipment availability yourself. Several advanced options remain for the older system that calculated full appointment durations and resource availability; they do not impose those constraints on the current diary. See [the current scheduling model](FINAL_SIMPLIFICATION.md).

### Every advanced navigation button

| Button | What it does |
| --- | --- |
| **Demandes de modification** | Lists cancellation or rescheduling requests for existing appointments. **Accepter** applies the requested change; **Refuser** declines it. New appointment enquiries are under **Rendez-vous → Demandes du site**, not here. |
| **Encaissements** | Manually records a payment or refund against an appointment: choose the appointment, amount, payment/refund type and method, then save. This records money received or returned elsewhere; it does not charge a card or transfer money. |
| **Horaires exceptionnels** | Sets opening periods for one particular date, replacing that date's usual weekly hours in the interval scheduling system. Example: open 10:00–14:00 for a holiday. These do not automatically restrict starts in the manual diary. |
| **Congés et fermetures** | Records a closed period with start, end and reason. Closures block interval availability and take priority over exceptional hours. The manual diary still relies on the owner's decision when confirming a start. |
| **Matériel** | Creates and activates/deactivates physical equipment records, such as a treatment machine. Represent separate physical units separately. The manual diary does not reserve equipment automatically. |
| **Matériel nécessaire** | Associates an equipment record with a service. In interval scheduling, that service needs every associated unit to be available, preventing simultaneous use of the same unit. These associations do not allocate equipment for manual diary entries. |
| **Avis clients** | Adds or edits testimonial text, customer name, optional rating, consent, verified status, publication and order. Only publish with consent; the verified checkbox is an administrator's designation, not an external verification service. Published eligible reviews appear on the public site. |
| **Langues du site** | Adds translations of editable content. Choose the content type, the specific entry and French, Arabic or English, then enter translated fields. It does not automatically translate your text. |
| **Autres textes** | Edits additional text sections by section identifier, title, body and publication status. A section appears only where the website has been built to display that identifier; creating an identifier does not create a new page or homepage block. |
| **Suivi des notifications** | Displays recorded notification events, delivery status and associated appointment reference. This screen is a log; it does not configure a provider or send messages. Automatic booking email/SMS/WhatsApp delivery is not integrated. |
| **Accès administrateurs** | Invites administrators by name and email, and enables/disables existing administrators. All active administrators have full access. Uncheck **Actif** and save to revoke access; the last active administrator is protected. Invitations require configured email delivery. |
| **Historique des actions** | Read-only list of logged actions, affected record identifiers and timestamps. Use it to inspect recorded changes; it has no undo button. |
| **Règles de réservation** | Opens the settings described below. Click **Modifier**, change values, then **Enregistrer** to apply them. |
| **Sécurité du compte** | Opens the password-change form for the currently signed-in administrator. It does not change every administrator's password. |

### Every field in Règles de réservation

| Field | Meaning and current effect |
| --- | --- |
| **Informations du salon vérifiées** | Confirms that the owner checked the salon information. Required, together with enabled reservations and a usable address, to create/confirm diary appointments. |
| **Ouvrir les réservations en ligne** | Enables booking operations. Switching it off prevents diary appointment creation/confirmation, but the current public enquiry submission endpoint still accepts pending requests. It does not cancel existing appointments. |
| **Politique de confidentialité** | Customer-facing privacy text. Editing it changes displayed content; it does not execute data deletion or change retention automatically. |
| **Conditions de réservation** | Customer-facing booking terms. This text does not itself enforce a cancellation fee or deadline. |
| **Délai minimum avant un rendez-vous (minutes)** | Minimum lead time for interval booking. For example, 120 means book at least two hours ahead. The manual diary does not enforce this setting. |
| **Réserver jusqu’à combien de jours à l’avance ?** | Future booking window for interval booking. For example, 60 permits booking up to 60 days ahead. The manual diary does not enforce this setting. |
| **Intervalle entre les horaires proposés (minutes)** | Spacing of suggested starts in interval booking, such as 10:00, 10:15 and 10:30. It is not the duration of a service. The manual diary accepts minute-level starts instead. |
| **Autoriser les demandes d’annulation** | Controls customer cancellation through the existing booking-management system. It does not automatically cancel an appointment or prevent the salon from cancelling it. |
| **Autoriser les demandes de déplacement** | Controls customer rescheduling through the existing booking-management system. It does not automatically approve a proposed new time or prevent salon edits. |
| **Préavis d’annulation (heures)** | Deadline used by the existing customer booking-management flow. For example, 24 means at least 24 hours before the appointment. Salon diary edits do not enforce this deadline. |
| **Préavis de déplacement (heures)** | Equivalent deadline for customer rescheduling in the existing booking-management flow. Salon diary edits do not enforce this deadline. |
| **Délai avant de déclarer une absence (minutes)** | Grace period used by the interval appointment status operation before marking a no-show. It does not automatically mark customers absent; the manual diary status operation does not enforce this delay. |
| **Fuseau horaire** | Interprets local appointment dates/times and calendar display. The salon normally uses `Africa/Casablanca`. This is used by the current diary. |
| **Devise** | Currency code used for appointment amounts, normally `MAD`. Changing it does not convert existing prices or amounts. |
| **Conditions d’acompte** | Text describing the salon's deposit policy. It does not collect a deposit or enforce payment automatically. |

### Common form buttons

**Ajouter** opens a new record form. **Modifier** opens an existing record. **Enregistrer** saves the form; **Annuler** closes it without saving. **Supprimer**, where offered, removes the record rather than merely hiding it. Publication controls show/hide public content; **Actif** enables/disables the relevant record. **Rechercher sur cette page** filters the records already loaded on that page, while **Précédent/Suivant** loads another page.

---

> **Historical guide below:** see [Fatu setup](FATU_SETUP.md), [implementation phases](FATU_IMPLEMENTATION.md) and [validation](FATU_VALIDATION.md). The predecessor details below are retained for history and may describe older routes or test counts. Use the current guide above and [FINAL_SIMPLIFICATION.md](FINAL_SIMPLIFICATION.md) for the manual diary.

# Guide de la propriétaire

## Accéder à l’espace du salon

Ouvrez `/admin/login` sur le domaine du salon et ajoutez cette page aux favoris de
votre téléphone. Aucun compte administrateur n’est créé par défaut. Le premier
compte peut être créé sans service e-mail selon [ZERO_DH_LAUNCH.md](ZERO_DH_LAUNCH.md),
ou invité selon [DEPLOYMENT.md](DEPLOYMENT.md). Les réservations
clientes ne nécessitent aucun compte.

Tous les administrateurs actifs disposent du même accès complet : site,
réservations, réglages et invitations. Il n’y a aucun rôle à choisir. Les
prestataires du planning n’ont pas besoin de compte. Le dernier administrateur
actif reste protégé contre la désactivation. Un compte désactivé perd l’accès aux opérations même si une
ancienne session Supabase existe encore.

## Préparer le salon avant l’ouverture des réservations

1. Dans **Prestataires** (page **Équipe et ressources**), créez les véritables prestataires avec le type
   `staff`. Un seul prestataire suffit. Activez chaque ressource utilisée.
   Aucun compte ni lien avec un compte n’est nécessaire pour planifier les prestations.
2. Créez les catégories et prestations réelles. Les prix sont en **centimes MAD** :
   `15000` signifie **150 MAD**. Un prix `consultation` doit être laissé vide.
   Renseignez la durée, les temps de préparation/nettoyage, la visibilité et
   l’autorisation de réservation. Aucun service fictif n’est fourni.
3. Dans **Qualifications**, associez chaque prestation à ses prestataires qualifiés.
4. Dans **Horaires et pauses**, configurez les plages du salon (ressource vide)
   puis celles de chaque prestataire. Plusieurs plages dans une journée permettent
   une pause. Les plages ne traversent pas minuit.
5. Si nécessaire, créez des équipements avec le type `equipment`, leurs plages
   horaires et les associations dans **Équipement par prestation**. Chaque unité
   physique est exclusive. Deux unités identiques se déclarent séparément ; une
   prestation utilise toutes les unités qui lui sont associées.
6. Ajoutez les jours de fermeture et les absences dans **Fermetures et absences**.
   Pour un horaire différent à une date donnée, utilisez **Horaires exceptionnels**
   pour le salon ou la ressource. Ces plages remplacent les horaires hebdomadaires
   de cette date ; une fermeture reste prioritaire.
7. Dans **Réglages du salon**, validez le nom, le téléphone, les coordonnées,
   la présentation, les textes de confidentialité et les politiques. Confirmez
   explicitement les informations puis activez les réservations.

Les politiques doivent expliquer que les demandes **en attente réservent leur
capacité sans expiration automatique**. Le salon doit les traiter régulièrement.
Définissez le préavis, l’horizon, l’intervalle des créneaux et les règles de
modification. L’annulation et le déplacement autonomes sont désactivés par défaut.

## Traiter les rendez-vous

La vue d’ensemble présente les données réelles et les prochaines arrivées. Le
calendrier propose les vues jour, semaine, mois et liste, la recherche par nom,
téléphone ou référence, ainsi qu’un filtre par prestataire et les indisponibilités.
Dans **Rendez-vous**, filtrez la période ou le statut,
ouvrez les coordonnées et l’historique, puis confirmez ou refusez une demande.
Un rendez-vous manuel suit les mêmes contraintes que la réservation cliente.
Ouvrez les détails pour consulter les montants, réductions et prestataires figés
à la réservation. Les administrateurs peuvent enregistrer des notes
internes ; elles ne sont pas transmises au lien de gestion de la cliente.

Le déplacement préserve le créneau précédent si le nouveau choix échoue. Un
déplacement demandé par une cliente remet le rendez-vous en attente. Les prix
d’origine et les durées déjà réservées restent conservés. Une annulation libère
la capacité et conserve l’historique. Les états terminaux ne peuvent pas être
rouverts. Une annulation après le début du service exige un motif.

Les modifications des horaires, qualifications et ressources sont vérifiées
contre les rendez-vous futurs. Les ajouts sans conflit sont autorisés. Une
modification qui rend un rendez-vous impossible est refusée, avec des liens vers
les références concernées. Résolvez-les explicitement avant de recommencer.
Une fermeture chevauchant une réservation est également refusée. Il n’existe pas
de bouton permettant de forcer silencieusement une double réservation.

## Gérer les prestations et les offres

Archivez une prestation pour empêcher toute nouvelle réservation en préservant son
historique. Les catégories peuvent également être masquées ou archivées.

Pour une offre, renseignez un pourcentage ou un montant fixe en centimes, une
période de validité, les conditions et l’état actif. Associez ensuite les services
dans **Prestations en promotion**. Les offres ne se cumulent pas : la plus
avantageuse sur une prestation à prix fixe s’applique. Les offres expirent selon
les dates persistées. Les prix sur consultation et à partir de restent à confirmer.

## Photos, contenu et identité

Dans **Galerie**, **Réglages du salon**, **Prestations** ou **Catégories**, téléversez une photo autorisée (JPEG,
PNG ou WebP, 4 Mo maximum). Le serveur contrôle le contenu, retire les métadonnées,
redimensionne l’image et la convertit en WebP. Copiez le chemin obtenu dans une
entrée de galerie, de prestation, de catégorie, de logo ou de photo d’accueil. Le téléversement seul ne publie
pas la photo. Donnez un texte alternatif et un ordre aux images de galerie.

Les fichiers du bucket sont accessibles publiquement à toute personne connaissant
leur URL ; ne téléversez jamais de documents confidentiels. Retirer une entrée
de galerie la masque du site mais ne supprime pas le fichier du stockage. La
suppression définitive du fichier et la gestion des fichiers inutilisés passent
actuellement par Supabase Storage.

**Contenu du site** permet d’ajouter des sections de présentation en texte simple.
Les réglages pilotent l’accueil, les coordonnées, les politiques, le logo,
l’image principale et une palette d’accents contrôlée. Les changements sont lus
à la prochaine requête ; les pages publiques utilisent le rendu serveur dynamique.

## Clientèle et confidentialité

Le répertoire affiche les clientes enregistrées et leurs rendez-vous. Un même
téléphone peut correspondre à plusieurs personnes : aucune fusion automatique
n’est effectuée. Vérifiez l’identité et la légitimité d’une demande d’effacement
avant d’utiliser **Traiter une demande d’effacement** (accès administrateur).

L’anonymisation efface les coordonnées et notes de cette cliente ainsi que les
notes de ses rendez-vous, puis révoque les liens privés. Les réservations actives
doivent d’abord être résolues. L’historique des prestations reste conservé. Les
copies de sauvegarde suivent leur propre durée de rétention ; une demande ne les
efface pas automatiquement.

## Notifications et statistiques

Aucune notification de réservation par e-mail, SMS ou WhatsApp n’est intégrée.
Le lien privé apparaît après l’enregistrement. Un bouton WhatsApp ouvre seulement
une conversation. Les invitations et la récupération des mots de passe utilisent
le fournisseur e-mail de Supabase et nécessitent sa configuration et sa vérification.

Les statistiques distinguent la valeur estimée des demandes actives et la valeur
des services terminés. Les montants sur consultation restent incertains. Aucun
paiement ni chiffre d’affaires encaissé n’est suivi.
