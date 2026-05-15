async function main() {
  try {
    const login = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@upgrade.com', password: 'upgrade123' })
    });
    const loginData = await login.json();
    const token = loginData.accessToken;

    const res = await fetch('http://localhost:3002/api/stock/items/with-purchase-request', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        item: {
          nome: "Fetch Test",
          categoria: "OUTRO",
          unidade: "un",
          quantidadeAtual: 0,
          quantidadeMinima: 10
        },
        purchaseRequest: {
          quantidade: 5,
          precoUnitario: 10,
          justificativa: "Estoque inicial automático."
        }
      })
    });

    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
main();
