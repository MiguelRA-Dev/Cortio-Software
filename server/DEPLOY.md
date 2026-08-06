# Desplegar Cortio en Azure App Service

Arquitectura: **un solo App Service** sirve tanto la API (Express, bajo `/api`) como el
frontend ya compilado (React/Vite, servido como archivos estáticos con `express.static`
+ un fallback a `index.html` para las rutas de React Router). Ver `server.js`.

Dominio: `cortiosoftware.com`.

---

## 0. Antes de empezar

- Cuenta de Azure con una suscripción activa.
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) instalado
  (`az --version` para confirmar) y logueado (`az login`).
- Node.js 20.19+ o 22.12+ instalado localmente (lo que ya tienes) — Vite 8 lo requiere
  para el build.
- El dominio `cortiosoftware.com` ya comprado (✅ listo).

---

## 1. Preparar MongoDB Atlas para aceptar conexiones desde Azure

Azure App Service no tiene una IP de salida fija en el plan Básico, así que:

1. Entra a [MongoDB Atlas](https://cloud.mongodb.com) → tu proyecto → **Network Access**.
2. **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`).
   - Esto es normal para un primer despliegue — la conexión sigue protegida por usuario
     y contraseña. Cuando el proyecto crezca, se puede restringir con Azure VNet
     Integration + IP de salida estática (requiere un plan superior a Básico) o con
     MongoDB Atlas Private Link.
3. Confirma también que tu cluster tenga **backups automáticos activados** (Atlas →
   Backup) si está en un plan que lo soporte — como hablamos, los planes gratis/compartidos
   normalmente no lo incluyen.

---

## 2. Crear el App Service

### Por Azure Portal (más visual, recomendado la primera vez)

1. [portal.azure.com](https://portal.azure.com) → **Create a resource** → **Web App**.
2. **Resource Group**: crea uno nuevo, ej. `cortio-rg`.
3. **Name**: `cortio` (o el que quede libre — será tu subdominio temporal
   `cortio.azurewebsites.net` hasta que conectes el dominio propio).
4. **Publish**: `Code`.
5. **Runtime stack**: `Node 22 LTS` (o `Node 20 LTS`).
6. **Operating System**: `Linux`.
7. **Region**: la más cercana a tus usuarios — `Brazil South` o `East US` son las más
   cercanas a Colombia entre las regiones estándar de Azure.
8. **Pricing plan**: **Basic B1** como mínimo.
   - **Importante**: los planes Free (F1) y Shared (D1) no soportan **"Always On"**, y
     sin eso la app se duerme por inactividad — los cron jobs (facturación diaria,
     purga de barberías eliminadas) dejarían de correr de forma confiable. B1 cuesta
     aproximadamente $13 USD/mes.
9. **Review + create** → **Create**. Espera a que termine el despliegue del recurso
   (no de tu app, solo de la infraestructura vacía).

### Activar "Always On"

1. Ve al recurso recién creado → **Settings** → **Configuration** → pestaña
   **General settings**.
2. **Always On** → `On`.
3. **Save**.

---

## 3. Configurar las variables de entorno en Azure

Ve a tu App Service → **Settings** → **Environment variables** (o **Configuration** →
**Application settings** en la vista clásica) → **Add** una por una:

| Nombre | Valor |
|---|---|
| `PORT` | `8080` (Azure Linux espera que la app escuche en este puerto — ver nota abajo) |
| `MONGODB_URI` | tu connection string de Atlas |
| `JWT_SECRET` | el mismo valor fuerte que usas en local (o genera uno nuevo solo para producción) |
| `APP_URL` | `https://cortiosoftware.com` |
| `RESEND_API_KEY` | tu API key de Resend |
| `EMAIL_FROM` | `notificaciones@cortiosoftware.com` (una vez verifiques el dominio en Resend — mientras tanto, `onboarding@resend.dev`) |
| `GOOGLE_CLIENT_ID` | tu Client ID de Google |
| `WOMPI_ENV` | `sandbox` (hasta que Wompi te apruebe producción) |
| `WOMPI_PUBLIC_KEY` | tu llave pública de Wompi |
| `WOMPI_PRIVATE_KEY` | tu llave privada de Wompi |
| `WOMPI_EVENTS_SECRET` | tu secreto de eventos de Wompi |
| `SUBSCRIPTION_PRICE_COP` | ej. `79000` |

**Nota sobre `PORT`**: `server.js` ya usa `process.env.PORT || 5000`, así que esto
funciona automático — Azure Linux inyecta su propio `PORT` (normalmente 8080) sin que
tengas que tocar código, pero lo dejamos explícito en la tabla para que sepas que existe.

Después de guardar, Azure reinicia la app automáticamente.

---

## 4. Compilar y empaquetar la app

Desde tu máquina, en la raíz del proyecto:

```bash
# 1. Compilar el frontend con las variables de producción
cd client
cp .env.production.example .env.production   # si no lo has hecho — llena los valores reales
npm install
npm run build

# 2. Copiar el build compilado dentro de server/, donde Express lo va a servir
cd ..
rm -rf server/public
cp -r client/dist server/public

# 3. Instalar dependencias de producción del backend
cd server
npm install --omit=dev
```

---

## 5. Desplegar con Azure CLI (zip deploy)

Desde la carpeta `server/`:

```bash
# Empaqueta todo lo necesario (código + node_modules + public/) en un zip
cd "server"
zip -r ../cortio-deploy.zip . -x "*.git*" -x "uploads/*"

# Sube el zip a tu App Service (ajusta el nombre si usaste otro)
az webapp deploy \
  --resource-group cortio-rg \
  --name cortio \
  --src-path ../cortio-deploy.zip \
  --type zip
```

Esto tarda 1-3 minutos. Cuando termine:

```bash
curl https://cortio.azurewebsites.net/health
```

Deberías ver `{"status":"ok"}`. Si no, revisa los logs:

```bash
az webapp log tail --resource-group cortio-rg --name cortio
```

---

## 6. Conectar el dominio cortiosoftware.com

1. App Service → **Settings** → **Custom domains** → **Add custom domain**.
2. Escribe `cortiosoftware.com` → Azure te muestra qué registros DNS agregar
   (normalmente un `TXT` para verificar propiedad + un `A` o `CNAME`).
3. Ve al panel DNS de donde compraste el dominio y agrega esos registros.
4. Espera la propagación (minutos a un par de horas) y vuelve a Azure a validar.
5. Repite para `www.cortiosoftware.com` si lo quieres también (opcional, puedes
   redirigir uno al otro después).

### Activar HTTPS gratis

1. En el mismo dominio ya agregado → **Add binding** → **App Service Managed
   Certificate** (gratis, Azure lo renueva solo).
2. Selecciona `TLS/SSL Type: SNI SSL`.
3. Espera unos minutos a que se emita.
4. En **TLS/SSL settings**, activa **HTTPS Only**.

---

## 7. Ajustes finales ahora que el dominio está vivo

1. **Google Cloud Console** → tu OAuth Client → agrega `https://cortiosoftware.com` a
   los **Orígenes de JavaScript autorizados**.
2. **Resend** → Domains → agrega `cortiosoftware.com`, agrega los registros DNS que te
   den (SPF/DKIM/DMARC), espera verificación, y cambia `EMAIL_FROM` en Azure a algo
   como `notificaciones@cortiosoftware.com`.
3. Confirma que `APP_URL` en Azure ya sea `https://cortiosoftware.com` (paso 3).

---

## 8. Checklist de verificación post-despliegue

- [ ] `https://cortiosoftware.com/health` responde `{"status":"ok"}`
- [ ] `https://cortiosoftware.com/` carga la app (login)
- [ ] Registrar una barbería de prueba funciona de principio a fin
- [ ] El correo de verificación llega
- [ ] Iniciar sesión con Google funciona (con el origen ya actualizado)
- [ ] `https://cortiosoftware.com/b/tu-slug` (reserva pública) carga y deja agendar
- [ ] Revisa la consola del navegador — sin errores de CORS ni 404 raros

---

## Siguiente paso natural: CI/CD

Por ahora cada cambio se despliega repitiendo los pasos 4 y 5 a mano. Cuando quieras
automatizarlo (deploy automático al hacer push a `master`), se puede montar un GitHub
Actions workflow que compile el cliente, lo copie a `server/public` y despliegue solo —
avísame cuando quieras montarlo.
