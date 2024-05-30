const { FaceClient } = require("@azure/cognitiveservices-face");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");

const faceKey = process.env.AZURE_FACE_API_KEY;
const faceEndpoint = process.env.AZURE_FACE_API_ENDPOINT;

const cognitiveServiceCredentials = new CognitiveServicesCredentials(faceKey);
const faceClient = new FaceClient(cognitiveServiceCredentials, faceEndpoint);

const faceApiDetect = async (imageBuffer) => {
  try {
    const detectedFaces = await faceClient.face.detectWithStream(imageBuffer, {
      returnFaceId: true,
      detectionModel: "detection_03",
    });

    if (!detectedFaces.length) {
      throw new Error("No faces detected.");
    }

    return detectedFaces[0].faceId;
  } catch (error) {
    console.error("Error in faceApiDetect:", error.message);
    throw error;
  }
};

const faceApiVerify = async (faceId1, faceId2) => {
  try {
    const verifyResult = await faceClient.face.verifyFaceToFace(
      faceId1,
      faceId2
    );
    return verifyResult.isIdentical;
  } catch (error) {
    console.error("Error in faceApiVerify:", error.message);
    throw error;
  }
};

module.exports = {
  faceApiDetect,
  faceApiVerify,
};
