2026-07-25T16:52:02.101Z	Initializing build environment...
2026-07-25T16:52:02.101Z	Initializing build environment...
2026-07-25T16:52:03.905Z	Success: Finished initializing build environment
2026-07-25T16:52:04.407Z	Cloning repository...
2026-07-25T16:52:05.325Z	No build output detected to cache. Skipping.
2026-07-25T16:52:05.325Z	No dependencies detected to cache. Skipping.
2026-07-25T16:52:05.328Z	Detected the following tools from environment: bun@1.2.15, nodejs@22.16.0
2026-07-25T16:52:05.330Z	Installing project dependencies: bun install
2026-07-25T16:52:05.682Z	bun install v1.2.15 (df017990)
2026-07-25T16:52:05.690Z	
2026-07-25T16:52:05.690Z	[41.00ms] done
2026-07-25T16:52:05.691Z	No packages! Deleted empty lockfile
2026-07-25T16:52:05.850Z	Executing user deploy command: npx wrangler deploy
2026-07-25T16:52:07.885Z	npm warn exec The following package was not found and will be installed: wrangler@4.114.0
2026-07-25T16:52:16.737Z	
2026-07-25T16:52:16.737Z	 ⛅️ wrangler 4.114.0
2026-07-25T16:52:16.737Z	────────────────────
2026-07-25T16:52:16.791Z	
2026-07-25T16:52:16.791Z	Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
2026-07-25T16:52:16.792Z	
2026-07-25T16:52:16.866Z	✘ [ERROR] The entry-point file at "src/index.js" was not found.
2026-07-25T16:52:16.866Z	
2026-07-25T16:52:16.866Z	  
2026-07-25T16:52:16.866Z	  This might mean that your entry-point file needs to be generated (which is the general case when a framework is being used).
2026-07-25T16:52:16.866Z	  If that's the case please run your project's build command and try again.
2026-07-25T16:52:16.866Z	
2026-07-25T16:52:16.866Z	
2026-07-25T16:52:17.027Z	🪵  Logs were written to "/opt/buildhome/.config/.wrangler/logs/wrangler-2026-07-25_16-52-16_270.log"
2026-07-25T16:52:17.184Z	Failed: error occurred while running deploy command
