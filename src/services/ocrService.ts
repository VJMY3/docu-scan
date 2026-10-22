import { getStoredConfig } from './supabaseClient';
import type { InventoryItem } from '../types/document';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error('Failed to convert to base64'));
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Pre-processes and optimizes image for Gemini Vision API.
 * Downscaling oversized camera photos (e.g. 12-48MP from phones) to max 1920px
 * prevents HTTP 503 timeouts / payload overload on Google's vision servers.
 */
const prepareImageForGemini = async (file: File): Promise<{ base64: string; mimeType: string }> => {
  if (!file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type || 'application/pdf' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1920;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fileToBase64(file)
            .then(b => resolve({ base64: b, mimeType: file.type || 'image/jpeg' }))
            .catch(() => resolve({ base64: '', mimeType: 'image/jpeg' }));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = async () => {
        const base64 = await fileToBase64(file).catch(() => '');
        resolve({ base64, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = async () => {
      const base64 = await fileToBase64(file).catch(() => '');
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const extractTextFromImage = async (
  imageFile: File
): Promise<{ title: string; date: string; items: InventoryItem[]; status: 'verified' | 'pending' }> => {
  try {
    const config = getStoredConfig();
    if (!config.geminiKey) throw new Error("Missing Gemini API Key");

    const { base64: base64Data, mimeType } = await prepareImageForGemini(imageFile);
    if (!base64Data) {
      throw new Error("Failed to process image for scanning.");
    }
    
    const prompt = `Extract all handwritten items and quantities from this image.
    Return ONLY a valid JSON object matching exactly this structure:
    {
      "items": [
        { "item_name": "Name of item", "quantity": 10 }
      ]
    }`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    // User's preferred Gemini model first, followed by resilient fallbacks
    const selectedModel = config.geminiModel || 'gemini-3.8-flash';
    const fallbackModels = [
      'gemini-3.8-flash',
      'gemini-3.8-pro',
      'gemini-3-flash',
      'gemini-3-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash'
    ];
    const knownModels = [selectedModel, ...fallbackModels.filter(m => m !== selectedModel)];

    let response: Response | null = null;
    let lastErrorMsg = "";
    let lastStatus = 0;
    let usedModel = "";

    // Try models in order, with exponential backoff retries for transient 503/429 errors
    for (const model of knownModels) {
      const MAX_RETRIES = 2; // Up to 2 retries per model on transient errors (503/429/500)
      let skipModel = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = 1500 * attempt + Math.floor(Math.random() * 400);
          console.warn(`[Gemini OCR] Model ${model} returned ${lastStatus}. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
          await sleep(delay);
        }

        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (res.ok) {
            response = res;
            usedModel = model;
            break;
          }

          lastStatus = res.status;
          const errData = await res.json().catch(() => ({}));
          const apiError = errData.error;
          lastErrorMsg = apiError?.message || `HTTP ${res.status}`;

          // 404: Model not available in this tier/endpoint -> skip directly to next model
          if (res.status === 404) {
            console.warn(`[Gemini OCR] Model ${model} not found (404). Falling back to next model.`);
            skipModel = true;
            break;
          }

          // Leaked or invalid API key
          if (
            res.status === 401 ||
            /api key not valid|invalid api key|api_key_invalid/i.test(lastErrorMsg)
          ) {
            throw new Error(
              'Gemini rejected the API key. Check VITE_GEMINI_API_KEY in .env, confirm the key is enabled for the Gemini API, then restart the Vite server.'
            );
          }

          if (/leaked/i.test(lastErrorMsg)) {
            throw new Error(
              'Gemini API key was reported as leaked by Google. Please generate a fresh key at https://aistudio.google.com/app/apikey, update VITE_GEMINI_API_KEY in .env, and restart the server.'
            );
          }

          if (res.status === 403 && !/leaked/i.test(lastErrorMsg)) {
            throw new Error(`Gemini API access denied: ${lastErrorMsg}`);
          }

          // 503 (Overloaded / Unavailable), 429 (Rate Limit), 500 (Server Error)
          if (res.status === 503 || res.status === 429 || res.status === 500) {
            console.warn(`[Gemini OCR] Model ${model} temporary error (${res.status}): ${lastErrorMsg}`);
            if (attempt < MAX_RETRIES) {
              continue; // Retry this model
            }
            // Retries exhausted for this model, try next model in knownModels
            console.warn(`[Gemini OCR] Model ${model} exhausted retries for ${res.status}. Trying next model.`);
            break;
          }

          throw new Error(`Gemini request failed (${res.status}): ${lastErrorMsg}`);
        } catch (e: any) {
          if (
            e.message.includes('Gemini rejected the API key') ||
            e.message.includes('reported as leaked') ||
            e.message.includes('Gemini API access denied') ||
            e.message.includes('Gemini request failed (400)')
          ) {
            throw e;
          }
          lastErrorMsg = e.message;
        }
      }

      if (response) {
        console.log(`[Gemini OCR] Successfully parsed document using model: ${usedModel}`);
        break;
      }

      if (skipModel) {
        continue;
      }
    }

    if (!response) {
      if (lastStatus === 503) {
        throw new Error(
          `Gemini server is temporarily overloaded (HTTP 503: ${lastErrorMsg}). The system attempted retries across Gemini 3 models. Please wait a few seconds and try again.`
        );
      }
      if (lastStatus === 429) {
        throw new Error(
          `Gemini rate limit exceeded (HTTP 429). Please wait a few seconds before scanning again.`
        );
      }
      throw new Error(`All models failed. Last error: ${lastErrorMsg}`);
    }

    const dataRaw = await response.json();
    const parts = dataRaw.candidates?.[0]?.content?.parts || [];

    // Filter out thought/reasoning parts for Gemini 3 thinking models
    const nonThoughtParts = parts.filter((p: any) => !p.thought);
    let resultText = "";
    if (nonThoughtParts.length > 0) {
      resultText = nonThoughtParts.map((p: any) => p.text || "").join("\n");
    } else {
      resultText = parts.map((p: any) => p.text || "").join("\n");
    }
    
    // Clean up markdown block if Gemini wraps the response
    resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(resultText);
    } catch {
      // In case text precedes or follows JSON, extract the JSON object
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch {
          // ignore
        }
      }
      if (!data) {
        console.error("Failed to parse JSON. Raw output:", resultText);
        throw new Error("AI returned invalid data format. Please try again.");
      }
    }
    
    // Format output
    const items: InventoryItem[] = (data.items || []).map((item: any) => ({
      id: crypto.randomUUID(),
      item_name: item.item_name || 'Unknown',
      quantity: parseInt(item.quantity) || 1
    }));

    const date = new Date().toISOString().split('T')[0];
    const title = `Inventory Scan - ${date}`;

    return {
      title,
      date,
      items,
      status: items.length > 0 ? 'verified' : 'pending'
    };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(error.message || 'Failed to extract data using Gemini');
  }
};
