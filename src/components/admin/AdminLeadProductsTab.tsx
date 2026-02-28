"use client";

import { useState } from "react";
import { Package, ExternalLink, Loader2 } from "lucide-react";
import { LeadProduct, ProductTemplate, LeadProductStatus } from "@/types";

interface AdminLeadProductsTabProps {
  leadId: string;
  leadProducts: LeadProduct[];
  allProducts: ProductTemplate[];
}

function StatusBadge({ status, activatedAt, announcedAt }: { status: LeadProductStatus | null; activatedAt: string | null; announcedAt: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Nicht zugewiesen
      </span>
    );
  }
  if (status === "activated") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Aktiv
        </span>
        {activatedAt && (
          <span className="text-xs text-gray-400">
            seit {new Date(activatedAt).toLocaleDateString("de-DE")}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Angekündigt
      </span>
      {announcedAt && (
        <span className="text-xs text-gray-400">
          seit {new Date(announcedAt).toLocaleDateString("de-DE")}
        </span>
      )}
    </div>
  );
}

function includeBadge(template: ProductTemplate): string {
  const p = template.payload ?? { tasks: [], sessions: [], materials: [] };
  const taskCount = Array.isArray(p.tasks) ? p.tasks.length : 0;
  const sessionCount = Array.isArray(p.sessions) ? p.sessions.length : 0;
  const matCount = Array.isArray(p.materials) ? p.materials.length : 0;
  const parts = [
    taskCount > 0 ? `${taskCount} Aufgabe${taskCount !== 1 ? "n" : ""}` : null,
    sessionCount > 0 ? `${sessionCount} Session${sessionCount !== 1 ? "s" : ""}` : null,
    matCount > 0 ? `${matCount} Materialien` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Leer";
}

export function AdminLeadProductsTab({ leadId, leadProducts: initialLeadProducts, allProducts }: AdminLeadProductsTabProps) {
  const [leadProducts, setLeadProducts] = useState<LeadProduct[]>(initialLeadProducts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build a map of product_template_id → lead_product
  const lpMap = new Map<string, LeadProduct>();
  for (const lp of leadProducts) {
    lpMap.set(lp.product_template_id, lp);
  }

  // Sort: assigned products first, then unassigned
  const sortedProducts = [...allProducts].sort((a, b) => {
    const aHas = lpMap.has(a.id) ? 0 : 1;
    const bHas = lpMap.has(b.id) ? 0 : 1;
    return aHas - bHas;
  });

  async function handleAnnounce(productTemplateId: string) {
    setLoading(productTemplateId + "-announce");
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_template_id: productTemplateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setLeadProducts((prev) => [...prev, data as LeadProduct]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  async function handleActivate(leadProductId: string, productTemplateId: string) {
    setLoading(productTemplateId + "-activate");
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/products/${leadProductId}/activate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setLeadProducts((prev) =>
        prev.map((lp) => (lp.id === leadProductId ? (data as LeadProduct) : lp))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  async function handleActivateDirect(productTemplateId: string) {
    // Announce first, then activate
    setLoading(productTemplateId + "-activate");
    setError(null);
    try {
      const announceRes = await fetch(`/api/leads/${leadId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_template_id: productTemplateId }),
      });
      const announceData = await announceRes.json();
      if (!announceRes.ok) throw new Error(announceData.error ?? "Fehler beim Ankündigen");

      const lp = announceData as LeadProduct;
      setLeadProducts((prev) => [...prev, lp]);

      const activateRes = await fetch(`/api/leads/${leadId}/products/${lp.id}/activate`, {
        method: "POST",
      });
      const activateData = await activateRes.json();
      if (!activateRes.ok) throw new Error(activateData.error ?? "Fehler beim Aktivieren");

      setLeadProducts((prev) =>
        prev.map((p) => (p.id === lp.id ? (activateData as LeadProduct) : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(leadProductId: string) {
    setLoading(leadProductId + "-remove");
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/products/${leadProductId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Fehler");
      }
      setLeadProducts((prev) => prev.filter((lp) => lp.id !== leadProductId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#0f2b3c]">Produkte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Produktzuweisungen für diesen Lead verwalten
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {allProducts.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Keine aktiven Produktvorlagen vorhanden.</p>
          <p className="mt-1 text-xs text-gray-400">
            Erstellen Sie Produktvorlagen unter Library → Produkt-Vorlagen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedProducts.map((product) => {
            const lp = lpMap.get(product.id) ?? null;
            const isLoading =
              loading === product.id + "-announce" ||
              loading === product.id + "-activate" ||
              (lp && loading === lp.id + "-remove");

            return (
              <div
                key={product.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border bg-white p-4 shadow-sm"
              >
                {/* Left: icon + name + includes */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Package className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#0f2b3c]">{product.name}</p>
                    <p className="text-xs text-gray-400">{includeBadge(product)}</p>
                    {product.description && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                </div>

                {/* Middle: status */}
                <div className="w-36 shrink-0">
                  <StatusBadge
                    status={lp?.status ?? null}
                    activatedAt={lp?.activated_at ?? null}
                    announcedAt={lp?.announced_at ?? null}
                  />
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : lp === null ? (
                    // Not assigned
                    <>
                      <button
                        onClick={() => handleAnnounce(product.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Ankündigen
                      </button>
                      <button
                        onClick={() => handleActivateDirect(product.id)}
                        className="rounded-lg bg-[#2d8a8a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#267878]"
                      >
                        Aktivieren
                      </button>
                    </>
                  ) : lp.status === "announced" ? (
                    // Announced
                    <>
                      <button
                        onClick={() => handleActivate(lp.id, product.id)}
                        className="rounded-lg bg-[#2d8a8a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#267878]"
                      >
                        Aktivieren
                      </button>
                      <button
                        onClick={() => handleRemove(lp.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        Entfernen
                      </button>
                    </>
                  ) : (
                    // Activated
                    <>
                      {product.tag_id && (
                        <a
                          href={`/admin/leads/${leadId}?tab=materials`}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-[#2d8a8a] hover:bg-gray-50"
                        >
                          Zur Materialansicht
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
