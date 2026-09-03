-- Columna para la foto de perfil (guardada como texto en base64)
ALTER TABLE usuarios ADD COLUMN foto_base64 text;

-- (Recomendado, no obligatorio) avisarle a Entity Framework que esta migración ya se aplicó.
-- Si tu consola no acepta esta línea, está bien saltearla, no rompe nada de lo de arriba.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260903145602_AgregarFotoPerfilUsuario', '10.0.5');
