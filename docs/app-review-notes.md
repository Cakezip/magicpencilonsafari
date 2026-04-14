# App Review Notes

Suggested note to paste into App Store Connect when submitting for review.

## Review Note Template

Magic Pencil is an iPad-only app that contains a Safari Web Extension for iPad.

How to test:
1. Install the app on iPad.
2. Open Settings > Apps > Safari > Extensions.
3. Enable Magic Pencil and allow it on websites.
4. Open Safari, load a normal http or https page, and reload once if needed.
5. Use Apple Pencil to draw on the page. Use a finger to scroll.
6. Open the Safari extension popup to switch between Volatile and Session mode, change fade duration, change ink color, or clear the page.

Behavior summary:
- Apple Pencil draws temporary strokes on top of Safari pages.
- Finger scrolling remains available.
- Strokes stay attached to the page while scrolling.
- In Volatile mode, strokes fade automatically.
- In Session mode, strokes remain until page reload, navigation, or Safari exit.
- The app does not include advertising, in-app purchases, or account creation.
- The container app includes onboarding, support, and an in-app privacy policy.

Permissions summary:
- Website access is required because the overlay must work on the current Safari page.
- Local storage is used only for on-device preferences such as enabled state, fade duration, and ink color.

Privacy summary:
- No user account
- No analytics SDK
- No advertising SDK
- No server-side sync for annotations

Known scope:
- The extension is intended for standard web pages in Safari.
- Some system pages or nonstandard content surfaces may not behave like regular websites.
