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
| `supabase/002_gastos_separados_socios.sql` | Tablas de gastos, separados y cuentas entre socios |
| `app.js` | Lógica de la app |

## Puesta en marcha (una sola vez)

### 1. Supabase
1. Crea una cuenta en supabase.com (puedes entrar con tu cuenta de GitHub) y un proyecto nuevo, región **South America (São Paulo)**.
2. En **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/002_gastos_separados_socios.sql`.
4. Ejecuta `supabase/003_packs_catalogo.sql`.
5. Abre `supabase/seed.sql`, cambia los dos correos y nombres de los dueños y ejecútalo.
6. En **Authentication › Sign In / Providers**, desactiva **Allow new users to sign up**.
7. En **Authentication › Users › Add user › Create new user**, crea un usuario por dueño con su correo y una contraseña (marca *Auto Confirm User*).
8. En **Project Settings › API** copia **Project URL** y la **Publishable key** y ponlos en `config.js` (ya configurado).

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
