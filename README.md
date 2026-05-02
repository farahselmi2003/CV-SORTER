# CV Sorter — Tri Intelligent de CV par IA

Application web complète de tri et d'analyse de CV utilisant l'API Gemini pour évaluer automatiquement les candidatures.

## 🚀 Fonctionnalités

- **Upload de CV** : Glissez-déposez ou sélectionnez un fichier PDF
- **Analyse IA** : Extraction automatique du texte + analyse par Gemini 1.5 Flash
- **Score d'adéquation** : Note de 0 à 100 avec anneau animé
- **Décision automatique** : Retenu (vert) / À étudier (orange) / Refusé (rouge)
- **Tableau de bord** : Vue d'ensemble de tous les candidats analysés
- **Filtres** : Filtrer par statut de décision
- **Détail modal** : Voir le détail complet de chaque analyse
- **Persistance** : Données sauvegardées dans le localStorage du navigateur

## 📁 Structure du projet

```
cv-sorter/
├── public/
│   ├── index.html       # Interface utilisateur
│   ├── style.css        # Design system (bleu marine / blanc)
│   └── script.js        # Logique frontend
├── api/
│   └── analyze.js       # Serverless function (Vercel) / Route Express
├── server.js            # Serveur Express pour le développement local
├── package.json
├── vercel.json          # Configuration Vercel
├── .env.example         # Template des variables d'environnement
├── .gitignore
└── README.md
```

## 🛠️ Installation et lancement en local

### 1. Cloner / se placer dans le dossier

```bash
cd cv-sorter
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer la clé API Gemini

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Puis éditez `.env` et remplacez la valeur par votre vraie clé API :

```
GEMINI_API_KEY=AIza-votre-cle-gemini-ici
```

> 💡 Obtenez votre clé sur [Google AI Studio](https://aistudio.google.com/app/apikey)

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur **http://localhost:3000**

## ☁️ Déploiement sur Vercel

### 1. Installer Vercel CLI (optionnel)

```bash
npm i -g vercel
```

### 2. Déployer

```bash
vercel
```

Ou connectez votre repo GitHub à [vercel.com](https://vercel.com) pour un déploiement automatique.

### 3. Configurer la variable d'environnement

Dans le dashboard Vercel de votre projet :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez `GEMINI_API_KEY` avec votre clé API
3. Redéployez le projet

## 🔧 Technologies

| Composant | Technologie |
|-----------|-------------|
| Frontend  | HTML5, CSS3, JavaScript ES6+ |
| Backend   | Node.js, Express |
| IA        | Gemini API (gemini-2.0-flash) |
| PDF       | pdf-parse |
| Déploiement | Vercel (serverless) |
| Typographie | Inter (Google Fonts) |

## 📝 Prompt d'analyse

Le prompt envoyé à l'IA demande une analyse structurée retournant :

- **nom** : Nom du candidat
- **experience_annees** : Nombre d'années d'expérience
- **competences_cles** : Liste des compétences principales
- **score_adequation** : Score de 0 à 100
- **profil_resume** : Résumé en 2 phrases
- **decision** : Retenu / À étudier / Refusé
- **justification** : Explication de la décision

## ⚠️ Notes importantes

- La clé API Gemini n'est **jamais** exposée côté client
- L'extraction PDF se fait côté serveur via `pdf-parse`
- Les données des candidats sont stockées dans le `localStorage` du navigateur (pas de base de données)
- Taille max des fichiers PDF : 10 Mo
