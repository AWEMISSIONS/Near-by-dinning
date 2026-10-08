# Nearby Dining

A fresh, login-free static recreation of the Nearby Dining experience. The former ChatGPT Site remains live; this GitHub Pages build uses the existing `AWEMISSIONS/Near-by-dinning` repository.

## Features

- Search by typed place or current location.
- Radius choices from 2 to 20 miles, defaulting to 5 miles.
- Cuisine filter, saved browser preferences, chain exclusions (McDonald's hidden by default), and distance/price/name sorting.
- Restaurant results from OpenStreetMap, with map links, directions, phone, website, and hours when mapped.
- Optional search corridor between an origin and destination.
- No login, API key, account, or app analytics.

The app sends place lookups and nearby restaurant queries to OpenStreetMap's public Nominatim and Overpass services. Public map services may be rate-limited or temporarily unavailable. Walking times and route-corridor results are estimates; the app labels the straight-line fallback. OSM data can be incomplete and does not include reliable ratings or price data for every place.

## Publish

GitHub Actions publishes this repository to GitHub Pages at `https://awemissions.github.io/Near-by-dinning/`. If Pages is not already enabled, set **Settings → Pages → Build and deployment → GitHub Actions**.
