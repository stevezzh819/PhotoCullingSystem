<div align="center">
  <img src="build/icon.png" alt="QuickD" width="120" />
  <h1>QuickD</h1>
  <p>Fast, keyboard-driven (vim-mode) photo culling for photographers — built for speed, not clicks.</p>

  ![Platform](https://img.shields.io/badge/platform-macOS-black?style=flat-square&logo=apple)
  ![Version](https://img.shields.io/badge/version-1.0.0-blueviolet?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
  ![Made by](https://img.shields.io/badge/made%20by-VIART%20PTE.%20LTD.-white?style=flat-square)
</div>

---

## Overview

As photographers, delivering unedited JPEGs often means hours of tedious culling in apps like Lightroom or Capture One. QuickD streamlines the process — fly through your images and decide what to keep or delete using just your keyboard. No menus, no lag, no heavy software.

<!-- Screenshot: Welcome screen / home page -->
![Welcome Screen](docs/screenshots/welcome.png)

---

## Features

- **Keyboard-first** — `J` to mark delete, `K` to keep, `H`/`L` to navigate, `U` to undo
- **Non-destructive** — files are moved to Trash, never permanently deleted without confirmation
- **Sliding preload** — images ahead and behind are preloaded for instant flipping
- **Review before delete** — summary screen shows every file queued for deletion before anything is trashed
- **Drag & drop** — drop a folder onto the app to start immediately
- **Bilingual** — English and 中文 supported

---


## Download

Go to the [Releases](https://github.com/stevezzh819/PhotoCullingSystem/releases) page and download the right file for your Mac:

| Mac | File |
|-----|------|
| Apple Silicon (M1/M2/M3/M4) | `QuickD-x.x.x-arm64.dmg` |
| Intel | `QuickD-x.x.x.dmg` |

> **First launch:** macOS may show a security warning since the app is not notarized. Right-click the app → **Open** to bypass Gatekeeper. Subsequent launches are normal.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `J` / `←` | Mark for deletion |
| `K` / `→` | Keep |
| `H` | Previous image |
| `L` | Next image |
| `U` | Undo last decision |
| `Esc` | Return to home screen |

---

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [React](https://react.dev/) — UI
- [Framer Motion](https://www.framer.com/motion/) — animations
- [electron-vite](https://electron-vite.org/) — build tooling

---

## Build from Source

```bash
# Clone
git clone https://github.com/stevezzh819/PhotoCullingSystem.git
cd PhotoCullingSystem

# Install dependencies
npm install

# Run in development
npm run dev

```

**Requirements:** Node.js 18+, macOS (for building `.dmg`)

---

## Buy Me a Coffee
If you found this helpful, you supporting me here!

<a href="https://buymeacoffee.com/stevezzh">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" height="50" alt="Buy Me A Coffee">
</a>

---

## License

MIT
