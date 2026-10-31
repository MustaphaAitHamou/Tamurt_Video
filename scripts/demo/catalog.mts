/**
 * Jeu de données de démonstration : œuvres et personnes FICTIVES.
 * Aucune œuvre réelle n'est référencée. Les licences associées sont des
 * licences de test de type « production détenue » couvrant ces œuvres fictives.
 */
export type Scene = "mountains" | "sea" | "desert" | "city" | "olive" | "pattern" | "night";

export type DemoTitle = {
  slug: string;
  title: string;
  originalTitle?: string;
  kind: "film" | "series" | "documentary" | "short" | "show" | "interview";
  year: number;
  countries: string[];
  languages: string[];
  genres: string[];
  tags?: string[];
  runtime: number;
  age: 0 | 10 | 12 | 16 | 18;
  minTier: "free" | "founder" | "standard" | "premium";
  tagline: string;
  synopsis: string;
  description: string;
  original?: boolean;
  featured?: boolean;
  scene: Scene;
  palette: [string, string, string];
  media: "demo-feature" | "demo-episode" | "demo-documentary";
  trailer?: boolean;
  seasons?: { number: number; episodes: { name: string; synopsis: string }[] }[];
  credits: {
    person: string;
    role: "director" | "actor" | "writer" | "producer" | "presenter" | "guest";
    character?: string;
  }[];
  /** Cas de test des droits. */
  rights?: "worldwide" | "france-only" | "maghreb-europe" | "expired" | "upcoming";
  status?: "published" | "announced";
};

export const DEMO_PEOPLE: Record<string, string> = {
  "amastan-ouarezki": "Amastan Ouarezki",
  "tiziri-belkadi": "Tiziri Belkadi",
  "yidir-tighilt": "Yidir Tighilt",
  "dihya-amrouchene": "Dihya Amrouchène",
  "massinissa-azouaou": "Massinissa Azouaou",
  "taninna-ighil": "Taninna Ighil",
  "anir-boudjemaa": "Anir Boudjemaâ",
  "lunja-ait-yala": "Lunja Aït Yala",
  "gaya-medkour": "Gaya Medkour",
  "aksil-tazrout": "Aksil Tazrout",
  "melissa-ouchene": "Melissa Ouchène",
  "kahina-taleb-demo": "Kahina Taleb",
};

const ep = (count: number, names: string[]) =>
  Array.from({ length: count }, (_, i) => ({
    name: names[i] ?? `Épisode ${i + 1}`,
    synopsis: "Épisode fictif de démonstration de la plateforme Tamurt Vidéo.",
  }));

export const DEMO_TITLES: DemoTitle[] = [
  {
    slug: "le-chant-de-lakfadou",
    title: "Le Chant de l'Akfadou",
    originalTitle: "Asefru n Akfadu",
    kind: "film",
    year: 2025,
    countries: ["DZ", "FR"],
    languages: ["kab", "fr"],
    genres: ["drame", "famille"],
    tags: ["kabylie"],
    runtime: 104,
    age: 10,
    minTier: "standard",
    tagline: "Une voix s'élève de la forêt.",
    synopsis:
      "Dans un village perché au-dessus de la forêt, une jeune chanteuse fait renaître les poèmes de sa grand-mère.",
    description:
      "Œuvre fictive de démonstration. Tiziri, vingt ans, découvre un carnet de chants anciens dans la maison familiale. Entre la ville où elle étudie et le village où l'attend sa famille, elle doit choisir la voix qu'elle veut porter.",
    original: true,
    featured: true,
    scene: "mountains",
    palette: ["#1b0a0d", "#7a1224", "#e0a24a"],
    media: "demo-feature",
    trailer: true,
    credits: [
      { person: "amastan-ouarezki", role: "director" },
      { person: "tiziri-belkadi", role: "actor", character: "Tiziri" },
      { person: "yidir-tighilt", role: "actor", character: "Mohand" },
      { person: "lunja-ait-yala", role: "writer" },
    ],
    rights: "worldwide",
  },
  {
    slug: "taddart",
    title: "Taddart",
    kind: "series",
    year: 2025,
    countries: ["DZ"],
    languages: ["kab"],
    genres: ["drame", "societe"],
    tags: ["ramadan", "kabylie"],
    runtime: 45,
    age: 12,
    minTier: "standard",
    tagline: "Un village, mille secrets.",
    synopsis:
      "Le retour d'un exilé bouleverse l'équilibre fragile d'un village de montagne pendant le mois de Ramadan.",
    description:
      "Série fictive de démonstration en deux saisons, pensée comme une série du Ramadan : un feuilleton familial au cœur d'un village de montagne.",
    original: true,
    featured: true,
    scene: "night",
    palette: ["#060b1a", "#1e3a8a", "#f2a541"],
    media: "demo-episode",
    trailer: true,
    seasons: [
      { number: 1, episodes: ep(4, ["Le retour", "La fontaine", "Les noces", "La tempête"]) },
      { number: 2, episodes: ep(3, ["L'héritage", "Le pacte", "L'aube"]) },
    ],
    credits: [
      { person: "dihya-amrouchene", role: "director" },
      { person: "massinissa-azouaou", role: "actor", character: "Arezki" },
      { person: "taninna-ighil", role: "actor", character: "Nna Fatma" },
    ],
    rights: "worldwide",
  },
  {
    slug: "ramadan-a-bab-el-oued",
    title: "Ramadan à Bab El Oued",
    kind: "series",
    year: 2026,
    countries: ["DZ"],
    languages: ["arq", "fr"],
    genres: ["comedie", "famille"],
    tags: ["ramadan"],
    runtime: 26,
    age: 0,
    minTier: "standard",
    tagline: "Trente soirs, une seule famille.",
    synopsis:
      "Une comédie familiale où chaque ftour réserve sa surprise dans un immeuble populaire d'Alger.",
    description: "Série comique fictive de démonstration, format court du Ramadan.",
    scene: "city",
    palette: ["#0b1220", "#0f766e", "#fbbf24"],
    media: "demo-episode",
    seasons: [
      {
        number: 1,
        episodes: ep(5, ["Le premier ftour", "La zlabia", "Le voisin", "La panne", "La fête"]),
      },
    ],
    credits: [
      { person: "anir-boudjemaa", role: "director" },
      { person: "melissa-ouchene", role: "actor", character: "Samia" },
    ],
    rights: "maghreb-europe",
  },
  {
    slug: "tifinagh-lecriture-des-ancetres",
    title: "Tifinagh, l'écriture des ancêtres",
    kind: "documentary",
    year: 2024,
    countries: ["DZ", "MA", "ML"],
    languages: ["fr", "kab"],
    genres: ["culture-patrimoine", "historique"],
    tags: ["amazigh", "patrimoine"],
    runtime: 58,
    age: 0,
    minTier: "founder",
    tagline: "Des rochers du Sahara aux écrans d'aujourd'hui.",
    synopsis:
      "Un voyage à travers l'histoire de l'alphabet amazigh, des gravures rupestres aux claviers modernes.",
    description: "Documentaire fictif de démonstration, accessible dès la formule Fondateur.",
    original: true,
    scene: "desert",
    palette: ["#1f1205", "#b45309", "#fde68a"],
    media: "demo-documentary",
    credits: [
      { person: "gaya-medkour", role: "director" },
      { person: "kahina-taleb-demo", role: "presenter" },
    ],
    rights: "worldwide",
  },
  {
    slug: "yennayer-le-nouvel-an",
    title: "Yennayer, le Nouvel An",
    kind: "documentary",
    year: 2023,
    countries: ["DZ"],
    languages: ["kab", "fr"],
    genres: ["culture-patrimoine", "famille"],
    tags: ["amazigh"],
    runtime: 42,
    age: 0,
    minTier: "free",
    tagline: "Une fête, des traditions partagées.",
    synopsis: "Familles, villages et diaspora célèbrent le premier jour de l'an amazigh.",
    description:
      "Documentaire fictif de démonstration, accessible gratuitement aux membres inscrits.",
    scene: "olive",
    palette: ["#0c1407", "#3f6212", "#d9f99d"],
    media: "demo-documentary",
    credits: [{ person: "aksil-tazrout", role: "director" }],
    rights: "worldwide",
  },
  {
    slug: "ombres-sur-la-casbah",
    title: "Ombres sur la Casbah",
    kind: "film",
    year: 2024,
    countries: ["DZ", "FR"],
    languages: ["arq", "fr"],
    genres: ["policier", "thriller"],
    runtime: 97,
    age: 16,
    minTier: "standard",
    tagline: "Chaque ruelle cache un témoin.",
    synopsis: "Une inspectrice enquête sur une disparition dans les ruelles de la vieille ville.",
    description:
      "Film fictif de démonstration. Sa licence de test ne couvre que la France (cas de test territorial).",
    scene: "city",
    palette: ["#05070c", "#334155", "#e3263a"],
    media: "demo-feature",
    trailer: true,
    credits: [
      { person: "anir-boudjemaa", role: "director" },
      { person: "lunja-ait-yala", role: "actor", character: "Inspectrice Dalila" },
    ],
    rights: "france-only",
  },
  {
    slug: "la-derniere-recolte",
    title: "La Dernière Récolte",
    kind: "film",
    year: 2021,
    countries: ["DZ"],
    languages: ["kab"],
    genres: ["drame"],
    runtime: 88,
    age: 10,
    minTier: "standard",
    tagline: "Avant que l'hiver ne vienne.",
    synopsis: "Un vieil homme refuse de vendre son oliveraie au moment de la dernière récolte.",
    description:
      "Film fictif de démonstration dont la licence de test a expiré : la lecture est automatiquement bloquée.",
    scene: "olive",
    palette: ["#140f05", "#78350f", "#a3e635"],
    media: "demo-feature",
    credits: [
      { person: "amastan-ouarezki", role: "director" },
      { person: "yidir-tighilt", role: "actor", character: "Dda Saïd" },
    ],
    rights: "expired",
  },
  {
    slug: "sur-la-route-de-tamanrasset",
    title: "Sur la route de Tamanrasset",
    kind: "film",
    year: 2026,
    countries: ["DZ", "NE"],
    languages: ["taq", "fr"],
    genres: ["aventure", "drame"],
    runtime: 112,
    age: 12,
    minTier: "standard",
    tagline: "Le désert ne pardonne qu'à ceux qui l'écoutent.",
    synopsis: "Deux frères traversent le Hoggar pour ramener un instrument légendaire.",
    description:
      "Film fictif de démonstration, annoncé : sa licence de test démarre dans trois mois.",
    original: true,
    scene: "desert",
    palette: ["#1c0f05", "#c2410c", "#fcd34d"],
    media: "demo-feature",
    trailer: true,
    credits: [
      { person: "gaya-medkour", role: "director" },
      { person: "massinissa-azouaou", role: "actor", character: "Akli" },
    ],
    rights: "upcoming",
    status: "announced",
  },
  {
    slug: "le-fils-du-djurdjura",
    title: "Le Fils du Djurdjura",
    kind: "film",
    year: 2026,
    countries: ["DZ"],
    languages: ["kab", "fr"],
    genres: ["historique", "drame"],
    runtime: 128,
    age: 12,
    minTier: "premium",
    tagline: "La montagne se souvient.",
    synopsis: "La fresque d'une famille sur trois générations, au pied des sommets enneigés.",
    description: "Film fictif de démonstration en accès anticipé Premium.",
    original: true,
    featured: true,
    scene: "mountains",
    palette: ["#05080f", "#1e293b", "#f8fafc"],
    media: "demo-feature",
    credits: [
      { person: "dihya-amrouchene", role: "director" },
      { person: "tiziri-belkadi", role: "actor", character: "Ourida" },
    ],
    rights: "worldwide",
  },
  {
    slug: "les-voix-du-sahara",
    title: "Les Voix du Sahara",
    kind: "documentary",
    year: 2022,
    countries: ["DZ", "ML", "NE"],
    languages: ["taq", "fr"],
    genres: ["musique", "culture-patrimoine"],
    runtime: 64,
    age: 0,
    minTier: "standard",
    tagline: "Des guitares sous les étoiles.",
    synopsis: "À la rencontre des musiciens qui font vibrer les nuits du grand Sud.",
    description: "Documentaire musical fictif de démonstration.",
    scene: "night",
    palette: ["#0a0614", "#5b21b6", "#fcd34d"],
    media: "demo-documentary",
    credits: [{ person: "aksil-tazrout", role: "director" }],
    rights: "worldwide",
  },
  {
    slug: "lettre-a-yemma",
    title: "Lettre à Yemma",
    kind: "short",
    year: 2023,
    countries: ["FR", "DZ"],
    languages: ["fr", "kab"],
    genres: ["drame", "famille"],
    tags: ["diaspora"],
    runtime: 18,
    age: 0,
    minTier: "founder",
    tagline: "Ce que l'on n'ose dire qu'en écrivant.",
    synopsis:
      "À Marseille, un étudiant écrit à sa mère restée au pays la lettre qu'il n'a jamais su prononcer.",
    description: "Court-métrage fictif de démonstration.",
    scene: "sea",
    palette: ["#03111a", "#0e7490", "#fde68a"],
    media: "demo-feature",
    credits: [
      { person: "lunja-ait-yala", role: "director" },
      { person: "aksil-tazrout", role: "actor", character: "Rayan" },
    ],
    rights: "worldwide",
  },
  {
    slug: "le-potier-dait-khir",
    title: "Le Potier d'Aït Khir",
    kind: "short",
    year: 2024,
    countries: ["DZ"],
    languages: ["kab"],
    genres: ["culture-patrimoine"],
    runtime: 14,
    age: 0,
    minTier: "free",
    tagline: "L'argile garde la mémoire des mains.",
    synopsis: "Une potière transmet à sa petite-fille les motifs géométriques de ses ancêtres.",
    description:
      "Court-métrage fictif de démonstration, accessible gratuitement aux membres inscrits.",
    scene: "pattern",
    palette: ["#1a0b05", "#9a3412", "#fef3c7"],
    media: "demo-documentary",
    credits: [{ person: "gaya-medkour", role: "director" }],
    rights: "worldwide",
  },
  {
    slug: "cuisine-de-nos-meres",
    title: "Cuisine de nos mères",
    kind: "show",
    year: 2025,
    countries: ["DZ", "FR"],
    languages: ["fr", "kab", "arq"],
    genres: ["magazine", "famille"],
    tags: ["ramadan"],
    runtime: 30,
    age: 0,
    minTier: "standard",
    tagline: "Les recettes qui racontent une histoire.",
    synopsis:
      "Chaque semaine, une famille partage une recette transmise de génération en génération.",
    description: "Émission fictive de démonstration.",
    scene: "olive",
    palette: ["#140a05", "#b91c1c", "#fde68a"],
    media: "demo-episode",
    seasons: [
      {
        number: 1,
        episodes: ep(3, ["Le couscous de Tiziri", "Les galettes du matin", "Le tajine des fêtes"]),
      },
    ],
    credits: [{ person: "kahina-taleb-demo", role: "presenter" }],
    rights: "worldwide",
  },
  {
    slug: "entretien-avec-une-conteuse",
    title: "Entretien avec une conteuse",
    kind: "interview",
    year: 2025,
    countries: ["DZ"],
    languages: ["kab", "fr"],
    genres: ["culture-patrimoine"],
    runtime: 35,
    age: 0,
    minTier: "founder",
    tagline: "Les contes ne meurent jamais.",
    synopsis: "Une conteuse évoque les récits des veillées d'hiver et leur transmission.",
    description: "Entretien fictif de démonstration.",
    scene: "night",
    palette: ["#0b0712", "#4c1d95", "#f2a541"],
    media: "demo-documentary",
    credits: [{ person: "taninna-ighil", role: "guest" }],
    rights: "worldwide",
  },
];
