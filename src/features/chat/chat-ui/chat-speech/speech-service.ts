"use server";

export const GetSpeechToken = async () => {
  // エンドポイントが指定されている場合はそれを使用、そうでなければリージョンから構築
  const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;
  const speechRegion = process.env.AZURE_SPEECH_REGION;
  const speechKey = process.env.AZURE_SPEECH_KEY;

  if (!speechKey) {
    return {
      error: true,
      errorMessage: "AZURE_SPEECH_KEY is required",
      token: "",
      region: "",
      endpoint: "",
    };
  }

  // エンドポイントまたはリージョンのいずれかが必要
  if (!speechEndpoint && !speechRegion) {
    return {
      error: true,
      errorMessage: "Either AZURE_SPEECH_ENDPOINT or AZURE_SPEECH_REGION is required",
      token: "",
      region: "",
      endpoint: "",
    };
  }

  // エンドポイントが指定されている場合はそれを使用、そうでなければリージョンから構築
  const tokenEndpoint = speechEndpoint 
    ? `${speechEndpoint}/sts/v1.0/issueToken`
    : `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  console.log('Speech token endpoint:', tokenEndpoint);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
      },
      cache: "no-store",
    });

    if (response.status !== 200) {
      const errorText = await response.text();
      console.error('Speech token request failed:', response.status, errorText);
      return {
        error: true,
        errorMessage: `Token request failed: ${response.status} ${errorText}`,
        token: "",
        region: speechRegion || "",
        endpoint: speechEndpoint || "",
      };
    }

    const token = await response.text();
    console.log('Speech token obtained successfully');

    return {
      error: false,
      errorMessage: "",
      token: token,
      region: speechRegion || "",
      endpoint: speechEndpoint || "",
    };
  } catch (error) {
    console.error('Speech token request error:', error);
    return {
      error: true,
      errorMessage: `Token request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      token: "",
      region: speechRegion || "",
      endpoint: speechEndpoint || "",
    };
  }
};
