# Match Engine Constants Refactoring (10 March 2026)

## Summary
The match engine (src/utils/match.js) has been comprehensively refactored with all magic numbers extracted into a centralized `MATCH` constants object at the top of the file.

## Changes Made
- All hardcoded numerical values (goal probability multipliers, home advantage values, red card penalties, penalty conversion rates, etc.) have been extracted
- Constants organized into logical groups with descriptive comments
- All references throughout the file use named constants instead of inline magic numbers
- No logic changes - pure refactoring to improve code maintainability

## Constants Extracted
- Home advantage (HOME_ADV)
- Expected goals calculations (XG_INTERCEPT, XG_MULTIPLIER, XG_FLOOR, XG_ABS_FLOOR)
- Trait multipliers (TRAIT_DOMINANT, TRAIT_STARS, TRAIT_FREE_SCORE, etc.)
- Injury effects (INJURY_PENALTY, INJURY_OPP_BOOST)
- Special effects (TALISMAN_EFFECT, OOP_OPP_BOOST)
- Goal limits and probabilities
- Scorer position weights
- Match timing and minute selection
- Rate calculations and ranges

## Testing
- All 39 existing tests pass
- Build completes successfully with no errors
- No logic changes, only refactoring

## Verification
This PR verifies that the refactoring is complete and all systems are working correctly.
