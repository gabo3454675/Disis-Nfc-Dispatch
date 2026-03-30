# DISIS Dispatch: Billetera NFC & Despacho Inteligente 🚀

**DISIS Dispatch** es un microservicio satélite de alta fidelidad diseñado para integrarse con sistemas ERP (específicamente DISIS). Permite la gestión de consumos prepagados mediante tecnología **NFC**, garantizando la integridad del inventario en entornos de alta concurrencia (eventos, ferias, clubes).

---

## 🛠️ Stack Tecnológico
- **Backend:** Node.js + Express (TypeScript)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Mobile UI:** React Native / Expo (Optimizado para PDAs)
- **Architecture:** Microservicios con transacciones atómicas.

## 📋 Características Principales
- **Validación NFC:** Lectura instantánea de brazaletes/tarjetas (NTAG213) para validación de saldo.
- **Despacho Atómico:** Uso de transacciones de base de datos para evitar el "doble gasto" (Double-spending) en múltiples puntos de despacho simultáneos.
- **Multi-Point Sync:** Capacidad para gestionar hasta 10+ puntos de despacho sincronizados en tiempo real.
- **Transparencia para el Cliente:** Interfaz de consulta de saldo y productos restantes para el usuario final.

## 📐 Arquitectura de Base de Datos
El sistema utiliza una estructura optimizada para velocidad y trazabilidad:

![Database Schema](./docs/image_b1c4a2.png)

### Modelos Clave:
- **Wallets:** Almacena el UID único del chip NFC y su estado actual.
- **WalletItems:** Relación de productos prepagados vs. productos ya entregados.
- **DispatchLogs:** Auditoría completa de qué operario entregó qué producto y a qué hora.

## 🔄 Flujo de Trabajo
1. **Emisión:** Se vincula una factura de DISIS a un ID de chip NFC.
2. **Consumo:** El cliente escanea su brazalete en cualquier punto de despacho.
3. **Validación:** El sistema verifica saldo y descuenta el ítem de forma atómica.
4. **Sincronización:** El inventario global se actualiza para la conciliación final del negocio.

---

## 👨‍💻 Sobre el Desarrollador
**Gabriel (Gabo)** *Estudiante de Ingeniería de Sistemas en la Universidad Metropolitana (UNIMET)* *Desarrollador con 2.5 años de experiencia en el ecosistema JavaScript.*

---

## 🚀 Instalación (Dev Mode)

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/gabo3454675/Disis-Nfc-Dispatch.git](https://github.com/gabo3454675/Disis-Nfc-Dispatch.git)
