"use client";

import { useState } from "react";

import { Button } from "@/ui/button";
import { Card, CardHeader } from "@/ui/card";
import { Modal } from "@/ui/modal";
import { ToastProvider, useToast } from "@/ui/toast";

function Actions() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <Card>
      <CardHeader title="Modal y avisos" />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Abrir modal
        </Button>
        <Button variant="secondary" onClick={() => toast("Presupuesto aprobado", "success")}>
          Mostrar aviso
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Aprobar presupuesto"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast("Presupuesto aprobado", "success");
              }}
            >
              Aprobar ARS 1.280.000
            </Button>
          </>
        }
      >
        Vas a aprobar el presupuesto PR-2026-0007 de José Luis Otazo.
      </Modal>
    </Card>
  );
}

export function InteractiveDemo() {
  return (
    <ToastProvider>
      <Actions />
    </ToastProvider>
  );
}
