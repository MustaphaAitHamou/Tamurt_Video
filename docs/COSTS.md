# Coûts et rentabilité

Ce document décrit le **modèle de coûts** implémenté (`src/server/finance/economics.ts`,
page **Administration › Finances**) et en donne une lecture chiffrée.

> Les tarifs des prestataires ci-dessous sont des **hypothèses** paramétrables dans
> l'administration (valeurs par défaut du projet). Ils n'ont pas été vérifiés auprès des
> prestataires pour ce document et doivent l'être sur leurs grilles officielles avant
> toute décision. Aucune ressource payante n'est créée par le code.

## 1. Hypothèses par défaut

| Poste                  | Hypothèse                                                 | Où la modifier        |
| ---------------------- | --------------------------------------------------------- | --------------------- |
| Diffusion vidéo        | 1 USD / 1 000 minutes regardées                           | Finances › Hypothèses |
| Stockage vidéo         | 5 USD / 1 000 minutes stockées / mois                     | Finances › Hypothèses |
| Change                 | 1 USD = 0,86 €                                            | Finances › Hypothèses |
| Commission de paiement | 1,5 % + 0,25 € par paiement (cartes européennes standard) | Finances › Hypothèses |
| Coûts fixes mensuels   | à saisir (hébergement, base, emails, domaine, autres)     | Finances › Hypothèses |

Coût d'une minute diffusée : 1 / 1 000 × 0,86 = **0,00086 €**.

## 2. Par formule (diffusion uniquement, avant coûts fixes et droits)

| Formule   | Prix TTC | Commission     | Net de commission | Seuil de visionnage mensuel |
| --------- | -------- | -------------- | ----------------- | --------------------------- |
| Fondateur | 2,00 €   | 0,28 € (14 %)  | 1,72 €            | ≈ 2 000 min (≈ 33 h)        |
| Standard  | 10,00 €  | 0,40 € (4 %)   | 9,60 €            | ≈ 11 160 min (≈ 186 h)      |
| Premium   | 20,00 €  | 0,55 € (2,8 %) | 19,45 €           | ≈ 22 600 min (≈ 377 h)      |

Les prix étant TTC, la TVA due (20 % en France, taux du pays du client pour la vente
de services numériques dans l'UE) réduit encore le revenu net : sur 2 € TTC à 20 %,
la TVA représente 0,33 €.

## 3. Coûts fixes et stockage (ordres de grandeur à vérifier)

- Stockage : 100 heures de catalogue = 6 000 minutes ≈ 30 USD ≈ 26 € par mois.
- Hébergement applicatif, base de données managée, emails, domaine : quelques dizaines
  d'euros par mois au démarrage selon les plans retenus (le plan gratuit de Vercel n'est
  pas destiné à un usage commercial).
- Exemple : 50 € de coûts fixes mensuels nécessitent ≈ 30 fondateurs (50 / 1,72) pour
  être couverts, **avant** TVA, diffusion et droits.

## 4. Risques identifiés (affichés automatiquement dans l'administration)

1. **Commission sur les petits montants** : la part fixe (0,25 €) absorbe ~14 % du
   forfait Fondateur. Un prélèvement mensuel de 2 € est structurellement peu rentable ;
   un paiement annuel réduirait fortement ce poids (à étudier, sans jamais modifier les
   abonnements en cours).
2. **Fondateurs en phase commerciale** : ils accèdent au catalogue Standard à 2 € au lieu
   de 10 €. Si les droits sont rémunérés au visionnage ou au prorata des abonnés, ce
   segment peut devenir déficitaire. L'engagement pris envers eux doit être respecté :
   le risque se pilote par le nombre de fondateurs (les adhésions peuvent être fermées
   dans les paramètres) et par la négociation des droits.
3. **Droits de diffusion** : non inclus dans les calculs automatiques (à saisir en
   écritures « Droits de diffusion »). Minimums garantis et partages de recettes sont
   probablement le premier poste de coût.
4. **Paiements hors Europe** : les cartes non européennes supportent des commissions
   plus élevées ; à paramétrer selon la clientèle réelle.
5. **Visionnage intensif** : au-delà des seuils ci-dessus, la diffusion seule excède le
   revenu net de l'abonné.

## 5. Indicateurs suivis

Revenus encaissés (nets des remboursements), commissions, coûts estimés de diffusion et
de stockage, coûts fixes, résultat, coût par abonné et par spectateur actif, marge et
seuil par formule (abonnés payants uniquement : les accès offerts sont exclus).
