# 04: Activate and revoke Kiosks

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** While logged in on a device, the Admin can activate that device as a named Kiosk, for example "Front door tablet". The device receives a long-lived, HTTP-only cookie holding a random device token, and the server stores only the token's hash. An activated Kiosk stays activated across restarts and days.

The Admin can see the list of Kiosks and revoke any of them, after which that device stops working at once. The Kiosk page resolves the cookie to a Kiosk. Any device without a valid, unrevoked token sees "this device is not a Kiosk", and Kiosk pages never need an Admin session.

**Blocked by:** 02 (Admin login)

**Status:** ready-for-agent

- [ ] The Admin can activate the current device as a Kiosk with a name; the Kiosk page then works on that device, even after logging out of the admin area
- [ ] The device token is stored only as a hash
- [ ] Several Kiosks can be active at once
- [ ] The Admin sees all Kiosks with their activation date and revoked state
- [ ] Revoking a Kiosk makes that device see "this device is not a Kiosk" on its next request
- [ ] A browser that was never activated sees "this device is not a Kiosk"
- [ ] Attendance-module tests cover activation, resolving a token, an unknown token and a revoked token
