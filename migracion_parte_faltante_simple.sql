-- Parte específica de la prenda que falta (frente, manga, capucha, etc.), separada
-- del texto libre de detalle, para poder sacar estadísticas de scrap más adelante.
ALTER TABLE prenda_unidad ADD COLUMN corte_parte_faltante integer;

-- (Recomendado, no obligatorio) avisarle a Entity Framework que esta migración ya se aplicó.
-- Si tu consola no acepta esta línea, está bien saltearla, no rompe nada de lo de arriba.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260917105052_AgregarParteFaltante', '10.0.5');
