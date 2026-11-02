// Edge Function: create-order
// Creates order with server-side price validation, shipping calculation, rate limiting
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { name, phone, notes, municipality_id, items } = await req.json();

    // Validate required fields
    if (!name || !phone || !municipality_id || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (Puerto Rico)
    const phoneRegex = /^(?:\+?1[-.\s]?)?(?:\(?787\)?|\(?939\)?)[-.\s]?\d{3}[-.\s]?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Formato de teléfono inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: max 5 orders per hour per phone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .gte("created_at", oneHourAgo);

    if (countError) throw countError;
    if (count && count >= 5) {
      return new Response(
        JSON.stringify({ error: "Límite de pedidos por hora excedido" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate municipality
    const { data: municipality, error: mError } = await supabase
      .from("municipalities")
      .select("id, base_price")
      .eq("id", municipality_id)
      .eq("active", true)
      .single();

    if (mError || !municipality) {
      return new Response(
        JSON.stringify({ error: "Municipio no encontrado o inactivo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get real prices from products (ignore client prices)
    const productIds = items.map(i => i.product_id).filter(Boolean);
    const { data: products, error: pError } = await supabase
      .from("products")
      .select("id, price, active")
      .in("id", productIds)
      .eq("active", true);

    if (pError) throw pError;
    if (!products || products.length !== productIds.length) {
      return new Response(
        JSON.stringify({ error: "Algunos productos no existen o están inactivos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceMap = new Map(products.map(p => [p.id, Number(p.price)]));

    // Calculate subtotal from real prices
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const qty = Math.max(1, Math.floor(item.qty || 1));
      const unitPrice = priceMap.get(item.product_id) || 0;
      subtotal += unitPrice * qty;
      orderItems.push({
        product_id: item.product_id,
        product_name: "", // will be filled below
        unit_price: unitPrice,
        qty
      });
    }

    // Get product names for order_items
    const { data: productNames } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    
    const nameMap = new Map((productNames || []).map(p => [p.id, p.name]));
    orderItems.forEach(item => {
      item.product_name = nameMap.get(item.product_id) || "";
    });

    // Calculate shipping (same logic as calculate-shipping)
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

    // Estimate weight/dimensions from items (simplified)
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1) * item.qty, 0);
    const volumeCm3 = items.reduce((sum, item) => sum + ((item.length || 30) * (item.width || 20) * (item.height || 10)) * item.qty, 0);

    let shippingCost = municipality.base_price + totalWeight * weightSurchargePerKg + volumeCm3 * sizeSurchargePerCm3;

    if (freeDeliveryOver > 0 && subtotal >= freeDeliveryOver) {
      shippingCost = 0;
    }
    if (shippingCost < minDelivery && shippingCost > 0) {
      shippingCost = minDelivery;
    }

    const total = subtotal + shippingCost;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: name,
        customer_phone: phone,
        notes: notes || '',
        municipality_id,
        subtotal,
        shipping_cost: shippingCost,
        total,
        status: 'pendiente',
        admin_notes: ''
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    // Create order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      qty: item.qty
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return new Response(
      JSON.stringify({ ok: true, order_id: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});