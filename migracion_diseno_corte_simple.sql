-- 1. Etapa Diseño y Corte por cada prenda individual
ALTER TABLE prenda_unidad ADD COLUMN diseno_listo boolean NOT NULL DEFAULT false;
ALTER TABLE prenda_unidad ADD COLUMN fecha_diseno timestamp without time zone;
ALTER TABLE prenda_unidad ADD COLUMN diseno_por_usuario_id integer;

ALTER TABLE prenda_unidad ADD COLUMN corte_estado integer NOT NULL DEFAULT 0;
ALTER TABLE prenda_unidad ADD COLUMN corte_detalle_faltante text;
ALTER TABLE prenda_unidad ADD COLUMN fecha_corte timestamp without time zone;
ALTER TABLE prenda_unidad ADD COLUMN cortado_por_usuario_id integer;

CREATE INDEX "IX_prenda_unidad_diseno_por_usuario_id" ON prenda_unidad (diseno_por_usuario_id);
CREATE INDEX "IX_prenda_unidad_cortado_por_usuario_id" ON prenda_unidad (cortado_por_usuario_id);

ALTER TABLE prenda_unidad ADD CONSTRAINT "FK_prenda_unidad_usuarios_diseno_por_usuario_id"
    FOREIGN KEY (diseno_por_usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL;

ALTER TABLE prenda_unidad ADD CONSTRAINT "FK_prenda_unidad_usuarios_cortado_por_usuario_id"
    FOREIGN KEY (cortado_por_usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL;

-- 2. Imagen de diseño de la ficha (reemplaza el Word aparte)
ALTER TABLE ficha_produccion ADD COLUMN imagen_diseno_base64 text;

-- 3. (Recomendado, no obligatorio) avisarle a Entity Framework que esta migración ya se aplicó.
--    Si tu consola no acepta esta línea, está bien saltearla, no rompe nada de lo de arriba.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260914154541_AgregarEtapasDisenoYCorte', '10.0.5');
