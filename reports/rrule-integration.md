# RRule integration findings

## Published `rrule@2.8.1`, checked 2026-10-23

Inspected the package downloaded from the npm registry into a temporary directory. These findings concern that
published version, not an installed project dependency. No package or runtime source was changed.

### 1. Native TZID conversion depends on the host zone

- **What:** `dateInTimeZone` reads `Intl.DateTimeFormat().resolvedOptions().timeZone` when calculating its returned
  `Date`. For a weekly 09:00 New York series starting March 2, 2026, its first returned ISO timestamp was `14:00Z`
  under a UTC host, `06:00Z` under a Los Angeles host and `23:00Z` under a Tokyo host. The same rule without TZID
  returned the same UTC-field clock components under all three hosts.
- **Where:** `rrule@2.8.1/dist/esm/dateutil.js:153`; `rrule@2.8.1/dist/esm/datewithzone.js:27` in the
  [published package](https://www.npmjs.com/package/rrule/v/2.8.1). The
  [upstream documentation](https://github.com/jkbrzt/rrule#important-use-utc-dates) explains its floating-date conventions.
- **Why it matters:** interpreting these native TZID results as absolute instants would violate calendar-tsx's
  host-independent time-zone contract. The library's documented date conventions are part of the integration boundary.

### 2. A nonexistent local start still consumes an occurrence

- **What:** under a UTC host, a daily 02:30 New York rule starting March 7, 2026 with `COUNT=3` produced March 7,
  March 8 and March 9. The March 8 timestamp was `07:30Z`, which is 03:30 after the spring transition. Iteration
  decrements the count after accepting the generated candidate; it does not remove the nonexistent local 02:30.
- **Where:** `rrule@2.8.1/dist/esm/iter/index.js:57`; `rrule@2.8.1/dist/esm/iter/index.js:62` in the
  [published package](https://www.npmjs.com/package/rrule/v/2.8.1).
- **Why it matters:** the earlier native-recurrence proposal's skip-and-do-not-count policy cannot be assumed for an
  RRule integration. Filtering candidates afterward changes the number of occurrences left by a count-limited rule.

### 3. A range query does not imply a seek to its lower bound

- **What:** `between` delegates to the iterator with range acceptance bounds. The iterator initializes its cursor
  from `dtstart` and advances frequency periods; it does not initialize directly at the requested lower bound.
- **Where:** `rrule@2.8.1/dist/esm/rrule.js:110`; `rrule@2.8.1/dist/esm/iter/index.js:16`;
  `rrule@2.8.1/dist/esm/iter/index.js:76` in the
  [published package](https://www.npmjs.com/package/rrule/v/2.8.1).
- **Why it matters:** a narrow view can still require historical iteration for an old, frequent series. Output size
  alone does not establish acceptable expansion cost.

## Installed integration checks, 2026-10-23

### 4. The CommonJS entry does not expose RRule as a Node ESM named export

- **What:** importing the built optional package with a named `RRule` import failed under Node 24.13.0 with
  `SyntaxError: The requested module 'rrule' does not provide an export named 'RRule'`. The dependency namespace
  contains the library on `default`; browser bundlers select its separate ESM entry.
- **Where:** `packages/rrule/node_modules/rrule/package.json:19`; `rrule@2.8.1/dist/es5/rrule.js:1`.
- **Why it matters:** browser-only verification does not establish that the published calendar integration loads
  in a Node ESM process, including server rendering.

### 5. An unreachable subdaily clock selector can stall the upstream iterator

- **What:** an isolated Node process running `FREQ=HOURLY;INTERVAL=24;BYHOUR=10` from a floating 09:00 DTSTART
  entered `between` but did not return within two seconds. The hourly advance loop keeps adding 24 hours to 09:00;
  its only exit requires reaching BYHOUR 10. The loop does not check the query's upper bound or maximum year.
- **Where:** `rrule@2.8.1/dist/esm/datetime.js:87`; `rrule@2.8.1/dist/esm/datetime.js:92`;
  `rrule@2.8.1/dist/esm/datetime.js:99`.
- **Why it matters:** the synchronous recurrence integration inherits this dependency behavior. Validating numeric
  selector ranges alone cannot guarantee completion for every subdaily interval/selector combination.

## Migration to rrule-temporal 2.2.8, 2026-10-23

The findings above describe the replaced `rrule` 2.8.1 dependency. The current integration uses `rrule-temporal`
2.2.8. These historical stall and CommonJS findings no longer describe the current engine.

### 6. Generated-gap policy differs from the accepted calendar policy

- **What:** `rrule-temporal` omits generated nonexistent local times before counting them. It accepts a supplied
  Temporal namespace for output constructors and uses string frequencies plus camel-case selector arrays.
- **Where:** `rrule-temporal@2.2.8/dist/index.d.ts:163`; `rrule-temporal@2.2.8/dist/index.d.ts:14`;
  `rrule-temporal@2.2.8/dist/src-vjCiI_-u.js:1`, `resolveGeneratedTime` and `toPublicDate`.
- **Why it matters:** switching directly to zoned generation would change the previously agreed gap/COUNT behavior.
  Cross-implementation Temporal objects also require deliberate output-constructor selection.

### 7. Numeric selector sanitization can broaden malformed rules

- **What:** constructing a rule with `BYHOUR=24` removes that selector and returns occurrences at the seed's hour.
  A daily 09:00 seed returned four 09:00 occurrences over an inclusive three-day interval in an isolated check.
- **Where:** `rrule-temporal@2.2.8/dist/src-vjCiI_-u.js:1`, `sanitizeNumericArray` and `sanitizeOpts`.
- **Why it matters:** forwarding malformed selectors without validation can schedule more occurrences than requested.

### 8. Subdaily empty sets and explicit query budgets terminate

- **What:** the former 09:00 `HOURLY;INTERVAL=24;BYHOUR=10` reproduction returns an empty array with the new engine.
  A monthly second-Friday rule with `COUNT=10` and `maxIterations=1` throws a maximum-iterations error. Default
  budgets are 10,000 iterations and 1,000,000 candidate evaluations; eligible range queries can seek forward.
- **Where:** `packages/rrule/src/tests/rrule.spec.ts:309`; `packages/rrule/src/tests/rrule.spec.ts:315`;
  `rrule-temporal@2.2.8/dist/src-vjCiI_-u.js:1`, constructor and `jumpAlignedDtstart`.
- **Why it matters:** the old stall no longer applies, while budget exhaustion remains an explicit failure rather
  than a silently partial recurrence set. Query bounds alone still do not promise a fixed CPU-time cost.
