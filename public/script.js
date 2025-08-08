document.getElementById("create_avatar").onclick = async function () {
  take_snapshot("AVATAR");
};
document.getElementById("create_cartoon").onclick = async function () {
  take_snapshot("CARTOON");
};
document.getElementById("background_generator").onclick = async function () {
  take_snapshot("BACKGROUND_GENERATOR");
};
document.getElementById("outfit").onclick = async function () {
  take_snapshot("OUTFIT");
};
document.getElementById("face_swap").onclick = async function () {
  take_snapshot("FACE_SWAP");
};
document.getElementById("create_avatar2").onclick = async function () {
  take_snapshot("AVATAR2");
};

document.getElementById("backButtonId").onclick = async function () {
  document.getElementById("results").innerHTML = "";
  document.getElementById("backButton").style.display = "none";
  document.getElementById("qrcode_viewer").style.display = "none";
};

async function take_snapshot(selectedApi = LightXEditorAiType.CARTOON) {
  await showCountdown(3); // Show countdown from 3
  return new Promise((resolve, reject) => {
    Webcam.snap(function (data_uri) {
      resolve(data_uri);
    });
  }).then((data_uri) => {
    return generateAiImage(data_uri, selectedApi);
  });
}

async function generateAiImage(data_uri, selectedApi) {
  var imageName = new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "");

  const data = {
    base64data: data_uri,
    imageName: imageName,
    selectedApi: selectedApi,
  };

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  document.getElementById("spinner").style.display = "flex"; // Show spinner

  try {
    const response = await fetch("/upload", options);
    let result;
    const contentType = response.headers.get("content-type");
    console.log(contentType);

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    console.log("Image generated successfully:");
    console.log(result);

    document.getElementById("results").innerHTML =
      `<img src="${result.imageUrl}" alt="Result Image" />`;
    document.getElementById("qrcode_viewer").innerHTML =
      `<img src="${result.qr}" alt="Result Image" />`;
    document.getElementById("backButton").style.display = "flex";
    document.getElementById("qrcode_viewer").style.display = "flex";
  } catch (error) {
    console.error("Error generating image:", error);
    // Handle error appropriately (e.g., display an error message)
  } finally {
    document.getElementById("spinner").style.display = "none"; // Hide spinner
  }
}

function showCountdown(seconds) {
  return new Promise((resolve) => {
    const countdownDiv = document.getElementById("countdown");
    countdownDiv.style.display = "block";
    let current = seconds;
    countdownDiv.textContent = current;
    const timer = setInterval(() => {
      current--;
      if (current > 0) {
        countdownDiv.textContent = current;
      } else {
        countdownDiv.textContent = "Smile!";
        setTimeout(() => {
          countdownDiv.style.display = "none";
          resolve();
        }, 700);
        clearInterval(timer);
      }
    }, 1000);
  });
}
