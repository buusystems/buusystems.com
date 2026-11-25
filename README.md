# buusystems.com

Static site served by GitHub Pages from `main` of `buusystems/buusystems.com`.

- `/`: home page, one tile per product (`index.html`, `home.css`, `home.js`; icons in `assets/apps/`)
- `/geniemarie/`: Genie Marie pages (`geniemarie/`, shared `styles.css`, `genie-marie.css`, `genie-marie.js`)

## Editing

    python3 _editor/server.py      # then open http://localhost:8740

On nuc-01 it already runs as the user service `buu-site-editor`. Open
`localhost:8740` in a T3 browser pane, click **Edit**, click any outlined text to
change it, click an image (or drop a file on it) to replace it, then **Save**
(Ctrl+S). **Publish** commits and pushes; the live site updates in a minute or two.

To make more of a page editable, give the element a unique `data-edit="some-key"`.
The `_editor` folder is not published (Pages skips names starting with `_`).
