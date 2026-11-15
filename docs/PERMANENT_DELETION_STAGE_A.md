# Suppression définitive — étape A : inspection et règles à approuver

Date : 14 novembre 2026. **Inspection uniquement. L’étape B n’est pas commencée.**

Aucun bouton, endpoint de suppression, migration, modification de politique RLS ou test destructif n’a été ajouté ou exécuté. Aucune donnée de production n’a été supprimée ou modifiée. Aucun commit, push ou déploiement.

## 1. Preuves examinées

- Routes d’administration, authentification, configuration des entités, listes de prestations/offres/clients et gestion des rendez-vous.
- Historique SQL du dépôt, puis métadonnées du schéma déployé : **44 clés étrangères, 10 déclencheurs applicatifs non internes et 5 fonctions ciblées**. La transaction a été ouverte avec `BEGIN READ ONLY`, son état `transaction_read_only=on` vérifié, puis fermée par `ROLLBACK`.
- Lecture des permissions et des colonnes pertinentes, sans sélection de dossiers clients, de réservations, de mots de passe ou de contenu Auth.
- Documentation officielle Supabase pour les conséquences d’une suppression Auth.

Le diagnostic local ignoré `.tools/inspect-delete-schema.mjs` contient uniquement des lectures de métadonnées. Son résultat `.tools/deletion-schema-inspection.json` n’est pas une exportation des données métier. Le seul livrable applicatif versionnable ajouté à cette étape est le présent rapport.

## 2. Mécanismes existants et limites

### Autorisation

`src/lib/auth.ts` utilise `sessionDb().auth.getUser()` puis vérifie un profil `admin_profiles` actif. Le modèle courant donne le même accès aux administrateurs actifs, avec la valeur SQL historique `owner`. Un compte client ordinaire ne satisfait pas ce contrôle. `sameOrigin`, validation Zod et erreurs filtrées existent déjà.

`privileged()` est un client serveur utilisant `SUPABASE_SECRET_KEY`. Le navigateur ne doit jamais recevoir cette clé. Les suppressions devraient vérifier à nouveau l’administrateur au moment de l’exécution, pas seulement lors de l’ouverture du dialogue.

### Suppression actuelle

`DELETE /api/admin/[entity]` n’accepte que les entités marquées `deletable`. Il appelle `admin_save(..., p_delete=true)` avec l’identité de session.

Le corps SQL déployé `admin_save_guarded_core` autorise la suppression seulement pour certains éléments de configuration : horaires, exceptions, fermetures, qualifications, ressources d’une prestation, associations offre/prestation, galerie, villes/prestations, horaires de ville et traductions. **Les prestations, catégories, offres et rendez-vous ne sont pas autorisés.** Les rôles `anon` et `authenticated` n’ont pas de droit DELETE direct sur les tables ciblées ; seul `service_role` possède ce droit.

Il ne suffit donc pas d’afficher « Supprimer » ou de changer `deletable` : l’opération serait refusée, et le dialogue générique actuel ne satisfait pas les confirmations détaillées demandées.

`/api/admin/privacy` anonymise une fiche `customers` ; il ne supprime ni le compte Auth ni nécessairement les données d’un compte inscrit. Ce mécanisme ne doit pas être présenté comme une suppression définitive.

## 3. Cartographie et règles proposées

Les règles ci-dessous sont des **propositions à approuver**, pas des comportements déjà implémentés. L’éligibilité de chaque fiche serait évaluée au moment de sa suppression. L’inspection n’a pas classé ni sélectionné les dossiers réels du salon.

### A. Prestations

Références directes, sans cascade de suppression :

- `appointment_items.service_id` : sélection et prix historiques des réservations ; blocage impératif.
- `promotion_services.service_id` : association aux offres ; blocage tant qu’elle existe, sans suppression automatique d’une offre.
- `qualifications.service_id`, `service_resources.service_id`, `service_cities.service_id` : configuration propre à la prestation.

Références supplémentaires à vérifier : `contact_messages.service_ids`, tableau UUID **sans clé étrangère**, pour les demandes en attente ou historiques ; traductions génériques via `translations.entity/entity_id`, également sans clé étrangère. Une vérification des seules FK serait insuffisante.

**Proposition :** bloquer dès qu’une réservation, une demande ou une offre référence la prestation. Si elle est autrement libre, permettre dans une seule transaction la suppression de la prestation, de ses seules lignes de configuration `qualifications`, `service_resources`, `service_cities` et de ses traductions ciblées. Ces suppressions annexes doivent être explicitement annoncées dans le dialogue et approuvées ici. Aucun parent ressource, ville, offre ou rendez-vous ne serait supprimé.

Le déclencheur existant `link_single_salon_service` peut créer des associations de ville automatiquement : « jamais réservée » ne signifie pas « aucune dépendance ». La suppression de `service_cities` déclenche aussi `guard_city_schedule` ; tout refus de ce garde doit annuler la transaction, sans le désactiver.

Si ce nettoyage annexe n’est pas approuvé, la variante stricte est de **bloquer toute dépendance**, même de configuration, jusqu’à sa suppression explicite par un mécanisme existant.

### B. Catégories

`services.category_id` empêche la suppression d’une catégorie encore utilisée. Compter toutes les prestations, y compris celles archivées ou non publiées.

**Proposition :** afficher le nombre associé et demander une réaffectation ou suppression préalable ; ne jamais supprimer automatiquement les prestations. Pour une catégorie vide, supprimer uniquement la catégorie et, si approuvé, ses traductions propres dans la même transaction.

### C. Offres et promotions

`promotion_services.promotion_id` doit être traité avant la suppression de `promotions`. Supprimer cette association ne supprime pas les prestations.

L’historique des remises conserve notamment `appointment_items.promotion_name`, un **texte historique sans FK vers l’offre**. `promotions.usage_count` est un indicateur d’utilisation, pas un registre complet de tous les anciens usages. Un compteur nul et l’absence de correspondance sur le nom actuel ne prouvent pas une absence d’utilisation historique, notamment après renommage ou dans les anciens chemins de tarification. Aucune table dédiée de « redemptions » n’a été trouvée dans le schéma public inspecté.

**Proposition conservatrice :** bloquer un usage avéré ou ambigu ; autoriser une offre jugée éligible, en supprimant seulement sa définition, ses lignes `promotion_services` et ses traductions propres. Ne toucher ni aux prestations, ni aux clients, ni aux montants ou noms historiques des réservations. Ne jamais réinitialiser ou modifier les compteurs d’une autre offre.

**Décision métier nécessaire :** faut-il autoriser la suppression d’une définition déjà utilisée lorsque les instantanés historiques sont conservés ? Sans décision explicite, ne pas autoriser cette variante. Ne pas promettre une traçabilité par identifiant d’offre que le schéma actuel ne stocke pas.

### D. Rendez-vous

Les tables suivantes référencent `appointments.id` sans suppression en cascade :

| Dépendance | Traitement proposé |
| --- | --- |
| `appointment_items` | Lignes propres au rendez-vous, supprimables seulement avec celui-ci après approbation explicite. Les prestations du catalogue restent intactes. |
| `allocations` | Lignes propres au rendez-vous, supprimables dans la même transaction. La capacité éventuelle n’est libérée qu’au commit. |
| `appointment_history` | Historique propre, dont la perte doit être annoncée et approuvée. Ne pas supprimer les journaux globaux. |
| `idempotency_records` | **Blocage par défaut**, à cause du risque de rejouer une ancienne création après effacement de sa clé. |
| `payment_records` | Blocage : conserver les écritures financières, sans effacement, remboursement ou ajustement automatique. |
| `change_requests` | Blocage : ne pas effacer silencieusement les demandes de modification des clients. |
| `contact_messages.appointment_id` | Blocage : préserver les demandes initiales, y compris celles confirmées. Ne pas les détacher par mise à NULL. |
| `notification_outbox` | Blocage par défaut : le devenir des notifications liées demande une décision dédiée. |

Le parent `customers` n’est pas un enfant du rendez-vous et ne doit pas être supprimé. `client_user_id`, les comptes Auth, les prestations, les offres et les autres rendez-vous restent intacts. Aucun changement de prix, de compteur de promotion ou de statut n’est nécessaire ou autorisé implicitement.

**Proposition initiale prudente :** suppression des rendez-vous terminés/annulés/rejetés/no-show passés seulement, sans les dépendances bloquantes ci-dessus. L’ajout d’une suppression individuelle des futurs rendez-vous ou des états actifs serait une décision supplémentaire, avec avertissement sur la libération du départ et confirmation renforcée. Aucune suppression automatique, dans aucun état.

**Limite pratique :** les flux actuels créent normalement des lignes d’idempotence et souvent une demande liée. De nombreux rendez-vous resteront donc non supprimables avec cette politique. Pour aller plus loin, il faut approuver la conservation ou la perte des garanties associées ; il ne faut pas simplement vider ces tables pour forcer la suppression.

### E. Clientes inscrites

Le répertoire courant `fatu_clients` utilise `client_profiles.id = auth.users.id` et exclut tout ID présent dans `admin_profiles`. Il ne s’agit pas de la fiche invitée `customers.id`.

Conséquences vérifiées dans le schéma réel :

- `client_profiles.id → auth.users.id ON DELETE CASCADE` : supprimer Auth entraîne la suppression du profil ; l’inverse ne supprime pas Auth.
- `appointments.client_user_id → auth.users.id ON DELETE SET NULL` : une suppression Auth peut détacher les réservations au lieu de les bloquer.
- `contact_messages.client_user_id → auth.users.id ON DELETE SET NULL` : même risque pour les messages et demandes.
- `change_requests.client_user_id → auth.users.id` : dépendance bloquante.
- `admin_profiles.id → auth.users.id` : FK restrictive ; protéger explicitement tous les administrateurs, actifs ou inactifs, ainsi que l’administrateur connecté.
- Les dépendances Auth gérées par Supabase incluent les sessions, identités, facteurs et autres identifiants. Le schéma inspecté comporte aussi un lien SCIM avec `SET NULL`, à traiter comme un cas protégé/non pris en charge plutôt qu’à détacher silencieusement.

**Proposition :** considérer seulement un compte client sans réservation, message/demande lié, demande de changement, identité administrateur, dépendance organisationnelle protégée ou objet Storage possédé. Ne jamais effacer/réaffecter un objet Storage pour débloquer l’opération. Vérifier les colonnes `storage.objects.owner` et `owner_id` selon les données effectives.

La confirmation devrait exiger par exemple `SUPPRIMER LE COMPTE`, avec identité exacte et périmètre : compte Auth et profil associé (nom, téléphone, langue, notes administratives). Aucune suppression automatique de fiches invitées ou de messages par correspondance d’e-mail/téléphone : ces coordonnées ne prouvent pas qu’il s’agit du même enregistrement ou de la même personne.

Après approbation et validation de la sécurité concurrente, la bonne interface est **`auth.admin.deleteUser` côté serveur, en mode définitif**, jamais une suppression manuelle préalable du profil. Laisser la cascade existante supprimer le profil avec la suppression Auth. Si Auth échoue, ne pas poursuivre avec une suppression de profil isolée. Si la réponse réseau est perdue, vérifier les deux états avant d’annoncer le succès ou de retenter.

La suppression Auth empêche de nouvelles connexions et supprime les sessions/refresh tokens associés, mais un JWT déjà émis n’est pas rétroactivement invalidé cryptographiquement. Les contrôles applicatifs actuels `getUser` et profil doivent rester en place et être testés. Ne pas promettre une révocation instantanée universelle sur tous les services. [Documentation Supabase : suppression et jetons](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users), [API serveur deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).

## 4. Concurrence, atomicité et changements backend nécessaires

Les appels REST successifs « supprimer les enfants puis le parent » ne constituent pas une transaction. Une erreur intermédiaire pourrait laisser une fiche partiellement effacée. Modifier la fonction SQL existante ou créer une nouvelle RPC de suppression constituerait un changement de base interdit par les consignes actuelles ; cette voie n’est pas proposée sans autorisation supplémentaire.

Une option sans DDL serait un backend serveur transactionnel utilisant PostgreSQL directement, des requêtes paramétrées et une liste fermée de tables/actions. Cela ajoute une responsabilité runtime et des droits de connexion qui n’existent pas dans les handlers HTTP actuels. `pg` est aujourd’hui une dépendance de développement, et `DATABASE_URL` est documentée pour les opérations séparées. **Cette extension backend/runtime doit être approuvée ; la connexion utilisée pour l’inspection ne doit pas devenir automatiquement une clé générale de suppression en production.**

La transaction devrait revoir les dépendances sous verrouillage approprié, respecter les contraintes et déclencheurs existants, coordonner les opérations de réservation et annuler tout le groupe au moindre échec. Une création concurrente dans `contact_messages.service_ids` n’est pas protégée par une FK : un simple contrôle préalable suivi d’un DELETE n’est pas une preuve de sécurité. La stratégie d’isolation/verrouillage doit être démontrée en environnement jetable.

**Cas Auth distinct :** l’API d’administration Auth et une transaction SQL applicative ne forment pas une transaction distribuée commune. Un contrôle « zéro réservation » peut devenir faux avant `deleteUser`, puis le `SET NULL` détacherait une nouvelle réservation. Il faut prouver une coordination empêchant ces écritures concurrentes, sans bloquer l’appel Auth avec ses propres verrous. Sinon, la suppression de comptes doit rester bloquée. Aucune promesse de sécurité fondée sur le seul précontrôle n’est proposée.

L’exigence « seules les suppressions individuelles sont permises en production » exclut aussi une nouvelle insertion automatique dans `audit_logs` sans approbation distincte. Les anciens journaux restent intacts ; une journalisation applicative minimale et sans données sensibles peut être proposée. Si un audit persistant en base est souhaité, autoriser explicitement cette écriture supplémentaire.

## 5. Contrat de sécurité et UI à implémenter après approbation

- Réutiliser la validation serveur de l’administrateur actif et l’origine de la requête ; valider UUID, type d’entité et identité exacte de la cible.
- Prévisualiser le nom, les dépendances et les suppressions annexes précises. Recontrôler au moment du commit ; signaler une fiche modifiée et demander une nouvelle confirmation.
- Retourner un refus explicite pour dépendance, conflit, compte protégé, absence de cible, indisponibilité ou résultat Auth incertain. Ne jamais annoncer la réussite depuis le seul état React.
- Dialogue clavier accessible, focus initial sur Annuler, piège de focus natif/modal approprié, restauration du focus, phrase renforcée pour les comptes, état occupé et blocage des doubles soumissions.
- Pour un rendez-vous, afficher référence, cliente, date/heure Casablanca, statut et prestations ; préciser toute perte de son historique propre.
- Rafraîchir les vues admin et invalider les routes utiles après succès confirmé. Les projections publiques sont déjà dynamiques avec `no-store`. Conserver les fonctionnalités existantes d’édition, confirmation, modification et annulation.
- Conserver les fichiers image, les journaux existants et les données sans lien prouvé. Ne pas promettre l’effacement physique immédiat des pages PostgreSQL, WAL, journaux Auth ou sauvegardes.

## 6. Vérifications prévues pour l’étape B

Tests uniquement avec mocks, PostgreSQL jetable ou projet Supabase de test autorisé. Couvrir refus anonyme/client, comptes admin protégés, cibles absentes, UUID invalide, dépendances FK et non-FK, annulation transactionnelle, concurrence, doublons, erreurs réseau/Auth et vérification de l’absence effective du compte/profil. Vérifier les créations/éditions et tous les parcours réservation/calendrier/catalogue/offres/horaires existants. Les cas Auth réels ne sont pas prouvés par les seuls mocks SQL.

Aucun test destructif n’a été exécuté pendant l’étape A. TypeScript, lint et build n’ont pas été relancés : seul ce rapport a été ajouté, aucun code applicatif n’a changé.

## 7. Approbations requises

1. **Périmètre des nettoyages propres** : autoriser les seuls liens de configuration/traductions d’une prestation libre, les traductions d’une catégorie vide et les associations/traductions d’une offre éligible, en transaction ; ou choisir le blocage de toute dépendance.
2. **Rendez-vous** : approuver le blocage initial des écritures financières, demandes, notifications et clés d’idempotence ; approuver ou non la suppression de son seul historique propre, et décider si les rendez-vous actifs/futurs doivent être éligibles.
3. **Offres utilisées** : conserver le blocage conservateur ou définir une politique autorisant la suppression de leur définition tout en conservant les instantanés historiques.
4. **Backend transactionnel** : autoriser l’étude/implémentation du chemin serveur sans DDL et ses droits runtime restreints. Toute impossibilité de garantir la concurrence entraîne un blocage, pas un contournement des contraintes.
5. **Comptes** : approuver le principe « aucune dépendance métier/protégée/Storage », en gardant l’action bloquée jusqu’à démonstration d’une coordination sûre avec Auth. Décider séparément d’une éventuelle écriture d’audit en base.

**Arrêt à l’étape A : attendre l’approbation de ces règles avant toute implémentation de suppression définitive.**
