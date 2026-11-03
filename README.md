<p align="center">
  <img src=".github/khylo-banner.png" alt="Khylo" width="560">
</p>

<h1 align="center">Khylo Web</h1>

<p align="center">
  The Khylo web app and server dashboard: watch, listen and read in any browser, and manage your Khylo Server.
</p>

---

<!-- khylo-downloads:main -->
<p align="center">
<a href="https://github.com/khylo-org/khylo/releases/download/DEV-V26.11.02.02/khylo-server-26.11.02.02-windows-x64-setup.exe"><img alt="Download Windows" src="https://img.shields.io/badge/Download-Windows-d97732?style=for-the-badge"></a>
<a href="https://github.com/khylo-org/khylo/releases/download/DEV-V26.11.02.02/khylo-server-26.11.02.02-macos-arm64.tar.gz"><img alt="Download Mac (Apple silicon)" src="https://img.shields.io/badge/Download-Mac%20(Apple%20silicon)-d97732?style=for-the-badge"></a>
<a href="https://github.com/khylo-org/khylo/releases/download/DEV-V26.11.02.02/khylo-server-26.11.02.02-macos-x64.tar.gz"><img alt="Download Mac (Intel)" src="https://img.shields.io/badge/Download-Mac%20(Intel)-d97732?style=for-the-badge"></a>
<a href="https://github.com/khylo-org/khylo/releases/download/DEV-V26.11.02.02/khylo-server_26.11.02.02_amd64.deb"><img alt="Download Linux (Ubuntu, Debian)" src="https://img.shields.io/badge/Download-Linux%20(Ubuntu,%20Debian)-d97732?style=for-the-badge"></a>
</p>

<p align="center"><sub><a href="https://github.com/khylo-org/khylo/releases/latest">Proxmox, Docker, Arm, Android TV and every other file</a></sub></p>
<!-- /khylo-downloads -->

<!-- khylo-downloads:nav -->
<p align="center"><sub><b>Khylo</b> &nbsp;|&nbsp; <a href="https://github.com/khylo-org/khylo">Downloads and install guides</a> · <a href="https://github.com/khylo-org/khylo-server">Server code</a> · <a href="https://github.com/khylo-org/khylo-web">Web app code</a> · <a href="https://github.com/khylo-org/khylo-androidtv">Android TV app</a> · <a href="https://github.com/khylo-org/khylo/blob/main/CHANGELOG.md">What's new</a></sub></p>
<!-- /khylo-downloads -->

<p align="center"><sub><b>Looking to install Khylo?</b> This page is the source code. Use the buttons above, or see the <a href="https://github.com/khylo-org/khylo">install guides</a>.</sub></p>


## What's inside

- **A cinematic web app.** Edge-to-edge artwork, title logos, a floating top bar, and clean rows for Continue Watching, Up Next and everything recently added.
- **Title pages** with cast and crew, trailers, collections, watchlist and watched status.
- **A sleek video player** with Skip Intro, Skip Credits and Up Next.
- **Live TV and Khylo TV** with a full program guide, recordings and Multi View (up to four channels at once).
- **Music, audiobooks and books,** including an in-browser reader.
- **Home profiles** ("Who's watching?") and kids profiles, plus sign-in codes and QR codes for adding TVs and phones.
- **The Khylo dashboard** for libraries, users, home profiles, invitations, Live TV setup (with the smart IPTV channel picker), playback and server settings.

## Install Khylo

Most people want the server packages, which include this web app: see the
[server guides](https://github.com/khylo-org/khylo/tree/main/Install).

## Development

**You need:** Node.js (see `.nvmrc`) and a running [Khylo Server](https://github.com/khylo-org/khylo-server).

```bash
npm ci
npm start            # development server on http://localhost:8081
```

The development server talks to your Khylo Server. Open `http://localhost:8081` and connect to your server's address (for example `http://localhost:8096`).

### Production build

```bash
npm run build:production
```

The finished site is written to `dist/`. Serve it with the server, or with any web server in front of it.

### Checks

```bash
npm run lint
npx tsc --noEmit
```

## License

Khylo is free software under the [GNU General Public License v2](LICENSE). It is built on open-source components, including the Jellyfin project, whose copyright notices are kept as the license requires. See [NOTICE.md](NOTICE.md).
