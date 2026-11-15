// How a quest is introduced wherever it is referenced: "Hub 3★: Quest Title" (Raven, 2026-11-14: "make them say Type
// N Star: Quest Title"), and a Special Permit quest just "Special Permit: Quest Title" ("Special Permit quests, just say
// Special Permit"). tools/build_quests.py writes the items' quest-reward labels the same way.
export const questPrefix = (category: string, stars: string) =>
  category === 'Special Permit' ? category : `${category} ${stars}`
