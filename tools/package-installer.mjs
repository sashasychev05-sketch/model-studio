import {build,Platform,Arch} from 'electron-builder';
import path from 'node:path';
import fs from 'node:fs/promises';
import {desktopStage,root} from './desktop-stage.mjs';
const {stage,pkg}=await desktopStage({version:process.env.MODEL_STUDIO_TEST_BUILD_VERSION});
const signed=process.env.MODEL_STUDIO_REQUIRE_SIGNING==='1';
if(signed&&!process.env.CSC_LINK&&!process.env.WIN_CSC_LINK)throw new Error('Для подписанного выпуска требуется CSC_LINK или WIN_CSC_LINK.');
await fs.copyFile(path.join(root,'docs','DESKTOP.md'),path.join(stage,'КАК-ЗАПУСТИТЬ.md'));
const files=await build({projectDir:stage,targets:Platform.WINDOWS.createTarget(['nsis'],Arch.x64),publish:'never',config:{
 appId:'io.github.sashasychev05-sketch.model-studio',productName:'Модельная',electronVersion:pkg.devDependencies.electron,
 executableName:'ModelStudio',directories:{output:path.join(root,'dist',process.env.MODEL_STUDIO_TEST_BUILD_VERSION?'installer-fixture':'installer')},
 asar:true,npmRebuild:false,files:['desktop/**/*','web/**/*','lib/**/*','gallery/**/*','server.mjs','package.json','КАК-ЗАПУСТИТЬ.md'],
 forceCodeSigning:signed,electronUpdaterCompatibility:'>=2.16',
 publish:[{provider:'github',owner:'sashasychev05-sketch',repo:'model-studio',releaseType:'release'}],
 win:{target:['nsis'],icon:path.join(root,'desktop','icon.ico'),verifyUpdateCodeSignature:true},
 nsis:{oneClick:false,perMachine:false,allowElevation:false,allowToChangeInstallationDirectory:true,deleteAppDataOnUninstall:false,runAfterFinish:true,createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:'Модельная',artifactName:'ModelStudio-Setup-${version}-${arch}.${ext}',installerLanguages:['ru_RU'],language:'1049'}
}});
for(const file of files)console.log(file);
