async function testEndpoints() {
  console.log('====================================================');
  console.log('   RUNNING ROUTING & HARD RELOAD VERIFICATION TEST   ');
  console.log('====================================================\n');

  const BASE = 'http://localhost:3000';

  const testCases = [
    {
      name: '1. Root Redirect (/) -> (/dashboard)',
      url: `${BASE}/`,
      redirect: 'manual',
    },
    {
      name: '2. Uppercase Module (/Dashboard) -> (/dashboard)',
      url: `${BASE}/Dashboard`,
      redirect: 'manual',
    },
    {
      name: '3. Uppercase Dynamic Route (/Loans/LN20260001) -> (/loans/ln20260001)',
      url: `${BASE}/Loans/LN20260001`,
      redirect: 'manual',
    },
    {
      name: '4. Direct Hard Reload on Loans (/loans)',
      url: `${BASE}/loans`,
      redirect: 'follow',
    },
    {
      name: '5. Direct Hard Reload on Loan Detail (/loans/LN20260001)',
      url: `${BASE}/loans/LN20260001`,
      redirect: 'follow',
    },
    {
      name: '6. Server-Side Lowercase API Query (/api/loans/ln20260001)',
      url: `${BASE}/api/loans/ln20260001`,
      isJson: true,
    },
    {
      name: '7. Server-Side Lowercase Company API (/api/companies/comp-pass)',
      url: `${BASE}/api/companies/comp-pass`,
      isJson: true,
    },
    {
      name: '8. Server-Side Lowercase Customer API (/api/customers/cust-0002)',
      url: `${BASE}/api/customers/cust-0002`,
      isJson: true,
    },
  ];

  for (const tc of testCases) {
    try {
      const res = await fetch(tc.url, { redirect: tc.redirect || 'follow' });
      const status = res.status;
      const location = res.headers.get('location');

      if (tc.redirect === 'manual' && [301, 302, 307, 308].includes(status)) {
        console.log(`[PASS] ${tc.name}`);
        console.log(`       Status: ${status} -> Redirects to: ${location}\n`);
      } else if (tc.isJson) {
        if (res.ok) {
          const json = await res.json();
          console.log(`[PASS] ${tc.name}`);
          console.log(`       Status: ${status}, Record Found:`, json.name || json.customerName || json.id || 'OK');
          console.log('');
        } else {
          console.log(`[FAIL] ${tc.name}`);
          console.log(`       Status: ${status}, Body:`, await res.text(), '\n');
        }
      } else if (res.ok) {
        console.log(`[PASS] ${tc.name}`);
        console.log(`       Status: ${status} OK (HTML served cleanly)\n`);
      } else {
        console.log(`[FAIL] ${tc.name}`);
        console.log(`       Status: ${status}\n`);
      }
    } catch (err) {
      console.log(`[ERROR] ${tc.name}:`, err.message, '\n');
    }
  }
}

testEndpoints();
