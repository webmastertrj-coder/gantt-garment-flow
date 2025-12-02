-- Update fecha_desbloqueo to be 14 days after the later of lanzamiento_capsula or ingreso_a_bodega
UPDATE "references" 
SET fecha_desbloqueo = CASE 
  WHEN ingreso_a_bodega IS NOT NULL AND ingreso_a_bodega > lanzamiento_capsula 
    THEN (ingreso_a_bodega + INTERVAL '14 days')::date
  ELSE (lanzamiento_capsula + INTERVAL '14 days')::date
END
WHERE lanzamiento_capsula IS NOT NULL;