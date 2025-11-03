import { ProductData } from './types.js';

declare global {
  interface Window {
    PRODUCT_DATA: ProductData;
  }
}

window.PRODUCT_DATA = {
  "meta": {
    "version": "1.0",
    "generated_at": "2025-10-13T00:00:00Z",
    "count": 6
  },
  "products": [
    {
      "id": "3f8b9b4e-6d2a-4c5e-9f1a-1a2d3e4f5a6b",
      "title": "Calculus I (Stewart) — 8th Edition",
      "description": "Good condition, some underlining/highlighting on early chapters. Includes access code (unused).",
      "category": "Textbooks",
      "tags": ["calculus", "math", "textbook"],
      "price_cents": 3500,
      "currency": "USD",
      "condition": "Used - Good",
      "location": "NAC Library",
      "images": [],
      "seller": {
        "id": "seller-1001",
        "name": "Alex P.",
        "verified": true,
        "contact": { "via": "in-app", "handle": "@alexp" }
      },
      "created_at": "2025-09-10T14:22:00Z",
      "shipping": false
    },
    {
      "id": "8a7c6d5e-4b3a-21f0-9e8d-7c6b5a4f3e2d",
      "title": "TI-84 Plus CE — Graphing Calculator",
      "description": "Lightly used TI-84 Plus CE. Small scuff on the corner; battery holds charge. Comes with protective case.",
      "category": "Electronics",
      "tags": ["calculator", "electronics"],
      "price_cents": 7000,
      "currency": "USD",
      "condition": "Used - Very Good",
      "location": "Marshak",
      "images": [],
      "seller": {
        "id": "seller-1002",
        "name": "Jamie L.",
        "verified": false,
        "contact": { "via": "phone", "number": "(555) 555-0123" }
      },
      "created_at": "2025-10-01T09:10:00Z",
      "shipping": false
    },
    {
      "id": "c1d2e3f4-a5b6-7890-cdef-1234567890ab",
      "title": "Mini Fridge — 3.2 cu ft",
      "description": "Compact mini fridge, includes power cord and removable shelf. Cleaned recently.",
      "category": "Dorm Essentials",
      "tags": ["appliances", "dorm"],
      "price_cents": 8500,
      "currency": "USD",
      "condition": "Used - Good",
      "location": "Towers Lobby",
      "images": [],
      "seller": {
        "id": "seller-1003",
        "name": "Morgan S.",
        "verified": true,
        "contact": { "via": "email", "address": "morgan@example.edu" }
      },
      "created_at": "2025-09-18T18:45:00Z",
      "shipping": false
    },
    {
      "id": "d4c3b2a1-0f9e-8d7c-6b5a-4e3f2a1b0c9d",
      "title": "Noise-Cancelling Headphones",
      "description": "Over-ear noise-cancelling headphones. Works great; minor cosmetic wear on the headband.",
      "category": "Electronics",
      "tags": ["audio", "headphones"],
      "price_cents": 5000,
      "currency": "USD",
      "condition": "Used - Good",
      "location": "Student Center",
      "images": [],
      "seller": {
        "id": "seller-1004",
        "name": "Taylor R.",
        "verified": false,
        "contact": { "via": "in-app", "handle": "@taylor" }
      },
      "created_at": "2025-08-30T12:00:00Z",
      "shipping": false
    },
    {
      "id": "f0e1d2c3-b4a5-6987-0f1e-2d3c4b5a6f7e",
      "title": "CS 111 Lecture Notes Bundle (PDF)",
      "description": "Digital delivery. Complete set of lecture notes and sample problems in PDF format. Immediate download after payment.",
      "category": "Textbooks",
      "tags": ["cs111", "notes", "digital"],
      "price_cents": 1000,
      "currency": "USD",
      "condition": "Digital",
      "location": "Digital Delivery",
      "images": [],
      "seller": {
        "id": "seller-1005",
        "name": "Riley K.",
        "verified": true,
        "contact": { "via": "email", "address": "riley@example.edu" }
      },
      "created_at": "2025-10-05T07:30:00Z",
      "shipping": false
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-111213141516",
      "title": "Desk Lamp + Bulb",
      "description": "Adjustable desk lamp with LED bulb. Sturdy base and flexible neck.",
      "category": "Dorm Essentials",
      "tags": ["lamp", "lighting"],
      "price_cents": 1200,
      "currency": "USD",
      "condition": "Used - Like New",
      "location": "Wille Admin",
      "images": [],
      "seller": {
        "id": "seller-1006",
        "name": "Jordan M.",
        "verified": false,
        "contact": { "via": "in-app", "handle": "@jordanm" }
      },
      "created_at": "2025-09-25T11:11:00Z",
      "shipping": false
    }
  ]
};
