# Bronze Dawn

A turn-based strategy game in a single HTML file, inspired by *Pre-Civilization: Bronze Age*. Lead a river tribe from 3000 BC to the Bronze Age Collapse of 1200 BC.

## Play

Open `index.html` in a browser. There is no build step and nothing to install. The game saves itself in the browser's localStorage.

## How it works

- 90 turns, 20 years each, on a hex map shaped like Mesopotamia.
- **People:** assign farmers, laborers, soldiers and scholars. Everyone eats 1 grain a turn.
- **Land:** settle neighboring tiles and build one improvement per tile: canals, copper and tin mines, pastures, quarries, harbors.
- **Bronze:** cast from 2 copper and 1 tin. Tin only comes from mountains or traders.
- **Neighbors:**
  - Kesh is a river city.
  - Hattu are hill clans.
  - Amurru are desert raiders.
  - Dilmun are seafaring traders.
  - Send gifts, demand tribute, make peace or go to war.
- **Progress:** 17 technologies, 9 buildings, 5 bronze projects and 25 random events.
- **The Collapse (1200 BC):** your defence, stored grain and stability are each tested. The final score depends on how many tests you pass.

Resource icons are Sumerian cuneiform signs. The Chronicle tab lists what each one means.

## Code layout

Everything is in `index.html`, in numbered sections: data, state, map geometry, economy (`calc`), player actions, end of turn, neighbor AI, events, end of game, rendering, dialogs and startup. Game balance lives in the data tables at the top and in `calc()`.
