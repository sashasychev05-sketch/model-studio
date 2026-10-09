import {defineConfig} from '@playwright/test';
import path from 'node:path';
export default defineConfig({
 testDir:'./tests/browser',timeout:45000,workers:1,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:4198',viewport:{width:1360,height:900},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node server.mjs',url:'http://127.0.0.1:4198/api/health',reuseExistingServer:false,env:{MODEL_STUDIO_PORT:'4198',MODEL_STUDIO_DATA_DIR:path.resolve('work','browser-'+crypto.randomUUID())}}
});
