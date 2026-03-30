# DISIS DISPATCH — disis-nfc-project

Estructura reorganizada para separar backend, cliente y documentación de diseño.

## Estructura

- `backend/`: servidor Node.js, Express y Prisma (microservicio satélite).
- `mobile/`: aplicación cliente (actualmente Next.js; aquí irá el proyecto React Native cuando migres).
- `docs/`: flujograma (imagen) y esquema de base de datos (`.dbml`).

## Backend (microservicio)

Ruta: `backend`

Estructura base creada:

- `src/api`
- `src/services`
- `src/lib`
- `src/tests`
- `prisma/schema.prisma`
- `.env`

## Frontend (interfaz)

Ruta: `mobile`

Carpeta integrada y renombrada desde `interfaz despacho` para mantener nombres estándar y evitar espacios en rutas.

## Mock sin hardware

### Backend

- Ruta creada: `POST /api/v1/internal/mock-sale`
- Ruta reset de datos: `POST /api/v1/internal/reset-demo`
- Ruta wallet cliente: `GET /api/v1/internal/wallet/:nfcUid`
- Ruta resumen admin: `GET /api/v1/internal/admin/summary`
- Archivo: `backend/src/api/internal.routes.js`
- Comportamiento:
  - Crea o actualiza la billetera de prueba.
  - Usa `nfcUid` por defecto: `BRAZALETE_TEST_01`.
  - Si la wallet existe, no recarga inventario a menos que envies `recharge: true`.
  - Crea items mock si no se envian en el body.
  - Devuelve wallet con totales de prepagado/consumido/saldo.

### Frontend

- Boton agregado: `Simular Escaneo`
- Archivo: `mobile/components/dispatch-dashboard.tsx`
- Al presionarlo:
  - Envia `BRAZALETE_TEST_01` al backend.
  - Endpoint usado: `/api/v1/internal/mock-sale`.
  - Si responde OK, avanza como escaneo autorizado.

### Variable recomendada en UI

En `mobile/.env.local`:

`NEXT_PUBLIC_DISPATCH_API_URL=http://localhost:3001`
`NEXT_PUBLIC_INTERNAL_API_KEY=DEMO_KEY_123`

## Demo en tiempo real (Socket.IO)

### Backend realtime

- Evento emitido en despacho exitoso: `update-inventory`
- Payload: `{ sku, globalStock }`
- Emision: `io.emit("update-inventory", { sku, globalStock })`
- Endpoint de despacho: `POST /api/v1/dispatch`
- Endpoint de inventario inicial: `GET /api/v1/internal/inventory`

### Pantalla Admin de Pruebas

- Ruta: `http://localhost:3000/admin`
- Archivo: `mobile/app/admin/page.jsx`
- Se conecta por Socket.IO y actualiza inventario global en vivo.
- Incluye gestion visual por cliente (prepagado, consumido y saldo restante).
- Incluye gestion de puntos: alta de punto, activacion/desactivacion y metricas por punto.

### Vista cliente

- Ruta: `http://localhost:3000/cliente`
- Archivo: `mobile/app/cliente/page.jsx`
- El cliente puede consultar su brazalete y ver:
  - lo prepagado
  - lo consumido
  - saldo restante
  - detalle por producto

### Portal de acceso

- Ruta: `http://localhost:3000/acceso`
- Admin entra con PIN (`NEXT_PUBLIC_ADMIN_PIN`).
- Cliente entra a su portal de consulta.
- La vista de despacho (`/`) solo se muestra para rol admin.
- La vista cliente (`/cliente`) solo se muestra para rol cliente.

## Pendientes de Integracion Disis

### Backlog acordado

- Definir carga inicial de stock (global o por punto).
- Definir politica de recarga (centralizada vs por punto).
- Integrar con Disis:
  - catalogo/SKU/precios
  - ventas prepagadas
  - descuentos por consumo
  - conciliacion final
- Implementar abastecimiento por punto:
  - entradas/salidas/traslados
  - trazabilidad por usuario, hora y punto
- Definir reglas operativas:
  - stock minimo por punto
  - alertas de quiebre
  - reasignacion entre puntos
- Cerrar modelo de verdad unica:
  - stock global
  - stock por punto
  - reconciliacion entre ambos

### Orden sugerido de implementacion

1. Reglas de negocio de stock (global vs por punto).
2. Tablas y endpoints de movimientos.
3. Integracion Disis (pull/push).
4. Tablero de conciliacion y alertas.

### Prueba recomendada para cliente

1. En backend: ejecutar `npm run dev` en `backend`.
2. En frontend: ejecutar `npm run dev` en `mobile`.
3. Abrir dos pestañas:
   - Pestaña A: `http://localhost:3000/`
   - Pestaña B: `http://localhost:3000/admin`
4. En A, usar `Simular Escaneo` y confirmar entrega.
5. En B, ver como baja el stock de inmediato.

## Seguridad y atomicidad implementadas

- `POST /api/v1/dispatch` usa transaccion Prisma para evitar sobre-despacho concurrente.
- Validacion de payload con Zod (`nfcUid`, `sku`, `pointId`, `quantity`).
- Rate limit por IP en dispatch (60 req/min).
- API Key interna por header `x-internal-api-key` (si `INTERNAL_API_KEY` esta definida).
- Manejo de errores centralizado sin exponer stack trace.

## Handshake Offline-First (cola de sincronizacion)

- Implementado en `mobile/lib/offline-dispatch-queue.ts`.
- Si falla red/infra al confirmar despacho, la app encola el retiro en `localStorage`.
- Reintento automatico cada 10 segundos desde `mobile/app/page.tsx`.
- El flujo de operacion no se pierde: el despacho queda pendiente hasta confirmacion del backend.

## Script de concurrencia (100 simultaneas)

Ruta: `backend/src/tests/concurrency-test.js`

Comando:

`npm run test:concurrency`

El script:

1. Reinicia datos demo.
2. Crea billetera mock con 10 unidades.
3. Lanza 100 requests simultaneas a dispatch.
4. Reporta exitosas, conflictos 409 y validacion de integridad.

## Stress test de colision (20 simultaneas, 1 unidad)

Ruta: `backend/src/tests/stress-test.ts`

Comando:

`npm run test:stress`

Resultado esperado:

- `success: 1`
- `conflicts: 19`
- `pass: true`

Esto simula dos o mas puntos queriendo retirar la ultima unidad al mismo tiempo.

## Demo con Docker

Desde la raíz del monorepo `disis-nfc-project`:

`docker compose up --build`

URLs:

- UI: `http://localhost:3000`
- Admin realtime: `http://localhost:3000/admin`
- API health: `http://localhost:3001/health`

Comandos utiles:

- Detener: `docker compose down`
- Detener y borrar datos persistidos: `docker compose down -v`
