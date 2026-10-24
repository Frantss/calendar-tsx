# Storybook visual review

## 2026-10-24

Reviewed all 146 stories in the running Storybook with fresh Chromium screenshots on macOS. Five findings affect
seven stories: two readability defects and three minor style defects. Calendar and story code were left unchanged.

### Method and scope

- Captured each story after its Storybook play function finished and fonts loaded. Inspected full-page captures,
  grouped contact sheets, and full-size crops of suspected defects. Rechecked findings in the browser with DOM measurements.
- Used a 1280 × 900 viewport for the desktop pass; 390 × 844 for Mobile Month and Narrow Viewport;
  600 × 720 for Horizontal Scroll. Rechecks also used 1280 × 720.
- Reviewed all four layouts in every theme gallery. Emulated `forced-colors: active` for Forced Colors.
- Inspected scrolled timeline content in Quarter, Month With Daily Slots, Horizontal Scroll, and Narrow Viewport.
  The focus and keyboard stories were inspected after their play functions.
- This is a visual review of the supplied fixtures and states in Chromium. Other browser engines, every story at
  every breakpoint, 200% zoom, and a complete contrast/accessibility audit were not covered.
- Full captures are retained locally in `/tmp/calendar-storybook-visual-review/`. Cropped evidence is linked below.
  Screenshot comparisons were not used as a verdict on visual quality: an existing baseline can preserve a defect.

### F1 · P2 · Hour labels collapse into unreadable digits in the smoke timeline

- **What:** Calendar/Views → Timeline compresses seven days of hourly labels into its 960px calendar. Adjacent
  hourly tracks start only 4.75px apart. A label box is 9px wide, including padding/border, while `12:00 AM` needs
  about 45px for its text. Clipping leaves a run of digits instead of readable times.
- **Where:** `apps/docs/examples/core/setup.ts:33` defines the reused seven-day timeline;
  `apps/docs/examples/react/timeline-view.tsx:49` renders each hourly label;
  `packages/themes/default.css:581` styles and clips the slot labels.
- **Why it matters:** readers cannot locate an event or the now indicator against the time axis.
- **Evidence:** [hour labels](storybook-visual-review-assets/timeline-hour-labels.png).

### F2 · P2 · Quarter timeline day headings overlap adjacent dates

- **What:** Views/Timeline → Quarter uses 32px daily tracks. Day triggers are about 42–50px wide before the
  header's own padding. The headings overflow their tracks and collide. The same collision remains after scrolling
  from January to March; the highlighted March 11 marker also extends into its neighbor.
- **Where:** `apps/storybook/stories/views/timeline.stories.tsx:18` sets `minSlotWidth: '2rem'`;
  `packages/themes/default.css:546` adds day-header padding and nowrap;
  `packages/themes/default.css:564` adds the day-trigger padding.
- **Why it matters:** adjacent date headings merge, so an event's date is difficult to read accurately.
- **Evidence:** [quarter after horizontal scroll](storybook-visual-review-assets/timeline-quarter-labels.png).

### F3 · P3 · Resource-month header text spills outside its cells

- **What:** Features/Resources → Months Then Resources places fourteen columns in each month panel. Header cells
  measure 38.64px. After 16px horizontal padding, the word `Room` is wider than the remaining space. Its text extends
  about 2.9px beyond the cell, and the final header is clipped at the calendar's right edge. Every header wraps into
  three lines (`Room`, `A`/`B`, weekday), producing a crowded band above much shorter event labels.
- **Where:** `apps/storybook/stories/features/resources.stories.tsx:39` configures the grouping;
  `apps/storybook/stories/support/layout.tsx:67` repeats the resource title in each weekday header;
  `packages/themes/default.css:255` applies the header padding.
- **Why it matters:** column headings lose their visual boundaries in the example intended to explain grouping.
- **Evidence:** [resource-month headers](storybook-visual-review-assets/resource-month-headers.png).

### F4 · P3 · External-atom status outputs run together

- **What:** Features/Custom features → External Atom displays `Highlight: PlanningExternal atom: Planning`.
  The first output ends at x=152.03px and the second starts at precisely that position, with no gap or separator.
- **Where:** `apps/storybook/stories/features/custom-features.stories.tsx:41` and `:42` render adjacent outputs;
  `apps/storybook/stories/support/stories.css:19` sets only vertical margins on them.
- **Why it matters:** two independent state values read as one malformed label, obscuring the demonstration.
- **Evidence:** [joined status outputs](storybook-visual-review-assets/joined-status-text.png).

### F5 · P3 · Clock and controlled-navigation buttons use a smaller, cramped style

- **What:** Advance Clock in Now Indicator and Midnight Rollover, and Apply Navigation in Controlled Navigation,
  render as 21.5px-tall native buttons with 13.33px text. Other story controls are 44px tall with 16px text.
  The clock button touches the calendar header; Apply Navigation sits directly against the navigation row.
- **Where:** `apps/storybook/stories/support/scenario.tsx:117` and `:160` render these buttons outside
  `.story-controls`; `apps/storybook/stories/support/stories.css:12` limits the larger control styling to the
  controls/details wrappers.
- **Why it matters:** controls for comparable actions have inconsistent hierarchy and hit areas, and lack separation
  from the calendar or adjacent controls.
- **Evidence:** [clock control](storybook-visual-review-assets/clock-control.png),
  [controlled-navigation control](storybook-visual-review-assets/navigation-control.png).

### Observations excluded from findings

- Exact Event Durations intentionally renders brief events as thin bars without clipped text. This behavior is
  documented in `packages/themes/readme.md` under Brief time-grid events.
- Ellipsized month/timeline event titles, continuation edges, and horizontal scrolling in narrow timelines are
  expected treatments. Scrolling exposed the remaining timeline content correctly.
- Dark gallery calendars use dark surfaces inside a white Storybook page. This does not make their text unreadable;
  no defect is recorded solely for the surrounding page color.
- The high-contrast boundary-ratio discrepancy is already recorded in `reports/themes.md`; this review does not
  duplicate that finding or claim that all contrast ratios were remeasured.

### Per-story coverage

“Observed” means visually inspected with no additional issue identified at the viewport and state above.
Finding identifiers refer to the sections above. Links open the corresponding story in the local Storybook.

| #   | Story                                                                                                                                                                    | Result   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | [Calendar/Views / Month](http://127.0.0.1:6006/?path=/story/calendar-views--month)                                                                                       | Observed |
| 2   | [Calendar/Views / Week](http://127.0.0.1:6006/?path=/story/calendar-views--week)                                                                                         | Observed |
| 3   | [Calendar/Views / Agenda](http://127.0.0.1:6006/?path=/story/calendar-views--agenda)                                                                                     | Observed |
| 4   | [Calendar/Views / Timeline](http://127.0.0.1:6006/?path=/story/calendar-views--timeline)                                                                                 | F1       |
| 5   | [Calendar/Views / Empty Agenda](http://127.0.0.1:6006/?path=/story/calendar-views--empty-agenda)                                                                         | Observed |
| 6   | [Calendar/Views / Dark Month](http://127.0.0.1:6006/?path=/story/calendar-views--dark-month)                                                                             | Observed |
| 7   | [Calendar/Views / Mobile Month](http://127.0.0.1:6006/?path=/story/calendar-views--mobile-month)                                                                         | Observed |
| 8   | [Calendar/Views / Navigate To Day](http://127.0.0.1:6006/?path=/story/calendar-views--navigate-to-day)                                                                   | Observed |
| 9   | [Features/Backgrounds / Timed Background](http://127.0.0.1:6006/?path=/story/features-backgrounds--timed-background)                                                     | Observed |
| 10  | [Features/Backgrounds / All Day Background](http://127.0.0.1:6006/?path=/story/features-backgrounds--all-day-background)                                                 | Observed |
| 11  | [Features/Backgrounds / Cross Midnight Background](http://127.0.0.1:6006/?path=/story/features-backgrounds--cross-midnight-background)                                   | Observed |
| 12  | [Features/Backgrounds / Resource Scoped Background](http://127.0.0.1:6006/?path=/story/features-backgrounds--resource-scoped-background)                                 | Observed |
| 13  | [Features/Backgrounds / Background Only Agenda](http://127.0.0.1:6006/?path=/story/features-backgrounds--background-only-agenda)                                         | Observed |
| 14  | [Features/Backgrounds / Timeline Background Event](http://127.0.0.1:6006/?path=/story/features-backgrounds--timeline-background-event)                                   | Observed |
| 15  | [Features/Backgrounds / Holiday Layer](http://127.0.0.1:6006/?path=/story/features-backgrounds--holiday-layer)                                                           | Observed |
| 16  | [Features/Backgrounds / Weekly Business Hours](http://127.0.0.1:6006/?path=/story/features-backgrounds--weekly-business-hours)                                           | Observed |
| 17  | [Features/Backgrounds / Inverse Layer](http://127.0.0.1:6006/?path=/story/features-backgrounds--inverse-layer)                                                           | Observed |
| 18  | [Features/Backgrounds / Overlapping Layers](http://127.0.0.1:6006/?path=/story/features-backgrounds--overlapping-layers)                                                 | Observed |
| 19  | [Features/Backgrounds / Resource Scoped Layer](http://127.0.0.1:6006/?path=/story/features-backgrounds--resource-scoped-layer)                                           | Observed |
| 20  | [Features/Backgrounds / Per View Override](http://127.0.0.1:6006/?path=/story/features-backgrounds--per-view-override)                                                   | Observed |
| 21  | [Features/Backgrounds / Cleared Override](http://127.0.0.1:6006/?path=/story/features-backgrounds--cleared-override)                                                     | Observed |
| 22  | [Features/Backgrounds / Timeline Layers](http://127.0.0.1:6006/?path=/story/features-backgrounds--timeline-layers)                                                       | Observed |
| 23  | [Features/Clock / Today Highlight](http://127.0.0.1:6006/?path=/story/features-clock--today-highlight)                                                                   | Observed |
| 24  | [Features/Clock / Now Indicator](http://127.0.0.1:6006/?path=/story/features-clock--now-indicator)                                                                       | F5       |
| 25  | [Features/Clock / Now Outside Window](http://127.0.0.1:6006/?path=/story/features-clock--now-outside-window)                                                             | Observed |
| 26  | [Features/Clock / Now On Hidden Day](http://127.0.0.1:6006/?path=/story/features-clock--now-on-hidden-day)                                                               | Observed |
| 27  | [Features/Clock / Midnight Rollover](http://127.0.0.1:6006/?path=/story/features-clock--midnight-rollover)                                                               | F5       |
| 28  | [Features/Composition and accessibility / Custom Event Content](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--custom-event-content)         | Observed |
| 29  | [Features/Composition and accessibility / Render Element](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--render-element)                     | Observed |
| 30  | [Features/Composition and accessibility / Render Function](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--render-function)                   | Observed |
| 31  | [Features/Composition and accessibility / Keyboard Activation](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--keyboard-activation)           | Observed |
| 32  | [Features/Composition and accessibility / Focus Visible](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--focus-visible)                       | Observed |
| 33  | [Features/Composition and accessibility / Localized Date Labels](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--localized-date-labels)       | Observed |
| 34  | [Features/Composition and accessibility / Custom Accessible Labels](http://127.0.0.1:6006/?path=/story/features-composition-and-accessibility--custom-accessible-labels) | Observed |
| 35  | [Features/Custom features / Highlight Feature](http://127.0.0.1:6006/?path=/story/features-custom-features--highlight-feature)                                           | Observed |
| 36  | [Features/Custom features / Per View Configuration](http://127.0.0.1:6006/?path=/story/features-custom-features--per-view-configuration)                                 | Observed |
| 37  | [Features/Custom features / Internal State](http://127.0.0.1:6006/?path=/story/features-custom-features--internal-state)                                                 | Observed |
| 38  | [Features/Custom features / Controlled State](http://127.0.0.1:6006/?path=/story/features-custom-features--controlled-state)                                             | Observed |
| 39  | [Features/Custom features / External Atom](http://127.0.0.1:6006/?path=/story/features-custom-features--external-atom)                                                   | F4       |
| 40  | [Features/Custom features / State Persists Across Views](http://127.0.0.1:6006/?path=/story/features-custom-features--state-persists-across-views)                       | Observed |
| 41  | [Features/Custom features / Independent Instances](http://127.0.0.1:6006/?path=/story/features-custom-features--independent-instances)                                   | Observed |
| 42  | [Features/Event updates / Add Event](http://127.0.0.1:6006/?path=/story/features-event-updates--add-event)                                                               | Observed |
| 43  | [Features/Event updates / Update Event](http://127.0.0.1:6006/?path=/story/features-event-updates--update-event)                                                         | Observed |
| 44  | [Features/Event updates / Remove Event](http://127.0.0.1:6006/?path=/story/features-event-updates--remove-event)                                                         | Observed |
| 45  | [Features/Event updates / Reset Events](http://127.0.0.1:6006/?path=/story/features-event-updates--reset-events)                                                         | Observed |
| 46  | [Features/Event updates / Filter Events](http://127.0.0.1:6006/?path=/story/features-event-updates--filter-events)                                                       | Observed |
| 47  | [Features/Event updates / Custom Ordering](http://127.0.0.1:6006/?path=/story/features-event-updates--custom-ordering)                                                   | Observed |
| 48  | [Features/Navigation / Previous Next](http://127.0.0.1:6006/?path=/story/features-navigation--previous-next)                                                             | Observed |
| 49  | [Features/Navigation / Today](http://127.0.0.1:6006/?path=/story/features-navigation--today)                                                                             | Observed |
| 50  | [Features/Navigation / Go To Date](http://127.0.0.1:6006/?path=/story/features-navigation--go-to-date)                                                                   | Observed |
| 51  | [Features/Navigation / Switch View](http://127.0.0.1:6006/?path=/story/features-navigation--switch-view)                                                                 | Observed |
| 52  | [Features/Navigation / Controlled Navigation](http://127.0.0.1:6006/?path=/story/features-navigation--controlled-navigation)                                             | F5       |
| 53  | [Features/Navigation / Day Trigger](http://127.0.0.1:6006/?path=/story/features-navigation--day-trigger)                                                                 | Observed |
| 54  | [Features/Navigation / Prevented Day Trigger](http://127.0.0.1:6006/?path=/story/features-navigation--prevented-day-trigger)                                             | Observed |
| 55  | [Features/Navigation / Overnight Input Range](http://127.0.0.1:6006/?path=/story/features-navigation--overnight-input-range)                                             | Observed |
| 56  | [Features/Overflow / Local Overflow](http://127.0.0.1:6006/?path=/story/features-overflow--local-overflow)                                                               | Observed |
| 57  | [Features/Overflow / Spanning Event Overflow](http://127.0.0.1:6006/?path=/story/features-overflow--spanning-event-overflow)                                             | Observed |
| 58  | [Features/Overflow / Resource Scoped Overflow](http://127.0.0.1:6006/?path=/story/features-overflow--resource-scoped-overflow)                                           | Observed |
| 59  | [Features/Overflow / Server Overflow Hint](http://127.0.0.1:6006/?path=/story/features-overflow--server-overflow-hint)                                                   | Observed |
| 60  | [Features/Overflow / Open Overflow Details](http://127.0.0.1:6006/?path=/story/features-overflow--open-overflow-details)                                                 | Observed |
| 61  | [Features/Recurrence / Daily Series](http://127.0.0.1:6006/?path=/story/features-recurrence--daily-series)                                                               | Observed |
| 62  | [Features/Recurrence / Weekly Series](http://127.0.0.1:6006/?path=/story/features-recurrence--weekly-series)                                                             | Observed |
| 63  | [Features/Recurrence / All Day Series](http://127.0.0.1:6006/?path=/story/features-recurrence--all-day-series)                                                           | Observed |
| 64  | [Features/Recurrence / Count And Until](http://127.0.0.1:6006/?path=/story/features-recurrence--count-and-until)                                                         | Observed |
| 65  | [Features/Recurrence / Included And Excluded Dates](http://127.0.0.1:6006/?path=/story/features-recurrence--included-and-excluded-dates)                                 | Observed |
| 66  | [Features/Recurrence / Replace Occurrence](http://127.0.0.1:6006/?path=/story/features-recurrence--replace-occurrence)                                                   | Observed |
| 67  | [Features/Recurrence / Edit Series](http://127.0.0.1:6006/?path=/story/features-recurrence--edit-series)                                                                 | Observed |
| 68  | [Features/Recurrence / Monthly Ordinal Weekday](http://127.0.0.1:6006/?path=/story/features-recurrence--monthly-ordinal-weekday)                                         | Observed |
| 69  | [Features/Recurrence / Last Business Day](http://127.0.0.1:6006/?path=/story/features-recurrence--last-business-day)                                                     | Observed |
| 70  | [Features/Recurrence / Yearly Series](http://127.0.0.1:6006/?path=/story/features-recurrence--yearly-series)                                                             | Observed |
| 71  | [Features/Recurrence / Independent Exclusion Rules](http://127.0.0.1:6006/?path=/story/features-recurrence--independent-exclusion-rules)                                 | Observed |
| 72  | [Features/Recurrence / Series Zone And Display Zone](http://127.0.0.1:6006/?path=/story/features-recurrence--series-zone-and-display-zone)                               | Observed |
| 73  | [Features/Resources / Shared Event](http://127.0.0.1:6006/?path=/story/features-resources--shared-event)                                                                 | Observed |
| 74  | [Features/Resources / Unassigned Event](http://127.0.0.1:6006/?path=/story/features-resources--unassigned-event)                                                         | Observed |
| 75  | [Features/Resources / Resource Order](http://127.0.0.1:6006/?path=/story/features-resources--resource-order)                                                             | Observed |
| 76  | [Features/Resources / Resource First Columns](http://127.0.0.1:6006/?path=/story/features-resources--resource-first-columns)                                             | Observed |
| 77  | [Features/Resources / Date First Columns](http://127.0.0.1:6006/?path=/story/features-resources--date-first-columns)                                                     | Observed |
| 78  | [Features/Resources / Months Then Resources](http://127.0.0.1:6006/?path=/story/features-resources--months-then-resources)                                               | F3       |
| 79  | [Features/Resources / Resources Then Months](http://127.0.0.1:6006/?path=/story/features-resources--resources-then-months)                                               | Observed |
| 80  | [Features/Resources / Business Hours](http://127.0.0.1:6006/?path=/story/features-resources--business-hours)                                                             | Observed |
| 81  | [Features/Resources / Split Availability](http://127.0.0.1:6006/?path=/story/features-resources--split-availability)                                                     | Observed |
| 82  | [Features/Resources / Fully Unavailable](http://127.0.0.1:6006/?path=/story/features-resources--fully-unavailable)                                                       | Observed |
| 83  | [Features/Resources / Resource Specific Hours](http://127.0.0.1:6006/?path=/story/features-resources--resource-specific-hours)                                           | Observed |
| 84  | [Features/Time zones and DST / Display Zone Conversion](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--display-zone-conversion)                         | Observed |
| 85  | [Features/Time zones and DST / Spring Forward](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--spring-forward)                                           | Observed |
| 86  | [Features/Time zones and DST / Repeated Hour Overlap](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--repeated-hour-overlap)                             | Observed |
| 87  | [Features/Time zones and DST / Rollback Crossing Event](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--rollback-crossing-event)                         | Observed |
| 88  | [Features/Time zones and DST / Timeline Across DST](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--timeline-across-dst)                                 | Observed |
| 89  | [Features/Time zones and DST / Skipped Midnight](http://127.0.0.1:6006/?path=/story/features-time-zones-and-dst--skipped-midnight)                                       | Observed |
| 90  | [Features/Visible hours / Business Hours Window](http://127.0.0.1:6006/?path=/story/features-visible-hours--business-hours-window)                                       | Observed |
| 91  | [Features/Visible hours / Overnight Window](http://127.0.0.1:6006/?path=/story/features-visible-hours--overnight-window)                                                 | Observed |
| 92  | [Features/Visible hours / Off Hour Start](http://127.0.0.1:6006/?path=/story/features-visible-hours--off-hour-start)                                                     | Observed |
| 93  | [Features/Visible hours / Partial Final Slot](http://127.0.0.1:6006/?path=/story/features-visible-hours--partial-final-slot)                                             | Observed |
| 94  | [Features/Visible hours / Hidden Day With Overnight Tail](http://127.0.0.1:6006/?path=/story/features-visible-hours--hidden-day-with-overnight-tail)                     | Observed |
| 95  | [Features/Visible hours / Timeline Overnight Window](http://127.0.0.1:6006/?path=/story/features-visible-hours--timeline-overnight-window)                               | Observed |
| 96  | [Features/Visible hours / Timeline Partial Final Slot](http://127.0.0.1:6006/?path=/story/features-visible-hours--timeline-partial-final-slot)                           | Observed |
| 97  | [Styling/Themes / Default Light](http://127.0.0.1:6006/?path=/story/styling-themes--default-light)                                                                       | Observed |
| 98  | [Styling/Themes / Default Dark](http://127.0.0.1:6006/?path=/story/styling-themes--default-dark)                                                                         | Observed |
| 99  | [Styling/Themes / High Contrast Light](http://127.0.0.1:6006/?path=/story/styling-themes--high-contrast-light)                                                           | Observed |
| 100 | [Styling/Themes / High Contrast Dark](http://127.0.0.1:6006/?path=/story/styling-themes--high-contrast-dark)                                                             | Observed |
| 101 | [Styling/Themes / Shadcn](http://127.0.0.1:6006/?path=/story/styling-themes--shadcn)                                                                                     | Observed |
| 102 | [Styling/Themes / Material UI](http://127.0.0.1:6006/?path=/story/styling-themes--material-ui)                                                                           | Observed |
| 103 | [Styling/Themes / Revenue Cat](http://127.0.0.1:6006/?path=/story/styling-themes--revenue-cat)                                                                           | Observed |
| 104 | [Styling/Themes / Stripe](http://127.0.0.1:6006/?path=/story/styling-themes--stripe)                                                                                     | Observed |
| 105 | [Styling/Themes / Compact](http://127.0.0.1:6006/?path=/story/styling-themes--compact)                                                                                   | Observed |
| 106 | [Styling/Themes / Custom Tokens](http://127.0.0.1:6006/?path=/story/styling-themes--custom-tokens)                                                                       | Observed |
| 107 | [Styling/Themes / Forced Colors](http://127.0.0.1:6006/?path=/story/styling-themes--forced-colors)                                                                       | Observed |
| 108 | [Styling/Themes / Narrow Viewport](http://127.0.0.1:6006/?path=/story/styling-themes--narrow-viewport)                                                                   | Observed |
| 109 | [Views/Day grid / Month](http://127.0.0.1:6006/?path=/story/views-day-grid--month)                                                                                       | Observed |
| 110 | [Views/Day grid / Empty Month](http://127.0.0.1:6006/?path=/story/views-day-grid--empty-month)                                                                           | Observed |
| 111 | [Views/Day grid / Week](http://127.0.0.1:6006/?path=/story/views-day-grid--week)                                                                                         | Observed |
| 112 | [Views/Day grid / Rolling Days](http://127.0.0.1:6006/?path=/story/views-day-grid--rolling-days)                                                                         | Observed |
| 113 | [Views/Day grid / Fixed Six Weeks](http://127.0.0.1:6006/?path=/story/views-day-grid--fixed-six-weeks)                                                                   | Observed |
| 114 | [Views/Day grid / Quarter By Month](http://127.0.0.1:6006/?path=/story/views-day-grid--quarter-by-month)                                                                 | Observed |
| 115 | [Views/Day grid / Year By Month](http://127.0.0.1:6006/?path=/story/views-day-grid--year-by-month)                                                                       | Observed |
| 116 | [Views/Day grid / Continuous Year](http://127.0.0.1:6006/?path=/story/views-day-grid--continuous-year)                                                                   | Observed |
| 117 | [Views/Day grid / Spanning Events](http://127.0.0.1:6006/?path=/story/views-day-grid--spanning-events)                                                                   | Observed |
| 118 | [Views/Day grid / Hidden Weekdays](http://127.0.0.1:6006/?path=/story/views-day-grid--hidden-weekdays)                                                                   | Observed |
| 119 | [Views/List / Week Agenda](http://127.0.0.1:6006/?path=/story/views-list--week-agenda)                                                                                   | Observed |
| 120 | [Views/List / Month Agenda](http://127.0.0.1:6006/?path=/story/views-list--month-agenda)                                                                                 | Observed |
| 121 | [Views/List / Year Agenda](http://127.0.0.1:6006/?path=/story/views-list--year-agenda)                                                                                   | Observed |
| 122 | [Views/List / Empty Agenda](http://127.0.0.1:6006/?path=/story/views-list--empty-agenda)                                                                                 | Observed |
| 123 | [Views/List / Multi Day Events](http://127.0.0.1:6006/?path=/story/views-list--multi-day-events)                                                                         | Observed |
| 124 | [Views/List / Resources Then Dates](http://127.0.0.1:6006/?path=/story/views-list--resources-then-dates)                                                                 | Observed |
| 125 | [Views/List / Dates Then Resources](http://127.0.0.1:6006/?path=/story/views-list--dates-then-resources)                                                                 | Observed |
| 126 | [Views/List / Custom Event Order](http://127.0.0.1:6006/?path=/story/views-list--custom-event-order)                                                                     | Observed |
| 127 | [Views/Time grid / Day](http://127.0.0.1:6006/?path=/story/views-time-grid--day)                                                                                         | Observed |
| 128 | [Views/Time grid / Week](http://127.0.0.1:6006/?path=/story/views-time-grid--week)                                                                                       | Observed |
| 129 | [Views/Time grid / Workweek](http://127.0.0.1:6006/?path=/story/views-time-grid--workweek)                                                                               | Observed |
| 130 | [Views/Time grid / Empty Week](http://127.0.0.1:6006/?path=/story/views-time-grid--empty-week)                                                                           | Observed |
| 131 | [Views/Time grid / All Day Row](http://127.0.0.1:6006/?path=/story/views-time-grid--all-day-row)                                                                         | Observed |
| 132 | [Views/Time grid / Side By Side Overlap](http://127.0.0.1:6006/?path=/story/views-time-grid--side-by-side-overlap)                                                       | Observed |
| 133 | [Views/Time grid / Cascade Overlap](http://127.0.0.1:6006/?path=/story/views-time-grid--cascade-overlap)                                                                 | Observed |
| 134 | [Views/Time grid / Lane Expansion](http://127.0.0.1:6006/?path=/story/views-time-grid--lane-expansion)                                                                   | Observed |
| 135 | [Views/Time grid / Short Events](http://127.0.0.1:6006/?path=/story/views-time-grid--short-events)                                                                       | Observed |
| 136 | [Views/Time grid / Exact Event Durations](http://127.0.0.1:6006/?path=/story/views-time-grid--exact-event-durations)                                                     | Observed |
| 137 | [Views/Time grid / Clipped Events](http://127.0.0.1:6006/?path=/story/views-time-grid--clipped-events)                                                                   | Observed |
| 138 | [Views/Timeline / Single Row](http://127.0.0.1:6006/?path=/story/views-timeline--single-row)                                                                             | Observed |
| 139 | [Views/Timeline / Resource Rows](http://127.0.0.1:6006/?path=/story/views-timeline--resource-rows)                                                                       | Observed |
| 140 | [Views/Timeline / Day Schedule](http://127.0.0.1:6006/?path=/story/views-timeline--day-schedule)                                                                         | Observed |
| 141 | [Views/Timeline / Month With Daily Slots](http://127.0.0.1:6006/?path=/story/views-timeline--month-with-daily-slots)                                                     | Observed |
| 142 | [Views/Timeline / Quarter](http://127.0.0.1:6006/?path=/story/views-timeline--quarter)                                                                                   | F2       |
| 143 | [Views/Timeline / Stacked Events](http://127.0.0.1:6006/?path=/story/views-timeline--stacked-events)                                                                     | Observed |
| 144 | [Views/Timeline / Short Events](http://127.0.0.1:6006/?path=/story/views-timeline--short-events)                                                                         | Observed |
| 145 | [Views/Timeline / Clipped Bars](http://127.0.0.1:6006/?path=/story/views-timeline--clipped-bars)                                                                         | Observed |
| 146 | [Views/Timeline / Horizontal Scroll](http://127.0.0.1:6006/?path=/story/views-timeline--horizontal-scroll)                                                               | Observed |

## Verification after corrections · 2026-10-24

All five findings are resolved in the reviewed stories. The original findings and captures above are retained as
the review record. The following observations describe the corrected renderings.

| Finding | Verified result                                                                                                                                                       | Current evidence                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| F1      | Hourly tracks are 64px wide. Every slot label fits its cell; the weekly timeline scrolls horizontally.                                                                | [Hour labels](storybook-visual-review-assets/after-timeline-hour-labels.png)                                                               |
| F2      | Daily tracks are 80px wide. Quarter headings fit their cells before and after horizontal scrolling.                                                                   | [Quarter headings](storybook-visual-review-assets/after-timeline-quarter-labels.png)                                                       |
| F3      | All 28 resource/weekday headers fit their cells. Month panels stack at desktop width. At 390px, the calendar scrolls inside its wrapper; the page remains 390px wide. | [Resource-month headings](storybook-visual-review-assets/after-resource-month-headers.png)                                                 |
| F4      | The two status outputs have a 16px gap at both 1280px and 390px.                                                                                                      | [Status outputs](storybook-visual-review-assets/after-joined-status-text.png)                                                              |
| F5      | Advance Clock and Apply Navigation are 44px tall with 16px text, with separation from the calendar and adjacent controls.                                             | [Clock](storybook-visual-review-assets/after-clock-control.png), [Navigation](storybook-visual-review-assets/after-navigation-control.png) |

Browser rechecks covered all seven affected stories, the Quarter timeline after scrolling, and mobile checks for
resource months, external-atom status, and controlled navigation. Each measured label has `scrollWidth <= clientWidth`.
Full correction captures are retained locally in `/tmp/calendar-storybook-style-fixes/`.

Validation:

- `pnpm run build`: passed, including the docs prerender and static Storybook build.
- `pnpm run check:all`: passed, with the existing unrelated lint warnings.
- `pnpm run test`: all 545 workspace tests passed.
- `pnpm run test:storybook`: all 146 stories passed on macOS.
- Matching Playwright 1.63.0 Linux arm64 container: all 146 stories passed.
- Updated seven screenshot baselines per platform. Reviewed the changed images. The remaining 138 screenshot
  baselines per platform are unchanged.
- Changed-file formatting, report evidence links, and `git diff --check`: passed.

The first screenshot comparison reported `7 failed | 139 passed`, corresponding exactly to the seven intentional
visual changes. Baselines were updated only for those stories, then the full comparison passed on both platforms.
Initial sandboxed attempts also reported `listen EPERM ... 127.0.0.1:63315` for browser tests,
`listen EPERM ... ::1:3000` for docs prerendering, and `Command failed: npm pack` for package validation.
The same commands passed when rerun with the required local-server/cache access.
