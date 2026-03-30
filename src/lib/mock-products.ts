import { Product } from "./drupal";

type MockProduct = Omit<Product, "subscriber_only" | "min_tier">;

const mockProducts: Record<string, MockProduct[]> = {
  elonmusk: [
    { id: "mock-em-1", title: "Mars Colony Blueprint Poster", description: "High-res digital print of the SpaceX Mars colony concept art. Limited edition.", price: "29.99", currency: "USD", sku: "elonmusk-mars-poster", image_url: null },
    { id: "mock-em-2", title: "Cybertruck Scale Model", description: "Die-cast 1:64 scale Cybertruck. Bulletproof glass not included.", price: "49.99", currency: "USD", sku: "elonmusk-cybertruck", image_url: null },
    { id: "mock-em-3", title: "X Premium Hoodie", description: "Heavyweight black hoodie with embroidered X logo. Unisex fit.", price: "64.99", currency: "USD", sku: "elonmusk-hoodie", image_url: null },
    { id: "mock-em-4", title: "Starship Launch Print", description: "Photo print of Starship's first successful orbital flight.", price: "19.99", currency: "USD", sku: "elonmusk-starship", image_url: null },
    { id: "mock-em-5", title: '"Free Speech" Tee', description: "Classic cotton tee. Front: X logo. Back: 'Free Speech Is Not A Crime'.", price: "24.99", currency: "USD", sku: "elonmusk-freespeech", image_url: null },
    { id: "mock-em-6", title: "Neuralink Cap", description: "Fitted baseball cap with Neuralink chip embroidery. Matte black.", price: "34.99", currency: "USD", sku: "elonmusk-neuralink", image_url: null },
  ],
  alphafox: [
    { id: "mock-af-1", title: "Diamond Hands Hoodie", description: "Black hoodie with diamond hands graphic. For true believers only.", price: "59.99", currency: "USD", sku: "alphafox-diamond", image_url: null },
    { id: "mock-af-2", title: "HODL Coffee Mug", description: "Ceramic mug that changes color with heat — reveals hidden chart going up.", price: "18.99", currency: "USD", sku: "alphafox-hodl", image_url: null },
    { id: "mock-af-3", title: "Crypto Trading Journal", description: "Hardcover journal with trade log templates, risk tracking, and reflection pages.", price: "14.99", currency: "USD", sku: "alphafox-journal", image_url: null },
    { id: "mock-af-4", title: "Bull Run Poster", description: "Neon-style digital art poster of a charging bull with BTC chart overlay.", price: "22.99", currency: "USD", sku: "alphafox-bullrun", image_url: null },
    { id: "mock-af-5", title: "DeFi Degen Snapback", description: "Snapback hat with 'DeFi Degen' embroidery. Green on black.", price: "29.99", currency: "USD", sku: "alphafox-snapback", image_url: null },
    { id: "mock-af-6", title: "Whale Alert Tee", description: "Tee with whale silhouette and wallet address pattern. WAGMI.", price: "24.99", currency: "USD", sku: "alphafox-whale", image_url: null },
  ],
  clownworld: [
    { id: "mock-cw-1", title: "Honk Honk Air Horn", description: "Pocket-sized air horn for maximum honk energy. Use responsibly.", price: "12.99", currency: "USD", sku: "clownworld-horn", image_url: null },
    { id: "mock-cw-2", title: "Clown World Mug", description: '"This Is Fine" mug but the dog is wearing a clown wig.', price: "16.99", currency: "USD", sku: "clownworld-mug", image_url: null },
    { id: "mock-cw-3", title: "NPC Tee", description: "Grey NPC face on black tee. The shirt that starts conversations.", price: "22.99", currency: "USD", sku: "clownworld-npc", image_url: null },
    { id: "mock-cw-4", title: "Simulation Glitch Poster", description: "Glitch art poster that says 'The Simulation Writers Are Getting Lazy'.", price: "19.99", currency: "USD", sku: "clownworld-glitch", image_url: null },
    { id: "mock-cw-5", title: "Clown Nose Stress Ball", description: "Red foam clown nose. Squeeze when the timeline gets too wild.", price: "9.99", currency: "USD", sku: "clownworld-nose", image_url: null },
    { id: "mock-cw-6", title: "Peak Clown Hoodie", description: "Premium hoodie. Front: Rainbow clown. Back: 'Peak Clown Achieved. Or So We Thought.'", price: "54.99", currency: "USD", sku: "clownworld-hoodie", image_url: null },
  ],
  ksjcreative: [
    { id: "mock-ks-1", title: "Neon Dreams Art Print", description: "Signed 18x24 giclée print. Cyberpunk cityscape in neon palette. Edition of 50.", price: "34.99", currency: "USD", sku: "ksjcreative-neon", image_url: null },
    { id: "mock-ks-2", title: "Digital Art Brush Pack", description: "200+ custom Procreate & Photoshop brushes used in my actual artwork.", price: "12.99", currency: "USD", sku: "ksjcreative-brushes", image_url: null },
    { id: "mock-ks-3", title: "Fantasy Character Commission", description: "Full character illustration — your OC or D&D character. Digital delivery.", price: "149.99", currency: "USD", sku: "ksjcreative-commission", image_url: null },
    { id: "mock-ks-4", title: "Speed Painting Course", description: "2-hour video course: concept art speed painting techniques from sketch to final.", price: "39.99", currency: "USD", sku: "ksjcreative-course", image_url: null },
    { id: "mock-ks-5", title: "Sticker Pack Vol. 1", description: "10 die-cut holographic stickers featuring original character designs.", price: "8.99", currency: "USD", sku: "ksjcreative-stickers", image_url: null },
    { id: "mock-ks-6", title: "Artist Sketchbook", description: "160-page hardcover sketchbook with my cover art. Thick 120gsm paper.", price: "24.99", currency: "USD", sku: "ksjcreative-sketchbook", image_url: null },
  ],
};

export function getMockProducts(slug: string): Product[] {
  return (mockProducts[slug] ?? []).map((p) => ({
    ...p,
    subscriber_only: false,
    min_tier: null,
  }));
}
