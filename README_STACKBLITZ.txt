PLOT & SEASON — FIX18 STACKBLITZ DEV PROJECT

HOW TO OPEN IN STACKBLITZ
1. Download PlotSeason_FIX18_StackBlitz.zip.
2. On your Mac, double-click the ZIP to EXTRACT it first.
3. You should now have a folder named PlotSeason_FIX18_StackBlitz.
4. In StackBlitz, choose the option to import/select a LOCAL FOLDER.
5. Select the extracted PlotSeason_FIX18_StackBlitz FOLDER — do not select the ZIP file and do not select only index.html.
6. StackBlitz should detect package.json, install Vite, and run npm start automatically.

PROJECT FILES
- index.html       Small entry page
- styles.css       Global page styles
- startup.js       Startup error handling
- app.js           Plot & Season game code
- assets/          Images/audio previously embedded inside the giant HTML file
- package.json     StackBlitz/Vite project metadata

WHY THIS VERSION EXISTS
The previous standalone build had a nearly 12 MB index.html with images/audio embedded as data URIs. This project separates those assets so StackBlitz does not need to ingest one enormous HTML file.
