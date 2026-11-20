# Noor Parfum · Control

App web para llevar el inventario, las ventas, las cobranzas y las compras de Noor Parfum.
Se abre desde el celular o la computadora, se instala como app en la pantalla de inicio
y solo pueden entrar los dueños con su correo y contraseña.

- **Página:** HTML, CSS y JavaScript sin compilación (`index.html`).
- **Datos y login:** [Supabase](https://supabase.com) (base de datos Postgres + autenticación, plan gratuito).
- **Publicación:** GitHub Pages, desde la rama `main`.

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura y estilos: login, Resumen, Inventario, Ventas, Separados, Por cobrar, Gastos, Compras, Socios e Instrucciones |
| `config.js` | URL y llave pública de Supabase |
| `manifest.webmanifest`, `icons/` | Ícono y nombre al instalarla en el celular |
| `supabase/schema.sql` | Tablas y reglas de seguridad (solo dueños) |
| `supabase/seed.sql` | Datos iniciales copiados del Excel al 07/11/2026 |
| `catalogo.html`, `catalogo/` | Catálogo público para clientes (stock real, sin datos internos) |
| `supabase/003_packs_catalogo.sql` | Packs de regalo y función pública del catálogo |
| `supabase/004_tarjeta_fidelidad.sql` | Tarjeta de fidelidad virtual (tabla `tarjetas`, reglas y función pública) |
| `supabase/005_resenas.sql` | Reseñas de clientes verificados (tabla `resenas` y funciones públicas) |
| `resena.html` | Página donde el cliente califica su compra (`resena.html?t=CÓDIGO`) |
| `tarjeta.html` | Tarjeta virtual que ve el cliente (`tarjeta.html?c=CÓDIGO`) |
| `supabase/002_gastos_separados_socios.sql` | Tablas de gastos, separados y cuentas entre socios |
| `app.js` | Lógica de la app |

## Puesta en marcha (una sola vez)

### 1. Supabase
1. Crea una cuenta en supabase.com (puedes entrar con tu cuenta de GitHub) y un proyecto nuevo, región **South America (São Paulo)**.
2. En **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/002_gastos_separados_socios.sql`.
4. Ejecuta `supabase/003_packs_catalogo.sql`.
5. Ejecuta `supabase/004_tarjeta_fidelidad.sql`, `supabase/005_resenas.sql` y `supabase/006_sellos_por_compra.sql`.
6. Abre `supabase/seed.sql`, cambia los dos correos y nombres de los dueños y ejecútalo.
7. En **Authentication › Sign In / Providers**, desactiva **Allow new users to sign up**.
8. En **Authentication › Users › Add user › Create new user**, crea un usuario por dueño con su correo y una contraseña (marca *Auto Confirm User*).
9. En **Project Settings › API** copia **Project URL** y la **Publishable key** y ponlos en `config.js` (ya configurado).

### 2. GitHub Pages
1. Sube esta carpeta a un repositorio (por ejemplo `noor-parfum-app`).
2. En el repositorio: **Settings › Pages › Build and deployment › Deploy from a branch › main / (root)**.
3. En un minuto la app queda en `https://<usuario>.github.io/noor-parfum-app/`.

> Para usar GitHub Pages gratis el repositorio debe ser público. El código se ve, pero los datos no:
> sin iniciar sesión con un correo de dueño la base de datos no entrega nada.

### 3. Instalar en el celular
- **iPhone:** Safari › Compartir › *Agregar a pantalla de inicio*.
- **Android:** Chrome › menú ⋮ › *Instalar app*.

## Seguridad
- Solo los correos de la tabla `duenos` pueden leer o escribir (reglas RLS en `schema.sql`).
- El registro público está desactivado: nadie puede crearse una cuenta.
- La llave de `config.js` es la pública (*anon*); nunca pongas aquí la *service_role*.

## Agregar o quitar un dueño
En Supabase › SQL Editor:
```sql
insert into public.duenos (email, nombre) values ('nuevo@correo.com', 'Nombre');
delete from public.duenos where email = 'quien@correo.com';
```
y crea (o borra) su usuario en Authentication › Users.

## Cambios
Cada cambio se hace como un commit en `main`; GitHub Pages publica la nueva versión sola.
Para volver a una versión anterior: `git revert <commit>`.

## Google Wallet (Tarjeta Noor)

La función `supabase/functions/wallet/index.ts` crea y actualiza la tarjeta del cliente en Google Wallet. Las imágenes están en `wallet/`.

1. **Cuenta de emisor:** entra a https://pay.google.com/business/console con la cuenta Google del negocio, crea el perfil de **Noor Parfum** y abre **Google Wallet API**. Copia el **Issuer ID** (un número largo).
2. **Cuenta de servicio:** en https://console.cloud.google.com crea un proyecto (ej. `noor-wallet`), activa **Google Wallet API**, ve a **IAM y administración › Cuentas de servicio › Crear**, y en esa cuenta **Claves › Agregar clave › JSON**. Se descarga un archivo `.json` (es secreto: no lo compartas ni lo subas a GitHub).
3. **Dar permiso:** en la consola de Google Pay & Wallet › **Usuarios › Invitar usuario**, pega el correo de la cuenta de servicio (termina en `iam.gserviceaccount.com`) con rol **Desarrollador**.
4. **Función:** en Supabase › **Edge Functions › Deploy a new function › Via Editor**, nómbrala `wallet`, pega el contenido de `supabase/functions/wallet/index.ts` y despliégala. En su configuración, **desactiva "Verify JWT"** (el cliente la abre desde su tarjeta).
5. **Secretos:** en Supabase › **Edge Functions › Secrets** agrega `GW_ISSUER_ID` (el número del paso 1) y `GW_SA_KEY` (todo el contenido del archivo `.json`).
6. **Probar:** abre tu propia tarjeta en un Android y toca **Agregar a Google Wallet**. Mientras la cuenta esté en modo de prueba, solo pueden guardarla las cuentas Google que agregues como usuarios en la consola.
7. **Publicar:** en la consola de Google Pay & Wallet pide **acceso de publicación** (Request publishing access). Cuando Google lo apruebe, cualquier cliente podrá guardarla.
