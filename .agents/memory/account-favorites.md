---
name: Account favorites
description: Product decisions for guest saves and signed-in collections
---

The welcome sign-in prompt must not offer guest access or dismissal. Preserve legacy guest saves: when someone signs in, merge them into their account and remove the guest copy only after successful server persistence. Never copy a signed-in account's collection into guest saves.

**Why:** The user asked to remove both the guest option and the ability to close the sign-in prompt. Existing browser saves still need protection, and accounts' collections must remain separate.

**How to apply:** Keep these boundaries when modifying authentication, favorites syncing, account switching, or offline behavior. Account ownership must come from the server-verified identity, never a browser-supplied user ID.
