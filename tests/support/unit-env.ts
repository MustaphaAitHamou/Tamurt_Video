// Environnement minimal et fictif pour les tests unitaires (aucun service réel).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test";
process.env.SUPABASE_SECRET_KEY ??= "sb_secret_test";
process.env.EMAIL_PROVIDER ??= "console";
process.env.STREAMING_PROVIDER ??= "dev";
