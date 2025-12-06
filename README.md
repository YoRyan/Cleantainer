# Cleantainer

A Firefox extension that cleans cookie, localStorage, and IndexedDB data from contextual identities (container tabs). This allows you to use containers as disposable browsing sessions. Not as effective as a native browsing data delete, but still good enough to lose your tail on Google and YouTube. (Currently, at least [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) cannot be cleared due to the lack of an API from Mozilla.)

Features:

- Delete data from containers in the fewest number of clicks of any extension.
- Clear data from the two containers built into Firefox: the "No Container" and the "Private Browsing" containers.
- Pin your most frequently cleaned containers to the top of the popup, and drag-and-drop your pins in any order.
- Clean configurable sets of containers using keyboard shortcuts.

https://github.com/user-attachments/assets/0c4ea0f5-795b-4069-9bf8-910b62958f74

## Build

```bash
npm ci
npx tsc
```
