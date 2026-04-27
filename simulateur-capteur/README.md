# API Simulateur de Capteur de Température


## Installation

```bash
npm install
```

## Démarrage

```bash
node server.js
```

L'API sera accessible sur `http://localhost:3000`

## Endpoint

### GET /api/temp

Retourne la température simulée actuelle.

**Réponse :**
```json
{
  "temperature": 22.45,
  "timestamp": 1640995200000
}
```

## Simulation

- Température de base : 20°C
- Variation : ±2°C toutes les 5 secondes
- Plage : 10°C à 35°C

## Technologies

- Node.js
- Express