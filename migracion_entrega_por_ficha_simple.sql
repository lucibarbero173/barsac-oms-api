-- Entrega por ficha (para poder entregar un pedido dividido en varias tandas)
ALTER TABLE ficha_produccion ADD COLUMN entregada boolean NOT NULL DEFAULT false;
ALTER TABLE ficha_produccion ADD COLUMN fecha_entrega_ficha timestamp without time zone;

-- (Recomendado, no obligatorio) avisarle a Entity Framework que esta migración ya se aplicó.
-- Si tu consola no acepta esta línea, está bien saltearla, no rompe nada de lo de arriba.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260916142338_AgregarEntregaPorFicha', '10.0.5');
