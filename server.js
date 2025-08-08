const express = require("express");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const bodyParser = require("body-parser");
const configPathFtp = path.join(__dirname, "digiOH_PhotoBox_config_ftp.json");
const configPathLightX = path.join(__dirname, "digiOH_PhotoBox_config_lightx.json");

const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const app = express();
const PORT = 3000;

const displayUrl = "https://wsaseno.de/digiOH_files/";
const imageLocation = "_sfpg_data/image/";
const subFolderOriImage = ""; // "DigiOH_capture_images/"; 

const QRCode = require("qrcode");

const { 
  uploadToFTP, 
  uploadFile, 
  copyFile, 
  downloadFile } = require("./ftpUtils");

const { 
  generatedImage,
  LightXEditorAiType, } = require("./LightXstudio");

////////////////////////////////
// Uplolad photos to local server
////////////////////////////////
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.json()); 

// Serve static files in /public
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));

////////////////////////////////
// create avatar from uploaded image
////////////////////////////////
app.post("/upload", async (req, res) => {
  console.log("Received image upload request");
  console.log("------------------------------");

  //---- START - get picture data from camera, base64 encoded
  const { base64data, imageName, selectedApi } = req.body;
  if (!base64data || !imageName || !selectedApi) {
    return res.status(400).json({ error: "Missing base64data or imageName or selectedApi" });
  }

  const matches = base64data.match(/^data:(.+);base64,(.+)$/);
  let buffer, extension;
  if (matches) {
    extension = matches[1].split("/")[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    // No data URL prefix, assume plain base64
    extension = "bin";
    buffer = Buffer.from(base64data, "base64");
  }
  //---- END - get picture data from camera, base64 encoded

  const filename = `DigiOH_GambarRobot_${Date.now()}.${extension}`;
  const filepath = path.join(`${uploadDir}/`, filename);
  const oriImageUrl = subFolderOriImage + "DigiOH_PhotoBox_" + new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "") + ".jpeg";

  try {
    await fs.promises.writeFile(filepath, buffer);
    console.log(`>> Saving file to local ${filepath}`);

    const oriImageUrlComplete = await uploadFile(filepath, oriImageUrl);
    console.log(`remoteFile: ${oriImageUrlComplete}`);

    console.log(`>>generatedImage ...`);
    const generatedImageResult = await generatedImage(`${displayUrl}${oriImageUrl}`, selectedApi);
    console.log("Generated image result:", generatedImageResult);

    const qrDataUrl = await QRCode.toDataURL(generatedImageResult);// Always respond with JSON
    res.json({
      status: "ok",
      imageUrl: generatedImageResult,
      qr: qrDataUrl
    });

  } catch (err) {
    res.status(500).json({ error: "Error saving file", details: err.message });
  }
});

app.get("/api/qrcode", async (req, res) => {
  try {
    const url = "https://www.saseno.de";
    const qrDataUrl = await QRCode.toDataURL(url);
    res.json({ qr: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

////////////////////////////////
// Start the server
////////////////////////////////
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Visit http://localhost:${PORT} in your browser`);
  console.log("Press Ctrl+C to stop the server");
});


////////////////////////////////
// Save config FTP
////////////////////////////////
app.post("/api/config_ftp", (req, res) => {
  fs.writeFileSync(configPathFtp, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ status: "ok" });
});

// Load config
app.get("/api/config_ftp", (req, res) => {
  if (fs.existsSync(configPathFtp)) {
    res.json(JSON.parse(fs.readFileSync(configPathFtp, "utf8")));
  } else {
    res.json({});
  }
});
////////////////////////////////
// Save config LightX
////////////////////////////////
app.post("/api/config_lightx", (req, res) => {
  fs.writeFileSync(configPathLightX, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ status: "ok" });
});

// Load config
app.get("/api/config_lightx", (req, res) => {
  if (fs.existsSync(configPathLightX)) {
    res.json(JSON.parse(fs.readFileSync(configPathLightX, "utf8")));
  } else {
    res.json({});
  }
});
////////////////////////////////