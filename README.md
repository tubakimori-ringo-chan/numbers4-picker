# NUMBER STUDIO

Responsive static app for N3 and N4 draw history, statistics, number generation, favorites, and prediction tracking.

## Run locally

Serve this folder over HTTP (for example, `python -m http.server 8000`) and open `http://localhost:8000`. The history JSON files are fetched by the page, so opening `index.html` directly as a `file:` URL is not supported.

## Data and updates

See [`data/README.md`](data/README.md) for the supplied CSV coverage and provenance. Scheduled updates use `scripts/update_numbers4.js`; the script checks the latest source row and refuses to overwrite mismatched results or skip a draw.

The app stores favorites and validation records in the current browser's local storage. It does not provide an account or cloud sync.

