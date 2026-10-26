// Writes the component styles to dist/ for CSS-only consumers.
import { mkdirSync, writeFileSync } from "node:fs"

import { drawerStyles } from "../src/drawer/styles.ts"
import { headerStyles } from "../src/header/styles.ts"
import { modalStyles } from "../src/modal/styles.ts"

mkdirSync("dist", { recursive: true })
writeFileSync("dist/drawer.css", drawerStyles.trimStart())
writeFileSync("dist/header.css", headerStyles.trimStart())
writeFileSync("dist/modal.css", modalStyles.trimStart())
