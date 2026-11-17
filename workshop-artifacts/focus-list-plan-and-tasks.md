# Focus List: Sample Plan and Tasks

Manually prepared examples for discussion. Actual Spec Kit output may differ and should be reviewed.

## Plan

- React Native and Expo SDK 58, with Expo web for projection and Expo Go on compatible devices.
- AsyncStorage stores a versioned JSON task array locally; wait for hydration before persisting.
- A task has an id, trimmed title, and completion flag. Pure functions handle list transitions and filtering.
- A single accessible screen presents input, counts, filters, task rows, empty state and storage error.
- Node's built-in test runner covers core transitions; a browser walkthrough checks interaction and reload persistence.

## Example tasks

- [x] Implement and test task transitions and input validation.
- [x] Build the responsive task screen and filters.
- [x] Load and persist tasks; prevent writing when storage fails.
- [x] Verify web build, add, complete, filter, delete, and reload.
- [ ] Test on a physical phone with an Expo Go version compatible with SDK 58.
- [ ] Add a user-approved enhancement using the Spec Kit workflow during the session.