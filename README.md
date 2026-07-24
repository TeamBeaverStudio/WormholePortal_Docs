# Wormhole Portal Documentation

The official Wormhole Portal documentation site, built with
[Zensical](https://zensical.org/) and prepared for GitHub Pages.

## Run locally on Windows

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\zensical.exe serve
```

Open <http://127.0.0.1:8000/> in a browser.

## Build the static site

```powershell
.\.venv\Scripts\zensical.exe build --clean
```

The generated site is written to `site/`.

## Project structure

- `docs/` contains the documentation pages and assets.
- `zensical.toml` controls the site name, navigation, theme, and extensions.
- `.github/workflows/docs.yml` builds and publishes the site with GitHub Pages.
