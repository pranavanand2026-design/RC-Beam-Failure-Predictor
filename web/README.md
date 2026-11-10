# Web

Next.js frontend for RC Beam Fire Studio, exported as a static site and served by Netlify.

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev        # http://localhost:3000
npm run build      # static export to out/
```

The prediction API must be running (see the root README). Without `NEXT_PUBLIC_API_URL`, the app
falls back to the production API URL in `src/lib/api.ts`.
