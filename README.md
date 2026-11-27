# buusystems.com

Static site on AWS (moved off GitHub Pages on 2026-11-27): files on the Lightsail server (static IP 3.231.8.190) served by Caddy. Pushing `main`
to the `aws` git remote (a repository on that server) publishes at once; see `_tools/aws/`.

    _tools/publish.sh          # publish what is committed (the editor's Publish runs this)
    _tools/aws/setup.sh        # set up or update the server side (repository, hook, Caddy site)

- `/`: home page with Bool, Gas Check NYC and uKVM (`index.html`, `home.css`, `product.css`, `home.js`)
- `/bool/`: Bool page with its feature cards (the home page shows one tile per product; details live on
  these pages)
- `/gascheck/`: Gas Check NYC page (the app itself is https://gascheck.buusystems.com, repo ~/code/riser;
  its first name was Riser, and `/riser/` redirects here)
- `/ukvm/`: uKVM page (`home.css` + `product.css`; formerly bpfboot, and /bpfboot/ redirects). `ukvm.buusystems.com` serves the same files with this page as its front page.
- Bool lives at https://bool.buusystems.com (its own server, not this repo).

## Editing

    python3 _editor/server.py      # then open http://localhost:8740

On nuc-01 it already runs as the user service `buu-site-editor`. Open
`localhost:8740` in a T3 browser pane, click **Edit**, click any outlined text to
change it, click an image (or drop a file on it) to replace it, then **Save**
(Ctrl+S). **Publish** commits and pushes to AWS; the live site updates at once.

To make more of a page editable, give the element a unique `data-edit="some-key"`.
The `_editor` and `_tools` folders are not published (the server's git hook leaves them out).
