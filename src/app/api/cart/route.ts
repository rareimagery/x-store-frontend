import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Simple cookie-based cart. No Drupal persistence needed for MVP.
 * Cart is a JSON array stored in a cookie.
 */

export interface CartItem {
  id: string; // unique cart item ID
  productId: string; // Drupal product ID
  variationId: string; // Drupal variation ID
  printfulVariantId?: string; // Printful variant ID for fulfillment
  title: string;
  price: string; // retail price
  imageUrl: string | null;
  quantity: number;
  size?: string;
  color?: string;
  storeSlug: string;
  sellerUsername?: string;
}

const CART_COOKIE = "ri_cart";
const MAX_CART_ITEMS = 20;

async function getCart(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setCartCookie(cart: CartItem[]): Record<string, string> {
  const value = JSON.stringify(cart);
  return {
    "Set-Cookie": `${CART_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
  };
}

// GET — read cart
export async function GET() {
  const cart = await getCart();
  return NextResponse.json({
    items: cart,
    count: cart.reduce((sum, i) => sum + i.quantity, 0),
    total: cart.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0).toFixed(2),
  });
}

// POST — add item or update quantity
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  let cart = await getCart();

  if (action === "add") {
    const item: CartItem = body.item;
    if (!item?.productId || !item?.variationId || !item?.title || !item?.price || !item?.storeSlug) {
      return NextResponse.json({ error: "Missing required cart item fields" }, { status: 400 });
    }

    // Check if same variation already in cart — increment quantity
    const existing = cart.find(
      (c) => c.variationId === item.variationId && c.storeSlug === item.storeSlug
    );
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      if (cart.length >= MAX_CART_ITEMS) {
        return NextResponse.json({ error: "Cart is full (max 20 items)" }, { status: 400 });
      }
      cart.push({
        ...item,
        id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        quantity: item.quantity || 1,
      });
    }

    const res = NextResponse.json({
      items: cart,
      count: cart.reduce((sum, i) => sum + i.quantity, 0),
      added: item.title,
    });
    res.headers.set("Set-Cookie", setCartCookie(cart)["Set-Cookie"]);
    return res;
  }

  if (action === "update") {
    const { itemId, quantity } = body;
    cart = cart.map((c) =>
      c.id === itemId ? { ...c, quantity: Math.max(1, Math.min(10, quantity || 1)) } : c
    );
    const res = NextResponse.json({ items: cart });
    res.headers.set("Set-Cookie", setCartCookie(cart)["Set-Cookie"]);
    return res;
  }

  if (action === "remove") {
    const { itemId } = body;
    cart = cart.filter((c) => c.id !== itemId);
    const res = NextResponse.json({ items: cart });
    res.headers.set("Set-Cookie", setCartCookie(cart)["Set-Cookie"]);
    return res;
  }

  if (action === "clear") {
    const res = NextResponse.json({ items: [] });
    res.headers.set("Set-Cookie", setCartCookie([])["Set-Cookie"]);
    return res;
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
