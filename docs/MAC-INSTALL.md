# How to open QuestDay on your Mac

QuestDay is free and **not signed with a paid Apple Developer account**, so macOS
shows a one-time security warning the first time you open it. This is **normal and
expected** — it does *not* mean the app is broken or unsafe. You approve it once,
then it opens normally forever after. (Works best on macOS 15.2+ or macOS 14.)

---

## Step 1 — Install it

1. Double-click the **QuestDay `.dmg`** file. A window opens showing the QuestDay
   icon and an **Applications** folder shortcut.
2. **Drag the QuestDay icon onto the Applications folder.** (Copy it to Applications
   first — don't run it from inside the disk-image window. Dragging it out of the
   `.dmg` also helps avoid the "damaged" warning.)
3. Eject the disk image (click the little ⏏ eject arrow next to it in Finder's
   sidebar).

## Step 2 — Open it the first time (the one-time approval)

1. Open your **Applications** folder and double-click **QuestDay**.
2. You'll get a warning — it will say one of:
   - *"QuestDay can't be opened because Apple cannot check it for malicious
     software"* / *"the developer cannot be verified"*, **or**
   - *"QuestDay is damaged and can't be opened."*
     (If you get **"damaged"**, jump to **Step 3** — that's the quick fix.)

   Click **Done** / **Cancel** / **OK** to dismiss it for now.
3. Open the **Apple menu** () → **System Settings**.
4. Click **Privacy & Security** in the left sidebar.
5. Scroll to the **bottom**. You'll see a line like
   *"QuestDay was blocked to protect your Mac"* with an **Open Anyway** button.
   Click **Open Anyway**.
6. Confirm with your fingerprint or Mac password.
7. One more box appears — click **Open Anyway** / **Open**. QuestDay launches.
   From now on it opens with a normal double-click.

> **Newer Macs:** the old *right-click → Open* shortcut was **removed in macOS 15
> Sequoia**. Use the **System Settings → Privacy & Security** route above. (On
> older macOS 14 Sonoma, right-click → Open still works.)

## Step 3 — If it says "is damaged" or the "Open Anyway" button never appears

A quick one-time fix in Terminal:

1. Open **Terminal** (press `Cmd+Space`, type `Terminal`, press Return).
2. Copy-paste this exact line and press Return:

   ```sh
   xattr -dr com.apple.quarantine /Applications/QuestDay.app
   ```

   (Nothing visible happens — that's fine. If it asks for your password, type it —
   the characters won't show as you type, which is normal — then press Return.)
3. Double-click **QuestDay** in Applications. It opens normally.

This only has to be done once per version you install.

---

### Why this happens

QuestDay is free and not signed with Apple's paid program, so macOS asks you to
confirm it once. After that first approval it's a normal app. Each **new version**
you install repeats this one-time approval — that's inherent to a free, unsigned app
(the only cure is a paid Apple Developer account + notarization).

**Do not** disable Gatekeeper system-wide (no "Allow apps from Anywhere" /
`spctl --master-disable`). The per-app steps above are the correct, safe fix.
