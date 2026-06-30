# Rive onboarding assets

Drop `.riv` files here and they render automatically in the onboarding. Until a
file exists, the app shows the built-in animated SVG fallback — nothing breaks.

## Files the app looks for

| File                     | Slide | Concept                                            |
| ------------------------ | ----- | -------------------------------------------------- |
| `public/rive/people.riv` | 1     | Contacts assembling into one list                  |
| `public/rive/habit.riv`  | 2     | Daily streak / goal ring filling                   |
| `public/rive/settle.riv` | 3     | One hub dispersing value to several recipients     |

## Contract (so they work with zero code changes)

- **Canvas / artboard**: any name, sized ~square (the player uses `fit: contain`).
- **State machine**: name it `State Machine 1` (the Rive editor default) or pass a
  custom name in `src/components/Onboarding.tsx` → `RiveScene stateMachine=`.
- **Autoplay**: the default state machine should start playing on load.
- **Optional** `replay` trigger input: if present, it is fired each time the slide
  becomes active, so the intro animation restarts on swipe-back. Safe to omit.

## Design direction (brand)

- Accent green `#0F6E56` → `#23B083`; neutral surfaces; soft depth.
- Mobile, 60fps, lightweight. Keep each `.riv` under ~150 KB.
- Match the three concepts above; the SVG fallbacks in
  `src/components/OnboardingArt.tsx` show the intended composition.

## Where to get them

- Commission a Rive designer with the three concepts above, **or**
- Adapt files from the Rive Community marketplace (https://rive.app/community),
  **or**
- Build them in the free Rive editor (https://rive.app) and export `.riv`.

After adding a file, redeploy — the player picks it up automatically.
