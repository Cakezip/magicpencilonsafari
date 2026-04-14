# App Privacy Answers

Recommended App Store Connect privacy answers based on the current codebase.

This is an inference from the repository as it exists now:
- [content.js](/Volumes/CORSAIR/Documents/applepencilonsafari/applepencilonsafari%20Extension/Resources/content.js)
- [background.js](/Volumes/CORSAIR/Documents/applepencilonsafari/applepencilonsafari%20Extension/Resources/background.js)
- [popup.js](/Volumes/CORSAIR/Documents/applepencilonsafari/applepencilonsafari%20Extension/Resources/popup.js)

## Recommended Answer

`Data Not Collected`

Reason:
- Preferences are stored locally on device.
- No account system exists.
- No analytics SDK appears in the project.
- No advertising SDK appears in the project.
- No remote sync or upload path appears in the project.

## Tracking

`No`

## Linked Data

`None`

## Data Used To Track

`None`

## Caution

Update these answers before submission if you add any of the following:
- analytics
- crash reporting with user-linked identifiers
- cloud sync
- account login
- remote storage of annotations
- support chat or embedded web forms that collect personal information
