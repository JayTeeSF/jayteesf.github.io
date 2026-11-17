# Two panes when wide

When the screen is wide, each tab shows its list on the left and what the list opens on the right. This covers the iPhone Duo unfolded and an iPad. When it is narrow (every other iPhone, and the Duo folded), each tab is one navigation stack, exactly as before. **The width decides, not the device.**

```
NARROW (horizontal size class compact)     WIDE (regular)
+------------------------+                 +-------------------+--------------------------+
| Picks                  |                 | Picks             | A title                  |
|  Alpha               > |   tap pushes    |  Alpha            |  Opened b                |
|  Beta                > |   over the list |  Beta  (tapped)   |                          |
+------------------------+                 +-------------------+--------------------------+
|   Picks     Other      |                 |        Picks          Other                  |
+------------------------+                 +----------------------------------------------+
```

## How it works

Each tab root is a column-style `UISplitViewController`:
- **Primary column:** the tab's list, in its own navigation controller.
- **Secondary column:** a navigation controller holding what the list opened, or a placeholder that says "Pick something on the left".

UIKit collapses the split to one column when the width is compact, so a narrow phone behaves exactly as the old single stack.

| What happens | Narrow | Wide |
|---|---|---|
| A row, `select`, `open_screen`, or a side trip (`nav_left`) opened **from the list** | pushes over the list | **replaces the right pane** |
| Anything opened **from the right pane** | pushes | pushes in the right pane |
| A deep link or web link to a screen | back to the tab's list, then push | back to the tab's list, then the right pane |
| Fold (wide → narrow) | — | the right pane's screen goes on top of the list; Back returns to the list where it was. With only the placeholder, the list shows. |
| Unfold (narrow → wide) | — | whatever was open over the list moves to the right pane; the list shows on the left |

Code:
- **`native/HeyIOSApiHost.m`, section "two panes when wide":** `HeyIOSShowBeside`, `HeyIOSTabNav`, `HeyIOSDetailRoot`, `HeyIOSShowInTab`, and the placeholder.
- **The host's split-view delegate:** collapse and expand.
- **`HeyIOSListController fillDetailDefault`:** fills the right pane on first show.

## The description

One optional screen key:
- `detail_default: 'first'`: while two panes show and nothing has been chosen, the first visible row whose section has a `select` screen opens on the right. Without it, the right pane shows the placeholder.

Narrow screens ignore it.

## Checks

`bin/check-two-panes` runs `tools/two-panes` (the shipped host with a synthetic description and transport).

```
HEY_IOS_WIDE_UDID=<iPad or unfolded Duo> HEY_IOS_NARROW_UDID=<iPhone or folded Duo> \
HEY_IOS_NARROW_DISPLAY=1 bin/check-two-panes
```

- **Wide:**
  - the first pick shows on the right;
  - a tap replaces the right pane;
  - folding keeps the open title over the list, and unfolding moves it back right;
  - a title opened while folded moves right on unfolding.
- **Narrow:** one column, and a tap pushes.
- **Negative control:** the host with the right pane switched off must fail the wide run.

The check folds and unfolds by overriding the horizontal size class, which drives the split itself.

## The iPhone Duo

Measured in the Xcode 27.2 simulator (runtime iOS 27.2, device type `iPhone Duo`):

| Screen | Points | Pixels | Size class |
|---|---|---|---|
| Folded: outer | 466 × 678 | 1398 × 2034 | compact |
| Unfolded: inner | 669 × 951 | 2007 × 2853 | regular, if the app's window fills it |

In `simctl io`, display 1 is the outer screen and display 3 the inner. Two parts of fold testing could not be scripted:
- **The fold gesture.** Powering a screen off with `simctl io screenConfig` does not unfold the device, and DeviceHub's window is not exposed to UI scripting. The check folds and unfolds through the size class instead.
- **Whether an iPhone-only app (`UIDeviceFamily` 1) gets a regular-width window on the inner screen.** Test this by hand in DeviceHub, or on a device. If it does not, the app also needs `UIDeviceFamily` 2: it then runs as an iPad app too, with the same two panes, and App Store Connect will ask for iPad screenshots.

**Apps built with the iOS 27 SDK must adopt the scene lifecycle.** An app with no `UIApplicationSceneManifest` is stopped at launch (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). The host's apps already use `HeyIOSPhoneSceneDelegate`. The small test apps here (the confirmation app and the others) do not, and need a scene manifest before they are built with Xcode 27.
