# Draw history

`numbers3.json` and `numbers4.json` are ordered by draw number and store each winning number as a string so leading zeroes remain intact.

- N3: imported from the supplied `NUMBERS3_ALL.csv` (draws 1–7106, through 2026/11/03), then completed with draw 7107 (`533`, 2026/11/04), checked against published results.
- N4: imported from the supplied `NUMBERS4_ALL.csv` (draws 1–7104, through 2026/10/30), then completed with draws 7105 (`0149`, 2026/11/02), 7106 (`5870`, 2026/11/03), and 7107 (`7541`, 2026/11/04), checked against published results.
- Scheduled updates read the latest table row from the MK-MODE N3/N4 result pages. They append only the immediately following draw and stop on an invalid row, a mismatch, or a round gap.

The app displays statistics only from these history records. Generated numbers are entertainment and do not predict or guarantee future results.


