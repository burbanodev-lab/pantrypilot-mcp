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
| `shop_list_partial_pantry_multi_meal` | Partial pantry across multi-day meals → correct aggregated shortfall |
| `shop_list_unit_alias_cups_matches_cup` | Unit alias cups↔cup |
| `shop_list_demo_milk_cup_covered` | Demo sample units cover milk shortfall |
| `allowed_hosts_mcpize_public_hostname` | Host allow-list accepts mcpize hostname, rejects evil |
| `resources_and_prompts_kitchen` | `resources/list` + household read + `use_up_expiring` / `weekly_kitchen` prompts |

Ephemeral SQLite under the OS temp dir. No AWS / no secrets required (stub meal_plan).
