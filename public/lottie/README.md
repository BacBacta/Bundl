# Lottie onboarding animations

These professionally-made Lottie animations play in the onboarding. Each file is
loaded at runtime; if it's missing the app falls back to the built-in SVG scene
(`src/components/OnboardingArt.tsx`). Swap any file to restyle a slide — no code
change needed.

| File          | Slide | Scene                              |
| ------------- | ----- | ---------------------------------- |
| `people.json` | 1     | Contacts list (contact cards)      |
| `habit.json`  | 2     | Streak flame (keep the habit)      |
| `settle.json` | 3     | Money flying out (payment)         |

## Licensing — action needed before public launch

These are placeholder animations sourced from public repositories and are most
likely originally from the LottieFiles free library. Free Lottie assets are
generally free for commercial use **but often require attribution**. Before a
production / mainnet launch:

1. Confirm each animation's license, or
2. Replace them with animations you own or have licensed, or commission a matched
   on-brand set (recommended for full visual cohesion).

To swap: download a `.json` Lottie from https://lottiefiles.com, drop it here with
the same filename, and redeploy. For best results pick a cohesive set that uses
the brand green (#0F6E56 / #23B083).
