const { GoogleGenAI, Modality } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
} = require("./ftpUtils");

const {
  sleep,
  getLightxConfig,
  addWatermark,
  getFtpConfig,
  getGeminiConfig,
} = require("./utils");

const subFolderOriImage = ""; // "DigiOH_capture_images/";

////////////////////////////////
// Uplolad photos to local server
////////////////////////////////
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function getLightboxApi() {
  const config = getGeminiConfig();
  return config;
}

async function processImageWithGemini(base64Image) {
  const geminiConfig = getLightboxApi();
  const ai = new GoogleGenAI({apiKey: geminiConfig.geminiApi});

  const filename = `DigiOH_GambarRobot_${Date.now()}.jpg`;
  const filepath = path.join(`${uploadDir}/`, filename);
  const oriImageUrl =
    subFolderOriImage +
    "DigiOH_PhotoBox_" +
    new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "") +
    ".jpeg";
  
  try {

    // Prepare the content parts
    const contents = [
      { 
        text: geminiConfig.textprompt_for_gemini
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },
    ];

    // Set responseModalities to include "Image" so the model can generate an image
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
    for (const part of response.candidates[0].content.parts) {
      // Based on the part type, either show the text or save the image
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("Image saved as gemini-native-image.png");

        await fs.promises.writeFile(filepath, buffer);
        console.log(`>> Saving file to local ${filepath}`);

        const localFile = path.basename(filepath);

        const watermarkPath = "watermarkdigioh.png"; // Path to your watermark image
        const watermarkedFile = "watermarked_" + localFile;

        //add watermark
        await addWatermark(filepath, watermarkPath, watermarkedFile);

        const oriImageUrlComplete = await uploadFile(watermarkedFile, oriImageUrl);
        console.log(`remoteFile: ${oriImageUrlComplete}`);

        return oriImageUrlComplete;
      }
    }

  } catch (err) {
    return err.message;
  }
}

module.exports = {
  processImageWithGemini,
};