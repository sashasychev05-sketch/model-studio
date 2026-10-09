import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/desktop',timeout:90000,workers:1,fullyParallel:false,use:{trace:'retain-on-failure'},outputDir:'desktop-test-results'});
