-- Genera las prendas individuales faltantes para las fichas que ya existían
-- antes de este cambio. Seguro de correr más de una vez: solo agrega lo que
-- falta, nunca duplica ni toca prendas que ya estén controladas.

WITH conteo AS (
    SELECT d.id AS detalle_id, d.cantidades, COUNT(p.id) AS existentes
    FROM detalle_ficha_produccion d
    LEFT JOIN prenda_unidad p ON p.detalle_ficha_produccion_id = d.id
    GROUP BY d.id, d.cantidades
)
INSERT INTO prenda_unidad (detalle_ficha_produccion_id, controlada)
SELECT c.detalle_id, false
FROM conteo c
CROSS JOIN LATERAL generate_series(1, c.cantidades - c.existentes)
WHERE c.cantidades > c.existentes;
