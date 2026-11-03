import { NextRequest, NextResponse } from "next/server";

export interface ScannedBillItem {
  id: string;
  name: string;
  qty: number;
  price: number; // total price for this line item (qty * unitPrice)
}

export interface ScannedBillResponse {
  merchantName: string;
  date?: string;
  category:
    | "food"
    | "date"
    | "shopping"
    | "transport"
    | "travel"
    | "bills"
    | "gift"
    | "other";
  items: ScannedBillItem[];
  subtotal: number;
  taxAndService: number;
  discount: number;
  grandTotal: number;
}

function toCleanInteger(val: unknown): number {
  if (typeof val === "number" && Number.isFinite(val)) {
    return Math.round(val);
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^\d-]/g, "");
    const parsed = parseInt(cleaned, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY belum dikonfigurasi di server (.env.local)." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { imageBase64?: string };
    const imageBase64 = body?.imageBase64;

    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Format gambar struk tidak valid." },
        { status: 400 }
      );
    }

    const systemPrompt = `Anda adalah asisten ekstraksi struk/nota belanja dan restoran Indonesia yang sangat akurat.
Tugas Anda adalah membaca gambar struk/nota/bill dan mengekstrak rinciannya ke dalam JSON murni dengan skema berikut:
{
  "merchantName": "Nama restoran / toko / merchant (string, contoh: 'Kopi Tuku Cipete')",
  "date": "YYYY-MM-DD (string, kosongkan jika tidak terbaca)",
  "category": "Salah satu dari: food | date | shopping | transport | travel | bills | gift | other",
  "items": [
    {
      "name": "Nama menu/barang",
      "qty": 1,
      "price": 25000
    }
  ],
  "subtotal": 25000,
  "taxAndService": 2750,
  "discount": 0,
  "grandTotal": 27750
}

Aturan Penting:
1. "price" pada setiap item adalah TOTAL harga baris tersebut (sudah dikali qty), dalam angka bulat Rupiah penuh tanpa titik/desimal (contoh: 45.000 pada struk ditulis 45000).
2. Jika pada struk harga ditulis dalam ribuan disingkat (misal "25" untuk Rp25.000), konversikan menjadi angka Rupiah penuh (25000).
3. "taxAndService" adalah gabungan PPN / PB1 / Tax + Service Charge + Biaya Layanan / Kemasan / Ongkir.
4. "discount" adalah angka positif total potongan/diskon/voucher (0 jika tidak ada).
5. "grandTotal" adalah total akhir yang dibayar pada struk.
6. Kembalikan HANYA objek JSON yang valid.`;

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.1,
          max_completion_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return NextResponse.json(
        {
          error: `Gagal memproses struk dengan Groq AI (Status ${groqRes.status}).`,
        },
        { status: 502 }
      );
    }

    const data = await groqRes.json();
    const rawContent: string =
      data?.choices?.[0]?.message?.content || "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "Hasil pembacaan AI tidak dapat diparse sebagai JSON." },
        { status: 500 }
      );
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items: ScannedBillItem[] = rawItems
      .map((item: unknown, idx: number) => {
        const obj = (item || {}) as Record<string, unknown>;
        const name = String(obj.name || `Item #${idx + 1}`).trim();
        const qty = Math.max(1, toCleanInteger(obj.qty) || 1);
        const price = Math.max(0, toCleanInteger(obj.price));
        return {
          id: `item_${idx}_${Date.now()}`,
          name,
          qty,
          price,
        };
      })
      .filter((i) => i.price > 0 || i.name.length > 0);

    const computedItemsSubtotal = items.reduce((sum, i) => sum + i.price, 0);
    const subtotal =
      toCleanInteger(parsed.subtotal) > 0
        ? toCleanInteger(parsed.subtotal)
        : computedItemsSubtotal;
    const taxAndService = Math.max(0, toCleanInteger(parsed.taxAndService));
    const discount = Math.max(0, toCleanInteger(parsed.discount));

    const computedGrandTotal = Math.max(
      0,
      computedItemsSubtotal + taxAndService - discount
    );
    const grandTotal =
      toCleanInteger(parsed.grandTotal) > 0
        ? toCleanInteger(parsed.grandTotal)
        : computedGrandTotal;

    const validCategories = new Set([
      "food",
      "date",
      "shopping",
      "transport",
      "travel",
      "bills",
      "gift",
      "other",
    ]);
    const rawCat = String(parsed.category || "food").toLowerCase();
    const category = (
      validCategories.has(rawCat) ? rawCat : "food"
    ) as ScannedBillResponse["category"];

    const rawDate = typeof parsed.date === "string" ? parsed.date.trim() : "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;

    const result: ScannedBillResponse = {
      merchantName:
        String(parsed.merchantName || "Struk Pengeluaran").trim() ||
        "Struk Pengeluaran",
      date,
      category,
      items,
      subtotal,
      taxAndService,
      discount,
      grandTotal,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Scan bill error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memindai struk." },
      { status: 500 }
    );
  }
}
