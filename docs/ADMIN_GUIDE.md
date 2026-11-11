> **Current Fatu implementation:** see [Fatu setup](FATU_SETUP.md), [implementation phases](FATU_IMPLEMENTATION.md) and [validation](FATU_VALIDATION.md). The predecessor details below are retained for history and may describe older routes or test counts.

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
