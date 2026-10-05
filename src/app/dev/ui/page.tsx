import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isProductionDeployment } from "@/shared/runtime";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardHeader } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Table } from "@/ui/table";
import { Textarea } from "@/ui/textarea";

import { InteractiveDemo } from "./interactive-demo";

export const metadata: Metadata = { title: "Sistema de diseño", robots: { index: false } };

type DemoTicket = { number: string; title: string; state: string; amount: string };

const tickets: DemoTicket[] = [
  {
    number: "TK-2026-0001",
    title: "Pulido e hidrolaqueado",
    state: "Finalizado",
    amount: "7.681.200",
  },
  {
    number: "TK-2026-0002",
    title: "Reemplazo de cortinas",
    state: "Coordinado",
    amount: "997.600",
  },
  { number: "TK-2026-0003", title: "Pérdida de gas", state: "Pendiente", amount: "—" },
];

export default function DesignSystemPage() {
  if (isProductionDeployment()) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm text-muted">Solo fuera de producción</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sistema de diseño</h1>
      </header>

      <Card>
        <CardHeader title="Botones" description="Objetivo táctil mínimo de 44 px." />
        <div className="flex flex-wrap gap-3">
          <Button>Aprobar presupuesto</Button>
          <Button variant="secondary">Ver detalle</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger">Rechazar</Button>
          <Button loading>Guardando</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Estados" description="Los 4 estados que ve el propietario." />
        <div className="flex flex-wrap gap-2">
          <Badge>Pendiente</Badge>
          <Badge tone="info">Presupuesto en revisión</Badge>
          <Badge tone="warning">Acción requerida</Badge>
          <Badge tone="success">Coordinado</Badge>
          <Badge tone="success">Finalizado</Badge>
          <Badge tone="danger">Urgente</Badge>
        </div>
      </Card>

      <Card>
        <CardHeader title="Formulario" />
        <form className="grid gap-4 sm:grid-cols-2">
          <Input id="demo-title" label="Título" placeholder="Ej.: Pérdida de agua en lavadero" />
          <Select
            id="demo-property"
            label="Propiedad"
            placeholder="Elegí una propiedad"
            options={[
              { value: "gb", label: "Grand Bourg" },
              { value: "nd", label: "Nordelta" },
            ]}
          />
          <Input
            id="demo-amount"
            label="Monto"
            inputMode="decimal"
            hint="En la moneda de la propiedad"
          />
          <Input
            id="demo-error"
            label="Proveedor"
            error="Asigná un proveedor antes de coordinar."
          />
          <div className="sm:col-span-2">
            <Textarea id="demo-description" label="Descripción" />
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Tabla" />
        <Table
          caption="Tickets de ejemplo"
          rows={tickets}
          rowKey={(t) => t.number}
          columns={[
            { key: "number", header: "Número", cell: (t) => t.number },
            { key: "title", header: "Título", cell: (t) => t.title },
            { key: "state", header: "Estado", cell: (t) => t.state },
            { key: "amount", header: "Monto (ARS)", cell: (t) => t.amount, align: "right" },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Carga" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </Card>

      <InteractiveDemo />
    </main>
  );
}
