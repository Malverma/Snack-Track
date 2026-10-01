# SnackTrack — App Spec

_As of 2026-10-01_

## Overview

SnackTrack is a single-user mobile app for logging meals. Each meal has a photo plus calories, protein, fat and carbs. The app opens on today's log, starts a fresh log each day, and lets you swipe to browse past days.

**Goals**

- Log a meal in under 15 seconds: photo, four numbers, save.
- See today's running totals at a glance.
- Browse any past day with a swipe.

**Non-goals for v1**

- Food database, barcode scanning or AI photo recognition — the user types the numbers.
- Accounts, cloud sync or social features — all data stays on the device.
- Charts or weekly trends.

## Core user flows

Three flows cover the whole app: view a day, add a meal, and move between days.

**1. Open the app**

1. The app opens on the Day View for today's date.
2. If no meals are logged today, an empty state says "Nothing logged yet" with an Add Meal button.
3. Totals for calories, protein, fat and carbs show at the top.

**2. Add a meal**

1. Tap the floating **+** button on the Day View.
2. The Add Meal sheet opens. Tap the photo area to take a photo or pick one from the library.
3. Enter a name (optional), calories, protein (g), fat (g) and carbs (g).
4. Tap **Save**. The sheet closes, the meal appears at the top of that day's list, and totals update.
5. The meal is saved to the day currently shown, timestamped with the current time.

**3. Browse days**

1. Swipe left to go to the previous day. Swipe right to go to the next day.
2. The header shows the date ("Today", "Yesterday", or e.g. "Mon, Sep 29").
3. Tapping the date opens a date picker to jump to any day.
4. A **Today** button appears in the header whenever you are not on today.

**4. Edit or delete a meal**

1. Tap a meal card to open it in the same sheet, pre-filled.
2. Change any field and Save, or tap **Delete** and confirm.

## Screens and layout

The app has two screens: the Day View, which is the home screen, and an Add / Edit Meal sheet that slides up over it.

```
        Day View                     Add / Edit Meal sheet
┌──────────────────────────┐    ┌──────────────────────────┐
│  ‹        Today        › │    │ Cancel   Add meal  Delete│
│ ┌──────────────────────┐ │    │ ┌──────────────────────┐ │
│ │ Calories total (kcal)│ │    │ │                      │ │
│ │ Protein g·Fat g·Carbs│ │    │ │   Tap to add photo   │ │
│ └──────────────────────┘ │    │ │  camera or library   │ │
│ ┌──────────────────────┐ │    │ └──────────────────────┘ │
│ │[img] Meal name   time│ │    │ ┌──────────────────────┐ │
│ │      kcal·P·F·C      │ │    │ │ Name (optional)      │ │
│ └──────────────────────┘ │    │ └──────────────────────┘ │
│ ┌──────────────────────┐ │    │ ┌──────────────────────┐ │
│ │[img] Meal name   time│ │    │ │ Calories (kcal)      │ │
│ │      kcal·P·F·C      │ │    │ └──────────────────────┘ │
│ └──────────────────────┘ │    │ ┌──────┐┌──────┐┌──────┐ │
│  newest first · tap to   │    │ │Prot g││ Fat g││Carb g│ │
│  edit                    │    │ └──────┘└──────┘└──────┘ │
│                          │    │ ┌──────────────────────┐ │
│                     (+)  │    │ │         Save         │ │
└──────────────────────────┘    │ └──────────────────────┘ │
 ← swipe left: previous day     └──────────────────────────┘
   swipe right: next day →
```

**Day View** (top to bottom)

- **Header:** previous and next arrows around the date label; a Today button when not on today.
- **Totals card:** calories as the large number, then protein, fat and carbs in grams.
- **Meal list:** one card per meal with a photo thumbnail, name, kcal and macros, and the time logged. Newest first; the list scrolls vertically.
- **+ button:** floating at bottom right; opens the Add Meal sheet.

**Add / Edit Meal sheet**

- Photo area at the top; tap to take or choose a photo, tap again to replace or remove it.
- Fields: name (optional), calories, then protein, fat and carbs side by side.
- Save at the bottom (enabled once there is a name, photo or number, and no invalid number); Cancel at top left. In edit mode, Delete appears at top right.

## Settings

A settings icon sits in the top-right corner. Tapping it opens a menu with two options.

- **Set calorie goal:** a daily goal from 500 to 10,000 kcal (default 2,000), with presets of 1,500, 1,800, 2,000, 2,500 and 3,000. Every day's totals card shows `eaten / goal kcal`, a progress bar, and "N kcal left" or "N kcal over" (the bar stays in the accent color).
- **Themes:** dark mode or light mode, plus a primary color: purple (default), blue, green, orange, pink or red. Changes apply right away.

Settings are saved on the device in a `settings` key/value table.

## Data model

One table of meals, keyed by local calendar date, is all v1 needs. Day totals are computed, not stored.

**Meal**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | yes | Generated on create |
| date | string `YYYY-MM-DD` | yes | Local calendar day the meal belongs to |
| loggedAt | ISO timestamp | yes | Used to sort meals within a day, newest first |
| name | string, max 60 chars | no | Shown as "Meal" if empty |
| photoPath | string | no | Path to a local image file |
| calories | integer, kcal | yes | 0–5,000; empty input saves as 0 |
| protein | decimal, g | yes | 0–500, one decimal place |
| fat | decimal, g | yes | 0–500, one decimal place |
| carbs | decimal, g | yes | 0–500, one decimal place |
| createdAt / updatedAt | ISO timestamp | yes | Set automatically |

**Day (computed)**

A day is every Meal with a given `date`. Its totals are the sum of each nutrient across those meals. A day with no meals still shows, with zero totals.

**Storage**

- Meals live in an on-device database (e.g. SQLite) with an index on `date`.
- Photos are resized to max 1,280 px on the long edge, saved as JPEG in app storage, and a 256 px thumbnail is kept for the list.
- Deleting a meal deletes its photo files.

## Day rollover and navigation

A new day starts at local midnight; no data is moved or reset, the app just shows a new, empty date.

**Rollover**

- "Today" = the device's current local date.
- If the app is open across midnight, it switches to the new day on the next foreground or within 1 minute, but only if the user was viewing "Today". If they were browsing another day, they stay there.
- If the device's time zone changes, existing meals keep their stored `date`.

**Swipe rules**

| Gesture | Result |
| --- | --- |
| Swipe left | Previous day (day − 1) |
| Swipe right | Next day (day + 1) |
| Swipe right while on Today | Blocked with a small rubber-band bounce; future days are not shown |
| Tap date in header | Date picker, future dates disabled |
| Tap Today button | Jump back to today |

- There is no lower limit: you can swipe back to days with no meals.
- Pages are rendered as a pager (3 pages kept in memory: previous, current, next) so swipes animate smoothly.
- A swipe must travel at least 25% of screen width or be a fast fling to change day; vertical scroll inside the meal list must not trigger it.

## Validation, edge cases and acceptance

**Validation**

- Calories, protein, fat and carbs are optional; an empty field counts as 0 (e.g. black coffee = 0 kcal). Save is enabled once the meal has a name, a photo or at least one number, and every typed number is valid.
- Numeric keyboard only; negative numbers rejected; values over the max show "That looks too high" under the field.
- Photo is optional. A meal without one shows a neutral placeholder icon.

**Edge cases**

- Camera or photo permission denied: show a one-line explanation and a link to Settings; the meal can still be saved without a photo.
- Closing the sheet with unsaved input asks "Discard this meal?".
- Adding a meal while viewing a past day saves it to that past day.
- Storage full when saving a photo: save the meal without the photo and show a message.

**Acceptance criteria**

- [ ] App opens on today's date with an empty log on a new day.
- [ ] A meal with photo and all four values can be added, and totals update immediately.
- [ ] A meal with only a name and calories (other fields empty) saves with 0 g for the empty macros.
- [ ] Swipe left shows the previous day; swipe right shows the next day, stopping at today.
- [ ] Meals and photos persist after the app is force-closed and reopened.
- [ ] A meal can be edited and deleted, and totals update.
- [ ] Crossing midnight while on Today shows the new empty day.

**Open questions**

- Platform: iOS, Android, or both (e.g. React Native / Flutter)?
- Swipe direction: keep swipe left = previous day as requested, or reverse it to match the common page-turn convention?
- Should totals of fat, protein and carbs also show their calorie share?
