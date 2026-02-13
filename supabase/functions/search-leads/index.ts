import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, query, pageToken } = await req.json();

    if (!city || !query) {
      return new Response(
        JSON.stringify({ error: 'city and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchText = `${query} en ${city}`;

    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,nextPageToken',
      },
      body: JSON.stringify({
        textQuery: searchText,
        languageCode: 'es',
        maxResultCount: 20,
        ...(pageToken ? { pageToken } : {}),
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Google Places API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error calling Google Places API', details: errorText }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const places = searchData.places || [];

    const results = places
      .filter((place: any) => place.nationalPhoneNumber || place.internationalPhoneNumber || place.websiteUri)
      .map((place: any) => {
        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
        const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : null;

        return {
          name: place.displayName?.text || 'Sin nombre',
          address: place.formattedAddress || 'Sin dirección',
          phone,
          whatsappLink: cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}` : null,
          website: place.websiteUri || null,
          rating: place.rating || null,
          ratingCount: place.userRatingCount || 0,
          googleMapsUrl: place.googleMapsUri || null,
          status: place.businessStatus === 'OPERATIONAL' ? 'Abierto' : place.businessStatus || 'Desconocido',
        };
      });

    return new Response(
      JSON.stringify({ results, total: results.length, nextPageToken: searchData.nextPageToken || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
