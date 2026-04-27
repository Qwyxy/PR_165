# API Simulateur de Capteurs

Une API qui simule plusieurs capteurs environnementaux et sauvegarde les données dans MongoDB pour le dashboard de visualisation.

## Architecture

- **API Simulateur** (ce projet) : Génère et stocke les données des capteurs
- **Dashboard** (`../dashboard/`) : Interface web pour visualiser les données

## Installation

```bash
npm install
```

**Prérequis :** MongoDB doit être installé et en cours d'exécution sur `localhost:27017`


## Démarrage

```bash
node server.js
```

L'API sera accessible sur `http://localhost:3000`

## Endpoints

### GET /api/temperature

Retourne la température simulée actuelle.

**Réponse :**
```json
{
  "temperature": 22.45,
  "timestamp": 1640995200000
}
```

### GET /api/humidity

Retourne l'humidité simulée actuelle.

**Réponse :**
```json
{
  "humidity": 65.30,
  "timestamp": 1640995200000
}
```

### GET /api/light/upper

Retourne la luminosité du capteur supérieur simulé actuel.

**Réponse :**
```json
{
  "light": 285.67,
  "timestamp": 1640995200000
}
```

### GET /api/light/lower

Retourne la luminosité du capteur inférieur simulé actuel.

**Réponse :**
```json
{
  "light": 312.89,
  "timestamp": 1640995200000
}
```

### GET /api/co2

Retourne le taux de CO2 simulé actuel.

**Réponse :**
```json
{
  "co2": 415.20,
  "timestamp": 1640995200000
}

```

## Simulation

- **Température** : Base 20°C, variation ±1°C, plage 10-35°C
- **Humidité** : Base 60%, variation ±2%, plage 20-90%
- **Lumière** : Base 300 lux, variation ±50 lux, plage 0-1000 lux
- **CO2** : Base 400 ppm, variation ±20 ppm, plage 300-2000 ppm

Toutes les simulations se mettent à jour toutes les 5 secondes et les données sont automatiquement sauvegardées dans MongoDB.

## Base de données

- **Base de données** : `sensors`
- **Collection** : `data`
- **Structure des documents** :
  ```json
  {
    "_id": ObjectId,
    "value": number,
    "timestamp": Date,
    "sensor": string
  }
  ```

## Technologies

- Node.js
- Express
- MongoDB

## Intégration avec le Dashboard

L'API est conçue pour être utilisée par le dashboard SvelteKit situé dans `../dashboard/`.

### Démarrage complet du système

1. **Démarrer MongoDB**
   ```bash
   mongod
   ```

2. **Démarrer l'API** (dans ce dossier)
   ```bash
   node server.js
   ```

3. **Démarrer le dashboard** (dans `../dashboard/`)
   ```bash
   cd ../dashboard
   npm run dev
   ```

Le dashboard sera accessible sur `http://localhost:5173` et utilisera cette API pour afficher les données des capteurs en temps réel.