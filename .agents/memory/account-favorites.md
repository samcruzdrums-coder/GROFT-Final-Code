---
name: Account favorites
description: Product decisions for guest saves and signed-in collections
---

Guest browsing and browser-only saves remain available without an account. When someone signs in, merge guest saves into their account and remove the guest copy only after successful server persistence. Never copy a signed-in account's collection into guest saves.

**Why:** Preserve existing browser saves while keeping different accounts' collections separate and allowing the globe and index to remain publicly browsable.

**How to apply:** Keep these boundaries when modifying authentication, favorites syncing, account switching, or offline behavior. Account ownership must come from the server-verified identity, never a browser-supplied user ID.
