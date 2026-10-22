// Refreshes all cached menus. Run daily from a system cron if not deploying to Vercel:
//   0 5,11 * * *  cd /path/to/SBNutrition && npm run sync
import { prisma } from "../lib/db";
import { syncAllMenus } from "../lib/menus";

syncAllMenus()
  .then((r) => {
    console.log(`Synced ${r.weeksFetched} menu-weeks across ${r.locations} locations in ${r.durationMs}ms`);
    for (const f of r.failures) console.warn("FAILED", f);
    process.exitCode = r.failures.length ? 1 : 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
