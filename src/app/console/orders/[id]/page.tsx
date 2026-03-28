"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  currency: string;
};

type Shipment = {
  id: string;
  state: string;
  trackingCode: string | null;
  amount: string;
  currency: string;
  shippingMethod: string | null;
  shippingAddress: Record<string, string> | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  state: string;
  email: string;
  customerName: string;
  placedAt: string;
  completedAt: string | null;
  total: string;
  currency: string;
  subtotal: string;
  billingAddress: Record<string, string> | null;
  items: OrderItem[];
  shipments: Shipment[];
};

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-zinc-400 bg-zinc-800" },
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  fulfillment: { label: "Processing", color: "text-blue-400 bg-blue-400/10" },
  completed: { label: "Completed", color: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: string | null, currency = "USD") {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    parseFloat(amount)
  );
}

function AddressBlock({ address }: { address: Record<string, string> | null }) {
  if (!address) return <span className="text-zinc-500">No address on file</span>;
  return (
    <address className="not-italic text-zinc-300 leading-relaxed">
      {address.given_name} {address.family_name}
      <br />
      {address.address_line1}
      {address.address_line2 && <><br />{address.address_line2}</>}
      <br />
      {address.locality}, {address.administrative_area} {address.postal_code}
      <br />
      {address.country_code}
    </address>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrder(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="py-16 text-center text-zinc-500">Loading order…</div>;
  }
  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/console/orders" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to Orders
        </Link>
        <div className="py-12 text-center text-red-400">{error || "Order not found."}</div>
      </div>
    );
  }

  const stateInfo = STATE_LABELS[order.state] || { label: order.state, color: "text-zinc-400 bg-zinc-800" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href="/console/orders" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold">
            Order #{order.orderNumber || order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-zinc-500">Placed {formatDate(order.placedAt)}</p>
        </div>
        <span className={`mt-1 rounded-full px-3 py-1 text-sm font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order Items */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="font-semibold">Items</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-sm text-zinc-500">
                      Qty: {item.quantity} × {formatCurrency(item.unitPrice, item.currency)}
                    </p>
                  </div>
                  <p className="font-semibold text-white">
                    {formatCurrency(item.totalPrice, item.currency)}
                  </p>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-white">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Shipments */}
          {order.shipments.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="font-semibold">Shipments</h2>
              </div>
              <div className="divide-y divide-zinc-800">
                {order.shipments.map((shipment) => {
                  const sInfo = STATE_LABELS[shipment.state] || {
                    label: shipment.state,
                    color: "text-zinc-400 bg-zinc-800",
                  };
                  return (
                    <div key={shipment.id} className="px-5 py-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-medium text-white">
                            {shipment.shippingMethod || "Standard Shipping"}
                          </p>
                          {shipment.trackingCode && (
                            <p className="font-mono text-sm text-indigo-400">
                              {shipment.trackingCode}
                            </p>
                          )}
                          {!shipment.trackingCode && (
                            <p className="text-sm text-zinc-500">No tracking code</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`block rounded-full px-2.5 py-0.5 text-xs font-medium ${sInfo.color}`}>
                            {sInfo.label}
                          </span>
                          <p className="text-sm text-zinc-400">
                            {formatCurrency(shipment.amount, shipment.currency)}
                          </p>
                        </div>
                      </div>
                      {shipment.shippingAddress && (
                        <div className="mt-2 text-sm">
                          <AddressBlock address={shipment.shippingAddress} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Customer + Billing */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Customer
            </h2>
            <p className="font-medium text-white">{order.customerName}</p>
            <p className="text-sm text-zinc-400">{order.email}</p>
          </div>

          {/* Billing Address */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Billing Address
            </h2>
            <div className="text-sm">
              <AddressBlock address={order.billingAddress} />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-zinc-500">Placed</span>
                <span className="text-zinc-300">{formatDate(order.placedAt)}</span>
              </div>
              {order.completedAt && (
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-zinc-500">Completed</span>
                  <span className="text-zinc-300">{formatDate(order.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
