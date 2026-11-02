// Edge Function: calculate-shipping
// Calculates delivery price based on municipality, weight, dimensions, order amount
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Deno.env.get() is specific to Deno Edge Functions runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { municipalityId, weightKg, lengthCm, widthCm, heightCm, orderAmount } = await req.json();

    if (!municipalityId || weightKg === undefined || lengthCm === undefined || widthCm === undefined || heightCm === undefined || orderAmount === undefined) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get municipality base price
    const { data: municipality, error: mError } = await supabase
      .from("municipalities")
      .select("id, name, base_price, active")
      .eq("id", municipalityId)
      .eq("active", true)
      .single();

    if (mError || !municipality) {
      return new Response(
        JSON.stringify({ error: "Municipio no encontrado o inactivo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get delivery settings
    const { data: settings } = await supabase
      .from("delivery_settings")
      .select("key, value")
      .eq("active", true);

    const settingsMap = (settings || []).reduce((acc, s) => {
      acc[s.key] = parseFloat(s.value) || 0;
      return acc;
    }, {} as Record<string, number>);

    const weightSurchargePerKg = settingsMap["weight_surcharge_per_kg"] || 0;
    const sizeSurchargePerCm3 = settingsMap["size_surcharge_per_cm3"] || 0;
    const minDelivery = settingsMap["min_delivery"] || 0;
    const freeDeliveryOver = settingsMap["free_delivery_over"] || 0;

    const volumeCm3 = lengthCm * widthCm * heightCm;
    let deliveryPrice = municipality.base_price + weightKg * weightSurchargePerKg + volumeCm3 * sizeSurchargePerCm3;

    if (freeDeliveryOver > 0 && orderAmount >= freeDeliveryOver) {
      deliveryPrice = 0;
    }

    if (deliveryPrice < minDelivery && deliveryPrice > 0) {
      deliveryPrice = minDelivery;
    }

    return new Response(
      JSON.stringify({
        municipality: municipality.name,
        basePrice: municipality.base_price,
        weightSurcharge: weightKg * weightSurchargePerKg,
        sizeSurcharge: volumeCm3 * sizeSurchargePerCm3,
        deliveryPrice: Math.max(0, deliveryPrice),
        volumeCm3,
        freeDelivery: freeDeliveryOver > 0 && orderAmount >= freeDeliveryOver,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
