# Release Checklist

## Already Addressed In Repo

- App display name moved to `Magic Pencil`
- Extension display name moved to `Magic Pencil Extension`
- In-app onboarding screen added
- In-app privacy policy added
- In-app support screen added
- App Review notes draft added
- App Store metadata draft added
- Export compliance Info.plist flag added for non-exempt encryption answer

## Must Finish Before Upload

- Replace the temporary app icon with a polished final 1024x1024 icon
- Create the remaining final App Store screenshots for iPad
- Publish a public privacy policy URL
- Publish a public support URL
- Confirm the publisher display name in App Store Connect
- Verify all bundle identifiers and signing settings under the correct team
- Archive a Release build from full Xcode, not Command Line Tools

## Must Verify On Device

- Apple Pencil does not scroll normal web pages while drawing
- Finger scrolling remains responsive
- Strokes fade correctly at 5s, 10s, 15s, 30s, and 45s
- Session mode keeps strokes until reload, navigation, or Safari exit
- Black and white ink both render clearly on light and dark pages
- Popup actions work after page reload
- Extension survives Safari relaunch

## App Store Connect

- Create app record
- Fill name, subtitle, description, keywords, categories
- Upload iPad screenshots
- Do not upload iPhone screenshots because the app should ship as iPad only
- Add support URL
- Add privacy policy URL
- Complete App Privacy answers
- Complete export compliance answers
- Add review notes from `docs/app-review-notes.md`
- Submit to TestFlight first

## TestFlight Recommendation

1. Internal TestFlight with 2 to 5 devices
2. Fix Pencil input edge cases
3. External TestFlight for broader iPad coverage
4. Final App Store submission

## Common Rejection Risks To Avoid

- App name using Apple trademarks
- Container app looking like an untouched template
- Missing support URL or privacy policy URL
- Screenshots that do not show the real feature
- Review notes that omit how to enable the extension
- Extension behavior that interferes with Safari UI or normal scrolling
- Claiming website access broader than the feature actually needs
