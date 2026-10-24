# @calendar-tsx/themes

> [!WARNING]
> **Experimental.** The API can change or be removed in any release, without notice.

Plain CSS for the unstyled calendar-tsx parts. The stylesheets select parts by their `data-scope`/`data-part`
attributes and lay them out from the `--cal-*` geometry the parts emit; no JavaScript.

```bash
npm i @calendar-tsx/themes
```

```ts
import '@calendar-tsx/themes/default.css';
```

| File                  | Contents                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| `base.css`            | Positioning only; every theme includes it. Import it alone to style parts yourself. |
| `default.css`         | `base.css` plus the default look                                                    |
| `high-contrast.css`   | WCAG AAA black on white and white on black                                          |
| `shadcn.css`          | Default look reading shadcn/ui variables                                            |
| `material-ui.css`     | Default look reading Material UI CSS theme variables                                |
| `revenuecat.css`      | RevenueCat brand colors                                                             |
| `stripe.css`          | Stripe colors                                                                       |
| `fullcalendar.css`    | FullCalendar's classic theme, for migrations                                        |
| `google-calendar.css` | Google Calendar's web look                                                          |
| `compact.css`         | Density only; import after a theme                                                  |
| `print.css`           | Print only; import after a theme                                                    |

Override `--calendar-*` tokens on an ancestor to customize. See [themes](../../apps/docs/content/docs/react/styling/themes.mdx) and
[customizing](../../apps/docs/content/docs/react/styling/customizing.mdx).
