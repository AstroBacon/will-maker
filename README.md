# Will Maker

A step-by-step form that produces a printable simple will, the state's official medical
directive (advance directive for health care), and an executor asset list for **Georgia** and
**Oregon**. Each document is optional and can be made on its own.
Everything runs in the browser. Nothing is saved: answers disappear when the page closes
unless the user downloads them to a file ("Save answers to a file") and loads it later.

**Status: draft. Not for real use until an attorney has reviewed the templates.**
The app's "Notes for your lawyer" panel (Review step) lists every legal point to check.

## Run it

    npm install
    npm run dev        # http://localhost:5173
    npm test
    npm run build      # static site in dist/ — can be hosted anywhere

Print with Chrome or Edge to get the "Page X of Y" and "Initials" footers.

## Where things live

- `src/states.ts`: everything state-specific: terminology, witness wording, executor powers,
  signing checklist, warnings, attorney review notes. Add a state here.
- `src/generate.ts`: builds the will text from the answers.
- `src/checks.ts`: missing-info errors and legal warnings (spousal rights, guardian, percentages).
- `src/WillDocument.tsx`: the printable document and the state self-proving/witness affidavits.
- `src/steps.tsx`: the form steps.
- `src/storage.ts`: saving and loading answer files, plus `mirrorForSpouse`, which builds the second will in couples mode
  (swaps the spouses, fixes child/stepchild labels from that spouse's point of view).
- `src/directive.tsx`: the medical directive step and the printed statutory forms
  (O.C.G.A. § 31-32-4, ORS 127.529). Choices are never pre-marked; an "initial these items"
  guide prints with the signing steps.
- `src/counties.ts`: every county in each state, for the county dropdown.
- `src/assets.tsx`: the optional asset list step and its printout. It is never part of the will.
