-- Réglages de DÉVELOPPEMENT LOCAL. Ce fichier n'est exécuté que par
-- `supabase db reset` sur la base locale ; il n'est jamais appliqué en production.
-- Les données de démonstration (comptes, catalogue fictif) sont créées par
-- `pnpm seed:demo` (scripts/seed-demo.mts).

update public.platform_settings set value = 'true' where key = 'show_demo_content';

-- Simplifie l'accès au back-office en local. En production, laisser à true :
-- l'équipe doit activer la double authentification (TOTP).
update public.platform_settings set value = 'false' where key = 'admin_mfa_required';
