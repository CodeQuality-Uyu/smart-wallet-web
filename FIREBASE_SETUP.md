# 🔥 Guía de configuración Firebase — SmartWallet App

Esta guía explica paso a paso cómo configurar Firebase para conectar la aplicación.
Incluye material teórico de cada servicio para que entiendas qué estás haciendo y por qué.

---

## 📚 ¿Qué es Firebase?

Firebase es una plataforma de Google que provee servicios de backend listos para usar sin necesidad de escribir ni deployar un servidor propio. Para esta app usamos tres de sus servicios:

| Servicio | Qué hace |
|---|---|
| **Authentication** | Verifica la identidad de los usuarios (quién sos) |
| **Firestore** | Base de datos en tiempo real donde se guardan los datos (qué datos tenés) |
| **Storage** | Almacenamiento de archivos (fotos de comprobantes, recibos, etc.) |

Ambos están alojados en los servidores de Google. Vos solo configurás, no administrás infraestructura.

---

## 1️⃣ Crear el proyecto en Firebase

### ¿Qué es un proyecto de Firebase?
Un proyecto es el contenedor raíz de todos los servicios. Todo lo que configures (base de datos, autenticación, etc.) vive dentro de un proyecto. Podés tener múltiples proyectos (ej: uno para dev, uno para producción).

### Pasos

1. Ir a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Hacer click en **"Agregar proyecto"** (o "Create a project")
3. Elegir un nombre, por ejemplo: `smart-wallet-app`
4. En la pantalla de Google Analytics → podés deshabilitarlo, no es necesario para esta app
5. Click en **"Crear proyecto"**

> ⏳ Firebase tarda unos segundos en aprovisionar el proyecto.

---

## 2️⃣ Registrar la aplicación web

### ¿Qué es registrar una app?
Firebase puede tener múltiples clientes conectados al mismo proyecto (iOS, Android, Web). "Registrar" le dice a Firebase que existe una app web que va a usar sus servicios. A cambio, Firebase te da las **credenciales de conexión** (el objeto `firebaseConfig`).

### Pasos

1. En la pantalla principal del proyecto, hacer click en el ícono **`</>`** (Web)
2. Asignar un apodo a la app, por ejemplo: `smart-wallet-web`
3. Tildar "Firebase Hosting" si querés usar el deploy automático descrito en el paso 8 (opcional)
4. Click en **"Registrar app"**
5. Firebase muestra un bloque de código como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "smart-wallet-app.firebaseapp.com",
  projectId: "smart-wallet-app",
  storageBucket: "smart-wallet-app.appspot.com",
  appId: "1:123456789:web:abc123"
};
```

6. **Copiar esos valores** — los vas a necesitar en el paso final para el `.env.local`
7. Click en **"Continuar a la consola"**

> 🔑 Estos valores no son secretos en sí mismos (van en el frontend), pero sí identifican tu proyecto. No los expongas en un repositorio público.

---

## 3️⃣ Configurar Firestore Database

### ¿Qué es Firestore?
Firestore es una base de datos **NoSQL orientada a documentos**. No tiene tablas ni filas, sino **colecciones** que contienen **documentos** (objetos JSON).

```
📁 users/                        ← colección
   📄 uid_abc123/                ← documento (un usuario)
      name: "Juan"
      email: "juan@mail.com"
      📁 salaries/               ← subcolección
         📄 salary_1/
            amount: 75000
            currency: "UYU"
```

La app guarda los salarios bajo `users/{uid}/salaries/{salaryId}` — cada usuario tiene sus propios datos aislados dentro de su documento.

### Pasos

1. En el menú lateral de la consola, ir a **"Firestore Database"**
2. Click en **"Crear base de datos"**
3. Elegir modo:
   - **Modo de producción** → datos privados por defecto ✅ (recomendado)
   - Modo de prueba → datos públicos por 30 días (solo para experimentar)
4. Seleccionar la **ubicación** del servidor:
   - `southamerica-east1` → São Paulo 🇧🇷 (más cercano a Uruguay)
5. Click en **"Listo"**

### Configurar las reglas de seguridad

Las reglas determinan quién puede leer/escribir qué. Son el mecanismo de seguridad de Firestore.

1. Ir a la pestaña **"Reglas"** dentro de Firestore Database
2. Reemplazar el contenido con:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Perfil del usuario: solo él puede leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Salarios: subcolección del usuario, misma regla
      match /salaries/{salaryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click en **"Publicar"**

> 🔒 **¿Qué hace esta regla?**
> `request.auth.uid == userId` significa que solo el usuario dueño del documento puede acceder a él. Si Juan intenta leer los datos de María, Firestore lo rechaza automáticamente.
> `request.auth != null` significa que el usuario debe estar autenticado (no puede ser anónimo).

---

## 4️⃣ Configurar Firebase Storage

### ¿Qué es Firebase Storage?

Firebase Storage es un servicio de almacenamiento de archivos binarios (imágenes, PDFs, etc.) alojado en Google Cloud Storage. A diferencia de Firestore, que guarda datos estructurados (texto, números, fechas), Storage está diseñado para archivos de cualquier tamaño.

### ¿Por qué es útil?

Firestore no puede guardar archivos directamente — solo texto y números. Sin Storage, no habría forma de adjuntar una foto de un recibo a un gasto. Storage sube el archivo y devuelve una **URL pública pero protegida** que se guarda en Firestore junto al resto del gasto.

### ¿Qué soluciona en esta app?

- Al confirmar un pago recurrente manual, el usuario puede adjuntar la foto de la factura.
- Al ver el detalle de un gasto, el usuario puede subir y consultar el comprobante de pago.
- Los archivos se guardan bajo `receipts/{uid}/...` y solo el usuario dueño puede leerlos o escribirlos.

### Pasos

1. En el menú lateral de la consola, ir a **"Storage"** (dentro de la sección *Build*)
2. Click en **"Comenzar"** / **"Get started"**
3. En el diálogo de reglas de seguridad, elegir **"Iniciar en modo de producción"** ✅
4. Seleccionar la **ubicación** del bucket:
   - `us-east1` → Virginia (buena latencia para Uruguay, opción estable)
   - `southamerica-east1` → São Paulo 🇧🇷 (más cercano, pero no siempre disponible en el plan gratuito)
5. Click en **"Listo"**

> ⚠️ La ubicación del bucket no se puede cambiar después de crearlo. Elegí con cuidado.

### Configurar las reglas de seguridad

Las reglas de Storage funcionan igual que las de Firestore: se evalúan en los servidores de Google antes de permitir cualquier lectura o escritura.

Las reglas están versionadas en el repositorio en [storage.rules](../storage.rules). Para publicarlas:

```bash
firebase deploy --only storage
```

> Cada vez que modifiques `storage.rules` tenés que volver a ejecutar el deploy.

### Qué cubren las reglas actuales

- Solo el usuario dueño (`request.auth.uid == uid`) puede leer y escribir archivos bajo `receipts/{uid}/`.
- Cualquier otra ruta queda denegada por defecto.

---

## 5️⃣ Configurar Authentication

### ¿Qué es Firebase Authentication?
Es el servicio que verifica la identidad de los usuarios. Maneja el flujo completo de inicio de sesión y emite tokens seguros. Soporta múltiples métodos: email/contraseña, Google, GitHub, etc.

En esta app usamos **Email Link (passwordless)**: el usuario ingresa su email y recibe un enlace mágico. Al hacer click, queda autenticado sin necesidad de contraseña.

### ¿Por qué Email Link y no email/contraseña?
- No hay contraseñas que el usuario tenga que recordar
- No hay contraseñas que la app tenga que hashear y almacenar
- El email ya actúa como segundo factor (solo quien tiene acceso al email puede ingresar)

### Pasos

1. En el menú lateral, ir a **"Authentication"**
2. Click en **"Comenzar"**
3. Ir a la pestaña **"Sign-in method"**
4. Buscar **"Correo electrónico/Contraseña"** y hacer click
5. Habilitar la primera opción (Email/Contraseña): **activar** ✅
6. Habilitar la segunda opción (Enlace de correo electrónico): **activar** ✅
7. Click en **"Guardar"**

> ⚠️ Ambas opciones deben estar activadas. La segunda (Enlace de correo) es la que usa la app, pero Firebase requiere que la primera también esté habilitada.

### Configurar dominios autorizados

Firebase solo envía enlaces de sign-in a URLs que vos explícitamente autorizás. Esto previene que alguien use tu proyecto para redirigir a sitios maliciosos.

1. En **Authentication** → pestaña **"Settings"** → sección **"Authorized domains"**
2. Por defecto ya están `localhost` y tu dominio de Firebase
3. Para desarrollo local no necesitás agregar nada más
4. Cuando hagas deploy a producción, agregar el dominio de producción aquí

> 🌐 El `continueUrl` que la app manda en el email link es `http://localhost:5173/verify-code`. Firebase verifica que `localhost` esté en la lista de dominios autorizados antes de enviar el email.

---

## 6️⃣ Configurar las variables de entorno

Con los valores copiados en el paso 2, completar el archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_BASE_URL=/api
VITE_APP_ENV=development
VITE_BACKEND=firestore

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=smart-wallet-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-wallet-app
VITE_FIREBASE_STORAGE_BUCKET=smart-wallet-app.appspot.com
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> 🔄 Después de modificar `.env.local`, reiniciar el servidor de desarrollo (`npm run dev`).

---

## 7️⃣ Verificar que todo funciona

### Checklist

- [ ] El proyecto de Firebase está creado
- [ ] La app web está registrada y tenés el `firebaseConfig`
- [ ] Firestore Database está creado en modo producción
- [ ] Las reglas de Firestore están publicadas (`firebase deploy --only firestore:rules`)
- [ ] Firebase Storage está habilitado
- [ ] Las reglas de Storage están publicadas (`firebase deploy --only storage`)
- [ ] Authentication tiene habilitado Email/Contraseña **y** Email Link
- [ ] `.env.local` tiene `VITE_BACKEND=firestore` y todas las variables `VITE_FIREBASE_*`
- [ ] El servidor fue reiniciado después de editar `.env.local`

### Flujo de prueba

1. Abrir la app → debería ir a `/login`
2. Registrarse con un email real al que tengas acceso
3. Revisar la bandeja de entrada — llega un email de `noreply@smart-wallet-app.firebaseapp.com`
4. Hacer click en el enlace → la app te redirige a `/verify-code` y procesa el login automáticamente
5. En la consola de Firebase → **Authentication → Users** → el usuario debería aparecer listado
6. Ir a **Sueldos** → agregar un sueldo
7. En la consola de Firebase → **Firestore Database** → debería verse `users/{uid}/salaries/{id}`

---

## 🗂️ Estructura de datos en Firestore

```
📁 users/
   📄 {firebase_uid}/
      ├── name: string
      ├── email: string
      └── createdAt: ISO string
      │
      └── 📁 salaries/
             📄 {auto_id}/
                ├── amount: number
                ├── currency: "UYU" | "USD"
                ├── date: ISO string
                ├── notes: string
                └── createdAt: ISO string
```

---

## 🔒 Reglas de seguridad de Firestore

### Por qué son importantes

Por defecto, Firestore creado en modo producción **deniega todo acceso**. Sin reglas explícitas, ninguna operación desde la app funcionará.

Más importante: las reglas son la única barrera que impide que un usuario autenticado lea o modifique los datos de otro usuario. Sin ellas, cualquier persona con una cuenta podría consultar `users/{cualquier_uid}/cards` y ver tarjetas ajenas.

Las reglas se evalúan **en los servidores de Google**, antes de ejecutar cualquier lectura o escritura, independientemente de lo que haga el código del cliente.

### Desplegar las reglas

Las reglas están versionadas en el repositorio en [firestore.rules](../firestore.rules). Para publicarlas:

```bash
# Instalar Firebase CLI (solo la primera vez)
npm install -g firebase-tools

# Login y seleccionar proyecto (solo la primera vez)
firebase login
firebase use smart-wallet-e99f2

# Publicar reglas
firebase deploy --only firestore:rules
```

> Cada vez que modifiques `firestore.rules` tenés que volver a ejecutar el deploy para que los cambios tengan efecto.

### Qué cubren las reglas actuales

- Solo el usuario dueño (`request.auth.uid == uid`) puede leer y escribir su perfil y todas sus subcolecciones (tarjetas, categorías, sueldos).
- Cualquier otra colección o documento queda denegado por defecto.

---

## 🔄 Cambiar entre backends

Para volver a MSW (datos mock, sin Firebase):
```env
VITE_BACKEND=msw
```

Para usar Firestore (datos reales):
```env
VITE_BACKEND=firestore
```

No hay que cambiar ningún código — solo la variable de entorno y reiniciar el servidor.

---

## 8️⃣ `firebase.json` — el archivo de configuración local

`firebase.json` es el archivo que le dice a la Firebase CLI qué servicios gestionar y cómo. Sin él, los comandos `firebase deploy` no saben qué publicar ni dónde encontrar las reglas.

```json
{
  "hosting": {
    "public": "dist",                        // carpeta a publicar en Firebase Hosting
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }  // SPA: todas las rutas van a index.html
    ]
  },
  "firestore": {
    "rules": "firestore.rules"               // archivo de reglas que deploy sube a Firestore
  },
  "storage": {
    "rules": "storage.rules"                 // archivo de reglas que deploy sube a Storage
  }
}
```

### Qué configura cada sección

| Sección | Qué hace |
|---|---|
| `hosting.public` | Le indica a la CLI qué carpeta subir (`dist/`, generada por `npm run build`) |
| `hosting.rewrites` | Redirige cualquier ruta desconocida a `index.html` para que React Router maneje el routing en el cliente |
| `firestore.rules` | Vincula el archivo local `firestore.rules` al comando `firebase deploy --only firestore:rules` |
| `storage.rules` | Vincula el archivo local `storage.rules` al comando `firebase deploy --only storage` |

> 📁 `firebase.json` debe estar en la raíz del proyecto, al mismo nivel que `package.json`. La CLI lo busca automáticamente cuando ejecutás cualquier comando `firebase`.

---

## 9️⃣ Deploy automático a Firebase Hosting (GitHub Actions)

Firebase Hosting sirve la app como sitio estático con CDN global, HTTPS automático y soporte para SPA routing. El deploy se hace automáticamente en cada push a `main` mediante el workflow en `.github/workflows/deploy.yml`.

### Cómo funciona

1. GitHub Actions ejecuta `npm ci` y `npm run build`
2. Las variables `VITE_FIREBASE_*` se inyectan desde los secrets del repositorio
3. El artefacto `dist/` se sube a Firebase Hosting en el canal `live` (producción)
4. El rewrite `** → /index.html` asegura que el routing de la SPA funcione correctamente en cualquier ruta

### Configurar los secrets en GitHub

Ir a **Settings → Secrets and variables → Actions** en el repositorio y agregar:

| Secret | Cómo obtenerlo |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → **Generate new private key** → copiar el JSON completo |
| `VITE_FIREBASE_API_KEY` | Del objeto `firebaseConfig` obtenido en el paso 2 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Ídem |
| `VITE_FIREBASE_PROJECT_ID` | Ídem |
| `VITE_FIREBASE_STORAGE_BUCKET` | Ídem |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Ídem |
| `VITE_FIREBASE_APP_ID` | Ídem |

> ⚠️ El `FIREBASE_SERVICE_ACCOUNT` es el JSON completo que descargás (no solo el `private_key`). Pegarlo tal cual en el secret.

### Agregar el dominio de producción a Authentication

Una vez deployado, Firebase Hosting asigna un dominio del tipo `smart-wallet-app.web.app`. Ese dominio debe estar en la lista de dominios autorizados para que los email links funcionen en producción:

1. **Authentication → Settings → Authorized domains**
2. Click en **"Agregar dominio"**
3. Ingresar `smart-wallet-app.web.app` (y el dominio custom si configuraste uno)

### Verificar el deploy

```bash
# Ver el historial de releases en Firebase Hosting
firebase hosting:releases

# Ver la URL del proyecto
firebase open hosting:site
```

---

## 💡 Conceptos clave resumidos

| Concepto | Descripción |
|---|---|
| **ID Token** | JWT que Firebase emite al autenticarse. Dura 1 hora. El SDK lo renueva automáticamente. |
| **Refresh Token** | Token de larga duración que Firebase usa para obtener nuevos ID Tokens. Vive en IndexedDB del navegador. |
| **UID** | Identificador único del usuario en Firebase Auth. Es la clave primaria para sus datos en Firestore. |
| **Email Link** | Método de autenticación sin contraseña. Firebase envía un enlace firmado al email del usuario. |
| **Security Rules** | Lenguaje de reglas de Firestore y Storage. Se evalúan en el servidor de Google antes de ejecutar cualquier operación. |
| **Subcolección** | Colección dentro de un documento. `users/{uid}/salaries` es una subcolección de `users/{uid}`. |
| **Storage bucket** | Contenedor de archivos en Firebase Storage. Los archivos se identifican por su ruta, ej: `receipts/{uid}/expenses/{id}/foto.jpg`. |
| **Download URL** | URL pública generada por Storage para acceder a un archivo. Se guarda en Firestore junto al documento y puede abrirse directamente en el navegador. |
