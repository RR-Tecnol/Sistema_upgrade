const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'cursos_db',
  user: 'cursos_user',
  password: 'cursos_password',
});

async function cleanup() {
  await client.connect();
  console.log('Conectado. Limpando...\n');

  // 1. Restaurar aluno@qualifica.com
  const r1 = await client.query(
    "UPDATE users SET email = 'aluno@qualifica.com', role = 'STUDENT', \"updatedAt\" = NOW() WHERE id = '51e5fcf0-89e3-42d9-b8f0-66ed1519af6e'"
  );
  console.log('1. aluno@qualifica.com restaurado:', r1.rowCount, 'row(s)');

  // 2. Reverter masstest para STUDENT
  const r2 = await client.query(
    "UPDATE users SET role = 'STUDENT', \"updatedAt\" = NOW() WHERE email = 'masstest_1775583212210@evil.com'"
  );
  console.log('2. masstest role revertido para STUDENT:', r2.rowCount, 'row(s)');

  // 3. Deletar todos os usuarios de teste
  const r3 = await client.query(
    "DELETE FROM users WHERE email IN ('hacker_sec01_1775582490415@evil.com','xsstest17755825695490@evil.com','xsstest17755825696221@evil.com','xsstest17755825697022@evil.com','xsstest17755825697773@evil.com','pentest_sec04@hack.com','pentest_s04_1775583005581@hack.com','masstest_1775583212210@evil.com')"
  );
  console.log('3. Usuarios de teste deletados:', r3.rowCount, 'row(s)');

  // 4. Deletar Grupo Hack
  const r4 = await client.query("DELETE FROM groups WHERE name = 'Grupo Hack'");
  console.log('4. Grupo Hack deletado:', r4.rowCount, 'row(s)');

  // 5. Deletar Curso Hack
  const r5 = await client.query("DELETE FROM courses WHERE name = 'Curso Hack'");
  console.log('5. Curso Hack deletado:', r5.rowCount, 'row(s)');

  // 6. Deletar cidade SSRF
  const r6 = await client.query("DELETE FROM cities WHERE name LIKE 'SSRFTest%'");
  console.log('6. Cidade SSRFTest deletada:', r6.rowCount, 'row(s)');

  // 7. Deletar reembolso simples de teste
  const r7 = await client.query("DELETE FROM reimbursements WHERE description = 'Teste' AND amount = 50.00");
  console.log('7. Reembolso de teste deletado:', r7.rowCount, 'row(s)');

  // 8. Deletar reembolso de manutenção de teste
  const r8 = await client.query("DELETE FROM reimbursements WHERE description LIKE '%Teste emergencia%'");
  console.log('8. Reembolso manutencao deletado:', r8.rowCount, 'row(s)');

  console.log('\n=== VERIFICACAO FINAL ===');
  const v1 = await client.query("SELECT email, role FROM users WHERE email = 'aluno@qualifica.com'");
  console.log('aluno@qualifica.com:', v1.rows.length > 0 ? 'RESTAURADO — role: ' + v1.rows[0].role : 'NAO ENCONTRADO (erro!)');

  const v2 = await client.query("SELECT COUNT(*) as c FROM users WHERE email LIKE '%evil.com%' OR email LIKE '%hack.com%'");
  console.log('Users evil/hack restantes:', v2.rows[0].c, v2.rows[0].c === '0' ? 'OK' : 'ATENCAO');

  const v3 = await client.query("SELECT COUNT(*) as c FROM groups WHERE name LIKE '%Hack%'");
  console.log('Grupos Hack:', v3.rows[0].c, v3.rows[0].c === '0' ? 'OK' : 'ATENCAO');

  const v4 = await client.query("SELECT COUNT(*) as c FROM courses WHERE name LIKE '%Hack%'");
  console.log('Cursos Hack:', v4.rows[0].c, v4.rows[0].c === '0' ? 'OK' : 'ATENCAO');

  const v5 = await client.query("SELECT COUNT(*) as c FROM cities WHERE name LIKE 'SSRF%'");
  console.log('Cidades SSRF:', v5.rows[0].c, v5.rows[0].c === '0' ? 'OK' : 'ATENCAO');

  await client.end();
  console.log('\nLimpeza concluida!');
}

cleanup().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
