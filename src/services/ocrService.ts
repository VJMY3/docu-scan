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

export const extractTextFromImage = async (
  imageFile: File
): Promise<{ title: string; date: string; items: InventoryItem[]; status: 'verified' | 'pending' }> => {
  try {
    const config = getStoredConfig();
    if (!config.geminiKey) throw new Error("Missing Gemini API Key");

    const base64Data = await fileToBase64(imageFile);
    
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
              mime_type: imageFile.type || 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const knownModels = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let response = null;
    let lastErrorMsg = "";

    // Try models one by one until one succeeds
    for (const model of knownModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (res.ok) {
          response = res;
          break; // Success!
        } else {
          const errData = await res.json();
          lastErrorMsg = errData.error?.message || `Failed on ${model}`;
          // If it's a 404 (model not found), continue loop. If it's a 403 (bad key), throw immediately.
          if (errData.error?.code === 403 || errData.error?.code === 401) {
            throw new Error("Invalid API Key. Please check your App Settings.");
          }
        }
      } catch (e: any) {
        if (e.message.includes("Invalid API Key")) throw e;
        lastErrorMsg = e.message;
      }
    }

    if (!response) {
      throw new Error(`All models failed. Last error: ${lastErrorMsg}`);
    }

    const dataRaw = await response.json();
    let resultText = dataRaw.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean up markdown block if Gemini wraps the response
    resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse JSON. Raw output:", resultText);
      throw new Error("AI returned invalid data format. Please try again.");
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
