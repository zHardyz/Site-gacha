# Gacha Game

This project is a simple gacha game where users can summon characters and view their collection.

## Features

- **Summon System:** Users can summon characters with different rarities.
- **Stock Page:** Users can view all the characters they have acquired.
- **Rarity System:** Characters have different rarities, including Common, Rare, Epic, Legendary, Mythic, and Special.

## How to Use

1.  **Summon Characters:**
    -   Go to the main page (`index.html`).
    -   Click the "Summon" button to get a new character.
    -   Spins are limited and reset every hour.

2.  **View Stock:**
    -   Go to the `stock.html` page to see all your collected characters.
    -   The stock is automatically saved in your browser's local storage.

## Data Schema

The character data is stored in the browser's local storage under the key `gacha.inventory.v1`. The data is an array of character objects with the following structure:

```json
[
    {
        "id": 123,
        "name": "Character Name",
        "image": "path/to/image.jpg",
        "rarity": "Rare",
        "anime": "Anime Name",
        "quantity": 2
    }
]
```