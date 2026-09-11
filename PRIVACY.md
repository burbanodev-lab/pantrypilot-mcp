# PantryPilot Privacy Policy

Last updated: September 11, 2026

PantryPilot is a hackathon demonstration of an Alexa+-ready kitchen operations agent. It stores only the household information that a user explicitly provides to operate the demo, such as pantry items, household preferences, serving size, meal-plan state, and draft-cart state.

## Data handling

- PantryPilot does not sell personal information.
- The public demo is not intended for sensitive personal data, payment credentials, passwords, or authentication secrets.
- Purchase-related behavior stops at a reversible mock cart draft. PantryPilot does not charge a payment method or place an external order.
- The reference implementation stores demo household state in its configured SQLite data store. Operators of a deployed instance control that storage and are responsible for securing and deleting their deployment data.
- Optional Amazon Bedrock use sends meal-planning input to the operator's authorized AWS account only when that runtime path is explicitly configured.

## Third-party services

A deployment may use GitHub, Amazon Web Services, Alexa+, or an MCP hosting provider. Those services process data according to their own terms and privacy notices.

## Data deletion

For the hackathon reference implementation, an operator can remove the configured SQLite data store to delete locally persisted demo state. Production deployments should provide user-facing deletion and retention controls appropriate to their environment.

## Contact

Project repository: https://github.com/burbanodev-lab/pantrypilot-mcp

This policy describes the current hackathon reference implementation and should be reviewed before any production release.
