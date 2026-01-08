# Fitbit Meal Logger - Project Index

Complete, production-ready backend for logging meals to Fitbit via Custom GPT Actions.

## 🚀 Start Here

1. **New User?** → Read **QUICKSTART.md** (5 minutes to running)
2. **Setting Up?** → Read **SETUP.md** (step-by-step guide)
3. **Configuring GPT?** → Read **CUSTOM_GPT_INSTRUCTIONS.md**
4. **Need API Docs?** → Read **README.md** or visit `/documentation`

## 📁 File Guide

### Documentation
| File | Purpose |
|------|---------|
| **QUICKSTART.md** | Get running in 5 minutes |
| **SETUP.md** | Detailed setup instructions |
| **README.md** | Complete API documentation, usage examples |
| **PROJECT_SUMMARY.md** | Architecture, tech stack, design decisions |
| **FITBIT_REFERENCE.md** | Fitbit API constants, unit IDs, meal types |
| **CUSTOM_GPT_INSTRUCTIONS.md** | Template for configuring Custom GPT |

### Code
| File | Purpose |
|------|---------|
| **src/server.ts** | Main Fastify app, routes, auth hooks |
| **src/config.ts** | Environment variable validation |
| **src/db.ts** | SQLite database layer |
| **src/fitbitClient.ts** | Fitbit OAuth & API client |
| **src/routes/auth.ts** | OAuth flow endpoints |
| **src/routes/foods.ts** | Food creation & registration |
| **src/routes/meals.ts** | Meal logging with idempotency |
| **src/routes/units.ts** | Fitbit units proxy |

### Configuration
| File | Purpose |
|------|---------|
| **package.json** | Dependencies & scripts |
| **tsconfig.json** | TypeScript configuration |
| **.nvmrc** | Node version specification (20) |
| **.env** | Environment variables (create from QUICKSTART) |
| **.gitignore** | Git ignore rules |
| **.dockerignore** | Docker ignore rules |

### Deployment
| File | Purpose |
|------|---------|
| **Dockerfile** | Docker image definition |
| **docker-compose.yml** | Docker Compose configuration |

### Testing & Examples
| File | Purpose |
|------|---------|
| **test-api.sh** | Automated API test script |
| **examples.http** | REST Client / cURL examples |

## 🎯 Quick Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Run production build

./test-api.sh           # Run API tests (requires API_KEY env var)

docker-compose up -d     # Run with Docker
```

## 📊 Project Stats

- **Language**: TypeScript
- **Framework**: Fastify
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod
- **Lines of Code**: ~1,500
- **Endpoints**: 9 (4 public, 5 protected)
- **Dependencies**: 11 (production)

## 🔑 Key Features

✅ Strict validation (no inference, no guessing)  
✅ OAuth 2.0 with automatic token refresh  
✅ SQLite storage for foods & tokens  
✅ Idempotency support for meal logging  
✅ OpenAPI/Swagger documentation  
✅ API key authentication  
✅ Docker support  
✅ Production-ready error handling  

## 🏗️ Architecture

```
Custom GPT → API Key Auth → Fastify Server → SQLite DB
                                ↓
                         Fitbit OAuth 2.0 API
```

## 📡 Endpoints

### Public (No Auth)
- `GET /health` - Health check
- `GET /auth/start` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /documentation` - Swagger UI
- `GET /openapi.json` - OpenAPI spec

### Protected (X-API-Key Required)
- `GET /foods` - List registered foods
- `POST /foods` - Create custom food in Fitbit
- `POST /foods/register` - Register existing Fitbit food
- `POST /meals/log` - Log a meal
- `GET /units` - Get Fitbit units list

## 🔐 Security

- API key required for all protected endpoints
- Fitbit tokens stored in SQLite, never exposed
- All secrets in environment variables
- CORS disabled by default
- Rate limiting recommended for production

## 🚢 Deployment Options

1. **VPS/Server** - Node.js + PM2
2. **Docker** - Use provided Dockerfile & docker-compose.yml
3. **Cloud** - Deploy to any Node.js hosting (Heroku, Railway, Fly.io, etc.)

## 📚 Learning Path

1. Read QUICKSTART.md and get it running locally
2. Test the API using examples.http or test-api.sh
3. Read FITBIT_REFERENCE.md to understand Fitbit API
4. Read PROJECT_SUMMARY.md to understand the architecture
5. Configure Custom GPT using CUSTOM_GPT_INSTRUCTIONS.md
6. Deploy to production using README.md guidance

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| better-sqlite3 won't compile | Use Node.js 20 (not 22 or 24) |
| Missing env vars | Create .env file (see QUICKSTART.md) |
| Unauthorized errors | Check X-API-Key header matches .env |
| No tokens found | Complete OAuth flow at /auth/start |
| Fitbit errors (502) | Check error body for Fitbit details |

## 🤝 Support

- Fitbit API Docs: https://dev.fitbit.com/
- Node.js Docs: https://nodejs.org/docs
- Fastify Docs: https://www.fastify.io/docs
- TypeScript Docs: https://www.typescriptlang.org/docs

## 📝 License

MIT

---

**Built with TypeScript, Fastify, and SQLite**  
**Designed for Custom GPT Actions**  
**Production-ready and fully documented**
