# OpenAI setup

Never hardcode OpenAI API keys in source code, browser code, commits, or documentation.

## Immediate key handling

If an API key was pasted into chat, an issue, a commit, or logs, treat it as exposed:

1. Revoke the exposed key in the OpenAI dashboard.
2. Create a replacement key.
3. Store the replacement only as an environment variable or Azure App Service setting.

## Required environment variable

Use this setting name:

```text
OPENAI_API_KEY=<rotated-openai-api-key>
```

For Azure App Service, set it as an application setting, not in the repository:

```powershell
az webapp config appsettings set `
  --name devforgesolutions-saas-app-24 `
  --resource-group devforge-saas-rg `
  --settings OPENAI_API_KEY="<rotated-openai-api-key>"
```

## Safe server-side usage pattern

Only use OpenAI from server-side code.

```js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runExample() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: 'write a haiku about ai'
  });

  return response.output_text;
}
```

## Important rules

- Do not put API keys in `public/` files.
- Do not put API keys in `.env` files that might be copied or shared.
- Do not commit API keys.
- Do not expose the key to the browser.
- Use `OPENAI_MODEL` if the model needs to be changed without code changes.

