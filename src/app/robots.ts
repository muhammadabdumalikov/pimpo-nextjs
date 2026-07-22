import type { MetadataRoute } from "next";

// Only the marketing/auth surface is indexable; everything else is the
// authenticated admin app (client-guarded only, so it must be excluded here).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signin", "/signup", "/terms", "/privacy"],
        disallow: [
          "/dashboard",
          "/checkout",
          "/cart",
          "/kassa",
          "/sales",
          "/products",
          "/add-product",
          "/edit-product",
          "/import-products",
          "/categories",
          "/inventory",
          "/stock-takes",
          "/stock-transfers",
          "/suppliers",
          "/receipts",
          "/reports",
          "/finance",
          "/user-debt",
          "/staff",
          "/staff-sales",
          "/roles",
          "/settings",
          "/subscription-management",
          "/upgrade-plan",
        ],
      },
    ],
    sitemap: "https://kpos.uz/sitemap.xml",
  };
}
