import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'browser.spec.mjs',workers:1,retries:0,timeout:30000,
 reporter:[['list'],['json',{outputFile:process.env.REFMINT_PREVIEW?'artifacts/browser-production.json':'artifacts/browser.json'}]],
 use:{baseURL:'http://127.0.0.1:5193',launchOptions:{executablePath:process.env.REFMINT_TEST_CHROME}},
 webServer:{command:`node node_modules/vite/bin/vite.js ${process.env.REFMINT_PREVIEW?'preview':''} --host 127.0.0.1 --port 5193`,url:'http://127.0.0.1:5193',reuseExistingServer:false}});
