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

## 1. Crear la base de datos: Azure DocumentDB (Cosmos DB for MongoDB vCore)

En vez de MongoDB Atlas, la base de datos vive dentro de tu misma cuenta de Azure. Este
servicio habla el protocolo real de MongoDB (Mongoose no necesita ningún cambio de
código, solo el connection string) — en noviembre de 2025 Microsoft lo renombró de
"Azure Cosmos DB for MongoDB (vCore)" a **Azure DocumentDB**, así que en el buscador del
Portal puede aparecerte con cualquiera de los dos nombres.

1. [portal.azure.com](https://portal.azure.com) → **Create a resource** → busca
   `Azure DocumentDB` (o `Azure Cosmos DB for MongoDB`) → **Create** → elige la opción de
   cluster **vCore** (no la basada en RU — esa emula MongoDB con otras reglas por debajo
   y tiene más limitaciones de compatibilidad).
2. **Resource Group**: crea uno nuevo, ej. `cortio-rg` — lo vas a reutilizar para el App
   Service en el paso 2.
3. **Cluster name**: ej. `cortio-db`.
4. **Region**: la misma que vas a usar para el App Service — `Brazil South` soporta el
   free tier y es la más cercana a Colombia.
5. **Cluster tier**: **Free Tier** (32 GB de almacenamiento, cómputo burstable, sin
   costo — solo se permite un cluster free tier por suscripción). Alcanza de sobra para
   esta etapa de lanzamiento; cuando el tráfico crezca se puede escalar a un tier pago
   (M25 burstable o superior) sin cambiar de servicio.
6. **Authentication**: define un usuario administrador (ej. `cortioadmin`) y una
   contraseña fuerte — los vas a necesitar en el paso 9.
7. **Networking**: activa **Allow public access from Azure services**, y como el App
   Service en plan Básico no tiene IP de salida fija, marca también
   **Allow public access from all networks (0.0.0.0/0)**.
   - Igual que hubiera pasado con Atlas, la conexión sigue protegida por usuario y
     contraseña. Cuando el proyecto crezca esto se puede restringir con Azure Private
     Link.
8. **Review + create** → **Create**. Tarda varios minutos en aprovisionarse.
9. Cuando termine, entra al recurso → **Connection strings** → copia el connection
   string y reemplaza `<user>` / `<password>` por las credenciales del paso 6:

   ```
   mongodb+srv://<user>:<password>@cortio-db.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000
   ```

   Ese es el valor completo que vas a pegar como `MONGODB_URI` en el paso 3. El
   `retrywrites=false` es obligatorio (DocumentDB no soporta escrituras reintentables
   como el MongoDB real) — Mongoose lo respeta automáticamente porque viene en la propia
   URI, no hay que tocar `db.js`.

---

## 2. Crear el App Service

### Por Azure Portal (más visual, recomendado la primera vez)

1. [portal.azure.com](https://portal.azure.com) → **Create a resource** → **Web App**.
2. **Resource Group**: usa el mismo `cortio-rg` que creaste en el paso 1 para la base de
   datos — así queda todo agrupado.
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
| `MONGODB_URI` | tu connection string de Azure DocumentDB (ver paso 1.9) |
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

**Si estás en Windows y no tienes `zip` de Linux instalado** (Git Bash no lo trae por
defecto), no uses `Compress-Archive` de PowerShell a secas — genera las rutas dentro del
zip con `\` en vez de `/`, y el servidor Linux de Azure falla al extraerlo (error
`rsync: failed to stat ... Invalid argument (22)` en cientos de archivos). Usa este
script de PowerShell en su lugar, que arma el zip con rutas `/` correctas y excluye
`uploads/` y los `.env`:

```powershell
$root = "C:\ruta\a\Cortio Software Desarrollo"   # ajusta a tu ruta real
$serverPath = Join-Path $root "server"
$staging = Join-Path $root "deploy-staging"
if (Test-Path $staging) { Remove-Item -Path $staging -Recurse -Force -Confirm:$false }
New-Item -ItemType Directory -Path $staging | Out-Null

$excludeDirs = @('uploads', '.git', 'node_modules')
Get-ChildItem -Path $serverPath -Force | Where-Object { $_.Name -notin $excludeDirs -and $_.Name -notlike '.env*' } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $staging $_.Name) -Recurse -Force
}
Copy-Item -Path (Join-Path $serverPath 'node_modules') -Destination (Join-Path $staging 'node_modules') -Recurse -Force

$zipPath = Join-Path $root "cortio-deploy.zip"
if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force -Confirm:$false }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $staging -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$zip.Dispose()
Remove-Item -Path $staging -Recurse -Force -Confirm:$false
```

**Si estás en macOS/Linux** (o Git Bash con `zip` instalado), es más simple:

```bash
cd "server"
zip -r ../cortio-deploy.zip . -x "*.git*" -x "uploads/*"
```

Después, en cualquiera de los dos casos, sube el zip a tu App Service (ajusta el nombre
de recurso/grupo si usaste otros):

```bash
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
