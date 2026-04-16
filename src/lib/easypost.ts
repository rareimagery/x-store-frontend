/**
 * EasyPost shipping API client.
 * Handles rate shopping, label generation, and tracking.
 * Requires EASYPOST_API_KEY env var.
 */

const EASYPOST_API = "https://api.easypost.com/v2";
const API_KEY = process.env.EASYPOST_API_KEY || "";

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

export interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  deliveryDays: string | null;
  currency: string;
}

export interface ShippingLabel {
  id: string;
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  service: string;
  rate: number;
}

export interface ShipmentResult {
  shipmentId: string;
  rates: ShippingRate[];
}

/**
 * Get shipping rate quotes for a parcel.
 */
export async function getShippingRates(params: {
  fromZip: string;
  toZip: string;
  weightOz: number;
  length: number;
  width: number;
  height: number;
}): Promise<ShipmentResult> {
  if (!API_KEY) {
    throw new Error("EASYPOST_API_KEY not configured");
  }

  const res = await fetch(`${EASYPOST_API}/shipments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      shipment: {
        from_address: { zip: params.fromZip, country: "US" },
        to_address: { zip: params.toZip, country: "US" },
        parcel: {
          weight: params.weightOz,
          length: params.length,
          width: params.width,
          height: params.height,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `EasyPost error: ${res.status}`);
  }

  const data = await res.json();

  const rates: ShippingRate[] = (data.rates || [])
    .map((r: any) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rate: parseFloat(r.rate),
      deliveryDays: r.delivery_days ? `${r.delivery_days} days` : null,
      currency: r.currency || "USD",
    }))
    .sort((a: ShippingRate, b: ShippingRate) => a.rate - b.rate);

  return { shipmentId: data.id, rates };
}

/**
 * Buy a shipping label for an existing shipment.
 */
export async function buyLabel(shipmentId: string, rateId: string): Promise<ShippingLabel> {
  if (!API_KEY) throw new Error("EASYPOST_API_KEY not configured");

  const res = await fetch(`${EASYPOST_API}/shipments/${shipmentId}/buy`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ rate: { id: rateId } }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Label purchase failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    trackingNumber: data.tracking_code || "",
    labelUrl: data.postage_label?.label_url || "",
    carrier: data.selected_rate?.carrier || "",
    service: data.selected_rate?.service || "",
    rate: parseFloat(data.selected_rate?.rate || "0"),
  };
}

/**
 * Get tracking events for a tracker.
 */
export async function getTracking(trackingCode: string, carrier: string): Promise<any[]> {
  if (!API_KEY) return [];

  const res = await fetch(`${EASYPOST_API}/trackers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      tracker: { tracking_code: trackingCode, carrier },
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.tracking_details || [];
}

/**
 * Check if EasyPost is configured and reachable.
 */
export function isConfigured(): boolean {
  return !!API_KEY;
}
