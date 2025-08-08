const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const displayUrl = "https://wsaseno.de/digiOH_files/";

const {
  sleep,
  getLightxConfig,
  addWatermark,
  getFtpConfig,
} = require("./utils");

function getConfig() {
  const config = getFtpConfig();
  return {
    host: config.ftpAddress,
    user: config.ftpUsername,
    password: config.ftpPassword,
    secure: false, // true if FTPS
  };
}

async function uploadToFTP(localPath, remotePath) {
  const client = new ftp.Client();
  try {
    const ftpConfig = getConfig();
    await client.access(ftpConfig);

    // Ensure the remote directory exists
    const remoteDir = path.dirname(remotePath).replace(/\\/g, "/");
    console.log(remoteDir);
    await client.ensureDir(remoteDir);

    await client.uploadFrom(localPath, remotePath);
    console.log("[uploadToFTP] Upload successful!");
  } catch (err) {
    console.error("FTP error:", err);
  }
  client.close();
}

async function copyFile(fileUrl, remoteFile) {
  const localFile = path.basename(fileUrl);
  console.log(`localFile : ${localFile}`);

  const watermarkPath = "watermarkdigioh.png"; // Path to your watermark image
  const watermarkedFile = "watermarked_" + localFile;

  try {
    console.log(">> Downloading file...");
    await downloadFile(fileUrl, localFile);

    //add watermark
    await addWatermark(localFile, watermarkPath, watermarkedFile);

    console.log(">> Uploading to FTP...");
    return await uploadFile(watermarkedFile, remoteFile);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // Clean up local downloaded file
    if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
  }
}

async function uploadFile(localFile, remoteFile) {
  console.log(`>> localfile : ${localFile}`);
  console.log(`>> remotefile: ${remoteFile}`);

  try {
    console.log("...Uploading to FTP...");
    await uploadToFTP(localFile, remoteFile);

    return `${displayUrl}${remoteFile}`;
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // Clean up local downloaded file
    if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
  }
}

async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`>>>Failed to fetch: ${res.statusText}`);

  // Convert Web Stream to Node Stream
  const nodeStream = require("stream").Readable.fromWeb(res.body);
  await streamPipeline(nodeStream, fs.createWriteStream(outputPath));
}

module.exports = {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
};
