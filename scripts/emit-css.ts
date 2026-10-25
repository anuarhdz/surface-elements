// Writes the component styles to dist/ for CSS-only consumers.
import { mkdirSync, writeFileSync } from "node:fs"

import { accordionStyles } from "../src/accordion/styles.ts"
import { drawerStyles } from "../src/drawer/styles.ts"
import { headerStyles } from "../src/header/styles.ts"

mkdirSync("dist", { recursive: true })
writeFileSync("dist/accordion.css", accordionStyles.trimStart())
writeFileSync("dist/drawer.css", drawerStyles.trimStart())
writeFileSync("dist/header.css", headerStyles.trimStart())
