# Audit – Génération d'estimation

## Problèmes identifiés

### 1. Fonction au mauvais emplacement (CRITIQUE)

La fonction était dans `functions/getPropertyEstimation.ts` alors que Supabase attend :
`supabase/functions/getPropertyEstimation/index.ts`

**Résultat** : Le déploiement échouait avec "Entrypoint path does not exist". La fonction n’était jamais déployée sur Supabase Cloud.

**Correction** : Copie vers `supabase/functions/getPropertyEstimation/index.ts`.

### 2. JWT bloquant les requêtes OPTIONS (CORS)

Les requêtes **OPTIONS** (preflight CORS) sont bloquées par la passerelle Supabase si la vérification JWT est activée. Les requêtes OPTIONS n’envoient pas de JWT → 401 → le navigateur bloque.

---

## Corrections appliquées

### 1. Structure Supabase correcte

Fonction créée dans `supabase/functions/getPropertyEstimation/index.ts`.

### 2. Configuration `verify_jwt` dans `supabase/config.toml`

```toml
[functions.getPropertyEstimation]
verify_jwt = false
```

La vérification JWT est désactivée pour cette fonction. L’authentification est faite dans le code de la fonction (`supabase.auth.getUser()`).

### 3. Déploiement avec `--no-verify-jwt`

Un nouveau déploiement peut réactiver la vérification JWT par défaut. Pour éviter cela :

```bash
npm run deploy:estimation
```

ou :

```bash
npx supabase functions deploy getPropertyEstimation --no-verify-jwt
```

---

## Vérifications

### Dans Supabase Dashboard

1. **Edge Functions** → `getPropertyEstimation`
2. **Function configuration** → "Verify JWT with legacy secret" = **OFF**
3. Si c’est encore ON après déploiement, le passer manuellement à OFF.

### Variables d’environnement (Vercel)

- `VITE_SUPABASE_URL` = `https://iiwmtzorwwanjrnhsrah.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = ta clé `anon` publique

### Données

1. **Surface** du bien > 0
2. **Code postal** ou **adresse** pour le géocodage
3. **Utilisateur connecté** au moment du clic sur « Générer l’estimation »

---

## Checklist finale

- [x] `verify_jwt = false` dans `supabase/config.toml`
- [x] Déploiement avec `npm run deploy:estimation` (déployé le 17/03)
- [ ] JWT désactivé dans Supabase Dashboard (si nécessaire)
- [ ] Variables d’environnement Vercel définies
- [ ] Utilisateur connecté pour tester

---

## Test

1. Se connecter à l’app
2. Ouvrir un bien **à vendre** avec une surface renseignée
3. Onglet **Estimation** → **Générer l’estimation**
4. Si ça échoue, ouvrir la console (F12) et l’onglet Network pour vérifier l’erreur
