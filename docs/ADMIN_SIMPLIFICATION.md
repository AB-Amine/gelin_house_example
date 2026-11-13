# Administration simplifiée — GELIN HOUSE

> Historical implementation note. The later request-to-calendar workflow, three dashboard indicators and current test results are documented in [SIMPLE_APPOINTMENT_WORKFLOW.md](SIMPLE_APPOINTMENT_WORKFLOW.md). The active owner guide is [ADMIN_PANEL_USER_GUIDE.md](../ADMIN_PANEL_USER_GUIDE.md).

Implémentation du 12 novembre 2026. Cette note décrit l’interface après simplification. Le [guide détaillé précédent](ADMIN_PANEL_SYSTEM.md) conserve la description du système avant cette modification.

## Navigation et écrans

La navigation principale contient exactement cinq rubriques, en français :

| Rubrique            | Adresse             | Contenu regroupé                                                                                                           |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tableau de bord     | `/admin`            | Quatre indicateurs réels, agenda du jour, demandes à confirmer/refuser, raccourcis de création et alertes opérationnelles. |
| Rendez-vous         | `/admin/bookings`   | Liste, calendrier, clientes, demandes de modification et encaissements.                                                    |
| Prestations         | `/admin/services`   | Catalogue et catégories.                                                                                                   |
| Offres & Promotions | `/admin/promotions` | Offres et sélection des prestations concernées dans le même formulaire.                                                    |
| Mon salon           | `/admin/settings`   | Informations, horaires, équipe, galerie et site web.                                                                       |

Les anciennes adresses restent protégées et accessibles. Les onglets peuvent mener à ces adresses : les liens favoris ne sont pas supprimés. Les villes, déplacements, compétences, matériel, horaires exceptionnels, traductions, avis, accès administrateurs et historique restent disponibles dans les réglages avancés de Mon salon. Les messages reçus sont accessibles dans Mon salon et signalés sur le tableau de bord.

La présentation GELIN HOUSE est limitée à l’administration. L’identité et les pages du site public, ainsi que les informations du salon déjà enregistrées, ne sont pas remplacées.

## Utilisation quotidienne

- **Aujourd’hui :** ouvrez le tableau de bord pour consulter les heures, clientes, prestations et statuts. Les détails ouvrent le rendez-vous concerné.
- **Confirmer/refuser :** utilisez les actions des demandes en attente, puis validez. Un refus exige un motif.
- **Créer un rendez-vous :** utilisez Nouveau rendez-vous. Le formulaire existant conserve la ville, l’adresse et le devis nécessaires au fonctionnement actuel. Aucune règle de disponibilité n’est contournée.
- **Créer/modifier une prestation :** saisissez un prix normal, par exemple `150,25 MAD`, et une durée explicite. La conversion en centimes est interne. Le tarif enregistré est conservé lors d’une modification sans changement de prix.
- **Catégories :** gérez nom, description, image et visibilité dans l’onglet Catégories ; l’ordre est disponible dans les paramètres avancés.
- **Offres :** choisissez une réduction, les dates et les prestations par cases à cocher. L’offre et ses associations sont enregistrées dans une seule transaction.
- **Équipe :** gérez nom, activation, prestations réalisées et plusieurs plages horaires par jour dans le même formulaire. Deux plages permettent une pause.
- **Horaires :** choisissez des jours nommés et des heures. Les congés, fermetures et exceptions restent accessibles à proximité.
- **Photos :** choisissez une image directement dans la fiche. Après l’envoi, enregistrez la fiche ; la galerie exige toujours le consentement, la publication et une photo non temporaire.
- **Site web :** modifiez titre, sous-titre, photo d’accueil, présentation et couleur. Les liens conduisent aussi aux FAQ, avis, prestations à la une et offres existantes. Aucun nouveau mécanisme de promotion à la une n’est inventé.

Les slugs sont générés pour les nouvelles fiches avec un suffixe distinct. Les slugs et identifiants des fiches existantes restent conservés. La durée d’une nouvelle prestation reste vide jusqu’à sa saisie ; elle n’est pas inventée. Les champs de préparation, nettoyage, ordre, archivage et limites des codes promotionnels sont regroupés dans les paramètres avancés.

Les textes FAQ ont des champs Question/Réponse. Les textes du site utilisent un choix de sections lisibles. Les traductions utilisent un choix de contenu et des champs de texte, sans saisie de JSON ou d’identifiant. Les formulaires s’enregistrent directement avec Enregistrer. Les changements de rubrique, l’ouverture d’une autre fiche, l’annulation et les modifications d’activation ou d’archivage ne déclenchent plus de fenêtre de confirmation supplémentaire.

## Indicateurs du tableau de bord

| Indicateur                 | Périmètre                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rendez-vous aujourd’hui    | Tous les rendez-vous commençant dans la journée du salon, y compris ceux annulés/terminés avec leur statut. |
| En attente de confirmation | Toutes les demandes en attente, même anciennes.                                                             |
| Rendez-vous confirmés      | Réservations confirmées dont le début est à venir.                                                          |
| Rendez-vous à venir        | Réservations en attente ou confirmées dont le début est à venir.                                            |

L’agenda affiche jusqu’à 12 rendez-vous ; le panneau à confirmer en affiche jusqu’à 6. Tout voir ouvre la liste complète et ses filtres. La liste propose Aujourd’hui, Cette semaine, À venir, En attente et Tous. Les filtres détaillés restent disponibles dans un volet secondaire. La semaine commence le lundi et les bornes utilisent le fuseau du salon.

Les encaissements restent distincts des prix estimés des rendez-vous. Le tableau de bord principal ne présente plus le grand panneau financier ; les reçus/remboursements restent accessibles dans Rendez-vous. La fonction de reporting précédente reste dans la base.

## Données et sécurité conservées

Aucune table, réservation ou donnée métier n’a été supprimée/réinitialisée. Aucune migration historique n’a été réécrite. Aucun changement n’a été apporté au moteur de réservation, aux prix déjà réservés, à la machine d’états, aux contraintes d’allocation, à la logique de déplacement ou à l’architecture d’authentification.

Les formulaires utilisent les validations, contrôles d’origine, sessions Supabase, autorisations serveur, RLS et fonctions de sauvegarde existants. Les pages Clientes conservent leurs notes privées, historiques et outils de confidentialité. Les transitions proposées restent celles autorisées par le statut courant. Le formulaire de confirmation/refus ne crée pas de nouvelle transition.

Une seule migration additive est ajoutée :

`supabase/migrations/202611120019_admin_owner_forms.sql`

Elle ajoute `admin_owner_form`, sans nouvelle table ni moteur métier. Cette fonction autorisée aux administrateurs actifs appelle les sauvegardes protégées existantes pour enregistrer ensemble :

- une offre et ses prestations ;
- une employée, ses compétences et ses plages horaires.

Les nouveaux horaires/compétences sont ajoutés avant le retrait des anciens éléments remplacés, pour respecter les vérifications intermédiaires. Une erreur annule toute la transaction. Les gardes de planning, journaux et limites de suppression existants restent applicables. L’API n’accepte pas les champs protégés comme le compteur d’utilisation des promotions.

**Cette migration doit être appliquée sur le projet Supabase cible avant d’utiliser les nouveaux formulaires Offres et Équipe.** Le développement a exécuté la chaîne complète sur PostgreSQL local jetable ; aucune migration distante n’a été lancée.

## Principaux fichiers modifiés

| Ensemble                   | Fichiers                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation et présentation | `src/components/admin-navigation.tsx`, `admin-shell.tsx`, `src/app/admin/layout.tsx`, `admin.css`, page de connexion.                                                     |
| Tableau de bord            | Page `/admin`, `src/components/fatu-admin-dashboard.tsx`.                                                                                                                 |
| Rendez-vous                | Page appointments réutilisée par bookings, page de création, `fatu-appointments.tsx`, lien de détail du calendrier.                                                       |
| Formulaires regroupés      | `src/components/fatu-entity-manager.tsx`, page générique `[entity]`, alias matériel dans `src/lib/admin-config.ts`.                                                       |
| Enregistrements combinés   | `src/app/api/admin/owner-form/route.ts`, migration 019.                                                                                                                   |
| Français et montants       | `src/lib/admin-i18n.ts`, `admin-ui.ts`, contexte de langue admin, montants du formulaire d’encaissement.                                                                  |
| Aperçu local               | `src/components/fatu-preview.tsx`, navigation et formulaires partagés.                                                                                                    |
| Vérifications              | `src/lib/admin-ui.test.ts`, `scripts/test-admin-forms-db.mjs`, branchement dans `test-db.mjs`, tests Playwright de l’administration et sélecteurs des parcours connectés. |

## Vérifications et limites

Résultats finaux vérifiés localement :

| Vérification                                             | Résultat                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TypeScript                                               | Réussi.                                                                                       |
| ESLint                                                   | Réussi.                                                                                       |
| Tests unitaires/API                                      | 25 réussis.                                                                                   |
| PostgreSQL jetable, chaîne complète de migrations        | 46 vérifications réussies.                                                                    |
| Compilation de production                                | Réussie.                                                                                      |
| Navigateurs en production, ordinateur/tablette/téléphone | 21 réussis ; 6 parcours Supabase connectés ignorés faute de configuration isolée.             |
| Navigateurs en aperçu, ordinateur/tablette/téléphone     | 18 réussis.                                                                                   |
| Inspection des captures                                  | Formulaires ordinateur et téléphone examinés ; contraste de la navigation corrigé et vérifié. |

Le sélecteur d’erreur d’un test a été limité au contenu principal pour ne pas confondre le message applicatif avec l’annonceur d’accessibilité de Next.js. Le lancement de l’aperçu Playwright réutilise la configuration commune sans démarrer aussi le serveur de production.

Les contrôles PostgreSQL ajoutés vérifient la sauvegarde atomique des offres, le retour arrière en cas d’association invalide, les horaires fractionnés et compétences des employées, le retour arrière en cas d’horaire invalide, le refus des identités non autorisées/champs protégés et l’absence de modification des rendez-vous existants. La suite précédente continue de vérifier les conflits de réservation, capacités, devis, propriété des clientes, confidentialité, remboursements et tarifs historiques.

Les tests d’aperçu vérifient les cinq liens, raccourcis vers les formulaires, conversion des montants, associations des offres, compétences et horaires de l’équipe, conservation des réglages invisibles, navigation directe sans fenêtre de confirmation, navigation du calendrier et absence de débordement sur ordinateur, tablette et téléphone. Ces données restent uniquement dans le navigateur. Ils ne prétendent pas vérifier Supabase à distance.

Limites restantes :

- Sans projet Supabase de test et identifiants, la connexion réelle, l’envoi des invitations/emails, les écritures persistées sur le service distant et les envois Storage ne peuvent pas être vérifiés de bout en bout.
- Les exigences de villes, frais de déplacement, qualifications, matériel et horaires restent nécessaires. Passer à un salon à adresse fixe demanderait une modification métier séparée.
- Les notifications restent des événements à traiter, sans fournisseur d’envoi automatique. Les paiements sont des reçus saisis manuellement.
- Les listes restent paginées. Les options de référence sont limitées à 1 000 ; une lecture incomplète empêche l’édition plutôt que de risquer de supprimer des associations non chargées. Le choix d’un rendez-vous pour un reçu reste limité aux 200 derniers rendez-vous.
- Le téléchargement des photos est désactivé dans l’aperçu ; utilisez le vrai espace connecté. Retirer une photo de la galerie ne supprime pas son fichier public du stockage.
- Les contrôles monétaires suivent la devise configurée et le modèle existant à deux décimales. Ils n’effectuent aucune conversion de devise.
- Les sauvegardes simultanées n’ajoutent pas de résolution de conflits éditoriaux. Les changements non enregistrés sont abandonnés lorsqu’on ferme un formulaire ou quitte la rubrique.

Aucun déploiement, commit ou push automatique n’a été effectué.
