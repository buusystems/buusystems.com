# buusystems.com

Static site served by GitHub Pages from `main` of `buusystems/buusystems.com`.

- `/`: home page with Bool, Gas Check NYC and uKVM (`index.html`, `home.css`, `product.css`, `home.js`)
- `/bool/`: Bool page with its feature cards (the home page shows one tile per product; details live on
  these pages)
- `/gascheck/`: Gas Check NYC page (the app itself is https://gascheck.buusystems.com, repo ~/code/riser;
  its first name was Riser, and `/riser/` redirects here)
- `/ukvm/`: uKVM page (`home.css` + `product.css`; formerly bpfboot, and /bpfboot/ redirects). `_tools/subdomains.sh` copies it to
  `ukvm.buusystems.com`; Publish runs it.
- Bool lives at https://bool.buusystems.com (its own server, not this repo).

## Editing

    python3 _editor/server.py      # then open http://localhost:8740

On nuc-01 it already runs as the user service `buu-site-editor`. Open
`localhost:8740` in a T3 browser pane, click **Edit**, click any outlined text to
change it, click an image (or drop a file on it) to replace it, then **Save**
(Ctrl+S). **Publish** commits and pushes; the live site updates in a minute or two.

To make more of a page editable, give the element a unique `data-edit="some-key"`.
The `_editor` folder is not published (Pages skips names starting with `_`).
