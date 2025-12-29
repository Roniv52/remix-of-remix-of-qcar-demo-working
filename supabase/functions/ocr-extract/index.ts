import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = documentType === "license" 
      ? `You are an OCR assistant that extracts driver license information from images. 
Extract the following fields and return them as JSON:
- full_name: The driver's full name
- id_number: The ID number or identity number on the license
- gender: The gender (Male/Female)
- date_of_birth: Date of birth in YYYY-MM-DD format
- license_number: The license number
- license_year_of_issue: The year the license was issued (just the year as a number, e.g. 2020)
- license_expiry: The expiration date in YYYY-MM-DD format
- address: The address on the license

Only return valid JSON, no additional text. If a field cannot be read, set it to null.`
      : `You are an OCR assistant that extracts insurance policy information from images or documents.
Extract the following fields and return them as JSON:
- policy_number: The policy number
- insurance_company: The insurance company name
- policyholder_name: The name of the policyholder
- policyholder_id: The ID number of the policyholder
- vehicle_number: License plate number
- vehicle_type: Type of vehicle (e.g., Private Car, Motorcycle, Commercial)
- vehicle_color: Vehicle color
- vehicle_year: Vehicle manufacture year (just the year as a number)
- coverage_type: Type of coverage (e.g., Comprehensive, Third-Party, Collision)
- valid_until: Policy expiration date in YYYY-MM-DD format
- agent_name: Insurance agent name if visible

Only return valid JSON, no additional text. If a field cannot be read, set it to null.`;

    console.log(`Processing ${documentType} document...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please extract the ${documentType === "license" ? "driver license" : "insurance policy"} information from this image.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to process document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse extracted data", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted:", extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OCR extraction error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
