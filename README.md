# JWK CLI Tool

Simple interactive CLI to generate:
- PEM key pairs (`.private.pem`, `.public.pem`)
- JWK JSON files (`.private.jwk.json`, `.public.jwk.json`)

## Requirements

- Node.js 18 or newer
- npm

## Install

```bash
npm install
```

## Run

### Development mode

```bash
npm run dev
```

### Production mode

```bash
npm run build
npm start
```

## How to use

When the CLI starts, choose one option:

1. `Generate new PEM key pair`
2. `Generate JWK JSON files`
3. `Exit`

### 1) Generate new PEM key pair

You will be asked:
- key name
- key type (`EC` or `RSA`)
- algorithm (based on selected type)

Files created in `keys/`:
- `keys/<name>.private.pem`
- `keys/<name>.public.pem`

### 2) Generate JWK JSON files

You will be asked:
- PEM source:
  - generate new PEM key pair, or
  - use existing PEM files from `keys/`
- `use` (`sig` or `enc`)
- `kid` (defaults to key name)
- algorithm only when needed (for existing RSA PEM)

Files created in `outputs/`:
- `outputs/<name>.private.jwk.json`
- `outputs/<name>.public.jwk.json`

The CLI also prints a public JWK preview in the terminal.

## Supported algorithms

- EC: `ES256`, `ES384`, `ES512`
- RSA: `RS256`, `RS384`, `RS512`

## Notes

- `keys/` and `outputs/` are auto-created if missing.
- If a key name already exists, CLI asks whether to overwrite.
