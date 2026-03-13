-- Script para adicionar CPF aos usuários admin existentes
-- Execute este script no seu banco de dados PostgreSQL

-- Atualizar o admin principal com um CPF de exemplo
-- IMPORTANTE: Substitua '12345678900' pelo CPF real do administrador
UPDATE "User"
SET cpf = '12345678900'
WHERE email = 'admin@qualifica.com' AND role = 'ADMIN';

-- Se você tiver outros admins ou coordenadores, adicione aqui:
-- UPDATE "User"
-- SET cpf = 'CPF_DO_COORDENADOR'
-- WHERE email = 'coordenador@qualifica.com' AND role = 'COORDINATOR';

-- Verificar os usuários atualizados
SELECT id, email, cpf, name, role 
FROM "User" 
WHERE role IN ('ADMIN', 'COORDINATOR')
ORDER BY role, name;
