# K1_OMEGA

Multi-project process & test tracker (dark PREDICTION téma). Hotový Next.js repozitár —
stačí pushnúť na GitHub a nasadiť na Vercel.

## Rýchly štart (lokálne)
```
npm install
cp .env.example .env.local   # doplň hodnoty
npm run dev                  # http://localhost:3000
```
Bez env appka beží na localStorage (nezdieľané). So zdieľaním treba env nižšie.

## Deploy na Vercel
1. Push tohto repa na GitHub.
2. Vercel → New Project → vyber repo → Deploy.
3. Vercel → Settings → Environment Variables, doplň:
   - `GH_TOKEN` (GitHub PAT, contents:write)
   - `GH_REPO` (owner/repo — pokojne tento istý repo)
   - `GH_BRANCH` = `main`
   - `GH_PATH` = `data/k1omega.json`
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL` (voliteľné)
4. Redeploy.

## Prihlásenie
Dočasne: `test@alza.cz` / `test`. Reálnych používateľov doplníme do poľa `users`.

## Štruktúra
```
app/page.jsx              domovská stránka
app/K1_OMEGA.jsx          celá appka (klientský komponent)
app/api/state/route.js    zdieľané úložisko (GitHub Contents API)
app/api/chat/route.js     Q&A nad dokumentom (Anthropic API)
data/k1omega.json         úložisko dát (commituje sa cez API)
```

## Pozn.
- Kód prešiel build/parse kontrolou, ale ešte nebol spustený v ostrom React runtime —
  po prvom `npm run dev` daj vedieť, ak niečo vyskočí.
- Úložisko je „posledný zápis vyhráva"; výsledky testov sú vetvené na test+testera.
