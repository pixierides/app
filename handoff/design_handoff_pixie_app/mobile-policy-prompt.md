# Mobile prototype — cancellation & change policy

```
## Policy

- Free cancellation until 48 hours before pickup time.
- Inside 48 hours: non-refundable.
- Free date/time changes until 2 hours before pickup.
- Inside 2 hours: phone only.

All times local Orlando. Deadlines computed from pickup DATETIME, not date.

## Three states

The booking detail screen must render one of three states based on time until
pickup. Do not show the same screen with disabled buttons.

  STATE A — more than 48h out
    Free cancellation until {11:00 PM, Tue 28 Jul}
    Change your time or date free, up to 2 hours before pickup.
    Actions: [Change booking]  [Cancel booking]

  STATE B — 2h to 48h out
    This booking is now non-refundable.
    You can still change your time or date free, up to 2 hours before pickup.
    Actions: [Change booking]  [Call us]

  STATE C — under 2h
    Pickup is soon. Call us for any changes.
    Actions: [Call 407-373-8735]

## Booking flow

If pickup is less than 48h away at time of booking, show before payment:

    This pickup is within 48 hours, so it's non-refundable once paid.
    We'll still change your time free, up to 2 hours before pickup.

Required checkbox, unchecked by default, blocks payment until ticked.

## Cancel confirmation

State A — intercept before confirming. Offer the change first, since most
people who cancel actually want a different time. Do not obstruct the exit.

    Cancel this ride?
    Most people who cancel just need a different time — and changes are free.

    [Change my time instead]      <- primary button
    [Cancel and refund me]        <- secondary, plain, clearly tappable
    Prefer to talk? Call 407-373-8735   <- tertiary, text link

State B — cancel is not offered. If reached by deep link:
    This booking is non-refundable. Want to change the time instead?
    [Change time]  [Call us]

## Rules

- Always show the deadline as a formatted date and time, never a duration and
  never a countdown timer.
- Never render a disabled button. Show the action that IS available.
- Destructive confirmation offers the change first, but the cancel option must
  remain plainly visible and tappable — not greyed, not hidden behind a menu,
  not smaller than a normal tap target.
- No red, no urgency styling, no timers. This is information, not pressure.

## Do NOT

- Do NOT add countdown timers or expiry pressure.
- Do NOT show "Cancel" in states B or C.
- Do NOT let a state change mid-session strand the user — recompute on screen
  focus.
```
