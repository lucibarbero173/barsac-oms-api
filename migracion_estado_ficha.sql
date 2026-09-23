-- Cada ficha de producción ahora tiene su propio estado (Diseño/Corte/Apto Confección),
-- en vez de compartir el estado de toda la orden. Esto soluciona que una ficha nueva
-- "heredara" el estado avanzado de otra ficha vieja de la misma orden.
ALTER TABLE ficha_produccion ADD COLUMN estado_ficha integer NOT NULL DEFAULT 0;

-- Backfill: a cada ficha existente le copiamos el estado que tenía su orden, para no
-- perder el progreso ya cargado. Si la orden ya estaba en un estado de ENTREGA
-- (Entregado=2, ListoParaEntregar=3, EntregadoParcial=4), esos valores no existen para
-- una ficha individual, así que se traducen a "Apto Confección" (7) — si ya se entregó,
-- la producción de esa ficha necesariamente ya estaba terminada.
UPDATE ficha_produccion fp
SET estado_ficha = CASE
    WHEN o.estado IN (2, 3, 4) THEN 7
    ELSE o.estado
END
FROM orden_trabajo o
WHERE fp.orden_id = o.id;

-- (Recomendado, no obligatorio) avisarle a Entity Framework que esta migración ya se aplicó.
-- Si tu consola no acepta esta línea, está bien saltearla, no rompe nada de lo de arriba.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260923122937_AgregarEstadoFicha', '10.0.5');
