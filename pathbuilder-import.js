var fbpiDebug = false;
const fpbi = "0.10.0";
const reportDomain = "https://www.pf2player.com/";

const pbcolor1 = "color: #7bf542"; //bright green
const pbcolor2 = "color: #d8eb34"; //yellow green
const pbcolor3 = "color: #ffffff"; //white
const pbcolor4 = "color: #cccccc"; //gray
const pbcolor5 = "color: #ff0000"; //red

Hooks.on("ready", async function () {
  ui.notifications.error(
    "Pathbuilder Importer is NOT COMPATABLE with Foundry VTT 9.x at this time and has been disabled. Do not try to install an earlier version. It will not work. Admin/GM, please disable this module to prevent this message from appearing again.", { "permanent": true, }
  );
});