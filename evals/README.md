# Evals

Small scripted checks for GenAI Open Agent bonus (evals + failure-mode honesty).

```bash
npm run eval
```

## Cases

| Case | Expectation |
|------|-------------|
| `happy_path_pantry_meal_cart` | `prefs_set` + `pantry_upsert` + `kitchen_run` → all steps ok, cart lines, `mediaCards` |
| `failure_cart_confirm_without_draft` | `cart_confirm` on empty household returns `{ ok: false, error: … }` (soft fail, not crash) |

Ephemeral SQLite under the OS temp dir. No AWS / no secrets required (stub meal_plan).
