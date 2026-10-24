// Writes the drawer styles to dist/ for CSS-only consumers.
import { mkdirSync, writeFileSync } from "node:fs"

import { drawerStyles } from "../src/drawer/styles.ts"

mkdirSync("dist", { recursive: true })
writeFileSync("dist/drawer.css", drawerStyles.trimStart())
