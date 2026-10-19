# Bronze Dawn

Turn-based strategy games about the Bronze Age, inspired by *Pre-Civilization: Bronze Age*. Each version is a single HTML file.

| File | Version | In short |
| --- | --- | --- |
| `index.html` | **Bronze Dawn** | A painted hex map to settle and conquer, ten resources, neighbors on the map. 3000 BC to 1200 BC. |
| `valley.html` | **Bronze Dawn Valley** | Closer to Pre-Civ: no map, four core resources, lands won by expedition, and one settlement that grows on screen. 6000 BC to 1200 BC. |

## Play

Open either file in a browser. There is no build step and nothing to install. Each game saves itself in the browser's localStorage after every action, and each links to the other from its intro and Game menu. Fonts come from Google Fonts when you are online; the games still work offline.

Both are designed for a desktop or laptop screen first: the scene fills the window, a drawer with a rail of tabs sits at the right, and the year-line with the End turn button runs along the bottom. On a phone the same pieces stack.

## Bronze Dawn Valley

- 80 turns of 60 years, from the first villages of 6000 BC to the Collapse.
- **Resources:** food, wood, stone and bronze, plus people, knowledge, mood and defence.
- **Trades:** farmers, woodcutters, masons, smiths, scholars and warriors. Each land keeps only so many of each trade busy at full yield.
- **Lands:** send expeditions to claim river bends, plains, marsh, forest, hills and mountains. There is no map: your lands are a list, and the valley painting shows them.
- **Bronze:** needs the Bronze idea, a forge, copper from hills or mountains, and tin from mountains or ships. Smiths burn wood as charcoal.
- **Ideas and buildings:** 28 ideas from Pottery to Iron working; houses, granaries, storehouses, temples, workshops, forges, walls, tablet houses and a market; four great works.
- **Neighbors:** Eridu, the Zagros clans and the Steppe riders trade, marry, demand and raid. You can barter, send gifts, or raid them back.
- **History:** the canals of the south, the first copper, Uruk, writing, Gilgamesh, Sargon, the Gutians, Hammurabi, Thera, the Amarna letters and the closing of the tin roads.
- **The valley:** huts become mud-brick houses, fields spread along the river, and temples, granaries, forges, walls, a palace and a ziggurat appear as you build. People walk to the fields, boats drift on the river and smoke rises from the forges.

## Bronze Dawn (map version)

## How it works

- 90 turns, 20 years each, on a hex map shaped like Mesopotamia, with the two rivers running from the highlands to the gulf.
- **Difficulty:** Easy, Normal or Hard. Harder levels bring stronger, moodier neighbors, more bad omens, bigger invasions and leaner harvests, and multiply the final score.
- **People:** assign farmers, laborers, soldiers and scholars. Everyone eats 1 grain a turn. River farmland feeds the most; farmers on poor land do not even feed themselves. **Balance farmers** finds the right number for you.
- **Land:** settle neighboring tiles and build one improvement per tile: canals, copper and tin mines, pastures, quarries, lumber camps and harbors. A realm can only govern so many lands; law codes, bureaucracy and a palace raise the limit.
- **Ideas:** 29 ideas in five tiers, from Pottery to Iron working. Once every idea is known, scholars write volumes of the *Lore of the ancestors*.
- **Faith:** after Rituals, choose a patron god: Enki, Enlil, Inanna, Utu or Nanna. Each gives a lasting bonus.
- **Buildings and great works:** houses, granaries, temples, workshops, barracks, walls, forges, scribe houses, a market and victory steles, plus five great works: the Royal tombs, the Great canal, the House of tablets, the Ziggurat and the Royal palace.
- **Bronze:** cast from 2 copper and 1 tin. Tin only comes from mountains or traders. Bronze projects (sickles, tools, weapons, chariots, armour, galleys) are powerful, but an army in bronze arms needs bronze every turn to stay equipped.
- **Silver:** wool from pastures, market dues, taxes and trade pacts bring in silver. Spend it on trade, gifts, festivals, mercenaries and great works.
- **Neighbors:**
  - Kesh is a river city.
  - Hattu are hill clans.
  - Amurru are desert herders.
  - Dilmun are seafaring traders.
  - Send gifts, sign trade pacts, swear alliances, demand tribute, make peace or go to war. Neighbors grow stronger over time and fight each other for land. Conquest makes the other neighbors wary, and conquered lands stay restless for a while. When stability falls too low, distant lands can break away.
- **History:** great events arrive on their real dates. These include the walls of Gilgamesh, Sargon of Akkad's ultimatum, the Gutian raids, the laws of Ur-Nammu, the Amorite migrations, the merchants of Assur, Hammurabi, the chariot warriors, the eruption of Thera, the sack of Babylon, the Amarna letters and Kadesh. The marks on the timeline show when.
- **The Collapse:** from 1300 BC the drought sets in, the tin roads close, refugees arrive and the Sea Peoples raid the coasts. In 1200 BC your defence, stored grain and stability are each tested, and the game shows where you stand before you choose where to put your last effort.
- **Goals and records:** 20 goals guide the early game and add to the score. Achievements and the ten best scores are kept between games.
- **Events:** about 40 random events, from floods and plagues to salted fields, mine collapses, succession crises and spies.

Resource icons are Sumerian cuneiform signs. The Chronicle tab lists what each one means, and charts how your people, army, knowledge, food, lands and stability changed over the age.

## Controls

Click or tap everything. Hover over a resource (or tap it) to see where it comes from. In the map version, clicking a land opens its card beside it. On a keyboard:

| Key | Action |
| --- | --- |
| `E` | End the turn |
| `1`–`7` | Open a drawer tab (clicking the open tab folds the drawer away) |
| Arrow keys | Move around the map once a tile has focus |
| `M` | Sound on or off |
| `?` | How to play |
| `Esc` | Close a dialog that can be closed, or the land card |

The **Game** menu turns music on or off. It also gives a save code you can copy or download to move a game to another browser, loads a code or save file, shows the hall of records and starts a new game.

## Saves

Games are saved as version 2. Version 1 saves from the first release load and carry on. Random rolls come from a seed stored in the save, and unanswered decisions are saved too, so reloading the page cannot reroll a battle or skip an event. Imported saves are checked field by field before the game uses them.

## Code layout

Each game is one file in numbered sections. In `index.html`:

1. Data
2. State and saves
3. Map geometry
4. Economy (`calc`)
5. Player actions
6. End of turn
7. Neighbor AI
8. Events and history
9. End of game and scoring
10. Rendering
11. Dialogs
12. Sound
13. Startup

Game balance lives in the data tables at the top and in `calc()`. The terrain, the valley and the event banners are painted on canvas with seeded noise (never the game's own dice), and all sound is synthesised with the Web Audio API, so there are no asset files. `valley.html` follows the same layout and shares the look, the banners, the sound and the save handling.

## Balance testing

`tools/playtest.mjs` (map version) and `tools/playtest-valley.mjs` play whole games in headless Chromium with a simple scripted ruler and print scores, ranks and the Collapse tests. They need Playwright (`npm install playwright`):

```sh
node tools/playtest.mjs 10
node tools/playtest.mjs 6 '{"aggressive":true}'
node tools/playtest.mjs 6 '{"diff":"hard","sargon":"refuse","verbose":true}'
node tools/playtest-valley.mjs 6 '{"raid":true}'
```

The games themselves do not depend on them.
