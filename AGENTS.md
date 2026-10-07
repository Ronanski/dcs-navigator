<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- DCS data is compiled offline from vendor Excel files into `public/dcs-data.json` and searched fully client-side; why: static reference data, instant search, works offline-ish on phones.
- I/O records are joined with wiring rows by station + DCS address at load time (`src/lib/dcs.ts`); why: one record shows the complete point.
