import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator } from "lucide-react";
import { calculateDistribution } from "@/lib/distributionCalculator";

interface Reference {
  id: string;
  referencia: string;
  curva: string;
  cantidad: number;
  ingreso_a_bodega: string | null;
  lanzamiento_capsula: string | null;
  fecha_desbloqueo: string | null;
  dias_desbloqueado: number | null;
  cantidad_colores: string | null;
  created_at: string;
  updated_at: string;
}

interface EditReferenceForm {
  referencia: string;
  ingresoABodega?: string;
  lanzamientoCapsula?: string;
  curva: string;
  cantidad: number;
  distribucion?: string;
  cantidadColores?: string;
}

interface EditReferenceDialogProps {
  reference: Reference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReferenceUpdated: () => void;
}

const curvaOptions = [
  { value: "XS-S-M-L-XL", label: "XS-S-M-L-XL" },
  { value: "XS-S-M-L", label: "XS-S-M-L" },
  { value: "S-M-L-XL", label: "S-M-L-XL" },
  { value: "S-M-L", label: "S-M-L" },
  { value: "XL-XXL-XXXL", label: "XL-XXL-XXXL" },
  { value: "XL-XXL-3XL", label: "XL-XXL-3XL" },
  { value: "28-30-32-34-36", label: "28-30-32-34-36" },
  { value: "28-30-32-34-36-40", label: "28-30-32-34-36-40" },
  { value: "06-08-10-12", label: "06-08-10-12" },
  { value: "06-08-10-12-14", label: "06-08-10-12-14" },
  { value: "14-16-18-20", label: "14-16-18-20" },
  { value: "14-16-18-20-22", label: "14-16-18-20-22" },
  { value: "ONE-SIZE", label: "Talla Única" }
];

const EditReferenceDialog = ({ reference, open, onOpenChange, onReferenceUpdated }: EditReferenceDialogProps) => {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditReferenceForm>();
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);

  const selectedCurva = watch("curva");
  const selectedCantidadColores = watch("cantidadColores");

  useEffect(() => {
    const result = calculateDistribution(selectedCurva, selectedCantidadColores);
    
    if (result) {
      setValue("cantidad", result.total);
      setValue("distribucion", result.distribution);
      setIsAutoCalculated(true);
    } else {
      setIsAutoCalculated(false);
    }
  }, [selectedCurva, selectedCantidadColores, setValue]);

  useEffect(() => {
    if (reference && open) {
      setValue("referencia", reference.referencia);
      setValue("curva", reference.curva);
      setValue("cantidad", reference.cantidad);
      setValue("ingresoABodega", reference.ingreso_a_bodega || "");
      setValue("lanzamientoCapsula", reference.lanzamiento_capsula || "");
      setValue("distribucion", (reference as any).distribucion || "");
      setValue("cantidadColores", reference.cantidad_colores || "");
    }
  }, [reference, open, setValue]);

  const onSubmit = async (data: EditReferenceForm) => {
    if (!reference) return;

    try {
      const { error } = await supabase
        .from('references')
        .update({
          referencia: data.referencia,
          ingreso_a_bodega: data.ingresoABodega || null,
          lanzamiento_capsula: data.lanzamientoCapsula || null,
          curva: data.curva,
          cantidad: data.cantidad,
          distribucion: data.distribucion || null,
          cantidad_colores: data.cantidadColores || null
        })
        .eq('id', reference.id);

      if (error) {
        console.error('Error updating reference:', error);
        toast({
          title: "Error",
          description: "Hubo un error al actualizar la referencia. Por favor, intenta de nuevo.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Referencia actualizada",
        description: `La referencia ${data.referencia} ha sido actualizada exitosamente.`,
      });
      onReferenceUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating reference:', error);
      toast({
        title: "Error",
        description: "Hubo un error inesperado. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      reset();
      setIsAutoCalculated(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Referencia</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia *</Label>
            <Input
              id="referencia"
              placeholder="Ej: XiI5bZiVniqX9ZCP"
              {...register("referencia", { 
                required: "La referencia es obligatoria" 
              })}
            />
            {errors.referencia && (
              <p className="text-sm text-destructive">{errors.referencia.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingresoABodega">Ingreso a Bodega</Label>
            <Input
              id="ingresoABodega"
              type="date"
              {...register("ingresoABodega")}
            />
            <p className="text-xs text-muted-foreground">Campo opcional</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lanzamientoCapsula">Lanzamiento Cápsula</Label>
            <Input
              id="lanzamientoCapsula"
              type="date"
              {...register("lanzamientoCapsula")}
            />
            <p className="text-xs text-muted-foreground">Campo opcional</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curva">Curva *</Label>
            <Select onValueChange={(value) => setValue("curva", value)} value={selectedCurva}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una curva" />
              </SelectTrigger>
              <SelectContent>
                {curvaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.curva && (
              <p className="text-sm text-destructive">{errors.curva.message}</p>
            )}
            <input
              type="hidden"
              {...register("curva", { required: "La curva es obligatoria" })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidadColores">Cantidad de Colores</Label>
            <Select onValueChange={(value) => setValue("cantidadColores", value)} value={selectedCantidadColores}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cantidad de colores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 color">1 color</SelectItem>
                <SelectItem value="2 colores">2 colores</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Campo opcional</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              {isAutoCalculated && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Calculator className="h-3 w-3" />
                  <span>Auto-calculado</span>
                </div>
              )}
            </div>
            <Input
              id="cantidad"
              type="number"
              min="1"
              placeholder="Ej: 75"
              readOnly={isAutoCalculated}
              className={isAutoCalculated ? "bg-muted/50 cursor-not-allowed" : ""}
              {...register("cantidad", { 
                required: "La cantidad es obligatoria",
                min: { value: 1, message: "La cantidad debe ser mayor a 0" },
                valueAsNumber: true
              })}
            />
            {errors.cantidad && (
              <p className="text-sm text-destructive">{errors.cantidad.message}</p>
            )}
            {isAutoCalculated && (
              <p className="text-xs text-muted-foreground">
                Calculado automáticamente según la curva y cantidad de colores
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="distribucion">Distribución</Label>
              {isAutoCalculated && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Calculator className="h-3 w-3" />
                  <span>Auto-calculado</span>
                </div>
              )}
            </div>
            <Input
              id="distribucion"
              placeholder="Ej: 10-20-30-15"
              readOnly={isAutoCalculated}
              className={isAutoCalculated ? "bg-muted/50 cursor-not-allowed" : ""}
              {...register("distribucion")}
            />
            {isAutoCalculated ? (
              <p className="text-xs text-muted-foreground">
                Calculado automáticamente según la curva y cantidad de colores
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Campo opcional</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Actualizar Referencia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReferenceDialog;