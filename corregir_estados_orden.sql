-- Acomoda los pedidos que ya estén guardados en Railway a la nueva numeración
-- de EstadoOrden (se sacaron "Finalizado" y "Cancelado", que nunca se usaban).
--
-- Numeración vieja: 0 Pendiente, 1 EnProceso, 2 Finalizado, 3 Entregado,
--                    4 ListoParaEntregar, 5 EntregadoParcial, 6 Cancelado
-- Numeración nueva: 0 Pendiente, 1 EnProceso, 2 Entregado,
--                    3 ListoParaEntregar, 4 EntregadoParcial

-- PASO 1: corré primero esta consulta sola. En el código actual nadie asignaba nunca
-- "Finalizado" (2) ni "Cancelado" (6), así que debería devolver 0 filas. Si te devuelve
-- alguna, avisame antes de seguir al Paso 2 (esos pedidos necesitan una revisión aparte).
SELECT id, estado FROM orden_trabajo WHERE estado IN (2, 6);

-- PASO 2: si el Paso 1 dio 0 filas, corré estos 3 UPDATE juntos, en este orden exacto
-- (no los mezcles ni cambies el orden, se pisarían entre sí).
UPDATE orden_trabajo SET estado = 2 WHERE estado = 3; -- Entregado
UPDATE orden_trabajo SET estado = 3 WHERE estado = 4; -- ListoParaEntregar
UPDATE orden_trabajo SET estado = 4 WHERE estado = 5; -- EntregadoParcial
